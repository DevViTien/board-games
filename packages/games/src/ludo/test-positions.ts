// Test helpers for Cờ cá ngựa: positions described by each horse's progress (design §1), and games
// played with chosen die faces. Only the tests import this file.
import {
  applyEntry,
  createSession,
  currentState,
  type PlayerIndex,
  type Session,
} from "@board-games/engine";

import { HORSES, IN_STABLE, type LudoOutcome, SEAT_COLOURS } from "./constants";
import { LUDO_DEFAULT_OPTIONS, type LudoOptions } from "./options";
import { ludo, type LudoMove, type LudoState } from "./rules";

export type LudoSession = Session<LudoState, LudoMove, LudoOutcome, LudoOptions>;

export interface PositionSpec {
  readonly players?: 2 | 3 | 4;
  /** Progress of each seat's horses; missing horses (and seats) are in their stable. */
  readonly horses?: Readonly<Record<number, readonly number[]>>;
  readonly toMove?: PlayerIndex;
  /** The number just rolled; absent: the player to move is about to roll. */
  readonly die?: LudoOutcome;
  readonly options?: Partial<LudoOptions>;
}

/** A position nobody has won yet, built directly (not by playing moves). */
export function position({
  players = 4,
  horses = {},
  toMove = 0,
  die,
  options = {},
}: PositionSpec = {}): LudoState {
  const colours = SEAT_COLOURS[players];
  return {
    options: { ...LUDO_DEFAULT_OPTIONS, ...options },
    colours,
    horses: colours.map((_colour, seat) =>
      Array.from({ length: HORSES }, (_unused, horse) => horses[seat]?.[horse] ?? IN_STABLE),
    ),
    toMove,
    die: die ?? null,
    last: null,
    winner: null,
    ply: 0,
    kicks: colours.map(() => 0),
  };
}

/** The moves the player to move may choose, as horse numbers (`-1` for a roll). */
export function choices(state: LudoState): number[] {
  return ludo.legalMoves(state).map((move) => (move.type === "roll" ? -1 : move.horse));
}

/** `state` after rolling `face`. */
export function roll(state: LudoState, face: LudoOutcome): LudoState {
  return ludo.applyMove(state, { type: "roll" }, face);
}

/** `state` after moving horse `horse` with the number already rolled. */
export function moveHorse(state: LudoState, horse: number): LudoState {
  return ludo.applyMove(state, { type: "move", horse });
}

export function newGame(players: 2 | 3 | 4 = 4): LudoSession {
  const created = createSession(ludo, { playerCount: players, options: LUDO_DEFAULT_OPTIONS });
  if (!created.ok) throw new Error(created.error);
  return created.value;
}

/** One step of a game: a roll with a chosen face, or a horse moved with the number rolled. */
export type Step = { readonly roll: LudoOutcome } | { readonly horse: number };

/** Plays `steps` through the session, rolls locked to their faces, failing on a refused step. */
export function play(session: LudoSession, steps: readonly Step[]): LudoSession {
  return steps.reduce((current, step, index) => {
    const entry =
      "roll" in step
        ? { move: { type: "roll" }, outcome: step.roll }
        : { move: { type: "move", horse: step.horse } };
    const played = applyEntry(ludo, current, entry);
    if (!played.ok) throw new Error(`step ${index + 1} (${JSON.stringify(step)}): ${played.error}`);
    return played.value;
  }, session);
}

export function stateOf(session: LudoSession): LudoState {
  return currentState(session);
}
