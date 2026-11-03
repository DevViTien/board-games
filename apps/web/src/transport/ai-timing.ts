import type { AiLevel } from "@board-games/engine";

/**
 * The AI's move never shows up sooner than this after its turn starts, so the player sees it come.
 * It runs alongside the thinking, not after it. For games without random outcomes.
 */
export const AI_MIN_DELAY_MS = 300;

/**
 * In a game with random outcomes (dice), the delay before any AI move instead: never shorter than
 * the board's animation of the move before it (a piece walking, at most 400 ms), so that animation
 * is never cut. Each board keeps its animations within it, and tests that it does.
 */
export const AI_SETTLE_DELAY_MS = 500;

/**
 * In a game with random outcomes, the delay right after a move with one (a roll, the player's or the
 * AI's own): the dice animation and the time to read the number. Never shorter than the board's
 * dice animation. Still within 2 s with the thinking below, which runs alongside it.
 */
export const AI_RESULT_DELAY_MS = 800;

/** How long the AI may think per move. With the delays above, every move lands within 2 s. */
export const AI_TIME_LIMIT_MS: Readonly<Record<AiLevel, number>> = {
  easy: 500,
  medium: 500,
  hard: 1500,
};
