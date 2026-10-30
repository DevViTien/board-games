import { counterGame } from "../test-fixtures/counter-game";
import { diceRaceGame } from "../test-fixtures/dice-race-game";
import { describeGameContract } from "./describe-game-contract";

describeGameContract(counterGame, { seeds: [1, 2, 3, 4, 5], playerCounts: [2], maxPlies: 10 });

// No playerCounts: every count the game allows (2 to 4) is played.
describeGameContract(diceRaceGame, {
  seeds: [1, 2, 3, 4, 5],
  maxPlies: 200,
  options: { target: 15 },
  timeout: 10_000,
});
