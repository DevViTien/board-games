// What the board UI reads of a position, from its FEN alone (no `chess.js`): the UI never parses
// FEN and never imports the library.
import {
  CHESS_COLOR,
  CHESS_FILES,
  CHESS_PIECE,
  type ChessColor,
  type ChessPieceType,
  type ChessSquare,
} from "./constants";
import type { ChessDrawClaim, ChessMove, ChessState } from "./rules";

export interface ChessPiece {
  readonly color: ChessColor;
  readonly type: ChessPieceType;
}

const PIECE_TYPES: readonly ChessPieceType[] = Object.values(CHESS_PIECE);

/** The square on `file` (0 = a … 7 = h) and `rank` (0 = rank 1 … 7 = rank 8). */
export function chessSquareName(file: number, rank: number): ChessSquare {
  const letter = CHESS_FILES[file];
  if (letter === undefined || !Number.isInteger(rank) || rank < 0 || rank > 7) {
    throw new RangeError(`No square at file ${file}, rank ${rank}`);
  }
  return `${letter}${rank + 1}` as ChessSquare;
}

/** The square at `index` of `chessBoard`: 0 = a1, 1 = b1, …, 7 = h1, 8 = a2, …, 63 = h8. */
export function chessSquareAt(index: number): ChessSquare {
  return chessSquareName(index % 8, Math.floor(index / 8));
}

function pieceOf(letter: string): ChessPiece {
  const lower = letter.toLowerCase();
  const type = PIECE_TYPES.find((candidate) => candidate === lower);
  if (type === undefined) throw new Error(`Unknown piece in FEN: ${letter}`);
  return { color: letter === lower ? CHESS_COLOR.Black : CHESS_COLOR.White, type };
}

/** The 64 squares in the order of `chessSquareAt` (a1, b1, …, h8): the piece on each, or `null`. */
export function chessBoard(state: ChessState): readonly (ChessPiece | null)[] {
  const placement = state.fen.split(" ")[0] ?? "";
  const board: (ChessPiece | null)[] = Array.from({ length: 64 }, () => null);
  // FEN lists ranks from 8 down to 1, each from file a to h.
  placement.split("/").forEach((row, fromTop) => {
    const rank = 7 - fromTop;
    let file = 0;
    for (const letter of row) {
      const empty = Number(letter);
      if (Number.isInteger(empty) && empty > 0) {
        file += empty;
        continue;
      }
      board[rank * 8 + file] = pieceOf(letter);
      file += 1;
    }
  });
  return board;
}

/** Tells a claim of a draw from a piece move. */
export function isChessDrawClaim(move: ChessMove): move is ChessDrawClaim {
  return "type" in move;
}
