import {
  currentState,
  ENGINE_ERROR,
  fromRecord,
  type GameDefinition,
  lastEntry,
  type PlayerIndex,
  type Session,
  sessionResult,
} from "@board-games/engine";
import type { RejectionCode, RoomView } from "@board-games/protocol";

import type { RoomConnection } from "./room-connection";
import {
  CONNECTION_STATUS,
  type ConnectionStatus,
  type PlaySnapshot,
  type SeatView,
  type Transport,
  type TransportEvent,
} from "./types";

/** A move or a new game sent and not yet answered for this long: the connection is renewed. */
const ANSWER_LIMIT_MS = 8000;

const LOADING = { status: "loading" } as const;
const HUMAN: SeatView = { kind: "human" };

/**
 * Refusals worth telling the player: the rules turned the move down. The others (`stale-move`,
 * `not-your-turn`, `game-over`, `waiting-for-players`…) come with the room that already shows why,
 * so the play screen never has to know the server's codes.
 */
function isRuleRefusal(code: RejectionCode): boolean {
  return code !== ENGINE_ERROR.GameOver && Object.values<string>(ENGINE_ERROR).includes(code);
}

/** Where in the room's games a request was sent: settled once that game moves on or ends. */
interface Pending {
  readonly gameNumber: number;
  /** Moves the game had when the request was sent. */
  readonly moveIndex: number;
}

export interface OnlineTransportOptions<State, Move, Outcome, Options extends object> {
  readonly definition: GameDefinition<State, Move, Outcome, Options>;
  /** The room's connection; created and disposed by the caller, which may outlive the transport. */
  readonly connection: RoomConnection;
}

export interface OnlineTransport<State, Move, Outcome> extends Transport<State, Move, Outcome> {
  /**
   * The room cannot be rebuilt into a game: its record is corrupt, or of another game. Reported
   * with a "changed" event, and final: the transport stops following the room, and the page shows
   * an error instead of the play screen and stops the connection.
   */
  isBroken(this: void): boolean;
}

/**
 * Online play, seen from one seat. The server owns the game: every room it sends is replayed from
 * its record into a session (a game is its list of moves), and a move is shown only once the server
 * has recorded it, never before (design of `add-online-play`, §4). Until the server answers a move,
 * the board is locked, so a second click cannot send a second move.
 */
// `Outcome` defaults to `never`, as in the engine and the local transport.
export function createOnlineTransport<
  State,
  Move,
  Outcome = never,
  Options extends object = Record<string, never>,
>({
  definition,
  connection,
}: OnlineTransportOptions<State, Move, Outcome, Options>): OnlineTransport<State, Move, Outcome> {
  type GameSession = Session<State, Move, Outcome, Options>;

  let snapshot: PlaySnapshot<State, Move, Outcome> = LOADING;
  let room: RoomView | null = null;
  let session: GameSession | null = null;
  let broken = false;
  // The place in the game a request was sent at, until the server answers it one way or another.
  // Not the room's revision: a rename or someone sitting down changes it without answering.
  let pending: Pending | null = null;
  let pendingTimer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  const listeners = new Set<(event: TransportEvent) => void>();

  function emit(event: TransportEvent): void {
    if (disposed) return;
    for (const listener of listeners) listener(event);
  }

  function settle(): void {
    pending = null;
    if (pendingTimer !== undefined) clearTimeout(pendingTimer);
    pendingTimer = undefined;
  }

  function waitForAnswer(sentAt: Pending): void {
    settle();
    pending = sentAt;
    // No answer at all: the connection may be half-dead. The greeting after reconnecting brings
    // the room as the server has it, which tells whether the move was recorded.
    pendingTimer = setTimeout(() => {
      pendingTimer = undefined;
      connection.reconnect();
    }, ANSWER_LIMIT_MS);
  }

  function rebuild(next: RoomView): GameSession | null {
    if (next.gameId !== definition.id) return null;
    const rebuilt = fromRecord(definition, next.record);
    return rebuilt.ok ? rebuilt.value : null;
  }

  /** The seat that played the last move: the player to move before it. */
  function lastMover(current: GameSession): PlayerIndex | null {
    const before = current.cursor > 0 ? current.states[current.cursor - 1] : undefined;
    return before === undefined ? null : definition.currentPlayer(before);
  }

  function show(
    current: GameSession,
    view: RoomView,
    you: PlayerIndex | null,
    status: ConnectionStatus,
  ): void {
    const state = currentState(current);
    const result = sessionResult(definition, current);
    const currentPlayer = definition.currentPlayer(state);
    const seats: SeatView[] = view.seats.map((seat, index) =>
      index === you ? HUMAN : { kind: "remote", name: seat?.name ?? null },
    );
    const full = view.seats.every((seat) => seat !== null);
    snapshot = {
      status: "ready",
      state,
      legalMoves: result === null ? definition.legalMoves(state) : [],
      currentPlayer,
      result,
      lastEntry: lastEntry(current),
      lastMover: lastMover(current),
      moveCount: current.cursor,
      canUndo: false,
      canRedo: false,
      canMove:
        status === CONNECTION_STATUS.Online &&
        full &&
        result === null &&
        currentPlayer === you &&
        pending === null,
      viewer: you,
      seats,
      waitingFor: result === null && seats[currentPlayer]?.kind === "remote" ? "opponent" : null,
      inProgress: false,
      supportsUndo: false,
      canStartNewGame: result !== null,
      connection: status,
    };
  }

  /** The game has moved on from where the request was sent: the request is answered. */
  function answers(next: RoomView, sentAt: Pending): boolean {
    return next.gameNumber !== sentAt.gameNumber || next.record.entries.length > sentAt.moveIndex;
  }

  function refresh(): void {
    // A broken room is not replayed again on every change of the connection.
    if (disposed || broken) return;
    const { room: latest, you, status } = connection.getSnapshot();
    if (latest === null) return;
    if (latest !== room) {
      const rebuilt = rebuild(latest);
      if (rebuilt === null) {
        broken = true;
        settle();
        emit({ type: "changed" });
        return;
      }
      room = latest;
      session = rebuilt;
      if (pending !== null && answers(latest, pending)) settle();
    }
    if (session === null) return;
    show(session, latest, you, status);
    emit({ type: "changed" });
  }

  const unsubscribe = [
    connection.subscribe(refresh),
    connection.onSynced(() => {
      settle();
      refresh();
    }),
    connection.onRejected(({ request, code }) => {
      if (request === "sit") return;
      settle();
      refresh();
      if (isRuleRefusal(code)) emit({ type: "rejected", code });
    }),
  ];
  refresh();

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    isBroken: () => broken,
    submit: (move) => {
      if (disposed || snapshot.status !== "ready" || !snapshot.canMove) return;
      if (room === null || session === null) return;
      const sent = connection.send({
        type: "move",
        gameNumber: room.gameNumber,
        moveIndex: session.cursor,
        move,
      });
      if (!sent) return;
      waitForAnswer({ gameNumber: room.gameNumber, moveIndex: session.cursor });
      refresh();
    },
    requestNewGame: () => {
      if (disposed || room === null || session === null || pending !== null) return;
      if (snapshot.status !== "ready" || snapshot.result === null) return;
      if (!connection.send({ type: "rematch", gameNumber: room.gameNumber })) return;
      // The game is over and gets no more moves: only the next game's number answers.
      waitForAnswer({ gameNumber: room.gameNumber, moveIndex: session.cursor });
      refresh();
    },
    // An online game has no undo: the opponent would have to agree (later, with draw offers).
    requestUndo: () => undefined,
    requestRedo: () => undefined,
    dispose: () => {
      disposed = true;
      settle();
      for (const stop of unsubscribe) stop();
      listeners.clear();
    },
  };
}
