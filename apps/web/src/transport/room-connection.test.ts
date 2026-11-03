import { PROTOCOL_VERSION } from "@board-games/protocol";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createFakeEnvironment,
  createFakeSockets,
  type FakeEnvironment,
  type FakeSockets,
  isPing,
  ROOM_CODE,
  roomMessage,
  roomView,
} from "@/test/fake-realtime";

import { createRoomConnection, type RoomConnection } from "./room-connection";

const URL = "ws://localhost:3001/api/realtime";
const IDENTITY = { playerId: "player-0123456789abcdef", name: "Minh" };

let sockets: FakeSockets;
let environment: FakeEnvironment;
let random: () => number;
let identity: { playerId: string; name: string };
let connection: RoomConnection;

function connect() {
  connection = createRoomConnection({
    url: URL,
    code: ROOM_CODE,
    getIdentity: () => identity,
    openSocket: sockets.openSocket,
    environment,
    random: () => random(),
  });
  return connection;
}

const status = () => connection.getSnapshot().status;
const wait = (ms: number) => vi.advanceTimersByTimeAsync(ms);

/** Opens the last socket and answers its greeting with `room`. */
function enter(room = roomView(), you: number | null = 0) {
  const socket = sockets.last();
  socket.open();
  socket.receive(roomMessage(room, you));
  return socket;
}

beforeEach(() => {
  vi.useFakeTimers();
  sockets = createFakeSockets();
  environment = createFakeEnvironment();
  random = () => 0.999;
  identity = IDENTITY;
});

afterEach(() => {
  connection.dispose();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("room connection: joining", () => {
  it("greets the server with the identity once the socket opens", () => {
    connect();
    expect(status()).toBe("connecting");
    expect(sockets.last().url).toBe(URL);

    sockets.last().open();

    expect(sockets.last().sent).toEqual([
      { type: "join", protocol: PROTOCOL_VERSION, code: ROOM_CODE, ...IDENTITY },
    ]);
  });

  it("greets with the name remembered at each greeting, not the one it started with", async () => {
    connect();
    enter(roomView({ seats: ["Minh", null] }), null);
    // The player renamed themselves in the lobby and sat down; Vercel then cuts the connection.
    identity = { ...IDENTITY, name: "Minh Anh" };
    connection.send({ type: "sit", name: "Minh Anh" });
    sockets.last().receive(roomMessage(roomView({ revision: 2, seats: ["Minh", "Minh Anh"] }), 1));

    sockets.last().lose();
    await wait(0);
    sockets.last().open();

    expect(sockets.last().sent[0]).toMatchObject({ type: "join", name: "Minh Anh" });
  });

  it("is online with the room and the seat of the first answer", () => {
    connect();
    const room = roomView({ seats: ["Minh", "Lan"] });

    enter(room, 1);

    expect(connection.getSnapshot()).toMatchObject({ status: "online", room, you: 1 });
  });

  it("keeps only rooms newer than the one it has", () => {
    connect();
    const socket = enter(roomView({ revision: 3 }));
    const listener = vi.fn();
    connection.subscribe(listener);

    socket.receive(roomMessage(roomView({ revision: 2, cells: [4] }), 0));
    socket.receive(roomMessage(roomView({ revision: 3, cells: [4] }), 0));
    expect(connection.getSnapshot().room?.revision).toBe(3);
    expect(connection.getSnapshot().room?.record.entries).toEqual([]);
    expect(listener).not.toHaveBeenCalled();

    socket.receive(roomMessage(roomView({ revision: 4, cells: [4] }), 0));
    expect(connection.getSnapshot().room?.record.entries).toHaveLength(1);
  });

  it("takes the first room after each greeting, even with the same or a lower revision", async () => {
    connect();
    enter(roomView({ revision: 5, cells: [4] }));
    const synced = vi.fn();
    connection.onSynced(synced);

    sockets.last().lose();
    await wait(0);
    enter(roomView({ revision: 2 }));

    expect(status()).toBe("online");
    expect(connection.getSnapshot().room?.revision).toBe(2);
    expect(synced).toHaveBeenCalledOnce();
  });

  it("ignores a message that is not part of the protocol, with a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    connect();
    const socket = enter();

    socket.receive("{not json");
    socket.receive(JSON.stringify({ type: "room", room: { code: "nope" }, you: 0 }));

    expect(status()).toBe("online");
    expect(connection.getSnapshot().room).toEqual(roomView());
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("sends requests only while online", () => {
    connect();
    expect(connection.send({ type: "sit", name: "Minh" })).toBe(false);
    const socket = enter();

    expect(connection.send({ type: "sit", name: "Minh" })).toBe(true);

    expect(socket.sent.at(-1)).toEqual({ type: "sit", name: "Minh" });
  });

  it("passes a rejection on to its listeners", () => {
    connect();
    const socket = enter();
    const rejected = vi.fn();
    connection.onRejected(rejected);

    socket.receive({ type: "rejected", request: "move", code: "not-your-turn" });

    expect(rejected).toHaveBeenCalledWith({ request: "move", code: "not-your-turn" });
    expect(status()).toBe("online");
  });

  it("sends the host's request for an AI seat", () => {
    connect();
    const socket = enter();

    expect(connection.send({ type: "ai-seat", seat: 2, on: true })).toBe(true);

    expect(socket.sent.at(-1)).toEqual({ type: "ai-seat", seat: 2, on: true });
  });

  it.each(["invalid-seat", "not-ai-seat", "seat-taken", "not-host", "game-started"] as const)(
    "stays connected when an AI seat is refused with %s",
    async (code) => {
      connect();
      const socket = enter();
      const rejected = vi.fn();
      connection.onRejected(rejected);

      socket.receive({ type: "rejected", request: "ai-seat", code });
      await wait(60_000);

      expect(rejected).toHaveBeenCalledWith({ request: "ai-seat", code });
      expect(status()).toBe("online");
      expect(socket.closedByClient).toBe(false);
      expect(sockets.all).toHaveLength(1);
    },
  );

  it("tells listeners nothing after it is disposed, and closes the socket", () => {
    connect();
    const socket = enter();
    const listener = vi.fn();
    connection.subscribe(listener);

    connection.dispose();
    socket.receive(roomMessage(roomView({ revision: 9 }), 0));

    expect(socket.closedByClient).toBe(true);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("room connection: reconnecting", () => {
  /** Expects the next retry exactly `ms` after now, and loses that connection too. */
  async function expectRetryAfter(ms: number) {
    const opened = sockets.all.length;
    if (ms > 0) {
      await wait(ms - 1);
      expect(sockets.all, `not before ${String(ms)} ms`).toHaveLength(opened);
    }
    await wait(ms > 0 ? 1 : 0);
    expect(sockets.all, `at ${String(ms)} ms`).toHaveLength(opened + 1);
    sockets.last().lose();
  }

  it.each([1006, 4000])(
    "reconnects after close code %i, waiting 0, 1, 2, 4, 8 then 10 s at most",
    async (code) => {
      random = () => 0;
      connect();
      enter();

      sockets.last().lose(code);

      expect(status()).toBe("reconnecting");
      // Each wait is the nominal one shortened by the random factor, here its lowest: 0.8.
      for (const ms of [0, 800, 1600, 3200, 6400, 8000, 8000]) await expectRetryAfter(ms);
    },
  );

  it("never waits longer than the nominal delay, 10 s at most", async () => {
    random = () => 0.999_999;
    connect();
    enter();
    sockets.last().lose();

    for (const nominal of [0, 1000, 2000, 4000, 8000, 10_000, 10_000]) {
      const opened = sockets.all.length;
      const before = Math.max(0, nominal * 0.8 - 1);
      await wait(before);
      if (nominal > 0) expect(sockets.all).toHaveLength(opened);
      await wait(nominal - before);
      expect(sockets.all).toHaveLength(opened + 1);
      sockets.last().lose();
    }
  });

  it("starts the delays over once back in the room for 30 s", async () => {
    random = () => 0;
    connect();
    enter();
    sockets.last().lose();
    for (const ms of [0, 800, 1600]) await expectRetryAfter(ms);
    await wait(3200);

    enter();
    await wait(30_000);
    sockets.last().lose();

    await expectRetryAfter(0);
  });

  it("keeps the delays growing when the server closes every connection right after the greeting", async () => {
    random = () => 0;
    connect();
    enter();
    sockets.last().lose();

    for (const ms of [0, 800, 1600, 3200, 6400, 8000]) {
      const opened = sockets.all.length;
      if (ms > 0) {
        await wait(ms - 1);
        expect(sockets.all, `not before ${String(ms)} ms`).toHaveLength(opened);
      }
      await wait(ms > 0 ? 1 : 0);
      expect(sockets.all, `at ${String(ms)} ms`).toHaveLength(opened + 1);
      // In the room, then cut at once.
      enter();
      sockets.last().lose();
    }
  });

  it.each([
    ["an error", { type: "error", code: "unavailable" }],
    ["an error", { type: "error", code: "too-many-messages" }],
    ["a rejection", { type: "rejected", request: null, code: "invalid-message" }],
  ] as const)(
    "reconnects after %s %j without starting the delays over until online for 30 s",
    async (_kind, message) => {
      random = () => 0;
      connect();
      enter();
      sockets.last().receive(message);
      expect(status()).toBe("reconnecting");
      await wait(0);
      expect(sockets.all).toHaveLength(2);

      // Back in the room, then lost again within 30 s: the next try waits.
      enter();
      sockets.last().lose();
      await wait(799);
      expect(sockets.all).toHaveLength(2);
      await wait(1);
      expect(sockets.all).toHaveLength(3);

      // Online for 30 s: the next loss is retried at once.
      enter();
      await wait(30_000);
      sockets.last().lose();
      await wait(0);
      expect(sockets.all).toHaveLength(4);
    },
  );

  it.each(["room-not-found", "outdated-client"] as const)(
    "gives up on error %s, without reconnecting",
    async (code) => {
      connect();
      sockets.last().open();

      sockets.last().receive({ type: "error", code });
      sockets.last().lose(1000);
      await wait(60_000);

      expect(connection.getSnapshot()).toMatchObject({ status: "failed", failure: code });
      expect(sockets.all).toHaveLength(1);
    },
  );

  it("gives up when the room expires while the player is in it", async () => {
    connect();
    enter();

    sockets.last().receive({ type: "error", code: "room-not-found" });
    await wait(60_000);

    expect(connection.getSnapshot()).toMatchObject({ status: "failed", failure: "room-not-found" });
    expect(sockets.all).toHaveLength(1);
  });

  it("gives up and closes when every seat is taken by others and the player has none", async () => {
    connect();
    const socket = enter(roomView({ seats: ["Minh", "Lan"] }), null);
    await wait(60_000);

    expect(connection.getSnapshot()).toMatchObject({ status: "failed", failure: "room-full" });
    expect(socket.closedByClient).toBe(true);
    expect(sockets.all).toHaveLength(1);
  });

  it("gives up when someone else takes the last seat while the player asks for it", async () => {
    connect();
    const socket = enter(roomView({ seats: ["Minh", null] }), null);
    connection.send({ type: "sit", name: "Khoa" });

    socket.receive(roomMessage(roomView({ revision: 2, seats: ["Minh", "Lan"] }), null));
    socket.receive({ type: "rejected", request: "sit", code: "room-full" });
    await wait(60_000);

    expect(connection.getSnapshot()).toMatchObject({ status: "failed", failure: "room-full" });
    expect(socket.closedByClient).toBe(true);
    expect(sockets.all).toHaveLength(1);
  });

  it("gives up on a refused sit for a full room it already knew", async () => {
    connect();
    const socket = enter(roomView({ seats: ["Minh", null] }), null);

    socket.receive({ type: "rejected", request: "sit", code: "room-full" });
    await wait(60_000);

    expect(connection.getSnapshot()).toMatchObject({ status: "failed", failure: "room-full" });
    expect(sockets.all).toHaveLength(1);
  });

  it("reconnects when a seat asked for is not answered within 8 s", async () => {
    connect();
    const socket = enter(roomView({ seats: ["Minh", null] }), null);

    connection.send({ type: "sit", name: "Khoa" });
    await wait(7999);
    expect(socket.closedByClient).toBe(false);
    await wait(1);

    expect(socket.closedByClient).toBe(true);
    expect(sockets.all).toHaveLength(2);
  });

  it("waits no more once a room shows the seat asked for", async () => {
    connect();
    const socket = enter(roomView({ seats: ["Minh", null] }), null);

    connection.send({ type: "sit", name: "Khoa" });
    socket.receive(roomMessage(roomView({ revision: 2, seats: ["Minh", "Khoa"] }), 1));
    await wait(30_000);

    expect(socket.closedByClient).toBe(false);
    expect(sockets.all).toHaveLength(1);
  });

  it("says it is slow when not once in the room after 10 s, and keeps trying", async () => {
    connect();
    sockets.last().lose();

    await wait(9999);
    expect(connection.getSnapshot().slow).toBe(false);
    await wait(1);

    expect(connection.getSnapshot()).toMatchObject({ status: "connecting", slow: true });
    const opened = sockets.all.length;
    sockets.last().lose();
    await wait(10_000);
    expect(sockets.all.length).toBeGreaterThan(opened);

    enter();
    expect(connection.getSnapshot()).toMatchObject({ status: "online", slow: false });
  });

  it("reconnects when asked to, as when an answer is overdue", async () => {
    connect();
    const first = enter();

    connection.reconnect();
    await wait(0);

    expect(first.closedByClient).toBe(true);
    expect(sockets.all).toHaveLength(2);
  });
});

describe("room connection: heartbeat", () => {
  it("pings every 20 s while online and seen", async () => {
    connect();
    const socket = enter();

    await wait(19_999);
    expect(socket.sent).not.toContainEqual({ type: "ping" });
    await wait(1);
    expect(socket.sent.filter(isPing)).toHaveLength(1);
    await wait(20_000);
    expect(socket.sent.filter(isPing)).toHaveLength(2);
  });

  it("closes a connection silent for 45 s and reconnects", async () => {
    connect();
    const socket = enter();
    socket.answerPings = false;

    await wait(44_999);
    expect(socket.closedByClient).toBe(false);
    await wait(1);

    expect(socket.closedByClient).toBe(true);
    expect(status()).toBe("reconnecting");
    // Fake timers, like browsers, run a 0 ms timeout set from another timer 1 ms later.
    await wait(1);
    expect(sockets.all).toHaveLength(2);
  });

  it("keeps a connection that answers its pings", async () => {
    connect();
    const socket = enter();
    socket.answerPings = false;

    for (let minute = 0; minute < 3; minute += 1) {
      await wait(20_000);
      socket.receive({ type: "pong" });
    }

    expect(socket.closedByClient).toBe(false);
    expect(status()).toBe("online");
  });
});

describe("room connection: page and network", () => {
  it("keeps the connection when the page is hidden for less than a minute", async () => {
    connect();
    const socket = enter();

    environment.setVisible(false);
    await wait(59_000);
    environment.setVisible(true);

    expect(socket.closedByClient).toBe(false);
    expect(status()).toBe("online");
  });

  it("closes the connection once the page has been hidden for a minute, and reopens it on return", async () => {
    connect();
    const socket = enter();

    environment.setVisible(false);
    await wait(60_000);
    expect(socket.closedByClient).toBe(true);
    expect(status()).toBe("paused");
    await wait(10 * 60_000);
    expect(sockets.all).toHaveLength(1);

    environment.setVisible(true);
    expect(sockets.all).toHaveLength(2);
    enter(roomView({ revision: 2, cells: [4] }));
    expect(connection.getSnapshot()).toMatchObject({ status: "online", room: { revision: 2 } });
  });

  it("reconnects on return after a minute by the clock, even when frozen timers left it online", () => {
    connect();
    const first = enter();
    environment.setVisible(false);
    // A locked phone: the clock moves on, the timers do not fire.
    vi.setSystemTime(Date.now() + 5 * 60_000);

    environment.setVisible(true);

    expect(first.closedByClient).toBe(true);
    expect(sockets.all).toHaveLength(2);
    expect(status()).toBe("reconnecting");
  });

  it("does not reopen the connection when the network returns while the page is hidden", async () => {
    connect();
    enter();
    environment.setVisible(false);
    await wait(60_000);

    environment.emit("offline");
    environment.emit("online");
    await wait(30_000);

    expect(status()).toBe("paused");
    expect(sockets.all).toHaveLength(1);
  });

  it("closes the connection when the network goes, and retries at once when it returns", async () => {
    connect();
    const socket = enter();
    random = () => 0.999;

    environment.emit("offline");
    expect(socket.closedByClient).toBe(true);
    expect(status()).toBe("reconnecting");
    await wait(0);
    sockets.last().lose();
    await wait(500);
    expect(sockets.all).toHaveLength(2);

    environment.emit("online");

    expect(sockets.all).toHaveLength(3);
  });

  it("retries at once when the network returns while an attempt is still hanging", async () => {
    connect();
    enter();
    environment.emit("offline");
    // The retry opened a socket while offline, which neither opens nor closes.
    await wait(0);
    const opened = sockets.all.length;

    environment.emit("online");

    expect(sockets.all).toHaveLength(opened + 1);
  });

  it("goes idle after 10 minutes even when the server cuts the connection every 5 minutes", async () => {
    connect();
    const room = roomView({ seats: ["Minh", "Lan"] });
    enter(room);

    // Nobody touches the page and the room never changes; Vercel cuts every 300 s.
    for (let cut = 0; cut < 3 && status() !== "idle"; cut += 1) {
      await wait(300_000);
      if (status() === "idle") break;
      sockets.last().lose();
      await wait(0);
      enter(room);
    }

    expect(status()).toBe("idle");
    expect(sockets.last().closedByClient).toBe(true);
  });

  it("closes after 10 minutes without a new room nor activity, and resumes on request", async () => {
    connect();
    const socket = enter();

    await wait(5 * 60_000);
    environment.emit("activity");
    await wait(5 * 60_000);
    socket.receive(roomMessage(roomView({ revision: 2 }), 0));
    await wait(10 * 60_000 - 1);
    expect(status()).toBe("online");
    socket.receive({ type: "pong" });
    await wait(1);

    expect(status()).toBe("idle");
    expect(sockets.last().closedByClient).toBe(true);
    await wait(10 * 60_000);
    expect(sockets.all).toHaveLength(1);

    connection.resume();
    expect(sockets.all).toHaveLength(2);
    enter(roomView({ revision: 3 }));
    expect(connection.getSnapshot()).toMatchObject({ status: "online", room: { revision: 3 } });
  });

  it("stays idle when the server closes with 4001", async () => {
    connect();
    enter();

    sockets.last().lose(4001);
    await wait(60_000);

    expect(status()).toBe("idle");
    expect(sockets.all).toHaveLength(1);
  });
});
