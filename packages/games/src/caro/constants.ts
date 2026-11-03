/** Board sizes a game can be played on: 15×15 or 19×19 cells. */
export const CARO_SIZES = [15, 19] as const;

export type CaroSize = (typeof CARO_SIZES)[number];

/**
 * When five in a row wins. "blocked-ends": not when both cells just outside the line hold the
 * opponent's stones (the edge of the board does not block). "free": always.
 */
export const CARO_RULE = {
  BlockedEnds: "blocked-ends",
  Free: "free",
} as const;

export type CaroRule = (typeof CARO_RULE)[keyof typeof CARO_RULE];

/** Stones in a row needed to win; longer lines win too. */
export const WIN_LENGTH = 5;

/** The AI considers empty cells at most this many rows and columns away from a stone. */
export const CANDIDATE_RADIUS = 2;

/** Cells the AI considers besides the forced ones (immediate wins and blocks), best first. */
export const CANDIDATE_LIMIT = 20;
