import { GAME_CATEGORY, type GameDefinition, type GameResult } from "@board-games/engine";

import { chessBoard, chessSquareAt, isChessDrawClaim } from "./board";
import {
  type ChessPosition,
  isInCheck,
  isInsufficient,
  legalPieceMoves,
  play,
  positionOf,
} from "./chess-js";
import {
  AUTOMATIC_HALF_MOVES,
  AUTOMATIC_REPETITIONS,
  CHESS_CLAIM_DRAW,
  CHESS_COLOR,
  CHESS_PIECE,
  CHESS_PROMOTION_PIECES,
  CHESS_RESULT_REASON,
  type ChessPromotionPiece,
  type ChessSquare,
  CLAIM_HALF_MOVES,
  CLAIM_REPETITIONS,
} from "./constants";

export interface ChessState {
  /** The current position, as a full six-field FEN (its half-move clock counts the 50 / 75 moves). */
  readonly fen: string;
  /**
   * Position keys (the first four FEN fields) since the last pawn move or capture, oldest first;
   * the last one is the current position. No position before an irreversible move can recur.
   */
  readonly positions: readonly string[];
  /** Every piece move played, in standard algebraic notation, oldest first: the score sheet. */
  readonly san: readonly string[];
  /** Why the game ended when the player to move claimed a draw; `null` while nobody has. */
  readonly drawClaim:
    typeof CHESS_RESULT_REASON.ThreefoldClaim | typeof CHESS_RESULT_REASON.FiftyMoveClaim | null;
}

/** A move of a piece. Castling is the king's move (`e1g1`); each promotion piece is its own move. */
export interface ChessPieceMove {
  readonly from: ChessSquare;
  readonly to: ChessSquare;
  /** Only on a move bringing a pawn to the last rank. */
  readonly promotion?: ChessPromotionPiece;
}

/** Claims a draw by threefold repetition or the fifty-move rule; ends the game when legal. */
export interface ChessDrawClaim {
  readonly type: typeof CHESS_CLAIM_DRAW;
}

export type ChessMove = ChessPieceMove | ChessDrawClaim;

type DrawClaimReason = NonNullable<ChessState["drawClaim"]>;

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const SQUARE_PATTERN = /^[a-h][1-8]$/;

/**
 * The key two positions share when they are the same for repetition (FIDE 9.2.2): placement, side
 * to move, castling rights and the en passant square, which `chess.js` writes only when usable.
 */
export function chessPositionKey(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

function halfMoveClock(fen: string): number {
  return Number(fen.split(" ")[4]);
}

function isWhiteToMove(fen: string): boolean {
  return fen.split(" ")[1] === CHESS_COLOR.White;
}

function repetitionsOf(state: ChessState): number {
  const current = state.positions.at(-1);
  return state.positions.filter((key) => key === current).length;
}

/** The claim the player to move may make, or `null`; only meaningful while the game is on. */
function claimableDraw(state: ChessState): DrawClaimReason | null {
  if (repetitionsOf(state) >= CLAIM_REPETITIONS) return CHESS_RESULT_REASON.ThreefoldClaim;
  if (halfMoveClock(state.fen) >= CLAIM_HALF_MOVES) return CHESS_RESULT_REASON.FiftyMoveClaim;
  return null;
}

/** How the game ended (design of add-chess-rules §4), given the legal piece moves of the position. */
function endOf(
  state: ChessState,
  position: ChessPosition,
  pieceMoves: readonly ChessPieceMove[],
): GameResult | null {
  if (state.drawClaim !== null) return { kind: "draw", reason: state.drawClaim };
  if (pieceMoves.length === 0) {
    if (isInCheck(position)) {
      // The side that just moved won.
      const winner = isWhiteToMove(state.fen) ? 1 : 0;
      return { kind: "win", winners: [winner], reason: CHESS_RESULT_REASON.Checkmate };
    }
    return { kind: "draw", reason: CHESS_RESULT_REASON.Stalemate };
  }
  if (isInsufficient(position)) {
    return { kind: "draw", reason: CHESS_RESULT_REASON.InsufficientMaterial };
  }
  if (repetitionsOf(state) >= AUTOMATIC_REPETITIONS) {
    return { kind: "draw", reason: CHESS_RESULT_REASON.FivefoldRepetition };
  }
  if (halfMoveClock(state.fen) >= AUTOMATIC_HALF_MOVES) {
    return { kind: "draw", reason: CHESS_RESULT_REASON.SeventyFiveMove };
  }
  return null;
}

/**
 * Throws on a finished game. Checkmate and stalemate need no check here: `chess.js` refuses every
 * move then. The rest is cheap, so `applyMove` does not generate the legal moves a second time.
 */
function assertOngoing(state: ChessState): void {
  if (
    state.drawClaim !== null ||
    repetitionsOf(state) >= AUTOMATIC_REPETITIONS ||
    halfMoveClock(state.fen) >= AUTOMATIC_HALF_MOVES ||
    isInsufficient(positionOf(state.fen))
  ) {
    throw new Error("The game is over: no move can be played");
  }
}

function resultOf(state: ChessState): GameResult | null {
  if (state.drawClaim !== null) return { kind: "draw", reason: state.drawClaim };
  const position = positionOf(state.fen);
  return endOf(state, position, legalPieceMoves(position));
}

/** The square of the king of the player to move when that king is in check, otherwise `null`. */
export function chessKingInCheck(state: ChessState): ChessSquare | null {
  if (!isInCheck(positionOf(state.fen))) return null;
  const color = isWhiteToMove(state.fen) ? CHESS_COLOR.White : CHESS_COLOR.Black;
  const index = chessBoard(state).findIndex(
    (piece) => piece?.type === CHESS_PIECE.King && piece.color === color,
  );
  return index === -1 ? null : chessSquareAt(index);
}

function keyOfPieceMove(move: Readonly<Record<string, unknown>>): string {
  const { from, to, promotion } = move;
  if (typeof from !== "string" || !SQUARE_PATTERN.test(from)) {
    throw new TypeError("A chess move needs a square to move from");
  }
  if (typeof to !== "string" || !SQUARE_PATTERN.test(to)) {
    throw new TypeError("A chess move needs a square to move to");
  }
  if (promotion === undefined) return `${from}${to}`;
  const piece = CHESS_PROMOTION_PIECES.find((candidate) => candidate === promotion);
  if (piece === undefined) throw new TypeError("Unknown promotion piece");
  return `${from}${to}${piece}`;
}

export const chess = {
  id: "chess",
  meta: {
    players: { min: 2, max: 2 },
    category: GAME_CATEGORY.Classic,
    durationMinutes: 20,
    supportsAI: false,
  },
  defaultOptions: {},
  setup: (): ChessState => ({
    fen: START_FEN,
    positions: [chessPositionKey(START_FEN)],
    san: [],
    drawClaim: null,
  }),
  currentPlayer: (state) => (isWhiteToMove(state.fen) ? 0 : 1),
  legalMoves: (state) => {
    if (state.drawClaim !== null) return [];
    const position = positionOf(state.fen);
    const pieceMoves = legalPieceMoves(position);
    if (endOf(state, position, pieceMoves) !== null) return [];
    return claimableDraw(state) === null ? pieceMoves : [...pieceMoves, { type: CHESS_CLAIM_DRAW }];
  },
  applyMove: (state, move): ChessState => {
    assertOngoing(state);
    if (isChessDrawClaim(move)) {
      const reason = claimableDraw(state);
      // After a checkmate or a stalemate on the 100th half-move or later, no claim either.
      if (reason === null || legalPieceMoves(positionOf(state.fen)).length === 0) {
        throw new Error("No draw can be claimed in this position");
      }
      return { ...state, drawClaim: reason };
    }
    const played = play(state.fen, move);
    const key = chessPositionKey(played.fen);
    return {
      fen: played.fen,
      positions: played.irreversible ? [key] : [...state.positions, key],
      san: [...state.san, played.san],
      drawClaim: null,
    };
  },
  result: resultOf,
  // UCI for piece moves (`e2e4`, `e7e8q`), checked so that `{ from: "e7e8", to: "q" }` never reads
  // as a promotion; anything else throws, which the engine treats as an illegal move.
  moveKey: (move) => {
    const fields = move as unknown;
    if (typeof fields !== "object" || fields === null) {
      throw new TypeError("A chess move is an object");
    }
    const record = fields as Readonly<Record<string, unknown>>;
    if ("type" in record) {
      if (record.type !== CHESS_CLAIM_DRAW || "from" in record || "to" in record) {
        throw new TypeError("Unknown chess move");
      }
      return CHESS_CLAIM_DRAW;
    }
    return keyOfPieceMove(record);
  },
} as const satisfies GameDefinition<ChessState, ChessMove>;
