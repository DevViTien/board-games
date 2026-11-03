import { ENGINE_ERROR, type PlayerIndex } from "@board-games/engine";
import { z } from "zod";

import { type RejectionCode, ROOM_ERROR } from "./errors";
import {
  playerIndexSchema,
  playerNameSchema,
  type RoomCode,
  roomCodeSchema,
  type RoomView,
  roomViewSchema,
} from "./room";

/** Larger messages make the server close the connection; no valid message comes close. */
export const MAX_MESSAGE_BYTES = 16 * 1024;

/** WebSocket close codes of this protocol (4000–4999 are free for applications). */
export const CLOSE_CODE = {
  /** No greeting in time: the client reconnects as after any lost connection. */
  GreetingTimeout: 4000,
  /** Nothing but pings for too long: the client stays idle and does not reconnect by itself. */
  Idle: 4001,
} as const;

/**
 * The player's secret identity: whoever sends it gets that player's seat back. Random, kept in
 * the browser's storage (change `add-online-play`).
 */
export const playerIdSchema = z.string().regex(/^[\w-]{16,64}$/u);

const protocolSchema = z.number().int().nonnegative();

/** Long enough for a code typed with spaces; `normalizeRoomCode` decides whether it is one. */
const typedRoomCodeSchema = z.string().max(64);

const gameNumberSchema = z.number().int().positive();

// Client messages are strict: an unknown field means a client this server does not understand.
const clientMessageSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("create"),
    protocol: protocolSchema,
    gameId: z.string().min(1).max(64),
    playerCount: z.exactOptional(z.number().int().positive()),
    /** Checked by the game's own `parseOptions`. */
    options: z.exactOptional(z.unknown()),
    playerId: playerIdSchema,
    name: playerNameSchema,
  }),
  z.strictObject({
    type: z.literal("join"),
    protocol: protocolSchema,
    code: typedRoomCodeSchema,
    playerId: playerIdSchema,
    name: playerNameSchema,
  }),
  /** Takes the lowest empty seat; carries the name, which may have been edited since the greeting. */
  z.strictObject({ type: z.literal("sit"), name: playerNameSchema }),
  z.strictObject({
    type: z.literal("move"),
    gameNumber: gameNumberSchema,
    /** How many moves the game had when the move was sent: the position it was played on. */
    moveIndex: z.number().int().nonnegative(),
    /** Checked by the game's rules. */
    move: z.unknown(),
  }),
  z.strictObject({ type: z.literal("rematch"), gameNumber: gameNumberSchema }),
  /**
   * The host marks an empty seat as played by the server's AI (`on`), or empties an AI seat again.
   * Any whole number, negative too: a seat the room does not have is refused with `invalid-seat`, not as a broken
   * message, which would make the client reconnect.
   */
  z.strictObject({
    type: z.literal("ai-seat"),
    seat: z.number().int(),
    on: z.boolean(),
  }),
  z.strictObject({ type: z.literal("ping") }),
]);

export type ClientMessage = z.output<typeof clientMessageSchema>;

/** The requests a `rejected` answers; `null` for a message that could not be read at all. */
const REJECTABLE_REQUESTS = ["sit", "move", "rematch", "ai-seat"] as const;
export type RejectableRequest = (typeof REJECTABLE_REQUESTS)[number];

const rejectionCodeSchema = z.union([z.enum(ROOM_ERROR), z.enum(ENGINE_ERROR)]);

export type ServerMessage =
  | { readonly type: "created"; readonly code: RoomCode }
  /** The whole room, with the seat of the player on this connection (`null`: watching). */
  | { readonly type: "room"; readonly room: RoomView; readonly you: PlayerIndex | null }
  | {
      readonly type: "rejected";
      readonly request: RejectableRequest | null;
      readonly code: RejectionCode;
    }
  /** A failed greeting or a fatal error; the server closes the connection right after. */
  | { readonly type: "error"; readonly code: RejectionCode }
  | { readonly type: "pong" };

// Server messages are loose: an older client keeps working when a newer server adds a field.
const serverMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("created"), code: roomCodeSchema }),
  z.object({ type: z.literal("room"), room: roomViewSchema, you: playerIndexSchema.nullable() }),
  z.object({
    type: z.literal("rejected"),
    request: z.enum(REJECTABLE_REQUESTS).nullable(),
    code: rejectionCodeSchema,
  }),
  z.object({ type: z.literal("error"), code: rejectionCodeSchema }),
  z.object({ type: z.literal("pong") }),
]) satisfies z.ZodType<ServerMessage>;

/** Read before the full schema, so a client of another version is told so, whatever else it sent. */
const greetingVersionSchema = z.object({
  type: z.enum(["create", "join"]),
  protocol: z.number(),
});

/**
 * The protocol version of a greeting (`create`, `join`), even one that fails the rest of the
 * schema; `null` for anything else.
 */
export function readGreetingVersion(raw: unknown): number | null {
  const parsed = greetingVersionSchema.safeParse(raw);
  return parsed.success ? parsed.data.protocol : null;
}

/** A message from a client, already decoded from JSON, or `null` when it breaks the protocol. */
export function parseClientMessage(raw: unknown): ClientMessage | null {
  const parsed = clientMessageSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** A message from the server, already decoded from JSON, or `null` when it cannot be read. */
export function parseServerMessage(raw: unknown): ServerMessage | null {
  const parsed = serverMessageSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
