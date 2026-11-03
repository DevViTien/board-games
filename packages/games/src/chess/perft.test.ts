import { describe, expect, it } from "vitest";

import { isChessDrawClaim } from "./board";
import { chess, type ChessState } from "./rules";
import { chessStateFromFen, PERFT_POSITIONS } from "./test-positions";

/**
 * Sequences of legal piece moves `depth` half-moves long, counted through the rules themselves
 * (`legalMoves` and `applyMove`), so the adapter's squares, promotions and castling are checked.
 * Draw claims are not piece moves and are left out (none can occur this close to these positions).
 */
function perft(state: ChessState, depth: number): number {
  const moves = chess.legalMoves(state).filter((move) => !isChessDrawClaim(move));
  if (depth === 1) return moves.length;
  let count = 0;
  for (const move of moves) count += perft(chess.applyMove(state, move), depth - 1);
  return count;
}

// Depths chosen to keep the file under about 2 s (design of add-chess-rules §6); depth 5 of the
// starting position (4 865 609) takes about 20 s through the rules, so it is run by hand only.
describe("chess perft", () => {
  for (const { name, fen, counts, checkedDepth } of PERFT_POSITIONS) {
    it(`counts the published numbers from ${name} to depth ${checkedDepth}`, () => {
      const state = chessStateFromFen(fen);
      const depths = counts.slice(0, checkedDepth).map((_count, index) => index + 1);

      expect(depths.map((depth) => perft(state, depth))).toEqual(counts.slice(0, checkedDepth));
      // Under a second alone; the time limit leaves room for the other files running alongside.
    }, 10_000);
  }
});
