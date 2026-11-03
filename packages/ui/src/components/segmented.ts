import { cva } from "class-variance-authority";

/*
 * The look shared by `RadioGroup` and `ToggleGroup`: a sunken track holding the choices, the
 * chosen one raised above it (a lighter face, a control edge, a check mark), so it never looks
 * like the main action. A radio's label is chosen when its radio is checked (`has-checked`), a
 * toggle button when pressed (`aria-pressed`).
 */

export const segmentTrack = cva(
  "flex max-w-full flex-wrap gap-1 rounded-control bg-surface-muted p-1",
);

export const segmentItem = cva(
  [
    "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[calc(var(--radius-control)-0.25rem)] border border-transparent font-semibold whitespace-nowrap text-fg transition-colors",
    "hover:not-has-checked:not-aria-pressed:bg-surface-raised/60",
    "has-checked:border-border-control has-checked:bg-surface-raised has-checked:font-bold has-checked:shadow-raised",
    "aria-pressed:border-border-control aria-pressed:bg-surface-raised aria-pressed:font-bold aria-pressed:shadow-raised",
  ],
  {
    variants: {
      size: {
        // 44 px to touch on a phone, 36 px in a desktop bar.
        sm: "min-h-11 min-w-11 px-2.5 text-caption sm:min-h-9 sm:min-w-9",
        md: "min-h-11 px-4 text-small",
      },
      // Segments growing to fill the track (a narrow form): no option left short on a row of its
      // own; a label wraps only when it alone is wider than the track.
      fill: {
        true: "flex-auto px-2 text-center whitespace-normal",
        false: "",
      },
    },
    defaultVariants: { size: "md", fill: false },
  },
);
