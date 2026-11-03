import type { OptionChoiceList, OptionValue } from "@board-games/engine";

/** One chosen value per rule option a game offers; `{}` for a game without choices. */
export type ChosenOptions = Readonly<Record<string, OptionValue>>;

/** The listed value equal to `raw`, or `undefined` when `raw` is none of them (or not a value). */
export function findChoice(values: readonly OptionValue[], raw: unknown): OptionValue | undefined {
  return values.find((value) => value === raw);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The value of `options` for each of `choices`, or `null` unless it is an object whose every key is
 * one of the options and holds one of its listed values. A missing key takes its value from
 * `defaults`, as the game itself does when it reads options from outside (a record saved before
 * the option existed); without a default it is `null` too.
 */
export function matchOptionChoices(
  choices: readonly OptionChoiceList[],
  options: unknown,
  defaults: ChosenOptions = {},
): ChosenOptions | null {
  if (!isRecord(options)) return null;
  const names = new Set(choices.map(({ name }) => name));
  if (Object.keys(options).some((key) => !names.has(key))) return null;
  const matched: Record<string, OptionValue> = {};
  for (const { name, values } of choices) {
    const raw = Object.hasOwn(options, name) ? options[name] : defaults[name];
    const value = findChoice(values, raw);
    if (value === undefined) return null;
    matched[name] = value;
  }
  return matched;
}
