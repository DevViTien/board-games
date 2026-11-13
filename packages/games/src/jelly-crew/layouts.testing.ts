// The search for a win with every door shut (spec "Bố cục giải được"), on the board alone: kept apart
// from the layouts' tests so a draft map can be checked with it while it is designed.
import { jellyCrewFilled, jellyCrewStep } from "./board";
import { JELLY_CREW_DIRECTIONS } from "./constants";
import type { JellyCrewBoard, JellyCrewLayout } from "./types";

/** The most states the doors-closed search may visit before it counts as having failed. */
const SEARCH_LIMIT = 2_000_000;

/**
 * Whether the layout can be won if every door stays shut (spec "Bố cục giải được"), by
 * breadth-first search with no turns: any character steps at any time. With the doors as walls
 * the floor splits into rooms that never touch, so each room holding molds is searched alone with
 * the characters and jelly in it, characters unordered; the layout is won only if every one is.
 * Reaching the limit throws rather than answering.
 */
export function jellyCrewSolvableWithDoorsShut(layout: JellyCrewLayout): boolean {
  const walls = new Set([...layout.walls, ...layout.doors.keys()]);
  const grid = { ...layout, walls, doors: new Map(), plates: new Map() };
  const room = roomsOf(layout.width, layout.height, walls);
  const roomsWithMolds = new Set([...layout.molds.keys()].map((cell) => room.get(cell)));
  return [...roomsWithMolds].every((id) => {
    const chars = layout.start.chars.filter((cell) => room.get(cell) === id);
    const pieces = layout.start.pieces.filter((piece) => room.get(piece.cells[0] ?? -1) === id);
    const molds = new Map([...layout.molds].filter(([cell]) => room.get(cell) === id));
    return searchRoom({ ...grid, molds }, { chars, pieces });
  });
}

function roomsOf(width: number, height: number, walls: ReadonlySet<number>) {
  const room = new Map<number, number>();
  for (let start = 0; start < width * height; start += 1) {
    if (walls.has(start) || room.has(start)) continue;
    const queue = [start];
    room.set(start, start);
    for (let cell = queue.shift(); cell !== undefined; cell = queue.shift()) {
      for (const next of [cell - 1, cell + 1, cell - width, cell + width]) {
        if (next >= 0 && next < width * height && !walls.has(next) && !room.has(next)) {
          room.set(next, start);
          queue.push(next);
        }
      }
    }
  }
  return room;
}

function searchRoom(grid: Parameters<typeof jellyCrewStep>[0], start: JellyCrewBoard): boolean {
  if (jellyCrewFilled(grid, start)) return true;
  const keyOf = (board: JellyCrewBoard) =>
    `${[...board.chars].sort((a, b) => a - b).join(",")}|${board.pieces.map((piece) => piece.cells.map((cell, at) => `${String(cell)}${piece.kinds[at] ?? ""}`).join(".")).join("/")}`;
  const seen = new Set([keyOf(start)]);
  const queue = [start];
  // Boards found while searching are appended: `for…of` visits them too, in order.
  for (const board of queue) {
    for (let seat = 0; seat < board.chars.length; seat += 1) {
      for (const direction of JELLY_CREW_DIRECTIONS) {
        const step = jellyCrewStep(grid, board, seat, direction);
        if (!step.ok) continue;
        if (jellyCrewFilled(grid, step.board)) return true;
        const key = keyOf(step.board);
        if (seen.has(key)) continue;
        seen.add(key);
        if (seen.size > SEARCH_LIMIT) throw new Error("The doors-closed search reached its limit");
        queue.push(step.board);
      }
    }
  }
  return false;
}
