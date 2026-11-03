import type { AnyGameDefinition, OptionValue } from "./types";

/** One rule option a player may choose, as plain data the server can hand to a client. */
export interface OptionChoiceList {
  readonly name: string;
  readonly values: readonly OptionValue[];
}

function isOptionValue(value: unknown): value is OptionValue {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

/**
 * The rule options a game lets players choose, in display order; `[]` when it declares none.
 * Checks the declaration at run time, since its type is erased through `AnyGameDefinition`, and
 * throws when it is not a record of arrays of strings, numbers or booleans.
 */
export function listOptionChoices(game: AnyGameDefinition): readonly OptionChoiceList[] {
  const declared: unknown = game.optionChoices;
  if (declared === undefined) return [];
  if (typeof declared !== "object" || declared === null || Array.isArray(declared)) {
    throw new TypeError(`${game.id}: optionChoices must be an object`);
  }
  return Object.entries(declared).map(([name, values]: [string, unknown]) => {
    if (!Array.isArray(values) || !values.every(isOptionValue)) {
      throw new TypeError(
        `${game.id}: optionChoices.${name} must be an array of strings, numbers or booleans`,
      );
    }
    return { name, values: [...values] };
  });
}
