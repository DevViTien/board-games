// Test-only: Cờ cá ngựa accepting every variant of its options (design §3), the way the engine's
// `diceRaceRules`/`diceRaceGame` differ. M6 plays only the defaults (`parseLudoOptions`); this lets
// the tests and the contract suite run the variant branches. Never exported from the package.
import type { GameDefinition } from "@board-games/engine";

import type { LudoOutcome } from "./constants";
import { type LudoOptions, parseAnyLudoOptions } from "./options";
import { ludo, type LudoMove, type LudoState } from "./rules";

export const ludoVariantRules = {
  ...ludo,
  parseOptions: parseAnyLudoOptions,
} as const satisfies GameDefinition<LudoState, LudoMove, LudoOutcome, LudoOptions>;
