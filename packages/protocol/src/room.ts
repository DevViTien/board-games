import { type GameRecord, type PlayerIndex, RECORD_VERSION } from "@board-games/engine";
import { z } from "zod";

/**
 * Raised on every change that an older client cannot handle. Sent in the greeting (`create`,
 * `join`), so a tab left open across a deploy is told to reload instead of misreading messages.
 */
export const PROTOCOL_VERSION = 1;

/** Upper-case letters and digits that cannot be mistaken for one another: no 0/O, no 1/I/L. */
export const ROOM_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const ROOM_CODE_LENGTH = 6;

/** A room code in canonical form (upper case, no spaces); only `normalizeRoomCode` makes one. */
export type RoomCode = string & { readonly __brand: "RoomCode" };

const ROOM_CODE_PATTERN = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${String(ROOM_CODE_LENGTH)}}$`);

/**
 * A code as typed or pasted by a player (`abc 234`, a trailing space) in canonical form, or
 * `null` when it cannot be a room code at all.
 */
export function normalizeRoomCode(raw: string): RoomCode | null {
  const code = raw.replace(/\s+/gu, "").toUpperCase();
  return ROOM_CODE_PATTERN.test(code) ? (code as RoomCode) : null;
}

/**
 * A code already in canonical form: what the server sends and stores, never what a player typed
 * (that goes through `normalizeRoomCode`).
 */
export const roomCodeSchema = z.custom<RoomCode>(
  (value) => typeof value === "string" && ROOM_CODE_PATTERN.test(value),
);

export const PLAYER_NAME_MAX_LENGTH = 24;

/**
 * Control and format characters: line breaks, bidi overrides (U+202E) that would flip the text
 * around a name, and zero-width characters that make two names look the same.
 */
const INVISIBLE_CHARACTERS = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;

/**
 * A player's temporary name, trimmed and in NFC so that the same name typed on two devices is
 * equal. Its length counts code points, so an emoji counts once.
 */
export const playerNameSchema = z
  .string()
  .trim()
  .normalize("NFC")
  .refine((name) => {
    const length = Array.from(name).length;
    return length >= 1 && length <= PLAYER_NAME_MAX_LENGTH && !INVISIBLE_CHARACTERS.test(name);
  });

export interface SeatView {
  readonly name: string;
}

/**
 * A room as every client sees it. Holds names only: a `playerId` is the secret that claims a
 * seat, so it never leaves the server.
 */
export interface RoomView {
  readonly code: RoomCode;
  readonly gameId: string;
  /** Goes up by one on every change of the room; only for clients to order the copies they get. */
  readonly revision: number;
  /** Which game of the room this is, from 1. */
  readonly gameNumber: number;
  /** By `PlayerIndex` of the current game; `null` is an empty seat. */
  readonly seats: readonly (SeatView | null)[];
  /** The current game. Still untrusted: the client rebuilds it with the engine's `fromRecord`. */
  readonly record: GameRecord;
}

const countSchema = z.number().int().nonnegative();

export const gameRecordSchema = z.object({
  version: z.literal(RECORD_VERSION),
  gameId: z.string(),
  playerCount: z.number().int().positive(),
  options: z.unknown(),
  entries: z.array(z.object({ move: z.unknown(), outcome: z.exactOptional(z.unknown()) })),
});

/** Unknown fields are dropped, so a `playerId` sent by mistake never reaches the app. */
export const roomViewSchema = z.object({
  code: roomCodeSchema,
  gameId: z.string(),
  revision: countSchema,
  gameNumber: z.number().int().positive(),
  seats: z.array(z.object({ name: z.string() }).nullable()),
  record: gameRecordSchema,
}) satisfies z.ZodType<RoomView>;

export const playerIndexSchema = countSchema satisfies z.ZodType<PlayerIndex>;
