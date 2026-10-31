import { z } from "zod";

import {
  hasNewerVersion,
  type KeyValueStore,
  readSavedGame,
  slotKey,
  toSavedGame,
} from "./saved-game";

/** How the first version of the app (M1) stored a same-device game: under the bare game id. */
const LEGACY_VERSION = 1;

const legacySaveSchema = z.object({
  version: z.literal(LEGACY_VERSION),
  savedAt: z.string(),
  mode: z.object({ kind: z.literal("local") }),
  record: z.unknown(),
});

type LegacySave =
  | { readonly kind: "saved"; readonly savedAt: string; readonly record: unknown }
  | { readonly kind: "newer" | "unreadable" };

/** Reads a value under a legacy key with the rules of M1, which wrote it. */
function readLegacySave(raw: unknown): LegacySave {
  if (hasNewerVersion(raw, LEGACY_VERSION)) return { kind: "newer" };
  const parsed = legacySaveSchema.safeParse(raw);
  return parsed.success
    ? { kind: "saved", savedAt: parsed.data.savedAt, record: parsed.data.record }
    : { kind: "unreadable" };
}

/** Legacy keys hold no `:`; every key of this version is `"<gameId>:<mode>"`. */
function isLegacyKey(key: unknown): key is string {
  return typeof key === "string" && !key.includes(":");
}

async function migrateLegacySave(kv: KeyValueStore, gameId: string): Promise<void> {
  const legacy = readLegacySave(await kv.get(gameId));
  // Left for the newer version that wrote it.
  if (legacy.kind === "newer") return;
  if (legacy.kind === "saved") {
    const key = slotKey({ gameId, mode: "local" });
    const raw = await kv.get(key);
    const current = raw === undefined ? undefined : readSavedGame(raw);
    // Neither is touched: the newer version owns that slot and may still want the legacy game.
    if (current?.kind === "newer") return;
    // ISO 8601 times of one format compare as strings. The newer of the two games is kept.
    if (current?.kind !== "saved" || current.savedAt < legacy.savedAt) {
      await kv.set(
        key,
        toSavedGame(
          { settings: { kind: "local" }, record: legacy.record, inProgress: true },
          legacy.savedAt,
        ),
      );
    }
  }
  await kv.del(gameId);
}

/**
 * Moves the same-device games saved by M1 (key `"<gameId>"`, envelope version 1) to their slot
 * (`"<gameId>:local"`, version 2), once, before the store is first used on a page. Unreadable ones
 * are dropped, and ones written by a newer version are left alone. Rejects on a storage error;
 * whatever was not moved is moved on the next visit.
 */
export async function migrateLegacySaves(kv: KeyValueStore): Promise<void> {
  for (const key of await kv.keys()) {
    if (isLegacyKey(key)) await migrateLegacySave(kv, key);
  }
}

/**
 * Drops the legacy save of a game, unless a newer version wrote it. Clearing the same-device slot
 * calls it, so a game an M1 tab still open saved again never comes back once it was replaced.
 */
export async function clearLegacySave(kv: KeyValueStore, gameId: string): Promise<void> {
  const raw = await kv.get(gameId);
  if (raw !== undefined && readLegacySave(raw).kind !== "newer") await kv.del(gameId);
}
