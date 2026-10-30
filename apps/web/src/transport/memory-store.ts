import type { GameRecord } from "@board-games/engine";

import type { SavedGameStore } from "./types";

/** A `SavedGameStore` kept in memory, for tests and for places where nothing should persist. */
export function createMemoryStore(
  initial: Readonly<Record<string, unknown>> = {},
): SavedGameStore & {
  readonly entries: Map<string, unknown>;
} {
  const entries = new Map<string, unknown>(Object.entries(initial));
  return {
    entries,
    load: (gameId) => Promise.resolve(entries.get(gameId)),
    save: (gameId, record: GameRecord) => {
      // Stored as a JSON copy, like IndexedDB stores a structured clone, so later changes to the
      // session never leak into the saved game.
      entries.set(gameId, JSON.parse(JSON.stringify(record)) as unknown);
      return Promise.resolve();
    },
    clear: (gameId) => {
      entries.delete(gameId);
      return Promise.resolve();
    },
    listSavedGameIds: () => Promise.resolve([...entries.keys()]),
  };
}
