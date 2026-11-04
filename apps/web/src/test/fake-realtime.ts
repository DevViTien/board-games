import type { GameRecord, PlayerIndex } from "@board-games/engine";
import type { RoomCode, RoomView, SeatView, ServerMessage } from "@board-games/protocol";

import type { ConnectionEnvironment, EnvironmentEvent } from "@/transport/room-connection";
import type { ClientSocket, OpenSocket, SocketHandlers } from "@/transport/socket";

/** A socket the test drives from the server's side, recording what the client sent. */
export interface FakeSocket extends ClientSocket {
  readonly url: string;
  /** Messages sent by the client, decoded. */
  readonly sent: unknown[];
  readonly closedByClient: boolean;
  /** Answers each `ping` with a `pong` at once, as the server does; on by default. */
  answerPings: boolean;
  /** The connection opens. */
  open(this: void): void;
  /** The server sends a message (or a raw frame, for broken data). */
  receive(this: void, message: ServerMessage | string): void;
  /** The connection is closed from the server's side or lost (`1006`). */
  lose(this: void, code?: number): void;
}

export interface FakeSockets {
  readonly openSocket: OpenSocket;
  readonly all: readonly FakeSocket[];
  /** The socket opened last. */
  last(this: void): FakeSocket;
}

export function isPing(message: unknown): boolean {
  return (
    typeof message === "object" && message !== null && "type" in message && message.type === "ping"
  );
}

export function createFakeSockets(): FakeSockets {
  const all: FakeSocket[] = [];
  const openSocket: OpenSocket = (url: string, handlers: SocketHandlers) => {
    const sent: unknown[] = [];
    let closedByClient = false;
    const socket: FakeSocket = {
      url,
      sent,
      get closedByClient() {
        return closedByClient;
      },
      answerPings: true,
      send: (data) => {
        const message: unknown = JSON.parse(data);
        sent.push(message);
        if (socket.answerPings && isPing(message))
          handlers.onMessage(JSON.stringify({ type: "pong" }));
      },
      close: () => {
        closedByClient = true;
      },
      open: () => {
        handlers.onOpen();
      },
      receive: (message) => {
        handlers.onMessage(typeof message === "string" ? message : JSON.stringify(message));
      },
      lose: (code = 1006) => {
        handlers.onClose(code);
      },
    };
    all.push(socket);
    return socket;
  };
  return {
    openSocket,
    all,
    last: () => {
      const socket = all.at(-1);
      if (socket === undefined) throw new Error("No socket was opened");
      return socket;
    },
  };
}

export interface FakeEnvironment extends ConnectionEnvironment {
  setVisible(this: void, visible: boolean): void;
  emit(this: void, event: EnvironmentEvent): void;
}

/** A page that is visible until told otherwise; its clock is `Date.now`, faked with the timers. */
export function createFakeEnvironment(): FakeEnvironment {
  let visible = true;
  const listeners = new Set<(event: EnvironmentEvent) => void>();
  const emit = (event: EnvironmentEvent) => {
    for (const listener of listeners) listener(event);
  };
  return {
    isVisible: () => visible,
    now: () => Date.now(),
    listen: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setVisible: (next) => {
      visible = next;
      emit("visibility");
    },
    emit,
  };
}

export const ROOM_CODE = "ABC234" as RoomCode;

/** An AI seat in `roomView`, where a string is a person by name. */
export const AI = { kind: "ai" } as const;

interface RoomOptions {
  readonly revision?: number;
  readonly gameNumber?: number;
  /** A person by name, or a seat as the server sends it (an AI seat, a stand-in). */
  readonly seats?: readonly (string | SeatView | null)[];
  /** The host's seat; the first by default. */
  readonly host?: PlayerIndex | null;
  /** Tic-tac-toe cells played, X first. */
  readonly cells?: readonly number[];
  readonly record?: GameRecord;
  /** How long the turn has lasted when the room is sent; none by default. */
  readonly turnIdleMs?: number | null;
}

/** A room as the server sends it: Tic-tac-toe, or the game of `record`. */
export function roomView({
  revision = 1,
  gameNumber = 1,
  seats = ["Minh", null],
  host = 0,
  cells = [],
  record,
  turnIdleMs = null,
}: RoomOptions = {}): RoomView {
  return {
    code: ROOM_CODE,
    gameId: record?.gameId ?? "tictactoe",
    revision,
    gameNumber,
    seats: seats.map((seat) =>
      seat === null || typeof seat === "object"
        ? seat
        : { kind: "human", name: seat, standIn: false },
    ),
    host,
    record: record ?? {
      version: 1,
      gameId: "tictactoe",
      playerCount: 2,
      options: {},
      entries: cells.map((cell) => ({ move: { cell } })),
    },
    turnIdleMs,
  };
}

export function roomMessage(room: RoomView, you: PlayerIndex | null): ServerMessage {
  return { type: "room", room, you };
}
