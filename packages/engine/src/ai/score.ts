import type { GameResult, PlayerIndex } from "../types";

/** Score of a win found at the root; a win `ply` moves away scores `WIN - ply`. */
export const WIN = 1_000_000_000;

/** `evaluate` is clamped to ±this, so no heuristic can outrank a real win or loss. */
export const EVAL_LIMIT = 100_000_000;

/**
 * Scores less than this apart count as equally good. Only rounding noise: the weighted mean of a
 * random move is fractional (5/6 for "one die face in six wins 5"), so any wider margin would let a
 * strictly better gamble tie a sure move. A few rounding steps at ±WIN stay far below it.
 */
export const TIE_EPSILON = 1e-6;

/** Score of a finished game for `seat`: an earlier win and a later loss score higher. */
export function resultScore(result: GameResult, seat: PlayerIndex, ply: number): number {
  if (result.kind === "draw") return 0;
  return result.winners.includes(seat) ? WIN - ply : -(WIN - ply);
}

/** A heuristic score made safe: `NaN` becomes 0 and anything else is clamped to ±EVAL_LIMIT. */
export function clampEvaluation(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(-EVAL_LIMIT, Math.min(EVAL_LIMIT, value));
}
