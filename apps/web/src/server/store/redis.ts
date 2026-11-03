import { setTimeout as delay } from "node:timers/promises";

import type { RoomCode } from "@board-games/protocol";
import { type CommandParser, createClient, defineScript, type RESP_TYPES } from "redis";

import { TimeoutError, withTimeout } from "@/lib/with-timeout";

import { parseStoredRoom, type StoredRoom } from "../room";
import { addListener, notifyListeners, type RoomListener, type RoomStore } from "./room-store";

/** A room nobody changes for 7 days is deleted; every write starts the 7 days again. */
export const ROOM_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Deadlines missed in a row before a client counts as dead. A command written on a half-open TCP
 * connection is never answered, and node-redis waits for it forever: only a new client gets out.
 */
const TIMEOUTS_BEFORE_RESET = 2;

/** A PING goes out this often (free on Upstash), so a dead connection shows. */
const PING_INTERVAL_MS = 15_000;

/**
 * A connection with no traffic for this long is dropped and reconnected. An unanswered PING stops
 * the next ones, so a half-open connection (the subscriber, mostly, which sends nothing else)
 * goes quiet and ends here.
 */
const SOCKET_TIMEOUT_MS = 40_000;

/** Reads of a room after the channel reconnects, while the command client may still be offline. */
const RESYNC_ATTEMPTS = 5;

interface RedisTiming {
  /** A command (or connecting) slower than this fails, so a request never hangs. */
  readonly commandTimeoutMs: number;
  /** Wait between two reads of a room after the channel reconnects. */
  readonly resyncDelayMs: number;
}

const DEFAULT_TIMING: RedisTiming = { commandTimeoutMs: 5000, resyncDelayMs: 500 };

/**
 * node-redis types a script's reply through `transformReply`; here it is only a type (hence the
 * cast of `undefined`), as the scripts return a plain integer used as is. node-redis does not
 * export `NumberReply`, so it is picked out of the replies a `transformReply` may return.
 */
type AnyReply = ReturnType<
  Extract<Parameters<typeof defineScript>[0]["transformReply"], (...args: never[]) => unknown>
>;
type NumberReply = Extract<AnyReply, { RESP_TYPE: (typeof RESP_TYPES)["NUMBER"] }>;
const NUMBER_REPLY = undefined as unknown as () => NumberReply;

// Scripts run as one step on the server, so a write is checked, stored and announced at once.
// Upstash bills a script as 1 command plus 1 per `redis.call` (design §3, §8).

/** `1` created, `0` a room already has this code. */
const CREATE_ROOM = defineScript({
  NUMBER_OF_KEYS: 1,
  SCRIPT: `
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
redis.call('HSET', KEYS[1], 'rev', ARGV[1], 'data', ARGV[2])
redis.call('EXPIRE', KEYS[1], ARGV[3])
return 1`,
  parseCommand(this: void, parser: CommandParser, key: string, revision: number, data: string) {
    parser.pushKey(key);
    parser.push(String(revision), data, String(ROOM_TTL_SECONDS));
  },
  transformReply: NUMBER_REPLY,
});

/** `1` written and published on the room's channel, `0` another revision is stored, `-1` no room. */
const UPDATE_ROOM = defineScript({
  NUMBER_OF_KEYS: 1,
  SCRIPT: `
local rev = redis.call('HGET', KEYS[1], 'rev')
if not rev then return -1 end
if tonumber(rev) ~= tonumber(ARGV[1]) then return 0 end
redis.call('HSET', KEYS[1], 'rev', ARGV[2], 'data', ARGV[3])
redis.call('EXPIRE', KEYS[1], ARGV[4])
redis.call('PUBLISH', KEYS[1], ARGV[3])
return 1`,
  parseCommand(
    this: void,
    parser: CommandParser,
    key: string,
    expectedRevision: number,
    revision: number,
    data: string,
  ) {
    parser.pushKey(key);
    parser.push(String(expectedRevision), String(revision), data, String(ROOM_TTL_SECONDS));
  },
  transformReply: NUMBER_REPLY,
});

export type ClientRole = "commands" | "subscriber";

/** What the store uses of a node-redis client; tests pass a fake. */
export interface RedisConnection {
  readonly isOpen: boolean;
  connect(): Promise<unknown>;
  close(): Promise<unknown>;
  destroy(): void;
  /** `ready`: connected, or connected again (subscriptions renewed); `terminated`: gave up. */
  on(event: "ready" | "terminated", listener: () => void): unknown;
  hGet(key: string, field: string): Promise<string | null>;
  createRoom(key: string, revision: number, data: string): Promise<number>;
  updateRoom(
    key: string,
    expectedRevision: number,
    revision: number,
    data: string,
  ): Promise<number>;
  subscribe(channel: string, listener: (message: string) => void): Promise<unknown>;
  /** Without `listener`, every handler of the channel. */
  unsubscribe(channel: string, listener?: (message: string) => void): Promise<unknown>;
}

/**
 * Wait before the next reconnection attempt: 50 ms doubling up to 2 s, plus jitter. Always a
 * number: node-redis's default gives up for good after a socket timeout (`terminated`).
 */
export function reconnectDelay(retries: number): number {
  return Math.min(2 ** retries * 50, 2000) + Math.floor(Math.random() * 200);
}

function openNodeRedisClient(url: string, role: ClientRole, timing: RedisTiming): RedisConnection {
  return createClient({
    url,
    scripts: { createRoom: CREATE_ROOM, updateRoom: UPDATE_ROOM },
    // Fail at once while disconnected instead of queueing: the caller answers `unavailable`.
    disableOfflineQueue: true,
    // Only covers commands not written yet; `lazyClient().run` covers those waiting for a reply.
    commandOptions: { timeout: timing.commandTimeoutMs },
    pingInterval: PING_INTERVAL_MS,
    socket: {
      connectTimeout: timing.commandTimeoutMs,
      socketTimeout: SOCKET_TIMEOUT_MS,
      reconnectStrategy: reconnectDelay,
    },
  }).on("error", (error: unknown) => {
    // Without an error listener, Node treats a dropped connection as an uncaught error and
    // stops the whole process; the client reconnects by itself.
    console.error(`[realtime] redis ${role} error`, error);
  });
}

interface LazyClient {
  /** The client, connected; concurrent callers wait for the same connection. */
  get(this: void): Promise<RedisConnection>;
  /** The client if it has connected, without connecting one. */
  connected(this: void): RedisConnection | undefined;
  /**
   * `command` on `client`, failing with a `TimeoutError` past the deadline. After
   * `TIMEOUTS_BEFORE_RESET` deadlines missed in a row the client is dropped, so the next call
   * opens a new one.
   */
  run<T>(
    this: void,
    client: RedisConnection,
    command: (client: RedisConnection) => Promise<T>,
  ): Promise<T>;
  close(this: void): Promise<void>;
}

interface LazyClientOptions {
  readonly role: ClientRole;
  readonly open: () => RedisConnection;
  readonly timeoutMs: number;
  readonly onOpen?: (client: RedisConnection) => void;
  /** After a client that had connected was dropped as dead; its subscriptions went with it. */
  readonly onDropped?: () => void;
}

/**
 * One client per role, created on first use and shared by every connection of the instance. The
 * promise is kept so concurrent callers wait for the same connection, and dropped when it fails
 * so the next caller tries again.
 */
function lazyClient({ role, open, timeoutMs, onOpen, onDropped }: LazyClientOptions): LazyClient {
  let current:
    { readonly client: RedisConnection; readonly ready: Promise<RedisConnection> } | undefined;
  let hasConnected = false;
  let timeoutsInARow = 0;

  function drop(client: RedisConnection, dead: boolean): void {
    if (current?.client !== client) return;
    current = undefined;
    hasConnected = false;
    timeoutsInARow = 0;
    client.destroy();
    if (dead) onDropped?.();
  }

  return {
    get: () => {
      if (current !== undefined) return current.ready;
      const client = open();
      // Our reconnect strategy never gives up, but a client that did is useless: start over.
      client.on("terminated", () => {
        drop(client, hasConnected);
      });
      onOpen?.(client);
      const ready = withTimeout(
        () => client.connect(),
        timeoutMs,
        `No connection to Redis (${role}) in ${String(timeoutMs)} ms`,
      ).then(
        () => {
          if (current?.client === client) hasConnected = true;
          return client;
        },
        (error: unknown) => {
          drop(client, false);
          throw error;
        },
      );
      current = { client, ready };
      return ready;
    },
    connected: () => (current !== undefined && hasConnected ? current.client : undefined),
    run: async (client, command) => {
      try {
        const result = await withTimeout(
          () => command(client),
          timeoutMs,
          `No answer from Redis (${role}) in ${String(timeoutMs)} ms`,
        );
        if (current?.client === client) timeoutsInARow = 0;
        return result;
      } catch (error) {
        if (error instanceof TimeoutError && current?.client === client) {
          timeoutsInARow += 1;
          if (timeoutsInARow >= TIMEOUTS_BEFORE_RESET) drop(client, true);
        }
        throw error;
      }
    },
    close: async () => {
      const client = current?.client;
      current = undefined;
      if (client === undefined) return;
      if (!client.isOpen) {
        client.destroy();
        return;
      }
      // A graceful close waits for pending replies, which a dead connection never sends.
      await withTimeout(() => client.close(), timeoutMs, "close").catch(() => {
        client.destroy();
      });
    },
  };
}

export interface RedisRoomStoreOptions {
  readonly url: string;
  /** Keeps environments sharing one Redis apart: `production:`, `preview:`, `dev:`. */
  readonly keyPrefix: string;
  /** For tests: opens a client in place of node-redis. */
  readonly openClient?: (role: ClientRole) => RedisConnection;
  /** For tests: shorter waits. */
  readonly timing?: Partial<RedisTiming>;
}

/** The HASH of a room, and the channel its writes are published on. */
export function roomKey(keyPrefix: string, code: RoomCode): string {
  return `${keyPrefix}room:${code}`;
}

/** Listeners of one room on this instance, behind a single subscription to its channel. */
interface Channel {
  readonly code: RoomCode;
  readonly name: string;
  readonly listeners: Set<RoomListener>;
  /** The handler registered with the client, needed to unsubscribe exactly it. */
  readonly onMessage: (message: string) => void;
  /** The subscription on the current subscriber client. */
  subscribed: Promise<void>;
  /** The last subscription failed; the next listener of the room tries again. */
  failed: boolean;
}

/** A handler node-redis may still hold after its UNSUBSCRIBE failed. */
type StaleHandler = Pick<Channel, "code" | "name" | "onMessage">;

/**
 * Rooms in Redis: a HASH `<prefix>room:<CODE>` holding `rev` and `data` (the room's JSON), with a
 * 7-day expiry renewed on every write; each write is published on a channel of the same name.
 */
export function createRedisRoomStore({
  url,
  keyPrefix,
  openClient,
  timing: customTiming,
}: RedisRoomStoreOptions): RoomStore {
  const timing = { ...DEFAULT_TIMING, ...customTiming };
  const open = openClient ?? ((role: ClientRole) => openNodeRedisClient(url, role, timing));
  const channels = new Map<RoomCode, Channel>();
  /**
   * node-redis keeps a handler whose UNSUBSCRIBE failed (the connection dropped) and subscribes
   * it again when it reconnects: unsubscribed again once the subscriber is ready.
   */
  let staleHandlers: StaleHandler[] = [];

  const commands = lazyClient({
    role: "commands",
    open: () => open("commands"),
    timeoutMs: timing.commandTimeoutMs,
  });
  const subscriber = lazyClient({
    role: "subscriber",
    open: () => open("subscriber"),
    timeoutMs: timing.commandTimeoutMs,
    onOpen: (client) => {
      let connectedBefore = false;
      client.on("ready", () => {
        if (connectedBefore) onChannelsBack(client);
        connectedBefore = true;
      });
    },
    onDropped: () => {
      staleHandlers = [];
      for (const channel of channels.values()) listen(channel, { readAfter: true });
    },
  });

  async function command<T>(run: (client: RedisConnection) => Promise<T>): Promise<T> {
    return commands.run(await commands.get(), run);
  }

  async function get(code: RoomCode): Promise<StoredRoom | null> {
    const json = await command((client) => client.hGet(roomKey(keyPrefix, code), "data"));
    return json === null ? null : parseStoredRoom(json);
  }

  const isListened = (channel: Channel) => channels.get(channel.code) === channel;

  /**
   * Reads the room again for its listeners, since messages may have been lost. The command
   * client may be reconnecting too (offline: it fails at once), so a failed read is tried again
   * a few times, as long as the room still has listeners.
   */
  async function readAgain(channel: Channel): Promise<void> {
    for (let attempt = 1; isListened(channel); attempt += 1) {
      try {
        const room = await get(channel.code);
        if (room !== null && isListened(channel)) notifyListeners(channel.listeners, room);
        return;
      } catch (error) {
        if (attempt >= RESYNC_ATTEMPTS) {
          console.error(`[realtime] could not read room ${channel.code} again`, error);
          return;
        }
        await delay(timing.resyncDelayMs);
      }
    }
  }

  /** The subscriber is ready again after losing its connection. */
  function onChannelsBack(client: RedisConnection): void {
    // node-redis subscribed to every channel again before `ready`, but whatever was published
    // while it was away is lost: read those rooms once more.
    for (const channel of channels.values()) void readAgain(channel);
    for (const handler of staleHandlers.splice(0)) void unsubscribe(client, handler);
  }

  /** Subscribes `channel` on the subscriber client, opening one if needed. */
  function listen(channel: Channel, { readAfter }: { readonly readAfter: boolean }): void {
    channel.failed = false;
    const attempt = subscriber
      .get()
      .then((client) =>
        subscriber.run(client, (current) => current.subscribe(channel.name, channel.onMessage)),
      )
      .then(() => undefined);
    channel.subscribed = attempt;
    attempt.then(
      () => {
        if (readAfter) void readAgain(channel);
      },
      (error: unknown) => {
        if (channel.subscribed === attempt) channel.failed = true;
        console.error(`[realtime] could not listen to room ${channel.code}`, error);
      },
    );
  }

  function openChannel(code: RoomCode): Channel {
    const channel: Channel = {
      code,
      name: roomKey(keyPrefix, code),
      listeners: new Set(),
      onMessage: (message) => {
        const room = parseStoredRoom(message);
        if (room !== null) notifyListeners(channel.listeners, room);
      },
      subscribed: Promise.resolve(),
      failed: false,
    };
    channels.set(code, channel);
    listen(channel, { readAfter: false });
    return channel;
  }

  async function unsubscribe(client: RedisConnection, handler: StaleHandler): Promise<void> {
    try {
      await subscriber.run(client, (current) =>
        // Listened to again meanwhile: only this handler goes, the new one stays.
        channels.has(handler.code)
          ? current.unsubscribe(handler.name, handler.onMessage)
          : current.unsubscribe(handler.name),
      );
    } catch {
      // Still subscribed in node-redis, which renews it on reconnect. Not worth it once the
      // client was dropped: its subscriptions went with it.
      if (subscriber.connected() === client) staleHandlers.push(handler);
    }
  }

  function closeChannel(channel: Channel): void {
    if (!isListened(channel)) return;
    channels.delete(channel.code);
    channel.subscribed.then(
      () => {
        const client = subscriber.connected();
        if (client !== undefined) void unsubscribe(client, channel);
      },
      () => {
        // Never subscribed: nothing to undo.
      },
    );
  }

  return {
    create: async (room) => {
      const created = await command((client) =>
        client.createRoom(roomKey(keyPrefix, room.code), room.revision, JSON.stringify(room)),
      );
      return created === 1 ? "created" : "exists";
    },
    get,
    update: async (code, expectedRevision, next) => {
      const result = await command((client) =>
        client.updateRoom(
          roomKey(keyPrefix, code),
          expectedRevision,
          next.revision,
          JSON.stringify(next),
        ),
      );
      return result === 1 ? "updated" : result === 0 ? "conflict" : "missing";
    },
    subscribe: async (code, listener) => {
      const channel = channels.get(code) ?? openChannel(code);
      if (channel.failed) listen(channel, { readAfter: true });
      const remove = addListener(channel.listeners, listener);
      const stop = () => {
        remove();
        if (channel.listeners.size === 0) closeChannel(channel);
      };
      try {
        await channel.subscribed;
      } catch (error) {
        stop();
        throw error;
      }
      return stop;
    },
    close: async () => {
      channels.clear();
      staleHandlers = [];
      await Promise.all([commands.close(), subscriber.close()]);
    },
  };
}
