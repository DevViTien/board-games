import { describe, expect, it } from "vitest";

import { jellyCrewFilled, jellyCrewStep } from "./board";
import { JELLY_CREW_DIRECTIONS, JELLY_CREW_MAPS, JELLY_CREW_REASON } from "./constants";
import { JELLY_CREW_MAX_HEIGHT, JELLY_CREW_MAX_WIDTH } from "./layout";
import { JELLY_CREW_LAYOUT_DEFINITIONS, jellyCrewLayout } from "./layouts";
import { JELLY_CREW_SOLUTIONS } from "./layouts.solutions";
import { jellyCrew } from "./rules";
import type { JellyCrewBoard, JellyCrewLayout, JellyCrewState } from "./types";

const PLAYER_COUNTS = [2, 3, 4] as const;
const LAYOUTS = JELLY_CREW_MAPS.flatMap((map) =>
  PLAYER_COUNTS.map((playerCount) => ({ map, playerCount, name: `${map}-${String(playerCount)}` })),
);

/** The most states the doors-closed search may visit before it counts as having failed. */
const SEARCH_LIMIT = 2_000_000;

describe("Bố cục giải được", () => {
  it("has the nine layouts, none wider than 19 or higher than 13", () => {
    expect(JELLY_CREW_LAYOUT_DEFINITIONS).toHaveLength(9);
    for (const { map, playerCount } of LAYOUTS) {
      const layout = jellyCrewLayout(map, playerCount);
      expect(layout.width).toBeLessThanOrEqual(JELLY_CREW_MAX_WIDTH);
      expect(layout.height).toBeLessThanOrEqual(JELLY_CREW_MAX_HEIGHT);
      expect(layout.start.chars).toHaveLength(playerCount);
    }
  });

  it.each(LAYOUTS)(
    "Phát lại lời giải mẫu: $name is won by everyone within half its rounds",
    ({ map, playerCount, name }) => {
      const moves = JELLY_CREW_SOLUTIONS[name];
      if (moves === undefined) throw new Error(`No solution for ${name}`);
      let state: JellyCrewState = jellyCrew.setup({ playerCount, options: { map } });
      for (const move of moves) {
        expect(jellyCrew.legalMoves(state)).toContain(move);
        state = jellyCrew.applyMove(state, move);
      }
      // The contract suite's `cooperative-winners`, on a won game: random games never win.
      expect(jellyCrew.result(state)).toEqual({
        kind: "win",
        winners: Array.from({ length: playerCount }, (_, seat) => seat),
        reason: JELLY_CREW_REASON.Filled,
      });
      const { rounds } = jellyCrewLayout(map, playerCount);
      const used = Math.floor(state.turnsDone / playerCount) + 1;
      expect(used * 2).toBeLessThanOrEqual(rounds);
    },
  );

  it.each(LAYOUTS)("Không thắng khi cửa luôn đóng: $name", ({ map, playerCount }) => {
    expect(solvableWithDoorsShut(jellyCrewLayout(map, playerCount))).toBe(false);
  });
});

/**
 * Whether the layout can be won if every door stays shut (spec "Bố cục giải được"), by
 * breadth-first search with no turns: any character steps at any time. With the doors as walls
 * the floor splits into rooms that never touch, so each room holding molds is searched alone with
 * the characters and jelly in it, characters unordered; the layout is won only if every one is.
 * Reaching the limit fails the test rather than passing it.
 */
function solvableWithDoorsShut(layout: JellyCrewLayout): boolean {
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
