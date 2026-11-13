import {
  type ClientMessage,
  CLOSE_CODE,
  normalizeRoomCode,
  parseClientMessage,
  PROTOCOL_VERSION,
  readGreetingVersion,
  type RejectableRequest,
  type RejectionCode,
  ROOM_ERROR,
  type RoomCode,
  type ServerMessage,
} from "@board-games/protocol";
import type { RawData, WebSocket } from "ws";

import { withTimeout } from "@/lib/with-timeout";

import { seatOf, type StoredRoom, toRoomView } from "../room";
import type { RoomService, ServiceResult } from "../room-service";
import { rawDataToBuffer } from "./raw-data";

export interface ConnectionLimits {
  /** The first message must be a greeting (`create` or `join`) within this time. */
  readonly greetingTimeoutMs: number;
  /** A connection that sends nothing but pings and receives no new room is closed after this. */
  readonly idleTimeoutMs: number;
  /** A WebSocket ping goes out this often; a socket that missed the previous pong is dropped. */
  readonly heartbeatIntervalMs: number;
  /** At most `messages` messages (pings included) within `windowMs`. */
  readonly rateLimit: { readonly messages: number; readonly windowMs: number };
  /** A store operation slower than this counts as failed (`unavailable`). */
  readonly storeTimeoutMs: number;
}

const DEFAULT_LIMITS: ConnectionLimits = {
  greetingTimeoutMs: 10_000,
  idleTimeoutMs: 20 * 60_000,
  heartbeatIntervalMs: 30_000,
  // A game played freely sends a move per key press (design of `add-jelly-crew-game` §10.2): room
  // for a quick player's 10–12 a second, still far from flooding the store.
  rateLimit: { messages: 150, windowMs: 10_000 },
  storeTimeoutMs: 5000,
};

export interface ConnectionDeps {
  readonly service: RoomService;
  /** Shorter limits for tests. */
  readonly limits?: Partial<ConnectionLimits>;
}

/** Standard WebSocket close codes used here. */
const NORMAL_CLOSURE = 1000;
const POLICY_VIOLATION = 1008;
const INTERNAL_ERROR = 1011;

/** Requests whose refusal always comes after the room, even one already sent. */
const LEAVE_REQUESTS: ReadonlySet<RejectableRequest> = new Set(["resign", "claim-abandoned"]);

/** A message that is not JSON, or a binary frame. */
const UNREADABLE = Symbol("unreadable");

function decode(data: RawData, isBinary: boolean): unknown {
  if (isBinary) return UNREADABLE;
  try {
    return JSON.parse(rawDataToBuffer(data).toString("utf8")) as unknown;
  } catch {
    return UNREADABLE;
  }
}

/**
 * Where a connection stands. `greeting` lasts until the first message has been handled (a
 * `create` always ends in closing); `joining` while the room is read; then the connection stays
 * in that room, as that player, until it closes.
 */
type ConnectionState =
  | { readonly kind: "greeting" }
  | { readonly kind: "joining"; readonly code: RoomCode; readonly playerId: string }
  | { readonly kind: "joined"; readonly code: RoomCode; readonly playerId: string }
  | { readonly kind: "closed" };

type InRoom = Extract<ConnectionState, { readonly code: RoomCode }>;

type RoomRequest = Extract<ClientMessage, { type: RejectableRequest }>;

/**
 * Serves one WebSocket, on Vercel and on the local realtime server alike: the greeting, then the
 * requests of one player in one room, and every new state of that room. Holds no room state of
 * its own; the store does. No error escapes: a broken message, a failing store or a bug end in an
 * answer to this connection (or its closing), never in a crash of the instance.
 */
export function attachConnection(socket: WebSocket, deps: ConnectionDeps): void {
  const { service } = deps;
  const limits = { ...DEFAULT_LIMITS, ...deps.limits };

  let state: ConnectionState = { kind: "greeting" };
  /** The newest room sent; an older copy (a late message) is never sent after it. */
  let lastSent: StoredRoom | undefined;
  /** Rooms sent so far, to tell whether one went out while a request was pending. */
  let roomsSent = 0;
  /** The newest room heard on the channel before the first room went out. */
  let heldBack: StoredRoom | undefined;
  let unsubscribe: (() => void) | undefined;
  /** Messages are handled one at a time, in order, even while a store call is pending. */
  let queue = Promise.resolve();
  const recentMessages: number[] = [];
  let answeredPing = true;

  // Every handler is attached at once, so nothing sent right after opening is lost.
  const greetingTimer = setTimeout(() => {
    // No `error` message: the client handles this like any lost connection and reconnects.
    close(CLOSE_CODE.GreetingTimeout);
  }, limits.greetingTimeoutMs);
  let idleTimer: NodeJS.Timeout | undefined;
  const heartbeat = setInterval(() => {
    // Vercel may cut the connection without a `close` event; don't keep listening for it.
    if (socket.readyState !== socket.OPEN) {
      cleanUp();
      return;
    }
    if (!answeredPing) {
      socket.terminate();
      cleanUp();
      return;
    }
    answeredPing = false;
    socket.ping();
  }, limits.heartbeatIntervalMs);

  socket.on("pong", () => {
    answeredPing = true;
  });
  socket.on("error", (error) => {
    // An oversized or malformed frame: `ws` closes the socket itself.
    console.error("[realtime] socket error", error);
  });
  socket.on("close", cleanUp);
  socket.on("message", (data, isBinary) => {
    if (isClosed()) return;
    if (isOverRateLimit()) {
      send({ type: "error", code: ROOM_ERROR.TooManyMessages });
      close(POLICY_VIOLATION);
      return;
    }
    const raw = decode(data, isBinary);
    const message = raw === UNREADABLE ? null : parseClientMessage(raw);
    // Answered at once, not behind a slow store call: a client takes a late pong for a dead
    // connection and reconnects.
    if (state.kind === "joined" && message?.type === "ping") {
      send({ type: "pong" });
      return;
    }
    queue = queue
      .then(() => handle(raw, message))
      .catch((error: unknown) => {
        console.error("[realtime] connection failed", error);
        send({ type: "error", code: ROOM_ERROR.Unavailable });
        close(INTERNAL_ERROR);
      });
  });

  function isOverRateLimit(): boolean {
    const now = Date.now();
    while (
      recentMessages.length > 0 &&
      (recentMessages[0] ?? now) <= now - limits.rateLimit.windowMs
    ) {
      recentMessages.shift();
    }
    recentMessages.push(now);
    return recentMessages.length > limits.rateLimit.messages;
  }

  function send(message: ServerMessage): void {
    if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
  }

  /**
   * Every check that the connection has closed goes through here, never through `state.kind`
   * inline: TypeScript keeps a narrowed `state` across an `await`, while a callback may close the
   * connection during it.
   */
  function isClosed(): boolean {
    return state.kind === "closed";
  }

  function close(closeCode: number): void {
    if (isClosed()) return;
    cleanUp();
    socket.close(closeCode);
  }

  function cleanUp(): void {
    state = { kind: "closed" };
    clearTimeout(greetingTimer);
    clearTimeout(idleTimer);
    clearInterval(heartbeat);
    unsubscribe?.();
    unsubscribe = undefined;
  }

  function resetIdleTimer(): void {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      close(CLOSE_CODE.Idle);
    }, limits.idleTimeoutMs);
  }

  /** A store call, or a rejection once it took too long; a late answer is ignored. */
  function limited<T>(operation: Promise<T>): Promise<T> {
    return withTimeout(
      () => operation,
      limits.storeTimeoutMs,
      `No answer from the store in ${String(limits.storeTimeoutMs)} ms`,
    );
  }

  /**
   * Sends `room` with this player's current seat if it is newer than the last room sent. With
   * `force`, sends the newest room known even if it was sent before: the answer to a request that
   * changed nothing (a sit from a seated player) would otherwise never come.
   */
  function deliver(room: StoredRoom, playerId: string, { force = false } = {}): void {
    const newer = lastSent === undefined || room.revision > lastSent.revision ? room : undefined;
    const newest = newer ?? lastSent;
    if (newest === undefined || (newer === undefined && !force)) return;
    lastSent = newest;
    roomsSent += 1;
    // How long the turn has lasted is reckoned now, for this send, by the server's clock.
    send({
      type: "room",
      room: toRoomView(newest, Date.now(), playerId),
      you: seatOf(newest, playerId),
    });
    resetIdleTimer();
  }

  function onRoom(room: StoredRoom): void {
    if (socket.readyState !== socket.OPEN) {
      cleanUp();
      return;
    }
    if (state.kind === "joined") {
      deliver(room, state.playerId);
    } else if (heldBack === undefined || room.revision > heldBack.revision) {
      heldBack = room;
    }
  }

  /** Ends the connection with an error: a failed greeting, or a room that is gone. */
  function refuse(errorCode: RejectionCode): void {
    send({ type: "error", code: errorCode });
    close(NORMAL_CLOSURE);
  }

  async function handle(raw: unknown, message: ClientMessage | null): Promise<void> {
    switch (state.kind) {
      case "closed":
        return;
      case "greeting":
        clearTimeout(greetingTimer);
        await greet(raw, message);
        return;
      default:
        await serve(state, message);
    }
  }

  async function greet(raw: unknown, message: ClientMessage | null): Promise<void> {
    const version = readGreetingVersion(raw);
    if (version !== null && version !== PROTOCOL_VERSION) {
      refuse(ROOM_ERROR.OutdatedClient);
      return;
    }
    if (message?.type === "create") return create(message);
    if (message?.type === "join") return join(message);
    refuse(ROOM_ERROR.InvalidMessage);
  }

  async function create(message: Extract<ClientMessage, { type: "create" }>): Promise<void> {
    let result: ServiceResult<StoredRoom>;
    try {
      result = await limited(
        service.create({
          gameId: message.gameId,
          ...(message.playerCount === undefined ? {} : { playerCount: message.playerCount }),
          ...(message.options === undefined ? {} : { options: message.options }),
          player: { playerId: message.playerId, name: message.name },
        }),
      );
    } catch (error) {
      console.error("[realtime] could not create a room", error);
      refuse(ROOM_ERROR.Unavailable);
      return;
    }
    if (!result.ok) {
      refuse(result.error);
      return;
    }
    // The creator's page joins on a connection of its own; this one is done.
    send({ type: "created", code: result.value.code });
    close(NORMAL_CLOSURE);
  }

  async function join(message: Extract<ClientMessage, { type: "join" }>): Promise<void> {
    // The code as typed (`abc 234`) is normalized here, at the edge; the service takes codes only.
    const code = normalizeRoomCode(message.code);
    if (code === null) {
      refuse(ROOM_ERROR.RoomNotFound);
      return;
    }
    // The name is kept nowhere: a seated player's is in the room, anyone else's comes with `sit`.
    const { playerId } = message;
    state = { kind: "joining", code, playerId };
    let result: ServiceResult<StoredRoom>;
    try {
      // Listen before reading, so no change made in between is missed.
      const subscription = service.watch(code, onRoom);
      subscription.then(
        (stop) => {
          if (isClosed()) stop();
          else unsubscribe = stop;
        },
        () => undefined,
      );
      await limited(subscription);
      if (isClosed()) return;
      result = await limited(service.join(code, playerId, message.name ?? null));
    } catch (error) {
      console.error("[realtime] could not join a room", error);
      refuse(ROOM_ERROR.Unavailable);
      return;
    }
    if (isClosed()) return;
    if (!result.ok) {
      refuse(result.error);
      return;
    }
    state = { kind: "joined", code, playerId };
    resetIdleTimer();
    deliver(result.value, playerId);
    if (heldBack !== undefined) deliver(heldBack, playerId);
    heldBack = undefined;
  }

  /** A message once in the room. */
  async function serve(room: InRoom, message: ClientMessage | null): Promise<void> {
    if (message?.type !== "ping") resetIdleTimer();
    switch (message?.type) {
      case "ping":
        send({ type: "pong" });
        return;
      case "sit":
      case "move":
      case "rematch":
      case "ai-seat":
      case "resign":
      case "claim-abandoned":
      case "chat":
        await request(room, message);
        return;
      default:
        // Unreadable, or a second greeting: a connection stays in its room until it closes.
        send({ type: "rejected", request: null, code: ROOM_ERROR.InvalidMessage });
    }
  }

  async function request({ code, playerId }: InRoom, message: RoomRequest): Promise<void> {
    const sentBefore = roomsSent;
    // Which chat message a refusal is about. The message itself is never logged, only that it failed.
    const about = message.type === "chat" ? { id: message.id } : {};
    let result: ServiceResult<StoredRoom>;
    try {
      result = await limited(perform(message, code, playerId));
    } catch (error) {
      console.error(`[realtime] ${message.type} failed`, error);
      send({ type: "rejected", request: message.type, code: ROOM_ERROR.Unavailable, ...about });
      return;
    }
    if (isClosed()) return;
    if (result.ok) {
      // Sent straight away, so the player sees their change even if the channel loses it; and
      // always a room in answer, unless the channel already brought one meanwhile.
      deliver(result.value, playerId, { force: roomsSent === sentBefore });
      return;
    }
    if (result.error === ROOM_ERROR.RoomNotFound) {
      // The room expired or was deleted while this connection was in it: nothing left to serve.
      refuse(ROOM_ERROR.RoomNotFound);
      return;
    }
    // The room as it is now first, so the client can catch up before it handles the refusal. A
    // refused resign or claim gets it even unchanged: its `turnIdleMs`, reckoned anew, sets the
    // client's clock right (a claim sent too early).
    if (result.room !== undefined) {
      deliver(result.room, playerId, { force: LEAVE_REQUESTS.has(message.type) });
    }
    send({ type: "rejected", request: message.type, code: result.error, ...about });
  }

  function perform(
    message: RoomRequest,
    code: RoomCode,
    playerId: string,
  ): Promise<ServiceResult<StoredRoom>> {
    switch (message.type) {
      case "sit":
        return service.sit(code, { playerId, name: message.name });
      case "move":
        return service.move(
          code,
          playerId,
          { gameNumber: message.gameNumber, moveIndex: message.moveIndex },
          message.move,
        );
      case "rematch":
        return service.rematch(code, playerId, message.gameNumber);
      case "ai-seat":
        return service.setAiSeat(code, playerId, message.seat, message.on);
      case "resign":
        return service.resign(code, playerId, message.gameNumber);
      case "claim-abandoned":
        return service.claimAbandoned(code, playerId, {
          gameNumber: message.gameNumber,
          moveIndex: message.moveIndex,
        });
      case "chat":
        return service.chat(code, playerId, { id: message.id, body: message.body });
    }
  }
}
