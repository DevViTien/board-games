import { GAME_CATEGORY } from "../constants";
import type { GameDefinition, PlayerIndex } from "../types";

// One decision, then the game is over: seat 0 plays it "safe" (a draw) or "gambles" on a roll that
// wins with weight `winWeight` and loses with weight `loseWeight`. Results carry no points, so the
// AI's expected value is checked through weighted wins and losses.

export interface ChoiceOptions {
  readonly winWeight: number;
  readonly loseWeight: number;
}

export type ChoiceOutcome = "win" | "lose";

export interface ChoiceState {
  readonly weights: ChoiceOptions;
  readonly ending: "draw" | ChoiceOutcome | null;
}

export interface ChoiceMove {
  readonly choice: "safe" | "gamble";
}

const CHOICES: readonly ChoiceMove[] = [{ choice: "safe" }, { choice: "gamble" }];

function isWeight(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export const choiceGame = {
  id: "choice",
  meta: {
    players: { min: 2, max: 2 },
    category: GAME_CATEGORY.Original,
    durationMinutes: 1,
    supportsAI: true,
  },
  defaultOptions: { winWeight: 1, loseWeight: 1 },
  parseOptions: (raw: unknown) => {
    if (typeof raw !== "object" || raw === null) return null;
    const { winWeight, loseWeight } = raw as Partial<Record<keyof ChoiceOptions, unknown>>;
    return isWeight(winWeight) && isWeight(loseWeight) ? { winWeight, loseWeight } : null;
  },
  setup: ({ options }): ChoiceState => ({ weights: options, ending: null }),
  currentPlayer: (): PlayerIndex => 0,
  legalMoves: (state) => (state.ending === null ? CHOICES : []),
  outcomes: (state, move) =>
    move.choice === "gamble"
      ? [
          { outcome: "win", weight: state.weights.winWeight },
          { outcome: "lose", weight: state.weights.loseWeight },
        ]
      : [],
  applyMove: (state, move, outcome?: ChoiceOutcome) => ({
    ...state,
    ending: move.choice === "safe" ? "draw" : (outcome ?? "lose"),
  }),
  result: (state) => {
    if (state.ending === null) return null;
    if (state.ending === "draw") return { kind: "draw" };
    return { kind: "win", winners: [state.ending === "win" ? 0 : 1] };
  },
  // Never reached: every move ends the game.
  evaluate: () => 0,
} as const satisfies GameDefinition<ChoiceState, ChoiceMove, ChoiceOutcome, ChoiceOptions>;
