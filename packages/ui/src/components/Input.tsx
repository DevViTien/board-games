import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "../lib/cn";

const inputVariants = cva(
  [
    "focus-ring h-12 w-full rounded-control border-[1.5px] border-border-control bg-surface px-4 text-body text-fg",
    "placeholder:text-fg-muted read-only:bg-surface-muted",
    "disabled:cursor-not-allowed disabled:border-dashed disabled:bg-surface-muted disabled:text-fg-muted aria-invalid:border-danger",
  ],
  {
    variants: {
      variant: {
        text: "",
        // A room code: read out letter by letter, so spaced and in capitals.
        code: "font-mono font-bold tracking-[0.12em] uppercase placeholder:font-normal placeholder:tracking-normal placeholder:normal-case",
      },
    },
    defaultVariants: { variant: "text" },
  },
);

type InputProps = ComponentProps<"input"> & VariantProps<typeof inputVariants>;

/**
 * Native text input styled with the design tokens. `aria-invalid` turns its border to the danger
 * colour; the message itself is the caller's, tied to the input with `aria-describedby`.
 */
export function Input({ className, variant, type = "text", ...props }: InputProps) {
  return <input type={type} className={cn(inputVariants({ variant }), className)} {...props} />;
}
