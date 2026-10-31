"use client";

import { useId } from "react";

import { CheckIcon } from "../icons";
import { cn } from "../lib/cn";

interface RadioOption<Value extends string> {
  readonly value: Value;
  /** Already translated. */
  readonly label: string;
}

interface RadioGroupProps<Value extends string> {
  /** The group's name, read out by screen readers; already translated. */
  readonly legend: string;
  readonly options: readonly RadioOption<Value>[];
  readonly value: Value;
  readonly onChange: (value: Value) => void;
  readonly className?: string;
}

/**
 * One choice among a few, built on native radio buttons in a `<fieldset>`: the browser gives the
 * group its name (the `<legend>`), one Tab stop, arrow keys to move the choice, and announces which
 * option is checked, without any script of ours. The radios are visually hidden; their labels look
 * like a segmented control and show the focus ring of the radio inside. In forced colours, where
 * backgrounds are dropped, a check mark shows the chosen option.
 */
export function RadioGroup<Value extends string>({
  legend,
  options,
  value,
  onChange,
  className,
}: RadioGroupProps<Value>) {
  const name = useId();

  return (
    <fieldset className={cn("flex flex-col gap-2", className)}>
      <legend className="mb-2 text-sm font-medium text-fg-muted">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-card border border-border bg-surface px-4 text-sm font-medium text-fg transition-colors",
              "hover:bg-surface-muted",
              "has-checked:border-accent has-checked:bg-accent has-checked:text-accent-fg",
              "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus-ring",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => {
                onChange(option.value);
              }}
              className="sr-only"
            />
            {/* Forced colours (Windows high contrast) drop the background that marks the choice;
                a check mark, drawn in the text colour, still shows it there. */}
            {option.value === value && (
              <CheckIcon aria-hidden className="hidden size-4 shrink-0 forced-colors:block" />
            )}
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
