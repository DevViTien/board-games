"use client";

import { useSyncExternalStore } from "react";

import { JELLY_GATHER_PROGRESS_KEY } from "@/config/storage-keys";

import { LEVELS } from "./levels";
import {
  browserStorage,
  type Progress,
  readProgress,
  recordSolve,
  saveAttempt,
} from "./progress-store";
import type { Level } from "./rules/types";

// The progress as a store React reads with `useSyncExternalStore` (design §4): the server has no
// localStorage, so its snapshot is `null` ("not read yet") and the first render on the client
// matches the server's HTML.

/** Every key of the puzzle starts with this, the progress key's own prefix. */
const KEY_PREFIX = JELLY_GATHER_PROGRESS_KEY.slice(
  0,
  JELLY_GATHER_PROGRESS_KEY.lastIndexOf(":") + 1,
);

let cached: Progress | null = null;
const listeners = new Set<() => void>();

const notify = () => {
  for (const listener of listeners) listener();
};

/** Reads the storage again on the next look: after another tab's write, or a solve here. */
export function refreshProgress(): void {
  cached = null;
  notify();
}

function onStorage(event: StorageEvent): void {
  if (event.key === null || event.key.startsWith(KEY_PREFIX)) refreshProgress();
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    // Nobody was listening to other tabs meanwhile: what was read may be old.
    cached = null;
    window.addEventListener("storage", onStorage);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): Progress {
  cached ??= readProgress(browserStorage(), LEVELS);
  return cached;
}

const getServerSnapshot = () => null;

/** What this browser remembers, or `null` while not read yet (on the server, and when hydrating). */
export function useProgress(): Progress | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** After every move: what was written is known, so only that level's entry changes. */
export function rememberAttempt(level: Level, history: string): void {
  const now = Date.now();
  saveAttempt(browserStorage(), level, history, now);
  if (cached === null) return;
  cached = {
    best: cached.best,
    attempts: new Map(cached.attempts).set(level.id, { history, updatedAt: now }),
  };
  notify();
}

export function rememberSolve(level: Level, moves: number): void {
  recordSolve(browserStorage(), level, moves);
  refreshProgress();
}
