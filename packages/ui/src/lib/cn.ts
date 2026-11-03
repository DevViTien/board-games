import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

export type { ClassValue };

/**
 * `tailwind-merge` taught the scales of styles.css: without them it reads `text-display` as a text
 * colour (and drops the `text-fg` beside it), and does not know `shadow-press` or `rounded-control`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display", "title", "status", "heading", "body", "small", "caption"],
      shadow: ["card", "press", "raised"],
      radius: ["control", "card"],
    },
  },
});

/**
 * Builds a class string from conditional values and resolves Tailwind conflicts,
 * so a `className` passed by the caller overrides the component's defaults.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
