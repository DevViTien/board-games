import { isRegisteredGameId } from "@board-games/games";
import { createStore, del, get, keys, set, type UseStore } from "idb-keyval";

import { SAVED_GAMES_DB, SAVED_GAMES_STORE } from "@/config/storage-keys";

import { clearLegacySave, migrateLegacySaves } from "./migrate-legacy-saves";
import { isSlotMode, type KeyValueStore, readSavedGame, slotKey, toSavedGame } from "./saved-game";
import type { SavedGameStore, SavedGameSummary } from "./types";

/** IndexedDB through idb-keyval. The database is opened on first use, never during SSR. */
function idbKeyValue(): KeyValueStore {
  let database: UseStore | undefined;
  const store = (): UseStore => (database ??= createStore(SAVED_GAMES_DB, SAVED_GAMES_STORE));
  return {
    keys: () => keys(store()),
    get: (key) => get(key, store()),
    set: (key, value) => set(key, value, store()),
    del: (key) => del(key, store()),
  };
}

/** The game id and mode of a key `"<gameId>:<mode>"` of a registered game, or `undefined`. */
function parseSlotKey(key: unknown): Pick<SavedGameSummary, "gameId" | "mode"> | undefined {
  if (typeof key !== "string") return undefined;
  const [gameId, mode, ...rest] = key.split(":");
  if (gameId === undefined || mode === undefined || rest.length > 0) return undefined;
  if (!isRegisteredGameId(gameId) || !isSlotMode(mode)) return undefined;
  return { gameId, mode };
}

/**
 * Games in progress, one per game and mode, on top of a key-value storage. Every method is async so
 * that a missing or blocked IndexedDB surfaces as a rejected promise, which callers already handle,
 * rather than as an exception thrown in the middle of a move. Games saved by M1 are moved to their
 * slot before the first operation (see `migrateLegacySaves`).
 */
export function createIndexedDbStore(
  kv: KeyValueStore = idbKeyValue(),
  now: () => Date = () => new Date(),
): SavedGameStore {
  let migrated: Promise<boolean> | undefined;
  // Whether the legacy saves were moved. A failed migration does not stop the store: it is tried
  // again on the next visit.
  const ready = (): Promise<boolean> =>
    (migrated ??= migrateLegacySaves(kv).then(
      () => true,
      () => false,
    ));

  return {
    load: async (slot) => {
      await ready();
      const key = slotKey(slot);
      const raw = await kv.get(key);
      if (raw === undefined) return undefined;
      const saved = readSavedGame(raw);
      if (saved.kind === "saved" && saved.settings.kind === slot.mode) {
        return { settings: saved.settings, record: saved.record };
      }
      // Rejecting tells the transport not to write over it (see `SavedGameStore.load`).
      if (saved.kind === "newer") throw new Error(`${key} was saved by a newer version`);
      await kv.del(key);
      return undefined;
    },
    save: async (slot, game) => {
      await ready();
      await kv.set(slotKey(slot), toSavedGame(game, now().toISOString()));
    },
    clear: async (slot) => {
      const legacyMoved = await ready();
      await kv.del(slotKey(slot));
      // Only once the legacy saves were moved: one a failed migration left behind was never listed
      // nor asked about, so it must wait for the next visit to move it.
      if (slot.mode === "local" && legacyMoved) await clearLegacySave(kv, slot.gameId);
    },
    listInProgress: async () => {
      await ready();
      const games: SavedGameSummary[] = [];
      for (const key of await kv.keys()) {
        const slot = parseSlotKey(key);
        if (slot === undefined) continue;
        const saved = readSavedGame(await kv.get(slotKey(slot)));
        if (saved.kind === "saved" && saved.inProgress && saved.settings.kind === slot.mode) {
          games.push({ ...slot, settings: saved.settings, savedAt: saved.savedAt });
        }
      }
      // ISO 8601 times of one format compare as strings.
      return games.sort((a, b) => (a.savedAt < b.savedAt ? 1 : a.savedAt > b.savedAt ? -1 : 0));
    },
  };
}

/** The store shared by the play screen, the setup screen and the menu. */
export const savedGameStore: SavedGameStore = createIndexedDbStore();
