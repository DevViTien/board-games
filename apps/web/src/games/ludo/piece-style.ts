import type { LudoColourName } from "@board-games/games/ludo";

// Tailwind classes of each colour, written out in full so Tailwind finds them. The colours are the
// shared `--piece-*` tokens (packages/ui styles.css): `-line` for an edge or a frame on the paper
// (Yellow's is darker), `-ink` for a symbol or words drawn on the colour, `-hover` for a roll button
// pointed at or pressed.

/** A stable's block, a horse, a triangle of the centre. */
export const PIECE_FILL: Readonly<Record<LudoColourName, string>> = {
  red: "fill-piece-red",
  blue: "fill-piece-blue",
  yellow: "fill-piece-yellow",
  green: "fill-piece-green",
};

/** Light tint of a colour's home steps and start square (decorative: the numbers are ink). */
export const PIECE_TINT: Readonly<Record<LudoColourName, string>> = {
  red: "fill-piece-red/20",
  blue: "fill-piece-blue/20",
  yellow: "fill-piece-yellow/20",
  green: "fill-piece-green/20",
};

/** An edge drawn on the paper or a track square: a home entry, the ring of the stable to move. */
export const PIECE_LINE_STROKE: Readonly<Record<LudoColourName, string>> = {
  red: "stroke-piece-red-line",
  blue: "stroke-piece-blue-line",
  yellow: "stroke-piece-yellow-line",
  green: "stroke-piece-green-line",
};

/** The frame of the die, the edge of a horse's choice. */
export const PIECE_LINE_BORDER: Readonly<Record<LudoColourName, string>> = {
  red: "border-piece-red-line",
  blue: "border-piece-blue-line",
  yellow: "border-piece-yellow-line",
  green: "border-piece-green-line",
};

/** A horse's symbol, drawn on its colour. */
export const PIECE_INK_FILL: Readonly<Record<LudoColourName, string>> = {
  red: "fill-piece-red-ink",
  blue: "fill-piece-blue-ink",
  yellow: "fill-piece-yellow-ink",
  green: "fill-piece-green-ink",
};

/**
 * The roll button in the colour of the player about to roll, its words in the colour's ink (its lip
 * is the game's `--ludo-roll-shadow`). The shared disabled look of `Button` wins over all of it
 * (`!important`), so a locked button never looks like the colour's.
 */
export const ROLL_BUTTON: Readonly<Record<LudoColourName, string>> = {
  red: "bg-piece-red text-piece-red-ink hover:bg-piece-red-hover active:bg-piece-red-hover",
  blue: "bg-piece-blue text-piece-blue-ink hover:bg-piece-blue-hover active:bg-piece-blue-hover",
  yellow:
    "bg-piece-yellow text-piece-yellow-ink hover:bg-piece-yellow-hover active:bg-piece-yellow-hover",
  green:
    "bg-piece-green text-piece-green-ink hover:bg-piece-green-hover active:bg-piece-green-hover",
};
