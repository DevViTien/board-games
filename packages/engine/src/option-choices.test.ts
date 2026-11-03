import { describe, expect, it } from "vitest";

import { listOptionChoices } from "./option-choices";
import { counterGame } from "./test-fixtures/counter-game";
import { diceRaceGame } from "./test-fixtures/dice-race-game";
import type { AnyGameDefinition } from "./types";

describe("listOptionChoices", () => {
  it("lists each option with its values, in the declared order", () => {
    const game = {
      ...diceRaceGame,
      defaultOptions: { target: 20, fast: false },
      optionChoices: { target: [50, 12, 20], fast: [false, true] },
    };

    expect(listOptionChoices(game)).toEqual([
      { name: "target", values: [50, 12, 20] },
      { name: "fast", values: [false, true] },
    ]);
  });

  it("returns no option for a game that declares no choice", () => {
    expect(listOptionChoices(counterGame)).toEqual([]);
  });

  it("returns plain data that survives JSON", () => {
    const listed = listOptionChoices(diceRaceGame);

    expect(JSON.parse(JSON.stringify(listed))).toEqual(listed);
  });

  it.each([
    ["not an object", [12, 20]],
    ["an option that is not an array", { target: 12 }],
    ["a value that is not a string, number or boolean", { target: [12, { value: 20 }] }],
    ["a null value", { target: [12, null] }],
  ])("throws for a declaration that is %s", (_what, optionChoices) => {
    const game = { ...diceRaceGame, optionChoices } as unknown as AnyGameDefinition;

    expect(() => listOptionChoices(game)).toThrow(/optionChoices/);
  });
});
