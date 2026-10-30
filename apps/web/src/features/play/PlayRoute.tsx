"use client";

import type { RegisteredGameId } from "@board-games/games";
import { Suspense, use } from "react";

import { GAME_ENTRY_LOADERS } from "@/games/registry";
import type { GameEntry } from "@/games/types";
import { savedGameStore } from "@/transport/indexeddb-store";
import type { SavedGameStore } from "@/transport/types";

import { GamePlay } from "./GamePlay";
import { PlayLoading } from "./PlayLoading";

// One load per game for the life of the page, so re-renders never restart the import. A failed
// load (offline, or a chunk gone after a deploy) is forgotten, so that retrying from the error
// page imports again instead of rethrowing the same failure.
const entryLoads = new Map<RegisteredGameId, Promise<GameEntry>>();

function loadEntry(gameId: RegisteredGameId): Promise<GameEntry> {
  let load = entryLoads.get(gameId);
  if (load === undefined) {
    load = GAME_ENTRY_LOADERS[gameId]();
    entryLoads.set(gameId, load);
    load.catch(() => {
      entryLoads.delete(gameId);
    });
  }
  return load;
}

interface PlayRouteProps {
  readonly gameId: RegisteredGameId;
  /** Where the game in progress is kept; a memory store in tests. */
  readonly store?: SavedGameStore;
}

function LoadedPlay({ gameId, store }: Required<PlayRouteProps>) {
  const entry = use(loadEntry(gameId));
  return entry.open((definition, ui) => (
    <GamePlay gameId={entry.id} definition={definition} ui={ui} store={store} />
  ));
}

/**
 * The client side of `/play/<gameId>`. Only the id crosses the server/client boundary (a game's
 * rules are functions, which cannot), and only the opened game's board and rules are loaded.
 * Errors, such as a failed load, go to `app/play/[gameId]/error.tsx`.
 */
export function PlayRoute({ gameId, store = savedGameStore }: PlayRouteProps) {
  return (
    <Suspense fallback={<PlayLoading />}>
      <LoadedPlay gameId={gameId} store={store} />
    </Suspense>
  );
}
