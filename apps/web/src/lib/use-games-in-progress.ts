import { useEffect, useState } from "react";

import { withStoreTimeout } from "@/transport/store-timeout";
import type { SavedGameStore, SavedGameSummary } from "@/transport/types";

/** The games in progress on this browser, as far as they could be read. */
export type GamesInProgress =
  | { readonly status: "loading" }
  /** The store failed or did not answer in time: there may be games in progress, unknown. */
  | { readonly status: "failed" }
  | { readonly status: "ready"; readonly games: readonly SavedGameSummary[] };

const LOADING: GamesInProgress = { status: "loading" };

/**
 * Hook reading the games in progress (`SavedGameStore.listInProgress`) after mount: they live in
 * browser storage, which the server cannot read, so the server renders "loading" and nothing
 * mismatches on hydration. A store that does not answer counts as failed after a while, so a
 * screen waiting for the list is never stuck.
 */
export function useGamesInProgress(store: SavedGameStore): GamesInProgress {
  const [games, setGames] = useState<GamesInProgress>(LOADING);

  useEffect(() => {
    let active = true;
    withStoreTimeout(() => store.listInProgress()).then(
      (listed) => {
        if (active) setGames({ status: "ready", games: listed });
      },
      () => {
        if (active) setGames({ status: "failed" });
      },
    );
    return () => {
      active = false;
    };
  }, [store]);

  return games;
}
