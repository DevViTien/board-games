import "./theme.css";

import { cn } from "@board-games/ui";

import type { ArtworkProps } from "../types";

const CELL = 22;
const LEFT = 5;
const TOP = 16;
const COLUMNS = 5;
const ROWS = 4;

/** The kind of each field of the little map, row by row. */
const PLOTS = [
  "fill-game-board",
  "fill-(--fence-race-plot-2)",
  "fill-(--fence-race-plot-3)",
  "fill-(--fence-race-plot-2)",
  "fill-game-board",
];

/**
 * Cờ rào on the menu and the setup screen: a corner of the fields, seen from above, a village gate
 * over its middle, two fences and two hats. Decorative; drawn by hand, as an artwork must not reach
 * the board's pieces.
 */
export function FenceRaceArtwork({ className }: ArtworkProps) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden className={cn("size-30", className)}>
      <rect
        x={LEFT}
        y={TOP}
        width={COLUMNS * CELL}
        height={ROWS * CELL}
        className="fill-game-line"
      />
      {Array.from({ length: ROWS * COLUMNS }, (_unused, index) => {
        const col = index % COLUMNS;
        const row = (index - col) / COLUMNS;
        return (
          <rect
            key={index}
            x={LEFT + col * CELL + 0.75}
            y={TOP + row * CELL + 0.75}
            width={CELL - 1.5}
            height={CELL - 1.5}
            rx="1.5"
            className={PLOTS[(col + 2 * row) % PLOTS.length]}
          />
        );
      })}
      {/* The gate, over three of the five columns: two posts, a roof with a peak. */}
      <path
        d="M21 16V3h6v4h20l5-4 5 4h20V3h6v13z"
        strokeWidth="1.25"
        strokeLinejoin="round"
        className="fill-piece-red stroke-piece-red-line"
      />
      <circle cx="24" cy="10" r="2" className="fill-piece-red-ink" />
      <circle cx="80" cy="10" r="2" className="fill-piece-red-ink" />
      {/* Two fences of ink on a paper edge. */}
      <path
        d="M29 60h42"
        strokeWidth="7"
        strokeLinecap="round"
        className="stroke-(--fence-race-halo)"
      />
      <path
        d="M29 60h42"
        strokeWidth="4.5"
        strokeLinecap="round"
        className="stroke-(--fence-race-wall)"
      />
      <path
        d="M93 62v40"
        strokeWidth="7"
        strokeLinecap="round"
        className="stroke-(--fence-race-halo)"
      />
      <path
        d="M93 62v40"
        strokeWidth="4.5"
        strokeLinecap="round"
        className="stroke-(--fence-race-wall)"
      />
      {/* Their knots. */}
      <path
        d="M40 58v4M50 58v4M60 58v4M91 72h4M91 82h4M91 92h4"
        strokeWidth="1"
        className="stroke-(--fence-race-halo)"
      />
      {/* Two hats, each with its symbol. */}
      <circle
        cx="60"
        cy="93"
        r="8.5"
        strokeWidth="1.5"
        className="fill-piece-red stroke-piece-edge"
      />
      <circle cx="60" cy="93" r="3" className="fill-piece-red-ink" />
      <circle
        cx="16"
        cy="27"
        r="8.5"
        strokeWidth="1.5"
        className="fill-piece-blue stroke-piece-edge"
      />
      <rect x="13.4" y="24.4" width="5.2" height="5.2" className="fill-piece-blue-ink" />
    </svg>
  );
}
