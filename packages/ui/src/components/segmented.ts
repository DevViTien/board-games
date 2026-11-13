import { cva } from "class-variance-authority";

/*
 * The look of `RadioGroup` (a segmented control): a sunken track holding the choices, the
 * chosen one raised above it (a lighter face, a control edge, a check mark), so it never looks
 * like the main action. A radio's label is chosen when its radio is checked (`has-checked`).
 */

export const segmentTrack = cva("max-w-full gap-1 rounded-control bg-surface-muted p-1", {
  variants: {
    // A grid of equal cells, two on a phone (360 px), more as the room grows.
    grid: {
      true: "grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))]",
      false: "flex flex-wrap",
    },
  },
  defaultVariants: { grid: false },
});

export const segmentItem = cva(
  [
    "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[calc(var(--radius-control)-0.25rem)] border border-transparent font-semibold whitespace-nowrap text-fg transition-colors",
    "hover:not-has-checked:bg-surface-raised/60",
    "has-checked:border-border-control has-checked:bg-surface-raised has-checked:font-bold has-checked:shadow-raised",
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

/** A choice in a grid track: its label, and a hint below it, start-aligned. */
export const segmentCell = cva([
  "flex min-h-14 cursor-pointer flex-col items-start justify-center rounded-[calc(var(--radius-control)-0.25rem)] border border-transparent px-3 py-1.5 text-start text-small font-semibold text-fg transition-colors",
  "hover:not-has-checked:bg-surface-raised/60",
  "has-checked:border-border-control has-checked:bg-surface-raised has-checked:font-bold has-checked:shadow-raised",
]);
