import { createStore, del, entries, get, update, type UseStore } from "idb-keyval";

import { CARD_SCORE_DB, CARD_SCORE_STORE } from "@/config/storage-keys";
import { withTimeout } from "@/lib/with-timeout";

import {
  CARD_SCORE_ERROR,
  CardScoreError,
  type CardScoreGroup,
  readGroup,
  type StoredGroup,
} from "./group";

/**
 * The storage the groups need. No "set" on purpose: every write reads and writes in one transaction
 * (`update`), so two tabs saving a round at the same moment cannot lose one.
 */
export interface GroupKeyValue {
  readonly get: (key: string) => Promise<unknown>;
  readonly update: (key: string, updater: (old: unknown) => unknown) => Promise<void>;
  readonly entries: () => Promise<readonly (readonly [unknown, unknown])[]>;
  readonly del: (key: string) => Promise<void>;
}

/** IndexedDB through idb-keyval, in a database of its own, opened on first use. */
function idbKeyValue(): GroupKeyValue {
  let database: UseStore | undefined;
  const store = (): UseStore => (database ??= createStore(CARD_SCORE_DB, CARD_SCORE_STORE));
  return {
    get: (key) => get(key, store()),
    update: (key, updater) => update(key, updater, store()),
    entries: () => entries(store()),
    del: (key) => del(key, store()),
  };
}

export type GroupLoad = StoredGroup | { readonly kind: "missing" };

export interface GroupList {
  /** Those it can read, the most recently used first. */
  readonly groups: readonly CardScoreGroup[];
  /** Saved by a newer version of the app: a reload shows them. */
  readonly newer: number;
  /** Not readable; left alone, deleted only from their own page, reached from here. */
  readonly corruptIds: readonly string[];
}

export interface GroupStore {
  readonly list: () => Promise<GroupList>;
  readonly load: (id: string) => Promise<GroupLoad>;
  readonly create: (group: CardScoreGroup) => Promise<void>;
  /**
   * Applies a pure change to the group as it is stored right now, so another tab's round is kept.
   * Resolves with the new group; rejects with its `CardScoreError`, and then nothing was written.
   */
  readonly change: (
    id: string,
    apply: (group: CardScoreGroup) => CardScoreGroup,
  ) => Promise<CardScoreGroup>;
  /** Deletes a group; never one saved by a newer version of the app. */
  readonly remove: (id: string) => Promise<void>;
}

// IndexedDB has been seen to hang for good (`transport/store-timeout.ts`).
const STORE_TIMEOUT_MS = 3000;

/** Asks the browser not to clear this site's data when short of room. It may say no. */
function askToKeepData(): void {
  try {
    navigator.storage.persist().catch(() => undefined);
  } catch {
    // No such thing on this browser: nothing to ask.
  }
}

export function createGroupStore(
  kv: GroupKeyValue = idbKeyValue(),
  timeoutMs: number = STORE_TIMEOUT_MS,
): GroupStore {
  const timed = <T>(operation: () => Promise<T>, what: string): Promise<T> =>
    withTimeout(operation, timeoutMs, `card score store: ${what}`);

  return {
    list: () =>
      timed(async () => {
        // Read in one go: a group deleted in the meantime must not read as a corrupt one.
        const stored = (await kv.entries()).map(([key, raw]) => ({
          id: String(key),
          ...readGroup(raw),
        }));
        const groups = stored.flatMap((entry) => (entry.kind === "saved" ? [entry.group] : []));
        return {
          // ISO 8601 times of one format compare as strings.
          groups: [...groups].sort((a, b) =>
            a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0,
          ),
          newer: stored.filter((entry) => entry.kind === "newer").length,
          corruptIds: stored.filter((entry) => entry.kind === "corrupt").map(({ id }) => id),
        };
      }, "list"),
    load: (id) =>
      timed(async () => {
        const raw = await kv.get(id);
        return raw === undefined ? { kind: "missing" } : readGroup(raw);
      }, "load"),
    create: (group) =>
      timed(async () => {
        // An id belongs to one form: the same one again is that form sent again, after an answer that
        // came too late. Nothing can have been played in it yet.
        await kv.update(group.id, () => group);
        askToKeepData();
      }, "create"),
    change: (id, apply) =>
      timed(async () => {
        let changed: CardScoreGroup | undefined;
        await kv.update(id, (old) => {
          if (old === undefined) throw new CardScoreError(CARD_SCORE_ERROR.groupGone);
          const stored = readGroup(old);
          if (stored.kind === "newer") throw new CardScoreError(CARD_SCORE_ERROR.groupNewer);
          if (stored.kind === "corrupt") throw new CardScoreError(CARD_SCORE_ERROR.groupCorrupt);
          changed = apply(stored.group);
          return changed;
        });
        if (changed === undefined) throw new CardScoreError(CARD_SCORE_ERROR.groupGone);
        return changed;
      }, "change"),
    remove: (id) =>
      timed(async () => {
        if (readGroup(await kv.get(id)).kind === "newer") {
          throw new CardScoreError(CARD_SCORE_ERROR.groupNewer);
        }
        await kv.del(id);
      }, "remove"),
  };
}

/** The store every screen of the tool shares. */
export const groupStore: GroupStore = createGroupStore();
