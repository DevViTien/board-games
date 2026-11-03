import { tictactoe, type TicTacToeMove, type TicTacToeState } from "@board-games/games";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createFakeEnvironment,
  createFakeSockets,
  type FakeSocket,
  type FakeSockets,
  ROOM_CODE,
  roomMessage,
  roomView,
} from "@/test/fake-realtime";

import { createOnlineTransport, type OnlineTransport } from "./online-transport";
import { createRoomConnection, type RoomConnection } from "./room-connection";
import type { ReadySnapshot, TransportEvent } from "./types";

type TicTacToeTransport = OnlineTransport<TicTacToeState, TicTacToeMove, never>;

let sockets: FakeSockets;
let connection: RoomConnection;
let transport: TicTacToeTransport;
let events: TransportEvent[];

/** Joins as seat `you` of a room with Minh and Lan, then starts the transport. */
function start(room = roomView({ seats: ["Minh", "Lan"] }), you: number | null = 0): FakeSocket {
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
  transport = createOnlineTransport({ definition: tictactoe, connection });
  events = [];
  transport.subscribe((event) => events.push(event));
  return socket;
}

function ready(): ReadySnapshot<TicTacToeState, TicTacToeMove> {
  const snapshot = transport.getSnapshot();
  if (snapshot.status !== "ready") throw new Error("still loading");
  return snapshot;
}

const lastSent = (socket: FakeSocket) => socket.sent.at(-1);

beforeEach(() => {
  vi.useFakeTimers();
  sockets = createFakeSockets();
});

afterEach(() => {
  transport.dispose();
  connection.dispose();
  vi.useRealTimers();
});

describe("online transport: the game", () => {
  it("rebuilds the game from the room's record", () => {
    // X centre, O top left, X bottom right: O to move.
    start(roomView({ seats: ["Minh", "Lan"], cells: [4, 0, 8], revision: 5 }), 1);

    const snapshot = ready();
    expect(snapshot.state.board).toEqual([1, null, null, null, 0, null, null, null, 0]);
    expect(snapshot.moveCount).toBe(3);
    expect(snapshot.currentPlayer).toBe(1);
    expect(snapshot.lastEntry).toEqual({ move: { cell: 8 } });
    expect(snapshot.lastMover).toBe(0);
    expect(snapshot.result).toBeNull();
  });

  it("shows this player's seat as theirs and the others as remote, by name", () => {
    start(roomView({ seats: ["Minh", null] }), 0);

    expect(ready()).toMatchObject({
      seats: [{ kind: "human" }, { kind: "remote", name: null }],
      viewer: 0,
    });
  });

  it("names the opponent and sees the board from this player's side", () => {
    start(roomView({ seats: ["Minh", "Lan"] }), 1);

    expect(ready()).toMatchObject({
      seats: [{ kind: "remote", name: "Minh" }, { kind: "human" }],
      viewer: 1,
      waitingFor: "opponent",
      canMove: false,
    });
  });

  it("lets the player move only on their turn, with everyone seated, while connected", () => {
    start(roomView({ seats: ["Minh", null] }), 0);
    expect(ready().canMove).toBe(false);

    sockets.last().receive(roomMessage(roomView({ seats: ["Minh", "Lan"], revision: 2 }), 0));
    expect(ready()).toMatchObject({ canMove: true, waitingFor: null, connection: "online" });

    sockets.last().lose();
    expect(ready()).toMatchObject({ canMove: false, connection: "reconnecting" });
  });

  it("locks the board once the game has a result, and allows a new game then only", () => {
    start(roomView({ seats: ["Minh", "Lan"], cells: [4, 0, 2, 1] }), 0);
    expect(ready().canStartNewGame).toBe(false);

    // X wins on the diagonal 2-4-6.
    sockets
      .last()
      .receive(
        roomMessage(roomView({ seats: ["Minh", "Lan"], cells: [4, 0, 2, 1, 6], revision: 2 }), 0),
      );

    expect(ready()).toMatchObject({
      result: { kind: "win", winners: [0] },
      canMove: false,
      canStartNewGame: true,
      waitingFor: null,
      legalMoves: [],
    });
  });

  it("never counts as a game in progress, and has no undo", () => {
    start(roomView({ seats: ["Minh", "Lan"], cells: [4, 0] }), 0);

    expect(ready()).toMatchObject({
      inProgress: false,
      supportsUndo: false,
      canUndo: false,
      canRedo: false,
    });
  });

  it.each([
    ["a corrupt record", roomView({ cells: [4, 4] })],
    ["another game's record", roomView({ record: { ...roomView().record, gameId: "chess" } })],
    ["a room of another game", { ...roomView(), gameId: "chess" }],
  ])("is broken by %s", (_name, room) => {
    start(room, 0);

    expect(transport.isBroken()).toBe(true);
    expect(transport.getSnapshot()).toEqual({ status: "loading" });
  });

  it("reports a broken room that arrives later, once, and stops following the room", () => {
    start(roomView({ seats: ["Minh", "Lan"] }), 0);

    sockets.last().receive(roomMessage(roomView({ cells: [4, 4], revision: 2 }), 0));
    expect(transport.isBroken()).toBe(true);
    expect(events).toEqual([{ type: "changed" }]);

    // Neither the connection changing nor a later room replays it: the page stops the connection.
    sockets.last().lose();
    sockets.last().receive(roomMessage(roomView({ seats: ["Minh", "Lan"], revision: 3 }), 0));
    expect(events).toEqual([{ type: "changed" }]);
    expect(transport.isBroken()).toBe(true);
  });
});

describe("online transport: requests", () => {
  it("sends a move at its place in the game, and locks the board until the server answers", () => {
    const socket = start(roomView({ seats: ["Minh", "Lan"], cells: [4, 0], gameNumber: 3 }), 0);

    transport.submit({ cell: 8 });

    expect(lastSent(socket)).toEqual({
      type: "move",
      gameNumber: 3,
      moveIndex: 2,
      move: { cell: 8 },
    });
    // Not shown before the server has recorded it.
    expect(ready()).toMatchObject({ canMove: false, moveCount: 2 });
    transport.submit({ cell: 7 });
    expect(
      socket.sent.filter((message) => (message as { type: string }).type === "move"),
    ).toHaveLength(1);

    socket.receive(
      roomMessage(
        roomView({ seats: ["Minh", "Lan"], cells: [4, 0, 8], revision: 2, gameNumber: 3 }),
        0,
      ),
    );
    expect(ready()).toMatchObject({ moveCount: 3, canMove: false, waitingFor: "opponent" });
    socket.receive(
      roomMessage(
        roomView({ seats: ["Minh", "Lan"], cells: [4, 0, 8, 1], revision: 3, gameNumber: 3 }),
        0,
      ),
    );
    expect(ready().canMove).toBe(true);
  });

  it("unlocks the board when the move is refused, and tells why", () => {
    const socket = start(roomView({ seats: ["Minh", "Lan"] }), 0);
    transport.submit({ cell: 4 });

    socket.receive({ type: "rejected", request: "move", code: "illegal-move" });

    expect(ready()).toMatchObject({ canMove: true, moveCount: 0 });
    expect(events).toContainEqual({ type: "rejected", code: "illegal-move" });
  });

  it.each(["not-your-turn", "game-over", "waiting-for-players", "not-seated"] as const)(
    "says nothing of %s: the room sent before it already shows why",
    (code) => {
      const socket = start(roomView({ seats: ["Minh", "Lan"] }), 0);
      transport.submit({ cell: 4 });

      socket.receive({ type: "rejected", request: "move", code });

      expect(events.filter((event) => event.type === "rejected")).toEqual([]);
      expect(ready().canMove).toBe(true);
    },
  );

  it("keeps the board locked while the room changes for something else than the move", () => {
    const socket = start(roomView({ seats: ["Minh", "Lan"], revision: 5 }), 0);
    transport.submit({ cell: 4 });

    // Lan comes back under a new name before the server handles the move.
    socket.receive(roomMessage(roomView({ seats: ["Minh", "Lan Anh"], revision: 6 }), 0));
    expect(ready()).toMatchObject({ canMove: false, seats: [{}, { name: "Lan Anh" }] });
    transport.submit({ cell: 0 });

    expect(socket.sent.filter((message) => (message as { type: string }).type === "move")).toEqual([
      { type: "move", gameNumber: 1, moveIndex: 0, move: { cell: 4 } },
    ]);
  });

  it("says nothing about a stale move: the room sent before it already shows what happened", () => {
    const socket = start(roomView({ seats: ["Minh", "Lan"] }), 0);
    transport.submit({ cell: 4 });

    socket.receive(
      roomMessage(roomView({ seats: ["Lan", "Minh"], revision: 4, gameNumber: 2 }), 1),
    );
    socket.receive({ type: "rejected", request: "move", code: "stale-move" });

    expect(events.filter((event) => event.type === "rejected")).toEqual([]);
    expect(ready()).toMatchObject({ viewer: 1, moveCount: 0 });
  });

  it("ignores a refused sit, which is the lobby's business", () => {
    const socket = start(roomView({ seats: ["Minh", "Lan"] }), 0);

    socket.receive({ type: "rejected", request: "sit", code: "not-seated" });

    expect(events.filter((event) => event.type === "rejected")).toEqual([]);
  });

  it("unlocks the board when the connection has synced again after a reconnection", async () => {
    const socket = start(roomView({ seats: ["Minh", "Lan"] }), 0);
    transport.submit({ cell: 4 });

    socket.lose();
    await vi.advanceTimersByTimeAsync(0);
    sockets.last().open();
    sockets.last().receive(roomMessage(roomView({ seats: ["Minh", "Lan"] }), 0));

    expect(ready()).toMatchObject({ canMove: true, moveCount: 0 });
  });

  it("renews the connection when a move is not answered within 8 s", async () => {
    const socket = start(roomView({ seats: ["Minh", "Lan"] }), 0);
    transport.submit({ cell: 4 });

    await vi.advanceTimersByTimeAsync(7999);
    expect(socket.closedByClient).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    expect(socket.closedByClient).toBe(true);
    expect(sockets.all).toHaveLength(2);
    // The greeting tells whether the move was recorded.
    sockets.last().open();
    sockets
      .last()
      .receive(roomMessage(roomView({ seats: ["Minh", "Lan"], cells: [4], revision: 2 }), 0));
    expect(ready()).toMatchObject({ moveCount: 1, canMove: false });
  });

  it("asks for a new game with the game's number, only once the game is over", () => {
    const socket = start(
      roomView({ seats: ["Minh", "Lan"], cells: [4, 0, 2, 1], gameNumber: 2 }),
      0,
    );

    transport.requestNewGame();
    expect(socket.sent.some((message) => (message as { type: string }).type === "rematch")).toBe(
      false,
    );

    socket.receive(
      roomMessage(
        roomView({ seats: ["Minh", "Lan"], cells: [4, 0, 2, 1, 6], revision: 2, gameNumber: 2 }),
        0,
      ),
    );
    transport.requestNewGame();
    transport.requestNewGame();

    expect(
      socket.sent.filter((message) => (message as { type: string }).type === "rematch"),
    ).toEqual([{ type: "rematch", gameNumber: 2 }]);
  });

  it("waits for the next game after asking for one, whatever else changes in the room", () => {
    const over = { seats: ["Minh", "Lan"], cells: [4, 0, 2, 1, 6], gameNumber: 2 } as const;
    const socket = start(roomView({ ...over, revision: 5 }), 0);
    transport.requestNewGame();

    socket.receive(roomMessage(roomView({ ...over, seats: ["Minh", "Lan Anh"], revision: 6 }), 0));
    transport.requestNewGame();
    expect(
      socket.sent.filter((message) => (message as { type: string }).type === "rematch"),
    ).toHaveLength(1);

    socket.receive(
      roomMessage(roomView({ seats: ["Lan Anh", "Minh"], gameNumber: 3, revision: 7 }), 1),
    );
    expect(ready()).toMatchObject({ moveCount: 0, viewer: 1, canStartNewGame: false });
  });

  it("sends nothing for undo or redo", () => {
    const socket = start(roomView({ seats: ["Minh", "Lan"], cells: [4, 0] }), 0);
    const sent = socket.sent.length;

    transport.requestUndo();
    transport.requestRedo();

    expect(socket.sent).toHaveLength(sent);
  });

  it("stops following the room once disposed", () => {
    const socket = start(roomView({ seats: ["Minh", "Lan"] }), 0);
    const before = transport.getSnapshot();

    transport.dispose();
    socket.receive(roomMessage(roomView({ seats: ["Minh", "Lan"], cells: [4], revision: 2 }), 0));

    expect(transport.getSnapshot()).toBe(before);
    expect(events).toEqual([]);
  });
});
