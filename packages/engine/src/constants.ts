export const GAME_CATEGORY = {
  VnFolk: "vn-folk",
  Classic: "classic",
  Original: "original",
} as const;

export type GameCategory = (typeof GAME_CATEGORY)[keyof typeof GAME_CATEGORY];
