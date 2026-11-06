import type { PlayerIndex } from "@board-games/engine";

/** The colour of each seat, in the order of play: its token, and its name's translation key. */
const SEAT_COLOURS = ["red", "blue", "yellow", "green"] as const;

export type SeatColour = (typeof SEAT_COLOURS)[number];

export function seatColour(player: PlayerIndex): SeatColour {
  return SEAT_COLOURS[player] ?? "red";
}

// Tailwind classes of each colour, written out in full so Tailwind finds them. The colours are the
// shared `--piece-*` tokens: `-line` for an edge on the paper, `-ink` for what is drawn on the colour.

/** A pawn, the gate of the seat to move. */
export const PIECE_FILL: Readonly<Record<SeatColour, string>> = {
  red: "fill-piece-red",
  blue: "fill-piece-blue",
  yellow: "fill-piece-yellow",
  green: "fill-piece-green",
};

/** The gate of a seat not to move: a tint on the mat, its edge as clear as ever. */
export const PIECE_TINT_FILL: Readonly<Record<SeatColour, string>> = {
  red: "fill-[color-mix(in_srgb,var(--piece-red)_24%,var(--game-tint))]",
  blue: "fill-[color-mix(in_srgb,var(--piece-blue)_24%,var(--game-tint))]",
  yellow: "fill-[color-mix(in_srgb,var(--piece-yellow)_24%,var(--game-tint))]",
  green: "fill-[color-mix(in_srgb,var(--piece-green)_24%,var(--game-tint))]",
};

/** A gate's edge, a way's dots. */
export const PIECE_LINE_STROKE: Readonly<Record<SeatColour, string>> = {
  red: "stroke-piece-red-line",
  blue: "stroke-piece-blue-line",
  yellow: "stroke-piece-yellow-line",
  green: "stroke-piece-green-line",
};

/** A symbol on a pale gate. */
export const PIECE_INK_FILL: Readonly<Record<SeatColour, string>> = {
  red: "fill-piece-red-ink",
  blue: "fill-piece-blue-ink",
  yellow: "fill-piece-yellow-ink",
  green: "fill-piece-green-ink",
};

/** The ribs of a hat, the lines of a gate in full colour. */
export const PIECE_INK_STROKE: Readonly<Record<SeatColour, string>> = {
  red: "stroke-piece-red-ink",
  blue: "stroke-piece-blue-ink",
  yellow: "stroke-piece-yellow-ink",
  green: "stroke-piece-green-ink",
};
