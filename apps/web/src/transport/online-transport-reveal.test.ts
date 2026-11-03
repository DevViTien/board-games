import {
  createSession,
  currentState,
  type GameRecord,
  playMove,
  type Rng,
  toRecord,
} from "@board-games/engine";
import { ludo, type LudoMove, tictactoe } from "@board-games/games";
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

import { AI_MIN_DELAY_MS, AI_RESULT_DELAY_MS, AI_SETTLE_DELAY_MS } from "./ai-timing";
import { createOnlineTransport, type OnlineTransport } from "./online-transport";
import { createRoomConnection, type RoomConnection } from "./room-connection";

// Several moves in one room (the AI seats the server plays answer in the write of the move before
// them) are shown one at a time (change `add-room-ai-seats`, design §4).

/** Any game's transport: the tests read snapshots, whatever the game. */
type AnyTransport = OnlineTransport<unknown, unknown, unknown>;

let sockets: FakeSockets;
let connection: RoomConnection;
let transport: AnyTransport;

/** Minh in the first seat, the AI in the three others. */
const ONE_AND_THREE_AIS = ["Minh", AI, AI, AI] as const;

/**
 * A four-player Cờ cá ngựa game played with these faces in turn: each roll takes the next face,
 * and whenever a horse must be chosen, the first one that can move goes.
 */
function ludoRecord(faces: readonly number[], playerCount = 4): GameRecord {
  const queue = [...faces];
  const dice: Rng = { nextInt: () => (queue.shift() ?? 1) - 1, nextFloat: () => 0 };
  const created = createSession(ludo, { playerCount });
  if (!created.ok) throw new Error(created.error);
  let session = created.value;
  while (queue.length > 0 || !ludo.legalMoves(currentState(session)).some(isRoll)) {
    const [move] = ludo.legalMoves(currentState(session));
    if (move === undefined) break;
    const played = playMove(ludo, session, move, dice);
    if (!played.ok) throw new Error(played.error);
    session = played.value;
  }
  return toRecord(session);
}

const isRoll = (move: LudoMove) => move.type === "roll";

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

function startLudo(record: GameRecord, { you = 0, gameNumber = 1 } = {}): FakeSocket {
  const socket = connect(roomView({ seats: ONE_AND_THREE_AIS, record, gameNumber }), you);
  transport = createOnlineTransport({ definition: ludo, connection });
  return socket;
}

function ready() {
  const snapshot = transport.getSnapshot();
  if (snapshot.status !== "ready") throw new Error("still loading");
  return snapshot;
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

describe("online transport: AI seats", () => {
  it("shows the room's AI seats as AIs of the server's level, and waits for them", () => {
    // Minh rolled a 1 and lost the turn: the first AI is to roll.
    startLudo(ludoRecord([1]));

    expect(ready()).toMatchObject({
      seats: [
        { kind: "human" },
        { kind: "ai", level: "medium" },
        { kind: "ai", level: "medium" },
        { kind: "ai", level: "medium" },
      ],
      viewer: 0,
      currentPlayer: 1,
      waitingFor: "ai",
      canMove: false,
    });
  });

  it("calls a person elsewhere remote, by name, next to an AI seat", () => {
    connect(roomView({ seats: ["Minh", "Lan", AI], record: ludoRecord([], 3) }), 1);
    transport = createOnlineTransport({ definition: ludo, connection });

    expect(ready().seats).toEqual([
      { kind: "remote", name: "Minh" },
      { kind: "human" },
      { kind: "ai", level: "medium" },
    ]);
  });
});

describe("online transport: showing moves received together", () => {
  it("Ba máy đi liền nhau: shows the AIs' moves one at a time, the board locked until the last", async () => {
    // The answer to Minh's roll: his 1, then the first AI rolls a 6, brings a horse out, rolls a
    // 2 and moves it, then the two others roll a 3 and a 4 and lose their turns.
    const socket = startLudo(ludoRecord([]));
    transport.submit({ type: "roll" });
    const answer = ludoRecord([1, 6, 2, 3, 4]);
    expect(answer.entries).toHaveLength(7);

    socket.receive(
      roomMessage(roomView({ seats: ONE_AND_THREE_AIS, record: answer, revision: 2 }), 0),
    );

    // His own roll at once, then each move after the one before it has played out.
    expect(ready()).toMatchObject({ moveCount: 1, lastMover: 0, canMove: false });
    const seen = [{ moveCount: 1, lastMover: 0 }];
    const delays: number[] = [];
    while (ready().moveCount < answer.entries.length) {
      const before = ready().moveCount;
      let waited = 0;
      while (ready().moveCount === before) {
        await wait(100);
        waited += 100;
      }
      delays.push(waited);
      expect(ready().moveCount).toBe(before + 1);
      seen.push({ moveCount: ready().moveCount, lastMover: ready().lastMover ?? -1 });
      if (ready().moveCount < answer.entries.length) {
        expect(ready()).toMatchObject({ canMove: false, waitingFor: "ai" });
      }
    }

    expect(seen.map(({ lastMover }) => lastMover)).toEqual([0, 1, 1, 1, 1, 2, 3]);
    // After a roll, the dice's time; after a horse moved, its walk's.
    expect(delays).toEqual([
      AI_RESULT_DELAY_MS,
      AI_RESULT_DELAY_MS,
      AI_SETTLE_DELAY_MS,
      AI_RESULT_DELAY_MS,
      AI_SETTLE_DELAY_MS,
      AI_RESULT_DELAY_MS,
    ]);
    expect(ready()).toMatchObject({ currentPlayer: 0, canMove: true, waitingFor: null });
  });

  it("answers the player's own move at once, even while the AIs' moves are still shown", async () => {
    const socket = startLudo(ludoRecord([]));
    transport.submit({ type: "roll" });
    socket.receive(
      roomMessage(
        roomView({ seats: ONE_AND_THREE_AIS, record: ludoRecord([1, 2, 3, 4]), revision: 2 }),
        0,
      ),
    );

    // Long past the 8 s an unanswered move waits before reconnecting.
    await wait(10_000);

    expect(sockets.all).toHaveLength(1);
    expect(ready()).toMatchObject({ moveCount: 4, canMove: true });
  });

  it("queues moves that arrive while others are still being shown", async () => {
    const socket = startLudo(ludoRecord([1]));
    socket.receive(
      roomMessage(
        roomView({ seats: ONE_AND_THREE_AIS, record: ludoRecord([1, 2, 3]), revision: 2 }),
        0,
      ),
    );
    expect(ready().moveCount).toBe(2);

    socket.receive(
      roomMessage(
        roomView({ seats: ONE_AND_THREE_AIS, record: ludoRecord([1, 2, 3, 4]), revision: 3 }),
        0,
      ),
    );
    expect(ready().moveCount).toBe(2);

    await wait(AI_RESULT_DELAY_MS);
    expect(ready().moveCount).toBe(3);
    await wait(AI_RESULT_DELAY_MS);
    expect(ready()).toMatchObject({ moveCount: 4, canMove: true });
  });

  it("Chơi lại với máy đi đầu: shows the new empty board, then the AI's moves one at a time", async () => {
    // A game over, the seats moved on: the AI now starts, and the new game comes with its moves.
    const finished = roomView({ seats: ["Minh", "Lan"], cells: [4, 0, 2, 1, 6] });
    const socket = connect(finished, 0);
    transport = createOnlineTransport({ definition: tictactoe, connection });
    expect(ready().result).not.toBeNull();

    socket.receive(
      roomMessage(roomView({ seats: [AI, "Minh"], cells: [4], gameNumber: 2, revision: 2 }), 1),
    );

    expect(ready()).toMatchObject({ moveCount: 0, result: null, canMove: false, waitingFor: "ai" });
    await wait(AI_MIN_DELAY_MS);
    expect(ready()).toMatchObject({ moveCount: 1, canMove: true, lastMover: 0 });
  });

  it("shows every move and the result of a game before the new game that came meanwhile", async () => {
    const socket = connect(roomView({ seats: ["Minh", AI], cells: [0, 4, 1] }), 0);
    transport = createOnlineTransport({ definition: tictactoe, connection });

    // Three moves at once, the AI's last one winning; then, 100 ms later, the next game, where
    // the seats moved on and the AI has already opened.
    socket.receive(
      roomMessage(roomView({ seats: ["Minh", AI], cells: [0, 4, 1, 2, 3, 6], revision: 2 }), 0),
    );
    const seen = [ready().moveCount];
    await wait(100);
    socket.receive(
      roomMessage(roomView({ seats: [AI, "Minh"], cells: [4], gameNumber: 2, revision: 3 }), 1),
    );
    expect(ready()).toMatchObject({ moveCount: 4, viewer: 0, canMove: false });

    await wait(AI_MIN_DELAY_MS - 100);
    seen.push(ready().moveCount);
    await wait(AI_MIN_DELAY_MS);
    seen.push(ready().moveCount);
    expect(ready()).toMatchObject({
      result: { kind: "win", winners: [1] },
      viewer: 0,
      canStartNewGame: false,
    });

    await wait(AI_MIN_DELAY_MS);
    expect(ready()).toMatchObject({ moveCount: 0, result: null, viewer: 1, canMove: false });
    await wait(AI_MIN_DELAY_MS);
    expect(ready()).toMatchObject({ moveCount: 1, viewer: 1, canMove: true });
    expect(seen).toEqual([4, 5, 6]);
  });

  it("paces the moves of a game without dice by the AI's shortest delay", async () => {
    const socket = connect(roomView({ seats: ["Minh", AI], cells: [4, 0] }), 0);
    transport = createOnlineTransport({ definition: tictactoe, connection });

    socket.receive(
      roomMessage(roomView({ seats: ["Minh", AI], cells: [4, 0, 8, 2], revision: 2 }), 0),
    );

    expect(ready()).toMatchObject({ moveCount: 3, canMove: false });
    await wait(AI_MIN_DELAY_MS - 1);
    expect(ready().moveCount).toBe(3);
    await wait(1);
    expect(ready()).toMatchObject({ moveCount: 4, canMove: true });
  });

  it("shows a single new move at once, as between two people", () => {
    const socket = connect(roomView({ seats: ["Minh", "Lan"], cells: [4] }), 0);
    transport = createOnlineTransport({ definition: tictactoe, connection });

    socket.receive(
      roomMessage(roomView({ seats: ["Minh", "Lan"], cells: [4, 0], revision: 2 }), 0),
    );

    expect(ready()).toMatchObject({ moveCount: 2, canMove: true });
  });

  it("Tải lại không phát lại: shows the latest state at once on entering the room", () => {
    startLudo(ludoRecord([1, 6, 2, 3, 4]));

    expect(ready()).toMatchObject({ moveCount: 7, currentPlayer: 0, canMove: true });
  });

  it("shows the latest state at once after reconnecting, even mid-way through showing", async () => {
    const socket = startLudo(ludoRecord([]));
    socket.receive(
      roomMessage(
        roomView({ seats: ONE_AND_THREE_AIS, record: ludoRecord([1, 2, 3]), revision: 2 }),
        0,
      ),
    );
    expect(ready().moveCount).toBe(1);

    socket.lose();
    await wait(1000);
    const again = sockets.last();
    again.open();
    again.receive(
      roomMessage(
        roomView({ seats: ONE_AND_THREE_AIS, record: ludoRecord([1, 2, 3, 4]), revision: 3 }),
        0,
      ),
    );

    expect(ready()).toMatchObject({ moveCount: 4, canMove: true, connection: "online" });
    // Nothing left to show later.
    await wait(5000);
    expect(ready().moveCount).toBe(4);
  });
});

describe("online transport: refusals of the lobby", () => {
  it("Lời từ chối không làm mất nước đang gửi: keeps the board locked on a refused AI seat", async () => {
    const socket = connect(roomView({ seats: ["Minh", "Lan"] }), 0);
    transport = createOnlineTransport({ definition: tictactoe, connection });
    transport.submit({ cell: 4 });
    expect(ready().canMove).toBe(false);

    socket.receive({ type: "rejected", request: "ai-seat", code: "game-started" });

    expect(ready().canMove).toBe(false);
    socket.receive(
      roomMessage(roomView({ seats: ["Minh", "Lan"], cells: [4, 0], revision: 2 }), 0),
    );
    await wait(AI_MIN_DELAY_MS);
    expect(ready().canMove).toBe(true);
  });
});
