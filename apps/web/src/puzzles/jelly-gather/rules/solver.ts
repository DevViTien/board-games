import { isSolved, step } from "./step";
import { type Board, type Direction, DIRECTIONS, type Level } from "./types";

// Breadth-first search over boards (design §5): the levels' tests use it to prove each level's
// fewest moves. Never imported by a page.

export type SolveResult =
  | { readonly kind: "solved"; readonly moves: string; readonly states: number }
  | { readonly kind: "unsolvable"; readonly states: number }
  | { readonly kind: "too-big"; readonly states: number };

/** A board as a string: equal boards (pieces are kept in order) give equal keys. */
function boardKey(board: Board): string {
  let key = `${board.player}`;
  for (const piece of board.pieces) {
    key += piece.fixed ? "|!" : "|";
    piece.cells.forEach((cell, index) => {
      key += `${piece.kinds[index]?.[0] ?? "?"}${piece.kinds[index]?.[1] ?? ""}${cell},`;
    });
  }
  return key;
}

/** The fewest moves from the level's start to a solved board, looking at no more than `limit` boards. */
export function solve(level: Level, limit = 300_000): SolveResult {
  if (isSolved(level.start)) return { kind: "solved", moves: "", states: 1 };
  // Each board seen, with the board and move it was reached from, to rebuild the path.
  const seen = new Map<string, { readonly from: string | null; readonly move: Direction | null }>();
  const startKey = boardKey(level.start);
  seen.set(startKey, { from: null, move: null });
  let frontier: { key: string; board: Board }[] = [{ key: startKey, board: level.start }];
  while (frontier.length > 0) {
    const next: { key: string; board: Board }[] = [];
    for (const { key, board } of frontier) {
      for (const direction of DIRECTIONS) {
        const result = step(level, board, direction);
        if (!result.ok) continue;
        const nextKey = boardKey(result.board);
        if (seen.has(nextKey)) continue;
        seen.set(nextKey, { from: key, move: direction });
        if (result.outcome.solved) {
          let moves = "";
          for (let at: string | null = nextKey; at !== null;) {
            const entry = seen.get(at);
            if (entry?.move == null) break;
            moves = entry.move + moves;
            at = entry.from;
          }
          return { kind: "solved", moves, states: seen.size };
        }
        if (seen.size >= limit) return { kind: "too-big", states: seen.size };
        next.push({ key: nextKey, board: result.board });
      }
    }
    frontier = next;
  }
  return { kind: "unsolvable", states: seen.size };
}
