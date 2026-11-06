import { describe, expect, it } from "vitest";

import { fenceRace, fenceRaceFenceIssue, type FenceRaceState } from "./rules";
import { randomGame } from "./test-positions";

// The rules once more, written apart and the slow way, sharing nothing with the code they check: an
// answer in common with `fenceRaceFenceIssue` would prove nothing. That function is checked apart:
// it must say yes to a fence exactly when `legalMoves` has it, as the preview says what will be legal.

interface RawFence {
  readonly row: number;
  readonly col: number;
  readonly dir: "h" | "v";
}

const DIRECTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

/** Whether a fence stands between a cell and the next one in a direction. */
function closed(fences: readonly RawFence[], row: number, col: number, dr: number, dc: number) {
  return fences.some((fence) => {
    if (fence.dir === "h" && dc === 0) {
      return fence.row === Math.min(row, row + dr) && (fence.col === col || fence.col + 1 === col);
    }
    if (fence.dir === "v" && dr === 0) {
      return fence.col === Math.min(col, col + dc) && (fence.row === row || fence.row + 1 === row);
    }
    return false;
  });
}

/** The cells of the gate a seat races to: five in the middle of the side across from its own. */
function gate(state: FenceRaceState, seat: number): ReadonlySet<string> {
  const { rows, columns, pawns } = state;
  const sides: Record<number, readonly string[]> = {
    2: ["top", "bottom"],
    3: ["top", "bottom", "right"],
    4: ["top", "right", "bottom", "left"],
  };
  const side = sides[pawns.length]?.[seat];
  const firstCol = (columns - 5) / 2;
  const firstRow = (rows - 5) / 2;
  const five = [0, 1, 2, 3, 4];
  if (side === "top") return new Set(five.map((at) => `0:${firstCol + at}`));
  if (side === "bottom") return new Set(five.map((at) => `${rows - 1}:${firstCol + at}`));
  if (side === "right") return new Set(five.map((at) => `${firstRow + at}:${columns - 1}`));
  return new Set(five.map((at) => `${firstRow + at}:0`));
}

/** Whether a seat can still get to its gate behind these fences. */
function canArrive(state: FenceRaceState, seat: number, fences: readonly RawFence[]): boolean {
  const goal = gate(state, seat);
  const pawn = state.pawns[seat] ?? { row: 0, col: 0 };
  const seen = new Set([`${pawn.row}:${pawn.col}`]);
  const waiting = [[pawn.row, pawn.col] as const];
  for (let next = waiting.pop(); next !== undefined; next = waiting.pop()) {
    const [row, col] = next;
    if (goal.has(`${row}:${col}`)) return true;
    for (const [dr, dc] of DIRECTIONS) {
      const toRow = row + dr;
      const toCol = col + dc;
      if (toRow < 0 || toCol < 0 || toRow >= state.rows || toCol >= state.columns) continue;
      if (closed(fences, row, col, dr, dc) || seen.has(`${toRow}:${toCol}`)) continue;
      seen.add(`${toRow}:${toCol}`);
      waiting.push([toRow, toCol]);
    }
  }
  return false;
}

/** Whether a fence takes the place of one on the board, overlapping it or crossing it. */
function inTheWay(fences: readonly RawFence[], { row, col, dir }: RawFence): boolean {
  return fences.some((fence) => {
    if (fence.row === row && fence.col === col) return true;
    if (fence.dir !== dir) return false;
    if (dir === "h") return fence.row === row && Math.abs(fence.col - col) === 1;
    return fence.col === col && Math.abs(fence.row - row) === 1;
  });
}

/** Every move the player to move may make, by the rules as a player reads them. */
function everyMove(state: FenceRaceState): readonly string[] {
  const seat = state.toMove;
  const pawn = state.pawns[seat] ?? { row: 0, col: 0 };
  const keys: string[] = [];
  for (const [dr, dc] of DIRECTIONS) {
    const row = pawn.row + dr;
    const col = pawn.col + dc;
    if (row < 0 || col < 0 || row >= state.rows || col >= state.columns) continue;
    if (!closed(state.fences, pawn.row, pawn.col, dr, dc)) keys.push(`s:${row}:${col}`);
  }
  if ((state.fencesLeft[seat] ?? 0) > 0) {
    for (let row = 0; row <= state.rows - 2; row += 1) {
      for (let col = 0; col <= state.columns - 2; col += 1) {
        for (const dir of ["h", "v"] as const) {
          const fence = { row, col, dir };
          if (inTheWay(state.fences, fence)) continue;
          const fences = [...state.fences, fence];
          if (state.pawns.every((_pawn, other) => canArrive(state, other, fences))) {
            keys.push(`f:${dir}:${row}:${col}`);
          }
        }
      }
    }
  }
  if ((state.breaksLeft[seat] ?? 0) > 0) {
    for (const { dir, row, col } of state.fences) keys.push(`b:${dir}:${row}:${col}`);
  }
  return keys.sort();
}

/** The fences `fenceRaceFenceIssue` has nothing against, each asked of it. */
function fencesWithoutIssue(state: FenceRaceState): readonly string[] {
  const keys: string[] = [];
  for (let row = 0; row <= state.rows - 2; row += 1) {
    for (let col = 0; col <= state.columns - 2; col += 1) {
      for (const dir of ["h", "v"] as const) {
        if (fenceRaceFenceIssue(state, { row, col, dir }) === null) {
          keys.push(`f:${dir}:${row}:${col}`);
        }
      }
    }
  }
  return keys.sort();
}

describe("legalMoves, which searches only for the fences across a way (design §2)", () => {
  it.each([2, 3, 4])(
    "gives the same moves as the rules worked out the slow way, and as fenceRaceFenceIssue, in every state of random games of %i",
    (players) => {
      let states = 0;
      for (let seed = 1; seed <= 8; seed += 1) {
        for (const state of randomGame(seed * 77 + players, players).states) {
          if (state.result !== null) continue;
          const keys = fenceRace.legalMoves(state).map(fenceRace.moveKey);
          expect([...keys].sort()).toEqual(everyMove(state));
          expect(fencesWithoutIssue(state)).toEqual(
            keys.filter((key) => key.startsWith("f:")).sort(),
          );
          states += 1;
        }
      }
      expect(states).toBeGreaterThan(100);
    },
    120_000,
  );
});
