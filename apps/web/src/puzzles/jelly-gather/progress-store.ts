import { z } from "zod";

import { JELLY_GATHER_ATTEMPT_KEY_PREFIX, JELLY_GATHER_PROGRESS_KEY } from "@/config/storage-keys";

import { type Attempt, replay, startAttempt } from "./rules/history";
import type { Level, LevelId } from "./rules/types";

// What this browser remembers of Gom thạch (design §4), in localStorage: the best of each solved
// level, and each level's go as its history. Everything is read entry by entry, so one bad value
// costs that one level only; a level whose design changed (`version`) starts again.

export const PROGRESS_FORMAT = 1;

/** The part of `Storage` used: a fake in tests. */
export type KeyValue = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** This browser's localStorage, or null where it is blocked (reading the property itself may throw). */
export function browserStorage(): KeyValue | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function read(store: KeyValue, key: string): unknown {
  try {
    const raw = store.getItem(key);
    return raw === null ? undefined : (JSON.parse(raw) as unknown);
  } catch {
    return undefined;
  }
}

function write(store: KeyValue, key: string, value: unknown): void {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // Full or blocked: this go is still on screen, only not remembered.
  }
}

const formatSchema = z.object({ format: z.number().int() });
const bestSchema = z.object({ moves: z.number().int().positive(), version: z.number().int() });
const progressSchema = z.object({
  format: z.literal(PROGRESS_FORMAT),
  best: z.record(z.string(), z.unknown()),
});
const attemptSchema = z.object({
  format: z.literal(PROGRESS_FORMAT),
  version: z.number().int(),
  history: z.string(),
  updatedAt: z.number(),
});

/** Saved by a newer version of the app, which this one must not overwrite. */
const isNewer = (value: unknown) => {
  const parsed = formatSchema.safeParse(value);
  return parsed.success && parsed.data.format > PROGRESS_FORMAT;
};

interface SavedAttempt {
  readonly history: string;
  readonly updatedAt: number;
}

/** What is remembered, for the levels of this version only. */
export interface Progress {
  readonly best: ReadonlyMap<LevelId, number>;
  readonly attempts: ReadonlyMap<LevelId, SavedAttempt>;
}

function readBest(store: KeyValue, levels: readonly Level[]): Map<LevelId, number> {
  const best = new Map<LevelId, number>();
  const parsed = progressSchema.safeParse(read(store, JELLY_GATHER_PROGRESS_KEY));
  if (!parsed.success) return best;
  for (const level of levels) {
    const entry = bestSchema.safeParse(parsed.data.best[level.id]);
    if (
      entry.success &&
      entry.data.version === level.version &&
      entry.data.moves >= level.minMoves
    ) {
      best.set(level.id, entry.data.moves);
    }
  }
  return best;
}

function readSavedAttempt(store: KeyValue, level: Level): SavedAttempt | undefined {
  const parsed = attemptSchema.safeParse(
    read(store, `${JELLY_GATHER_ATTEMPT_KEY_PREFIX}${level.id}`),
  );
  if (!parsed.success || parsed.data.version !== level.version) return undefined;
  return { history: parsed.data.history, updatedAt: parsed.data.updatedAt };
}

export function readProgress(store: KeyValue | null, levels: readonly Level[]): Progress {
  if (store === null) return { best: new Map(), attempts: new Map() };
  const attempts = new Map<LevelId, SavedAttempt>();
  for (const level of levels) {
    const saved = readSavedAttempt(store, level);
    if (saved !== undefined) attempts.set(level.id, saved);
  }
  return { best: readBest(store, levels), attempts };
}

/** The go to put on screen for `level`: the saved one when it replays, else a new one. */
export function loadAttempt(level: Level, progress: Progress): Attempt {
  const saved = progress.attempts.get(level.id);
  return (saved && replay(level, saved.history)) ?? startAttempt(level);
}

/** Remembers a go. Read back and merged by level, so another tab's levels stay as they are. */
export function saveAttempt(
  store: KeyValue | null,
  level: Level,
  history: string,
  now: number,
): void {
  if (store === null) return;
  const key = `${JELLY_GATHER_ATTEMPT_KEY_PREFIX}${level.id}`;
  if (isNewer(read(store, key))) return;
  write(store, key, { format: PROGRESS_FORMAT, version: level.version, history, updatedAt: now });
}

/**
 * Remembers a solve, keeping the smaller count. The stored progress is read again just before
 * writing: another tab may have solved other levels since this one last looked.
 */
export function recordSolve(store: KeyValue | null, level: Level, moves: number): void {
  if (store === null) return;
  const stored = read(store, JELLY_GATHER_PROGRESS_KEY);
  if (isNewer(stored)) return;
  const parsed = progressSchema.safeParse(stored);
  const best: Record<string, unknown> = parsed.success ? { ...parsed.data.best } : {};
  const previous = bestSchema.safeParse(best[level.id]);
  const keep =
    previous.success && previous.data.version === level.version && previous.data.moves <= moves;
  if (keep) return;
  best[level.id] = { moves, version: level.version };
  write(store, JELLY_GATHER_PROGRESS_KEY, { format: PROGRESS_FORMAT, best });
}

/**
 * "Tiếp tục" (spec "Danh sách màn"): the unsolved level whose go changed last, else the first
 * unsolved level; nothing once every level is solved.
 */
export function continueLevel(levels: readonly Level[], progress: Progress): Level | undefined {
  const unsolved = levels.filter((level) => !progress.best.has(level.id));
  let latest: { level: Level; at: number } | undefined;
  for (const level of unsolved) {
    const saved = progress.attempts.get(level.id);
    if (saved === undefined || saved.history === "") continue;
    if (latest === undefined || saved.updatedAt > latest.at)
      latest = { level, at: saved.updatedAt };
  }
  return latest?.level ?? unsolved[0];
}
