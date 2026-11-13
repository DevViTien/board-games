"use client";

import { type ComponentType, useId } from "react";

import { CheckIcon } from "../icons";
import { cn } from "../lib/cn";
import { segmentCell, segmentItem, segmentTrack } from "./segmented";

interface RadioOption<Value extends string> {
  readonly value: Value;
  /** Already translated. */
  readonly label: string;
  /** Drawn before the label, hidden from screen readers. */
  readonly icon?: ComponentType<{ readonly className?: string; readonly "aria-hidden"?: boolean }>;
  /** A short line under the label (a map's difficulty), read out with it; already translated. */
  readonly hint?: string | undefined;
}

interface RadioGroupProps<Value extends string> {
  /** The group's name, read out by screen readers; already translated. */
  readonly legend: string;
  readonly options: readonly RadioOption<Value>[];
  readonly value: Value;
  readonly onChange: (value: Value) => void;
  /** `sm` for a bar (the theme on the menu); `md` by default. */
  readonly size?: "sm" | "md";
  /** The legend is only read out, for a group whose purpose shows (icons in a bar). */
  readonly hideLegend?: boolean;
  /** Below 640 px, options with an icon show only it; their label is still read out. */
  readonly compact?: boolean;
  /** The options grow to fill the track's whole width (a form), instead of keeping their own. */
  readonly fill?: boolean;
  /**
   * `grid`: the options as cells of a grid, each as wide as the others, for many options or options
   * with a hint; `bar` (default): a segmented bar.
   */
  readonly layout?: "bar" | "grid";
  readonly className?: string | undefined;
}

/**
 * One choice among a few, built on native radio buttons in a `<fieldset>`: the browser gives the
 * group its name (the `<legend>`), one Tab stop, arrow keys to move the choice, and announces which
 * option is checked, without any script of ours. The radios are visually hidden; their labels form
 * a segmented control, the chosen one raised with a check mark (also what forced colours show),
 * and show the focus ring of the radio inside. Options wrap rather than scroll on a narrow screen.
 */
export function RadioGroup<Value extends string>({
  legend,
  options,
  value,
  onChange,
  size = "md",
  hideLegend = false,
  compact = false,
  fill = false,
  layout = "bar",
  className,
}: RadioGroupProps<Value>) {
  const grid = layout === "grid";
  const name = useId();

  return (
    <fieldset className={cn("flex min-w-0 flex-col", className)}>
      <legend className={cn("mb-2 text-caption text-fg-muted", hideLegend && "sr-only")}>
        {legend}
      </legend>
      <div className={cn(segmentTrack({ grid }), !fill && !grid && "self-start")}>
        {options.map(({ value: option, label, icon: Icon, hint }) => (
          <label
            key={option}
            className={cn(grid ? segmentCell() : segmentItem({ size, fill }), "focus-ring-within")}
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={option === value}
              // With a hint, named by both ("Cold store, Hard"): the hint shown is hidden from
              // screen readers, so it is not read twice.
              aria-label={hint === undefined ? undefined : `${label}, ${hint}`}
              onChange={() => {
                onChange(option);
              }}
              className="sr-only"
            />
            {grid ? (
              <>
                <span className="flex items-center gap-1.5">
                  {/* Its room is kept when not chosen, so the label never moves. */}
                  <CheckIcon
                    aria-hidden
                    className={cn("size-4 shrink-0", option !== value && "invisible")}
                  />
                  {label}
                </span>
                {hint !== undefined && (
                  <span aria-hidden className="ps-5.5 text-caption font-normal text-fg-muted">
                    {hint}
                  </span>
                )}
              </>
            ) : (
              <>
                {option === value && <CheckIcon aria-hidden className="size-4 shrink-0" />}
                {Icon !== undefined && <Icon aria-hidden className="size-4 shrink-0" />}
                <span className={cn(compact && Icon !== undefined && "max-sm:sr-only")}>
                  {label}
                </span>
              </>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
