import { describe, expect, expectTypeOf, it } from "vitest";

import { findGame, GAMES, isRegisteredGameId, type RegisteredGameId, tictactoe } from "./index";

describe("game registry", () => {
  it("finds a registered game by id", () => {
    expect(findGame("tictactoe")).toBe(tictactoe);
  });

  it("returns undefined for an unknown id", () => {
    expect(findGame("no-such-game")).toBeUndefined();
    expect(isRegisteredGameId("no-such-game")).toBe(false);
    expect(isRegisteredGameId("tictactoe")).toBe(true);
  });

  it("has unique kebab-case ids", () => {
    const ids = GAMES.map((game) => game.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it("types RegisteredGameId as the union of literal ids", () => {
    expectTypeOf<RegisteredGameId>().toEqualTypeOf<"tictactoe">();
    // Forgetting `as const satisfies` on a game would widen this union to string.
    expectTypeOf<string>().not.toExtend<RegisteredGameId>();
  });
});
