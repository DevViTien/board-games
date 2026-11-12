import {
  JELLY_CREW_BLOCKED,
  JELLY_CREW_KIND,
  JELLY_CREW_KINDS,
  type JellyCrewBlocked,
  type JellyCrewDirection,
  type JellyCrewGroup,
  type JellyCrewKind,
} from "./constants";
import type { JellyCrewBoard, JellyCrewLayout, JellyCrewMolds, JellyCrewPiece } from "./types";

/** What the board lives on: the size, and the cells nothing ever enters. */
export interface JellyCrewArea {
  readonly width: number;
  readonly height: number;
  readonly walls: ReadonlySet<number>;
}

/** What a step needs of a layout. */
export type JellyCrewGrid = Pick<
  JellyCrewLayout,
  "width" | "height" | "walls" | "plates" | "doors" | "molds"
>;

const OFFSET: Readonly<Record<JellyCrewDirection, readonly [number, number]>> = {
  U: [0, -1],
  D: [0, 1],
  L: [-1, 0],
  R: [1, 0],
};

/** The cell next to `cell` towards `direction`, or -1 off the board. */
export function jellyCrewNextCell(
  area: Pick<JellyCrewArea, "width" | "height">,
  cell: number,
  direction: JellyCrewDirection,
): number {
  const [dx, dy] = OFFSET[direction];
  const x = (cell % area.width) + dx;
  const y = Math.floor(cell / area.width) + dy;
  return x < 0 || y < 0 || x >= area.width || y >= area.height ? -1 : y * area.width + x;
}

function neighbours(area: JellyCrewArea, cell: number): number[] {
  const out: number[] = [];
  for (const direction of ["U", "D", "L", "R"] as const) {
    const next = jellyCrewNextCell(area, cell, direction);
    if (next !== -1) out.push(next);
  }
  return out;
}

/** Whether two touching cells stick: the same jelly, or grass jelly with any jelly but ice. */
function jellyCrewSticks(a: JellyCrewKind, b: JellyCrewKind): boolean {
  if (a === JELLY_CREW_KIND.Ice || b === JELLY_CREW_KIND.Ice) return false;
  return a === b || a === JELLY_CREW_KIND.Grass || b === JELLY_CREW_KIND.Grass;
}

/**
 * Sticks together whatever touches and sticks (union-find), until nothing more does. Returns the
 * pieces in canonical form: cells increasing in each piece, pieces by their first cell.
 */
export function jellyCrewSettle(
  area: JellyCrewArea,
  pieces: readonly JellyCrewPiece[],
): readonly JellyCrewPiece[] {
  const parent = pieces.map((_, index) => index);
  const find = (index: number): number => {
    let root = index;
    while (parent[root] !== root) root = parent[root] ?? root;
    return root;
  };
  const owner = new Map<number, readonly [number, JellyCrewKind]>();
  pieces.forEach((piece, index) => {
    piece.cells.forEach((cell, at) => {
      owner.set(cell, [index, piece.kinds[at] ?? JELLY_CREW_KIND.Ice]);
    });
  });
  for (const [cell, [index, kind]] of owner) {
    for (const next of neighbours(area, cell)) {
      const other = owner.get(next);
      if (other !== undefined && other[0] !== index && jellyCrewSticks(kind, other[1])) {
        parent[find(index)] = find(other[0]);
      }
    }
  }
  const groups = new Map<number, [number, JellyCrewKind][]>();
  pieces.forEach((piece, index) => {
    const root = find(index);
    const group = groups.get(root) ?? [];
    piece.cells.forEach((cell, at) => {
      group.push([cell, piece.kinds[at] ?? JELLY_CREW_KIND.Ice]);
    });
    groups.set(root, group);
  });
  return [...groups.values()]
    .map((cells) => {
      cells.sort((a, b) => a[0] - b[0]);
      return { cells: cells.map(([cell]) => cell), kinds: cells.map(([, kind]) => kind) };
    })
    .sort((a, b) => (a.cells[0] ?? 0) - (b.cells[0] ?? 0));
}

/** The cells holding a character or a jelly cell. */
function heldCells(board: JellyCrewBoard): Set<number> {
  const held = new Set(board.chars);
  for (const piece of board.pieces) for (const cell of piece.cells) held.add(cell);
  return held;
}

/** The groups whose doors a plate holds open: a plate of the group holds a character or jelly. */
export function jellyCrewHeldGroups(
  grid: Pick<JellyCrewGrid, "plates">,
  board: JellyCrewBoard,
): ReadonlySet<JellyCrewGroup> {
  const held = heldCells(board);
  const groups = new Set<JellyCrewGroup>();
  for (const [cell, group] of grid.plates) if (held.has(cell)) groups.add(group);
  return groups;
}

/**
 * The door cells that are open: their group is held by a plate, or the door itself holds a
 * character or jelly (it is jammed, and never closes on what is in it).
 */
export function jellyCrewOpenDoors(
  grid: Pick<JellyCrewGrid, "plates" | "doors">,
  board: JellyCrewBoard,
): ReadonlySet<number> {
  const held = heldCells(board);
  const groups = jellyCrewHeldGroups(grid, board);
  const open = new Set<number>();
  for (const [cell, group] of grid.doors) if (groups.has(group) || held.has(cell)) open.add(cell);
  return open;
}

/** The mold cells holding the kind they ask for. */
export function jellyCrewMolds(
  grid: Pick<JellyCrewGrid, "molds">,
  board: JellyCrewBoard,
): JellyCrewMolds {
  const kindAt = new Map<number, JellyCrewKind>();
  for (const piece of board.pieces) {
    piece.cells.forEach((cell, index) => {
      const kind = piece.kinds[index];
      if (kind !== undefined) kindAt.set(cell, kind);
    });
  }
  let fitted = 0;
  for (const [cell, kind] of grid.molds) if (kindAt.get(cell) === kind) fitted += 1;
  return { fitted, total: grid.molds.size };
}

export function jellyCrewFilled(grid: Pick<JellyCrewGrid, "molds">, board: JellyCrewBoard) {
  const { fitted, total } = jellyCrewMolds(grid, board);
  return fitted === total;
}

/** Whether two boards hold everything in the same place (both are canonical). */
export function jellyCrewSameBoard(a: JellyCrewBoard, b: JellyCrewBoard): boolean {
  if (a.chars.length !== b.chars.length || a.pieces.length !== b.pieces.length) return false;
  if (a.chars.some((cell, seat) => b.chars[seat] !== cell)) return false;
  return a.pieces.every((piece, index) => {
    const other = b.pieces[index];
    return (
      other?.cells.length === piece.cells.length &&
      piece.cells.every(
        (cell, at) => other.cells[at] === cell && other.kinds[at] === piece.kinds[at],
      )
    );
  });
}

export type JellyCrewStep =
  | {
      readonly ok: true;
      readonly board: JellyCrewBoard;
      /** Indexes in the board before the step of the pieces pushed, increasing. */
      readonly pushed: readonly number[];
      /** The kinds of every piece pushed, in `JELLY_CREW_KINDS` order. */
      readonly pushedKinds: readonly JellyCrewKind[];
    }
  | {
      readonly ok: false;
      readonly blocked: JellyCrewBlocked;
      /** The group of the closed door in the way, for "Cửa ▲ đóng". */
      readonly group?: JellyCrewGroup;
      /** The seat of the character in the way, for "Hồng chắn". */
      readonly seat?: number;
    };

/**
 * One step of `seat`'s character (spec "Đi và đẩy thạch"): walk, or push the piece ahead and every
 * piece it pushes in turn, then let what touches stick. Doors are those of the board before the
 * step. Every other character is in the way; the cell the stepping character leaves is not.
 */
export function jellyCrewStep(
  grid: JellyCrewGrid,
  board: JellyCrewBoard,
  seat: number,
  direction: JellyCrewDirection,
): JellyCrewStep {
  const from = board.chars[seat];
  if (from === undefined) return { ok: false, blocked: JELLY_CREW_BLOCKED.Wall };
  const open = jellyCrewOpenDoors(grid, board);
  const closedGroup = (cell: number): JellyCrewGroup | undefined =>
    open.has(cell) ? undefined : grid.doors.get(cell);
  const seatAt = (cell: number): number => {
    const index = board.chars.indexOf(cell);
    return index === seat ? -1 : index;
  };

  const target = jellyCrewNextCell(grid, from, direction);
  if (target === -1 || grid.walls.has(target))
    return { ok: false, blocked: JELLY_CREW_BLOCKED.Wall };
  const door = closedGroup(target);
  if (door !== undefined) return { ok: false, blocked: JELLY_CREW_BLOCKED.Door, group: door };
  const other = seatAt(target);
  if (other !== -1) return { ok: false, blocked: JELLY_CREW_BLOCKED.Seat, seat: other };

  const owner = new Map<number, number>();
  board.pieces.forEach((piece, index) => {
    for (const cell of piece.cells) owner.set(cell, index);
  });
  const chars = board.chars.map((cell, index) => (index === seat ? target : cell));
  const first = owner.get(target);
  if (first === undefined) {
    return { ok: true, board: { chars, pieces: board.pieces }, pushed: [], pushedKinds: [] };
  }

  const pushed = new Set([first]);
  const queue = [first];
  for (let index = queue.shift(); index !== undefined; index = queue.shift()) {
    const piece = board.pieces[index];
    if (piece === undefined) continue;
    for (const cell of piece.cells) {
      const next = jellyCrewNextCell(grid, cell, direction);
      if (next === -1 || grid.walls.has(next)) {
        return { ok: false, blocked: JELLY_CREW_BLOCKED.PushWall };
      }
      const pushDoor = closedGroup(next);
      if (pushDoor !== undefined) {
        return { ok: false, blocked: JELLY_CREW_BLOCKED.PushDoor, group: pushDoor };
      }
      const blocker = seatAt(next);
      if (blocker !== -1) return { ok: false, blocked: JELLY_CREW_BLOCKED.PushSeat, seat: blocker };
      const nextPiece = owner.get(next);
      if (nextPiece !== undefined && !pushed.has(nextPiece)) {
        pushed.add(nextPiece);
        queue.push(nextPiece);
      }
    }
  }

  const moved = board.pieces.map((piece, index) =>
    pushed.has(index)
      ? { ...piece, cells: piece.cells.map((cell) => jellyCrewNextCell(grid, cell, direction)) }
      : piece,
  );
  const kinds = new Set([...pushed].flatMap((index) => board.pieces[index]?.kinds ?? []));
  return {
    ok: true,
    board: { chars, pieces: jellyCrewSettle(grid, moved) },
    pushed: [...pushed].sort((a, b) => a - b),
    pushedKinds: JELLY_CREW_KINDS.filter((kind) => kinds.has(kind)),
  };
}
