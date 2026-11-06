import type { GroupKeyValue } from "@/tools/card-score/group-store";

/**
 * A `GroupKeyValue` over a `Map`, standing in for IndexedDB: values are stored as JSON copies, and
 * `update` throws away what it was doing when its updater throws, like a transaction that wrote
 * nothing. It offers no "set": the store has no other way to write.
 */
export function createMapGroupKeyValue(
  initial: Readonly<Record<string, unknown>> = {},
): GroupKeyValue & { readonly stored: Map<string, unknown> } {
  const stored = new Map<string, unknown>(Object.entries(initial));
  return {
    stored,
    get: (key) => Promise.resolve(stored.get(key)),
    update: async (key, updater) => {
      await Promise.resolve();
      stored.set(key, JSON.parse(JSON.stringify(updater(stored.get(key)))) as unknown);
    },
    entries: () => Promise.resolve([...stored.entries()]),
    del: (key) => {
      stored.delete(key);
      return Promise.resolve();
    },
  };
}
