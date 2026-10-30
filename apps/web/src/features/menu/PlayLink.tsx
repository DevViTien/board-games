"use client";

import type { RegisteredGameId } from "@board-games/games";
import { buttonVariants } from "@board-games/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { savedGameStore } from "@/transport/indexeddb-store";
import type { SavedGameStore } from "@/transport/types";

interface PlayLinkProps {
  readonly gameId: RegisteredGameId;
  /** Id of the card heading, so screen readers announce which game the link plays. */
  readonly describedBy: string;
  readonly store?: SavedGameStore;
}

/**
 * The way into a game: "Play", or "Continue" when this browser keeps a game in progress. The menu
 * is rendered on the server, which cannot read IndexedDB, so the label switches after loading.
 * Only the key's presence is checked: a corrupt save still says "Continue" and then opens a new
 * game, which is rare and harmless, and reading it in full would pull every game's rules in here.
 */
export function PlayLink({ gameId, describedBy, store = savedGameStore }: PlayLinkProps) {
  const t = useTranslations("Menu");
  const [hasSavedGame, setHasSavedGame] = useState(false);

  useEffect(() => {
    let active = true;
    store.listSavedGameIds().then(
      (ids) => {
        if (active) setHasSavedGame(ids.includes(gameId));
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [gameId, store]);

  return (
    <Link
      href={`/play/${gameId}`}
      aria-describedby={describedBy}
      className={buttonVariants({ className: "min-w-28 self-start" })}
    >
      {hasSavedGame ? t("continue") : t("play")}
    </Link>
  );
}
