import { type GameRecord, RECORD_VERSION } from "@board-games/engine";
import { createStore, del, get, keys, set, type UseStore } from "idb-keyval";
import { z } from "zod";

import { SAVED_GAMES_DB, SAVED_GAMES_STORE } from "@/config/storage-keys";

import type { SavedGameStore } from "./types";

const SAVED_GAME_VERSION = 1;

/**
 * What is stored for a game in progress. `mode` exists from the start so games against the AI
 * (difficulty, which seat is human) can be saved later without a new version.
 */
const savedGameSchema = z.object({
  version: z.literal(SAVED_GAME_VERSION),
  savedAt: z.string(),
  mode: z.object({ kind: z.literal("local") }),
  record: z.unknown(),
});

// Only the version fields are read, each on its own, to recognise data written by a newer version
// of the app whatever else has changed in it.
const envelopeVersionSchema = z.object({ version: z.number() });
const recordVersionSchema = z.object({ record: z.object({ version: z.number() }) });

function isFromNewerVersion(raw: unknown): boolean {
  const envelope = envelopeVersionSchema.safeParse(raw);
  if (envelope.success && envelope.data.version > SAVED_GAME_VERSION) return true;
  const record = recordVersionSchema.safeParse(raw);
  return record.success && record.data.record.version > RECORD_VERSION;
}

type SavedGame = z.infer<typeof savedGameSchema>;

export function toSavedGame(record: GameRecord, savedAt: Date = new Date()): SavedGame {
  return {
    version: SAVED_GAME_VERSION,
    savedAt: savedAt.toISOString(),
    mode: { kind: "local" },
    record,
  };
}

/**
 * Sorts a stored value: the record inside a saved game of this version (still unchecked: the
 * engine's `fromRecord` checks it), a value written by a newer version of the app, which an old tab
 * or a rollback must leave alone, or anything else, which is unreadable and may be dropped.
 */
export function readSavedGame(
  raw: unknown,
):
  { readonly kind: "saved"; readonly record: unknown } | { readonly kind: "newer" | "unreadable" } {
  if (isFromNewerVersion(raw)) return { kind: "newer" };
  const parsed = savedGameSchema.safeParse(raw);
  return parsed.success ? { kind: "saved", record: parsed.data.record } : { kind: "unreadable" };
}

/**
 * Games in progress in IndexedDB. The database is opened on first use, never during SSR. Every
 * method is async so that a missing or blocked IndexedDB surfaces as a rejected promise, which
 * callers already handle, rather than as an exception thrown in the middle of a move.
 */
function createIndexedDbStore(): SavedGameStore {
  let database: UseStore | undefined;
  const store = (): UseStore => (database ??= createStore(SAVED_GAMES_DB, SAVED_GAMES_STORE));

  return {
    load: async (gameId) => {
      const raw: unknown = await get(gameId, store());
      if (raw === undefined) return undefined;
      const saved = readSavedGame(raw);
      if (saved.kind === "saved") return saved.record;
      // Rejecting tells the transport not to write over it (see `SavedGameStore.load`).
      if (saved.kind === "newer") throw new Error(`${gameId} was saved by a newer version`);
      await del(gameId, store());
      return undefined;
    },
    save: async (gameId, record) => {
      await set(gameId, toSavedGame(record), store());
    },
    clear: async (gameId) => {
      await del(gameId, store());
    },
    listSavedGameIds: async () =>
      (await keys(store())).filter((key): key is string => typeof key === "string"),
  };
}

/** The store shared by the play screen and the menu. */
export const savedGameStore: SavedGameStore = createIndexedDbStore();
