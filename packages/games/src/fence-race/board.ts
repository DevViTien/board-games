import type { PlayerIndex } from "@board-games/engine";

import {
  FENCE_RACE_GATE_CELLS,
  FENCE_RACE_ISSUE,
  FENCE_RACE_SIDE,
  type FenceRaceSide,
  fenceRaceTable,
} from "./constants";

export type FenceDirection = "h" | "v";

export interface FenceRaceCell {
  readonly row: number;
  readonly col: number;
}

/**
 * A fence two cells long, named by its middle: the crossing at the bottom right corner of cell
 * (`row`, `col`). "h" runs along the bottom of (row, col) and (row, col + 1); "v" along the right of
 * (row, col) and (row + 1, col). Row 0 is at the top.
 */
export interface Fence extends FenceRaceCell {
  readonly dir: FenceDirection;
}

/** The part of a state the board's geometry needs. */
export interface FenceRaceBoard {
  readonly rows: number;
  readonly columns: number;
  readonly pawns: readonly FenceRaceCell[];
  readonly fences: readonly Fence[];
}

const OPPOSITE: Readonly<Record<FenceRaceSide, FenceRaceSide>> = {
  bottom: FENCE_RACE_SIDE.Top,
  top: FENCE_RACE_SIDE.Bottom,
  left: FENCE_RACE_SIDE.Right,
  right: FENCE_RACE_SIDE.Left,
};

/** The edge a seat starts on: it depends only on the number of players. */
export function fenceRaceStartSide(playerCount: number, player: PlayerIndex): FenceRaceSide {
  return fenceRaceTable(playerCount).sides[player] ?? FENCE_RACE_SIDE.Bottom;
}

/** The edge a seat's gate is on. */
export function fenceRaceGoalSide(playerCount: number, player: PlayerIndex): FenceRaceSide {
  return OPPOSITE[fenceRaceStartSide(playerCount, player)];
}

/** The cell in the middle of an edge. */
export function fenceRaceStartCell(
  side: FenceRaceSide,
  rows: number,
  columns: number,
): FenceRaceCell {
  const middleRow = (rows - 1) / 2;
  const middleCol = (columns - 1) / 2;
  switch (side) {
    case FENCE_RACE_SIDE.Bottom:
      return { row: rows - 1, col: middleCol };
    case FENCE_RACE_SIDE.Top:
      return { row: 0, col: middleCol };
    case FENCE_RACE_SIDE.Left:
      return { row: middleRow, col: 0 };
    case FENCE_RACE_SIDE.Right:
      return { row: middleRow, col: columns - 1 };
  }
}

/** Whether position `index` of an edge `length` cells long is in the gate. */
function inGate(index: number, length: number): boolean {
  return Math.abs(index - (length - 1) / 2) <= (FENCE_RACE_GATE_CELLS - 1) / 2;
}

/** Whether a cell is in the gate on the edge `side`. */
function isGateCell(
  side: FenceRaceSide,
  row: number,
  col: number,
  rows: number,
  columns: number,
): boolean {
  switch (side) {
    case FENCE_RACE_SIDE.Top:
      return row === 0 && inGate(col, columns);
    case FENCE_RACE_SIDE.Bottom:
      return row === rows - 1 && inGate(col, columns);
    case FENCE_RACE_SIDE.Left:
      return col === 0 && inGate(row, rows);
    case FENCE_RACE_SIDE.Right:
      return col === columns - 1 && inGate(row, rows);
  }
}

/** Whether a cell is in `player`'s gate. */
export function fenceRaceIsGoal(
  board: FenceRaceBoard,
  player: PlayerIndex,
  row: number,
  col: number,
): boolean {
  const side = fenceRaceGoalSide(board.pawns.length, player);
  return isGateCell(side, row, col, board.rows, board.columns);
}

export function sameFence(a: Fence, b: Fence): boolean {
  return a.row === b.row && a.col === b.col && a.dir === b.dir;
}

/** The fixed order of `FenceRaceState.fences`, so a game replayed gives the very same state. */
export function compareFences(a: Fence, b: Fence): number {
  return a.row - b.row || a.col - b.col || (a.dir === b.dir ? 0 : a.dir === "h" ? -1 : 1);
}

/**
 * The edges between cells that fences close: `below[i]` closes cell `i` from the cell under it,
 * `right[i]` from the cell on its right, `i` counted row by row. Built afresh by whoever needs it,
 * so these rules hold no state of their own.
 */
export interface EdgeTable {
  readonly below: Uint8Array;
  readonly right: Uint8Array;
  /** Room for one search at a time, so thousands of them in a move allocate nothing. */
  readonly from: Int16Array;
  readonly queue: Int16Array;
}

/** Closes (`value` 1) or opens (`value` 0) the two edges of a fence. */
export function setFence(
  table: EdgeTable,
  columns: number,
  { row, col, dir }: Fence,
  value: 0 | 1,
): void {
  const index = row * columns + col;
  if (dir === "h") {
    table.below[index] = value;
    table.below[index + 1] = value;
  } else {
    table.right[index] = value;
    table.right[index + columns] = value;
  }
}

export function edgeTable(board: FenceRaceBoard): EdgeTable {
  const cells = board.rows * board.columns;
  const table = {
    below: new Uint8Array(cells),
    right: new Uint8Array(cells),
    from: new Int16Array(cells),
    queue: new Int16Array(cells),
  };
  for (const fence of board.fences) setFence(table, board.columns, fence, 1);
  return table;
}

/** A step from `row`, `col` to the cell `dr`, `dc` away: inside the board and no fence across it. */
function isStepOpen(
  table: EdgeTable,
  rows: number,
  columns: number,
  row: number,
  col: number,
  dr: number,
  dc: number,
): boolean {
  const toRow = row + dr;
  const toCol = col + dc;
  if (toRow < 0 || toCol < 0 || toRow >= rows || toCol >= columns) return false;
  const index = row * columns + col;
  if (dr === -1) return table.below[index - columns] === 0;
  if (dr === 1) return table.below[index] === 0;
  return dc === -1 ? table.right[index - 1] === 0 : table.right[index] === 0;
}

const STEP_DIRECTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

/** A step straight towards the gate is tried first, so the way found runs straight if it can. */
const SEARCH_ORDER: Readonly<Record<FenceRaceSide, readonly (readonly [number, number])[]>> = {
  top: [
    [-1, 0],
    [0, -1],
    [0, 1],
    [1, 0],
  ],
  bottom: [
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, 0],
  ],
  left: [
    [0, -1],
    [-1, 0],
    [1, 0],
    [0, 1],
  ],
  right: [
    [0, 1],
    [-1, 0],
    [1, 0],
    [0, -1],
  ],
};

export interface WaySearch {
  /** Steps to the nearest cell of the gate, or -1 when there is no way there. */
  readonly distance: number;
  /** The cell the search came from, for each cell it reached; the start has -1. Until the next one. */
  readonly from: Int16Array;
  /** The cell of the gate reached, or -1. */
  readonly end: number;
}

const UNSEEN = -2;

/** Breadth-first from the pawn of `player` to their gate. Other pawns never block the way. */
export function searchWay(table: EdgeTable, board: FenceRaceBoard, player: PlayerIndex): WaySearch {
  const { rows, columns, pawns } = board;
  const side = fenceRaceGoalSide(pawns.length, player);
  const order = SEARCH_ORDER[side];
  const start = pawns[player] ?? { row: 0, col: 0 };
  const { from, queue } = table;
  from.fill(UNSEEN);
  const first = start.row * columns + start.col;
  from[first] = -1;
  queue[0] = first;
  let head = 0;
  let tail = 1;
  let steps = 0;
  let levelEnd = 1;
  while (head < tail) {
    if (head === levelEnd) {
      steps += 1;
      levelEnd = tail;
    }
    const index = queue[head] ?? 0;
    head += 1;
    const col = index % columns;
    const row = (index - col) / columns;
    if (isGateCell(side, row, col, rows, columns)) return { distance: steps, from, end: index };
    for (const [dr, dc] of order) {
      if (!isStepOpen(table, rows, columns, row, col, dr, dc)) continue;
      const next = index + dr * columns + dc;
      if (from[next] !== UNSEEN) continue;
      from[next] = index;
      queue[tail] = next;
      tail += 1;
    }
  }
  return { distance: -1, from, end: -1 };
}

/** The steps on `player`'s shortest way to their gate; -1 only if a state breaks the rules. */
export function fenceRaceDistance(board: FenceRaceBoard, player: PlayerIndex): number {
  return searchWay(edgeTable(board), board, player).distance;
}

/** The cells of a shortest way, from the pawn to the gate; empty if there is none. */
export function fenceRaceWay(board: FenceRaceBoard, player: PlayerIndex): readonly FenceRaceCell[] {
  const { from, end } = searchWay(edgeTable(board), board, player);
  const cells: FenceRaceCell[] = [];
  for (let index = end; index >= 0; index = from[index] ?? -1) {
    const col = index % board.columns;
    cells.unshift({ row: (index - col) / board.columns, col });
  }
  return cells;
}

/** An edge between two cells as one number: `2 × cell` is below it, `2 × cell + 1` right of it. */
function edgesOfWay({ from, end }: WaySearch, columns: number): readonly number[] {
  const edges: number[] = [];
  for (let index = end; (from[index] ?? -1) >= 0; index = from[index] ?? -1) {
    const previous = from[index] ?? 0;
    const low = Math.min(previous, index);
    edges.push(Math.abs(previous - index) === columns ? 2 * low : 2 * low + 1);
  }
  return edges;
}

/** The two edges a fence closes, as `edgesOfWay` numbers them. */
function edgesOfFence({ row, col, dir }: Fence, columns: number): readonly [number, number] {
  const index = row * columns + col;
  return dir === "h" ? [2 * index, 2 * (index + 1)] : [2 * index + 1, 2 * (index + columns) + 1];
}

export interface WaysOnEdges {
  /** For each edge (`edgesOfWay`), the seats whose way found runs along it, as bits. */
  readonly seatsOnEdge: Uint8Array;
  readonly distances: readonly number[];
}

/**
 * Every player's way, found once: a fence on none of its edges cannot seal anyone, nor lengthen
 * anyone's way, so most fences need no search of their own (design §2).
 */
export function waysOnEdges(table: EdgeTable, board: FenceRaceBoard): WaysOnEdges {
  const seatsOnEdge = new Uint8Array(2 * board.rows * board.columns);
  const distances = board.pawns.map((_pawn, seat) => {
    const way = searchWay(table, board, seat);
    for (const edge of edgesOfWay(way, board.columns)) {
      seatsOnEdge[edge] = (seatsOnEdge[edge] ?? 0) | (1 << seat);
    }
    return way.distance;
  });
  return { seatsOnEdge, distances };
}

/**
 * The distances once `fence` stands, or `null` if it would seal someone. `table` is put back as it
 * was before returning.
 */
export function distancesWithFence(
  table: EdgeTable,
  board: FenceRaceBoard,
  { seatsOnEdge, distances }: WaysOnEdges,
  fence: Fence,
): readonly number[] | null {
  const [first, second] = edgesOfFence(fence, board.columns);
  const seats = (seatsOnEdge[first] ?? 0) | (seatsOnEdge[second] ?? 0);
  if (seats === 0) return distances;
  setFence(table, board.columns, fence, 1);
  const after = [...distances];
  let sealed = false;
  for (let seat = 0; seat < after.length && !sealed; seat += 1) {
    if ((seats & (1 << seat)) === 0) continue;
    const { distance } = searchWay(table, board, seat);
    after[seat] = distance;
    sealed = distance < 0;
  }
  setFence(table, board.columns, fence, 0);
  return sealed ? null : after;
}

/** The cells next to the pawn of `player` that no fence closes. */
export function openSteps(
  table: EdgeTable,
  board: FenceRaceBoard,
  player: PlayerIndex,
): readonly FenceRaceCell[] {
  const pawn = board.pawns[player];
  if (pawn === undefined) return [];
  return STEP_DIRECTIONS.flatMap(([dr, dc]) =>
    isStepOpen(table, board.rows, board.columns, pawn.row, pawn.col, dr, dc)
      ? [{ row: pawn.row + dr, col: pawn.col + dc }]
      : [],
  );
}

/** A fence that is there already and stands in the way of a new one. */
export interface FenceInTheWay {
  readonly code: typeof FENCE_RACE_ISSUE.Overlap | typeof FENCE_RACE_ISSUE.Cross;
  readonly fence: Fence;
}

/** The fence a new one overlaps or crosses, if any. */
export function fenceInTheWay(
  fences: readonly Fence[],
  { row, col, dir }: Fence,
): FenceInTheWay | null {
  for (const other of fences) {
    if (other.dir !== dir) {
      if (other.row === row && other.col === col) {
        return { code: FENCE_RACE_ISSUE.Cross, fence: other };
      }
      continue;
    }
    const along =
      dir === "h"
        ? other.row === row && Math.abs(other.col - col) <= 1
        : other.col === col && Math.abs(other.row - row) <= 1;
    if (along) return { code: FENCE_RACE_ISSUE.Overlap, fence: other };
  }
  return null;
}
