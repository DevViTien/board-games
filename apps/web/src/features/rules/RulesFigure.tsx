import { cn } from "@board-games/ui";
import { type ReactNode, useId } from "react";

interface RulesFigureProps {
  /** What the figure shows, for screen readers: the name of its picture. */
  readonly label: string;
  /** The visible caption under the picture. */
  readonly caption: ReactNode;
  /** The SVG's `viewBox`. */
  readonly viewBox: string;
  /** The picture's shapes, coloured by the game's and the app's colour tokens only. */
  readonly children: ReactNode;
  readonly className?: string | undefined;
}

/**
 * A figure of a game's rules: an SVG picture named by its `<title>` (`role="img"`), and a caption
 * on screen. Every colour inside comes from a token (`fill-game-*`, `stroke-piece-*`,
 * `currentColor`), so the picture follows the light and dark themes.
 */
export function RulesFigure({ label, caption, viewBox, children, className }: RulesFigureProps) {
  const titleId = useId();
  return (
    <figure
      className={cn(
        "m-0 w-full max-w-[22.5rem] rounded-card border border-border bg-surface p-3",
        className,
      )}
    >
      <svg
        viewBox={viewBox}
        role="img"
        aria-labelledby={titleId}
        className="block h-auto w-full text-fg"
      >
        <title id={titleId}>{label}</title>
        {children}
      </svg>
      <figcaption className="mt-2 text-small text-pretty text-fg-muted">{caption}</figcaption>
    </figure>
  );
}
