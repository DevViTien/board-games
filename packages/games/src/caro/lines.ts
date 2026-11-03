import type { PlayerIndex } from "@board-games/engine";

import { CARO_RULE, type CaroRule, WIN_LENGTH } from "./constants";

/** Cells row by row from the top left; each holds the seat of its stone, or `null` when empty. */
export type CaroBoard = readonly (PlayerIndex | null)[];

/** A step on the board, in rows and columns. */
export type Direction = readonly [rowStep: number, colStep: number];

/** Horizontal, vertical, diagonal down to the right, diagonal down to the left. */
export const DIRECTIONS: readonly Direction[] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

/**
 * The cell one step from `cell` in `direction` (or against it, `sign` −1), or `null` past the edge.
 * Walks by row and column: stepping by raw index would wrap from the end of a row to the next.
 */
export function stepFrom(
  size: number,
  cell: number,
  [rowStep, colStep]: Direction,
  sign: 1 | -1 = 1,
): number | null {
  const row = Math.floor(cell / size) + sign * rowStep;
  const col = (cell % size) + sign * colStep;
  return row >= 0 && row < size && col >= 0 && col < size ? row * size + col : null;
}

/**
 * The longest line of `player`'s stones through `cell` in `direction`, counting `cell` itself as
 * theirs whatever it holds: its cells in order from one end to the other.
 */
export function runThrough(
  board: CaroBoard,
  size: number,
  cell: number,
  player: PlayerIndex,
  direction: Direction,
): readonly number[] {
  const before: number[] = [];
  for (
    let next = stepFrom(size, cell, direction, -1);
    next !== null && board[next] === player;
    next = stepFrom(size, next, direction, -1)
  ) {
    before.push(next);
  }
  const after: number[] = [];
  for (
    let next = stepFrom(size, cell, direction);
    next !== null && board[next] === player;
    next = stepFrom(size, next, direction)
  ) {
    after.push(next);
  }
  return [...before.reverse(), cell, ...after];
}

/** The cells just outside both ends of `line` (in `direction`), each `null` past the edge. */
export function outsideEnds(
  size: number,
  line: readonly number[],
  direction: Direction,
): readonly [before: number | null, after: number | null] {
  const first = line[0];
  const last = line.at(-1);
  if (first === undefined || last === undefined) throw new Error("An empty line has no ends");
  return [stepFrom(size, first, direction, -1), stepFrom(size, last, direction)];
}

/** A line of `player`'s stones from `cell` that wins under `rule`, with the direction it runs in. */
export interface WinningRun {
  readonly cells: readonly number[];
  readonly direction: Direction;
}

/**
 * Every line through `cell` that would win for `player` if they placed a stone there, in the order
 * of `DIRECTIONS`. A line of five or more wins unless, under "blocked-ends", both cells just outside
 * it hold the opponent's stones; the edge of the board never blocks.
 */
export function winningRuns(
  board: CaroBoard,
  size: number,
  cell: number,
  player: PlayerIndex,
  rule: CaroRule,
): readonly WinningRun[] {
  const blocks = (end: number | null): boolean => {
    if (end === null) return false;
    const stone = board[end];
    return stone !== null && stone !== undefined && stone !== player;
  };
  const runs: WinningRun[] = [];
  for (const direction of DIRECTIONS) {
    const cells = runThrough(board, size, cell, player, direction);
    if (cells.length < WIN_LENGTH) continue;
    if (rule === CARO_RULE.BlockedEnds) {
      const [before, after] = outsideEnds(size, cells, direction);
      if (blocks(before) && blocks(after)) continue;
    }
    runs.push({ cells, direction });
  }
  return runs;
}

/**
 * Whether placing `player`'s stone on the empty `cell` wins at once under `rule`: the winning line
 * (the first direction that wins), its cells from one end to the other, or `null`. One move may
 * make a line blocked at both ends and another that wins: that is a win.
 */
export function wouldWin(
  board: CaroBoard,
  size: number,
  cell: number,
  player: PlayerIndex,
  rule: CaroRule,
): readonly number[] | null {
  return winningRuns(board, size, cell, player, rule)[0]?.cells ?? null;
}
