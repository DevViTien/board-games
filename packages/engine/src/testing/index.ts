// Test-only entry point (`@board-games/engine/testing`); imports Vitest, so never import it from app code.
export { expiresImmediately, neverExpires, ticking } from "./clocks";
export { CONTRACT_CHECK, type ContractCheckId, type ContractConfig } from "./contract-checks";
export { deepFreeze } from "./deep-freeze";
export { describeGameContract } from "./describe-game-contract";
export { playRandomGame, type RandomGame, type RandomGameConfig } from "./play-random-game";
// Sample games for tests of the app: a dice race (2–4 players, every move a roll) and a game whose
// every turn is a roll followed by a choice.
export {
  diceRaceAiGame,
  diceRaceGame,
  type DiceRaceMove,
  type DiceRaceState,
} from "../test-fixtures/dice-race-game";
export {
  rollChooseGame,
  type RollChooseMove,
  type RollChooseState,
} from "../test-fixtures/roll-choose-game";
