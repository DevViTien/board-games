import {
  ENDING_REASON,
  type GameRecord,
  type PlayerIndex,
  RECORD_VERSION,
} from "@board-games/engine";
import { z } from "zod";

import { chatMessagesSchema, type ChatMessageView } from "./chat";

/**
 * Raised on a change that an older client cannot handle, not on every change: server messages are
 * read loosely, so an older client simply drops a new field (`RoomView.chat`). Sent in the greeting (`create`,
 * `join`), so a tab left open across a deploy is told to reload instead of misreading messages.
 */
export const PROTOCOL_VERSION = 3;

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

/**
 * Who holds a taken seat: a person, by the name they chose, or the AI the server plays. `standIn`:
 * the person resigned or was ruled to have left, and the server's AI plays their seat until the
 * game ends; the seat is still theirs.
 */
export type SeatView =
  | { readonly kind: "human"; readonly name: string; readonly standIn: boolean }
  | { readonly kind: "ai" };

/**
 * A room as one client sees it: the same for everyone but for its chat, which only people with a
 * seat receive, each told which messages are theirs. Holds names only: a `playerId` is the secret
 * that claims a seat, so it never leaves the server.
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
  /** The seat of the room's host (its creator) in the current game; `null` for a room without one. */
  readonly host: PlayerIndex | null;
  /** The current game. Still untrusted: the client rebuilds it with the engine's `fromRecord`. */
  readonly record: GameRecord;
  /**
   * How long the current turn had lasted, by the server's clock, when this copy was sent; `null`
   * while the room waits for players or once the game has a result.
   */
  readonly turnIdleMs: number | null;
  /**
   * When the current game began (the room full, or "Chơi lại") and when it got a result, by the
   * server's clock, in ms: one clock, so the difference is the game's length on every device.
   * Absent or `null` from a server or a room that predates it.
   */
  readonly gameTime?: GameTimeView | null;
  /** The room's latest messages, oldest first; empty for a client without a seat. */
  readonly chat: readonly ChatMessageView[];
}

/** The span of a game by the server's clock (`RoomView.gameTime`). */
export interface GameTimeView {
  readonly startedAt: number;
  readonly endedAt: number | null;
}

const countSchema = z.number().int().nonnegative();

export const playerIndexSchema = countSchema satisfies z.ZodType<PlayerIndex>;

const seatViewSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("human"), name: z.string(), standIn: z.boolean().catch(false) }),
  z.object({ kind: z.literal("ai") }),
]) satisfies z.ZodType<SeatView>;

export const gameRecordSchema = z.object({
  version: z.literal(RECORD_VERSION),
  gameId: z.string(),
  playerCount: z.number().int().positive(),
  options: z.unknown(),
  entries: z.array(z.object({ move: z.unknown(), outcome: z.exactOptional(z.unknown()) })),
  /** A resignation or an abandoned game; the engine's `fromRecord` checks the seat is in the game. */
  ending: z.exactOptional(
    z.object({ reason: z.enum(ENDING_REASON), player: z.number().int().nonnegative() }),
  ),
});

/** Unknown fields are dropped, so a `playerId` sent by mistake never reaches the app. */
export const roomViewSchema = z.object({
  code: roomCodeSchema,
  gameId: z.string(),
  revision: countSchema,
  gameNumber: z.number().int().positive(),
  seats: z.array(seatViewSchema.nullable()),
  // Loose like every server message: missing (a server that predates hosts) reads as no host.
  host: playerIndexSchema.nullable().catch(null),
  record: gameRecordSchema,
  turnIdleMs: countSchema.nullable().catch(null),
  // Absent stays absent (a server or a room that predates it); a broken one reads as unknown.
  gameTime: z.exactOptional(
    z.object({ startedAt: z.number(), endedAt: z.number().nullable() }).nullable().catch(null),
  ),
  chat: chatMessagesSchema,
}) satisfies z.ZodType<RoomView>;
