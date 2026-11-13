"use client";

import type { OptionChoiceList, OptionValue } from "@board-games/engine";
import { RadioGroup } from "@board-games/ui";

import type { ChosenOptions } from "@/lib/option-choices";
import { useOptionLabels } from "@/lib/use-option-labels";

interface OptionFieldsProps {
  readonly gameId: string;
  readonly choices: readonly OptionChoiceList[];
  readonly value: ChosenOptions;
  readonly onChange: (name: string, value: OptionValue) => void;
}

/**
 * One group of radios per rule option a game offers, on the setup screen and in the dialog
 * changing the options of the next game. An option whose values the game gives hints for (a map's
 * difficulty) is a grid of cells, each with its hint; any other is a segmented bar.
 */
export function OptionFields({ gameId, choices, value, onChange }: OptionFieldsProps) {
  const labels = useOptionLabels();
  return choices.map(({ name, values }) => {
    const hints = values.map((option) => labels.hint(gameId, name, option));
    const hinted = hints.every((hint) => hint !== null);
    return (
      <RadioGroup
        fill
        key={name}
        layout={hinted ? "grid" : "bar"}
        legend={labels.field(gameId, name)}
        options={values.map((option, index) => ({
          value: String(option),
          label: labels.value(gameId, name, option),
          hint: hinted ? (hints[index] ?? undefined) : undefined,
        }))}
        value={String(value[name])}
        onChange={(picked) => {
          // Radio values are text: back to the game's own value (a number for a board size).
          const option = values.find((candidate) => String(candidate) === picked);
          if (option !== undefined) onChange(name, option);
        }}
      />
    );
  });
}
