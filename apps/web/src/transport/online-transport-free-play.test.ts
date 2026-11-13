import * as engine from "@board-games/engine";
import { createSession, fromRecord, type GameRecord, toRecord } from "@board-games/engine";
import { jellyCrew, type JellyCrewMove, type JellyCrewState } from "@board-games/games";
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

// Đội gom thạch online (change `add-jelly-crew-game`, design §10.2): every seat moves at any time.

vi.mock("@board-games/engine", async (importOriginal) => {
  const actual = await importOriginal<typeof engine>();
  return { ...actual, fromRecord: vi.fn(actual.fromRecord) };
});

type CrewTransport = OnlineTransport<JellyCrewState, JellyCrewMove, never>;

let sockets: FakeSockets;
let connection: RoomConnection;
let transport: CrewTransport;
let events: TransportEvent[];

function record(moves: readonly JellyCrewMove[]): GameRecord {
  const created = createSession(jellyCrew, { playerCount: 2 });
  if (!created.ok) throw new Error(created.error);
  return { ...toRecord(created.value), entries: moves.map((move) => ({ move })) };
}

/** A room of Minh (seat 0) and Lan (seat 1) with `moves` played. */
function crewRoom(moves: readonly JellyCrewMove[], extra: Parameters<typeof roomView>[0] = {}) {
  return roomView({
    seats: ["Minh", "Lan"],
    record: record(moves),
    revision: moves.length + 1,
    ...extra,
  });
}

/** Joins as seat `you` (Lan by default), then starts the transport. */
function start(room = crewRoom([]), you = 1): FakeSocket {
  connection = createRoomConnection({
    url: "ws://test",
    code: ROOM_CODE,
    getIdentity: () => ({ playerId: "player-0123456789abcdef", name: "Lan" }),
    openSocket: sockets.openSocket,
    environment: createFakeEnvironment(),
  });
  const socket = sockets.last();
  socket.open();
  socket.receive(roomMessage(room, you));
  transport = createOnlineTransport({ definition: jellyCrew, connection });
  events = [];
  transport.subscribe((event) => events.push(event));
  return socket;
}

function ready(): ReadySnapshot<JellyCrewState, JellyCrewMove> {
  const snapshot = transport.getSnapshot();
  if (snapshot.status !== "ready") throw new Error("still loading");
  return snapshot;
}

const movesSent = (socket: FakeSocket) =>
  socket.sent.filter((message) => (message as { type: string }).type === "move");

beforeEach(() => {
  vi.useFakeTimers();
  sockets = createFakeSockets();
});

afterEach(() => {
  transport.dispose();
  connection.dispose();
  vi.useRealTimers();
});

describe("Chơi game đi tự do online", () => {
  it("lets this player move at once, with nobody to wait for and no turn clock", () => {
    start(crewRoom(["0D"], { turnIdleMs: 400_000 }));
    expect(ready()).toMatchObject({
      canMove: true,
      waitingFor: null,
      turn: null,
      freePlay: true,
      lastMover: 0,
    });
  });

  it("Hai người cùng đi: another's move does not answer this one; this seat's own does", () => {
    const socket = start();
    transport.submit("1D");
    expect(ready().canMove).toBe(false);

    // Minh's step reaches the server first: Lan's move is still on its way.
    socket.receive(roomMessage(crewRoom(["0D"]), 1));
    expect(ready()).toMatchObject({ canMove: false, moveCount: 1 });

    socket.receive(roomMessage(crewRoom(["0D", "1D"]), 1));
    expect(ready()).toMatchObject({ canMove: true, moveCount: 2, lastMover: 1 });
    expect(movesSent(socket)).toEqual([{ type: "move", gameNumber: 1, moveIndex: 0, move: "1D" }]);
  });

  it("Bàn đổi trước khi nước tới server: says nothing of a refusal another's move explains", () => {
    const socket = start();
    transport.submit("1D");
    socket.receive(roomMessage(crewRoom(["0D"]), 1));
    socket.receive({ type: "rejected", request: "move", code: "illegal-move" });

    expect(events.filter((event) => event.type === "rejected")).toEqual([]);
    expect(ready().canMove).toBe(true);
  });

  it("still tells a refusal nothing explains", () => {
    const socket = start();
    transport.submit("1D");
    socket.receive({ type: "rejected", request: "move", code: "illegal-move" });

    expect(events).toContainEqual({ type: "rejected", code: "illegal-move" });
  });

  it("adds the moves received to the game on screen instead of replaying it, to the same game", () => {
    const socket = start(crewRoom(["0D", "1D"]));
    vi.mocked(engine.fromRecord).mockClear();

    socket.receive(roomMessage(crewRoom(["0D", "1D", "0R", "1D"]), 1));

    expect(engine.fromRecord).not.toHaveBeenCalled();
    const rebuilt = fromRecord(jellyCrew, record(["0D", "1D", "0R", "1D"]));
    if (!rebuilt.ok) throw new Error(rebuilt.error);
    expect(ready().state).toEqual(rebuilt.value.states.at(-1));
    expect(ready().moveCount).toBe(4);
  });

  it("replays a record that is not the one on screen with moves added", () => {
    const socket = start(crewRoom(["0D", "1D"]));
    vi.mocked(engine.fromRecord).mockClear();

    socket.receive(roomMessage(crewRoom(["1D", "0D", "0R"]), 1));

    expect(engine.fromRecord).toHaveBeenCalled();
    expect(ready().moveCount).toBe(3);
  });

  it("shows several moves received together at once, and lets this player move", () => {
    const socket = start(crewRoom(["0D"]));
    socket.receive(roomMessage(crewRoom(["0D", "0R", "1D", "1D"]), 1));
    expect(ready()).toMatchObject({ moveCount: 4, canMove: true });
  });

  it("passes the game's time on from the room", () => {
    start(crewRoom([], { gameTime: { startedAt: 1000, endedAt: null } }));
    expect(ready().gameTime).toEqual({ startedAt: 1000, endedAt: null });
  });
});
