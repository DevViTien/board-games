import type { GameDefinition } from "@board-games/engine";
import type { RegisteredGameId } from "@board-games/games";

import type { GameEntry, GameUI } from "./types";

/**
 * Pairs a game's rules with its UI. TypeScript checks here, once, that the board fits the rules
 * (same State and Move) and that the game is registered; the entry it returns keeps only the id.
 */
export function defineGameEntry<
  Id extends RegisteredGameId,
  State,
  Move,
  Outcome = never,
  Options extends object = Record<string, never>,
>(
  definition: GameDefinition<State, Move, Outcome, Options> & { readonly id: Id },
  ui: GameUI<State, Move, Outcome>,
): GameEntry<Id> {
  return {
    id: definition.id,
    open: (visitor) => visitor(definition, ui),
  };
}
