import { describe, expect, it } from "vitest";

import { describeGameContract } from "../testing/describe-game-contract";
import { choiceGame } from "./choice-game";
import { COUNTER_TARGET, counterAiGame, counterGame } from "./counter-game";
import { diceRaceAiGame } from "./dice-race-game";
import { treeGame } from "./tree-game";

describe("counter evaluate", () => {
  it("scores a position won by the player to move as good for that player", () => {
    const winning = { count: COUNTER_TARGET - 1, toMove: 0 };

    expect(counterGame.evaluate(winning, 0)).toBe(1);
    expect(counterGame.evaluate(winning, 1)).toBe(-1);
  });

  it("scores a lost position (distance a multiple of 3) as bad for the player to move", () => {
    expect(counterGame.evaluate({ count: COUNTER_TARGET - 3, toMove: 1 }, 1)).toBe(-1);
  });
});

describe("dice race evaluate", () => {
  it("is a player's lead over the best other player", () => {
    const state = { positions: [7, 3, 9], toMove: 0, target: 20 };

    expect(diceRaceAiGame.evaluate(state, 2)).toBe(2);
    expect(diceRaceAiGame.evaluate(state, 0)).toBe(-2);
  });
});

describe("choice game", () => {
  const start = choiceGame.setup({ playerCount: 2, options: { winWeight: 3, loseWeight: 1 } });

  it("ends in a draw when seat 0 plays it safe", () => {
    const next = choiceGame.applyMove(start, { choice: "safe" });

    expect(choiceGame.result(next)).toEqual({ kind: "draw" });
    expect(choiceGame.legalMoves(next)).toEqual([]);
  });

  it("offers weighted outcomes for the gamble and ends with the rolled result", () => {
    expect(choiceGame.outcomes(start, { choice: "gamble" })).toEqual([
      { outcome: "win", weight: 3 },
      { outcome: "lose", weight: 1 },
    ]);
    expect(choiceGame.outcomes(start, { choice: "safe" })).toEqual([]);
    expect(choiceGame.result(choiceGame.applyMove(start, { choice: "gamble" }, "lose"))).toEqual({
      kind: "win",
      winners: [1],
    });
  });

  it("accepts only positive integer weights", () => {
    expect(choiceGame.parseOptions({ winWeight: 2, loseWeight: 5 })).toEqual({
      winWeight: 2,
      loseWeight: 5,
    });
    expect(choiceGame.parseOptions({ winWeight: 0, loseWeight: 1 })).toBeNull();
    expect(choiceGame.parseOptions(null)).toBeNull();
  });
});

describeGameContract(counterAiGame, { seeds: [1, 2, 3], maxPlies: 10 });
describeGameContract(diceRaceAiGame, { seeds: [1, 2, 3], maxPlies: 200, options: { target: 12 } });
describeGameContract(choiceGame, {
  seeds: [1, 2, 3, 4],
  maxPlies: 1,
  options: { winWeight: 3, loseWeight: 1 },
});
describeGameContract(treeGame, { seeds: [1, 2, 3], maxPlies: 4 });
