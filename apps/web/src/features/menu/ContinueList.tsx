"use client";

import { ChevronRightIcon } from "@board-games/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useId } from "react";

import { useGamesInProgress } from "@/lib/use-games-in-progress";
import { seatsOf, useModeLabel } from "@/lib/use-mode-label";
import { useOptionLabels } from "@/lib/use-option-labels";
import { savedGameStore } from "@/transport/indexeddb-store";
import type { SavedGameStore } from "@/transport/types";

import type { OptionChoicesByGame } from "./menu-games";

interface ContinueListProps {
  /**
   * The rule options of each game, built on the server (`buildOptionChoices`): the menu's bundle
   * must not carry the games' rules and AI (ESLint bars `@board-games/games` here). None by
   * default.
   */
  readonly optionChoices?: OptionChoicesByGame;
  /** Where games in progress are kept; a memory store in tests. */
  readonly store?: SavedGameStore;
}

const NO_OPTION_CHOICES: OptionChoicesByGame = {};

/**
 * "Continue a game": every game in progress on this browser, by game, mode and rules (for a game
 * with rule options), the most recently saved first, each opening that very game. The menu is
 * rendered on the server, which cannot read IndexedDB, so the list appears after loading, below
 * "Join a room" so that never moves. Nothing is shown while loading, when nothing is in progress,
 * or when the saved games cannot be read.
 */
export function ContinueList({
  optionChoices = NO_OPTION_CHOICES,
  store = savedGameStore,
}: ContinueListProps) {
  const t = useTranslations("Menu");
  const tGames = useTranslations("Games");
  const modeLabel = useModeLabel();
  const optionLabels = useOptionLabels();
  const headingId = useId();
  const saved = useGamesInProgress(store);

  if (saved.status !== "ready" || saved.games.length === 0) return null;
  const { games } = saved;

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-2 border-t border-border pt-4"
    >
      <h2 id={headingId} className="text-caption text-fg-muted">
        {t("continueTitle")}
      </h2>
      <ul className="flex flex-col gap-2">
        {games.map((game) => {
          const item = {
            game: tGames(`${game.gameId}.name`),
            mode: modeLabel(seatsOf(game.settings)),
          };
          const offered = optionChoices[game.gameId];
          const rules = optionLabels.summary(
            game.gameId,
            offered?.choices ?? [],
            game.options,
            offered?.defaults,
          );
          return (
            <li key={`${game.gameId}:${game.mode}`}>
              <Link
                href={`/play/${game.gameId}/${game.mode}`}
                // Long with the rules on a phone: it wraps inside the row.
                className="focus-ring flex min-h-11 items-center justify-between gap-3 rounded-control bg-surface-muted px-3 py-2 text-small font-semibold text-fg transition-colors hover:bg-border"
              >
                {rules === null
                  ? t("continueItem", item)
                  : t("continueItemWithRules", { ...item, rules })}
                <ChevronRightIcon aria-hidden className="size-4 shrink-0 text-fg-muted" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
