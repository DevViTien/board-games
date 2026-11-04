import type { GameMeta, PlayerIndex } from "@board-games/engine";

/**
 * What resigning and abandoning do in a room: one set of rules for the server (the referee) and
 * the client (to say beforehand what will happen). Change `add-resign-and-abandon`, design §2.
 */

/** A turn left this long can be claimed abandoned by another seated player. */
export const ABANDON_AFTER_MS = 5 * 60_000;

/** Rooms with this many seats or fewer have no AI seats and no stand-ins (a product decision of M6). */
export const MAX_SEATS_WITHOUT_AI = 2;

/** How a seat is played: by its person, by the AI standing in for them, by an AI seat. */
export const SEAT_PLAY = { Self: "self", StandIn: "stand-in", Ai: "ai" } as const;

/** `null` is an empty seat. */
export type SeatPlay = (typeof SEAT_PLAY)[keyof typeof SEAT_PLAY] | null;

/** A taken seat as the server stores it or a client sees it: only what decides how it is played. */
type SeatLike =
  { readonly kind: "human"; readonly standIn: boolean } | { readonly kind: "ai" } | null;

/** How each seat of a room is played. */
export function seatPlays(seats: readonly SeatLike[]): SeatPlay[] {
  return seats.map((seat) => {
    if (seat === null) return null;
    if (seat.kind === "ai") return SEAT_PLAY.Ai;
    return seat.standIn ? SEAT_PLAY.StandIn : SEAT_PLAY.Self;
  });
}

/** Whether the server can play seats of `game`: it supports the AI and has an evaluation. */
export function gameHasAi(game: { readonly meta: GameMeta; readonly evaluate?: unknown }): boolean {
  return game.meta.supportsAI && game.evaluate !== undefined;
}

/** A player who resigns or is ruled to have abandoned: the game ends, or the AI stands in. */
export const LEAVE_OUTCOME = { End: "end", StandIn: "stand-in" } as const;

export type LeaveOutcome = (typeof LEAVE_OUTCOME)[keyof typeof LEAVE_OUTCOME];

/**
 * What happens when the player in `leaver` leaves the game. The AI stands in only in a room of
 * more than two seats of a game the AI plays, and only while someone else still plays their own
 * seat: nobody left to play with, the game ends.
 */
export function leaveOutcome(
  seats: readonly SeatPlay[],
  leaver: PlayerIndex,
  hasAi: boolean,
): LeaveOutcome {
  const othersPlay = seats.some((seat, index) => index !== leaver && seat === SEAT_PLAY.Self);
  return hasAi && seats.length > MAX_SEATS_WITHOUT_AI && othersPlay
    ? LEAVE_OUTCOME.StandIn
    : LEAVE_OUTCOME.End;
}

export const ABANDON_CLAIM = {
  Ok: "ok",
  /** Everything is right but the turn has not lasted `ABANDON_AFTER_MS` yet. */
  TooEarly: "too-early",
  /** This player cannot claim this turn at all. */
  NotClaimable: "not-claimable",
} as const;

export type AbandonClaim = (typeof ABANDON_CLAIM)[keyof typeof ABANDON_CLAIM];

export interface AbandonClaimView {
  readonly seats: readonly SeatPlay[];
  /** The seat whose turn it is. */
  readonly toMove: PlayerIndex;
  /** The seat of the player who would claim; `null` without one. */
  readonly claimer: PlayerIndex | null;
  /** How long the turn has lasted; `null` when there is no turn running. */
  readonly turnIdleMs: number | null;
}

/**
 * Whether `claimer` may claim the turn of `toMove` abandoned: they hold a seat (played by
 * themselves or by a stand-in), it is someone else's turn, a person plays that seat themselves,
 * and the turn has lasted `abandonAfterMs`.
 */
export function abandonClaim(
  { seats, toMove, claimer, turnIdleMs }: AbandonClaimView,
  abandonAfterMs: number = ABANDON_AFTER_MS,
): AbandonClaim {
  const claimerSeat = claimer === null ? null : (seats[claimer] ?? null);
  if (
    claimer === null ||
    claimer === toMove ||
    (claimerSeat !== SEAT_PLAY.Self && claimerSeat !== SEAT_PLAY.StandIn) ||
    seats[toMove] !== SEAT_PLAY.Self ||
    turnIdleMs === null
  ) {
    return ABANDON_CLAIM.NotClaimable;
  }
  return turnIdleMs >= abandonAfterMs ? ABANDON_CLAIM.Ok : ABANDON_CLAIM.TooEarly;
}
