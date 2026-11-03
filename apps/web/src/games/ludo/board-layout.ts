import {
  cellOf,
  HORSES,
  IN_STABLE,
  type LudoColour,
  OWN_GATE,
  SEGMENT,
  TRACK_LENGTH,
} from "@board-games/games/ludo";

// Where things are drawn on the 15×15 cross-shaped board (design §1, §8). A point is the centre of a
// grid cell, `{ x: column + 0.5, y: row + 0.5 }`, in the SVG's units.

export const GRID = 15;

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Row and column of a grid cell. */
type RowCol = readonly [row: number, col: number];

const centre = ([row, col]: RowCol): Point => ({ x: col + 0.5, y: row + 0.5 });

/** Turns a point a quarter turn clockwise around the centre of the board, `times` times. */
function rotate([row, col]: RowCol, times: number): RowCol {
  let point: RowCol = [row, col];
  for (let turn = 0; turn < times; turn += 1) point = [point[1], GRID - 1 - point[0]];
  return point;
}

/**
 * Red's segment of the track, from its start square: down the right column of the top arm, the
 * corner square, out along the top row of the right arm, and Blue's home entry at the end of that
 * arm. Every other colour's segment is the same turned a quarter turn per colour.
 */
const RED_SEGMENT: readonly RowCol[] = [
  [0, 8],
  [1, 8],
  [2, 8],
  [3, 8],
  [4, 8],
  [5, 8],
  [5, 9],
  [6, 9],
  [6, 10],
  [6, 11],
  [6, 12],
  [6, 13],
  [6, 14],
  [7, 14],
];

/** The grid cell of every track square, by its number 0…55 (Red's start square is 0). */
export const TRACK_CELLS: readonly RowCol[] = Array.from({ length: TRACK_LENGTH }, (_unused, n) => {
  const cell = RED_SEGMENT[n % SEGMENT] ?? [0, 0];
  return rotate(cell, Math.floor(n / SEGMENT));
});

/** Red's home steps 1–6, from its home entry down towards the centre. */
const RED_STEPS: readonly RowCol[] = [1, 2, 3, 4, 5, 6].map((row) => [row, 7]);

/** The grid cells of a colour's home steps 1–6. */
export function stepCells(colour: LudoColour): readonly RowCol[] {
  return RED_STEPS.map((cell) => rotate(cell, colour));
}

/** The 6×6 corner block holding a colour's stable: next to its start square. Its top-left cell. */
function stableCorner(colour: LudoColour): RowCol {
  // Red's start square (0, 8) is next to the top-right block.
  const corners: readonly RowCol[] = [
    [0, 9],
    [9, 9],
    [9, 0],
    [0, 0],
  ];
  return corners[colour] ?? [0, 0];
}

/** The square drawn as a colour's stable, inside its corner block, as `{ x, y, size }`. */
export function stableArea(colour: LudoColour): {
  readonly x: number;
  readonly y: number;
  readonly size: number;
} {
  const [row, col] = stableCorner(colour);
  return { x: col + 1, y: row + 1, size: 4 };
}

/** Where the stable's horse `horse` waits. */
export function stableSlot(colour: LudoColour, horse: number): Point {
  const [row, col] = stableCorner(colour);
  return { x: col + 2 + 2 * (horse % 2), y: row + 2 + 2 * Math.floor(horse / 2) };
}

/** The grid cell of a track square or home step of `colour` at `progress` (not the stable). */
function cellAtProgress(colour: LudoColour, progress: number): RowCol {
  if (progress > OWN_GATE) return stepCells(colour)[progress - OWN_GATE - 1] ?? [7, 7];
  return TRACK_CELLS[cellOf(colour, progress)] ?? [7, 7];
}

/** Where a horse of `colour` (horse number `horse`) at `progress` is drawn. */
export function horsePoint(colour: LudoColour, horse: number, progress: number): Point {
  if (progress === IN_STABLE) return stableSlot(colour, horse);
  return centre(cellAtProgress(colour, progress));
}

/** Every horse slot of a stable, for drawing the empty places. */
export const STABLE_SLOTS = Array.from({ length: HORSES }, (_unused, horse) => horse);
