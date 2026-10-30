import type { SelectHTMLAttributes } from "react";

import { cn } from "../lib/cn";

/** Native select styled with the design tokens; keeps the platform's accessible picker on mobile. */
export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 rounded-card border border-border bg-surface px-2 text-sm text-fg",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
        "disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
