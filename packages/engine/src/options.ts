import { ENGINE_ERROR, err, ok, type Result } from "./errors";
import { stableStringify } from "./move-key";
import type { GameDefinition } from "./types";

/**
 * Validates rule options received from outside (a saved game, a room created by a client).
 * A game without `parseOptions` has exactly one set of options, its `defaultOptions`, so only a
 * value equal to them is accepted (and the game's own object is returned).
 */
export function parseGameOptions<State, Move, Outcome, Options extends object>(
  game: GameDefinition<State, Move, Outcome, Options>,
  raw: unknown,
): Result<Options> {
  try {
    if (game.parseOptions === undefined) {
      return stableStringify(raw) === stableStringify(game.defaultOptions)
        ? ok(game.defaultOptions)
        : err(ENGINE_ERROR.InvalidOptions);
    }
    const parsed = game.parseOptions(raw);
    return parsed === null ? err(ENGINE_ERROR.InvalidOptions) : ok(parsed);
  } catch {
    // A throwing parseOptions, or raw data JSON cannot represent.
    return err(ENGINE_ERROR.InvalidOptions);
  }
}
