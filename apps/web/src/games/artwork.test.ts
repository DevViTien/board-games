import { GAMES } from "@board-games/games";
import { describe, expect, it } from "vitest";

import { GAME_ARTWORK } from "./artwork";

describe("GAME_ARTWORK", () => {
  it("has a picture for every registered game, and no other", () => {
    expect(Object.keys(GAME_ARTWORK).toSorted()).toEqual(GAMES.map((game) => game.id).toSorted());
  });
});
