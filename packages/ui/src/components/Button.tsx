import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "../lib/cn";

/** Also used to style links that look like buttons (e.g. a Next.js `Link` to a page). */
export const buttonVariants = cva(
  [
    "focus-ring inline-flex cursor-pointer items-center justify-center gap-2 rounded-control font-semibold transition-colors",
    // Disabled: a dashed, sunken look whose text still reads (4.5:1), never a faded one. It wins
    // over every colour of a variant or of the caller (a roll button's piece colour). The app uses
    // `aria-disabled` (still focusable); `disabled` looks the same.
    "aria-disabled:translate-y-0! aria-disabled:cursor-not-allowed aria-disabled:border-[1.5px]! aria-disabled:border-dashed! aria-disabled:border-border-control! aria-disabled:bg-surface-muted! aria-disabled:text-fg-muted! aria-disabled:shadow-none!",
    "disabled:translate-y-0! disabled:cursor-not-allowed disabled:border-[1.5px]! disabled:border-dashed! disabled:border-border-control! disabled:bg-surface-muted! disabled:text-fg-muted! disabled:shadow-none!",
  ],
  {
    variants: {
      variant: {
        // The lip below gives way when pressed.
        primary:
          "bg-accent font-bold text-accent-fg shadow-press hover:bg-accent-hover active:translate-y-0.5 active:shadow-none",
        secondary: "border-[1.5px] border-fg bg-surface text-fg hover:bg-surface-muted",
        ghost: "text-fg hover:bg-surface-muted",
      },
      size: {
        sm: "h-10 px-4 text-small",
        md: "h-12 px-5 text-body",
        lg: "h-16 px-6 text-heading",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

/** A native button's props, `ref` included (a caller may move the focus to it). */
export interface ButtonProps extends ComponentProps<"button">, ButtonVariants {}

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
