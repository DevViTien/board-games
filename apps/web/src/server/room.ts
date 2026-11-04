import type { GameRecord, PlayerIndex } from "@board-games/engine";
import {
  gameRecordSchema,
  type RoomCode,
  roomCodeSchema,
  type RoomView,
} from "@board-games/protocol";
import { z } from "zod";

/**
 * Raised on every change to what is stored. `parseStoredRoom` still reads the formats listed in
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
}

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
 * The room as clients see it at server time `now`: names, stand-ins and AI seats only, the host by
 * seat, no `playerId`, and how long the turn has lasted. Never replays the game: it runs for every
 * connection on every send, and replaying a long game of chess takes hundreds of ms.
 */
export function toRoomView(room: StoredRoom, now: number): RoomView {
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
  };
}

/** The seat `playerId` holds in the current game, or `null`. Changes with every rematch. */
export function seatOf(room: StoredRoom, playerId: string): PlayerIndex | null {
  const seat = room.players.findIndex(
    (player) => player?.kind === "human" && player.playerId === playerId,
  );
  return seat === -1 ? null : seat;
}
