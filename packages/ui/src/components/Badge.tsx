import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "../lib/cn";

/** A chip: always words, maybe with an icon or a dot beside them, never a colour alone. */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-surface-muted text-fg-muted",
        accent: "bg-accent-soft text-accent-ink",
        success: "bg-success-soft text-success-ink",
        warning: "bg-warning-soft text-warning-ink",
        celebration: "bg-celebration-soft text-celebration-ink",
        danger: "bg-danger-soft text-danger-ink",
        // Ink: the strongest chip, for the one item that needs it now (whose turn it is).
        ink: "bg-fg text-bg",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
