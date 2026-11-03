import { describe, expect, it } from "vitest";

import { describeGameContract } from "../testing/describe-game-contract";
import { choiceGame } from "./choice-game";
import { COUNTER_TARGET, counterAiGame, counterGame } from "./counter-game";
import { diceRaceAiGame } from "./dice-race-game";
import { GREEDY_BONUS, PUNISHMENT, rollChooseGame, type RollChooseState } from "./roll-choose-game";
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

describe("roll-choose game", () => {
  const start = rollChooseGame.setup({ playerCount: 3, options: {} });
  const afterRoll = (state: RollChooseState, face: number) =>
    rollChooseGame.applyMove(state, { type: "roll" }, face);

  it("starts every turn with a roll of a three-sided die, then offers a choice", () => {
    expect(start).toEqual({
      scores: [0, 0, 0],
      toMove: 0,
      rolled: null,
      exposed: null,
      turnsLeft: 9,
    });
    expect(rollChooseGame.legalMoves(start)).toEqual([{ type: "roll" }]);
    expect(rollChooseGame.outcomes(start, { type: "roll" }).map(({ outcome }) => outcome)).toEqual([
      1, 2, 3,
    ]);
    const rolled = afterRoll(start, 3);
    expect(rolled).toMatchObject({ toMove: 0, rolled: 3 });
    expect(rollChooseGame.legalMoves(rolled)).toEqual([{ type: "safe" }, { type: "greedy" }]);
    expect(rollChooseGame.outcomes(rolled, { type: "safe" })).toEqual([]);
  });

  it("scores the roll when safe, two more when greedy, and passes the turn", () => {
    const safe = rollChooseGame.applyMove(afterRoll(start, 3), { type: "safe" });
    expect(safe).toEqual({
      scores: [3, 0, 0],
      toMove: 1,
      rolled: null,
      exposed: null,
      turnsLeft: 8,
    });

    const greedy = rollChooseGame.applyMove(afterRoll(start, 3), { type: "greedy" });
    expect(greedy).toMatchObject({ scores: [3 + GREEDY_BONUS, 0, 0], toMove: 1, exposed: 0 });
  });

  it("lets the next player punish a greedy move, whatever they roll", () => {
    const greedy = rollChooseGame.applyMove(afterRoll(start, 1), { type: "greedy" });
    const next = afterRoll(greedy, 1);

    expect(rollChooseGame.legalMoves(next)).toContainEqual({ type: "punish" });
    expect(rollChooseGame.applyMove(next, { type: "punish" })).toMatchObject({
      scores: [1 + GREEDY_BONUS - PUNISHMENT, 0, 0],
      toMove: 2,
      exposed: null,
    });
    // Let go: the player after cannot punish it any more.
    const letGo = rollChooseGame.applyMove(next, { type: "safe" });
    expect(rollChooseGame.legalMoves(afterRoll(letGo, 2))).not.toContainEqual({ type: "punish" });
  });

  it("ends after the last turn, the highest score winning", () => {
    const last: RollChooseState = {
      scores: [4, 6],
      toMove: 1,
      rolled: 1,
      exposed: null,
      turnsLeft: 1,
    };
    const end = rollChooseGame.applyMove(last, { type: "safe" });

    expect(rollChooseGame.result(end)).toEqual({ kind: "win", winners: [1] });
    expect(rollChooseGame.legalMoves(end)).toEqual([]);
    expect(rollChooseGame.result({ ...end, scores: [7, 7] })).toEqual({ kind: "draw" });
  });

  it("evaluates a player's lead over the best other player", () => {
    expect(rollChooseGame.evaluate({ ...start, scores: [3, 7, 5] }, 1)).toBe(2);
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
describeGameContract(rollChooseGame, { seeds: [1, 2, 3], maxPlies: 30 });
