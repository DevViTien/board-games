import type { PlayerIndex } from "@board-games/engine";
import {
  type ClientMessage,
  CLOSE_CODE,
  PROTOCOL_VERSION,
  type RejectableRequest,
  type RejectionCode,
  ROOM_ERROR,
  type RoomView,
} from "@board-games/protocol";

import { type ClientSocket, type OpenSocket, openWebSocket, readServerMessage } from "./socket";
import { CONNECTION_STATUS, type ConnectionStatus } from "./types";

interface RoomConnectionSnapshot {
  readonly status: ConnectionStatus;
  /** The latest room received, kept across reconnections. */
  readonly room: RoomView | null;
  /** The seat of this player in `room`, or `null` while they hold none. */
  readonly you: PlayerIndex | null;
  /** Why the connection gave up, when `status` is `failed`. */
  readonly failure: RejectionCode | null;
  /** Not once in the room after 10 seconds: the page says the server cannot be reached. */
  readonly slow: boolean;
  /**
   * When the room's current turn began, by this device's clock: the time a room was received less
   * how long the server said the turn had lasted (`turnIdleMs`), so a device whose clock is wrong
   * still counts right. `null` when the room has no turn running.
   */
  readonly turnClock: TurnStart | null;
}

/** When a turn began by this device's clock, and which turn it is: the game and its position. */
interface TurnStart {
  readonly startedAt: number;
  readonly gameNumber: number;
  /** Moves the game had when the turn began. */
  readonly moveIndex: number;
}

/** What a player in a room asks the server for. */
type RoomRequest = Extract<
  ClientMessage,
  { type: "sit" | "move" | "rematch" | "ai-seat" | "resign" | "claim-abandoned" }
>;

interface RoomRejection {
  readonly request: RejectableRequest | null;
  readonly code: RejectionCode;
}

/** What the page tells the connection about itself. */
export type EnvironmentEvent = "visibility" | "online" | "offline" | "activity";

/** The page and the clock as the connection sees them; tests pass a fake one. */
export interface ConnectionEnvironment {
  isVisible(this: void): boolean;
  now(this: void): number;
  listen(this: void, listener: (event: EnvironmentEvent) => void): () => void;
}

export interface RoomConnectionOptions {
  readonly url: string;
  /** In canonical form. */
  readonly code: string;
  /**
   * Who greets the server, read at each greeting: a name changed since the page opened (in the
   * lobby, or on the setup screen in another tab) is the one the room shows after a reconnection.
   * `name: null` for a visitor who has not chosen one yet: the greeting then carries no name, and
   * a seated player keeps the one their seat has.
   */
  readonly getIdentity: () => { readonly playerId: string; readonly name: string | null };
  readonly openSocket?: OpenSocket | undefined;
  readonly environment?: ConnectionEnvironment | undefined;
  /** For the jitter of reconnection delays, in [0, 1). */
  readonly random?: (() => number) | undefined;
}

export interface RoomConnection {
  getSnapshot(this: void): RoomConnectionSnapshot;
  subscribe(this: void, listener: () => void): () => void;
  /**
   * Sends a request; `false` when not in the room right now, and nothing was sent. A `sit` not
   * answered by a room showing the player's seat within 8 seconds renews the connection.
   */
  send(this: void, request: RoomRequest): boolean;
  /** A request of this player was turned down; the current room, if newer, came just before. */
  onRejected(this: void, listener: (rejection: RoomRejection) => void): () => void;
  /** The first room after each greeting arrived: whatever was in flight is now settled. */
  onSynced(this: void, listener: () => void): () => void;
  /** Reconnects now, from `idle` or `paused`. */
  resume(this: void): void;
  /** Drops the connection and opens a new one, when an answer is overdue. */
  reconnect(this: void): void;
  dispose(this: void): void;
}

/** Waits before each retry; the last one repeats. Each is shortened by up to 20 % at random. */
const RETRY_DELAYS_MS = [0, 1000, 2000, 4000, 8000, 10_000] as const;
const MIN_JITTER = 0.8;
/** Online this long, the next lost connection is retried at once again, whatever closed it. */
const STABLE_AFTER_MS = 30_000;
const PING_EVERY_MS = 20_000;
/** Nothing at all from the server for this long: the connection is dead without anyone saying so. */
const SILENCE_LIMIT_MS = 45_000;
const PAUSE_AFTER_HIDDEN_MS = 60_000;
const IDLE_AFTER_MS = 10 * 60_000;
const SLOW_AFTER_MS = 10_000;
/**
 * The same turn reckoned again (a reconnection, a room sent again) within this much of the start
 * already known keeps it: the difference is only the network's delay, and a new start would make
 * the screen count the turn afresh.
 */
const TURN_DRIFT_KEPT_MS = 2000;
/** A seat asked for and no room showing it after this long: the connection is renewed. */
const SIT_ANSWER_LIMIT_MS = 8000;

/** No point in trying again: the room is gone, or this app is older than the server. */
const FATAL_ERRORS: ReadonlySet<RejectionCode> = new Set([
  ROOM_ERROR.RoomNotFound,
  ROOM_ERROR.OutdatedClient,
]);

/**
 * Refusals that mean something went wrong on either side, while the server keeps the connection
 * open: reconnect, so that the next greeting brings the room as the server has it.
 */
const RECONNECT_REJECTIONS: ReadonlySet<RejectionCode> = new Set([
  ROOM_ERROR.InvalidMessage,
  ROOM_ERROR.TooManyMessages,
  ROOM_ERROR.Unavailable,
]);

interface Timer {
  /** Runs `callback` once after `ms`, in place of what was waiting. */
  start(this: void, ms: number, callback: () => void): void;
  clear(this: void): void;
  isRunning(this: void): boolean;
}

function createTimer(): Timer {
  let id: ReturnType<typeof setTimeout> | undefined;
  const clear = () => {
    if (id !== undefined) clearTimeout(id);
    id = undefined;
  };
  return {
    start: (ms, callback) => {
      clear();
      id = setTimeout(() => {
        id = undefined;
        callback();
      }, ms);
    },
    clear,
    isRunning: () => id !== undefined,
  };
}

/** The page as the browser shows it; activity is a pointer or a key pressed anywhere. */
function browserEnvironment(): ConnectionEnvironment {
  return {
    isVisible: () => document.visibilityState === "visible",
    now: () => Date.now(),
    listen: (listener) => {
      const on = (event: EnvironmentEvent) => () => {
        listener(event);
      };
      const subscriptions: [EventTarget, string, () => void][] = [
        [document, "visibilitychange", on("visibility")],
        // Coming back from the back/forward cache fires no visibilitychange.
        [window, "pageshow", on("visibility")],
        [window, "online", on("online")],
        [window, "offline", on("offline")],
        [window, "pointerdown", on("activity")],
        [window, "keydown", on("activity")],
      ];
      for (const [target, type, handler] of subscriptions) target.addEventListener(type, handler);
      return () => {
        for (const [target, type, handler] of subscriptions) {
          target.removeEventListener(type, handler);
        }
      };
    },
  };
}

/**
 * The player's connection to one room. It knows the protocol, not the game: it joins, keeps the
 * latest room (the first one after each greeting always wins, even with a lower revision, since
 * the store may have lost data; later ones only when newer), and keeps the player in the room
 * across everything that drops a connection: Vercel's cut every ~5 minutes, a network change, a
 * half-dead socket (pings), a locked phone, a seat asked for and never answered. It also closes on
 * purpose, to keep instances idle: after a minute hidden, and after 10 minutes with nothing
 * happening. It gives up for good when the room is gone, when every seat is taken by others while
 * the player has none (no watching in M4), and when the app is older than the server.
 */
export function createRoomConnection({
  url,
  code,
  getIdentity,
  openSocket = openWebSocket,
  environment = browserEnvironment(),
  random = Math.random,
}: RoomConnectionOptions): RoomConnection {
  let snapshot: RoomConnectionSnapshot = {
    status: CONNECTION_STATUS.Connecting,
    room: null,
    you: null,
    failure: null,
    slow: false,
    turnClock: null,
  };
  const listeners = new Set<() => void>();
  const rejectionListeners = new Set<(rejection: RoomRejection) => void>();
  const syncListeners = new Set<() => void>();

  let socket: ClientSocket | null = null;
  // Raised whenever the socket is dropped, so that late events of an old socket are ignored.
  let generation = 0;
  let awaitingRoom = false;
  let everOnline = false;
  let disposed = false;
  // Raised by each retry; back to 0 only after staying online for a while (`STABLE_AFTER_MS`), so
  // that a server closing every connection right after the greeting is not hammered.
  let retries = 0;
  let hiddenAt: number | null = null;

  const retryTimer = createTimer();
  const silenceTimer = createTimer();
  const stableTimer = createTimer();
  const pauseTimer = createTimer();
  const idleTimer = createTimer();
  const slowTimer = createTimer();
  const sitTimer = createTimer();
  let pingTimer: ReturnType<typeof setInterval> | undefined;

  function update(change: Partial<RoomConnectionSnapshot>): void {
    const next = { ...snapshot, ...change };
    if (
      next.status === snapshot.status &&
      next.room === snapshot.room &&
      next.you === snapshot.you &&
      next.failure === snapshot.failure &&
      next.slow === snapshot.slow &&
      next.turnClock === snapshot.turnClock
    ) {
      return;
    }
    snapshot = next;
    for (const listener of listeners) listener();
  }

  /** Closed for good or on purpose: nothing reopens the socket by itself. */
  function isStopped(): boolean {
    return (
      disposed ||
      snapshot.status === CONNECTION_STATUS.Failed ||
      snapshot.status === CONNECTION_STATUS.Idle ||
      snapshot.status === CONNECTION_STATUS.Paused
    );
  }

  function write(message: ClientMessage): void {
    socket?.send(JSON.stringify(message));
  }

  function stopHeartbeat(): void {
    if (pingTimer !== undefined) clearInterval(pingTimer);
    pingTimer = undefined;
    silenceTimer.clear();
  }

  /** Pings only while in the room and seen; any message from the server counts as an answer. */
  function startHeartbeat(): void {
    stopHeartbeat();
    if (socket === null || !environment.isVisible()) return;
    silenceTimer.start(SILENCE_LIMIT_MS, () => {
      drop();
      retryLater();
    });
    if (snapshot.status === CONNECTION_STATUS.Online) {
      pingTimer = setInterval(() => {
        write({ type: "ping" });
      }, PING_EVERY_MS);
    }
  }

  /** Forgets the socket and closes it; nothing it reports afterwards is heard. */
  function drop(): void {
    const dropped = socket;
    socket = null;
    generation += 1;
    awaitingRoom = false;
    stopHeartbeat();
    stableTimer.clear();
    // A seat asked for on this socket is answered, or not, by the next greeting.
    sitTimer.clear();
    dropped?.close();
  }

  function connect(): void {
    retryTimer.clear();
    drop();
    if (disposed) return;
    const current = generation;
    awaitingRoom = true;
    update({
      status: everOnline ? CONNECTION_STATUS.Reconnecting : CONNECTION_STATUS.Connecting,
    });
    socket = openSocket(url, {
      onOpen: () => {
        if (current !== generation) return;
        const { playerId, name } = getIdentity();
        write({
          type: "join",
          protocol: PROTOCOL_VERSION,
          code,
          playerId,
          ...(name === null ? {} : { name }),
        });
      },
      onMessage: (data) => {
        if (current === generation) receive(data);
      },
      onClose: (closeCode) => {
        if (current !== generation) return;
        drop();
        if (closeCode === CLOSE_CODE.Idle) goIdle();
        else retryLater();
      },
    });
    startHeartbeat();
  }

  function retryLater(): void {
    if (isStopped()) return;
    update({
      status: everOnline ? CONNECTION_STATUS.Reconnecting : CONNECTION_STATUS.Connecting,
    });
    const base = RETRY_DELAYS_MS[Math.min(retries, RETRY_DELAYS_MS.length - 1)] ?? 0;
    retries += 1;
    retryTimer.start(base * (MIN_JITTER + (1 - MIN_JITTER) * random()), connect);
  }

  function stop(
    status: Extract<ConnectionStatus, "failed" | "idle" | "paused">,
    failure: RejectionCode | null = null,
  ): void {
    drop();
    retryTimer.clear();
    pauseTimer.clear();
    // A paused page counts its idle time again once it shows: a long absence is not inactivity
    // on a page nobody was looking at.
    idleTimer.clear();
    update({ status, failure });
  }

  function goIdle(): void {
    stop(CONNECTION_STATUS.Idle);
  }

  /** The player did something, or the room changed: the idle countdown starts over. */
  function markActivity(): void {
    idleTimer.clear();
    if (isStopped()) return;
    idleTimer.start(IDLE_AFTER_MS, goIdle);
  }

  /** The start of `room`'s turn, the one already known when it is the same turn and close enough. */
  function turnStartOf(room: RoomView, receivedAt: number): TurnStart | null {
    if (room.turnIdleMs === null) return null;
    const next: TurnStart = {
      startedAt: receivedAt - room.turnIdleMs,
      gameNumber: room.gameNumber,
      moveIndex: room.record.entries.length,
    };
    const known = snapshot.turnClock;
    return known !== null &&
      known.gameNumber === next.gameNumber &&
      known.moveIndex === next.moveIndex &&
      Math.abs(known.startedAt - next.startedAt) < TURN_DRIFT_KEPT_MS
      ? known
      : next;
  }

  function acceptRoom(room: RoomView, you: PlayerIndex | null): void {
    const previous = snapshot.room;
    const greeted = awaitingRoom;
    // Read on arrival, once: reckoning it again later would make the clock jump.
    const turnClock = turnStartOf(room, environment.now());
    if (greeted) {
      awaitingRoom = false;
      everOnline = true;
      stableTimer.start(STABLE_AFTER_MS, () => {
        retries = 0;
      });
      update({ status: CONNECTION_STATUS.Online, room, you, slow: false, turnClock });
      startHeartbeat();
      // The same room again after a reconnection (Vercel's cut every ~5 minutes) is nothing new:
      // counting it would keep a forgotten tab from ever going idle.
      if (previous?.revision !== room.revision) markActivity();
    } else {
      if (previous !== null && room.revision < previous.revision) return;
      if (previous !== null && room.revision === previous.revision) {
        // The same room sent again (before a refused claim): only the turn's clock is new.
        update({ turnClock });
        return;
      }
      update({ room, you, turnClock });
      markActivity();
    }
    if (you !== null) sitTimer.clear();
    // Every seat taken by others: no watching here (M4), so the connection gives up and closes.
    if (you === null && room.seats.every((seat) => seat !== null)) {
      stop(CONNECTION_STATUS.Failed, ROOM_ERROR.RoomFull);
      return;
    }
    if (greeted) for (const listener of syncListeners) listener();
  }

  function receive(data: unknown): void {
    // Any frame shows the connection is alive, even one that cannot be read.
    if (silenceTimer.isRunning()) startHeartbeat();
    const message = readServerMessage(data);
    if (message === null) {
      console.warn("[room] ignored a message that is not part of the protocol");
      return;
    }
    switch (message.type) {
      case "room": {
        acceptRoom(message.room, message.you);
        return;
      }
      case "rejected": {
        if (message.request === "sit") sitTimer.clear();
        if (message.request === "sit" && message.code === ROOM_ERROR.RoomFull) {
          // No watching someone else's game here: the player cannot sit, so the connection closes.
          stop(CONNECTION_STATUS.Failed, message.code);
          return;
        }
        const rejection = { request: message.request, code: message.code };
        for (const listener of rejectionListeners) listener(rejection);
        if (RECONNECT_REJECTIONS.has(message.code)) {
          drop();
          retryLater();
        }
        return;
      }
      case "error": {
        if (FATAL_ERRORS.has(message.code)) {
          stop(CONNECTION_STATUS.Failed, message.code);
          return;
        }
        // The server closes right after an error; reconnect without waiting for it to.
        drop();
        retryLater();
        return;
      }
      case "created":
      case "pong": {
        return;
      }
    }
  }

  function onVisibility(): void {
    if (!environment.isVisible()) {
      hiddenAt ??= environment.now();
      stopHeartbeat();
      if (!pauseTimer.isRunning() && !isStopped()) {
        pauseTimer.start(PAUSE_AFTER_HIDDEN_MS, () => {
          stop(CONNECTION_STATUS.Paused);
        });
      }
      return;
    }
    pauseTimer.clear();
    // Measured on the clock, not only by the timer: a locked phone freezes timers, and the socket
    // may have died meanwhile while the status still says online.
    const hiddenLong = hiddenAt !== null && environment.now() - hiddenAt >= PAUSE_AFTER_HIDDEN_MS;
    hiddenAt = null;
    const paused = snapshot.status === CONNECTION_STATUS.Paused;
    if (isStopped() && !paused) return;
    if (hiddenLong || paused) {
      connect();
      markActivity();
      return;
    }
    startHeartbeat();
  }

  function onEnvironment(event: EnvironmentEvent): void {
    if (disposed) return;
    switch (event) {
      case "visibility": {
        onVisibility();
        return;
      }
      case "offline": {
        if (isStopped()) return;
        drop();
        retryLater();
        return;
      }
      case "online": {
        // A hidden page waits until it shows again; nothing reopens the socket while it is paused.
        if (isStopped() || !environment.isVisible()) return;
        // Waiting for a retry, or for an attempt made while offline that may never answer.
        if (socket === null || awaitingRoom) connect();
        return;
      }
      case "activity": {
        markActivity();
        return;
      }
    }
  }

  const stopListening = environment.listen(onEnvironment);
  slowTimer.start(SLOW_AFTER_MS, () => {
    if (!everOnline) update({ slow: true });
  });
  connect();
  markActivity();
  if (!environment.isVisible()) onVisibility();

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    send: (request) => {
      if (snapshot.status !== CONNECTION_STATUS.Online || socket === null) return false;
      write(request);
      markActivity();
      // A seat is answered with a room showing it; without one in time, the greeting will tell.
      if (request.type === "sit") {
        sitTimer.start(SIT_ANSWER_LIMIT_MS, () => {
          if (!isStopped()) connect();
        });
      }
      return true;
    },
    onRejected: (listener) => {
      rejectionListeners.add(listener);
      return () => {
        rejectionListeners.delete(listener);
      };
    },
    onSynced: (listener) => {
      syncListeners.add(listener);
      return () => {
        syncListeners.delete(listener);
      };
    },
    resume: () => {
      if (
        disposed ||
        (snapshot.status !== CONNECTION_STATUS.Idle && snapshot.status !== CONNECTION_STATUS.Paused)
      ) {
        return;
      }
      connect();
      markActivity();
    },
    reconnect: () => {
      if (isStopped()) return;
      connect();
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      drop();
      retryTimer.clear();
      pauseTimer.clear();
      idleTimer.clear();
      slowTimer.clear();
      stopListening();
      listeners.clear();
      rejectionListeners.clear();
      syncListeners.clear();
    },
  };
}
