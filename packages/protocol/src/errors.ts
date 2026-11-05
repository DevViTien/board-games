import type { EngineErrorCode } from "@board-games/engine";

/**
 * Why the server turned down a greeting or a request: the one table the server, the client and
 * the spec share (design of `add-online-rooms`, §2). The app translates each code.
 */
export const ROOM_ERROR = {
  /** Broken JSON, a binary frame, or a message that fails the schema. */
  InvalidMessage: "invalid-message",
  /** The greeting carries another `PROTOCOL_VERSION`: the tab predates a deploy. */
  OutdatedClient: "outdated-client",
  UnknownGame: "unknown-game",
  /** No such room, or it expired. */
  RoomNotFound: "room-not-found",
  RoomFull: "room-full",
  /** A move or rematch from a connection that holds no seat. */
  NotSeated: "not-seated",
  WaitingForPlayers: "waiting-for-players",
  NotYourTurn: "not-your-turn",
  /** The move or rematch targets a game or a position the room has moved past. */
  StaleMove: "stale-move",
  GameNotOver: "game-not-over",
  /** Only the room's host may mark or unmark an AI seat. */
  NotHost: "not-host",
  /** An AI seat asked for on a seat someone (or the AI) already holds. */
  SeatTaken: "seat-taken",
  /** An AI seat to unmark that is not one. */
  NotAiSeat: "not-ai-seat",
  /** AI seats change only before the current game's first move. */
  GameStarted: "game-started",
  /** A seat number the room does not have. Not `invalid-message`, which makes clients reconnect. */
  InvalidSeat: "invalid-seat",
  /**
   * A claim that the player to move left: their turn has not lasted `ABANDON_AFTER_MS`, it is the
   * claimer's own turn, or no person plays the seat to move.
   */
  NotAbandoned: "not-abandoned",
  /** A chat message empty once cleaned, too long, or naming no preset or reaction of the app. */
  InvalidChat: "invalid-chat",
  /** More chat messages from one player than the room lets through; the connection stays. */
  ChatTooFast: "chat-too-fast",
  TooManyMessages: "too-many-messages",
  /** The room store failed or did not answer in time; worth retrying. */
  Unavailable: "unavailable",
} as const;

export type RoomErrorCode = (typeof ROOM_ERROR)[keyof typeof ROOM_ERROR];

/** A room error, or the engine's own code when the rules refuse something (`illegal-move`…). */
export type RejectionCode = RoomErrorCode | EngineErrorCode;
