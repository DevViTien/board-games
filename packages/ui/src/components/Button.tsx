import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "../lib/cn";

/** Also used to style links that look like buttons (e.g. a Next.js `Link` to a page). */
export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 rounded-card font-medium transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
    "disabled:pointer-events-none disabled:opacity-50",
    "aria-disabled:pointer-events-none aria-disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg hover:bg-accent-hover",
        secondary: "border border-border bg-surface text-fg hover:bg-surface-muted",
        ghost: "text-fg hover:bg-surface-muted",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariants {}

/**
 * `aria-disabled` is the way to disable a button that may hold keyboard focus (undo, redo): it
 * looks and acts disabled but stays focusable, whereas `disabled` makes the browser drop focus to
 * the page body. Presses are ignored here, since the browser no longer blocks them.
 */
export function Button({
  variant,
  size,
  type = "button",
  className,
  onClick,
  ...props
}: ButtonProps) {
  const ariaDisabled = props["aria-disabled"] === true || props["aria-disabled"] === "true";
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      onClick={ariaDisabled ? undefined : onClick}
      {...props}
    />
  );
}
