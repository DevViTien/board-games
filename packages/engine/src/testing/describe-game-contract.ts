import { describe, it } from "vitest";

import type { GameDefinition } from "../types";
import { CONTRACT_CHECKS, type ContractConfig } from "./contract-checks";

/**
 * Registers the shared contract tests for one game. Every game in `packages/games` calls this from
 * its own test file:
 *
 *   describeGameContract(tictactoe, { seeds: [1, 2, 3], maxPlies: 9 });
 */
export function describeGameContract<State, Move, Outcome, Options extends object>(
  game: GameDefinition<State, Move, Outcome, Options>,
  config: ContractConfig<Options>,
): void {
  describe(`game contract: ${game.id}`, () => {
    for (const check of CONTRACT_CHECKS) {
      it(
        check.title,
        () => {
          check.run(game, config);
        },
        config.timeout,
      );
    }
  });
}
