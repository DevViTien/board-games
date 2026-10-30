import { describe, expect, it } from "vitest";

import { parseGameOptions } from "./options";
import { counterGame } from "./test-fixtures/counter-game";
import { diceRaceGame, diceRaceRules } from "./test-fixtures/dice-race-game";

describe("parseGameOptions", () => {
  it("returns the options accepted by the game's parseOptions", () => {
    expect(parseGameOptions(diceRaceGame, { target: 12 })).toEqual({
      ok: true,
      value: { target: 12 },
    });
  });

  it("rejects options the game's parseOptions refuses", () => {
    expect(parseGameOptions(diceRaceGame, { target: 1 })).toEqual({
      ok: false,
      error: "invalid-options",
    });
  });

  it("treats an exception from parseOptions as invalid options", () => {
    const throwing = {
      ...diceRaceGame,
      parseOptions: () => {
        throw new Error("boom");
      },
    };

    expect(parseGameOptions(throwing, {})).toEqual({ ok: false, error: "invalid-options" });
  });

  it("accepts only an empty object for a game without options", () => {
    expect(parseGameOptions(counterGame, {})).toEqual({ ok: true, value: {} });
    expect(parseGameOptions(counterGame, { target: 3 })).toEqual({
      ok: false,
      error: "invalid-options",
    });
    expect(parseGameOptions(counterGame, null)).toEqual({ ok: false, error: "invalid-options" });
    expect(parseGameOptions(counterGame, new Date(0))).toEqual({
      ok: false,
      error: "invalid-options",
    });
    expect(parseGameOptions(counterGame, [])).toEqual({ ok: false, error: "invalid-options" });
  });

  it("accepts exactly the default options of a game that has some but no parseOptions", () => {
    const parsed = parseGameOptions(diceRaceRules, JSON.parse('{"target":20}'));

    expect(parsed).toEqual({ ok: true, value: { target: 20 } });
    expect(parsed.ok && parsed.value).toBe(diceRaceRules.defaultOptions);
    expect(parseGameOptions(diceRaceRules, {})).toEqual({ ok: false, error: "invalid-options" });
    expect(parseGameOptions(diceRaceRules, { target: 12 })).toEqual({
      ok: false,
      error: "invalid-options",
    });
  });
});
