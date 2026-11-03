import {
  chess,
  type ChessMove,
  type ChessPieceMove,
  type ChessState,
} from "@board-games/games/chess";

/** A move by its squares, `e2e4` or `e7e8q` (UCI). */
export function uci(move: string): ChessPieceMove {
  const from = move.slice(0, 2) as ChessPieceMove["from"];
  const to = move.slice(2, 4) as ChessPieceMove["to"];
  const promotion = move[4] as ChessPieceMove["promotion"];
  return promotion === undefined ? { from, to } : { from, to, promotion };
}

/** The state after playing `moves` (UCI) from the start. */
export function playedFrom(state: ChessState, ...moves: readonly string[]): ChessState {
  return moves.reduce<ChessState>((current, move) => chess.applyMove(current, uci(move)), state);
}

/** The state after playing `moves` (UCI) from the start. */
export function played(...moves: readonly string[]): ChessState {
  return playedFrom(chess.setup(), ...moves);
}

/** A position from its FEN, as if reached by no move. */
export function fromFen(fen: string): ChessState {
  const key = fen.split(" ").slice(0, 4).join(" ");
  return { fen, positions: [key], san: [], drawClaim: null };
}

export const CLAIM: ChessMove = { type: "claim-draw" };
