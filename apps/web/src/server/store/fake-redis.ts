// Test-only: node-redis clients faked in memory, sharing one fake server, to drive the Redis store
// through connections that drop, hang, come back or give up, without a Redis server.
import type { ClientRole, RedisConnection } from "./redis";

type Handler = (message: string) => void;

interface FakeRedisClient extends RedisConnection {
  readonly role: ClientRole;
  readonly destroyed: boolean;
  /** What node-redis keeps per channel, and subscribes again on reconnect. */
  readonly subscriptions: ReadonlyMap<string, ReadonlySet<Handler>>;
  /** How many commands were sent, failed ones included. */
  readonly sent: number;
  /** Every command now fails at once, like node-redis offline with `disableOfflineQueue`. */
  goOffline(this: void): void;
  /** Connected again: subscriptions renewed, then `ready`. Messages sent meanwhile are lost. */
  comeBack(this: void): void;
  /** Every command now goes unanswered, like on a half-open TCP connection. */
  hang(this: void): void;
  /** UNSUBSCRIBE now fails, like when the socket has just dropped. */
  failUnsubscribe(this: void, fail: boolean): void;
  /** node-redis gave up reconnecting. */
  terminate(this: void): void;
}

export interface FakeRedis {
  readonly open: (role: ClientRole) => FakeRedisClient;
  /** The client of `role` opened last. */
  latest(this: void, role: ClientRole): FakeRedisClient;
  /** Stores a HASH as is, like another version would. */
  writeRaw(this: void, key: string, revision: number, data: string): void;
}

export function createFakeRedis(): FakeRedis {
  const hashes = new Map<string, { readonly rev: number; readonly data: string }>();
  /** Each client, and whether it receives messages now (open and online). */
  const clients: { readonly client: FakeRedisClient; readonly receiving: () => boolean }[] = [];

  function publish(channel: string, message: string): void {
    for (const { client, receiving } of clients) {
      // Nothing reaches a client while it is offline: what is published meanwhile is lost.
      if (!receiving()) continue;
      for (const handler of [...(client.subscriptions.get(channel) ?? [])]) {
        queueMicrotask(() => {
          handler(message);
        });
      }
    }
  }

  function open(role: ClientRole): FakeRedisClient {
    let isOpen = false;
    let ready = false;
    let hanging = false;
    let unsubscribeFails = false;
    let destroyed = false;
    let sent = 0;
    const subscriptions = new Map<string, Set<Handler>>();
    const events = new Map<string, (() => void)[]>();
    const emit = (event: string) => {
      for (const listener of events.get(event) ?? []) listener();
    };

    function call<T>(action: () => T): Promise<T> {
      sent += 1;
      if (!isOpen) return Promise.reject(new Error("The client is closed"));
      if (hanging) return new Promise<never>(() => undefined);
      if (!ready) return Promise.reject(new Error("The client is offline"));
      return Promise.resolve().then(action);
    }

    function shutDown(): void {
      isOpen = false;
      ready = false;
      destroyed = true;
    }

    const client: FakeRedisClient = {
      role,
      get isOpen() {
        return isOpen;
      },
      get destroyed() {
        return destroyed;
      },
      get sent() {
        return sent;
      },
      subscriptions,
      connect: () => {
        isOpen = true;
        ready = true;
        emit("ready");
        return Promise.resolve(client);
      },
      close: () => {
        shutDown();
        return Promise.resolve();
      },
      destroy: shutDown,
      on: (event, listener) => {
        events.set(event, [...(events.get(event) ?? []), listener]);
        return client;
      },
      hGet: (key, field) =>
        call(() => {
          const hash = hashes.get(key);
          return hash === undefined ? null : field === "rev" ? String(hash.rev) : hash.data;
        }),
      createRoom: (key, revision, data) =>
        call(() => {
          if (hashes.has(key)) return 0;
          hashes.set(key, { rev: revision, data });
          return 1;
        }),
      updateRoom: (key, expectedRevision, revision, data) =>
        call(() => {
          const hash = hashes.get(key);
          if (hash === undefined) return -1;
          if (hash.rev !== expectedRevision) return 0;
          hashes.set(key, { rev: revision, data });
          publish(key, data);
          return 1;
        }),
      subscribe: (channel, handler) =>
        call(() => {
          const handlers = subscriptions.get(channel) ?? new Set();
          handlers.add(handler);
          subscriptions.set(channel, handlers);
        }),
      unsubscribe: (channel, handler) => {
        if (unsubscribeFails) {
          sent += 1;
          return Promise.reject(new Error("The socket closed unexpectedly"));
        }
        return call(() => {
          const handlers = subscriptions.get(channel);
          if (handler !== undefined) handlers?.delete(handler);
          if (handler === undefined || handlers?.size === 0) subscriptions.delete(channel);
        });
      },
      goOffline: () => {
        ready = false;
      },
      comeBack: () => {
        ready = true;
        emit("ready");
      },
      hang: () => {
        hanging = true;
      },
      failUnsubscribe: (fail) => {
        unsubscribeFails = fail;
      },
      terminate: () => {
        isOpen = false;
        ready = false;
        emit("terminated");
      },
    };
    clients.push({ client, receiving: () => isOpen && ready });
    return client;
  }

  return {
    open,
    latest: (role) => {
      const found = clients.findLast(({ client }) => client.role === role);
      if (found === undefined) throw new Error(`No ${role} client opened`);
      return found.client;
    },
    writeRaw: (key, revision, data) => {
      hashes.set(key, { rev: revision, data });
    },
  };
}
