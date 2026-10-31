import type { RegisteredGameId } from "@board-games/games";

import { GAME_ENTRY_LOADERS } from "@/games/registry";
import type { GameEntry } from "@/games/types";

// One load per game for the life of the page, so re-renders never restart the import.
const entryLoads = new Map<RegisteredGameId, Promise<GameEntry>>();
const failedLoads = new WeakSet<Promise<GameEntry>>();

/**
 * Loads the code of a game's play screen, once. A failed load (offline, or a chunk gone after a
 * deploy) is kept until `forgetFailedGameEntryLoads`: React renders the route again from scratch
 * after a load fails, and a fresh import there would keep it loading forever, without ever showing
 * the error page.
 */
export function loadGameEntry(gameId: RegisteredGameId): Promise<GameEntry> {
  let load = entryLoads.get(gameId);
  if (load === undefined) {
    const started = GAME_ENTRY_LOADERS[gameId]();
    started.catch(() => {
      failedLoads.add(started);
    });
    entryLoads.set(gameId, started);
    load = started;
  }
  return load;
}

/** Forgets the loads that failed, so that retrying from the error page imports the code again. */
export function forgetFailedGameEntryLoads(): void {
  for (const [gameId, load] of entryLoads) {
    if (failedLoads.has(load)) entryLoads.delete(gameId);
  }
}
