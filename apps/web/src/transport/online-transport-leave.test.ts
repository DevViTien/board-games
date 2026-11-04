import type { AnyGameDefinition } from "@board-games/engine";
import { ludo, LUDO_DEFAULT_OPTIONS, tictactoe } from "@board-games/games";
import type { RoomView } from "@board-games/protocol";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AI,
  createFakeEnvironment,
  createFakeSockets,
  type FakeSockets,
  ROOM_CODE,
  roomMessage,
  roomView,
} from "@/test/fake-realtime";

import { createOnlineTransport, type OnlineTransport } from "./online-transport";
import { createRoomConnection, type RoomConnection } from "./room-connection";
import type { ReadySnapshot, TransportEvent } from "./types";

// Resigning and claiming a turn abandoned, online (change `add-resign-and-abandon`).

type AnyTransport = OnlineTransport<unknown, unknown, unknown>;

const MINUTE = 60_000;
const NOW = 10_000_000;

let sockets: FakeSockets;
let connection: RoomConnection;
let transport: AnyTransport;
let events: TransportEvent[];

function start(room: RoomView, you: number | null, definition: AnyGameDefinition = tictactoe) {
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
  transport = createOnlineTransport({ definition, connection });
  events = [];
  transport.subscribe((event) => events.push(event));
  return socket;
}

function ready(): ReadySnapshot<unknown, unknown, unknown> {
  const snapshot = transport.getSnapshot();
  if (snapshot.status !== "ready") throw new Error("still loading");
  return snapshot;
}

/** A Cờ cá ngựa room for three before the first roll. */
function ludoRoom(seats: RoomView["seats"], turnIdleMs: number | null = 0): RoomView {
  return roomView({
    seats,
    turnIdleMs,
    record: {
      version: 1,
      gameId: "ludo",
      playerCount: seats.length,
      options: LUDO_DEFAULT_OPTIONS,
      entries: [],
    },
  });
}

const person = (name: string, standIn = false) => ({ kind: "human", name, standIn }) as const;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  sockets = createFakeSockets();
});

afterEach(() => {
  transport.dispose();
  connection.dispose();
  vi.useRealTimers();
});

describe("online transport: resigning", () => {
  it("offers to resign a two-player game for a loss, and sends it", () => {
    const socket = start(roomView({ seats: ["Minh", "Lan"], cells: [4], turnIdleMs: 0 }), 0);

    expect(ready().resign).toEqual({ outcome: "loss", available: true });
    transport.resign();

    expect(socket.sent.at(-1)).toEqual({ type: "resign", gameNumber: 1 });
  });

  it("Hỏi đầu hàng Cờ cá ngựa hai người: a two-seat Cờ cá ngựa room ends the game too", () => {
    start(ludoRoom([person("Minh"), person("Lan")]), 0, ludo);

    expect(ready().resign).toEqual({ outcome: "loss", available: true });
  });

  it("offers a stand-in in a Cờ cá ngựa room for three", () => {
    start(ludoRoom([person("Minh"), person("Lan"), person("An")]), 1, ludo);

    expect(ready().resign).toEqual({ outcome: "stand-in", available: true });
  });

  it("Đang kết nối lại: keeps the option but not available while reconnecting", () => {
    const socket = start(roomView({ seats: ["Minh", "Lan"], turnIdleMs: 0 }), 0);

    socket.lose();
    transport.resign();

    expect(ready().resign).toEqual({ outcome: "loss", available: false });
    expect(
      socket.sent.filter((message) => (message as { type: string }).type === "resign"),
    ).toEqual([]);
  });

  it("has no resigning while the room waits for players", () => {
    start(roomView({ seats: ["Minh", null] }), 0);

    expect(ready().resign).toBeNull();
  });

  it("Không có nút khi ván đã kết thúc: no resigning once the game has a result", () => {
    start(roomView({ seats: ["Minh", "Lan"], cells: [4, 0, 2, 1, 6] }), 0);

    expect(ready().result).not.toBeNull();
    expect(ready().resign).toBeNull();
    expect(ready().turn).toBeNull();
  });

  it("Phòng bản trước đã xong ván: ignores a turn's duration sent with a finished game", () => {
    start(roomView({ seats: ["Minh", "Lan"], cells: [4, 0, 2, 1, 6], turnIdleMs: 6 * MINUTE }), 1);

    expect(ready().result).not.toBeNull();
    expect(ready().turn).toBeNull();
  });

  it("shows a resigned game as won by the opponent", () => {
    const view = roomView({ seats: ["Minh", "Lan"], cells: [4] });
    start({ ...view, record: { ...view.record, ending: { reason: "resigned", player: 1 } } }, 0);

    expect(ready().result).toEqual({ kind: "win", winners: [0], reason: "resigned" });
    expect(ready().canStartNewGame).toBe(true);
  });
});

describe("online transport: a seat the AI stands in for", () => {
  it("Đầu hàng Cờ cá ngựa: shows this player's own seat played by the AI, and locks the board", () => {
    start(ludoRoom([person("Lan"), person("Minh", true), person("An")]), 1, ludo);

    expect(ready().seats[1]).toEqual({ kind: "ai", level: "medium", standInFor: "Minh" });
    expect(ready().resign).toBeNull();
    expect(ready().canMove).toBe(false);
  });

  it("shows another player's seat played by the AI under their name, its turn the AI's", () => {
    start(ludoRoom([person("Lan", true), person("Minh"), person("An")]), 1, ludo);

    expect(ready().seats[0]).toEqual({ kind: "ai", level: "medium", standInFor: "Lan" });
    expect(ready().waitingFor).toBe("ai");
    expect(ready().turn).toBeNull();
  });
});

describe("online transport: the turn's clock", () => {
  it("tells whose turn runs since when, from the server's duration", () => {
    start(roomView({ seats: ["Minh", "Lan"], cells: [4], turnIdleMs: 2 * MINUTE }), 0);

    expect(ready().turn).toEqual({
      player: 1,
      gameNumber: 1,
      moveIndex: 1,
      startedAt: NOW - 2 * MINUTE,
      claim: "win",
      available: true,
    });
  });

  it("gives the player to move their own turn's clock, without a claim", () => {
    start(roomView({ seats: ["Minh", "Lan"], cells: [4], turnIdleMs: MINUTE }), 1);

    expect(ready().turn).toEqual({
      player: 1,
      gameNumber: 1,
      moveIndex: 1,
      startedAt: NOW - MINUTE,
      claim: null,
      available: true,
    });
  });

  it("Cho máy chơi thay: a claim in a Cờ cá ngựa room for three hands the seat to the AI", () => {
    start(ludoRoom([person("Lan"), person("Minh"), person("An")], 6 * MINUTE), 1, ludo);

    expect(ready().turn?.claim).toBe("stand-in");
  });

  it("ends the game when the AI already plays this player's seat and the last person left", () => {
    start(ludoRoom([person("Lan"), person("Minh", true), person("An", true)], 6 * MINUTE), 1, ludo);

    expect(ready().turn).toMatchObject({ player: 0, claim: "end" });
  });

  it("keeps the turn's start when the connection only changes its status", () => {
    const socket = start(roomView({ seats: ["Minh", "Lan"], cells: [4], turnIdleMs: MINUTE }), 0);
    const startedAt = ready().turn?.startedAt;

    vi.setSystemTime(NOW + 30_000);
    socket.lose();
    expect(ready().turn).toMatchObject({ startedAt, available: false });
  });

  it("has no turn while moves received together are being shown", () => {
    const socket = start(ludoRoom([person("Minh"), AI, person("Lan")], 0), 0, ludo);
    // Minh rolls 3 and the AI rolls 3 in the same write: Lan to move, shown one at a time.
    socket.receive(
      roomMessage(
        {
          ...ludoRoom([person("Minh"), AI, person("Lan")], 0),
          revision: 2,
          record: {
            version: 1,
            gameId: "ludo",
            playerCount: 3,
            options: LUDO_DEFAULT_OPTIONS,
            entries: [
              { move: { type: "roll" }, outcome: 3 },
              { move: { type: "roll" }, outcome: 3 },
            ],
          },
        },
        0,
      ),
    );

    expect(ready().moveCount).toBe(1);
    expect(ready().turn).toBeNull();
  });

  it("sends a claim for the turn's position, and says so when the server finds it too early", () => {
    const lan = start(
      roomView({ seats: ["Minh", "Lan"], cells: [4, 0], revision: 7, turnIdleMs: 5 * MINUTE }),
      1,
    );

    transport.claimAbandoned();
    expect(lan.sent.at(-1)).toEqual({ type: "claim-abandoned", gameNumber: 1, moveIndex: 2 });

    // The room again first, its turn reckoned anew, then the refusal.
    vi.setSystemTime(NOW + 1000);
    lan.receive(
      roomMessage(
        roomView({ seats: ["Minh", "Lan"], cells: [4, 0], revision: 7, turnIdleMs: 4 * MINUTE }),
        1,
      ),
    );
    lan.receive({ type: "rejected", request: "claim-abandoned", code: "not-abandoned" });

    expect(events).toContainEqual({ type: "claim-refused" });
    expect(ready().turn?.startedAt).toBe(NOW + 1000 - 4 * MINUTE);
  });

  it("keeps a move in flight waiting when a resign is refused", () => {
    const socket = start(roomView({ seats: ["Minh", "Lan"], turnIdleMs: 0 }), 0);
    transport.submit({ cell: 4 });
    expect(ready().canMove).toBe(false);

    socket.receive({ type: "rejected", request: "resign", code: "game-over" });

    expect(ready().canMove).toBe(false);
    expect(events).not.toContainEqual({ type: "claim-refused" });
  });
});
