import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export type { ClassValue };

/**
 * Builds a class string from conditional values and resolves Tailwind conflicts,
 * so a `className` passed by the caller overrides the component's defaults.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
