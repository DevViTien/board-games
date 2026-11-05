import {
  AI_LEVEL,
  type AnyGameDefinition,
  chooseMove,
  concede,
  createSession,
  currentState,
  ENDING_REASON,
  type EndingReason,
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
  ABANDON_AFTER_MS,
  ABANDON_CLAIM,
  abandonClaim,
  CHAT_KEPT,
  CHAT_LIMIT,
  CHAT_WINDOW_MS,
  type ChatBodyInput,
  gameHasAi,
  LEAVE_OUTCOME,
  leaveOutcome,
  MAX_SEATS_WITHOUT_AI,
  normalizeRoomCode,
  parseChatBody,
  type RejectionCode,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  ROOM_ERROR,
  type RoomCode,
  seatPlays,
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

/**
 * Reads for a chat message before giving up. Measured on the service with four people sending five
 * messages each and a move, all at once. On a store with no delay: 3 reads refuse 6 messages, 4
 * refuse 1, 5 and up none. Where each call takes 15–30 ms, as Redis does: 8 reads still refuse 0–1
 * per burst, 12 none in 10 bursts. A small wait at random between reads keeps the writers from
 * meeting again in step.
 */
const CHAT_ATTEMPTS = 12;
const CHAT_RETRY_MIN_MS = 5;
const CHAT_RETRY_MAX_MS = 30;
/**
 * A message still losing after this long gives up: the connection's time limit only stops waiting
 * for the answer, and nothing else would stop this loop's writes, which nobody waits for by then.
 */
const CHAT_DEADLINE_MS = 3000;

/**
 * Times one decision is written again on a room that only got chat messages meanwhile, without
 * deciding anew and without counting against the request's attempts. Past this the request reads
 * again: with a move's two attempts that outlasts every message a room can get at once.
 */
const CHAT_REBASES = 10;

/** The AI seats of a room play at this level; choosing it is for later (design §3). */
const AI_SEAT_LEVEL = AI_LEVEL.Medium;

/**
 * Moves of AI seats one write may add: only a safety net (a game whose AI would never hand the turn
 * back). What is left is played by the next write, or by the next `join` of a seated player.
 */
export const MAX_AI_MOVES_PER_WRITE = 200;

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
  /** Server time in ms, for `updatedAt`, `turnStartedAt` and the AI's clock. */
  readonly now: () => number;
  readonly games: readonly AnyGameDefinition[];
  /** How long a turn must last before it can be claimed abandoned; `ABANDON_AFTER_MS` by default. */
  readonly abandonAfterMs?: number;
  /** Waits between a chat message's tries; a real wait by default. */
  readonly sleep?: (ms: number) => Promise<void>;
}

/** Every request answers with the room as written, or as it is when nothing had to change. */
export interface RoomService {
  /** The creator sits in the first seat and is the room's host for good. */
  create(this: void, request: CreateRoomRequest): Promise<ServiceResult<StoredRoom>>;
  /**
   * Recognises a seated player by `playerId`, and takes their name if one was sent and it changed;
   * `null` (a visitor who has not chosen a name yet) keeps the seat's name. Someone without a seat
   * changes nothing. A room left on an AI seat's turn moves on here.
   */
  join(
    this: void,
    code: RoomCode,
    playerId: string,
    name: string | null,
  ): Promise<ServiceResult<StoredRoom>>;
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
  /**
   * The player gives up the current game: it ends with every other seat winning, or, in a room of
   * three or more seats of a game the AI plays, the AI plays their seat until it ends
   * (`leaveOutcome`). A seat the AI already stands in for changes nothing.
   */
  resign(
    this: void,
    code: RoomCode,
    playerId: string,
    gameNumber: number,
  ): Promise<ServiceResult<StoredRoom>>;
  /**
   * Another seated player claims that the player to move, at `position`, has left: their turn has
   * lasted `abandonAfterMs` by the server's clock. Then as for `resign`, for the player to move.
   */
  claimAbandoned(
    this: void,
    code: RoomCode,
    playerId: string,
    position: { readonly gameNumber: number; readonly moveIndex: number },
  ): Promise<ServiceResult<StoredRoom>>;
  /**
   * A chat message from a seated player. The same `id` from the same player changes nothing, so a
   * message sent again after a lost answer is not written twice. Touches neither the game nor the
   * time its turn began, and plays no AI seat.
   */
  chat(
    this: void,
    code: RoomCode,
    playerId: string,
    message: { readonly id: string; readonly body: ChatBodyInput },
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

/** A person's seat; a rename keeps whether the AI stands in for them. */
const human = (player: RoomPlayer, standIn = false): StoredSeat => ({
  kind: "human",
  ...player,
  standIn,
});

/** Whether the AI stands in for the person in `seat`. */
const isStandIn = (seat: StoredSeat | null | undefined): boolean =>
  seat?.kind === "human" && seat.standIn;

/** Whether the server plays `seat`: an AI seat, or a person the AI stands in for. */
const playedByServer = (seat: StoredSeat | null | undefined): boolean =>
  seat?.kind === "ai" || isStandIn(seat);

/** `player` in `seat`, keeping the seat's stand-in. */
function renamedSeat(room: StoredRoom, seat: number, player: RoomPlayer): StoredSeat {
  return human(player, isStandIn(room.players[seat]));
}

/**
 * What a write does to the time the current turn began (design §4): a new turn begins (`restart`),
 * the room no longer has one (`stop`: the game has a result, the room lost a player), or the
 * turn goes on (`keep`).
 */
type TurnChange = "restart" | "stop" | "keep";

/** Whether `session` leaves a turn running (`restart`) or has ended (`stop`). */
function turnAfter(game: AnyGameDefinition, session: AnySession): TurnChange {
  return sessionResult(game, session) === null ? "restart" : "stop";
}

/** All of a room but what a chat message changes, to compare two reads of it. */
function withoutChat(room: StoredRoom): string {
  return JSON.stringify({ ...room, chat: [], revision: 0, updatedAt: 0 });
}

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
export function createRoomService({
  store,
  rng,
  now,
  games,
  abandonAfterMs = ABANDON_AFTER_MS,
  sleep = (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    }),
}: RoomServiceDeps): RoomService {
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

  /** `room` one write later, its turn timed as `turn` says. */
  function written(room: StoredRoom, changes: Partial<StoredRoom>, turn: TurnChange): StoredRoom {
    const time = now();
    const next = { ...room, ...changes };
    return {
      ...next,
      revision: room.revision + 1,
      updatedAt: time,
      turnStartedAt: turn === "restart" ? time : turn === "stop" ? null : next.turnStartedAt,
    };
  }

  /**
   * Reads the room and writes what `decide` makes of it; `decide` handing back the room it was
   * given means there is nothing to write. On a conflict the room is read again and the request
   * decided again on the newer room, up to `attempts` reads.
   *
   * Unless only chat messages came in between (`rebase`, design of `add-room-chat`, §3): the
   * decision still holds, and may have been expensive (replaying a long game) or random (a roll),
   * so it is kept and written on the newer room, taking its messages, without deciding again and
   * without using up an attempt. A chat message does not do this for itself: it has to read the
   * list again to cut it. Instead it waits a little between reads, and stops at a time limit.
   */
  async function writeWithRetry(
    code: RoomCode,
    attempts: number,
    decide: (room: StoredRoom) => ServiceResult<StoredRoom>,
    { chat = false } = {},
  ): Promise<ServiceResult<StoredRoom>> {
    let latest: StoredRoom | undefined;
    const startedAt = now();
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (chat && attempt > 0) {
        if (now() - startedAt >= CHAT_DEADLINE_MS) break;
        const range = CHAT_RETRY_MAX_MS - CHAT_RETRY_MIN_MS;
        await sleep(CHAT_RETRY_MIN_MS + Math.round(Math.random() * range));
      }
      const room = await store.get(code);
      if (room === null) return fail(ROOM_ERROR.RoomNotFound);
      latest = room;
      const decision = decide(room);
      if (!decision.ok || decision.value === room) return decision;
      let base = room;
      let next = decision.value;
      for (let rebases = 0; ; rebases += 1) {
        const outcome = await store.update(code, base.revision, next);
        if (outcome === "updated") return ok(next);
        if (outcome === "missing") return fail(ROOM_ERROR.RoomNotFound);
        if (chat || rebases === CHAT_REBASES) break;
        const newer = await store.get(code);
        if (newer === null) return fail(ROOM_ERROR.RoomNotFound);
        latest = newer;
        // Anything else changed: the request must be judged again on the room as it is now.
        if (withoutChat(newer) !== withoutChat(base)) break;
        next = { ...next, chat: newer.chat, revision: newer.revision + 1, updatedAt: now() };
        base = newer;
      }
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
      // An AI seat, or a person the AI stands in for: the server moves for both alike.
      if (!playedByServer(seats[game.currentPlayer(currentState(current))])) break;
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
   * `room` with the moves its AI seats have to make now, the turn timed from them, or `room` itself
   * when there are none (or its game cannot be replayed, which a person's request then reports).
   */
  function withAiMoves(room: StoredRoom): StoredRoom {
    if (room.players.includes(null) || !room.players.some(playedByServer)) return room;
    const game = findGame(room.gameId);
    const session = game === undefined ? undefined : fromRecord(game, room.record);
    if (game === undefined || !session?.ok) return room;
    const played = playAiSeats(room.players, game, session.value);
    if (played === session.value) return room;
    return {
      ...room,
      record: toRecord(played),
      turnStartedAt: turnAfter(game, played) === "restart" ? now() : null,
    };
  }

  /**
   * The player in `seat` leaves the game, for `reason` (design §2): the game ends with every other
   * seat winning, or the AI stands in for them and moves at once if it is their turn.
   */
  function leave(
    room: StoredRoom,
    game: AnyGameDefinition,
    session: AnySession,
    seat: number,
    reason: EndingReason,
  ): ServiceResult<StoredRoom> {
    const taken = room.players[seat];
    if (
      taken?.kind === "human" &&
      leaveOutcome(seatPlays(room.players), seat, gameHasAi(game)) === LEAVE_OUTCOME.StandIn
    ) {
      const players = seatPlayer(room, seat, { ...taken, standIn: true });
      const played = playAiSeats(players, game, session);
      const record = toRecord(played);
      return ok(
        written(room, { players, record }, played === session ? "keep" : turnAfter(game, played)),
      );
    }
    const conceded = concede(game, session, { reason, player: seat });
    if (!conceded.ok) return fail(conceded.error, room);
    return ok(written(room, { record: toRecord(conceded.value) }, "stop"));
  }

  /** The game a seated player acts on with `resign` or `claim-abandoned`, checked in order (design §5). */
  function gameToLeave(
    room: StoredRoom,
    playerId: string,
    position: { gameNumber: number; moveIndex?: number },
  ) {
    const current = seatedGame(room, playerId);
    if (!current.ok) return current;
    if (room.players.includes(null)) return fail(ROOM_ERROR.WaitingForPlayers, room);
    if (
      position.gameNumber !== room.gameNumber ||
      (position.moveIndex !== undefined && position.moveIndex !== room.record.entries.length)
    ) {
      return fail(ROOM_ERROR.StaleMove, room);
    }
    if (sessionResult(current.game, current.session) !== null) {
      return fail(ENGINE_ERROR.GameOver, room);
    }
    return current;
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
          turnStartedAt: null,
          chat: [],
        };
        if ((await store.create(room)) === "created") return ok(room);
      }
      return fail(ROOM_ERROR.Unavailable);
    },

    join: (code, playerId, name) =>
      writeWithRetry(code, JOIN_ATTEMPTS, (room) => {
        const seat = seatOf(room, playerId);
        if (seat === null) return ok(room);
        // A room left on an AI seat's turn (a chain cut by the safety net, a write that never
        // happened) moves on as soon as a seated player is back.
        const played = withAiMoves(room);
        // No name sent: the seat keeps the one it has.
        const player = name === null ? null : { playerId, name };
        const rename = player !== null && renamed(room, seat, player);
        if (!rename && played === room) return ok(room);
        // A seated player coming back under a new name: everyone sees the new one. Neither a
        // rename nor coming back restarts the turn; AI moves played here do.
        return ok(
          written(
            room,
            {
              players: rename
                ? seatPlayer(room, seat, renamedSeat(room, seat, player))
                : room.players,
              record: played.record,
              turnStartedAt: played.turnStartedAt,
            },
            "keep",
          ),
        );
      }),

    sit: (code, player) =>
      writeWithRetry(code, JOIN_ATTEMPTS, (room) => {
        const held = seatOf(room, player.playerId);
        if (held !== null) {
          // Already seated: same seat, under the name sent with this sit.
          return renamed(room, held, player)
            ? ok(
                written(
                  room,
                  { players: seatPlayer(room, held, renamedSeat(room, held, player)) },
                  "keep",
                ),
              )
            : ok(room);
        }
        // An AI seat is a taken seat: nobody sits in one.
        const seat = room.players.indexOf(null);
        if (seat === -1) return fail(ROOM_ERROR.RoomFull, room);
        const players = seatPlayer(room, seat, human(player));
        // The last empty seat taken: the first turn begins now.
        const turn = players.includes(null) ? "keep" : "restart";
        return ok(withAiMoves(written(room, { players }, turn)));
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
        // An AI seat's turn is nobody else's: no person moves for it, nor for a seat the AI
        // stands in for, their own included.
        if (game.currentPlayer(currentState(session)) !== seat || isStandIn(room.players[seat])) {
          return fail(ROOM_ERROR.NotYourTurn, room);
        }
        // The rules check the move; any random outcome is drawn here, from the server's rng.
        const played = playMove(game, session, move, rng);
        if (!played.ok) return fail(played.error, room);
        // The AI seats to move next answer in this very write.
        const after = playAiSeats(room.players, game, played.value);
        return ok(written(room, { record: toRecord(after) }, turnAfter(game, after)));
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
        // Everyone moves one seat on (the last seat to the first), so who starts alternates, and
        // plays their own seat again: a stand-in lasts one game.
        const count = room.players.length;
        const players = room.players.map((_, seat) => {
          const moved = room.players[(seat + count - 1) % count] ?? null;
          return moved?.kind === "human" ? { ...moved, standIn: false } : moved;
        });
        // An AI seat moved into the first seat opens the new game in this very write.
        const opened = playAiSeats(players, game, fresh.value);
        return ok(
          written(
            room,
            { players, gameNumber: room.gameNumber + 1, record: toRecord(opened) },
            turnAfter(game, opened),
          ),
        );
      }),

    setAiSeat: (code, playerId, seat, on) =>
      writeWithRetry(code, JOIN_ATTEMPTS, (room) => {
        // Checked in this order (design §2), each refusal with the room as it is.
        if (room.hostId === null || room.hostId !== playerId) return fail(ROOM_ERROR.NotHost, room);
        const game = findGame(room.gameId);
        if (game === undefined) return fail(ROOM_ERROR.Unavailable, room);
        // AI seats are for rooms of three or four (Cờ cá ngựa): a two-seat room is played by two people.
        if (!gameHasAi(game) || room.players.length <= MAX_SEATS_WITHOUT_AI) {
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
        // The last empty seat taken by the AI starts the game, and any AI to move plays at once;
        // a seat emptied again leaves the room waiting, without a turn.
        const turn = players.includes(null) ? "stop" : "restart";
        return ok(withAiMoves(written(room, { players }, turn)));
      }),

    resign: (code, playerId, gameNumber) =>
      writeWithRetry(code, MOVE_ATTEMPTS, (room) => {
        const current = gameToLeave(room, playerId, { gameNumber });
        if (!current.ok) return current;
        // Already left to the AI (a second click, another tab): nothing to write, nothing wrong.
        if (isStandIn(room.players[current.seat])) return ok(room);
        return leave(room, current.game, current.session, current.seat, ENDING_REASON.Resigned);
      }),

    claimAbandoned: (code, playerId, position) =>
      writeWithRetry(code, MOVE_ATTEMPTS, (room) => {
        const current = gameToLeave(room, playerId, position);
        if (!current.ok) return current;
        const { seat, game, session } = current;
        const toMove = game.currentPlayer(currentState(session));
        const claim = abandonClaim(
          {
            seats: seatPlays(room.players),
            toMove,
            claimer: seat,
            turnIdleMs: room.turnStartedAt === null ? null : now() - room.turnStartedAt,
          },
          abandonAfterMs,
        );
        if (claim !== ABANDON_CLAIM.Ok) return fail(ROOM_ERROR.NotAbandoned, room);
        return leave(room, game, session, toMove, ENDING_REASON.Abandoned);
      }),

    chat: (code, playerId, { id, body }) =>
      writeWithRetry(
        code,
        CHAT_ATTEMPTS,
        (room) => {
          // Checked in this order (design §3): a duplicate is answered before the limit, so sending
          // again what already went through is never refused.
          const seat = seatOf(room, playerId);
          const sender = seat === null ? null : room.players[seat];
          if (sender?.kind !== "human") return fail(ROOM_ERROR.NotSeated, room);
          const own = room.chat.filter((message) => message.playerId === playerId);
          if (own.some((message) => message.id === id)) return ok(room);
          const clean = parseChatBody(body);
          if (clean === null) return fail(ROOM_ERROR.InvalidChat, room);
          const at = now();
          // Worked out from the room itself: right on every instance and for every tab. Both ways,
          // as instances' clocks differ: a message stamped far ahead must not block its sender
          // until then.
          const recent = own.filter(({ at: sent }) => Math.abs(at - sent) < CHAT_WINDOW_MS);
          if (recent.length >= CHAT_LIMIT) return fail(ROOM_ERROR.ChatTooFast, room);
          const message = {
            seq: room.revision + 1,
            id,
            playerId,
            name: sender.name,
            at,
            body: clean,
          };
          return ok(written(room, { chat: [...room.chat, message].slice(-CHAT_KEPT) }, "keep"));
        },
        { chat: true },
      ),

    watch: (code, listener) => store.subscribe(code, listener),
  };
}

/**
 * The service as the realtime endpoints run it: real randomness, the clock, every game, and the
 * abandon delay of the environment (`ServerEnv.abandonAfterMs`).
 */
export function createDefaultRoomService(store: RoomStore, abandonAfterMs: number): RoomService {
  return createRoomService({ store, rng: cryptoRng, now: Date.now, games: GAMES, abandonAfterMs });
}
