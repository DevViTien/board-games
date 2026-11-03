import { checkOutcomeWeights } from "../outcome-weights";
import type { GameDefinition, PlayerIndex } from "../types";
import { clampEvaluation, resultScore, TIE_EPSILON } from "./score";

/** Thrown to unwind the search when the deadline passes; caught by `chooseMove`. */
export class SearchAborted extends Error {
  constructor() {
    super("AI search ran out of time");
  }
}

export interface SearchContext<State, Move, Outcome, Options extends object> {
  readonly game: GameDefinition<State, Move, Outcome, Options>;
  readonly evaluate: (state: State, player: PlayerIndex) => number;
  /** The AI's seat: every score is from its point of view. */
  readonly seat: PlayerIndex;
  /** Absent while searching the level's minimum depth, which always runs to completion. */
  readonly clock?: { readonly now: () => number; readonly deadline: number };
}

export interface RootSearch<Move> {
  /** Every root move scoring within TIE_EPSILON of the best one, in search order. */
  readonly candidates: readonly Move[];
  readonly best: number;
  /** False when no branch was cut off by the depth limit: the tree was searched to its end. */
  readonly hitDepthLimit: boolean;
}

/**
 * The moves the search considers at a node: the game's `candidateMoves` when it declares them (and
 * gives any), every legal move otherwise. Not checked against `legalMoves` here, at every node:
 * that would cost as much as not narrowing; `chooseMove` checks the root moves it may return.
 */
export function searchMoves<State, Move, Outcome, Options extends object>(
  game: GameDefinition<State, Move, Outcome, Options>,
  state: State,
): readonly Move[] {
  const candidates = game.candidateMoves?.(state);
  return candidates !== undefined && candidates.length > 0 ? candidates : game.legalMoves(state);
}

/**
 * Whether the player to move has a single legal move and it is random: a forced roll, such as the
 * die every turn of a race game starts with. It decides nothing, so right after a choice it costs no
 * depth (see `nodeScore`). Counted on the legal moves, not on the ones the search considers, and
 * only asked of games with random outcomes, so other games pay nothing for it.
 */
function isForcedRoll<State, Move, Outcome, Options extends object>(
  game: GameDefinition<State, Move, Outcome, Options>,
  state: State,
  moves: readonly Move[],
): boolean {
  if (game.outcomes === undefined) return false;
  const legal = game.candidateMoves === undefined ? moves : game.legalMoves(state);
  const [only] = legal;
  return legal.length === 1 && only !== undefined && game.outcomes(state, only).length > 0;
}

/**
 * One fixed-depth search of every root move. Each root move gets the window (best − TIE_EPSILON, +∞):
 * a move that could tie the best is searched exactly, and any other move only needs to be proved
 * worse. Plain alpha-beta (alpha = best) would return mere upper bounds for later moves, so a losing
 * move could pass for a tie and be picked at random.
 */
export function searchRoot<State, Move, Outcome, Options extends object>(
  context: SearchContext<State, Move, Outcome, Options>,
  state: State,
  depth: number,
  moves: readonly Move[],
): RootSearch<Move> {
  const tracker = { hitDepthLimit: false };
  const choice = moves.length > 1;
  let best = Number.NEGATIVE_INFINITY;
  let scored: { readonly move: Move; readonly score: number }[] = [];

  for (const move of moves) {
    const score = moveScore(
      context,
      tracker,
      state,
      move,
      depth,
      best - TIE_EPSILON,
      Number.POSITIVE_INFINITY,
      1,
      choice,
    );
    if (score <= best - TIE_EPSILON) continue;
    if (score > best) {
      best = score;
      scored = scored.filter((entry) => entry.score > best - TIE_EPSILON);
    }
    scored.push({ move, score });
  }

  return {
    candidates: scored.map((entry) => entry.move),
    best,
    hitDepthLimit: tracker.hitDepthLimit,
  };
}

/**
 * Score of playing `move` in `state`; a random move scores the weighted mean of its outcomes.
 * `choice` tells whether `move` was chosen among several, for the nodes it leads to.
 */
function moveScore<State, Move, Outcome, Options extends object>(
  context: SearchContext<State, Move, Outcome, Options>,
  tracker: { hitDepthLimit: boolean },
  state: State,
  move: Move,
  depth: number,
  alpha: number,
  beta: number,
  ply: number,
  choice: boolean,
): number {
  const { game } = context;
  const choices = game.outcomes?.(state, move) ?? [];
  checkOutcomeWeights(choices);
  if (choices.length === 0) {
    return nodeScore(
      context,
      tracker,
      game.applyMove(state, move),
      depth - 1,
      alpha,
      beta,
      ply,
      choice,
    );
  }
  // Expectimax: no pruning inside a chance node, so every outcome gets an exact score.
  let total = 0;
  let weighted = 0;
  for (const { outcome, weight } of choices) {
    const child = game.applyMove(state, move, outcome);
    total += weight;
    weighted +=
      weight *
      nodeScore(
        context,
        tracker,
        child,
        depth - 1,
        Number.NEGATIVE_INFINITY,
        Number.POSITIVE_INFINITY,
        ply,
        choice,
      );
  }
  return weighted / total;
}

/**
 * Minimax with fail-soft alpha-beta: the AI's seat maximises, every other seat minimises. A forced
 * roll reached by a move chosen among several (`afterChoice`) costs no depth, so each level sees the
 * next player's answer to every roll instead of stopping at their die. Any other forced roll (after
 * another roll, or after a move that was the only one) costs as usual: every free roll needs a
 * choice above it, which costs a step, so the tree stays bounded. A node at depth 0 is still scored
 * at once.
 */
function nodeScore<State, Move, Outcome, Options extends object>(
  context: SearchContext<State, Move, Outcome, Options>,
  tracker: { hitDepthLimit: boolean },
  state: State,
  depth: number,
  alpha: number,
  beta: number,
  ply: number,
  afterChoice: boolean,
): number {
  const { game, clock, seat } = context;
  if (clock !== undefined && clock.now() >= clock.deadline) throw new SearchAborted();

  const result = game.result(state);
  if (result !== null) return resultScore(result, seat, ply);
  if (depth <= 0) {
    tracker.hitDepthLimit = true;
    return clampEvaluation(context.evaluate(state, seat));
  }

  const moves = searchMoves(game, state);
  // Breaks the contract (the contract suite's `result-matches-moves` catches it): scoring it as a
  // win or a loss would quietly steer the AI, so fail as loudly as the rules would in play.
  if (moves.length === 0) throw new Error("The rules gave an unfinished state with no legal move");
  const movesDepth = afterChoice && isForcedRoll(game, state, moves) ? depth + 1 : depth;
  const choice = moves.length > 1;

  const maximizing = game.currentPlayer(state) === seat;
  let low = alpha;
  let high = beta;
  let best = maximizing ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  for (const move of moves) {
    const score = moveScore(context, tracker, state, move, movesDepth, low, high, ply + 1, choice);
    if (maximizing) {
      best = Math.max(best, score);
      low = Math.max(low, best);
    } else {
      best = Math.min(best, score);
      high = Math.min(high, best);
    }
    if (low >= high) break;
  }
  return best;
}
