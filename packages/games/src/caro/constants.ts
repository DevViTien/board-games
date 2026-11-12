/** Board sizes a game can be played on: 15×15 or 19×19 cells, or the board that grows ("infinite"). */
export const CARO_SIZES = [15, 19, "infinite"] as const;

export type CaroSize = (typeof CARO_SIZES)[number];

/** The sizes of a square board of fixed size, whose side is the option itself. */
export type CaroFixedSize = Exclude<CaroSize, "infinite">;

/**
 * The board that grows. Stones go on a hidden square of `cap × cap` cells (odd, so it has a middle
 * cell), whose indices never change: a cell keeps its name as the board grows. Play starts in the
 * middle `start × start` cells, and the playable area always keeps `margin` rows and columns around
 * every stone, as far as the cap allows. The margin is above `CANDIDATE_RADIUS`, so every cell the
 * AI considers is in the area; it is enough room for a line of five out of the outermost stone.
 */
export const CARO_INFINITE = { cap: 61, start: 15, margin: 5 } as const;

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
