import { describe, expect, it } from "vitest";

import type { PlaySetup } from "@/transport/types";

import {
  DEFAULT_PLAY_SETUP,
  hasPlayerChoice,
  readInitialMode,
  readStartRequest,
  toPlaySetup,
  toStartUrl,
} from "./play-setup";

const TWO_PLAYERS = { min: 2, max: 2 } as const;
const TWO_TO_FOUR = { min: 2, max: 4 } as const;

/** Splits a start URL as the play screen sees it: its path and its query. */
function open(url: string) {
  const parsed = new URL(url, "http://localhost");
  return { path: parsed.pathname, params: parsed.searchParams };
}

describe("play setup", () => {
  it("defaults to the AI at Medium, the player moving first", () => {
    expect(DEFAULT_PLAY_SETUP).toEqual({ mode: "ai", level: "medium", first: "human" });
  });

  it.each<PlaySetup>([
    { mode: "local" },
    { mode: "ai", level: "hard", first: "ai" },
    { mode: "ai", level: "easy", first: "random" },
    { mode: "ai", level: "medium", first: "human" },
  ])("reads back the setup it put in the start URL (%j)", (setup) => {
    const { path, params } = open(toStartUrl("tictactoe", setup));

    expect(path).toBe(`/play/tictactoe/${setup.mode}`);
    expect(readStartRequest(params, setup.mode)).toEqual(setup);
  });

  it("writes the setup screen's example URL", () => {
    expect(toStartUrl("tictactoe", { mode: "ai", level: "hard", first: "random" })).toBe(
      "/play/tictactoe/ai?new=1&level=hard&first=random",
    );
    expect(toStartUrl("tictactoe", { mode: "local" })).toBe("/play/tictactoe/local?new=1");
  });

  it.each([
    ["", "ai"],
    ["", "local"],
    ["level=hard&first=ai", "ai"],
    ["new=0", "local"],
    ["new=1", "ai"],
    ["new=1&level=hard", "ai"],
    ["new=1&level=impossible&first=ai", "ai"],
    ["new=1&level=hard&first=nobody", "ai"],
  ] as const)("asks for no new game from the query %j in mode %s", (query, mode) => {
    expect(readStartRequest(new URLSearchParams(query), mode)).toBeUndefined();
  });

  it("keeps only the choices that matter for the mode", () => {
    expect(
      toPlaySetup(
        { mode: "local", level: "hard", first: "ai", playerCount: 2, options: {} },
        TWO_PLAYERS,
      ),
    ).toStrictEqual({
      mode: "local",
    });
    expect(
      toPlaySetup(
        { mode: "ai", level: "hard", first: "ai", playerCount: 2, options: {} },
        TWO_PLAYERS,
      ),
    ).toStrictEqual({
      mode: "ai",
      level: "hard",
      first: "ai",
    });
  });

  it("keeps the rule options of a game that has some, in every mode", () => {
    const options = { size: 19, rule: "free" };

    expect(
      toPlaySetup(
        { mode: "local", level: "hard", first: "ai", playerCount: 2, options },
        TWO_PLAYERS,
      ),
    ).toEqual({
      mode: "local",
      options,
    });
    expect(
      toPlaySetup({ mode: "ai", level: "hard", first: "ai", playerCount: 2, options }, TWO_PLAYERS),
    ).toEqual({
      mode: "ai",
      level: "hard",
      first: "ai",
      options,
    });
  });

  it.each<PlaySetup>([
    { mode: "local", options: { size: 19, rule: "free" } },
    { mode: "ai", level: "hard", first: "human", options: { size: 15, rule: "free" } },
  ])("reads back the rule options it put in the start URL (%j)", (setup) => {
    const { params } = open(toStartUrl("caro", setup));

    expect(readStartRequest(params, setup.mode)).toEqual(setup);
  });

  it("puts the rule options in the start URL as JSON", () => {
    expect(toStartUrl("caro", { mode: "local", options: { size: 19, rule: "free" } })).toBe(
      "/play/caro/local?new=1&options=%7B%22size%22%3A19%2C%22rule%22%3A%22free%22%7D",
    );
  });

  it("leaves rule options out of the start URL of a game without any", () => {
    const setup = toPlaySetup(
      { mode: "ai", level: "hard", first: "ai", playerCount: 2, options: {} },
      TWO_PLAYERS,
    );

    expect(toStartUrl("tictactoe", setup)).not.toContain("options");
  });

  it("reads rule options that are JSON but not valid for the game, for the game to refuse", () => {
    expect(readStartRequest(new URLSearchParams('new=1&options={"size":17}'), "local")).toEqual({
      mode: "local",
      options: { size: 17 },
    });
  });

  it.each(["local", "ai"] as const)(
    "asks for no new game when the options are not JSON (%s)",
    (mode) => {
      const params = new URLSearchParams("new=1&level=hard&first=ai&options={size");

      expect(readStartRequest(params, mode)).toBeUndefined();
    },
  );

  describe("number of players", () => {
    it("is a choice only when the game allows more than one number", () => {
      expect(hasPlayerChoice(TWO_PLAYERS)).toBe(false);
      expect(hasPlayerChoice(TWO_TO_FOUR)).toBe(true);
    });

    it.each(["local", "ai"] as const)(
      "is kept in the setup of a game with a choice of players (%s)",
      (mode) => {
        const setup = toPlaySetup(
          { mode, level: "easy", first: "ai", playerCount: 3, options: {} },
          TWO_TO_FOUR,
        );

        expect(setup).toMatchObject({ mode, playerCount: 3 });
      },
    );

    it("is left out of the setup and the start URL of a game with a fixed number", () => {
      const setup = toPlaySetup(
        { mode: "local", level: "easy", first: "ai", playerCount: 2, options: {} },
        TWO_PLAYERS,
      );

      expect(setup).toStrictEqual({ mode: "local" });
      expect(toStartUrl("tictactoe", setup)).toBe("/play/tictactoe/local?new=1");
    });

    it("puts the number of players in the start URL", () => {
      expect(toStartUrl("ludo", { mode: "local", playerCount: 4 })).toBe(
        "/play/ludo/local?new=1&players=4",
      );
    });

    it.each<PlaySetup>([
      { mode: "local", playerCount: 4 },
      { mode: "ai", level: "hard", first: "random", playerCount: 3 },
      { mode: "local", playerCount: 3, options: { target: 12 } },
    ])("reads back the number of players it put in the start URL (%j)", (setup) => {
      const { params } = open(toStartUrl("dice-race", setup));

      expect(readStartRequest(params, setup.mode)).toEqual(setup);
    });

    it("reads a number the game may not allow, for the game to refuse", () => {
      expect(readStartRequest(new URLSearchParams("new=1&players=5"), "local")).toEqual({
        mode: "local",
        playerCount: 5,
      });
    });

    it.each(["abc", "", "2.5", "-3", "1e2"])(
      "asks for no new game when the number of players is %j",
      (players) => {
        const params = new URLSearchParams({ new: "1", level: "hard", first: "ai", players });

        expect(readStartRequest(params, "local")).toBeUndefined();
        expect(readStartRequest(params, "ai")).toBeUndefined();
      },
    );

    it("asks for no number of players when the URL has none", () => {
      expect(readStartRequest(new URLSearchParams("new=1"), "local")).toStrictEqual({
        mode: "local",
      });
    });
  });
});

describe("readInitialMode", () => {
  it("reads a mode the game offers", () => {
    expect(readInitialMode("online", true)).toBe("online");
    expect(readInitialMode("local", false)).toBe("local");
    expect(readInitialMode("ai", true)).toBe("ai");
  });

  it("ignores the AI for a game without one, and anything that is not a mode", () => {
    expect(readInitialMode("ai", false)).toBeUndefined();
    expect(readInitialMode("khong-co", true)).toBeUndefined();
    expect(readInitialMode(["online"], true)).toBeUndefined();
    expect(readInitialMode(undefined, true)).toBeUndefined();
  });
});
