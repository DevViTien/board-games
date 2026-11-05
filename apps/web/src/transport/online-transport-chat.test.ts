import * as engine from "@board-games/engine";
import {
  createSession,
  currentState,
  type GameRecord,
  playMove,
  type Rng,
  toRecord,
} from "@board-games/engine";
import { ludo, tictactoe } from "@board-games/games";
import type { ChatMessageView } from "@board-games/protocol";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AI,
  createFakeEnvironment,
  createFakeSockets,
  type FakeSocket,
  type FakeSockets,
  ROOM_CODE,
  roomMessage,
  roomView,
} from "@/test/fake-realtime";

import { AI_RESULT_DELAY_MS, AI_SETTLE_DELAY_MS } from "./ai-timing";
import { createOnlineTransport, type OnlineTransport } from "./online-transport";
import { createRoomConnection, type RoomConnection } from "./room-connection";

// A chat message is a new room with the same game (design of `add-room-chat`, §5).

vi.mock("@board-games/engine", { spy: true });

type AnyTransport = OnlineTransport<unknown, unknown, unknown>;

let sockets: FakeSockets;
let connection: RoomConnection;
let transport: AnyTransport;

const SEATS = ["Minh", "Lan"] as const;

const message = (seq: number): ChatMessageView => ({
  seq,
  id: `chat-${String(seq).padStart(4, "0")}`,
  name: "Lan",
  mine: false,
  body: { kind: "text", text: "chào" },
});

function connect(room: ReturnType<typeof roomView>, you: number | null): FakeSocket {
  connection = createRoomConnection({
    url: "ws://test",
    code: ROOM_CODE,
    getIdentity: () => ({ playerId: "player-0123456789abcdef", name: "Minh" }),
    openSocket: sockets.openSocket,
    environment: createFakeEnvironment(),
  });
  const socket = sockets.last();
  socket.open();
  socket.receive(roomMessage(room, you));
  return socket;
}

function ready() {
  const snapshot = transport.getSnapshot();
  if (snapshot.status !== "ready") throw new Error("still loading");
  return snapshot;
}

/** A Tic-tac-toe game, its transport listened to. */
function start(room = roomView({ seats: SEATS, cells: [4], revision: 5 }), you: number | null = 0) {
  const socket = connect(room, you);
  transport = createOnlineTransport({ definition: tictactoe, connection });
  const changes = vi.fn();
  transport.subscribe(changes);
  vi.mocked(engine.fromRecord).mockClear();
  return { socket, changes };
}

/** A four-player Cờ cá ngựa game where each roll takes the next face. */
function ludoRecord(faces: readonly number[]): GameRecord {
  const queue = [...faces];
  const dice: Rng = { nextInt: () => (queue.shift() ?? 1) - 1, nextFloat: () => 0 };
  const created = createSession(ludo, { playerCount: 4 });
  if (!created.ok) throw new Error(created.error);
  let session = created.value;
  while (queue.length > 0) {
    const [move] = ludo.legalMoves(currentState(session));
    if (move === undefined) break;
    const played = playMove(ludo, session, move, dice);
    if (!played.ok) throw new Error(played.error);
    session = played.value;
  }
  return toRecord(session);
}

const wait = (ms: number) => vi.advanceTimersByTimeAsync(ms);

beforeEach(() => {
  vi.useFakeTimers();
  sockets = createFakeSockets();
});

afterEach(() => {
  transport.dispose();
  connection.dispose();
  vi.useRealTimers();
});

describe("online transport: chat messages", () => {
  it("does not replay the game, change the screen or tell it, for a message", () => {
    const { socket, changes } = start();
    const before = transport.getSnapshot();

    socket.receive(
      roomMessage(roomView({ seats: SEATS, cells: [4], revision: 6, chat: [message(6)] }), 0),
    );

    expect(engine.fromRecord).not.toHaveBeenCalled();
    expect(changes).not.toHaveBeenCalled();
    expect(transport.getSnapshot()).toBe(before);
    // The connection has it, for the chat to read.
    expect(connection.getSnapshot().room?.chat).toHaveLength(1);
  });

  it("replays the first room after a greeting, even if it holds the same game", async () => {
    const { socket } = start();
    socket.lose();
    await wait(0);
    const next = sockets.last();
    expect(next).not.toBe(socket);

    next.open();
    next.receive(roomMessage(roomView({ seats: SEATS, cells: [4], revision: 5 }), 0));

    expect(engine.fromRecord).toHaveBeenCalled();
  });

  it("finds out a record corrupted at the same length", () => {
    const { socket } = start();

    socket.receive(
      roomMessage(
        roomView({
          seats: SEATS,
          revision: 6,
          record: {
            version: 1,
            gameId: "tictactoe",
            playerCount: 2,
            options: {},
            entries: [{ move: { cell: 99 } }],
          },
        }),
        0,
      ),
    );

    expect(transport.isBroken()).toBe(true);
  });

  it("tells the screen when seats change with the same game: a name, a stand-in", () => {
    const { socket, changes } = start();

    socket.receive(
      roomMessage(roomView({ seats: ["Minh", "Lan Anh"], cells: [4], revision: 6 }), 0),
    );

    expect(changes).toHaveBeenCalledTimes(1);
    expect(engine.fromRecord).not.toHaveBeenCalled();
    expect(ready().seats[1]).toEqual({ kind: "remote", name: "Lan Anh" });
  });

  it("tells the screen when the turn's clock changed with the same game", () => {
    const { socket, changes } = start(
      roomView({ seats: SEATS, cells: [4], revision: 5, turnIdleMs: 1000 }),
    );

    // Reckoned far from what was known: a new start, even for the same room.
    socket.receive(
      roomMessage(roomView({ seats: SEATS, cells: [4], revision: 6, turnIdleMs: 60_000 }), 0),
    );

    expect(changes).toHaveBeenCalledTimes(1);
    expect(engine.fromRecord).not.toHaveBeenCalled();
  });

  it("tells the screen when the connection is lost, as ever", () => {
    const { socket, changes } = start();

    socket.lose();

    expect(changes).toHaveBeenCalled();
    expect(ready().connection).toBe("reconnecting");
  });

  it("a game corrupted later is found out on the room after a message", () => {
    const { socket } = start();
    socket.receive(
      roomMessage(roomView({ seats: SEATS, cells: [4], revision: 6, chat: [message(6)] }), 0),
    );

    socket.receive(roomMessage(roomView({ seats: SEATS, cells: [4, 4], revision: 7 }), 0));

    expect(transport.isBroken()).toBe(true);
  });

  it("does not take a message for the answer to a move on its way", () => {
    const { socket, changes } = start(roomView({ seats: SEATS, cells: [], revision: 5 }));
    transport.submit({ cell: 4 });
    changes.mockClear();
    expect(ready().canMove).toBe(false);

    socket.receive(roomMessage(roomView({ seats: SEATS, revision: 6, chat: [message(6)] }), 0));

    expect(ready().canMove).toBe(false);
    socket.receive(roomMessage(roomView({ seats: SEATS, cells: [4], revision: 7 }), 0));
    expect(ready().moveCount).toBe(1);
  });

  it("ignores a message refused, even with a move on its way", () => {
    const { socket } = start(roomView({ seats: SEATS, cells: [], revision: 5 }));
    transport.submit({ cell: 4 });

    socket.receive({ type: "rejected", request: "chat", code: "unavailable", id: "chat-0123" });

    expect(ready().canMove).toBe(false);
    expect(ready().connection).toBe("online");
    expect(sockets.all).toHaveLength(1);
  });

  it("settles a refused move even if a message came just before the refusal", () => {
    const { socket } = start(roomView({ seats: SEATS, cells: [], revision: 5 }));
    transport.submit({ cell: 4 });

    socket.receive(roomMessage(roomView({ seats: SEATS, revision: 6, chat: [message(6)] }), 0));
    socket.receive({ type: "rejected", request: "move", code: "illegal-move" });

    expect(ready().canMove).toBe(true);
  });

  it("Tin tới khi đang hiện lần lượt các nước: keeps the moves' order and pace", async () => {
    const seats = ["Minh", AI, AI, AI] as const;
    // Minh rolled a 1 and lost the turn; the AIs roll 1 too.
    const one = ludoRecord([1]);
    const socket = connect(roomView({ seats, record: one, revision: 2 }), 0);
    transport = createOnlineTransport({ definition: ludo, connection });
    const all = ludoRecord([1, 1, 1, 1]);
    const reveal = (revision: number, chat: readonly ChatMessageView[]) =>
      roomMessage(roomView({ seats, record: all, revision, chat }), 0);

    socket.receive(reveal(3, []));
    // The AIs' moves come one at a time: the first new one at once, then at the AI's pace.
    expect(ready().moveCount).toBe(2);
    vi.mocked(engine.fromRecord).mockClear();

    await wait(AI_RESULT_DELAY_MS - 10);
    socket.receive(reveal(4, [message(4)]));
    socket.receive(reveal(5, [message(4), message(5)]));

    // Messages at once for whoever reads them; the moves not a step sooner.
    expect(connection.getSnapshot().room?.chat).toHaveLength(2);
    expect(ready().moveCount).toBe(2);
    expect(engine.fromRecord).not.toHaveBeenCalled();

    await wait(10);
    expect(ready().moveCount).toBe(3);
    await wait(AI_RESULT_DELAY_MS);
    expect(ready().moveCount).toBe(4);
    expect(AI_SETTLE_DELAY_MS).toBeLessThan(AI_RESULT_DELAY_MS);
  });

  it("keeps a new game waiting behind the moves, with its messages", async () => {
    const seats = ["Minh", AI, AI, AI] as const;
    const socket = connect(roomView({ seats, record: ludoRecord([1]), revision: 2 }), 0);
    transport = createOnlineTransport({ definition: ludo, connection });
    socket.receive(roomMessage(roomView({ seats, record: ludoRecord([1, 1, 1]), revision: 3 }), 0));
    expect(ready().moveCount).toBe(2);

    const fresh = ludoRecord([]);
    socket.receive(roomMessage(roomView({ seats, record: fresh, gameNumber: 2, revision: 4 }), 0));
    const held = connection.getSnapshot().room;
    vi.mocked(engine.fromRecord).mockClear();
    socket.receive(
      roomMessage(
        roomView({ seats, record: fresh, gameNumber: 2, revision: 5, chat: [message(5)] }),
        0,
      ),
    );

    expect(connection.getSnapshot().room).not.toBe(held);
    expect(engine.fromRecord).not.toHaveBeenCalled();
    expect(ready().moveCount).toBe(2);

    await wait(AI_RESULT_DELAY_MS);
    expect(ready().moveCount).toBe(3);
    await wait(AI_RESULT_DELAY_MS);
    // The new game, from the room as last received.
    expect(ready().moveCount).toBe(0);
  });

  it("a stand-in in the seat's name still shows on a room with no new move", () => {
    const seats = ["Minh", "Lan", "Chi", "Dung"] as const;
    const record = ludoRecord([1]);
    const socket = connect(roomView({ seats, record, revision: 2 }), 0);
    transport = createOnlineTransport({ definition: ludo, connection });

    socket.receive(
      roomMessage(
        roomView({
          seats: ["Minh", { kind: "human", name: "Lan", standIn: true }, "Chi", "Dung"],
          record,
          revision: 3,
        }),
        0,
      ),
    );

    expect(ready().seats[1]).toEqual({ kind: "ai", level: "medium", standInFor: "Lan" });
  });
});
