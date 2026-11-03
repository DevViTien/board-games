import { CheckIcon } from "../icons";
import { cn } from "../lib/cn";
import { segmentItem, segmentTrack } from "./segmented";

interface ToggleOption<Value extends string> {
  readonly value: Value;
  /** Already translated. */
  readonly label: string;
  /** The language the label is written in, when it is not the page's (a language's own name). */
  readonly lang?: string;
}

interface ToggleGroupProps<Value extends string> {
  /** The group's name, read out by screen readers; already translated. */
  readonly label: string;
  readonly options: readonly ToggleOption<Value>[];
  readonly value: Value;
  readonly onChange: (value: Value) => void;
  /**
   * A change is under way: the group says so (`aria-busy`) and ignores presses until it ends. The
   * buttons are never `disabled`, so the one pressed keeps the focus.
   */
  readonly busy?: boolean;
  readonly size?: "sm" | "md";
  readonly className?: string | undefined;
}

/**
 * One choice among a few, each a toggle button (`aria-pressed`) of its own Tab stop: unlike radios,
 * arrow keys do not change the choice, so a costly change (the page's language, which reloads it)
 * happens only for the button pressed, never for each option passed on the way. Looks like
 * `RadioGroup`.
 */
export function ToggleGroup<Value extends string>({
  label,
  options,
  value,
  onChange,
  busy = false,
  size = "md",
  className,
}: ToggleGroupProps<Value>) {
  return (
    <div
      role="group"
      aria-label={label}
      aria-busy={busy || undefined}
      // While busy: dimmed a little, with a waiting pointer, besides `aria-busy`.
      className={cn(
        segmentTrack(),
        "transition-opacity aria-busy:opacity-70 aria-busy:*:cursor-progress",
        className,
      )}
    >
      {options.map((option) => {
        const pressed = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            lang={option.lang}
            aria-pressed={pressed}
            className={cn(segmentItem({ size }), "focus-ring")}
            onClick={() => {
              if (!busy && !pressed) onChange(option.value);
            }}
          >
            {pressed && <CheckIcon aria-hidden className="size-4 shrink-0" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
