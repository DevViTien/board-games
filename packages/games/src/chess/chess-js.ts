// The only file that imports `chess.js` (ESLint enforces it): every contact with the library goes
// through here. Each function builds its own `Chess` from a FEN and drops it afterwards; there is no
// shared instance and no cache, so the rules stay pure functions of their state.
import { Chess } from "chess.js";

import {
  CHESS_FILES,
  CHESS_PIECE,
  CHESS_PROMOTION_PIECES,
  type ChessPromotionPiece,
  type ChessSquare,
} from "./constants";
import type { ChessPieceMove } from "./rules";

/** The version pinned in the catalog (`pnpm-workspace.yaml`), which this adapter was checked against. */
const PINNED_VERSION = "chess.js 1.4.0";

/** A position the adapter has read; only the functions of this file look inside it. */
export type ChessPosition = Chess;

/** A move as `chess.js` generates it internally: squares are 0x88 indices (a8 = 0, h1 = 119). */
interface RawMove {
  readonly from: number;
  readonly to: number;
  readonly promotion?: string;
}

/**
 * The internal move generator of `chess.js` 1.4: `moves({ verbose: true })` computes the SAN and
 * two FENs of every move: 25–55 times slower per call, 6–10 times per half-move replayed (design
 * of add-chess-rules §2). It is declared
 * `private` (typed `any`), hence the cast; `legalPieceMoves` checks its shape at run time.
 */
interface ChessInternals {
  _moves(options: { legal: true }): readonly RawMove[];
}

/** Square names by 0x88 index; `undefined` off the board. */
const SQUARE_BY_0X88: readonly (ChessSquare | undefined)[] = Array.from(
  { length: 128 },
  (_unused, index) => {
    if ((index & 0x88) !== 0) return undefined;
    const file = CHESS_FILES[index & 7];
    const rank = 8 - (index >> 4);
    return file === undefined ? undefined : (`${file}${rank}` as ChessSquare);
  },
);

function shapeError(detail: string): Error {
  return new Error(
    `chess.js internal move generator changed (${detail}): the chess adapter was written for ${PINNED_VERSION}; review packages/games/src/chess/chess-js.ts`,
  );
}

function squareOf(index: unknown, field: string): ChessSquare {
  const square = typeof index === "number" ? SQUARE_BY_0X88[index] : undefined;
  if (square === undefined)
    throw shapeError(`"${field}" is not a 0x88 square: ${JSON.stringify(index)}`);
  return square;
}

function promotionOf(piece: unknown): ChessPromotionPiece | undefined {
  if (piece === undefined) return undefined;
  const known = CHESS_PROMOTION_PIECES.find((candidate) => candidate === piece);
  if (known === undefined) throw shapeError(`unknown promotion piece: ${JSON.stringify(piece)}`);
  return known;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

/** Reads a position from a full six-field FEN; throws on an invalid one. */
export function positionOf(fen: string): ChessPosition {
  return new Chess(fen);
}

/** The FEN `chess.js` writes for a position: en passant square only when the capture is legal. */
export function normalFen(fen: string): string {
  return positionOf(fen).fen();
}

/**
 * Every legal piece move of the side to move. The four promotions of a pawn come one after the
 * other in the order of `CHESS_PROMOTION_PIECES`; a move without promotion has no `promotion` key.
 */
export function legalPieceMoves(position: ChessPosition): readonly ChessPieceMove[] {
  const internals = position as unknown as Readonly<Record<string, unknown>>;
  if (typeof internals._moves !== "function") throw shapeError("no _moves method");
  const raw: unknown = (position as unknown as ChessInternals)._moves({ legal: true });
  if (!Array.isArray(raw)) throw shapeError("_moves did not return an array");

  const moves: ChessPieceMove[] = [];
  // Promotion pieces generated for each pawn move, so they can be listed in our order.
  const promotions = new Map<string, Set<ChessPromotionPiece>>();
  const parsed = raw.map((entry: unknown) => {
    if (!isRecord(entry)) throw shapeError("a move is not an object");
    const from = squareOf(entry.from, "from");
    const to = squareOf(entry.to, "to");
    const promotion = promotionOf(entry.promotion);
    if (promotion !== undefined) {
      const key = `${from}${to}`;
      const pieces = promotions.get(key) ?? new Set<ChessPromotionPiece>();
      pieces.add(promotion);
      promotions.set(key, pieces);
    }
    return { from, to, promotion };
  });
  for (const { from, to, promotion } of parsed) {
    if (promotion === undefined) {
      moves.push({ from, to });
      continue;
    }
    const key = `${from}${to}`;
    const pieces = promotions.get(key);
    // Emitted once, at the first of the pawn's promotions.
    if (pieces === undefined) continue;
    promotions.delete(key);
    for (const piece of CHESS_PROMOTION_PIECES) {
      if (pieces.has(piece)) moves.push({ from, to, promotion: piece });
    }
  }
  return moves;
}

export interface PlayedMove {
  /** The position after the move. */
  readonly fen: string;
  /** Standard algebraic notation of the move, e.g. `Nbd2`, `exd6`, `e8=Q+`, `O-O`. */
  readonly san: string;
  /** A pawn move or a capture: no earlier position can occur again. */
  readonly irreversible: boolean;
}

/**
 * Plays a legal piece move on the position of `fen`; throws if `chess.js` refuses it, or if the
 * move names a promotion piece and does not promote (`chess.js` ignores the piece then) or
 * promotes and names none.
 */
export function play(fen: string, move: ChessPieceMove): PlayedMove {
  const position = positionOf(fen);
  const played = position.move(
    move.promotion === undefined
      ? { from: move.from, to: move.to }
      : { from: move.from, to: move.to, promotion: move.promotion },
  );
  if (played.promotion !== move.promotion) {
    throw new Error(`Not a legal move: ${move.from}${move.to}${move.promotion ?? ""}`);
  }
  return {
    fen: position.fen(),
    san: played.san,
    irreversible: played.piece === CHESS_PIECE.Pawn || played.captured !== undefined,
  };
}

/** The side to move is in check. */
export function isInCheck(position: ChessPosition): boolean {
  return position.inCheck();
}

/** Neither side can mate, as `chess.js` recognises it (bare kings, one minor piece, same-colour bishops). */
export function isInsufficient(position: ChessPosition): boolean {
  return position.isInsufficientMaterial();
}
