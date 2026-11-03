import type { OptionChoiceList } from "@board-games/engine";
import { describe, expect, it } from "vitest";

import { findChoice, matchOptionChoices } from "./option-choices";

const CHOICES: readonly OptionChoiceList[] = [
  { name: "size", values: [15, 19] },
  { name: "rule", values: ["blocked-ends", "free"] },
];

describe("matchOptionChoices", () => {
  it("returns the listed values of matching options", () => {
    expect(matchOptionChoices(CHOICES, { rule: "free", size: 19 })).toEqual({
      size: 19,
      rule: "free",
    });
  });

  it("matches the empty options of a game without choices", () => {
    expect(matchOptionChoices([], {})).toEqual({});
  });

  it.each([
    ["a value that is not a choice", { size: 17, rule: "free" }],
    ["a missing option and no default", { size: 19 }],
    ["an unknown option", { size: 19, rule: "free", speed: 2 }],
    ["no object", "19"],
  ])("refuses options with %s", (_what, options) => {
    expect(matchOptionChoices(CHOICES, options)).toBeNull();
  });
});

describe("matchOptionChoices with defaults", () => {
  const DEFAULTS = { size: 15, rule: "blocked-ends" };

  it("gives a missing option its default, as the game reads it", () => {
    expect(matchOptionChoices(CHOICES, { size: 19 }, DEFAULTS)).toEqual({
      size: 19,
      rule: "blocked-ends",
    });
    expect(matchOptionChoices(CHOICES, {}, DEFAULTS)).toEqual(DEFAULTS);
  });

  it("still refuses a value that is not a choice, or an unknown option", () => {
    expect(matchOptionChoices(CHOICES, { size: 17 }, DEFAULTS)).toBeNull();
    expect(matchOptionChoices(CHOICES, { speed: 2 }, DEFAULTS)).toBeNull();
  });
});

describe("findChoice", () => {
  it("finds a listed value only by strict equality", () => {
    expect(findChoice([15, 19], 19)).toBe(19);
    expect(findChoice([15, 19], "19")).toBeUndefined();
    expect(findChoice([15, 19], null)).toBeUndefined();
  });
});
