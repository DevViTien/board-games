import type { PlayerIndex } from "@board-games/engine";

import {
  CANDIDATE_LIMIT,
  CANDIDATE_RADIUS,
  CARO_RULE,
  type CaroSize,
  WIN_LENGTH,
} from "./constants";
import {
  type CaroBoard,
  type Direction,
  DIRECTIONS,
  outsideEnds,
  stepFrom,
  winningRuns,
} from "./lines";
import type { CaroMove, CaroState } from "./rules";

// ---------------------------------------------------------------------------------------------
// Evaluation: every window of five cells in a row, column or diagonal.

/** Five cells in a row, with the cells just outside it (`null` past the edge). */
export interface FiveCellWindow {
  readonly cells: readonly number[];
  readonly direction: Direction;
  readonly before: number | null;
  readonly after: number | null;
}

/** Every window of five consecutive cells on a `size × size` board, walking by row and column. */
export function fiveCellWindows(size: number): readonly FiveCellWindow[] {
  const windows: FiveCellWindow[] = [];
  for (let start = 0; start < size * size; start += 1) {
    for (const direction of DIRECTIONS) {
      const cells = [start];
      for (let next = stepFrom(size, start, direction); next !== null;) {
        cells.push(next);
        if (cells.length === WIN_LENGTH) break;
        next = stepFrom(size, next, direction);
      }
      if (cells.length < WIN_LENGTH) continue;
      const [before, after] = outsideEnds(size, cells, direction);
      windows.push({ cells, direction, before, after });
    }
  }
  return windows;
}

/** Computed once per board size: the geometry never changes. */
const WINDOWS: Readonly<Record<CaroSize, readonly FiveCellWindow[]>> = {
  15: fiveCellWindows(15),
  19: fiveCellWindows(19),
};

/** Score of a window holding `k` stones of one player only; five (a line that did not win) is 0. */
const WINDOW_SCORE = [0, 1, 10, 100, 1000, 0] as const;

/** The player to move gets their total × 6/5: the same threat is worth more to whoever moves next. */
const TO_MOVE_WEIGHT = 6;
const WAITING_WEIGHT = 5;

function holdsOpponentOf(board: CaroBoard, cell: number | null, player: PlayerIndex): boolean {
  if (cell === null) return false;
  const stone = board[cell];
  return stone !== null && stone !== undefined && stone !== player;
}

/**
 * The first cell from `cell` (going `sign` along `direction`) that does not hold `owner`'s stone:
 * where a line filling the window would really end, own stones beyond the window included.
 */
function lineEnd(
  board: CaroBoard,
  size: number,
  cell: number | null,
  owner: PlayerIndex,
  direction: Direction,
  sign: 1 | -1,
): number | null {
  let end = cell;
  while (end !== null && board[end] === owner) end = stepFrom(size, end, direction, sign);
  return end;
}

/**
 * Each window holding stones of one player only scores `WINDOW_SCORE[k]` for them. Overlapping
 * windows make an open four worth more than a blocked one, and catch broken lines (`XX_XX`). Under
 * "blocked-ends", a window is skipped when the line that filling it would make, extended through
 * the owner's stones just beyond it, has the opponent's stones at both ends: it could never win
 * (`O X X X X _ O`, and `O X X X X _ X O`, whose gap makes six blocked at both ends). The result is an integer well below 10^8 (at most 1,020 × 1,000 × 6).
 */
export function caroEvaluate(state: CaroState, player: PlayerIndex): number {
  const { board, rule, size } = state;
  const totals = [0, 0];
  for (const { cells, direction, before, after } of WINDOWS[size]) {
    let x = 0;
    let o = 0;
    for (const cell of cells) {
      const stone = board[cell];
      if (stone === 0) x += 1;
      else if (stone === 1) o += 1;
    }
    if ((x > 0 && o > 0) || x + o === 0) continue;
    const owner = x > 0 ? 0 : 1;
    if (
      rule === CARO_RULE.BlockedEnds &&
      holdsOpponentOf(board, lineEnd(board, size, before, owner, direction, -1), owner) &&
      holdsOpponentOf(board, lineEnd(board, size, after, owner, direction, 1), owner)
    ) {
      continue;
    }
    totals[owner] = (totals[owner] ?? 0) + (WINDOW_SCORE[x + o] ?? 0);
  }
  const weighted = (seat: PlayerIndex) =>
    (totals[seat] ?? 0) * (seat === state.toMove ? TO_MOVE_WEIGHT : WAITING_WEIGHT);
  return weighted(player) - weighted(1 - player);
}

// ---------------------------------------------------------------------------------------------
// Candidate moves: the empty cells near the stones, forced ones first, then by threat.

/** Empty cells at most `CANDIDATE_RADIUS` rows and columns from a stone, in index order. */
function cellsNearStones(board: CaroBoard, size: number): number[] {
  const near = Array.from({ length: board.length }, () => false);
  board.forEach((stone, cell) => {
    if (stone === null) return;
    const row = Math.floor(cell / size);
    const col = cell % size;
    for (let r = Math.max(0, row - CANDIDATE_RADIUS); r <= row + CANDIDATE_RADIUS; r += 1) {
      if (r >= size) break;
      for (let c = Math.max(0, col - CANDIDATE_RADIUS); c <= col + CANDIDATE_RADIUS; c += 1) {
        if (c >= size) break;
        near[r * size + c] = true;
      }
    }
  });
  return board.flatMap((stone, cell) => (stone === null && near[cell] === true ? [cell] : []));
}

/** Threat of extending a line of `length` stones with `open` empty ends (0–2), for move ordering. */
const THREAT = [
  [0, 0, 0],
  [0, 1, 2],
  [0, 10, 30],
  [0, 100, 400],
  [0, 1000, 5000],
] as const;

/** Stones of `player` in a row through `cell` (counted as theirs) and how many ends are empty. */
function lineThrough(
  board: CaroBoard,
  size: number,
  cell: number,
  player: PlayerIndex,
  direction: Direction,
): { readonly length: number; readonly open: number } {
  let length = 1;
  let open = 0;
  for (const sign of [1, -1] as const) {
    let next = stepFrom(size, cell, direction, sign);
    while (next !== null && board[next] === player) {
      length += 1;
      next = stepFrom(size, next, direction, sign);
    }
    if (next !== null && board[next] === null) open += 1;
  }
  return { length, open };
}

/**
 * Forced cells by priority: the mover's wins, then the opponent's (to block), then cells just outside
 * a winning line where a stone kills it under "blocked-ends".
 */
const FORCED = { Win: 0, Block: 1, KillLine: 2 } as const;

/**
 * The cells the AI considers, best first. An empty board: the centre. Otherwise the empty cells
 * near a stone: first every cell that wins at once for either player, found with `winningRuns`
 * (the very function the rules decide wins with), and under "blocked-ends" the empty cells just
 * outside such a winning line, where the other player can kill it; then the other cells by threat,
 * at most `CANDIDATE_LIMIT` of them. Ties go by cell index, so the order is deterministic.
 */
export function caroCandidateMoves(state: CaroState): readonly CaroMove[] {
  const { board, size, rule, toMove } = state;
  if (state.win !== null || state.filled === board.length) return [];
  if (state.filled === 0) {
    const middle = Math.floor(size / 2);
    return [{ cell: middle * size + middle }];
  }

  const near = cellsNearStones(board, size);
  const forced = new Map<number, number>();
  const force = (cell: number, priority: number) => {
    forced.set(cell, Math.min(priority, forced.get(cell) ?? priority));
  };
  const scored: { readonly cell: number; readonly score: number }[] = [];
  for (const cell of near) {
    // How much a stone here would build for either player (attack plus defence), for ordering.
    // A line shorter than five cannot win, so only longer ones are handed to `winningRuns`.
    let score = 0;
    for (const player of [toMove, 1 - toMove]) {
      let mayWin = false;
      for (const direction of DIRECTIONS) {
        const { length, open } = lineThrough(board, size, cell, player, direction);
        score += THREAT[Math.min(length, THREAT.length - 1)]?.[open] ?? 0;
        if (length >= WIN_LENGTH) mayWin = true;
      }
      if (!mayWin) continue;
      const runs = winningRuns(board, size, cell, player, rule);
      if (runs.length === 0) continue;
      force(cell, player === toMove ? FORCED.Win : FORCED.Block);
      if (rule !== CARO_RULE.BlockedEnds) continue;
      for (const { cells, direction } of runs) {
        for (const end of outsideEnds(size, cells, direction)) {
          if (end !== null && board[end] === null) force(end, FORCED.KillLine);
        }
      }
    }
    scored.push({ cell, score });
  }

  const first = [...forced]
    .sort(([cellA, a], [cellB, b]) => a - b || cellA - cellB)
    .map(([cell]) => cell);
  const rest = scored
    .filter(({ cell }) => !forced.has(cell))
    .sort((a, b) => b.score - a.score || a.cell - b.cell)
    .slice(0, CANDIDATE_LIMIT)
    .map(({ cell }) => cell);
  return [...first, ...rest].map((cell) => ({ cell }));
}
