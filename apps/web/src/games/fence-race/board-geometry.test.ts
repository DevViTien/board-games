import { createRng } from "@board-games/engine";
import type { Fence } from "@board-games/games/fence-race";
import { describe, expect, it } from "vitest";

import {
  boardDirection,
  type BoardGeometry,
  boardHeight,
  boardWidth,
  cellCentre,
  fenceInDirection,
  fenceInOrder,
  fromScreen,
  isNearFence,
  nearestExistingFence,
  nearestFence,
  shiftFence,
  stepHitArea,
  toScreen,
  turnedFence,
} from "./board-geometry";

const TWO: BoardGeometry = { rows: 11, columns: 9, cell: 30, gutter: 16, turned: false };
const TURNED: BoardGeometry = { ...TWO, turned: true };

describe("the board on screen", () => {
  it("is the fields and the mat around them", () => {
    expect(boardWidth(TWO)).toBe(9 * 30 + 32);
    expect(boardHeight(TWO)).toBe(11 * 30 + 32);
  });

  it("puts a point of the board on screen, with the board as it is or turned", () => {
    expect(toScreen(TWO, 0, 0)).toEqual({ x: 16, y: 16 });
    expect(toScreen(TWO, 9, 11)).toEqual({ x: 16 + 270, y: 16 + 330 });
    expect(toScreen(TURNED, 0, 0)).toEqual({ x: 16 + 270, y: 16 + 330 });
    expect(toScreen(TURNED, 9, 11)).toEqual({ x: 16, y: 16 });
  });

  it("finds the same point back", () => {
    for (const geometry of [TWO, TURNED]) {
      const screen = toScreen(geometry, 3.25, 7.5);
      expect(fromScreen(geometry, screen)).toEqual({ a: 3.25, b: 7.5 });
    }
  });

  it("puts a cell's centre where the cell is", () => {
    expect(cellCentre(TWO, { row: 0, col: 0 })).toEqual({ x: 31, y: 31 });
    // The first seat's start, at the bottom: at the top of the screen when turned.
    expect(cellCentre(TURNED, { row: 10, col: 4 })).toEqual({ x: 151, y: 31 });
  });

  it("turns an arrow on screen into a direction on the board", () => {
    expect(boardDirection(TWO, { dr: -1, dc: 0 })).toEqual({ dr: -1, dc: 0 });
    expect(boardDirection(TURNED, { dr: -1, dc: 0 })).toEqual({ dr: 1, dc: 0 });
    expect(boardDirection(TURNED, { dr: 0, dc: 1 })).toEqual({ dr: 0, dc: -1 });
  });
});

describe("nearestFence", () => {
  it("takes the nearest line's direction on a first touch", () => {
    // Close to the line between rows 4 and 5 (from the top), in the middle of a column.
    expect(nearestFence(TWO, { a: 3.5, b: 5.05 })).toEqual({ row: 4, col: 3, dir: "h" });
    // Close to the line between columns, in the middle of a row.
    expect(nearestFence(TWO, { a: 3.05, b: 5.5 })).toEqual({ row: 5, col: 2, dir: "v" });
  });

  it("stays on the board at every edge", () => {
    expect(nearestFence(TWO, { a: -2, b: 0.05 })).toEqual({ row: 0, col: 0, dir: "v" });
    expect(nearestFence(TWO, { a: 40, b: 40 })).toMatchObject({ row: 9, col: 7 });
  });

  it("keeps a direction once it has one", () => {
    expect(nearestFence(TWO, { a: 3.05, b: 5.5 }, "h")).toMatchObject({ dir: "h" });
    expect(nearestFence(TWO, { a: 3.5, b: 5.05 }, "v")).toMatchObject({ dir: "v" });
  });

  it("holds a fence in place under a still finger, and lets it go past the sticky distance", () => {
    const current = { row: 4, col: 3, dir: "h" as const };

    expect(nearestFence(TWO, { a: 4.55, b: 5 }, "h", current)).toEqual(current);
    expect(nearestFence(TWO, { a: 4.7, b: 5 }, "h", current)).toEqual({ ...current, col: 4 });
  });
});

describe("the fences on the board", () => {
  const fences = [
    { row: 2, col: 2, dir: "h" as const },
    { row: 2, col: 5, dir: "h" as const },
    { row: 6, col: 2, dir: "v" as const },
  ];

  it("finds the fence nearest a touch, along its whole length", () => {
    // Over the end of the first fence, not its middle.
    expect(nearestExistingFence(fences, { a: 2.1, b: 3.1 })).toBe(fences[0]);
    expect(nearestExistingFence(fences, { a: 3, b: 7.5 })).toBe(fences[2]);
    expect(nearestExistingFence([], { a: 3, b: 3 })).toBeNull();
  });

  it("jumps to the nearest fence in a direction", () => {
    const [first, second, third] = fences;
    if (first === undefined || second === undefined || third === undefined) throw new Error();

    expect(fenceInDirection(fences, first, { dr: 0, dc: 1 })).toBe(second);
    expect(fenceInDirection(fences, second, { dr: 0, dc: -1 })).toBe(first);
    expect(fenceInDirection(fences, first, { dr: 1, dc: 0 })).toBe(third);
    // Nothing that way: it stays.
    expect(fenceInDirection(fences, first, { dr: -1, dc: 0 })).toBeNull();
    expect(fenceInDirection(fences, second, { dr: 0, dc: 1 })).toBeNull();
  });

  it("does not stop on an empty position: only fences are returned", () => {
    const [first] = fences;
    if (first === undefined) throw new Error();
    const next = fenceInDirection(fences, first, { dr: 0, dc: 1 });

    expect(fences).toContain(next);
  });

  it("shifts a fence along crossings, stopping at the edge", () => {
    expect(shiftFence(TWO, { row: 0, col: 3, dir: "h" }, { dr: -1, dc: 0 })).toEqual({
      row: 0,
      col: 3,
      dir: "h",
    });
    expect(shiftFence(TWO, { row: 9, col: 7, dir: "v" }, { dr: 1, dc: 1 })).toEqual({
      row: 9,
      col: 7,
      dir: "v",
    });
    expect(shiftFence(TWO, { row: 4, col: 3, dir: "h" }, { dr: 1, dc: 0 })).toEqual({
      row: 5,
      col: 3,
      dir: "h",
    });
  });

  it("turns a fence on its crossing", () => {
    expect(turnedFence({ row: 4, col: 3, dir: "h" })).toEqual({ row: 4, col: 3, dir: "v" });
    expect(turnedFence({ row: 4, col: 3, dir: "v" })).toEqual({ row: 4, col: 3, dir: "h" });
  });

  it("counts a touch within two and a half cells as a grab", () => {
    const fence = { row: 4, col: 3, dir: "h" as const };

    expect(isNearFence(fence, { a: 4, b: 7.4 })).toBe(true);
    expect(isNearFence(fence, { a: 4, b: 7.6 })).toBe(false);
  });
});

describe("stepHitArea", () => {
  it("is the cell itself in a cell large enough", () => {
    expect(stepHitArea(30, { dr: -1, dc: 0 })).toEqual({ left: 0, top: 0, width: 30, height: 30 });
  });

  it.each([
    [18.9, { dr: -1, dc: 0 }],
    [18.9, { dr: 1, dc: 0 }],
    [18.9, { dr: 0, dc: -1 }],
    [18.9, { dr: 0, dc: 1 }],
    [21.2, { dr: -1, dc: 0 }],
    [24.3, { dr: 0, dc: 1 }],
  ])("is at least 24 × 24 px in a cell of %s px, reaching away from the pawn", (cell, step) => {
    const area = stepHitArea(cell, step);

    expect(area.width).toBeGreaterThanOrEqual(24);
    expect(area.height).toBeGreaterThanOrEqual(24);
    // The cell stays inside the area, on the side of the pawn.
    if (step.dr === -1) expect(area.top + area.height).toBeCloseTo(cell);
    if (step.dr === 1) expect(area.top).toBeCloseTo(0);
    if (step.dc === -1) expect(area.left + area.width).toBeCloseTo(cell);
    if (step.dc === 1) expect(area.left).toBeCloseTo(0);
  });

  it("keeps two targets of a pawn apart but for a corner", () => {
    const cell = 18.9;
    const up = stepHitArea(cell, { dr: -1, dc: 0 });
    const right = stepHitArea(cell, { dr: 0, dc: 1 });
    // On screen, around the pawn's cell at (0, 0): up is the cell above, right the cell beside.
    const upBox = { left: up.left, right: up.left + up.width, bottom: -cell + up.top + up.height };
    const rightBox = {
      left: cell + right.left,
      top: right.top,
    };
    const overlapX = upBox.right - rightBox.left;
    const overlapY = upBox.bottom - rightBox.top;

    expect(Math.min(overlapX, overlapY)).toBeLessThanOrEqual(3);
  });
});

describe("fenceInOrder", () => {
  const A = { row: 1, col: 1, dir: "v" } as const;
  const B = { row: 2, col: 6, dir: "h" } as const;
  const C = { row: 6, col: 3, dir: "v" } as const;

  it("goes round, either way", () => {
    expect(fenceInOrder([A, B, C], A, 1)).toEqual(B);
    expect(fenceInOrder([A, B, C], C, 1)).toEqual(A);
    expect(fenceInOrder([A, B, C], A, -1)).toEqual(C);
  });

  it("starts from either end with no fence chosen, or one no longer there", () => {
    expect(fenceInOrder([A, B, C], null, 1)).toEqual(A);
    expect(fenceInOrder([A, B, C], null, -1)).toEqual(C);
    expect(fenceInOrder([A, B], C, 1)).toEqual(A);
  });

  it("has nothing to go to with no fence", () => {
    expect(fenceInOrder([], null, 1)).toBeNull();
    expect(fenceInOrder([], A, -1)).toBeNull();
  });

  it("reaches every fence of any set, which the arrows do not always do, the board turned or not", () => {
    const rng = createRng(12345);
    const SCREEN_ARROWS = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];
    const keyOf = (fence: Fence) => `${fence.dir}:${fence.row}:${fence.col}`;
    const allRows = new Set<number>();
    const allCols = new Set<number>();
    const allDirs = new Set<string>();
    let arrowsMiss = 0;
    for (let round = 0; round < 3000; round += 1) {
      // As on a board: none on the place of another, overlapping it or crossing it.
      const fences: Fence[] = [];
      for (let count = rng.nextInt(2, 19); count > 0; count -= 1) {
        const fence: Fence = {
          row: rng.nextInt(0, 9),
          col: rng.nextInt(0, 7),
          dir: rng.nextInt(0, 1) === 0 ? "h" : "v",
        };
        const taken = fences.some(
          (other) =>
            (other.row === fence.row && other.col === fence.col) ||
            (other.dir === fence.dir &&
              (fence.dir === "h"
                ? other.row === fence.row && Math.abs(other.col - fence.col) === 1
                : other.col === fence.col && Math.abs(other.row - fence.row) === 1)),
        );
        if (taken) continue;
        fences.push(fence);
        allRows.add(fence.row);
        allCols.add(fence.col);
        allDirs.add(fence.dir);
      }
      for (const step of [1, -1] as const) {
        const seen = new Set<string>();
        let at: Fence | null = null;
        for (let left = fences.length; left > 0; left -= 1) {
          at = fenceInOrder(fences, at, step);
          if (at !== null) seen.add(keyOf(at));
        }
        expect(seen.size).toBe(fences.length);
      }
      // What PageUp and PageDown are there for, kept honest: the same whichever way the board faces.
      const first = fences[0];
      if (first === undefined) continue;
      const reachedBy = (geometry: BoardGeometry) => {
        const reached = new Set([keyOf(first)]);
        const waiting = [first];
        for (let from = waiting.pop(); from !== undefined; from = waiting.pop()) {
          for (const arrow of SCREEN_ARROWS) {
            const there = fenceInDirection(fences, from, boardDirection(geometry, arrow));
            if (there !== null && !reached.has(keyOf(there))) {
              reached.add(keyOf(there));
              waiting.push(there);
            }
          }
        }
        return reached.size;
      };
      const asIs = reachedBy(TWO);
      expect(reachedBy(TURNED)).toBe(asIs);
      if (asIs < fences.length) arrowsMiss += 1;
    }
    expect(arrowsMiss).toBeGreaterThan(0);
    // The sets were really of all kinds.
    expect(allRows.size).toBe(10);
    expect(allCols.size).toBe(8);
    expect(allDirs.size).toBe(2);
  });
});
