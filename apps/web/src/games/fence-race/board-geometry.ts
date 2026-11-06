import type { Fence, FenceDirection, FenceRaceCell } from "@board-games/games/fence-race";

// Where things are on screen, and what a touch means: plain numbers, tested on their own. The board
// is in "lines": `a` counts the lines between columns from the left, `b` the lines between rows from
// the top, as the first seat sees the board. A cell is the square between lines `col`…`col + 1`,
// `row`…`row + 1`; the fence (`row`, `col`) has its middle at line `col + 1`, line `row + 1`.

export interface BoardGeometry {
  readonly rows: number;
  readonly columns: number;
  /** A cell's side, in pixels. */
  readonly cell: number;
  /** The mat around the fields, where the gates and the names of the rows and columns are. */
  readonly gutter: number;
  /** Turned half a circle: the second seat of two has its pawn at the bottom of the screen. */
  readonly turned: boolean;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** A place in the board's lines. */
export interface BoardPoint {
  readonly a: number;
  readonly b: number;
}

/** A direction on the board (or on screen): one of the four arrows. */
export interface Direction {
  readonly dr: number;
  readonly dc: number;
}

export function boardWidth({ columns, cell, gutter }: BoardGeometry): number {
  return columns * cell + 2 * gutter;
}

export function boardHeight({ rows, cell, gutter }: BoardGeometry): number {
  return rows * cell + 2 * gutter;
}

/** The screen's place of a point on the board, in pixels from the mat's top left corner. */
export function toScreen(
  { rows, columns, cell, gutter, turned }: BoardGeometry,
  a: number,
  b: number,
) {
  const u = turned ? columns - a : a;
  const v = turned ? rows - b : b;
  return { x: gutter + u * cell, y: gutter + v * cell };
}

/** The board's point under a place on screen; off the fields it runs past the first or last line. */
export function fromScreen(
  { rows, columns, cell, gutter, turned }: BoardGeometry,
  { x, y }: Point,
): BoardPoint {
  const u = (x - gutter) / cell;
  const v = (y - gutter) / cell;
  return turned ? { a: columns - u, b: rows - v } : { a: u, b: v };
}

export function cellCentre(geometry: BoardGeometry, { row, col }: FenceRaceCell): Point {
  return toScreen(geometry, col + 0.5, row + 0.5);
}

/** A direction on screen, as a direction on the board (the arrows follow the screen). */
export function boardDirection(
  { turned }: Pick<BoardGeometry, "turned">,
  screen: Direction,
): Direction {
  // Not `-0`: these are added to indexes and compared in tests.
  return turned ? { dr: 0 - screen.dr, dc: 0 - screen.dc } : screen;
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

/** A fence keeps its place under a still finger until it has clearly moved past half a cell. */
const STICKY_CELLS = 0.62;

/**
 * The fence nearest a point. A first touch takes the direction of the nearest line; after that the
 * direction is kept (`keep`), and only the place moves. `current` stays put while the point is close
 * to it, so a fence does not tremble between two places.
 */
export function nearestFence(
  { rows, columns }: Pick<BoardGeometry, "rows" | "columns">,
  { a, b }: BoardPoint,
  keep: FenceDirection | null = null,
  current: Fence | null = null,
): Fence {
  const fromColumnLine = Math.abs(a - Math.round(a));
  const fromRowLine = Math.abs(b - Math.round(b));
  const dir = keep ?? (fromRowLine < fromColumnLine ? "h" : "v");
  let lineA = clamp(Math.round(a), 1, columns - 1);
  let lineB = clamp(Math.round(b), 1, rows - 1);
  if (current?.dir === dir) {
    if (Math.abs(a - (current.col + 1)) < STICKY_CELLS) lineA = current.col + 1;
    if (Math.abs(b - (current.row + 1)) < STICKY_CELLS) lineB = current.row + 1;
  }
  return { row: lineB - 1, col: lineA - 1, dir };
}

/** The fence on the board nearest a point: the distance to its whole length, not its middle. */
export function nearestExistingFence(fences: readonly Fence[], { a, b }: BoardPoint): Fence | null {
  let best: Fence | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const fence of fences) {
    const lineA = fence.col + 1;
    const lineB = fence.row + 1;
    const alongA = fence.dir === "h" ? clamp(a, lineA - 1, lineA + 1) : lineA;
    const alongB = fence.dir === "v" ? clamp(b, lineB - 1, lineB + 1) : lineB;
    const distance = Math.hypot(a - alongA, b - alongB);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = fence;
    }
  }
  return best;
}

/**
 * The fence on the board next to `from` in a direction: the nearest one that way, one straight
 * ahead preferred, or `null` if none lies that way.
 */
export function fenceInDirection(
  fences: readonly Fence[],
  from: Fence,
  { dr, dc }: Direction,
): Fence | null {
  let best: Fence | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const fence of fences) {
    const down = fence.row - from.row;
    const right = fence.col - from.col;
    const along = down * dr + right * dc;
    if (along <= 0) continue;
    const across = Math.abs(down * dc) + Math.abs(right * dr);
    const score = along + 2 * across;
    if (score < bestScore) {
      bestScore = score;
      best = fence;
    }
  }
  return best;
}

/**
 * The next (`step` 1) or previous (-1) of `fences` after `from`, going round: unlike a direction, it
 * reaches every one of them whatever their places. From no fence, the first or the last.
 */
export function fenceInOrder(
  fences: readonly Fence[],
  from: Fence | null,
  step: 1 | -1,
): Fence | null {
  const at =
    from === null
      ? -1
      : fences.findIndex(
          (fence) => fence.row === from.row && fence.col === from.col && fence.dir === from.dir,
        );
  if (fences.length === 0) return null;
  const next = at === -1 ? (step === 1 ? 0 : fences.length - 1) : at + step;
  return fences[(next + fences.length) % fences.length] ?? null;
}

/** A fence moved one crossing in a direction, kept on the board and keeping its direction. */
export function shiftFence(
  { rows, columns }: Pick<BoardGeometry, "rows" | "columns">,
  { row, col, dir }: Fence,
  { dr, dc }: Direction,
): Fence {
  return { row: clamp(row + dr, 0, rows - 2), col: clamp(col + dc, 0, columns - 2), dir };
}

export function turnedFence(fence: Fence): Fence {
  return { ...fence, dir: fence.dir === "h" ? "v" : "h" };
}

/** Where a touch counts as a grab rather than a new place: within this many cells of the fence. */
const GRAB_CELLS = 2.5;

export function isNearFence(fence: Fence, { a, b }: BoardPoint): boolean {
  return Math.hypot(a - (fence.col + 1), b - (fence.row + 1)) <= GRAB_CELLS;
}

/** Below this cell size a target gets more room than its cell. */
export const SMALL_CELL_PX = 26;
/** A stretched target: across the step and along it (at least 24 × 24, WCAG 2.2's minimum). */
const TARGET_WIDE_PX = 24;
const TARGET_LONG_PX = 28;

export interface HitArea {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The area a cell the pawn can step to answers to, relative to its own box: the cell itself, or, in
 * a cell below `SMALL_CELL_PX`, one reaching past the cell away from the pawn, so that the areas of
 * two targets only touch at a corner. `step` is the direction from the pawn, on screen.
 */
export function stepHitArea(cell: number, step: Direction): HitArea {
  if (cell >= SMALL_CELL_PX) return { left: 0, top: 0, width: cell, height: cell };
  const width = step.dc === 0 ? TARGET_WIDE_PX : TARGET_LONG_PX;
  const height = step.dr === 0 ? TARGET_WIDE_PX : TARGET_LONG_PX;
  return {
    left: (cell - width) / 2 + (step.dc * (TARGET_LONG_PX - cell)) / 2,
    top: (cell - height) / 2 + (step.dr * (TARGET_LONG_PX - cell)) / 2,
    width,
    height,
  };
}
