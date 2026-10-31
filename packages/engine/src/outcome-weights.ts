import type { WeightedOutcome } from "./types";

/**
 * Throws unless every weight is a positive integer. A weight of 0 or 1.5 is a bug in the rules,
 * never a real chance: play, replay and the AI all refuse it instead of silently skewing the dice.
 */
export function checkOutcomeWeights(choices: readonly WeightedOutcome<unknown>[]): void {
  for (const { weight } of choices) {
    if (!Number.isInteger(weight) || weight <= 0) {
      throw new RangeError(`Outcome weight ${weight} is not a positive integer`);
    }
  }
}
