import type { ComponentProps } from "react";

import { cn } from "../lib/cn";

/**
 * Native text input styled with the design tokens. `aria-invalid` turns its border to the danger
 * colour; the message itself is the caller's, tied to the input with `aria-describedby`.
 */
export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "h-10 w-full rounded-card border border-border bg-surface px-3 text-base text-fg",
        "placeholder:text-fg-muted read-only:bg-surface-muted",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
        "disabled:opacity-50 aria-invalid:border-danger",
        className,
      )}
      {...props}
    />
  );
}
