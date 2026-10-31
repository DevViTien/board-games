// Test-only entry point (`@board-games/engine/testing`); imports Vitest, so never import it from app code.
export { expiresImmediately, neverExpires, ticking } from "./clocks";
export { CONTRACT_CHECK, type ContractCheckId, type ContractConfig } from "./contract-checks";
export { deepFreeze } from "./deep-freeze";
export { describeGameContract } from "./describe-game-contract";
export { playRandomGame, type RandomGame, type RandomGameConfig } from "./play-random-game";
