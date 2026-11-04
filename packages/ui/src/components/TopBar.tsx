import type { ReactNode } from "react";

import { cn } from "../lib/cn";

interface TopBarProps {
  /** The way out or the app's mark: the left of the bar. */
  readonly start: ReactNode;
  /** The page's title, truncated to one line on a phone: the middle of the bar. */
  readonly center?: ReactNode;
  /** The page's actions, then the settings: the right of the bar. */
  readonly end: ReactNode;
  readonly className?: string | undefined;
}

/**
 * The bar at the top of every page: one row, `--top-bar-height` high (the play screen's "no scroll"
 * maths subtracts it), stuck to the top of the screen while the page scrolls, below the safe area.
 * Its background is solid: the page's (`--game-page`, which is `--bg` outside a game), never see-
 * through, so nothing scrolled under it shows. Dialogs and menus open in the top layer, above it.
 * A layout only: what goes in each part is the app's.
 */
export function TopBar({ start, center, end, className }: TopBarProps) {
  return (
    <header
      data-top-bar=""
      className={cn(
        "sticky top-0 z-30 border-b border-border bg-game-page pt-[var(--safe-top)]",
        className,
      )}
    >
      <div className="mx-auto flex h-(--top-bar-height) max-w-6xl items-center gap-2 px-safe-4 sm:gap-3 sm:px-safe-6 lg:px-safe-10">
        <div className="flex min-w-0 items-center">{start}</div>
        <div className="flex min-w-0 flex-1 items-center justify-center">{center}</div>
        <div className="flex shrink-0 items-center gap-1.5">{end}</div>
      </div>
    </header>
  );
}
