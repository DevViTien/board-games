import { GAME_IDS } from "@board-games/games/ids";
import { describe, expect, it } from "vitest";

import { GAME_RULES } from "./rules";

describe("GAME_RULES", () => {
  it("has the rules of every registered game, and no other", () => {
    expect(Object.keys(GAME_RULES).toSorted()).toEqual([...GAME_IDS].toSorted());
  });

  it.each(GAME_IDS)("loads the rules of %s as a component", async (gameId) => {
    expect(typeof (await GAME_RULES[gameId]())).toBe("function");
  });
});
