import { GAME_CATEGORY } from "../constants";
import type { GameDefinition, PlayerIndex, WeightedOutcome } from "../types";

// 2–4 players take turns rolling a six-sided die and moving forward; the first to reach the
// target wins. Exercises random outcomes and rule options.

export interface DiceRaceState {
  readonly positions: readonly number[];
  readonly toMove: PlayerIndex;
  readonly target: number;
}

export interface DiceRaceMove {
  readonly type: "roll";
}

export interface DiceRaceOptions {
  readonly target: number;
}

export const DICE_FACES: readonly WeightedOutcome<number>[] = [1, 2, 3, 4, 5, 6].map((face) => ({
  outcome: face,
  weight: 1,
}));

const ROLL: DiceRaceMove = { type: "roll" };

function winnerOf(state: DiceRaceState): PlayerIndex | undefined {
  const index = state.positions.findIndex((position) => position >= state.target);
  return index === -1 ? undefined : index;
}

function isDiceRaceOptions(raw: unknown): raw is DiceRaceOptions {
  if (typeof raw !== "object" || raw === null || !("target" in raw)) return false;
  const { target } = raw;
  return typeof target === "number" && Number.isInteger(target) && target >= 5 && target <= 100;
}

/** The rules without `parseOptions`, which therefore accept only their `defaultOptions`. */
export const diceRaceRules = {
  id: "dice-race",
  meta: {
    players: { min: 2, max: 4 },
    category: GAME_CATEGORY.Original,
    durationMinutes: 5,
    supportsAI: false,
  },
  defaultOptions: { target: 20 },
  setup: ({ playerCount, options }) => ({
    positions: Array.from({ length: playerCount }, () => 0),
    toMove: 0,
    target: options.target,
  }),
  currentPlayer: (state) => state.toMove,
  legalMoves: (state) => (winnerOf(state) === undefined ? [ROLL] : []),
  outcomes: () => DICE_FACES,
  applyMove: (state, _move, outcome?: number) => {
    if (outcome === undefined) throw new Error("A roll needs an outcome");
    return {
      ...state,
      positions: state.positions.map((position, player) =>
        player === state.toMove ? position + outcome : position,
      ),
      toMove: (state.toMove + 1) % state.positions.length,
    };
  },
  result: (state) => {
    const winner = winnerOf(state);
    return winner === undefined ? null : { kind: "win", winners: [winner] };
  },
} as const satisfies GameDefinition<DiceRaceState, DiceRaceMove, number, DiceRaceOptions>;

export const diceRaceGame = {
  ...diceRaceRules,
  parseOptions: (raw: unknown) => (isDiceRaceOptions(raw) ? { target: raw.target } : null),
} as const satisfies GameDefinition<DiceRaceState, DiceRaceMove, number, DiceRaceOptions>;

/** The dice race declared playable against the AI: a player's lead over the best other player. */
export const diceRaceAiGame = {
  ...diceRaceGame,
  meta: { ...diceRaceGame.meta, supportsAI: true },
  evaluate: (state: DiceRaceState, player: PlayerIndex) => {
    const others = state.positions.filter((_position, seat) => seat !== player);
    return (state.positions[player] ?? 0) - Math.max(...others);
  },
} as const satisfies GameDefinition<DiceRaceState, DiceRaceMove, number, DiceRaceOptions>;
