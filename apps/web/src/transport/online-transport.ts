import {
  AI_LEVEL,
  applyEntry,
  currentState,
  ENGINE_ERROR,
  fromRecord,
  type GameDefinition,
  lastEntry,
  moverOf as moverOfMove,
  type PlayerIndex,
  type Session,
  sessionResult,
} from "@board-games/engine";
import {
  ABANDON_CLAIM,
  abandonClaim,
  gameHasAi,
  LEAVE_OUTCOME,
  leaveOutcome,
  type RejectionCode,
  ROOM_ERROR,
  type RoomView,
  SEAT_PLAY,
  type SeatPlay,
  seatPlays,
} from "@board-games/protocol";

import {
  AI_MIN_DELAY_MS,
  AI_RESULT_DELAY_MS,
  AI_SETTLE_DELAY_MS,
  AI_THROW_DELAY_MS,
} from "./ai-timing";
import type { RoomConnection } from "./room-connection";
import {
  CONNECTION_STATUS,
  type ConnectionStatus,
  type PlaySnapshot,
  type ResignOption,
  type SeatView,
  type Transport,
  type TransportEvent,
  type TurnClock,
} from "./types";

/** A move or a new game sent and not yet answered for this long: the connection is renewed. */
const ANSWER_LIMIT_MS = 8000;

const LOADING = { status: "loading" } as const;
const HUMAN: SeatView = { kind: "human" };
/** An AI seat of the room, played by the server at this level (design §3). */
const AI_SEAT: SeatView = { kind: "ai", level: AI_LEVEL.Medium };

/**
 * Refusals worth telling the player: the rules turned the move down. The others (`stale-move`,
 * `not-your-turn`, `game-over`, `waiting-for-players`…) come with the room that already shows why,
 * so the play screen never has to know the server's codes.
 */
function isRuleRefusal(code: RejectionCode): boolean {
  return code !== ENGINE_ERROR.GameOver && Object.values<string>(ENGINE_ERROR).includes(code);
}

/**
 * Whether two copies of a room hold the same game. The whole record, not its length and ending: a
 * record corrupted at the same length must still be found out, and `ending` has no identity.
 */
function sameGame(one: RoomView, other: RoomView): boolean {
  return (
    one.gameNumber === other.gameNumber &&
    JSON.stringify(one.record) === JSON.stringify(other.record)
  );
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
 *
 * A room may bring several new moves at once: the AI seats the server plays answer in the same
 * write as the move before them. Those are shown one at a time, each no sooner than the board's
 * animation of the one before it, at the pace of the AI on this device, with the board locked until
 * the last one shows (design of `add-room-ai-seats`, §4). After a roll of this player's own seat,
 * whose throw plays out on the board, the next move by anyone else waits `AI_THROW_DELAY_MS`, also
 * when it comes in a later update (design of `redesign-ludo-play`, §7). Entering the room,
 * reloading or reconnecting shows the latest state at once.
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
  /** This player's seat in `room`: kept with it, as a new game moves everyone one seat on. */
  let seat: PlayerIndex | null = null;
  /**
   * A new game that arrived while the moves of the one before were still being shown: it waits
   * until they all are, its result included, so nothing of the old game is skipped.
   */
  let queued: {
    readonly room: RoomView;
    readonly session: GameSession;
    readonly seat: PlayerIndex | null;
  } | null = null;
  /** Moves of `session` on screen; behind its end while moves received together are shown. */
  let shown = 0;
  let revealTimer: ReturnType<typeof setTimeout> | undefined;
  /** `revealTimer` is only the pause after a roll thrown here, with nothing waiting behind it. */
  let pausing = false;
  /** The `shown` the pause after a roll thrown here ran for, so it runs once. */
  let pausedFor = -1;
  /**
   * The pause after the last roll thrown here, by game and move, and when it ends: kept across a
   * reconnection, so the others' moves still wait for the throw if that roll is still the latest.
   */
  let throwPause: { gameNumber: number; shown: number; endsAt: number } | null = null;
  /** The connection's status when the room was last read: a new greeting shows the latest state. */
  let lastStatus: ConnectionStatus | null = null;
  /** The clock of the turn when the room was last read, to tell whether a new copy changed it. */
  let lastTurnClock = connection.getSnapshot().turnClock;
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

  function stopRevealing(): void {
    if (revealTimer !== undefined) clearTimeout(revealTimer);
    revealTimer = undefined;
    pausing = false;
    pausedFor = -1;
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

  /**
   * `next` as `base` (the game of `baseRoom`) with only the moves added since, or `null` when it is
   * not that: another game, a record that differs before its new moves, an ending. The same game
   * as `rebuild` gives, without replaying every move again on each one received (a game played
   * freely receives many; design of `add-jelly-crew-game` §10.2).
   */
  function extend(
    base: GameSession | null,
    baseRoom: RoomView | null,
    next: RoomView,
  ): GameSession | null {
    if (base === null || baseRoom === null || next.gameId !== definition.id) return null;
    const before = baseRoom.record;
    const after = next.record;
    if (
      next.gameNumber !== baseRoom.gameNumber ||
      before.ending !== undefined ||
      after.ending !== undefined ||
      base.entries.length !== before.entries.length ||
      base.cursor !== base.entries.length ||
      after.entries.length < before.entries.length ||
      JSON.stringify({ ...after, entries: [] }) !== JSON.stringify({ ...before, entries: [] }) ||
      JSON.stringify(after.entries.slice(0, before.entries.length)) !==
        JSON.stringify(before.entries)
    ) {
      return null;
    }
    let extended = base;
    for (const entry of after.entries.slice(before.entries.length)) {
      const applied = applyEntry(definition, extended, entry);
      if (!applied.ok) return null;
      extended = applied.value;
    }
    return extended;
  }

  /** The seat that made the `index`-th move of a game (from 0): the seat it names, or the player to move. */
  function moverOf(current: GameSession, index: number): PlayerIndex | null {
    const before = current.states[index];
    const entry = current.entries[index];
    return before === undefined || entry === undefined
      ? null
      : moverOfMove(definition, before, entry.move);
  }

  /**
   * Whether the move just shown (the `shown`-th) is a roll of this player's own seat, thrown on
   * this board: not while the server plays the seat for them (`standIn`).
   */
  function thrownHere(current: GameSession): boolean {
    const entry = current.entries[shown - 1];
    if (entry === undefined || !("outcome" in entry) || seat === null) return false;
    if (moverOf(current, shown - 1) !== seat) return false;
    const own = room?.seats[seat];
    return !(own?.kind === "human" && own.standIn);
  }

  /**
   * How long the move just shown (the `shown`-th) stays alone on screen before the next: never
   * shorter than the board's animation of it, longer after a roll, as the AI's pace on this device,
   * and longest after a roll thrown here. A game without random outcomes animates nothing long, and
   * keeps the AI's shortest delay.
   */
  function revealDelay(current: GameSession): number {
    if (definition.outcomes === undefined) return AI_MIN_DELAY_MS;
    const entry = current.entries[shown - 1];
    if (entry === undefined || !("outcome" in entry)) return AI_SETTLE_DELAY_MS;
    return thrownHere(current) ? AI_THROW_DELAY_MS : AI_RESULT_DELAY_MS;
  }

  /** The game waiting behind the one on screen now replaces it, from its empty board. */
  function adoptQueued(): void {
    if (queued === null) return;
    ({ room, session, seat } = queued);
    queued = null;
    shown = 0;
    pausedFor = -1;
  }

  /**
   * Shows the next move received after a pause, and so on until the last; then the new game
   * waiting behind it, if any. After a roll thrown here, the pause runs even with nothing behind
   * it yet: a move that comes meanwhile waits for its end.
   */
  function scheduleReveal(): void {
    if (revealTimer !== undefined || session === null) return;
    const more = shown < session.cursor || queued !== null;
    const pause = !more && pausedFor !== shown && thrownHere(session);
    if (!more && !pause) return;
    const delay = revealDelay(session);
    if (thrownHere(session)) {
      pausedFor = shown;
      if (room !== null) {
        throwPause = { gameNumber: room.gameNumber, shown, endsAt: Date.now() + delay };
      }
    }
    pausing = pause;
    startRevealTimer(delay);
  }

  function startRevealTimer(delay: number): void {
    revealTimer = setTimeout(() => {
      revealTimer = undefined;
      pausing = false;
      if (session !== null && shown < session.cursor) shown += 1;
      else adoptQueued();
      render();
      scheduleReveal();
    }, delay);
  }

  /**
   * After the latest state was shown at once (a reconnection): if it ends with the roll thrown
   * here whose pause had not run out, the rest of the pause runs, so a move coming next still
   * waits for the throw on the board.
   */
  function resumeThrowPause(): void {
    if (throwPause === null || room === null || session === null || revealTimer !== undefined) {
      return;
    }
    const left = throwPause.endsAt - Date.now();
    if (
      throwPause.gameNumber !== room.gameNumber ||
      throwPause.shown !== shown ||
      shown !== session.cursor ||
      left <= 0
    ) {
      return;
    }
    pausedFor = shown;
    pausing = true;
    startRevealTimer(left);
  }

  /** The seat that played the last move shown. */
  function lastMover(current: GameSession): PlayerIndex | null {
    return current.cursor > 0 ? moverOf(current, current.cursor - 1) : null;
  }

  function seatView(
    seat: RoomView["seats"][number],
    index: number,
    you: PlayerIndex | null,
  ): SeatView {
    // Played by the server like an AI seat, under the name of its person: mine too.
    if (seat?.kind === "human" && seat.standIn) {
      return { kind: "ai", level: AI_LEVEL.Medium, standInFor: seat.name };
    }
    if (index === you) return HUMAN;
    if (seat?.kind === "ai") return AI_SEAT;
    return { kind: "remote" as const, name: seat?.kind === "human" ? seat.name : null };
  }

  /** Whether the server can play a seat of this game for a person who left. */
  const hasAi = gameHasAi(definition);
  /** A seat that leaves a cooperative game stops it for everyone: nobody wins by it. */
  const cooperative = definition.meta.cooperative === true;
  /** Every seat moves at any time: nobody is to move, nobody waits, no turn is timed. */
  const free = definition.meta.freePlay === true;

  function resignOption(
    plays: readonly SeatPlay[],
    you: PlayerIndex | null,
    open: boolean,
    online: boolean,
  ): ResignOption | null {
    if (!open || you === null || plays[you] !== SEAT_PLAY.Self) return null;
    if (cooperative) return { outcome: "end", available: online };
    const outcome = leaveOutcome(plays, you, hasAi) === LEAVE_OUTCOME.StandIn ? "stand-in" : "loss";
    return { outcome, available: online };
  }

  function turnClock(
    plays: readonly SeatPlay[],
    toMove: PlayerIndex,
    you: PlayerIndex | null,
    online: boolean,
    position: { readonly gameNumber: number; readonly moveIndex: number },
  ): TurnClock | null {
    const clock = connection.getSnapshot().turnClock;
    // Only the clock of the turn on screen: the connection may already hold a newer room.
    if (
      clock?.gameNumber !== position.gameNumber ||
      clock.moveIndex !== position.moveIndex ||
      plays[toMove] !== SEAT_PLAY.Self
    ) {
      return null;
    }
    // Whether this player could claim the turn once it is old enough; the server decides when.
    const claimable =
      abandonClaim({
        seats: plays,
        toMove,
        claimer: you,
        turnIdleMs: Number.POSITIVE_INFINITY,
      }) === ABANDON_CLAIM.Ok;
    let claim: TurnClock["claim"] = null;
    if (claimable && you !== null) {
      if (leaveOutcome(plays, toMove, hasAi) === LEAVE_OUTCOME.StandIn) claim = "stand-in";
      else claim = plays[you] === SEAT_PLAY.Self && !cooperative ? "win" : "end";
    }
    return {
      player: toMove,
      gameNumber: clock.gameNumber,
      moveIndex: clock.moveIndex,
      startedAt: clock.startedAt,
      claim,
      available: online,
    };
  }

  function show(
    whole: GameSession,
    view: RoomView,
    you: PlayerIndex | null,
    status: ConnectionStatus,
  ): void {
    // The game as far as it is shown: the session cut at `shown`, so the board, the result and
    // what the play screen says all follow the move on screen.
    const current: GameSession = { ...whole, cursor: shown };
    const revealing = shown < whole.cursor || queued !== null;
    const state = currentState(current);
    const result = sessionResult(definition, current);
    const currentPlayer = definition.currentPlayer(state);
    const seats: SeatView[] = view.seats.map((seat, index) => seatView(seat, index, you));
    const everyoneSeated = view.seats.every((seat) => seat !== null);
    const toMove = seats[currentPlayer]?.kind;
    const plays = seatPlays(view.seats);
    const online = status === CONNECTION_STATUS.Online;
    // Neither while the game on screen, or the whole game received, has a result.
    const open = everyoneSeated && result === null && sessionResult(definition, whole) === null;
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
        everyoneSeated &&
        !revealing &&
        result === null &&
        (free
          ? you !== null && plays[you] === SEAT_PLAY.Self
          : currentPlayer === you && plays[currentPlayer] === SEAT_PLAY.Self) &&
        pending === null,
      viewer: you,
      seats,
      waitingFor:
        result !== null || free
          ? null
          : toMove === "remote"
            ? "opponent"
            : toMove === "ai"
              ? "ai"
              : null,
      inProgress: false,
      supportsUndo: false,
      // Not while the next game is already waiting to be shown.
      canStartNewGame: result !== null && queued === null,
      connection: status,
      // As the server's record has them, checked again by `fromRecord`.
      options: current.options,
      resign: resignOption(plays, you, open, online),
      // The turn whose clock the server sent: only once every move received is on screen.
      turn:
        open && !revealing && !free
          ? turnClock(plays, currentPlayer, you, online, {
              gameNumber: view.gameNumber,
              moveIndex: whole.cursor,
            })
          : null,
      cooperative,
      ending:
        current.ending !== undefined && current.cursor === current.entries.length
          ? current.ending
          : null,
      freePlay: free,
      gameTime: view.gameTime ?? null,
    };
  }

  function render(): void {
    if (disposed || broken || session === null || room === null) return;
    show(session, room, seat, connection.getSnapshot().status);
    emit({ type: "changed" });
  }

  /**
   * The game has moved on from where the request was sent: the request is answered. Played freely,
   * others' moves move it on too: only one of this seat's own answers.
   */
  function answers(next: RoomView, sentAt: Pending): boolean {
    if (next.gameNumber !== sentAt.gameNumber) return true;
    if (!free) return next.record.entries.length > sentAt.moveIndex;
    const own = seat;
    const { moverOf: seatOf } = definition;
    return next.record.entries
      .slice(sentAt.moveIndex)
      .some((entry) => seatOf?.(entry.move as Move) === own);
  }

  /** Where to show `next` from, given what was on screen of `previous`. */
  function follow(
    previous: RoomView | null,
    next: GameSession,
    latest: RoomView,
    greeted: boolean,
  ) {
    // Entering the room, reloading or reconnecting: the latest state at once, no replay.
    if (previous === null || greeted || latest.gameNumber < previous.gameNumber) {
      stopRevealing();
      shown = next.cursor;
      if (greeted) resumeThrowPause();
      return;
    }
    if (latest.gameNumber !== previous.gameNumber) {
      // A new game ("Play again"): its empty board first, then any AI moves it came with.
      stopRevealing();
      shown = 0;
      scheduleReveal();
      return;
    }
    // Played freely, moves come all the time from everyone: shown as they come, at once, or this
    // player would wait behind the others' moves and could not move while they kept going.
    if (free) {
      stopRevealing();
      shown = next.cursor;
      return;
    }
    if (shown > next.cursor) shown = next.cursor;
    // The player's own next move (a horse chosen after the roll) never waits for the pause after
    // their roll: the pause is for the others' moves.
    if (pausing && shown < next.cursor && moverOf(next, shown) === seat) {
      if (revealTimer !== undefined) clearTimeout(revealTimer);
      revealTimer = undefined;
      pausing = false;
    }
    // While moves are being shown, the newer ones queue behind them; otherwise the first new move
    // shows at once, and any after it one at a time.
    if (revealTimer === undefined && shown < next.cursor) {
      shown += 1;
      scheduleReveal();
    }
  }

  function refresh(): void {
    // A broken room is not replayed again on every change of the connection.
    if (disposed || broken) return;
    const { room: latest, you, status, turnClock: clock } = connection.getSnapshot();
    const greeted = lastStatus !== CONNECTION_STATUS.Online && status === CONNECTION_STATUS.Online;
    const statusChanged = lastStatus !== status;
    const clockChanged = lastTurnClock !== clock;
    lastStatus = status;
    lastTurnClock = clock;
    if (latest === null) return;
    if (latest !== room && latest !== queued?.room) {
      // Only something around the game changed (a chat message, a name, a person back from a stand-in
      // with no move yet): no replay, nothing on screen or waiting to be shown moves, and the screen
      // is not told unless it shows what changed. The first room after a greeting always counts:
      // it must win even if the store lost data.
      const showing = queued?.room ?? room;
      if (!greeted && showing !== null && sameGame(latest, showing)) {
        const seatsChanged =
          you !== (queued?.seat ?? seat) ||
          JSON.stringify(latest.seats) !== JSON.stringify(showing.seats);
        if (queued === null) {
          room = latest;
          seat = you;
        } else {
          queued = { ...queued, room: latest, seat: you };
        }
        if (seatsChanged || statusChanged || clockChanged) render();
        return;
      }
      const rebuilt =
        (queued === null && !greeted ? extend(session, room, latest) : null) ?? rebuild(latest);
      if (rebuilt === null) {
        broken = true;
        settle();
        stopRevealing();
        emit({ type: "changed" });
        return;
      }
      if (
        !greeted &&
        room !== null &&
        latest.gameNumber > room.gameNumber &&
        revealTimer !== undefined
      ) {
        // The old game still has moves to show: the new one waits behind them.
        queued = { room: latest, session: rebuilt, seat: you };
      } else {
        const previous = room;
        room = latest;
        session = rebuilt;
        seat = you;
        queued = null;
        follow(previous, rebuilt, latest, greeted);
      }
      if (pending !== null && answers(latest, pending)) settle();
    }
    render();
  }

  /** After a greeting: whatever was in flight is settled, and the latest state shows at once. */
  function sync(): void {
    settle();
    stopRevealing();
    adoptQueued();
    if (session !== null) shown = session.cursor;
    refresh();
    resumeThrowPause();
  }

  const unsubscribe = [
    connection.subscribe(refresh),
    connection.onSynced(sync),
    connection.onRejected(({ request, code }) => {
      // The lobby's or the chat's business: a refused seat, AI seat or message says nothing of a
      // move in flight.
      if (request === "sit" || request === "ai-seat" || request === "chat") return;
      // Nor does a refused resign or claim; the room sent before it already shows why, and only
      // a claim made too early is worth saying so.
      if (request === "resign" || request === "claim-abandoned") {
        refresh();
        if (code === ROOM_ERROR.NotAbandoned) emit({ type: "claim-refused" });
        return;
      }
      const sentAt = pending;
      settle();
      refresh();
      // A new game refused (its options, from a client of another version) leaves the game just
      // over on screen, its buttons back: nothing to say about a move.
      if (request === "rematch") return;
      // Played freely, a move sent before another player's reached the server may no longer fit
      // the board: the board, now showing that move, says why.
      const latest = connection.getSnapshot().room;
      const overtaken =
        free &&
        sentAt !== null &&
        latest?.gameNumber === sentAt.gameNumber &&
        latest.record.entries.length > sentAt.moveIndex;
      if (isRuleRefusal(code) && !overtaken) emit({ type: "rejected", code });
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
    requestNewGame: (options) => {
      if (disposed || room === null || session === null || pending !== null) return;
      if (snapshot.status !== "ready" || snapshot.result === null) return;
      const sent = connection.send({
        type: "rematch",
        gameNumber: room.gameNumber,
        ...(options === undefined ? {} : { options }),
      });
      if (!sent) return;
      // The game is over and gets no more moves: only the next game's number answers.
      waitForAnswer({ gameNumber: room.gameNumber, moveIndex: session.cursor });
      refresh();
    },
    resign: () => {
      if (disposed || room === null || snapshot.status !== "ready") return;
      if (snapshot.resign?.available !== true) return;
      connection.send({ type: "resign", gameNumber: room.gameNumber });
    },
    claimAbandoned: () => {
      if (disposed || room === null || session === null || snapshot.status !== "ready") return;
      const { turn } = snapshot;
      if (turn?.claim == null || !turn.available) return;
      // The turn as fully shown (`turn` is null while moves are being shown): its position.
      connection.send({
        type: "claim-abandoned",
        gameNumber: room.gameNumber,
        moveIndex: session.cursor,
      });
    },
    // An online game has no undo: the opponent would have to agree (later, with draw offers).
    requestUndo: () => undefined,
    requestRedo: () => undefined,
    dispose: () => {
      disposed = true;
      settle();
      stopRevealing();
      for (const stop of unsubscribe) stop();
      listeners.clear();
    },
  };
}
