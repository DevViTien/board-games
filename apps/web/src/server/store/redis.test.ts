import net from "node:net";
import tls from "node:tls";

import { createRng } from "@board-games/engine";
import { tictactoe } from "@board-games/games";
import type { RoomCode } from "@board-games/protocol";
import { createClient } from "redis";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { TimeoutError } from "@/lib/with-timeout";

import type { StoredRoom } from "../room";
import { createRoomService } from "../room-service";
import { createFakeRedis, type FakeRedis } from "./fake-redis";
import { createRedisRoomStore, reconnectDelay, ROOM_TTL_SECONDS, roomKey } from "./redis";
import { describeRoomStore, nextRevision, testRoom } from "./room-store-contract";

// The real-Redis part runs only against a real Redis (Upstash in practice):
// `REDIS_URL_TEST=rediss://… pnpm --filter @board-games/web test`. Every key lives under a prefix
// of its own and is deleted afterwards. The rest runs everywhere, on fake clients.
const url = process.env.REDIS_URL_TEST;
const RUN_PREFIX = `test:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}:`;

beforeAll(() => {
  if (url === undefined) console.info("REDIS_URL_TEST is not set: real Redis tests skipped");
});

afterAll(async () => {
  if (url === undefined) return;
  await deleteKeys(RUN_PREFIX);
  await (await adminClient()).close();
});

// --- on fake clients --------------------------------------------------------------------------

const FAKE_PREFIX = "fake:";

/** Short waits, so a test never sits through the real 5 s deadline. */
const FAKE_TIMING = { commandTimeoutMs: 50, resyncDelayMs: 20 };

function openFake(redis: FakeRedis) {
  return createRedisRoomStore({
    url: "",
    keyPrefix: FAKE_PREFIX,
    openClient: redis.open,
    timing: FAKE_TIMING,
  });
}

describeRoomStore("redis store on fake clients", () => {
  const redis = createFakeRedis();
  const store = openFake(redis);
  return Promise.resolve({
    store,
    writeRaw: (code, revision, json) => {
      redis.writeRaw(roomKey(FAKE_PREFIX, code), revision, json);
      return Promise.resolve();
    },
    cleanup: () => store.close(),
  });
});

describe("redis store recovery (fake clients)", () => {
  /** A store with a room and one listener, and a second store (another instance) to write. */
  async function listening() {
    const redis = createFakeRedis();
    const store = openFake(redis);
    const room = testRoom();
    await store.create(room);
    const received: StoredRoom[] = [];
    const stop = await store.subscribe(room.code, (written) => received.push(written));
    const commands = redis.latest("commands");
    const subscriber = redis.latest("subscriber");
    const writer = openFake(redis);
    return { redis, store, writer, room, received, stop, commands, subscriber };
  }

  it("sends one SUBSCRIBE for listeners arriving together, and UNSUBSCRIBE after the last", async () => {
    const redis = createFakeRedis();
    const store = openFake(redis);
    const room = testRoom();
    const channel = roomKey(FAKE_PREFIX, room.code);

    const [first, second] = await Promise.all([
      store.subscribe(room.code, vi.fn()),
      store.subscribe(room.code, vi.fn()),
    ]);
    const subscriber = redis.latest("subscriber");
    expect(subscriber.sent).toBe(1);

    first();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(subscriber.sent).toBe(1);
    second();
    await vi.waitFor(() => {
      expect(subscriber.subscriptions.has(channel)).toBe(false);
    });
    expect(subscriber.sent).toBe(2);
  });

  it("reads the room again once the channel is back, while commands are still offline", async () => {
    const { writer, room, received, commands, subscriber } = await listening();
    commands.goOffline();
    subscriber.goOffline();
    // Written by another instance while this one is away: the message is lost.
    await writer.update(room.code, 1, nextRevision(room));
    const sentBefore = commands.sent;

    subscriber.comeBack();
    await vi.waitFor(() => {
      expect(commands.sent).toBeGreaterThan(sentBefore);
    });
    commands.comeBack();

    await vi.waitFor(() => {
      expect(received).toEqual([nextRevision(room)]);
    });
  });

  it("stops reading a room again once nobody listens to it", async () => {
    const { writer, room, received, stop, commands, subscriber } = await listening();
    commands.goOffline();
    subscriber.goOffline();
    await writer.update(room.code, 1, nextRevision(room));

    subscriber.comeBack();
    await vi.waitFor(() => {
      expect(commands.sent).toBeGreaterThan(0);
    });
    stop();
    const sentAfterStop = commands.sent;
    await new Promise((resolve) => setTimeout(resolve, FAKE_TIMING.resyncDelayMs * 4));

    expect(commands.sent).toBeLessThanOrEqual(sentAfterStop + 1);
    expect(received).toEqual([]);
  });

  it("opens a new command client after deadlines missed in a row", async () => {
    const { redis, store, room, commands } = await listening();
    commands.hang();

    await expect(store.get(room.code)).rejects.toThrow(TimeoutError);
    expect(commands.destroyed).toBe(false);
    await expect(store.get(room.code)).rejects.toThrow(TimeoutError);
    expect(commands.destroyed).toBe(true);

    expect(await store.get(room.code)).toEqual(room);
    expect(redis.latest("commands")).not.toBe(commands);
  });

  it("opens a new command client once node-redis gave up reconnecting", async () => {
    const { redis, store, room, commands } = await listening();

    commands.terminate();

    expect(await store.get(room.code)).toEqual(room);
    expect(redis.latest("commands")).not.toBe(commands);
  });

  it("listens again on a new subscriber once the old one gave up, and reads the room", async () => {
    const { redis, writer, room, received, subscriber } = await listening();
    subscriber.goOffline();
    await writer.update(room.code, 1, nextRevision(room));

    subscriber.terminate();

    await vi.waitFor(() => {
      expect(received).toEqual([nextRevision(room)]);
    });
    expect(redis.latest("subscriber")).not.toBe(subscriber);
    await writer.update(room.code, 2, nextRevision(nextRevision(room)));
    await vi.waitFor(() => {
      expect(received.at(-1)).toEqual(nextRevision(nextRevision(room)));
    });
  });

  it("unsubscribes again once the channel is back when UNSUBSCRIBE failed", async () => {
    const { room, stop, subscriber } = await listening();
    const channel = roomKey(FAKE_PREFIX, room.code);
    subscriber.failUnsubscribe(true);

    stop();
    await vi.waitFor(() => {
      expect(subscriber.sent).toBe(2);
    });
    expect(subscriber.subscriptions.has(channel)).toBe(true);

    subscriber.failUnsubscribe(false);
    subscriber.goOffline();
    subscriber.comeBack();

    await vi.waitFor(() => {
      expect(subscriber.subscriptions.has(channel)).toBe(false);
    });
  });

  it("keeps only the new handler when the room is listened to again before the retry", async () => {
    const { store, room, stop, subscriber } = await listening();
    const channel = roomKey(FAKE_PREFIX, room.code);
    subscriber.failUnsubscribe(true);
    stop();
    await vi.waitFor(() => {
      expect(subscriber.sent).toBe(2);
    });
    subscriber.failUnsubscribe(false);
    await store.subscribe(room.code, vi.fn());
    expect(subscriber.subscriptions.get(channel)?.size).toBe(2);

    subscriber.goOffline();
    subscriber.comeBack();

    await vi.waitFor(() => {
      expect(subscriber.subscriptions.get(channel)?.size).toBe(1);
    });
  });

  it("always reconnects, after a socket timeout too", () => {
    for (let retries = 0; retries < 30; retries += 1) {
      const delay = reconnectDelay(retries);
      expect(delay).toBeGreaterThanOrEqual(Math.min(2 ** retries * 50, 2000));
      expect(delay).toBeLessThan(2200);
    }
  });
});

// --- on a real Redis --------------------------------------------------------------------------

function connectAdmin(redisUrl: string) {
  return createClient({ url: redisUrl }).on("error", () => undefined);
}

let admin: Promise<ReturnType<typeof connectAdmin>> | undefined;

/** A plain client for what the store does not offer: raw writes, TTL, cleanup. */
function adminClient(): Promise<ReturnType<typeof connectAdmin>> {
  if (url === undefined) throw new Error("REDIS_URL_TEST is not set");
  admin ??= connectAdmin(url).connect();
  return admin;
}

async function deleteKeys(prefix: string): Promise<void> {
  const client = await adminClient();
  for await (const keys of client.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 })) {
    if (keys.length > 0) await client.del(keys);
  }
}

describeRoomStore(
  "redis store",
  () => {
    const store = createRedisRoomStore({ url: url ?? "", keyPrefix: RUN_PREFIX });
    return Promise.resolve({
      store,
      writeRaw: async (code: RoomCode, revision: number, json: string) => {
        const client = await adminClient();
        await client.hSet(roomKey(RUN_PREFIX, code), { rev: String(revision), data: json });
      },
      cleanup: () => store.close(),
    });
  },
  { skip: url === undefined },
);

describe.skipIf(url === undefined)("redis store", () => {
  const stores: ReturnType<typeof createRedisRoomStore>[] = [];
  const open = (keyPrefix = RUN_PREFIX) => {
    const store = createRedisRoomStore({ url: url ?? "", keyPrefix });
    stores.push(store);
    return store;
  };

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(stores.splice(0).map((store) => store.close()));
  });

  it("gives a room 7 days to live from each write", async () => {
    const store = open();
    const room = testRoom();
    await store.create(room);
    const client = await adminClient();
    // Shorten the expiry, so the write below visibly starts the 7 days again.
    await client.expire(roomKey(RUN_PREFIX, room.code), 60);

    await store.update(room.code, 1, nextRevision(room));

    const ttl = await client.ttl(roomKey(RUN_PREFIX, room.code));
    expect(ttl).toBeGreaterThan(ROOM_TTL_SECONDS - 60);
    expect(ttl).toBeLessThanOrEqual(ROOM_TTL_SECONDS);
  });

  it("Tin gia hạn phòng: gives a room 7 days to live from a chat message too", async () => {
    const store = open();
    const service = createRoomService({
      store,
      rng: createRng(1),
      now: Date.now,
      games: [tictactoe],
    });
    const room = testRoom();
    await store.create(room);
    const client = await adminClient();
    await client.expire(roomKey(RUN_PREFIX, room.code), 60);

    const sent = await service.chat(room.code, "player-one-0123456789", {
      id: "chat-0123",
      body: { kind: "text", text: "chào" },
    });

    expect(sent.ok).toBe(true);
    const ttl = await client.ttl(roomKey(RUN_PREFIX, room.code));
    expect(ttl).toBeGreaterThan(ROOM_TTL_SECONDS - 60);
    expect(ttl).toBeLessThanOrEqual(ROOM_TTL_SECONDS);
  });

  it("keeps the rooms of two environments apart", async () => {
    const preview = open(`${RUN_PREFIX}preview:`);
    const production = open(`${RUN_PREFIX}production:`);
    const room = testRoom();

    await preview.create(room);

    expect(await production.get(room.code)).toBeNull();
    expect(await production.create(room)).toBe("created");
  });

  // How many SUBSCRIBE/UNSUBSCRIBE go out is checked on fake clients: Upstash's PUBSUB NUMSUB
  // lags the SUBSCRIBE reply (~50 ms, at times several seconds, even with a plain client).
  it("keeps telling the listener that stays on a shared channel, and nobody after the last", async () => {
    const store = open();
    const writer = open();
    const room = testRoom();
    await store.create(room);
    const leaving = vi.fn();
    const staying = vi.fn();
    // Another instance's listener: once it has a write, this instance has had its chance too.
    const fence = vi.fn();
    const [first, second] = await Promise.all([
      store.subscribe(room.code, leaving),
      store.subscribe(room.code, staying),
    ]);
    await writer.subscribe(room.code, fence);

    first();
    await writer.update(room.code, 1, nextRevision(room));
    await vi.waitFor(() => {
      expect(staying).toHaveBeenCalledWith(nextRevision(room));
      expect(fence).toHaveBeenCalledTimes(1);
    });
    second();
    await writer.update(room.code, 2, nextRevision(nextRevision(room)));
    await vi.waitFor(() => {
      expect(fence).toHaveBeenCalledTimes(2);
    });

    expect(leaving).not.toHaveBeenCalled();
    expect(staying).toHaveBeenCalledTimes(1);
  });

  it("reads the room again for its listeners after the channel reconnects", async () => {
    const store = open();
    const writer = open();
    const room = testRoom();
    await store.create(room);
    // Opens the command connections first: the next socket opened is the subscriber's, and the
    // write below is not delayed by connecting.
    await store.get(room.code);
    await writer.get(room.code);
    const sockets: net.Socket[] = [];
    const record =
      <S extends net.Socket>(connect: (...args: unknown[]) => S) =>
      (...args: unknown[]): S => {
        const socket = connect(...args);
        sockets.push(socket);
        return socket;
      };
    // Taken before spying: `vi.spyOn(…)` runs before its argument is evaluated.
    const tlsConnect = tls.connect.bind(tls) as (...args: unknown[]) => tls.TLSSocket;
    const netConnect = net.createConnection.bind(net) as (...args: unknown[]) => net.Socket;
    vi.spyOn(tls, "connect").mockImplementation(record(tlsConnect));
    vi.spyOn(net, "createConnection").mockImplementation(record(netConnect));
    const received: StoredRoom[] = [];
    await store.subscribe(room.code, (written) => received.push(written));
    const subscriberSocket = sockets[0];
    if (subscriberSocket === undefined) throw new Error("The subscriber opened no socket");
    vi.restoreAllMocks();

    // Upstash has no CLIENT KILL: drop the subscriber's connection from this side instead, and
    // write while it is away, so the published message is lost.
    subscriberSocket.destroy();
    await writer.update(room.code, 1, nextRevision(room));

    await vi.waitFor(
      () => {
        expect(received.at(-1)).toEqual(nextRevision(room));
      },
      { timeout: 5000 },
    );
  });
});
