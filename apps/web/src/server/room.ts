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
export const STORED_ROOM_FORMAT = 2;

/** A person as the service takes them in: who claims a seat, and the name the room shows. */
export interface RoomPlayer {
  /** The secret that claims the seat; never sent to any client. */
  readonly playerId: string;
  readonly name: string;
}

/** A taken seat: a person, or the AI the server plays for the room (change `add-room-ai-seats`). */
export type StoredSeat = ({ readonly kind: "human" } & RoomPlayer) | { readonly kind: "ai" };

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
        roomPlayerSchema.extend({ kind: z.literal("human") }),
        z.object({ kind: z.literal("ai") }),
      ])
      .nullable(),
  ),
}) satisfies z.ZodType<StoredRoom>;

/**
 * A room written before AI seats and hosts (format 1): every taken seat is a person, and nobody is
 * the host. Read as format 2, and written back as such on its next change, so a game in progress
 * survives the deploy.
 */
const formatOneSchema = z
  .object({
    ...roomFields,
    format: z.literal(1),
    players: z.array(roomPlayerSchema.nullable()),
  })
  .transform(({ players, ...room }): StoredRoom => ({
    ...room,
    format: STORED_ROOM_FORMAT,
    hostId: null,
    players: players.map((player) => (player === null ? null : { kind: "human", ...player })),
  }));

const storedRoomSchema = z.union([currentFormatSchema, formatOneSchema]);

/** A stored room read back from its JSON, or `null` when it is not one. */
export function parseStoredRoom(json: string): StoredRoom | null {
  try {
    const parsed = storedRoomSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** The room as clients see it: names and AI seats only, the host by seat, no `playerId`. */
export function toRoomView(room: StoredRoom): RoomView {
  return {
    code: room.code,
    gameId: room.gameId,
    revision: room.revision,
    gameNumber: room.gameNumber,
    seats: room.players.map((seat) => {
      if (seat === null) return null;
      return seat.kind === "ai" ? { kind: "ai" } : { kind: "human", name: seat.name };
    }),
    host: room.hostId === null ? null : seatOf(room, room.hostId),
    record: room.record,
  };
}

/** The seat `playerId` holds in the current game, or `null`. Changes with every rematch. */
export function seatOf(room: StoredRoom, playerId: string): PlayerIndex | null {
  const seat = room.players.findIndex(
    (player) => player?.kind === "human" && player.playerId === playerId,
  );
  return seat === -1 ? null : seat;
}
