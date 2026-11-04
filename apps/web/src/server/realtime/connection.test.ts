import net from "node:net";

import {
  CLOSE_CODE,
  PROTOCOL_VERSION,
  type RoomCode,
  type ServerMessage,
} from "@board-games/protocol";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMemoryRoomStore, type MemoryRoomStore } from "../store/memory";
import type { ConnectionLimits } from "./connection";
import { type RealtimeServer, startRealtimeServer } from "./dev-server";
import {
  createMessage,
  joinMessage,
  openClient,
  sitMessage,
  type TestClient,
  type TestPlayer,
} from "./test-client";

const LAN: TestPlayer = { playerId: "lan-0123456789abcdef", name: "Lan" };
const AN: TestPlayer = { playerId: "an-0123456789abcdefgh", name: "An" };
const BINH: TestPlayer = { playerId: "binh-0123456789abcdef", name: "Bình" };

const servers: RealtimeServer[] = [];
const clients: TestClient[] = [];

afterEach(async () => {
  for (const client of clients.splice(0)) client.socket.terminate();
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

async function start(
  limits: Partial<ConnectionLimits> = {},
  store = createMemoryRoomStore(),
  abandonAfterMs?: number,
) {
  const server = await startRealtimeServer({
    port: 0,
    store,
    limits,
    ...(abandonAfterMs === undefined ? {} : { abandonAfterMs }),
  });
  servers.push(server);
  const connect = (options?: Parameters<typeof openClient>[1]) => {
    const client = openClient(server.port, options);
    clients.push(client);
    return client;
  };
  return { server, store, connect };
}

type Context = Awaited<ReturnType<typeof start>>;

function expectType<T extends ServerMessage["type"]>(
  message: ServerMessage,
  type: T,
): Extract<ServerMessage, { type: T }> {
  expect(message.type).toBe(type);
  return message as Extract<ServerMessage, { type: T }>;
}

async function createRoom({ connect }: Context, player = LAN): Promise<RoomCode> {
  const creator = connect();
  creator.send(createMessage("tictactoe", player));
  return expectType(await creator.next(), "created").code;
}

async function join({ connect }: Context, code: string, player: TestPlayer) {
  const client = connect();
  client.send(joinMessage(code, player));
  const first = expectType(await client.next(), "room");
  return { client, first };
}

/** The greeting of a visitor who has not chosen a name yet (change `ask-name-in-lobby`). */
function namelessJoinMessage(code: string, { playerId }: TestPlayer) {
  return { type: "join", protocol: PROTOCOL_VERSION, code, playerId };
}

/** A Tic-tac-toe room with Lan in seat 0 and An in seat 1, both connected and up to date. */
async function startGame(context: Context) {
  const code = await createRoom(context);
  const lan = await join(context, code, LAN);
  const an = await join(context, code, AN);
  an.client.send(sitMessage(AN));
  const seated = expectType(await an.client.next(), "room");
  expect(seated.you).toBe(1);
  expect(expectType(await lan.client.next(), "room").room.revision).toBe(seated.room.revision);
  return { code, lan: lan.client, an: an.client, revision: seated.room.revision };
}

/** Plays a move and returns the room both players received. */
async function move(mover: TestClient, other: TestClient, moveIndex: number, cell: number) {
  mover.send({ type: "move", gameNumber: 1, moveIndex, move: { cell } });
  const mine = expectType(await mover.next(), "room");
  const theirs = expectType(await other.next(), "room");
  // Sent a few ms apart: the turn's duration may differ.
  expect(theirs.room).toEqual({ ...mine.room, turnIdleMs: theirs.room.turnIdleMs });
  expect(theirs.room.turnIdleMs === null).toBe(mine.room.turnIdleMs === null);
  return mine.room;
}

describe("realtime server", () => {
  it("answers /healthz", async () => {
    const { server } = await start();

    const healthz = await fetch(`http://localhost:${String(server.port)}/healthz`);
    const other = await fetch(`http://localhost:${String(server.port)}/`);

    expect(healthz.status).toBe(200);
    expect(other.status).toBe(404);
  });

  it("drops an upgrade whose request line is no URL, and keeps serving", async () => {
    const { server } = await start();
    const socket = net.connect(server.port, "localhost");
    socket.on("error", () => undefined);
    const ended = new Promise((resolve) => socket.once("close", resolve));

    socket.write(
      "GET http://[ HTTP/1.1\r\nHost: localhost\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n",
    );

    await ended;
    expect((await fetch(`http://localhost:${String(server.port)}/healthz`)).status).toBe(200);
  });
});

describe("greeting", () => {
  it("creates a room, answers with its code and closes", async () => {
    const { connect } = await start();
    const creator = connect();

    creator.send(createMessage("tictactoe", LAN));

    expect(expectType(await creator.next(), "created").code).toMatch(/^[A-Z2-9]{6}$/u);
    expect(await creator.closed).toBe(1000);
  });

  it("refuses a game that does not exist", async () => {
    const { connect } = await start();
    const creator = connect();

    creator.send(createMessage("khong-co-game-nay", LAN));

    expect(await creator.next()).toEqual({ type: "error", code: "unknown-game" });
    await creator.closed;
  });

  it("joins a room and tells the player their seat", async () => {
    const context = await start();
    const code = await createRoom(context);

    const { first } = await join(context, code, LAN);

    expect(first.you).toBe(0);
    expect(first.room).toMatchObject({
      code,
      revision: 1,
      gameNumber: 1,
      seats: [{ name: "Lan" }, null],
    });
  });

  it("handles messages sent the moment the socket opens, in order", async () => {
    const context = await start();
    const code = await createRoom(context);
    const client = context.connect();
    client.socket.once("open", () => {
      client.socket.send(JSON.stringify(joinMessage(code, AN)));
      client.socket.send(JSON.stringify(sitMessage(AN)));
    });

    expect(expectType(await client.next(), "room").you).toBeNull();
    expect(expectType(await client.next(), "room").you).toBe(1);
  });

  it("answers room-not-found for a room that does not exist, and closes", async () => {
    const { connect } = await start();
    const client = connect();

    client.send(joinMessage("ZZZ999", LAN));

    expect(await client.next()).toEqual({ type: "error", code: "room-not-found" });
    expect(await client.closed).toBe(1000);
  });

  it("answers room-not-found to a greeting without a name, and closes", async () => {
    const { connect } = await start();
    const client = connect();

    client.send(namelessJoinMessage("ZZZ999", AN));

    expect(await client.next()).toEqual({ type: "error", code: "room-not-found" });
    expect(await client.closed).toBe(1000);
  });

  it("lets a visitor without a name in without a seat, then seats them under the name of the sit", async () => {
    const context = await start();
    const code = await createRoom(context);
    const client = context.connect();

    client.send(namelessJoinMessage(code, AN));
    const first = expectType(await client.next(), "room");
    expect(first.you).toBeNull();
    expect(first.room).toMatchObject({ revision: 1, seats: [{ name: "Lan" }, null] });
    expect((await context.store.get(code))?.revision).toBe(1);

    client.send(sitMessage(AN));
    const seated = expectType(await client.next(), "room");
    expect(seated.you).toBe(1);
    expect(seated.room.seats).toEqual([
      { kind: "human", name: "Lan", standIn: false },
      { kind: "human", name: "An", standIn: false },
    ]);
  });

  it("tells a visitor without a name that a full room has no seat for them", async () => {
    const context = await start();
    const { code } = await startGame(context);
    const client = context.connect();

    client.send(namelessJoinMessage(code, BINH));
    expect(expectType(await client.next(), "room").you).toBeNull();

    client.send(sitMessage(BINH));
    expect(await client.next()).toEqual({ type: "rejected", request: "sit", code: "room-full" });
  });

  it("recognises a seated player greeting without a name, under the name the seat has", async () => {
    const context = await start();
    const { code, an } = await startGame(context);
    an.socket.terminate();
    const client = context.connect();

    client.send(namelessJoinMessage(code, AN));

    const first = expectType(await client.next(), "room");
    expect(first.you).toBe(1);
    expect(first.room.seats[1]).toEqual({ kind: "human", name: "An", standIn: false });
  });

  it("still serves a greeting with a name, as sent by tabs opened before this change", async () => {
    const context = await start();
    const { code, an } = await startGame(context);
    an.socket.terminate();

    const { first } = await join(context, code, { ...AN, name: "An Nguyễn" });

    expect(first.you).toBe(1);
    expect(first.room.seats[1]).toEqual({ kind: "human", name: "An Nguyễn", standIn: false });
  });

  it("finds a room from its code typed in lower case with a space", async () => {
    const context = await start();
    const code = await createRoom(context);
    const typed = `${code.slice(0, 3).toLowerCase()} ${code.slice(3).toLowerCase()}`;

    const { first } = await join(context, typed, AN);

    expect(first.room.code).toBe(code);
  });

  it("answers room-not-found for something that cannot be a code, and closes", async () => {
    const { connect } = await start();
    const client = connect();

    client.send(joinMessage("not a code", LAN));

    expect(await client.next()).toEqual({ type: "error", code: "room-not-found" });
    expect(await client.closed).toBe(1000);
  });

  it("tells a tab opened before a deploy that it is outdated, and closes", async () => {
    const context = await start();
    const code = await createRoom(context);
    const client = context.connect();

    client.send({ ...joinMessage(code, LAN), protocol: 99, field: "from the future" });

    expect(await client.next()).toEqual({ type: "error", code: "outdated-client" });
    await client.closed;
  });

  it("refuses a first message that is not a greeting, and closes", async () => {
    const { connect } = await start();
    const client = connect();

    client.send({ type: "ping" });

    expect(await client.next()).toEqual({ type: "error", code: "invalid-message" });
    await client.closed;
  });

  it("closes a connection that does not greet in time, without a message", async () => {
    const { connect } = await start({ greetingTimeoutMs: 50 });
    const client = connect();

    expect(await client.closed).toBe(CLOSE_CODE.GreetingTimeout);
    expect(client.received).toEqual([]);
  });
});

describe("playing", () => {
  // Rooms sent to two players a few ms apart are compared whole: stop the clock their
  // `turnIdleMs` is reckoned with (timers and sockets keep running).
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"], now: 1_000_000 });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("plays a whole game, everyone receiving each new room with a higher revision", async () => {
    const context = await start();
    const { code, lan, an, revision } = await startGame(context);
    let last = revision;

    for (const [index, cell] of [0, 3, 1, 4, 2].entries()) {
      const [mover, other] = index % 2 === 0 ? [lan, an] : [an, lan];
      const room = await move(mover, other, index, cell);
      expect(room.revision).toBeGreaterThan(last);
      last = room.revision;
    }

    expect((await context.store.get(code))?.record.entries).toHaveLength(5);
  });

  it("sends the current room before refusing a move from a player who missed it", async () => {
    const context = await start();
    const { lan, an } = await startGame(context);
    context.store.dropMessages();

    // An's copy of Lan's move is lost on the channel; Lan still gets the room directly.
    lan.send({ type: "move", gameNumber: 1, moveIndex: 0, move: { cell: 4 } });
    const afterMove = expectType(await lan.next(), "room");
    an.send({ type: "move", gameNumber: 1, moveIndex: 0, move: { cell: 0 } });

    expect(await an.next()).toEqual({ type: "room", room: afterMove.room, you: 1 });
    expect(await an.next()).toEqual({ type: "rejected", request: "move", code: "stale-move" });
  });

  it("refuses a move out of turn", async () => {
    const context = await start();
    const { an } = await startGame(context);

    an.send({ type: "move", gameNumber: 1, moveIndex: 0, move: { cell: 4 } });

    expect(await an.next()).toEqual({ type: "rejected", request: "move", code: "not-your-turn" });
  });

  it("gives a player who reconnects mid-game every move in order, in the same seat", async () => {
    const context = await start();
    const { code, lan, an } = await startGame(context);
    await move(lan, an, 0, 4);
    await move(an, lan, 1, 0);
    await move(lan, an, 2, 8);
    an.socket.terminate();

    const { first } = await join(context, code, AN);

    expect(first.you).toBe(1);
    expect(first.room.record.entries).toEqual([
      { move: { cell: 4 } },
      { move: { cell: 0 } },
      { move: { cell: 8 } },
    ]);
  });

  it("refuses a third player a seat and keeps the connection open", async () => {
    const context = await start();
    const { code } = await startGame(context);
    const { client, first } = await join(context, code, BINH);
    expect(first.you).toBeNull();

    client.send(sitMessage(BINH));
    expect(await client.next()).toEqual({ type: "rejected", request: "sit", code: "room-full" });
    client.send({ type: "ping" });
    expect(await client.next()).toEqual({ type: "pong" });
  });

  it("seats a player under the name sent with the sit, for everyone to see", async () => {
    const context = await start();
    const code = await createRoom(context);
    const lan = await join(context, code, LAN);
    const an = await join(context, code, AN);

    an.client.send(sitMessage({ ...AN, name: "An Nguyễn" }));

    const seated = expectType(await an.client.next(), "room");
    expect(seated.you).toBe(1);
    expect(seated.room.seats).toEqual([
      { kind: "human", name: "Lan", standIn: false },
      { kind: "human", name: "An Nguyễn", standIn: false },
    ]);
    expect(expectType(await lan.client.next(), "room").room.seats[1]).toEqual({
      kind: "human",
      name: "An Nguyễn",
      standIn: false,
    });
  });

  it("answers a sit from a player already seated with the room and their seat", async () => {
    const context = await start();
    const { an, revision } = await startGame(context);

    an.send(sitMessage(AN));

    const again = expectType(await an.next(), "room");
    expect(again.you).toBe(1);
    expect(again.room.revision).toBe(revision);
  });

  it("answers a ping at once, even behind a request waiting for the store", async () => {
    const context = await start({ storeTimeoutMs: 300 });
    const { lan } = await startGame(context);
    context.store.intercept("get", () => new Promise<never>(() => undefined));

    lan.send({ type: "move", gameNumber: 1, moveIndex: 0, move: { cell: 4 } });
    lan.send({ type: "ping" });

    expect(await lan.next()).toEqual({ type: "pong" });
    expect(await lan.next()).toEqual({ type: "rejected", request: "move", code: "unavailable" });
  });

  it("tells a player whose room expired meanwhile that it is gone, and closes", async () => {
    const context = await start();
    const { code, lan } = await startGame(context);

    context.store.expire(code);
    lan.send({ type: "move", gameNumber: 1, moveIndex: 0, move: { cell: 4 } });

    expect(await lan.next()).toEqual({ type: "error", code: "room-not-found" });
    expect(await lan.closed).toBe(1000);
  });

  it("brings a move lost on the channel once the channel reconnects, and only once", async () => {
    const context = await start();
    const { lan, an } = await startGame(context);
    context.store.dropMessages();

    lan.send({ type: "move", gameNumber: 1, moveIndex: 0, move: { cell: 4 } });
    const afterMove = expectType(await lan.next(), "room");
    context.store.reconnect();

    expect(await an.next()).toEqual({ type: "room", room: afterMove.room, you: 1 });
    // Lan already has that room: the copy read again on reconnect is not sent twice.
    lan.send({ type: "ping" });
    expect(await lan.next()).toEqual({ type: "pong" });
  });

  it("gives each player their new seat after a rematch", async () => {
    const context = await start();
    const { lan, an } = await startGame(context);
    for (const [index, cell] of [0, 3, 1, 4, 2].entries()) {
      await (index % 2 === 0 ? move(lan, an, index, cell) : move(an, lan, index, cell));
    }

    an.send({ type: "rematch", gameNumber: 1 });

    const forAn = expectType(await an.next(), "room");
    const forLan = expectType(await lan.next(), "room");
    expect(forAn.room.gameNumber).toBe(2);
    expect(forAn.room.record.entries).toEqual([]);
    expect(forAn.you).toBe(0);
    expect(forLan.you).toBe(1);
    expect(forLan.room.seats).toEqual([
      { kind: "human", name: "An", standIn: false },
      { kind: "human", name: "Lan", standIn: false },
    ]);
  });

  it("never sends a playerId", async () => {
    const context = await start();
    const { lan, an } = await startGame(context);
    await move(lan, an, 0, 4);

    for (const message of [...lan.received, ...an.received]) {
      expect(JSON.stringify(message)).not.toMatch(/playerId|0123456789/u);
    }
  });
});

describe("resigning and abandoning", () => {
  it("ends the game for both players when one resigns", async () => {
    const context = await start();
    const { lan, an } = await startGame(context);

    lan.send({ type: "resign", gameNumber: 1 });

    const mine = expectType(await lan.next(), "room");
    const theirs = expectType(await an.next(), "room");
    expect(mine.room.record.ending).toEqual({ reason: "resigned", player: 0 });
    expect(theirs.room.record.ending).toEqual({ reason: "resigned", player: 0 });
    expect(theirs.room.turnIdleMs).toBeNull();
  });

  it("Chưa đủ 5 phút: refuses an early claim after the room, its turn reckoned anew, and stays connected", async () => {
    const context = await start({}, createMemoryRoomStore(), 60_000);
    const { lan, an } = await startGame(context);
    const room = await move(lan, an, 0, 4);
    await new Promise((resolve) => setTimeout(resolve, 30));

    lan.send({ type: "claim-abandoned", gameNumber: 1, moveIndex: 1 });

    const again = expectType(await lan.next(), "room");
    expect(again.room.revision).toBe(room.revision);
    expect(again.room.turnIdleMs).toBeGreaterThanOrEqual(25);
    expect(await lan.next()).toEqual({
      type: "rejected",
      request: "claim-abandoned",
      code: "not-abandoned",
    });
    lan.send({ type: "ping" });
    expect(await lan.next()).toEqual({ type: "pong" });
  });

  it("Xử thắng: ends the game when the turn has lasted long enough", async () => {
    const context = await start({}, createMemoryRoomStore(), 20);
    const { lan, an } = await startGame(context);
    await move(lan, an, 0, 4);
    await new Promise((resolve) => setTimeout(resolve, 40));

    lan.send({ type: "claim-abandoned", gameNumber: 1, moveIndex: 1 });

    expect(expectType(await lan.next(), "room").room.record.ending).toEqual({
      reason: "abandoned",
      player: 1,
    });
    expect(expectType(await an.next(), "room").room.record.ending).toEqual({
      reason: "abandoned",
      player: 1,
    });
  });
});

describe("protection", () => {
  it("refuses a message that is not JSON and keeps the connection and the room", async () => {
    const context = await start();
    const { code, lan } = await startGame(context);
    const before = await context.store.get(code);

    lan.send("{ not json");
    expect(await lan.next()).toEqual({ type: "rejected", request: null, code: "invalid-message" });
    lan.socket.send(Buffer.from([1, 2, 3]), { binary: true });
    expect(await lan.next()).toEqual({ type: "rejected", request: null, code: "invalid-message" });
    lan.send({ type: "move", gameNumber: 1, moveIndex: -1, move: { cell: 4 } });
    expect(await lan.next()).toEqual({ type: "rejected", request: null, code: "invalid-message" });

    lan.send({ type: "ping" });
    expect(await lan.next()).toEqual({ type: "pong" });
    expect(await context.store.get(code)).toEqual(before);
  });

  it("closes a connection that sends more than 30 messages in 10 seconds", async () => {
    const context = await start();
    const code = await createRoom(context);
    const { client } = await join(context, code, LAN);

    // The join was the first message; 29 pings make 30, still allowed.
    for (let count = 0; count < 29; count += 1) client.send({ type: "ping" });
    for (let count = 0; count < 29; count += 1)
      expect(await client.next()).toEqual({ type: "pong" });
    client.send({ type: "ping" });

    expect(await client.next()).toEqual({ type: "error", code: "too-many-messages" });
    expect(await client.closed).toBe(1008);
  });

  it("closes a connection that sends an oversized message, and the others play on", async () => {
    const context = await start();
    const { code, lan, an } = await startGame(context);
    const { client } = await join(context, code, BINH);

    client.send({ type: "ping", padding: "x".repeat(17 * 1024) });

    expect(await client.closed).toBe(1009);
    await move(lan, an, 0, 4);
    await move(an, lan, 1, 0);
  });

  it("refuses a move with unavailable when the store does not answer, and stays open", async () => {
    const context = await start({ storeTimeoutMs: 100 });
    const { lan } = await startGame(context);
    const restore = context.store.intercept("get", () => new Promise<never>(() => undefined));

    lan.send({ type: "move", gameNumber: 1, moveIndex: 0, move: { cell: 4 } });

    expect(await lan.next()).toEqual({ type: "rejected", request: "move", code: "unavailable" });
    restore();
    lan.send({ type: "ping" });
    expect(await lan.next()).toEqual({ type: "pong" });
  });

  it("refuses with unavailable when the store fails, without an unhandled rejection", async () => {
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    try {
      const context = await start();
      const { lan } = await startGame(context);
      const restore = context.store.intercept("update", () => {
        throw new Error("Redis is down");
      });

      lan.send({ type: "move", gameNumber: 1, moveIndex: 0, move: { cell: 4 } });
      expect(await lan.next()).toEqual({ type: "rejected", request: "move", code: "unavailable" });
      restore();
      const creator = context.connect();
      context.store.intercept("create", () => Promise.reject(new Error("Redis is down")));
      creator.send(createMessage("tictactoe", BINH));
      expect(await creator.next()).toEqual({ type: "error", code: "unavailable" });

      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off("unhandledRejection", unhandled);
    }
  });

  it("closes a connection that only pings for too long", async () => {
    const context = await start({ idleTimeoutMs: 150 });
    const code = await createRoom(context);
    const { client } = await join(context, code, LAN);
    const pinging = setInterval(() => {
      client.send({ type: "ping" });
    }, 30);

    try {
      expect(await client.closed).toBe(CLOSE_CODE.Idle);
    } finally {
      clearInterval(pinging);
    }
  });

  it("keeps a connection that sends nothing but receives new rooms", async () => {
    const context = await start({ idleTimeoutMs: 200 });
    const { code, lan, an } = await startGame(context);
    // Only joins, then never sends anything: the rooms it receives are all that keeps it.
    const { client: viewer } = await join(context, code, BINH);

    for (const [index, cell] of [0, 3, 1, 4].entries()) {
      await new Promise((resolve) => setTimeout(resolve, 80));
      await (index % 2 === 0 ? move(lan, an, index, cell) : move(an, lan, index, cell));
      expectType(await viewer.next(), "room");
    }

    expect(viewer.socket.readyState).toBe(viewer.socket.OPEN);
  });

  it("drops a socket that stops answering pings and stops listening to its room", async () => {
    const context = await start({ heartbeatIntervalMs: 50 });
    const code = await createRoom(context);
    const silent = context.connect({ autoPong: false });
    silent.send(joinMessage(code, LAN));
    await silent.next();
    expect(context.store.listenerCount(code)).toBe(1);

    expect(await silent.closed).toBe(1006);
    await vi.waitFor(() => {
      expect(context.store.listenerCount(code)).toBe(0);
    });
  });
});

describe("several instances", () => {
  it("brings a move to a player connected to another instance", async () => {
    const store: MemoryRoomStore = createMemoryRoomStore();
    const first = await start({}, store);
    const second = await start({}, store);
    const code = await createRoom(first);
    const lan = await join(first, code, LAN);
    const an = await join(second, code, AN);
    an.client.send(sitMessage(AN));
    await an.client.next();
    await lan.client.next();

    lan.client.send({ type: "move", gameNumber: 1, moveIndex: 0, move: { cell: 4 } });

    const received = expectType(await an.client.next(), "room");
    expect(received.room.record.entries).toEqual([{ move: { cell: 4 } }]);
  });
});

describe("AI seats", () => {
  /** A Cờ cá ngựa room for three, with Lan, its host, in the first seat and connected. */
  async function ludoRoom(context: Context) {
    const creator = context.connect();
    creator.send({ ...createMessage("ludo", LAN), playerCount: 3 });
    const code = expectType(await creator.next(), "created").code;
    const lan = await join(context, code, LAN);
    return { code, lan: lan.client, first: lan.first };
  }

  it("marks an empty seat for the host, and tells the host's seat", async () => {
    const context = await start();
    const { lan, first } = await ludoRoom(context);
    expect(first.room.host).toBe(0);

    lan.send({ type: "ai-seat", seat: 2, on: true });

    const marked = expectType(await lan.next(), "room");
    expect(marked.room.seats).toEqual([
      { kind: "human", name: "Lan", standIn: false },
      null,
      { kind: "ai" },
    ]);
    expect(marked.room.host).toBe(0);
  });

  it("refuses a seat the room does not have with invalid-seat, and keeps the connection", async () => {
    const context = await start();
    const { lan } = await ludoRoom(context);

    lan.send({ type: "ai-seat", seat: 4, on: true });

    expect(await lan.next()).toEqual({
      type: "rejected",
      request: "ai-seat",
      code: "invalid-seat",
    });
    lan.send({ type: "ping" });
    expect(await lan.next()).toEqual({ type: "pong" });
  });

  it("refuses anyone but the host, after sending the room they missed", async () => {
    const context = await start();
    const { code, lan } = await ludoRoom(context);
    const an = await join(context, code, AN);
    an.client.send(sitMessage(AN));
    expectType(await an.client.next(), "room");
    expectType(await lan.next(), "room");

    an.client.send({ type: "ai-seat", seat: 2, on: true });

    expect(await an.client.next()).toEqual({
      type: "rejected",
      request: "ai-seat",
      code: "not-host",
    });
  });

  it("Đổi ghế máy được gửi cho mọi người: brings the AI seat to a player in the lobby on another instance", async () => {
    const store: MemoryRoomStore = createMemoryRoomStore();
    const first = await start({}, store);
    const second = await start({}, store);
    const { code, lan } = await ludoRoom(first);
    const an = await join(second, code, AN);

    lan.send({ type: "ai-seat", seat: 1, on: true });

    const received = expectType(await an.client.next(), "room");
    expect(received.you).toBeNull();
    expect(received.room.seats[1]).toEqual({ kind: "ai" });
  });
});
