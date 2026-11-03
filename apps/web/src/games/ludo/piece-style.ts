import type { LudoColourName } from "@board-games/games/ludo";

// Tailwind classes of each colour, written out in full so Tailwind finds them.

export const PIECE_FILL: Readonly<Record<LudoColourName, string>> = {
  red: "fill-piece-red",
  blue: "fill-piece-blue",
  yellow: "fill-piece-yellow",
  green: "fill-piece-green",
};

/** Light tint of a colour's areas: its stable, start square and home steps. */
export const PIECE_TINT: Readonly<Record<LudoColourName, string>> = {
  red: "fill-piece-red/20",
  blue: "fill-piece-blue/20",
  yellow: "fill-piece-yellow/20",
  green: "fill-piece-green/20",
};

export const PIECE_STROKE: Readonly<Record<LudoColourName, string>> = {
  red: "stroke-piece-red",
  blue: "stroke-piece-blue",
  yellow: "stroke-piece-yellow",
  green: "stroke-piece-green",
};

export const PIECE_BORDER: Readonly<Record<LudoColourName, string>> = {
  red: "border-piece-red",
  blue: "border-piece-blue",
  yellow: "border-piece-yellow",
  green: "border-piece-green",
};
