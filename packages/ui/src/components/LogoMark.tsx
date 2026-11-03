import { cn } from "../lib/cn";

/** Which block of the mark is drawn apart, and in which colour, for a screen that went wrong. */
type LogoTone = "neutral" | "danger" | "warning";

interface LogoMarkProps {
  readonly className?: string | undefined;
  readonly tone?: LogoTone;
  /** The blocks pulse one after another, for a screen that is loading (not with reduced motion). */
  readonly pulse?: boolean;
}

const TONE_FILL: Readonly<Record<LogoTone, string>> = {
  neutral: "fill-fg",
  danger: "fill-danger",
  warning: "fill-warning",
};

const BLOCK = "origin-center [transform-box:fill-box]";
const PULSE = "animate-loading-pulse motion-reduce:animate-none";

/**
 * The app's mark: four game pieces, two squares and two rounds, in the accent, celebration,
 * success and ink colours. Decorative: always hidden from screen readers.
 */
export function LogoMark({ className, tone = "neutral", pulse = false }: LogoMarkProps) {
  const pulsing = pulse ? PULSE : undefined;
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn("size-8 shrink-0", className)}>
      <rect
        x="2"
        y="2"
        width="16"
        height="16"
        rx="5"
        className={cn(BLOCK, "fill-accent", pulsing)}
      />
      <rect
        x="22"
        y="2"
        width="16"
        height="16"
        rx="8"
        className={cn(BLOCK, "fill-celebration", pulsing, pulse && "[animation-delay:150ms]")}
      />
      <rect
        x="2"
        y="22"
        width="16"
        height="16"
        rx="8"
        className={cn(BLOCK, "fill-success", pulsing, pulse && "[animation-delay:450ms]")}
      />
      <rect
        x="22"
        y="22"
        width="16"
        height="16"
        rx="5"
        // Knocked askew when something went wrong.
        className={cn(
          BLOCK,
          TONE_FILL[tone],
          tone !== "neutral" && "translate-x-0.5 translate-y-0.5 rotate-12",
          pulsing,
          pulse && "[animation-delay:300ms]",
        )}
      />
    </svg>
  );
}
