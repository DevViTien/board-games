import { describe, expect, it } from "vitest";

import { GATE_PROGRESS, LUDO_COLOUR, OWN_GATE, TRACK_LENGTH } from "./constants";
import { kickedAt, targetOf } from "./moves";
import { position } from "./test-positions";
import { cellOf, gateCell, nextGate, progressAt, startCell } from "./track";

const COLOURS = Object.values(LUDO_COLOUR);

describe("track geometry", () => {
  it("puts the four start cells 14 cells apart", () => {
    expect(COLOURS.map(startCell)).toEqual([0, 14, 28, 42]);
  });

  it("puts each gate on the cell just before its colour's start cell", () => {
    for (const colour of COLOURS) {
      expect((gateCell(colour) + 1) % TRACK_LENGTH).toBe(startCell(colour));
      expect(cellOf(colour, OWN_GATE)).toBe(gateCell(colour));
    }
  });

  it("sees the four gates at progress 13, 27, 41 and 55 from every colour", () => {
    for (const colour of COLOURS) {
      const gates = COLOURS.map((other) => progressAt(colour, gateCell(other))).sort(
        (a, b) => a - b,
      );
      expect(gates).toEqual([...GATE_PROGRESS]);
    }
  });

  it("maps progress to cells and back", () => {
    for (const colour of COLOURS) {
      for (let progress = 0; progress <= OWN_GATE; progress += 1) {
        expect(progressAt(colour, cellOf(colour, progress))).toBe(progress);
      }
    }
  });

  it("finds the next gate ahead of every progress 0…54, standing on a gate included (G4)", () => {
    for (let progress = 0; progress < OWN_GATE; progress += 1) {
      const expected = GATE_PROGRESS.find((gate) => gate > progress);
      expect(nextGate(progress)).toBe(expected);
      expect(nextGate(progress)).toBeGreaterThan(progress);
      // G3: never past the horse's own gate.
      expect(nextGate(progress)).toBeLessThanOrEqual(OWN_GATE);
    }
    expect(nextGate(13)).toBe(27);
    expect(nextGate(41)).toBe(55);
  });

  it("keeps four gates in a two-player game: a gate of a colour nobody plays (G6)", () => {
    // Red (seat 0) at progress 5: the next gate is Blue's (13), though Blue does not play.
    const state = position({ players: 2, horses: { 0: [5] }, die: 1 });

    expect(state.colours).toEqual([LUDO_COLOUR.Red, LUDO_COLOUR.Yellow]);
    expect(targetOf(state, 0, 0, 1)).toBe(13);
    expect(cellOf(LUDO_COLOUR.Red, 13)).toBe(gateCell(LUDO_COLOUR.Blue));
    expect(kickedAt(state, 0, 13)).toBeNull();
  });
});
