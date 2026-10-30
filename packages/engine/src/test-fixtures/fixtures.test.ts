import { describe, expect, it } from "vitest";

import { COUNTER_TARGET, counterGame } from "./counter-game";
import { DICE_FACES, diceRaceGame } from "./dice-race-game";

describe("counter fixture", () => {
  it("lets players add 1 or 2 without passing the target", () => {
    const start = counterGame.setup();

    expect(counterGame.legalMoves(start)).toEqual([{ add: 1 }, { add: 2 }]);
    expect(counterGame.legalMoves({ count: COUNTER_TARGET - 1, toMove: 0 })).toEqual([{ add: 1 }]);
  });

  it("alternates turns and declares the player who reached the target the winner", () => {
    const afterOne = counterGame.applyMove({ count: COUNTER_TARGET - 2, toMove: 1 }, { add: 2 });

    expect(afterOne).toEqual({ count: COUNTER_TARGET, toMove: 0 });
    expect(counterGame.result(afterOne)).toEqual({ kind: "win", winners: [1] });
    expect(counterGame.legalMoves(afterOne)).toEqual([]);
  });

  it("keys moves by their step", () => {
    expect(counterGame.moveKey({ add: 2 })).toBe("+2");
  });
});

describe("dice race fixture", () => {
  it("starts every player at zero with the target from the options", () => {
    const state = diceRaceGame.setup({ playerCount: 3, options: { target: 8 } });

    expect(state).toEqual({ positions: [0, 0, 0], toMove: 0, target: 8 });
    expect(diceRaceGame.outcomes()).toBe(DICE_FACES);
  });

  it("moves the current player by the rolled outcome and passes the turn", () => {
    const state = diceRaceGame.setup({ playerCount: 2, options: { target: 8 } });
    const next = diceRaceGame.applyMove(state, { type: "roll" }, 5);

    expect(next).toEqual({ positions: [5, 0], toMove: 1, target: 8 });
  });

  it("ends when a player reaches the target", () => {
    const state = { positions: [3, 7], toMove: 1, target: 8 };
    const next = diceRaceGame.applyMove(state, { type: "roll" }, 2);

    expect(diceRaceGame.result(next)).toEqual({ kind: "win", winners: [1] });
    expect(diceRaceGame.legalMoves(next)).toEqual([]);
  });

  it("refuses to apply a roll without an outcome", () => {
    const state = diceRaceGame.setup({ playerCount: 2, options: { target: 8 } });

    expect(() => diceRaceGame.applyMove(state, { type: "roll" })).toThrow();
  });

  it("accepts only an integer target between 5 and 100", () => {
    expect(diceRaceGame.parseOptions({ target: 12, extra: true })).toEqual({ target: 12 });
    expect(diceRaceGame.parseOptions({ target: 2 })).toBeNull();
    expect(diceRaceGame.parseOptions({ target: "12" })).toBeNull();
    expect(diceRaceGame.parseOptions(null)).toBeNull();
  });
});
