import type { Fence, FenceRaceCell, FenceRaceSide } from "@board-games/games/fence-race";

import {
  type BoardGeometry,
  cellCentre,
  type Direction,
  type Point,
  toScreen,
} from "./board-geometry";

export type { BoardGeometry } from "./board-geometry";

// The drawing's numbers, in pixels: the board's own pieces and the rules' figures share them.

/** One decimal is plenty on screen, and keeps the markup short. */
export function n1(value: number): number {
  return Math.round(value * 10) / 10;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function columnName(col: number): string {
  return LETTERS[col] ?? "";
}

/** Rows are named from the bottom, as the first seat sees the board. */
export function rowName(row: number, rows: number): number {
  return rows - row;
}

/** A cell's name, the same on every player's screen: "C5". */
export function cellName({ row, col }: FenceRaceCell, rows: number): string {
  return `${columnName(col)}${rowName(row, rows)}`;
}

/** The kind of field a cell is (0–2). It goes with the cell, so both players see the same map. */
export function plotKind(row: number, col: number, rows: number): number {
  // Counted from the bottom, as on the mockup.
  const y = rows - 1 - row;
  return (col * 5 + y * 3 + ((col * y) % 4) + (col >> 1)) % 3;
}

/** Which of the two ways a field's rows run. */
export function plotTurned(row: number, col: number, rows: number): boolean {
  return (col * 3 + (rows - 1 - row) * 5) % 2 === 1;
}

/**
 * The rows drawn in a field, as a path: young rice in short strokes, ripe rice leaning, a ploughed
 * field in furrows across it. `turned`: the other way, so the map does not look stamped.
 */
export function fieldRows(
  kind: number,
  turned: boolean,
  x: number,
  y: number,
  cell: number,
): string {
  const unit = cell / 4;
  const half = cell / 2 - cell * 0.06;
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    `M${n1(x1)} ${n1(y1)}L${n1(x2)} ${n1(y2)}`;
  let path = "";
  if (kind === 2) {
    const gap = unit * 0.8;
    for (let at = -half + gap / 2; at < half; at += gap) {
      path += turned
        ? line(x + at, y - half, x + at, y + half)
        : line(x - half, y + at, x + half, y + at);
    }
    return path;
  }
  const dash = kind === 0 ? unit * 0.22 : unit * 0.3;
  const angle = kind === 0 ? (turned ? 90 : 0) : turned ? -35 : 35;
  const cos = Math.cos((angle * Math.PI) / 180);
  const sin = Math.sin((angle * Math.PI) / 180);
  const reach = Math.ceil((cell * 0.8) / unit);
  for (let i = -reach; i <= reach; i += 1) {
    for (let j = -reach; j <= reach; j += 1) {
      const u = (i + 0.5) * unit;
      const v = (j + 0.5) * unit;
      const px = x + u * cos - v * sin;
      const py = y + u * sin + v * cos;
      const dx = kind === 0 ? -sin * dash : cos * dash;
      const dy = kind === 0 ? cos * dash : sin * dash;
      if (Math.abs(px - x) + Math.abs(dx) > half || Math.abs(py - y) + Math.abs(dy) > half)
        continue;
      path += line(px - dx, py - dy, px + dx, py + dy);
    }
  }
  return path;
}

/** The edge of the screen an edge of the board is on. */
export function screenSide(side: FenceRaceSide, turned: boolean): FenceRaceSide {
  if (!turned) return side;
  switch (side) {
    case "top":
      return "bottom";
    case "bottom":
      return "top";
    case "left":
      return "right";
    case "right":
      return "left";
  }
}

export interface FenceFrame {
  /** The fence's middle. */
  readonly x: number;
  readonly y: number;
  /** Along a row of the screen, or a column. */
  readonly along: boolean;
  /** Its thickness and length. */
  readonly thick: number;
  readonly length: number;
  readonly transform: string;
}

/** Where a fence is drawn: it stops just short of its ends, so two in a line read as two. */
export function fenceFrame(geometry: BoardGeometry, fence: Fence): FenceFrame {
  const { x, y } = toScreen(geometry, fence.col + 1, fence.row + 1);
  const along = fence.dir === "h";
  const thick = Math.max(geometry.cell < 22 ? 4.5 : 5.5, geometry.cell * 0.17);
  return {
    x,
    y,
    along,
    thick,
    length: geometry.cell * 2 - thick * 0.55,
    transform: `translate(${n1(x)} ${n1(y)})${along ? "" : " rotate(90)"}`,
  };
}

/** The width of a gate's post. */
export function gatePost(cell: number, mat: number): number {
  return Math.max(11, Math.min(mat * 0.8, cell * 0.42));
}

/** The size of the names on the mat. */
export function labelSize(mat: number): number {
  return Math.max(10, Math.min(15, mat * 0.62));
}

/**
 * A gate's outline, seen along an edge: `a` runs along the edge, `b` across it from the outside (0)
 * to the fields (`mat`). Two posts, and between them a long roof with its eaves turned up and a peak
 * in the middle.
 */
export function gatePath(
  start: number,
  end: number,
  mat: number,
  post: number,
  cell: number,
): string {
  const eaves = mat * 0.34;
  const middle = (start + end) / 2;
  const slope = Math.min(cell * 0.5, mat);
  const left = start + post;
  const right = end - post;
  return (
    `M${n1(start)} ${n1(mat)}L${n1(start)} ${n1(mat * 0.1)}Q${n1(start)} 0 ${n1(start + post * 0.25)} 0` +
    `L${n1(left - post * 0.25)} 0Q${n1(left)} 0 ${n1(left)} ${n1(mat * 0.1)}` +
    `L${n1(left)} ${n1(eaves * 0.3)}Q${n1(left + slope * 0.3)} ${n1(eaves)} ${n1(left + slope)} ${n1(eaves)}` +
    `L${n1(middle - slope)} ${n1(eaves)}L${n1(middle)} ${n1(eaves * 0.15)}L${n1(middle + slope)} ${n1(eaves)}` +
    `L${n1(right - slope)} ${n1(eaves)}Q${n1(right - slope * 0.3)} ${n1(eaves)} ${n1(right)} ${n1(eaves * 0.3)}` +
    `L${n1(right)} ${n1(mat * 0.1)}Q${n1(right)} 0 ${n1(right + post * 0.25)} 0` +
    `L${n1(end - post * 0.25)} 0Q${n1(end)} 0 ${n1(end)} ${n1(mat * 0.1)}L${n1(end)} ${n1(mat)}Z`
  );
}

/** What maps a gate drawn along the top of the screen onto each edge of a board this big. */
export function gateTransform(side: FenceRaceSide, width: number, height: number): string {
  switch (side) {
    case "top":
      return "matrix(1 0 0 1 0 0)";
    case "bottom":
      return `matrix(1 0 0 -1 0 ${n1(height)})`;
    case "left":
      return "matrix(0 1 1 0 0 0)";
    case "right":
      return `matrix(0 1 -1 0 ${n1(width)} 0)`;
  }
}

/**
 * The name of screen cell `index` along an edge: it follows the board, not the screen, so both
 * players call a cell the same.
 */
export function edgeCellName(
  { rows, columns, turned }: Pick<BoardGeometry, "rows" | "columns" | "turned">,
  side: FenceRaceSide,
  index: number,
): string {
  if (side === "top" || side === "bottom") {
    return columnName(turned ? columns - 1 - index : index);
  }
  return String(rowName(turned ? rows - 1 - index : index, rows));
}

export interface HatPlace extends Point {
  readonly radius: number;
}

/** Up to four pawns in one cell, each still showing its symbol. */
export function hatPlaces(
  geometry: BoardGeometry,
  cell: FenceRaceCell,
  count: number,
): readonly HatPlace[] {
  const { x, y } = cellCentre(geometry, cell);
  const size = geometry.cell;
  if (count <= 1) return [{ x, y, radius: size * 0.36 }];
  const radius = count === 2 ? size * 0.27 : size * 0.242;
  const offset = count === 2 ? size * 0.2 : size * 0.238;
  const places =
    count === 2
      ? [
          [-1, -1],
          [1, 1],
        ]
      : [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ];
  return places.slice(0, count).map(([dx = 0, dy = 0]) => ({
    x: x + dx * offset,
    y: y + dy * offset,
    radius,
  }));
}

/** The sides of a cell, in the order a cell's name reads them, as directions on screen. */
export const SCREEN_SIDES = [
  { name: "up", dr: -1, dc: 0 },
  { name: "down", dr: 1, dc: 0 },
  { name: "left", dr: 0, dc: -1 },
  { name: "right", dr: 0, dc: 1 },
] as const;

/** The fence closing a side of a cell on the board, among `fences`. */
export function fenceOnSide(
  fences: readonly Fence[],
  { row, col }: FenceRaceCell,
  { dr, dc }: Direction,
): Fence | undefined {
  return fences.find((fence) => {
    if (dr !== 0) {
      const line = dr === -1 ? row - 1 : row;
      return (
        fence.dir === "h" && fence.row === line && (fence.col === col || fence.col === col - 1)
      );
    }
    const line = dc === -1 ? col - 1 : col;
    return fence.dir === "v" && fence.col === line && (fence.row === row || fence.row === row - 1);
  });
}
