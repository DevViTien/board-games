import { describe, expect, it } from "vitest";

import { JELLY_CREW_MAP } from "./constants";
import {
  JELLY_CREW_LAYOUT_ERROR,
  type JellyCrewLayoutDefinition,
  JellyCrewLayoutError,
  type JellyCrewLayoutErrorCode,
  parseJellyCrewLayout,
} from "./layout";

const GOOD: JellyCrewLayoutDefinition = {
  map: JELLY_CREW_MAP.Kitchen,
  playerCount: 2,
  rows: ["########", "#1rA..a#", "#2.....#", "########"],
  molds: ["........", "......R.", "........", "........"].map((row, y) =>
    y === 1 ? ".....R.." : row,
  ),
};

function codeOf(definition: Partial<JellyCrewLayoutDefinition>): JellyCrewLayoutErrorCode | null {
  try {
    parseJellyCrewLayout({ ...GOOD, ...definition });
    return null;
  } catch (error) {
    if (error instanceof JellyCrewLayoutError) return error.code;
    throw error;
  }
}

describe("parseJellyCrewLayout", () => {
  it("reads walls, starts, jelly, plates, doors and molds", () => {
    const layout = parseJellyCrewLayout(GOOD);
    expect(layout.width).toBe(8);
    expect(layout.height).toBe(4);
    expect(layout.start.chars).toEqual([9, 17]);
    expect(layout.start.pieces).toEqual([{ cells: [10], kinds: ["strawberry"] }]);
    expect([...layout.doors]).toEqual([[11, "circle"]]);
    expect([...layout.plates]).toEqual([[14, "circle"]]);
    expect([...layout.molds]).toEqual([[13, "strawberry"]]);
  });

  it("sticks touching jelly of one kind into one piece at once", () => {
    const layout = parseJellyCrewLayout({
      ...GOOD,
      rows: ["########", "#1rr..A#", "#2....a#", "########"],
      molds: ["........", "...RR...", "........", "........"].map((row, y) =>
        y === 1 ? "....RR.." : row,
      ),
    });
    expect(layout.start.pieces).toEqual([{ cells: [10, 11], kinds: ["strawberry", "strawberry"] }]);
  });

  it.each<[string, Partial<JellyCrewLayoutDefinition>, JellyCrewLayoutErrorCode]>([
    [
      "rows of different lengths",
      { rows: ["########", "#1rA..a#", "#2....#", "########"] },
      JELLY_CREW_LAYOUT_ERROR.Shape,
    ],
    [
      "a mold layer of another size",
      { molds: ["........", ".....R.."] },
      JELLY_CREW_LAYOUT_ERROR.Shape,
    ],
    [
      "wider than 19",
      {
        rows: ["#".repeat(20), `#1rA..a${".".repeat(12)}#`, `#2${".".repeat(17)}#`, "#".repeat(20)],
      },
      JELLY_CREW_LAYOUT_ERROR.Size,
    ],
    [
      "higher than 13",
      {
        rows: [
          GOOD.rows[0] ?? "",
          ...Array.from({ length: 12 }, () => "#......#"),
          ...GOOD.rows.slice(1),
        ],
      },
      JELLY_CREW_LAYOUT_ERROR.Size,
    ],
    [
      "an open edge",
      { rows: ["########", "#1rA..a.", "#2.....#", "########"] },
      JELLY_CREW_LAYOUT_ERROR.Border,
    ],
    [
      "an unknown symbol",
      { rows: ["########", "#1rA..a#", "#2..x..#", "########"] },
      JELLY_CREW_LAYOUT_ERROR.Symbol,
    ],
    [
      "an unknown mold",
      { molds: ["........", ".....Z..", "........", "........"] },
      JELLY_CREW_LAYOUT_ERROR.Symbol,
    ],
    ["a missing start", { playerCount: 3 }, JELLY_CREW_LAYOUT_ERROR.Starts],
    [
      "two starts of one seat",
      { rows: ["########", "#1rA..a#", "#1.....#", "########"] },
      JELLY_CREW_LAYOUT_ERROR.Starts,
    ],
    [
      "a door without its plate",
      { rows: ["########", "#1rA..B#", "#2..a..#", "########"] },
      JELLY_CREW_LAYOUT_ERROR.Group,
    ],
    [
      "a plate without its door",
      { rows: ["########", "#1r...a#", "#2.....#", "########"] },
      JELLY_CREW_LAYOUT_ERROR.Group,
    ],
    [
      "a mold on a wall",
      { molds: ["R.......", "........", "........", "........"] },
      JELLY_CREW_LAYOUT_ERROR.MoldPlace,
    ],
    [
      "a mold on a door",
      { molds: ["........", "...R....", "........", "........"] },
      JELLY_CREW_LAYOUT_ERROR.MoldPlace,
    ],
    [
      "a mold on a plate",
      { molds: ["........", "......R.", "........", "........"] },
      JELLY_CREW_LAYOUT_ERROR.MoldPlace,
    ],
    [
      "more molds of a kind than its cells",
      { molds: ["........", "....RR..", "........", "........"] },
      JELLY_CREW_LAYOUT_ERROR.MoldCount,
    ],
    [
      "fewer molds of a kind than its cells",
      { rows: ["########", "#1rA.ra#", "#2.....#", "########"] },
      JELLY_CREW_LAYOUT_ERROR.MoldCount,
    ],
    [
      "no mold at all",
      { molds: ["........", "........", "........", "........"] },
      JELLY_CREW_LAYOUT_ERROR.NoMolds,
    ],
  ])("refuses %s", (_name, definition, code) => {
    expect(codeOf(definition)).toBe(code);
  });

  it("lets a kind without molds be only in the way (ice)", () => {
    expect(codeOf({ rows: ["########", "#1rA.ia#", "#2.....#", "########"] })).toBeNull();
  });
});
