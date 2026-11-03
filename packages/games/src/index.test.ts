import { describe, expect, expectTypeOf, it } from "vitest";

import {
  caro,
  findGame,
  GAME_IDS,
  GAMES,
  isRegisteredGameId,
  ludo,
  type RegisteredGameId,
  tictactoe,
} from "./index";

describe("game registry", () => {
  it("finds a registered game by id", () => {
    expect(findGame("tictactoe")).toBe(tictactoe);
    expect(findGame("caro")).toBe(caro);
    expect(isRegisteredGameId("caro")).toBe(true);
    expect(findGame("ludo")).toBe(ludo);
    expect(isRegisteredGameId("ludo")).toBe(true);
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

  it("lists in GAME_IDS exactly the ids of GAMES, in the same order", () => {
    expect(GAME_IDS).toEqual(GAMES.map((game) => game.id));
    expectTypeOf<(typeof GAMES)[number]["id"]>().toEqualTypeOf<RegisteredGameId>();
  });

  it("types RegisteredGameId as the union of literal ids", () => {
    expectTypeOf<RegisteredGameId>().toEqualTypeOf<"tictactoe" | "caro" | "ludo">();
    // Forgetting `as const satisfies` on a game would widen this union to string.
    expectTypeOf<string>().not.toExtend<RegisteredGameId>();
  });
});
