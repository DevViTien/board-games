import type { RoomCode } from "@board-games/protocol";

import type { StoredRoom } from "../room";

export type RoomListener = (room: StoredRoom) => void;

/**
 * Where rooms live between messages: Redis on Vercel, memory on a developer's machine and in
 * tests. Every write is checked against the revision it was based on, so two instances never
 * overwrite each other, and is announced to every instance listening to the room.
 */
export interface RoomStore {
  /** `exists` when a room already has this code; that room is left untouched. */
  create(this: void, room: StoredRoom): Promise<"created" | "exists">;
  /** `null` when there is no room, or it cannot be read (another format, broken data). */
  get(this: void, code: RoomCode): Promise<StoredRoom | null>;
  /** Writes `next` only if the stored revision is still `expectedRevision`. */
  update(
    this: void,
    code: RoomCode,
    expectedRevision: number,
    next: StoredRoom,
  ): Promise<"updated" | "conflict" | "missing">;
  /**
   * Calls `listener` with every room written after the promise resolves, from any instance, in
   * order; and with the room read again whenever the store reconnects to the channel, since
   * messages may have been lost meanwhile. Resolves to the function that stops listening.
   */
  subscribe(this: void, code: RoomCode, listener: RoomListener): Promise<() => void>;
  close(this: void): Promise<void>;
}

/**
 * Adds `listener` to `listeners` as a listener of its own, so the same function subscribed twice
 * is two listeners, each removed on its own. Returns the function that removes it.
 */
export function addListener(listeners: Set<RoomListener>, listener: RoomListener): () => void {
  const own: RoomListener = (room) => {
    listener(room);
  };
  listeners.add(own);
  return () => {
    listeners.delete(own);
  };
}

/**
 * Calls every listener with `room`. One that throws is logged and the others still run: each
 * listener is a connection, and one broken connection must neither cost the others their update
 * nor, thrown from a timer or a Redis callback, crash the instance.
 */
export function notifyListeners(listeners: Iterable<RoomListener>, room: StoredRoom): void {
  for (const listener of [...listeners]) {
    try {
      listener(room);
    } catch (error) {
      console.error("[realtime] room listener failed", error);
    }
  }
}
