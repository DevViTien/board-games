import type { OptionChoiceList } from "@board-games/engine";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SETUP_CHOICE_KEY_PREFIX } from "@/config/storage-keys";

import { readSetupChoice, writeSetupChoice } from "./setup-preferences";

const CARO_CHOICES: readonly OptionChoiceList[] = [
  { name: "size", values: [15, 19] },
  { name: "rule", values: ["blocked-ends", "free"] },
];
const CARO_DEFAULTS = { size: 15, rule: "blocked-ends" } as const;

/** A game without rule options. */
function read(gameId: string, supportsAI: boolean) {
  return readSetupChoice(gameId, supportsAI, [], {});
}

function readCaro() {
  return readSetupChoice("caro", true, CARO_CHOICES, CARO_DEFAULTS);
}

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("setup preferences", () => {
  it("has nothing for a game never started", () => {
    expect(read("tictactoe", true)).toBeUndefined();
  });

  it("reads back the choice written for each game", () => {
    writeSetupChoice("tictactoe", { mode: "ai", level: "hard", first: "ai", options: {} });
    writeSetupChoice("caro", { mode: "local", level: "easy", first: "random", options: {} });

    expect(read("tictactoe", true)).toEqual({
      mode: "ai",
      level: "hard",
      first: "ai",
      options: {},
    });
    expect(read("caro", true)).toEqual({
      mode: "local",
      level: "easy",
      first: "random",
      options: {},
    });
  });

  it.each(["{not json", "null", '"ai"', '{"mode":"ai","level":"insane","first":"ai"}', "{}"])(
    "gives nothing for corrupt data %j",
    (raw) => {
      window.localStorage.setItem(`${SETUP_CHOICE_KEY_PREFIX}tictactoe`, raw);

      expect(read("tictactoe", true)).toBeUndefined();
    },
  );

  it("gives nothing, and does not throw, when storage cannot be used", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });

    expect(() => {
      writeSetupChoice("tictactoe", { mode: "ai", level: "hard", first: "ai", options: {} });
    }).not.toThrow();
    expect(read("tictactoe", true)).toBeUndefined();
  });

  it("gives nothing when even reaching localStorage throws", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });

    expect(read("tictactoe", true)).toBeUndefined();
  });

  it("reads back the online mode, for a game with or without an AI", () => {
    writeSetupChoice("tictactoe", { mode: "online", level: "easy", first: "human", options: {} });
    writeSetupChoice("chess", { mode: "online", level: "hard", first: "ai", options: {} });

    expect(read("tictactoe", true)).toEqual({
      mode: "online",
      level: "easy",
      first: "human",
      options: {},
    });
    expect(read("chess", false)?.mode).toBe("online");
  });

  it("falls back to the same-device mode for a game that cannot be played against the AI", () => {
    writeSetupChoice("chess", { mode: "ai", level: "hard", first: "ai", options: {} });

    expect(read("chess", false)).toEqual({
      mode: "local",
      level: "hard",
      first: "ai",
      options: {},
    });
  });

  it("remembers the rule options", () => {
    writeSetupChoice("caro", {
      mode: "local",
      level: "medium",
      first: "human",
      options: { size: 19, rule: "free" },
    });

    expect(readCaro()).toEqual({
      mode: "local",
      level: "medium",
      first: "human",
      options: { size: 19, rule: "free" },
    });
  });

  it("gives the default rule options to a choice remembered before games had any", () => {
    window.localStorage.setItem(
      `${SETUP_CHOICE_KEY_PREFIX}caro`,
      JSON.stringify({ mode: "ai", level: "hard", first: "ai" }),
    );

    expect(readCaro()).toEqual({
      mode: "ai",
      level: "hard",
      first: "ai",
      options: { size: 15, rule: "blocked-ends" },
    });
  });

  it("resets only the rule option the game no longer offers", () => {
    window.localStorage.setItem(
      `${SETUP_CHOICE_KEY_PREFIX}caro`,
      JSON.stringify({
        mode: "ai",
        level: "hard",
        first: "ai",
        options: { size: 17, rule: "free", speed: 2 },
      }),
    );

    expect(readCaro()).toEqual({
      mode: "ai",
      level: "hard",
      first: "ai",
      options: { size: 15, rule: "free" },
    });
  });

  it.each([null, [19], "19", 19])(
    "keeps the rest of the choice when the rule options are %j, with the defaults instead",
    (options) => {
      window.localStorage.setItem(
        `${SETUP_CHOICE_KEY_PREFIX}caro`,
        JSON.stringify({ mode: "ai", level: "hard", first: "ai", options }),
      );

      expect(readCaro()).toEqual({
        mode: "ai",
        level: "hard",
        first: "ai",
        options: { size: 15, rule: "blocked-ends" },
      });
    },
  );
});
