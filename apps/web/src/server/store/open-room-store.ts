import type { RoomStoreConfig } from "../env";
import { createMemoryRoomStore } from "./memory";
import { createRedisRoomStore } from "./redis";
import type { RoomStore } from "./room-store";

let shared: RoomStore | undefined;

/**
 * The store of this process, created on first use and shared by every connection, so an
 * instance holds one Redis connection for commands and one for its subscriptions.
 */
export function openRoomStore(config: RoomStoreConfig): RoomStore {
  shared ??= config.kind === "redis" ? createRedisRoomStore(config) : createMemoryRoomStore();
  return shared;
}
