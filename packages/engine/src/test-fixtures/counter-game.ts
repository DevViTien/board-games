import { GAME_CATEGORY } from "../constants";
import type { GameDefinition, PlayerIndex } from "../types";

// Two players take turns adding 1 or 2 to a shared counter; whoever reaches exactly 10 wins.
// No randomness, no options, and a custom moveKey.

export const COUNTER_TARGET = 10;

export interface CounterState {
  readonly count: number;
  readonly toMove: PlayerIndex;
}

export interface CounterMove {
  readonly add: 1 | 2;
}

const STEPS = [1, 2] as const;

/** The rules without `evaluate`, for the contract-suite variant that claims AI support anyway. */
export const counterRules = {
  id: "counter",
  meta: {
    players: { min: 2, max: 2 },
    category: GAME_CATEGORY.Original,
    durationMinutes: 1,
    supportsAI: false,
  },
  defaultOptions: {},
  setup: () => ({ count: 0, toMove: 0 }),
  currentPlayer: (state) => state.toMove,
  legalMoves: (state) =>
    STEPS.filter((add) => state.count + add <= COUNTER_TARGET).map((add) => ({ add })),
  applyMove: (state, move) => ({ count: state.count + move.add, toMove: 1 - state.toMove }),
  result: (state) =>
    state.count === COUNTER_TARGET ? { kind: "win", winners: [1 - state.toMove] } : null,
  moveKey: (move) => `+${move.add}`,
} as const satisfies GameDefinition<CounterState, CounterMove>;

export const counterGame = {
  ...counterRules,
  // Exact for this game: the player to move wins unless the distance left is a multiple of 3.
  evaluate: (state: CounterState, player: PlayerIndex) => {
    const moverWins = (COUNTER_TARGET - state.count) % 3 !== 0;
    return (state.toMove === player) === moverWins ? 1 : -1;
  },
} as const satisfies GameDefinition<CounterState, CounterMove>;

/** The counter game declared playable against the AI. */
export const counterAiGame = {
  ...counterGame,
  meta: { ...counterGame.meta, supportsAI: true },
} as const satisfies GameDefinition<CounterState, CounterMove>;
