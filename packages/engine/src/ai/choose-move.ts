import { ENGINE_ERROR, err, ok, type Result } from "../errors";
import type { GameDefinition, Rng } from "../types";
import { type AiLevel, LEVEL_PROFILES } from "./levels";
import { SearchAborted, searchMoves, searchRoot } from "./search";

export interface ChooseMoveOptions {
  readonly level: AiLevel;
  /** Every random choice (between tied moves, Easy's random moves) comes from here. */
  readonly rng: Rng;
  /**
   * Milliseconds; a Worker passes `() => performance.now()` (the bare method throws once detached),
   * tests pass a fake clock.
   */
  readonly now: () => number;
  /**
   * Budget for this move, finite and not negative. The level's minimum depth is always finished,
   * even past it.
   */
  readonly timeLimitMs: number;
}

function pickOne<Move>(moves: readonly Move[], rng: Rng): Move {
  const move = moves.length === 0 ? undefined : moves[rng.nextInt(0, moves.length - 1)];
  if (move === undefined) throw new Error("No move to pick from");
  return move;
}

function isLevel(level: unknown): level is AiLevel {
  return typeof level === "string" && Object.hasOwn(LEVEL_PROFILES, level);
}

/**
 * The AI's move for the player to move in `state`: one of the rules' own legal moves, so it can go
 * straight to `playMove`. Searches deeper and deeper until the time limit (past the level's minimum
 * depth) or the end of the game tree, then picks at random among the moves tied for best.
 *
 * Options that cross a Worker boundary are checked: an unknown level, a time limit that is not a
 * finite number ≥ 0 or a clock that does not read a finite number is a bug in the caller, so it
 * throws a RangeError instead of returning a `Result` code (those are for the game's state).
 */
export function chooseMove<
  State,
  Move,
  Outcome = never,
  Options extends object = Record<string, never>,
>(
  game: GameDefinition<State, Move, Outcome, Options>,
  state: State,
  { level, rng, now, timeLimitMs }: ChooseMoveOptions,
): Result<Move> {
  if (!isLevel(level)) throw new RangeError(`Unknown AI level "${String(level)}"`);
  if (!Number.isFinite(timeLimitMs) || timeLimitMs < 0) {
    throw new RangeError(`AI time limit ${timeLimitMs} ms is not a finite number ≥ 0`);
  }
  const { evaluate } = game;
  if (!game.meta.supportsAI || evaluate === undefined) return err(ENGINE_ERROR.AiNotSupported);
  if (game.result(state) !== null) return err(ENGINE_ERROR.GameOver);
  const moves = searchMoves(game, state);
  if (moves.length === 0) return err(ENGINE_ERROR.GameOver);

  const profile = LEVEL_PROFILES[level];
  if (profile.randomMoveChance > 0 && rng.nextFloat() < profile.randomMoveChance) {
    return ok(pickOne(moves, rng));
  }

  const start = now();
  if (!Number.isFinite(start)) throw new RangeError(`AI clock read ${start}, not a finite time`);
  const deadline = start + timeLimitMs;
  const seat = game.currentPlayer(state);
  let order = moves;
  let best: readonly Move[] = moves;

  for (let depth = 1; depth <= profile.maxDepth; depth += 1) {
    const pastMinimum = depth > profile.minDepth;
    if (pastMinimum && now() >= deadline) break;
    try {
      const search = searchRoot(
        pastMinimum ? { game, evaluate, seat, clock: { now, deadline } } : { game, evaluate, seat },
        state,
        depth,
        order,
      );
      best = search.candidates;
      // The tied moves go first next time, so alpha-beta proves the rest worse sooner.
      order = [...search.candidates, ...order.filter((move) => !search.candidates.includes(move))];
      if (!search.hitDepthLimit) break;
    } catch (error) {
      if (error instanceof SearchAborted) break;
      throw error;
    }
  }

  return ok(pickOne(best, rng));
}
