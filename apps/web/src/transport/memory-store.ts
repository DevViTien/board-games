import { isRegisteredGameId } from "@board-games/games";

import { slotKey } from "./saved-game";
import type { ModeSettings, SavedGameStore, SavedGameSummary, SaveSlot } from "./types";

interface MemorySavedGame {
  readonly gameId: string;
  readonly mode: SaveSlot["mode"];
  readonly settings: ModeSettings;
  /** Untrusted, like what IndexedDB returns. */
  readonly record: unknown;
  readonly inProgress: boolean;
  readonly savedAt: string;
}

/** A game to put in a memory store before a test, under `"<gameId>:<mode>"`. */
interface InitialSavedGame {
  readonly settings: ModeSettings;
  readonly record: unknown;
  readonly inProgress?: boolean;
  /** ISO 8601; now by default. */
  readonly savedAt?: string;
}

function slotOf(key: string): SaveSlot {
  const [gameId = key, mode] = key.split(":");
  return { gameId, mode: mode === "ai" ? "ai" : "local" };
}

/** A `SavedGameStore` kept in memory, for tests and for places where nothing should persist. */
export function createMemoryStore(
  initial: Readonly<Record<string, InitialSavedGame>> = {},
): SavedGameStore & {
  /** Keyed by `"<gameId>:<mode>"`, in the order of saving. */
  readonly entries: Map<string, MemorySavedGame>;
} {
  const now = new Date().toISOString();
  const entries = new Map<string, MemorySavedGame>(
    Object.entries(initial).map(([key, game]) => [
      key,
      { ...slotOf(key), inProgress: true, savedAt: now, ...game },
    ]),
  );
  return {
    entries,
    load: (slot) => {
      const saved = entries.get(slotKey(slot));
      return Promise.resolve(
        saved === undefined ? undefined : { settings: saved.settings, record: saved.record },
      );
    },
    save: (slot, { settings, record, inProgress }) => {
      const key = slotKey(slot);
      // Re-inserted, so the map stays in the order of saving. Stored as a JSON copy, like
      // IndexedDB stores a structured clone, so later changes to the session never leak into it.
      entries.delete(key);
      entries.set(key, {
        ...slot,
        settings,
        record: JSON.parse(JSON.stringify(record)) as unknown,
        inProgress,
        savedAt: new Date().toISOString(),
      });
      return Promise.resolve();
    },
    clear: (slot) => {
      entries.delete(slotKey(slot));
      return Promise.resolve();
    },
    // Read like the IndexedDB store: games in progress of registered games whose settings fit
    // their slot, the most recently saved first (ties: the one saved last).
    listInProgress: () => {
      const games: SavedGameSummary[] = [];
      for (const { gameId, mode, settings, inProgress, savedAt } of [
        ...entries.values(),
      ].reverse()) {
        if (inProgress && settings.kind === mode && isRegisteredGameId(gameId)) {
          games.push({ gameId, mode, settings, savedAt });
        }
      }
      // A stable sort, so ties keep the order of saving. ISO 8601 times compare as strings.
      return Promise.resolve(
        games.sort((a, b) => (a.savedAt < b.savedAt ? 1 : a.savedAt > b.savedAt ? -1 : 0)),
      );
    },
  };
}
