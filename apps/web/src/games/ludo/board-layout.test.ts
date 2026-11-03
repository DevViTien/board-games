import { HORSES, LUDO_COLOUR, OWN_GATE, SEGMENT, TRACK_LENGTH } from "@board-games/games/ludo";
import { describe, expect, it } from "vitest";

import { GRID, horsePoint, stableArea, stableSlot, stepCells, TRACK_CELLS } from "./board-layout";

const COLOURS = Object.values(LUDO_COLOUR);
const key = ([row, col]: readonly [number, number]) => `${row},${col}`;

describe("board layout", () => {
  it("draws 56 distinct track squares inside the board", () => {
    expect(TRACK_CELLS).toHaveLength(TRACK_LENGTH);
    expect(new Set(TRACK_CELLS.map(key)).size).toBe(TRACK_LENGTH);
    for (const [row, col] of TRACK_CELLS) {
      expect(row).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThan(GRID);
    }
  });

  it("lays the track squares next to each other in order, round the loop", () => {
    TRACK_CELLS.forEach(([row, col], square) => {
      const [nextRow, nextCol] = TRACK_CELLS[(square + 1) % TRACK_LENGTH] ?? [0, 0];
      expect(Math.abs(nextRow - row) + Math.abs(nextCol - col), `square ${square}`).toBe(1);
    });
  });

  it("gives every colour 14 squares, its start square at the head of its arm", () => {
    expect(TRACK_CELLS.slice(0, SEGMENT)).toHaveLength(14);
    expect(COLOURS.map((colour) => key(TRACK_CELLS[colour * SEGMENT] ?? [0, 0]))).toEqual([
      "0,8",
      "8,14",
      "14,6",
      "6,0",
    ]);
    // Each home entry is the square just before its colour's start square, at the arm's end.
    expect(
      COLOURS.map((colour) =>
        key(TRACK_CELLS[(colour * SEGMENT + OWN_GATE) % TRACK_LENGTH] ?? [0, 0]),
      ),
    ).toEqual(["0,7", "7,14", "14,7", "7,0"]);
  });

  it("runs each colour's six home steps from its home entry towards the centre", () => {
    expect(stepCells(LUDO_COLOUR.Red).map(key)).toEqual(["1,7", "2,7", "3,7", "4,7", "5,7", "6,7"]);
    for (const colour of COLOURS) {
      const steps = stepCells(colour);
      expect(steps).toHaveLength(6);
      for (const step of steps) expect(TRACK_CELLS.map(key)).not.toContain(key(step));
    }
  });

  it("keeps the stables clear of the track, each with four slots inside it", () => {
    const trackPoints = TRACK_CELLS.map(([row, col]) => ({ x: col + 0.5, y: row + 0.5 }));
    for (const colour of COLOURS) {
      const area = stableArea(colour);
      for (let horse = 0; horse < HORSES; horse += 1) {
        const slot = stableSlot(colour, horse);
        expect(slot.x).toBeGreaterThan(area.x);
        expect(slot.x).toBeLessThan(area.x + area.size);
        expect(slot.y).toBeGreaterThan(area.y);
        expect(slot.y).toBeLessThan(area.y + area.size);
      }
      for (const point of trackPoints) {
        const inside =
          point.x > area.x &&
          point.x < area.x + area.size &&
          point.y > area.y &&
          point.y < area.y + area.size;
        expect(inside).toBe(false);
      }
    }
  });

  it("draws a horse on the square of its progress", () => {
    expect(horsePoint(LUDO_COLOUR.Blue, 0, 0)).toEqual({ x: 14.5, y: 8.5 });
    expect(horsePoint(LUDO_COLOUR.Red, 0, OWN_GATE + 6)).toEqual({ x: 7.5, y: 6.5 });
  });
});
