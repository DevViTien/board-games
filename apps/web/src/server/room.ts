import type { GameRecord, PlayerIndex } from "@board-games/engine";
import {
  type ChatBody,
  chatBodySchema,
  gameRecordSchema,
  looseListSchema,
  type RoomCode,
  roomCodeSchema,
  type RoomView,
} from "@board-games/protocol";
import { z } from "zod";

/**
 * Raised on a change to what is stored that an older server could not read: a rollback then loses
 * every room, as another format reads as no room. `chat` did not raise it: an older server drops it,
 * and `parseStoredRoom` reads a room without it. `parseStoredRoom` still reads the formats listed in
 * its schema (a room written before a deploy keeps its game); any other format reads as no room.
 */
export const STORED_ROOM_FORMAT = 3;

/** A person as the service takes them in: who claims a seat, and the name the room shows. */
export interface RoomPlayer {
  /** The secret that claims the seat; never sent to any client. */
  readonly playerId: string;
  readonly name: string;
}

/**
 * A taken seat: a person, or the AI the server plays for the room (change `add-room-ai-seats`).
 * `standIn`: the person resigned or was ruled to have left, and the server's AI plays the seat
 * until the game ends; the seat stays theirs (change `add-resign-and-abandon`).
 */
export type StoredSeat =
  ({ readonly kind: "human"; readonly standIn: boolean } & RoomPlayer) | { readonly kind: "ai" };

/** A chat message as the room keeps it (design of `add-room-chat`, §2). */
export interface StoredChatMessage {
  /** The revision of the write that added it: rises through the room, whoever sends. */
  readonly seq: number;
  /** Chosen by the sender, unique among their own messages: sending it again adds nothing. */
  readonly id: string;
  /** For the rate limit, for telling duplicates, and for `mine`; never sent to any client. */
  readonly playerId: string;
  /** The sender's name when they sent it: seats rotate and names change. */
  readonly name: string;
  /** Server time, in ms. */
  readonly at: number;
  readonly body: ChatBody;
}

/** A room as the store keeps it: the only state of a room, so any instance can serve it. */
export interface StoredRoom {
  readonly format: typeof STORED_ROOM_FORMAT;
  readonly code: RoomCode;
  readonly gameId: string;
  /** Goes up by one on every write; the store refuses a write based on an older revision. */
  readonly revision: number;
  readonly gameNumber: number;
  /**
   * The `playerId` of the room's creator, who alone may mark AI seats; it never changes. `null`
   * for a room stored before hosts existed (format 1).
   */
  readonly hostId: string | null;
  /** By seat of the current game; `null` is an empty seat. */
  readonly players: readonly (StoredSeat | null)[];
  readonly record: GameRecord;
  /** Server time of the last write, in ms. */
  readonly updatedAt: number;
  /**
   * Server time, in ms, at which the current turn began (the last move, the new game, the room
   * filling up); `null` while the room waits for players or once the game has a result.
   */
  readonly turnStartedAt: number | null;
  /**
   * Server time, in ms, at which the current game began (every seat taken, or "Chơi lại") and got a
   * result (design of `add-jelly-crew-game` §10.4). Absent from a room stored before them.
   */
  readonly gameStartedAt?: number | null;
  readonly gameEndedAt?: number | null;
  /** The latest messages, oldest first: outside `record`, so a game stays its list of moves. */
  readonly chat: readonly StoredChatMessage[];
}

const storedChatMessageSchema = z.object({
  seq: z.number().int().positive(),
  id: z.string(),
  playerId: z.string(),
  name: z.string(),
  at: z.number(),
  body: chatBodySchema,
}) satisfies z.ZodType<StoredChatMessage>;

/**
 * Read message by message (`looseListSchema`), so a damaged one, or one of a later version, never
 * makes the whole room read as no room. Not a list at all reads as an empty one, like a room stored
 * before chat: `STORED_ROOM_FORMAT` did not have to change, and a rollback keeps every room.
 */
const storedChatSchema = looseListSchema(storedChatMessageSchema);

const roomFields = {
  code: roomCodeSchema,
  gameId: z.string(),
  revision: z.number().int().positive(),
  gameNumber: z.number().int().positive(),
  record: gameRecordSchema,
  updatedAt: z.number(),
};

const roomPlayerSchema = z.object({ playerId: z.string(), name: z.string() });

/** Data from the store is checked like any other input: another version may have written it. */
const currentFormatSchema = z.object({
  ...roomFields,
  format: z.literal(STORED_ROOM_FORMAT),
  hostId: z.string().nullable(),
  players: z.array(
    z
      .discriminatedUnion("kind", [
        roomPlayerSchema.extend({ kind: z.literal("human"), standIn: z.boolean() }),
        z.object({ kind: z.literal("ai") }),
      ])
      .nullable(),
  ),
  turnStartedAt: z.number().nullable(),
  // Not in the format's number: a room stored before them reads as one without, and a rollback
  // keeps every room.
  gameStartedAt: z.exactOptional(z.number().nullable()),
  gameEndedAt: z.exactOptional(z.number().nullable()),
  chat: storedChatSchema,
}) satisfies z.ZodType<StoredRoom>;

/**
 * When the turn of a room stored before turns were timed (formats 1 and 2) began: its last write,
 * which happened at or after that, so a claim can only come later than it should, never earlier.
 */
function legacyTurnStart(room: {
  readonly updatedAt: number;
  readonly players: readonly unknown[];
}): number | null {
  return room.players.includes(null) ? null : room.updatedAt;
}

/**
 * A room written before resigning (format 2): nobody has a stand-in, and the turn began at the last
 * write. Read as format 3, and written back as such on its next change, so a game in progress
 * survives the deploy.
 */
const formatTwoSchema = z
  .object({
    ...roomFields,
    format: z.literal(2),
    hostId: z.string().nullable(),
    players: z.array(
      z
        .discriminatedUnion("kind", [
          roomPlayerSchema.extend({ kind: z.literal("human") }),
          z.object({ kind: z.literal("ai") }),
        ])
        .nullable(),
    ),
  })
  .transform((room): StoredRoom => ({
    ...room,
    format: STORED_ROOM_FORMAT,
    players: room.players.map((seat) =>
      seat?.kind === "human" ? { ...seat, standIn: false } : seat,
    ),
    turnStartedAt: legacyTurnStart(room),
    chat: [],
  }));

/**
 * A room written before AI seats and hosts (format 1): every taken seat is a person, and nobody is
 * the host. Read as format 3, like format 2.
 */
const formatOneSchema = z
  .object({
    ...roomFields,
    format: z.literal(1),
    players: z.array(roomPlayerSchema.nullable()),
  })
  .transform((room): StoredRoom => ({
    ...room,
    format: STORED_ROOM_FORMAT,
    hostId: null,
    players: room.players.map((player) =>
      player === null ? null : { kind: "human", ...player, standIn: false },
    ),
    turnStartedAt: legacyTurnStart(room),
    chat: [],
  }));

const storedRoomSchema = z.union([currentFormatSchema, formatTwoSchema, formatOneSchema]);

/** A stored room read back from its JSON, or `null` when it is not one. */
export function parseStoredRoom(json: string): StoredRoom | null {
  try {
    const parsed = storedRoomSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * The room as the client of `viewerId` sees it at server time `now`: names, stand-ins and AI seats
 * only, the host by seat, no `playerId`, how long the turn has lasted, and, only for someone with a
 * seat, the chat, each message telling whether it is theirs. Never replays the game: it runs for
 * every connection on every send, and replaying a long game of chess takes hundreds of ms.
 */
export function toRoomView(room: StoredRoom, now: number, viewerId: string): RoomView {
  return {
    code: room.code,
    gameId: room.gameId,
    revision: room.revision,
    gameNumber: room.gameNumber,
    seats: room.players.map((seat) => {
      if (seat === null) return null;
      return seat.kind === "ai"
        ? { kind: "ai" }
        : { kind: "human", name: seat.name, standIn: seat.standIn };
    }),
    host: room.hostId === null ? null : seatOf(room, room.hostId),
    record: room.record,
    // Instances' clocks may differ by a few ms: never a negative duration.
    turnIdleMs: room.turnStartedAt === null ? null : Math.max(0, now - room.turnStartedAt),
    gameTime:
      room.gameStartedAt == null
        ? null
        : { startedAt: room.gameStartedAt, endedAt: room.gameEndedAt ?? null },
    chat:
      seatOf(room, viewerId) === null
        ? []
        : room.chat.map(({ seq, id, playerId, name, body }) => ({
            seq,
            id,
            name,
            mine: playerId === viewerId,
            body,
          })),
  };
}

/** The seat `playerId` holds in the current game, or `null`. Changes with every rematch. */
export function seatOf(room: StoredRoom, playerId: string): PlayerIndex | null {
  const seat = room.players.findIndex(
    (player) => player?.kind === "human" && player.playerId === playerId,
  );
  return seat === -1 ? null : seat;
}
