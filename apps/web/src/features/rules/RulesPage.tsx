import type { RegisteredGameId } from "@board-games/games/ids";
import { buttonVariants, cn } from "@board-games/ui";
import Link from "next/link";
import type { ReactNode } from "react";

import { AppTopBar } from "@/features/shell/AppTopBar";

interface RulesPageProps {
  readonly gameId: RegisteredGameId;
  /** Already translated: "Luật chơi Cờ caro". */
  readonly title: string;
  /** Already translated: the number of players and the length of a game. */
  readonly facts: ReactNode;
  /** The game's artwork (decorative), drawn on the server. */
  readonly artwork: ReactNode;
  /** Already translated: "Chơi Cờ caro". */
  readonly playLabel: string;
  /** The game's rules: its sections (`games/<id>/Rules.tsx`). */
  readonly children: ReactNode;
}

/**
 * `/rules/<id>`: a game's rules on a page of their own, in the game's colours (`data-game`), with a
 * way to play the game at the top and again at the end, and the app's top bar (the way back to the
 * menu, the settings) stuck above it.
 */
export function RulesPage({ gameId, title, facts, artwork, playLabel, children }: RulesPageProps) {
  const playLink = (
    <Link href={`/play/${gameId}`} className={cn(buttonVariants(), "self-start")}>
      {playLabel}
    </Link>
  );
  return (
    // The game's own look (`games/<id>/theme.css`) applies from here down, the top bar and the
    // figures included.
    <div data-game={gameId} className="min-h-dvh bg-game-page">
      {/* The page's title in the bar too, there while the heading scrolls away; for sight only, the
          heading says it to screen readers. */}
      <AppTopBar
        title={
          <p aria-hidden className="truncate text-body font-bold">
            {title}
          </p>
        }
      />
      <main className="mx-auto flex max-w-5xl flex-col gap-8 pt-6 px-safe-4 pb-safe-14 lg:gap-10 lg:pt-8 lg:px-safe-10">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <div className="flex w-full min-w-0 items-center gap-4 sm:w-auto sm:flex-1">
            <div
              aria-hidden
              className="grid size-18 shrink-0 place-items-center overflow-hidden rounded-card bg-game-tint"
            >
              {artwork}
            </div>
            <div className="min-w-0">
              <h1 className="text-title text-balance">{title}</h1>
              <div className="mt-1 text-small text-fg-muted">{facts}</div>
            </div>
          </div>
          {playLink}
        </div>
        {/* A container, so a section puts its figures beside its words only where it has room. */}
        <div className="@container flex flex-col gap-8">{children}</div>
        {playLink}
      </main>
    </div>
  );
}
