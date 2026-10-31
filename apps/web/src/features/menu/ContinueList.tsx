"use client";

import { buttonVariants } from "@board-games/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useId } from "react";

import { useGamesInProgress } from "@/lib/use-games-in-progress";
import { seatsOf, useModeLabel } from "@/lib/use-mode-label";
import { savedGameStore } from "@/transport/indexeddb-store";
import type { SavedGameStore } from "@/transport/types";

interface ContinueListProps {
  /** Where games in progress are kept; a memory store in tests. */
  readonly store?: SavedGameStore;
}

/**
 * "Continue a game": every game in progress on this browser, by game and mode, the most recently
 * saved first, each opening that very game. The menu is rendered on the server, which cannot read
 * IndexedDB, so the list appears after loading; it sits below the cards, so nothing jumps. Nothing
 * is shown while loading, when nothing is in progress, or when the saved games cannot be read.
 */
export function ContinueList({ store = savedGameStore }: ContinueListProps) {
  const t = useTranslations("Menu");
  const tGames = useTranslations("Games");
  const modeLabel = useModeLabel();
  const headingId = useId();
  const saved = useGamesInProgress(store);

  if (saved.status !== "ready" || saved.games.length === 0) return null;
  const { games } = saved;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-xl font-semibold tracking-tight">
        {t("continueTitle")}
      </h2>
      <ul className="flex flex-wrap gap-2">
        {games.map((game) => (
          <li key={`${game.gameId}:${game.mode}`}>
            <Link
              href={`/play/${game.gameId}/${game.mode}`}
              className={buttonVariants({ variant: "secondary" })}
            >
              {t("continueItem", {
                game: tGames(`${game.gameId}.name`),
                mode: modeLabel(seatsOf(game.settings)),
              })}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
