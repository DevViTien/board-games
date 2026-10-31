import { AI_LEVEL, RECORD_VERSION } from "@board-games/engine";
import { z } from "zod";

import { FIRST_PLAYER, type ModeSettings, type SaveSlot, SLOT_MODE, type SlotMode } from "./types";

/**
 * The minimal key-value storage saved games are kept in: IndexedDB in the app, a `Map` in tests,
 * so every rule for reading, writing and moving saved games is tested without a browser.
 */
export interface KeyValueStore {
  keys(this: void): Promise<readonly unknown[]>;
  get(this: void, key: string): Promise<unknown>;
  set(this: void, key: string, value: unknown): Promise<void>;
  del(this: void, key: string): Promise<void>;
}

/**
 * Raised on every change to the shape of what is stored, adding a mode included, so that an older
 * version of the app (an old tab, a rollback) recognises newer data and leaves it alone.
 */
const SAVED_GAME_VERSION = 2;

export function slotKey({ gameId, mode }: SaveSlot): string {
  return `${gameId}:${mode}`;
}

export function isSlotMode(value: string): value is SlotMode {
  return Object.values<string>(SLOT_MODE).includes(value);
}

const seatSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("human") }),
  z.object({ kind: z.literal("ai"), level: z.enum(AI_LEVEL) }),
]);

const modeSettingsSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("local") }),
  z.object({ kind: z.literal("ai"), first: z.enum(FIRST_PLAYER), seats: z.array(seatSchema) }),
]);

/** What is stored for a game: the seats and choices it was set up with, and its moves. */
const savedGameSchema = z.object({
  version: z.literal(SAVED_GAME_VERSION),
  savedAt: z.string(),
  inProgress: z.boolean(),
  mode: modeSettingsSchema,
  record: z.unknown(),
});

/** What `savedGameSchema` accepts, as written. */
interface StoredGame {
  readonly version: typeof SAVED_GAME_VERSION;
  readonly savedAt: string;
  readonly inProgress: boolean;
  readonly mode: ModeSettings;
  readonly record: unknown;
}

// Only the version fields are read, each on its own, to recognise data written by a newer version
// of the app whatever else has changed in it.
const envelopeVersionSchema = z.object({ version: z.number() });
const recordVersionSchema = z.object({ record: z.object({ version: z.number() }) });
const modeKindSchema = z.object({
  version: z.literal(SAVED_GAME_VERSION),
  mode: z.object({ kind: z.string() }),
});

/** Whether the envelope or the engine record in `raw` is newer than `envelopeVersion` can read. */
export function hasNewerVersion(raw: unknown, envelopeVersion: number): boolean {
  const envelope = envelopeVersionSchema.safeParse(raw);
  if (envelope.success && envelope.data.version > envelopeVersion) return true;
  const record = recordVersionSchema.safeParse(raw);
  return record.success && record.data.record.version > RECORD_VERSION;
}

function isFromNewerVersion(raw: unknown): boolean {
  if (hasNewerVersion(raw, SAVED_GAME_VERSION)) return true;
  // A mode this version does not know comes from a version that forgot to raise the envelope's.
  const mode = modeKindSchema.safeParse(raw);
  return mode.success && !isSlotMode(mode.data.mode.kind);
}

export function toSavedGame(
  game: { readonly settings: ModeSettings; readonly record: unknown; readonly inProgress: boolean },
  savedAt: string,
): StoredGame {
  return {
    version: SAVED_GAME_VERSION,
    savedAt,
    inProgress: game.inProgress,
    mode: game.settings,
    record: game.record,
  };
}

export type ReadSavedGame =
  | {
      readonly kind: "saved";
      readonly savedAt: string;
      readonly inProgress: boolean;
      readonly settings: ModeSettings;
      /** Still unchecked: the engine's `fromRecord` checks it. */
      readonly record: unknown;
    }
  | { readonly kind: "newer" | "unreadable" };

/**
 * Sorts a stored value: a saved game of this version, a value written by a newer version of the
 * app, which an old tab or a rollback must leave alone, or anything else, which is unreadable and
 * may be dropped.
 */
export function readSavedGame(raw: unknown): ReadSavedGame {
  if (isFromNewerVersion(raw)) return { kind: "newer" };
  const parsed = savedGameSchema.safeParse(raw);
  if (!parsed.success) return { kind: "unreadable" };
  const { savedAt, inProgress, mode, record } = parsed.data;
  return { kind: "saved", savedAt, inProgress, settings: mode, record };
}
