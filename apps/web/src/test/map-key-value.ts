import type { KeyValueStore } from "@/transport/saved-game";

/**
 * A `KeyValueStore` over a `Map`, standing in for IndexedDB. Values are stored as JSON copies, like
 * IndexedDB stores structured clones.
 */
export function createMapKeyValue(
  initial: Readonly<Record<string, unknown>> = {},
): KeyValueStore & {
  readonly entries: Map<string, unknown>;
} {
  const entries = new Map<string, unknown>(Object.entries(initial));
  return {
    entries,
    keys: () => Promise.resolve([...entries.keys()]),
    get: (key) => Promise.resolve(entries.get(key)),
    set: (key, value) => {
      entries.set(key, JSON.parse(JSON.stringify(value)) as unknown);
      return Promise.resolve();
    },
    del: (key) => {
      entries.delete(key);
      return Promise.resolve();
    },
  };
}
