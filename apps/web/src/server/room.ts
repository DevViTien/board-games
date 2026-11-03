import type { GameRecord, PlayerIndex } from "@board-games/engine";
import {
  gameRecordSchema,
  type RoomCode,
  roomCodeSchema,
  type RoomView,
} from "@board-games/protocol";
import { z } from "zod";

/** Raised on every change to what is stored; a room in another format reads as no room. */
export const STORED_ROOM_FORMAT = 1;

export interface RoomPlayer {
  /** The secret that claims the seat; never sent to any client. */
  readonly playerId: string;
  readonly name: string;
}

/** A room as the store keeps it: the only state of a room, so any instance can serve it. */
export interface StoredRoom {
  readonly format: typeof STORED_ROOM_FORMAT;
  readonly code: RoomCode;
  readonly gameId: string;
  /** Goes up by one on every write; the store refuses a write based on an older revision. */
  readonly revision: number;
  readonly gameNumber: number;
  /** By seat of the current game; `null` is an empty seat. */
  readonly players: readonly (RoomPlayer | null)[];
  readonly record: GameRecord;
  /** Server time of the last write, in ms. */
  readonly updatedAt: number;
}

/** Data from the store is checked like any other input: another version may have written it. */
const storedRoomSchema = z.object({
  format: z.literal(STORED_ROOM_FORMAT),
  code: roomCodeSchema,
  gameId: z.string(),
  revision: z.number().int().positive(),
  gameNumber: z.number().int().positive(),
  players: z.array(z.object({ playerId: z.string(), name: z.string() }).nullable()),
  record: gameRecordSchema,
  updatedAt: z.number(),
}) satisfies z.ZodType<StoredRoom>;

/** A stored room read back from its JSON, or `null` when it is not one. */
export function parseStoredRoom(json: string): StoredRoom | null {
  try {
    const parsed = storedRoomSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** The room as clients see it: names only, no `playerId`. */
export function toRoomView(room: StoredRoom): RoomView {
  return {
    code: room.code,
    gameId: room.gameId,
    revision: room.revision,
    gameNumber: room.gameNumber,
    seats: room.players.map((player) => (player === null ? null : { name: player.name })),
    record: room.record,
  };
}

/** The seat `playerId` holds in the current game, or `null`. Changes with every rematch. */
export function seatOf(room: StoredRoom, playerId: string): PlayerIndex | null {
  const seat = room.players.findIndex((player) => player?.playerId === playerId);
  return seat === -1 ? null : seat;
}
