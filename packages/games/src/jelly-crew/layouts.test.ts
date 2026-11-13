import { describe, expect, it } from "vitest";

import { JELLY_CREW_MAPS, JELLY_CREW_REASON } from "./constants";
import { JELLY_CREW_MAX_HEIGHT, JELLY_CREW_MAX_WIDTH } from "./layout";
import { JELLY_CREW_LAYOUT_DEFINITIONS, jellyCrewLayout } from "./layouts";
import { JELLY_CREW_SOLUTIONS } from "./layouts.solutions";
import { jellyCrewSolvableWithDoorsShut } from "./layouts.testing";
import { jellyCrew } from "./rules";
import type { JellyCrewState } from "./types";

const PLAYER_COUNTS = [2, 3, 4] as const;
const LAYOUTS = JELLY_CREW_MAPS.flatMap((map) =>
  PLAYER_COUNTS.map((playerCount) => ({ map, playerCount, name: `${map}-${String(playerCount)}` })),
);

/**
 * The steps a solution of each map may take, by difficulty (design §11.2): the maps get harder in
 * the order of JELLY_CREW_MAPS, two by two.
 */
const STEPS_BY_DIFFICULTY = [
  [20, 45],
  [35, 75],
  [55, 110],
  [85, 200],
] as const;

describe("Bố cục giải được", () => {
  it("has the 24 layouts, none wider than 19 or higher than 13", () => {
    expect(JELLY_CREW_LAYOUT_DEFINITIONS).toHaveLength(24);
    for (const { map, playerCount } of LAYOUTS) {
      const layout = jellyCrewLayout(map, playerCount);
      expect(layout.width).toBeLessThanOrEqual(JELLY_CREW_MAX_WIDTH);
      expect(layout.height).toBeLessThanOrEqual(JELLY_CREW_MAX_HEIGHT);
      expect(layout.start.chars).toHaveLength(playerCount);
    }
  });

  it.each(LAYOUTS)(
    "Phát lại lời giải mẫu: $name is won by everyone",
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
    },
  );

  it.each(LAYOUTS)("takes as many steps as its difficulty asks: $name", ({ map, name }) => {
    const steps = (JELLY_CREW_SOLUTIONS[name] ?? []).filter((move) => !move.endsWith("reset"));
    const [least, most] = STEPS_BY_DIFFICULTY[Math.floor(JELLY_CREW_MAPS.indexOf(map) / 2)] ?? [
      0, 0,
    ];
    expect(steps.length).toBeGreaterThanOrEqual(least);
    expect(steps.length).toBeLessThanOrEqual(most);
  });

  it.each(LAYOUTS)("Không thắng khi cửa luôn đóng: $name", ({ map, playerCount }) => {
    expect(jellyCrewSolvableWithDoorsShut(jellyCrewLayout(map, playerCount))).toBe(false);
  });
});
