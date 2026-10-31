import type { AiLevel } from "@board-games/engine";

/**
 * The AI's move never shows up sooner than this after its turn starts, so the player sees it come.
 * It runs alongside the thinking, not after it.
 */
export const AI_MIN_DELAY_MS = 300;

/** How long the AI may think per move. With the delay above, every move lands within 2 s. */
export const AI_TIME_LIMIT_MS: Readonly<Record<AiLevel, number>> = {
  easy: 500,
  medium: 500,
  hard: 1500,
};
