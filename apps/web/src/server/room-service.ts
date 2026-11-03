import {
  AI_LEVEL,
  type AnyGameDefinition,
  chooseMove,
  createSession,
  currentState,
  ENGINE_ERROR,
  fromRecord,
  parseGameOptions,
  playMove,
  type Rng,
  type Session,
  sessionResult,
  type Success,
  toRecord,
} from "@board-games/engine";
import { GAMES } from "@board-games/games";
import {
  normalizeRoomCode,
  type RejectionCode,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  ROOM_ERROR,
  type RoomCode,
} from "@board-games/protocol";

import { cryptoRng } from "@/lib/crypto-rng";

import {
  type RoomPlayer,
  seatOf,
  STORED_ROOM_FORMAT,
  type StoredRoom,
  type StoredSeat,
} from "./room";
import type { RoomListener, RoomStore } from "./store/room-store";

/** Codes tried before giving up; with 887 million codes, a second try is already rare. */
const CODE_ATTEMPTS = 5;

/** Reads for a join, a sit or an AI seat before giving up; none depends on what the client saw. */
const JOIN_ATTEMPTS = 3;

/**
 * Reads for a move or a rematch: one more after a conflict, to check the request again against
 * the newer room (a rename in between lets a move through, a move in between makes it stale).
 */
const MOVE_ATTEMPTS = 2;

/** The AI seats of a room play at this level; choosing it is for later (design §3). */
const AI_SEAT_LEVEL = AI_LEVEL.Medium;

/**
 * Moves of AI seats one write may add: only a safety net (a game whose AI would never hand the turn
 * back). What is left is played by the next write, or by the next `join` of a seated player.
 */
export const MAX_AI_MOVES_PER_WRITE = 200;

/** Rooms with this many seats or fewer have no AI seats (a product decision of M6). */
const MAX_SEATS_WITHOUT_AI = 2;

/** A refused request, like the engine's `Failure`, with the room as last read when there is one. */
interface ServiceFailure {
  readonly ok: false;
  readonly error: RejectionCode;
  /** Sent to the client before the refusal, so it catches up first. */
  readonly room?: StoredRoom;
}

export type ServiceResult<T> = Success<T> | ServiceFailure;

const ok = <T>(value: T): Success<T> => ({ ok: true, value });

const fail = (error: RejectionCode, room?: StoredRoom): ServiceFailure =>
  room === undefined ? { ok: false, error } : { ok: false, error, room };

interface CreateRoomRequest {
  readonly gameId: string;
  /** The game's minimum when absent. */
  readonly playerCount?: number;
  /** The game's defaults when absent; checked by the game otherwise. */
  readonly options?: unknown;
  readonly player: RoomPlayer;
}

export interface RoomServiceDeps {
  readonly store: RoomStore;
  /** The server's randomness: room codes, every random outcome of a move, the AI seats' choices. */
  readonly rng: Rng;
  /** Server time in ms, for `updatedAt` and the AI's clock. */
  readonly now: () => number;
  readonly games: readonly AnyGameDefinition[];
}

/** Every request answers with the room as written, or as it is when nothing had to change. */
export interface RoomService {
  /** The creator sits in the first seat and is the room's host for good. */
  create(this: void, request: CreateRoomRequest): Promise<ServiceResult<StoredRoom>>;
  /**
   * Recognises a seated player by `playerId`, and takes their name if it changed. A room left on an
   * AI seat's turn moves on here.
   */
  join(this: void, code: RoomCode, player: RoomPlayer): Promise<ServiceResult<StoredRoom>>;
  /** The lowest empty seat; a seated player keeps theirs, under the name sent. */
  sit(this: void, code: RoomCode, player: RoomPlayer): Promise<ServiceResult<StoredRoom>>;
  move(
    this: void,
    code: RoomCode,
    playerId: string,
    position: { readonly gameNumber: number; readonly moveIndex: number },
    move: unknown,
  ): Promise<ServiceResult<StoredRoom>>;
  rematch(
    this: void,
    code: RoomCode,
    playerId: string,
    gameNumber: number,
  ): Promise<ServiceResult<StoredRoom>>;
  /**
   * The host marks an empty seat as an AI seat (`on`), or empties an AI seat, before the current
   * game's first move. Marking the last empty seat starts the game, AI moves included.
   */
  setAiSeat(
    this: void,
    code: RoomCode,
    playerId: string,
    seat: number,
    on: boolean,
  ): Promise<ServiceResult<StoredRoom>>;
  /** Every new state of the room, from any instance (`RoomStore.subscribe`). */
  watch(this: void, code: RoomCode, listener: RoomListener): Promise<() => void>;
}

type AnySession = Session<unknown, unknown, unknown, object>;

/** The seats of `room` with `taken` in `seat`. */
function seatPlayer(
  room: StoredRoom,
  seat: number,
  taken: StoredSeat | null,
): StoredRoom["players"] {
  return room.players.map((current, index) => (index === seat ? taken : current));
}

const human = (player: RoomPlayer): StoredSeat => ({ kind: "human", ...player });

/** Whether `player`, in `seat`, sent another name than the one the room shows. */
function renamed(room: StoredRoom, seat: number, player: RoomPlayer): boolean {
  const current = room.players[seat];
  return current?.kind === "human" && current.name !== player.name;
}

/**
 * The rules of a room, as the referee: who may sit, which seats the AI plays, whose move it is,
 * whether a move is legal (by the game's own rules), when a new game starts. Knows nothing of
 * WebSockets; every change is a write checked against the revision it was based on.
 *
 * The AI seats are played here too, in the write that hands them the turn (design §3): no timer,
 * no background work, no client needed, and their moves go through the same rules and rng.
 *
 * Store failures are thrown, for the caller to answer `unavailable`.
 */
export function createRoomService({ store, rng, now, games }: RoomServiceDeps): RoomService {
  const findGame = (gameId: string) => games.find((game) => game.id === gameId);

  function generateCode(): RoomCode {
    const code = Array.from(
      { length: ROOM_CODE_LENGTH },
      () => ROOM_CODE_ALPHABET[rng.nextInt(0, ROOM_CODE_ALPHABET.length - 1)] ?? "",
    ).join("");
    const normalized = normalizeRoomCode(code);
    if (normalized === null) throw new RangeError(`Generated an invalid room code "${code}"`);
    return normalized;
  }

  /** `room` one write later. */
  const written = (room: StoredRoom, changes: Partial<StoredRoom>): StoredRoom => ({
    ...room,
    ...changes,
    revision: room.revision + 1,
    updatedAt: now(),
  });

  /**
   * Reads the room and writes what `decide` makes of it; `decide` handing back the room it was
   * given means there is nothing to write. On a conflict the room is read again and the request
   * decided again on the newer room, up to `attempts` reads.
   */
  async function writeWithRetry(
    code: RoomCode,
    attempts: number,
    decide: (room: StoredRoom) => ServiceResult<StoredRoom>,
  ): Promise<ServiceResult<StoredRoom>> {
    let latest: StoredRoom | undefined;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const room = await store.get(code);
      if (room === null) return fail(ROOM_ERROR.RoomNotFound);
      latest = room;
      const decision = decide(room);
      if (!decision.ok || decision.value === room) return decision;
      const outcome = await store.update(code, room.revision, decision.value);
      if (outcome === "updated") return decision;
      if (outcome === "missing") return fail(ROOM_ERROR.RoomNotFound);
    }
    return fail(ROOM_ERROR.Unavailable, latest);
  }

  /** The game in progress, or the reason the room's player cannot act on it. */
  function seatedGame(room: StoredRoom, playerId: string) {
    const seat = seatOf(room, playerId);
    if (seat === null) return fail(ROOM_ERROR.NotSeated, room);
    const game = findGame(room.gameId);
    const session = game === undefined ? undefined : fromRecord(game, room.record);
    // A game no longer registered, or a record its rules refuse: nothing can be played.
    if (game === undefined || !session?.ok) return fail(ROOM_ERROR.Unavailable, room);
    return { ok: true as const, seat, game, session: session.value };
  }

  /** The move the game's AI chooses for the seat to move, or why it could not choose one. */
  function aiMove(
    game: AnyGameDefinition,
    session: AnySession,
  ): { readonly move: unknown } | { readonly error: unknown } {
    try {
      const chosen = chooseMove(game, currentState(session), {
        level: AI_SEAT_LEVEL,
        rng,
        now,
        // Medium always finishes its own depth, whatever the limit; nothing more in a request.
        timeLimitMs: 0,
      });
      return chosen.ok ? { move: chosen.value } : { error: chosen.error };
    } catch (error) {
      return { error };
    }
  }

  /** A legal move at random, played: what an AI seat does when its AI fails. */
  function playRandomMove(game: AnyGameDefinition, session: AnySession) {
    const legal = game.legalMoves(currentState(session));
    if (legal.length === 0) return null;
    const played = playMove(game, session, legal[rng.nextInt(0, legal.length - 1)], rng);
    return played.ok ? played.value : null;
  }

  /**
   * `session` with the moves of the AI seats to move played in turn, until a person is to move,
   * the game ends, or `MAX_AI_MOVES_PER_WRITE` moves. Each move goes through the rules
   * (`playMove`), every roll drawn from the server's rng, like a person's; should the AI fail or
   * choose a move the rules refuse, a legal move at random is played instead, so the game never
   * waits on it. Nothing is played while a seat is empty.
   */
  function playAiSeats(
    seats: StoredRoom["players"],
    game: AnyGameDefinition,
    session: AnySession,
  ): AnySession {
    if (seats.includes(null)) return session;
    let current = session;
    // Logged once per chain: a broken AI fails the same way on every move.
    let logged = false;
    for (let played = 0; played < MAX_AI_MOVES_PER_WRITE; played += 1) {
      if (sessionResult(game, current) !== null) break;
      if (seats[game.currentPlayer(currentState(current))]?.kind !== "ai") break;
      const chosen = aiMove(game, current);
      const byAi = "move" in chosen ? playMove(game, current, chosen.move, rng) : null;
      if (!logged && !byAi?.ok) {
        logged = true;
        console.error(
          "[rooms] the AI failed to choose a legal move; playing at random",
          "error" in chosen ? chosen.error : byAi?.ok === false ? byAi.error : undefined,
        );
      }
      const next = byAi?.ok === true ? byAi.value : playRandomMove(game, current);
      if (next === null) break;
      current = next;
    }
    return current;
  }

  /**
   * `room` with the moves its AI seats have to make now, or `room` itself when there are none (or
   * its game cannot be replayed, which a person's request then reports).
   */
  function withAiMoves(room: StoredRoom): StoredRoom {
    if (room.players.includes(null) || !room.players.some((seat) => seat?.kind === "ai")) {
      return room;
    }
    const game = findGame(room.gameId);
    const session = game === undefined ? undefined : fromRecord(game, room.record);
    if (game === undefined || !session?.ok) return room;
    const played = playAiSeats(room.players, game, session.value);
    return played === session.value ? room : { ...room, record: toRecord(played) };
  }

  return {
    create: async ({ gameId, playerCount, options, player }) => {
      const game = findGame(gameId);
      if (game === undefined) return fail(ROOM_ERROR.UnknownGame);
      const parsed =
        options === undefined ? ok(game.defaultOptions) : parseGameOptions(game, options);
      if (!parsed.ok) return fail(parsed.error);
      const session = createSession(game, {
        playerCount: playerCount ?? game.meta.players.min,
        options: parsed.value,
      });
      if (!session.ok) return fail(session.error);

      const { playerCount: seats } = session.value;
      for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
        const room: StoredRoom = {
          format: STORED_ROOM_FORMAT,
          code: generateCode(),
          gameId: game.id,
          revision: 1,
          gameNumber: 1,
          hostId: player.playerId,
          players: Array.from({ length: seats }, (_, seat) => (seat === 0 ? human(player) : null)),
          record: toRecord(session.value),
          updatedAt: now(),
        };
        if ((await store.create(room)) === "created") return ok(room);
      }
      return fail(ROOM_ERROR.Unavailable);
    },

    join: (code, player) =>
      writeWithRetry(code, JOIN_ATTEMPTS, (room) => {
        const seat = seatOf(room, player.playerId);
        if (seat === null) return ok(room);
        // A room left on an AI seat's turn (a chain cut by the safety net, a write that never
        // happened) moves on as soon as a seated player is back.
        const played = withAiMoves(room);
        if (!renamed(room, seat, player) && played === room) return ok(room);
        // A seated player coming back under a new name: everyone sees the new one.
        return ok(
          written(room, { players: seatPlayer(room, seat, human(player)), record: played.record }),
        );
      }),

    sit: (code, player) =>
      writeWithRetry(code, JOIN_ATTEMPTS, (room) => {
        const held = seatOf(room, player.playerId);
        if (held !== null) {
          // Already seated: same seat, under the name sent with this sit.
          return renamed(room, held, player)
            ? ok(written(room, { players: seatPlayer(room, held, human(player)) }))
            : ok(room);
        }
        // An AI seat is a taken seat: nobody sits in one.
        const seat = room.players.indexOf(null);
        if (seat === -1) return fail(ROOM_ERROR.RoomFull, room);
        return ok(withAiMoves(written(room, { players: seatPlayer(room, seat, human(player)) })));
      }),

    move: (code, playerId, { gameNumber, moveIndex }, move) =>
      writeWithRetry(code, MOVE_ATTEMPTS, (room) => {
        const current = seatedGame(room, playerId);
        if (!current.ok) return current;
        const { seat, game, session } = current;
        if (room.players.includes(null)) return fail(ROOM_ERROR.WaitingForPlayers, room);
        if (gameNumber !== room.gameNumber || moveIndex !== room.record.entries.length) {
          return fail(ROOM_ERROR.StaleMove, room);
        }
        if (sessionResult(game, session) !== null) return fail(ENGINE_ERROR.GameOver, room);
        // An AI seat's turn is nobody else's: no person moves for it.
        if (game.currentPlayer(currentState(session)) !== seat) {
          return fail(ROOM_ERROR.NotYourTurn, room);
        }
        // The rules check the move; any random outcome is drawn here, from the server's rng.
        const played = playMove(game, session, move, rng);
        if (!played.ok) return fail(played.error, room);
        // The AI seats to move next answer in this very write.
        const record = toRecord(playAiSeats(room.players, game, played.value));
        return ok(written(room, { record }));
      }),

    rematch: (code, playerId, gameNumber) =>
      writeWithRetry(code, MOVE_ATTEMPTS, (room) => {
        const current = seatedGame(room, playerId);
        if (!current.ok) return current;
        const { game, session } = current;
        if (gameNumber !== room.gameNumber) return fail(ROOM_ERROR.StaleMove, room);
        if (sessionResult(game, session) === null) return fail(ROOM_ERROR.GameNotOver, room);
        const fresh = createSession(game, {
          playerCount: session.playerCount,
          options: session.options,
        });
        if (!fresh.ok) return fail(ROOM_ERROR.Unavailable, room);
        // Everyone moves one seat on (the last seat to the first), so who starts alternates.
        const count = room.players.length;
        const players = room.players.map(
          (_, seat) => room.players[(seat + count - 1) % count] ?? null,
        );
        // An AI seat moved into the first seat opens the new game in this very write.
        return ok(
          written(room, {
            players,
            gameNumber: room.gameNumber + 1,
            record: toRecord(playAiSeats(players, game, fresh.value)),
          }),
        );
      }),

    setAiSeat: (code, playerId, seat, on) =>
      writeWithRetry(code, JOIN_ATTEMPTS, (room) => {
        // Checked in this order (design §2), each refusal with the room as it is.
        if (room.hostId === null || room.hostId !== playerId) return fail(ROOM_ERROR.NotHost, room);
        const game = findGame(room.gameId);
        if (game === undefined) return fail(ROOM_ERROR.Unavailable, room);
        // AI seats are for rooms of three or four (Cờ cá ngựa): a two-seat room is played by two people.
        if (
          !game.meta.supportsAI ||
          game.evaluate === undefined ||
          room.players.length <= MAX_SEATS_WITHOUT_AI
        ) {
          return fail(ENGINE_ERROR.AiNotSupported, room);
        }
        if (room.record.entries.length > 0) return fail(ROOM_ERROR.GameStarted, room);
        if (seat < 0 || seat >= room.players.length) return fail(ROOM_ERROR.InvalidSeat, room);
        const current = room.players[seat] ?? null;
        if (on) {
          // Already an AI seat (a second click before the answer): nothing to write.
          if (current?.kind === "ai") return ok(room);
          if (current !== null) return fail(ROOM_ERROR.SeatTaken, room);
        } else if (current?.kind !== "ai") {
          return fail(ROOM_ERROR.NotAiSeat, room);
        }
        const players = seatPlayer(room, seat, on ? { kind: "ai" } : null);
        // The last empty seat taken by the AI starts the game, and any AI to move plays at once.
        return ok(withAiMoves(written(room, { players })));
      }),

    watch: (code, listener) => store.subscribe(code, listener),
  };
}

/** The service as the realtime endpoints run it: real randomness, the clock, every game. */
export function createDefaultRoomService(store: RoomStore): RoomService {
  return createRoomService({ store, rng: cryptoRng, now: Date.now, games: GAMES });
}
