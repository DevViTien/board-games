import {
  GAME_CATEGORY,
  type GameDefinition,
  type PlayerIndex,
  type SetupContext,
  type WeightedOutcome,
} from "@board-games/engine";

import { ludoEvaluate } from "./ai";
import {
  DIE_FACES,
  HORSES,
  IN_STABLE,
  type LudoColour,
  type LudoOutcome,
  SEAT_COLOURS,
} from "./constants";
import { hasWon, kickedAt, movableHorses, targetOf, trackOccupancy } from "./moves";
import { LUDO_DEFAULT_OPTIONS, type LudoOptions, parseLudoOptions } from "./options";

/** A turn is a roll, then the choice of a horse to move with the number rolled. */
export type LudoMove =
  { readonly type: "roll" } | { readonly type: "move"; readonly horse: number };

/** What the move just played did: for the move's label, the board's markers and its animations. */
export type LudoEvent =
  | {
      readonly kind: "roll";
      readonly player: PlayerIndex;
      readonly face: LudoOutcome;
      /** No horse could move and the turn passed. */
      readonly lost: boolean;
      /** No horse could move with a 6: the same player rolls again (G9). */
      readonly again: boolean;
    }
  | {
      readonly kind: "move";
      readonly player: PlayerIndex;
      readonly horse: number;
      /** The number rolled for it, kept for the die on the board. */
      readonly face: LudoOutcome;
      /** Progress before and after the move (design §1). */
      readonly from: number;
      readonly to: number;
      /** The opponent's horse sent back to its stable, with the progress it had. */
      readonly kicked: {
        readonly player: PlayerIndex;
        readonly horse: number;
        readonly from: number;
      } | null;
      /** The move followed a 6: the same player rolls again. */
      readonly again: boolean;
    };

export interface LudoState {
  /** The rule options are part of the state, since the AI (in a Worker) only receives the state. */
  readonly options: LudoOptions;
  /** The colour of each seat: 2 players → Red and Yellow, 3 → the first three, 4 → all. */
  readonly colours: readonly LudoColour[];
  /** `horses[seat][horse]` is the horse's progress (`constants.ts`). */
  readonly horses: readonly (readonly number[])[];
  readonly toMove: PlayerIndex;
  /** The number just rolled while the player chooses a horse; `null` while a roll is awaited. */
  readonly die: LudoOutcome | null;
  readonly last: LudoEvent | null;
  readonly winner: PlayerIndex | null;
  /**
   * Moves played so far, rolls included: tells a new move from a return to an older one (undo),
   * for the board's animations.
   */
  readonly ply: number;
  /** How many of the other players' horses each seat has sent back to their stable (the AI's). */
  readonly kicks: readonly number[];
}

const ROLL: LudoMove = { type: "roll" };
const HORSE_MOVES: readonly LudoMove[] = Array.from({ length: HORSES }, (_unused, horse) => ({
  type: "move",
  horse,
}));
const ROLL_OUTCOMES: readonly WeightedOutcome<LudoOutcome>[] = DIE_FACES.map((face) => ({
  outcome: face,
  weight: 1,
}));
const NO_OUTCOMES: readonly WeightedOutcome<LudoOutcome>[] = [];

function isFace(value: unknown): value is LudoOutcome {
  return DIE_FACES.some((face) => face === value);
}

function seatColours(playerCount: number): readonly LudoColour[] {
  if (playerCount === 2 || playerCount === 3 || playerCount === 4) return SEAT_COLOURS[playerCount];
  throw new RangeError(`Cờ cá ngựa is played by 2 to 4 players, not ${playerCount}`);
}

function nextSeat(state: LudoState): PlayerIndex {
  return (state.toMove + 1) % state.colours.length;
}

function rollsAgain(state: LudoState, face: LudoOutcome): boolean {
  return face === 6 && state.options.extraRoll === "six";
}

function applyRoll(state: LudoState, face: LudoOutcome): LudoState {
  const player = state.toMove;
  if (movableHorses(state, player, face).length > 0) {
    return {
      ...state,
      die: face,
      ply: state.ply + 1,
      last: { kind: "roll", player, face, lost: false, again: false },
    };
  }
  // No horse can move: the turn passes at once, unless a 6 gives another roll (G9).
  const again = rollsAgain(state, face);
  return {
    ...state,
    toMove: again ? player : nextSeat(state),
    die: null,
    ply: state.ply + 1,
    last: { kind: "roll", player, face, lost: !again, again },
  };
}

function applyHorseMove(state: LudoState, horse: number): LudoState {
  const player = state.toMove;
  const face = state.die;
  if (face === null) throw new Error("A horse moves only after a roll");
  const occupancy = trackOccupancy(state);
  const to = targetOf(state, player, horse, face, occupancy);
  if (to === null) throw new Error(`Horse ${horse} cannot move ${face}`);
  const from = state.horses[player]?.[horse] ?? IN_STABLE;
  const kicked = kickedAt(state, player, to, occupancy);
  const horses = state.horses.map((own, seat) => {
    if (seat === player) return own.map((progress, index) => (index === horse ? to : progress));
    if (kicked !== null && seat === kicked.player) {
      return own.map((progress, index) => (index === kicked.horse ? IN_STABLE : progress));
    }
    return own;
  });
  const won = hasWon(horses[player] ?? []);
  const again = !won && rollsAgain(state, face);
  return {
    ...state,
    horses,
    toMove: won || again ? player : nextSeat(state),
    die: null,
    winner: won ? player : null,
    ply: state.ply + 1,
    kicks:
      kicked === null
        ? state.kicks
        : state.kicks.map((count, seat) => (seat === player ? count + 1 : count)),
    last: {
      kind: "move",
      player,
      horse,
      face,
      from,
      to,
      kicked:
        kicked === null
          ? null
          : {
              player: kicked.player,
              horse: kicked.horse,
              from: state.horses[kicked.player]?.[kicked.horse] ?? IN_STABLE,
            },
      again,
    },
  };
}

export const ludo = {
  id: "ludo",
  meta: {
    players: { min: 2, max: 4 },
    category: GAME_CATEGORY.VnFolk,
    durationMinutes: 20,
    supportsAI: true,
  },
  defaultOptions: LUDO_DEFAULT_OPTIONS,
  // No `optionChoices`: the variants are not offered in M6 (design §3).
  parseOptions: parseLudoOptions,
  setup: ({ playerCount, options }: SetupContext<LudoOptions>): LudoState => {
    const colours = seatColours(playerCount);
    return {
      options: { ...options },
      colours,
      horses: colours.map(() => Array.from({ length: HORSES }, () => IN_STABLE)),
      toMove: 0,
      die: null,
      last: null,
      winner: null,
      ply: 0,
      kicks: colours.map(() => 0),
    };
  },
  currentPlayer: (state) => state.toMove,
  legalMoves: (state) => {
    if (state.winner !== null) return [];
    if (state.die === null) return [ROLL];
    const movable = movableHorses(state, state.toMove, state.die);
    return HORSE_MOVES.filter((move) => move.type === "move" && movable.includes(move.horse));
  },
  outcomes: (state, move) =>
    move.type === "roll" && state.winner === null && state.die === null
      ? ROLL_OUTCOMES
      : NO_OUTCOMES,
  applyMove: (state, move, outcome?: LudoOutcome) => {
    if (move.type === "roll") {
      if (!isFace(outcome)) throw new Error("A roll needs a die face from 1 to 6");
      return applyRoll(state, outcome);
    }
    return applyHorseMove(state, move.horse);
  },
  result: (state) => (state.winner === null ? null : { kind: "win", winners: [state.winner] }),
  evaluate: ludoEvaluate,
  // Replaying a long record compares keys: far cheaper than JSON.
  moveKey: (move) => (move.type === "roll" ? "roll" : `horse:${move.horse}`),
} as const satisfies GameDefinition<LudoState, LudoMove, LudoOutcome, LudoOptions>;
