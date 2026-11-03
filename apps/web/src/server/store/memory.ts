import type { RoomCode } from "@board-games/protocol";

import { parseStoredRoom, type StoredRoom } from "../room";
import { addListener, notifyListeners, type RoomListener, type RoomStore } from "./room-store";

type StoreOperation = "create" | "get" | "update" | "subscribe";

/** Runs before an operation; throwing fails it, never settling makes it hang. */
type OperationHook = () => void | Promise<void>;

/**
 * A `RoomStore` kept in memory, with the same revision checks as Redis but no expiry: for tests,
 * and for the realtime server on a developer's machine when there is no `REDIS_URL`. Rooms are
 * kept as JSON and read back through `parseStoredRoom`, as from Redis.
 */
export interface MemoryRoomStore extends RoomStore {
  /** For tests: the next `count` rooms written reach no listener, like lost pub/sub messages. */
  dropMessages(this: void, count?: number): void;
  /**
   * For tests: what the Redis store does when its channel connection comes back: every room
   * with a listener is read again and handed to its listeners.
   */
  reconnect(this: void): void;
  /** For tests: runs `hook` before every call to `operation` until the returned function is called. */
  intercept(this: void, operation: StoreOperation, hook: OperationHook): () => void;
  /** For tests: stores `json` as the room's data as is, like data written by another version. */
  writeRaw(this: void, code: RoomCode, revision: number, json: string): void;
  /** For tests: deletes the room, as Redis does when it expires. */
  expire(this: void, code: RoomCode): void;
  /** For tests: how many listeners the room has. */
  listenerCount(this: void, code: RoomCode): number;
}

interface Entry {
  readonly revision: number;
  readonly json: string;
}

export function createMemoryRoomStore(): MemoryRoomStore {
  const rooms = new Map<RoomCode, Entry>();
  const listeners = new Map<RoomCode, Set<RoomListener>>();
  const hooks = new Map<StoreOperation, Set<OperationHook>>();
  let messagesToDrop = 0;

  async function runHooks(operation: StoreOperation): Promise<void> {
    for (const hook of [...(hooks.get(operation) ?? [])]) await hook();
  }

  /** Delivered later, like a message from Redis, to the listeners the room has now. */
  function deliver(code: RoomCode, json: string): void {
    const targets = [...(listeners.get(code) ?? [])];
    queueMicrotask(() => {
      const room = parseStoredRoom(json);
      if (room !== null) notifyListeners(targets, room);
    });
  }

  return {
    create: async (room: StoredRoom) => {
      await runHooks("create");
      if (rooms.has(room.code)) return "exists";
      rooms.set(room.code, { revision: room.revision, json: JSON.stringify(room) });
      return "created";
    },
    get: async (code) => {
      await runHooks("get");
      const entry = rooms.get(code);
      return entry === undefined ? null : parseStoredRoom(entry.json);
    },
    update: async (code, expectedRevision, next) => {
      await runHooks("update");
      const entry = rooms.get(code);
      if (entry === undefined) return "missing";
      if (entry.revision !== expectedRevision) return "conflict";
      const json = JSON.stringify(next);
      rooms.set(code, { revision: next.revision, json });
      if (messagesToDrop > 0) messagesToDrop -= 1;
      else deliver(code, json);
      return "updated";
    },
    subscribe: async (code, listener) => {
      await runHooks("subscribe");
      let set = listeners.get(code);
      if (set === undefined) {
        set = new Set();
        listeners.set(code, set);
      }
      const remove = addListener(set, listener);
      return () => {
        remove();
        if (set.size === 0 && listeners.get(code) === set) listeners.delete(code);
      };
    },
    close: () => {
      listeners.clear();
      return Promise.resolve();
    },
    dropMessages: (count = 1) => {
      messagesToDrop += count;
    },
    reconnect: () => {
      for (const code of listeners.keys()) {
        const entry = rooms.get(code);
        if (entry !== undefined) deliver(code, entry.json);
      }
    },
    intercept: (operation, hook) => {
      let set = hooks.get(operation);
      if (set === undefined) {
        set = new Set();
        hooks.set(operation, set);
      }
      set.add(hook);
      return () => {
        set.delete(hook);
      };
    },
    writeRaw: (code, revision, json) => {
      rooms.set(code, { revision, json });
    },
    expire: (code) => {
      rooms.delete(code);
    },
    listenerCount: (code) => listeners.get(code)?.size ?? 0,
  };
}
