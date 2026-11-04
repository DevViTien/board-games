export const GAME_CATEGORY = {
  VnFolk: "vn-folk",
  Classic: "classic",
  Original: "original",
} as const;

export type GameCategory = (typeof GAME_CATEGORY)[keyof typeof GAME_CATEGORY];

/**
 * Why a game ended outside its rules: a player resigned, or was ruled to have abandoned it. These
 * codes belong to the engine; a game's own `result().reason` must never use them.
 */
export const ENDING_REASON = {
  Resigned: "resigned",
  Abandoned: "abandoned",
} as const;

export type EndingReason = (typeof ENDING_REASON)[keyof typeof ENDING_REASON];
