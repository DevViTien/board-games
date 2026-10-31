import { describe, expect, it } from "vitest";

import type { PlaySetup } from "@/transport/types";

import { DEFAULT_PLAY_SETUP, readStartRequest, toPlaySetup, toStartUrl } from "./play-setup";

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
    expect(toPlaySetup({ mode: "local", level: "hard", first: "ai" })).toEqual({ mode: "local" });
    expect(toPlaySetup({ mode: "ai", level: "hard", first: "ai" })).toEqual({
      mode: "ai",
      level: "hard",
      first: "ai",
    });
  });
});
