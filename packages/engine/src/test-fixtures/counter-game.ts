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

export const counterGame = {
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
