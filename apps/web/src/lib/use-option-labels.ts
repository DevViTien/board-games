import type { OptionChoiceList, OptionValue } from "@board-games/engine";
import { useTranslations } from "next-intl";

import { type ChosenOptions, matchOptionChoices } from "./option-choices";

/** A translation from a key built at run time; `use-option-labels.test.ts` checks every such key. */
type DynamicTranslate = ((key: string, values?: Readonly<Record<string, string>>) => string) & {
  readonly has: (key: string) => boolean;
};

export interface OptionLabels {
  /** The name of a rule option's group ("Board"). */
  readonly field: (gameId: string, name: string) => string;
  /** The label of one of its values ("19×19"). */
  readonly value: (gameId: string, name: string, value: OptionValue) => string;
  /**
   * The game's note on a value ("Easy" under a map), from `….hints.<value>`, or `null` when the
   * game gives none for it.
   */
  readonly hint: (gameId: string, name: string, value: OptionValue) => string | null;
  /** The button changing the options of the next game ("Change map"): `options.change`. */
  readonly change: (gameId: string) => string;
  /**
   * The button starting the game the game suggests next ("Next map: Night market"):
   * `options.next`, its `rules` the summary of `options`; `null` when they do not match `choices`.
   */
  readonly next: (
    gameId: string,
    choices: readonly OptionChoiceList[],
    options: unknown,
  ) => string | null;
  /**
   * The rules of a game in one line ("19×19 · Free style"), every option named even at its
   * default, or `null` when the game offers no choice or `options` do not match its choices
   * (unknown data, never an error to show). An option missing from `options` (a record saved
   * before it existed) is named by its value in `defaults`, as the game plays it.
   */
  readonly summary: (
    gameId: string,
    choices: readonly OptionChoiceList[],
    options: unknown,
    defaults?: ChosenOptions,
  ) => string | null;
}

/**
 * Hook naming a game's rule options with the keys `Games.<id>.options.<option>.label`,
 * `….values.<value>` and `Games.<id>.options.summary`, an ICU message whose arguments are the
 * options' names: each language joins and orders them itself, nothing is concatenated here.
 */
export function useOptionLabels(): OptionLabels {
  // The keys depend on the game and its options, which next-intl's types cannot follow.
  const t = useTranslations("Games") as unknown as DynamicTranslate;
  const field = (gameId: string, name: string) => t(`${gameId}.options.${name}.label`);
  const value = (gameId: string, name: string, option: OptionValue) =>
    t(`${gameId}.options.${name}.values.${String(option)}`);
  const summary: OptionLabels["summary"] = (gameId, choices, options, defaults) => {
    if (choices.length === 0) return null;
    const matched = matchOptionChoices(choices, options, defaults);
    if (matched === null) return null;
    return t(
      `${gameId}.options.summary`,
      Object.fromEntries(
        Object.entries(matched).map(([name, option]) => [name, value(gameId, name, option)]),
      ),
    );
  };
  return {
    field,
    value,
    hint: (gameId, name, option) => {
      const key = `${gameId}.options.${name}.hints.${String(option)}`;
      return t.has(key) ? t(key) : null;
    },
    change: (gameId) => t(`${gameId}.options.change`),
    next: (gameId, choices, options) => {
      const rules = summary(gameId, choices, options);
      return rules === null ? null : t(`${gameId}.options.next`, { rules });
    },
    summary,
  };
}
