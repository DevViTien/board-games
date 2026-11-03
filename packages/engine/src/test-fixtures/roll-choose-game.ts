import { GAME_CATEGORY } from "../constants";
import type { GameDefinition, GameResult, PlayerIndex, WeightedOutcome } from "../types";

// 2–4 players; every turn is a roll of a three-sided die, then a choice: "safe" scores the roll,
// "greedy" scores two more but leaves the player exposed, and the next player, whatever they roll,
// may "punish" an exposed player instead of scoring. A fixed number of turns, then the highest score
// wins. Exercises a roll followed by a decision (the turn of a Ludo-like game): the AI must look
// past the next player's roll to see the punishment coming, and undo must stop at a roll.

export interface RollChooseState {
  readonly scores: readonly number[];
  readonly toMove: PlayerIndex;
  /** The die the player to move has rolled, or `null` while their turn starts with a roll. */
  readonly rolled: number | null;
  /** The player whose greedy move the player to move may punish. */
  readonly exposed: PlayerIndex | null;
  readonly turnsLeft: number;
}

export type RollChooseMove =
  | { readonly type: "roll" }
  | { readonly type: "safe" }
  | { readonly type: "greedy" }
  | { readonly type: "punish" };

/** Points the greedy move scores on top of the roll. */
export const GREEDY_BONUS = 2;
/** Points an exposed player loses when punished: more than any greedy move gains. */
export const PUNISHMENT = 8;
const TURNS_PER_PLAYER = 3;

const ROLL_FACES: readonly WeightedOutcome<number>[] = [1, 2, 3].map((face) => ({
  outcome: face,
  weight: 1,
}));

const ROLL: RollChooseMove = { type: "roll" };
const SAFE: RollChooseMove = { type: "safe" };
const GREEDY: RollChooseMove = { type: "greedy" };
const PUNISH: RollChooseMove = { type: "punish" };

function resultOf(state: RollChooseState): GameResult | null {
  if (state.turnsLeft > 0) return null;
  const best = Math.max(...state.scores);
  const winners = state.scores.flatMap((score, player) => (score === best ? [player] : []));
  return winners.length === state.scores.length ? { kind: "draw" } : { kind: "win", winners };
}

function addTo(scores: readonly number[], player: PlayerIndex, points: number): number[] {
  return scores.map((score, index) => (index === player ? score + points : score));
}

export const rollChooseGame = {
  id: "roll-choose",
  meta: {
    players: { min: 2, max: 4 },
    category: GAME_CATEGORY.Original,
    durationMinutes: 5,
    supportsAI: true,
  },
  defaultOptions: {},
  setup: ({ playerCount }) => ({
    scores: Array.from({ length: playerCount }, () => 0),
    toMove: 0,
    rolled: null,
    exposed: null,
    turnsLeft: TURNS_PER_PLAYER * playerCount,
  }),
  currentPlayer: (state) => state.toMove,
  legalMoves: (state) => {
    if (resultOf(state) !== null) return [];
    if (state.rolled === null) return [ROLL];
    return state.exposed === null ? [SAFE, GREEDY] : [SAFE, GREEDY, PUNISH];
  },
  outcomes: (_state, move) => (move.type === "roll" ? ROLL_FACES : []),
  moveKey: (move) => move.type,
  applyMove: (state, move, outcome?: number) => {
    if (move.type === "roll") {
      if (outcome === undefined) throw new Error("A roll needs an outcome");
      return { ...state, rolled: outcome };
    }
    const rolled = state.rolled ?? 0;
    const next = {
      toMove: (state.toMove + 1) % state.scores.length,
      rolled: null,
      turnsLeft: state.turnsLeft - 1,
    };
    if (move.type === "punish") {
      const scores =
        state.exposed === null ? state.scores : addTo(state.scores, state.exposed, -PUNISHMENT);
      return { ...next, scores, exposed: null };
    }
    const greedy = move.type === "greedy";
    return {
      ...next,
      scores: addTo(state.scores, state.toMove, rolled + (greedy ? GREEDY_BONUS : 0)),
      exposed: greedy ? state.toMove : null,
    };
  },
  result: resultOf,
  /** A player's lead over the best other player. */
  evaluate: (state, player) => {
    const others = state.scores.filter((_score, seat) => seat !== player);
    return (state.scores[player] ?? 0) - Math.max(...others);
  },
} as const satisfies GameDefinition<RollChooseState, RollChooseMove, number>;
