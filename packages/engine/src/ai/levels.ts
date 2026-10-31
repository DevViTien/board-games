export const AI_LEVEL = {
  Easy: "easy",
  Medium: "medium",
  Hard: "hard",
} as const;

export type AiLevel = (typeof AI_LEVEL)[keyof typeof AI_LEVEL];

interface LevelProfile {
  /** Searched to the end even past the time limit, so the level's guarantees never depend on speed. */
  readonly minDepth: number;
  /** Deepest search; `Infinity` keeps deepening until time runs out or the tree is exhausted. */
  readonly maxDepth: number;
  /** Share of moves played at random instead of searched (0–1). */
  readonly randomMoveChance: number;
}

/**
 * The three levels, defined once for every game in moves of lookahead. Depth 1 sees an immediate
 * win; depth 2 also sees the opponent's immediate win, so it blocks it. Tune the feel here.
 */
export const LEVEL_PROFILES: Readonly<Record<AiLevel, LevelProfile>> = {
  easy: { minDepth: 1, maxDepth: 1, randomMoveChance: 0.4 },
  medium: { minDepth: 2, maxDepth: 2, randomMoveChance: 0 },
  hard: { minDepth: 2, maxDepth: Number.POSITIVE_INFINITY, randomMoveChance: 0 },
};
