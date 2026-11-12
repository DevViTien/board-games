import "./theme.css";

import { cn } from "@board-games/ui";

import type { ArtworkProps } from "../types";

/** Tiles of the little kitchen: drawing units, 24 a cell, on a 5 × 5 floor. */
const CELL = 24;

/** The wall between the two rooms, its door one cell down from the top. */
const WALL_CELLS = [0, 2, 3, 4] as const;

/**
 * Đội gom thạch on the menu and the setup screen: Pink holds plate ● while Blue pushes two stuck
 * strawberries through the open door towards their molds. Decorative; drawn by hand, as an artwork
 * must not reach the board's pieces.
 */
export function JellyCrewArtwork({ className }: ArtworkProps) {
  const wallX = 2 * CELL;
  return (
    <svg viewBox="0 0 120 120" aria-hidden className={cn("size-30", className)}>
      <rect width="120" height="120" rx="7" className="fill-game-board" />
      {WALL_CELLS.map((row) => (
        <g key={row}>
          <rect
            x={wallX}
            y={row * CELL}
            width={CELL}
            height={CELL}
            className="fill-(--jelly-crew-wall)"
          />
          <rect
            x={wallX + 3}
            y={row * CELL + 3}
            width={CELL - 6}
            height={CELL - 9}
            rx="2.4"
            className="fill-(--jelly-crew-wall-top)"
          />
        </g>
      ))}
      {/* The open door: two posts, its sign between them. */}
      <rect x={wallX} y={CELL} width="4" height={CELL} className="fill-(--jelly-crew-door)" />
      <rect
        x={wallX + CELL - 4}
        y={CELL}
        width="4"
        height={CELL}
        className="fill-(--jelly-crew-door)"
      />
      {/* Two strawberry molds past the door. */}
      {[3, 4].map((col) => (
        <rect
          key={col}
          x={col * CELL + 2.5}
          y={CELL + 2.5}
          width={CELL - 5}
          height={CELL - 5}
          rx="5"
          strokeWidth="1.4"
          strokeDasharray="3 2"
          className="fill-(--jelly-crew-strawberry) stroke-(--jelly-crew-strawberry-edge) [fill-opacity:var(--jelly-crew-mold-fill)]"
        />
      ))}
      {/* Two strawberries stuck together, half through the door. */}
      <rect
        x={CELL + 1.5}
        y={CELL + 1.5}
        width={2 * CELL - 3}
        height={CELL - 3}
        rx="6"
        className="fill-(--jelly-crew-strawberry-edge)"
      />
      <rect
        x={CELL + 3.2}
        y={CELL + 3.2}
        width={2 * CELL - 6.4}
        height={CELL - 6.4}
        rx="4.5"
        className="fill-(--jelly-crew-strawberry)"
      />
      <circle
        cx={CELL * 1.5}
        cy={CELL * 1.55}
        r="2.9"
        className="fill-(--jelly-crew-strawberry-mark)"
      />
      <circle
        cx={CELL * 2.5}
        cy={CELL * 1.55}
        r="2.9"
        className="fill-(--jelly-crew-strawberry-mark)"
      />
      {/* Blue, whose turn it is, pushing. */}
      <circle
        cx={CELL / 2}
        cy={CELL * 1.5}
        r="11.3"
        fill="none"
        strokeWidth="2.9"
        className="stroke-(--jelly-crew-turn)"
      />
      <circle
        cx={CELL / 2}
        cy={CELL * 1.5}
        r="8.6"
        strokeWidth="1.2"
        className="fill-(--jelly-crew-seat-1) stroke-(--jelly-crew-seat-edge)"
      />
      {/* Pink on plate ●. */}
      <rect
        x="2.4"
        y={3 * CELL + 2.4}
        width={CELL - 4.8}
        height={CELL - 4.8}
        rx="3.8"
        strokeWidth="1.4"
        className="fill-(--jelly-crew-plate-on) stroke-(--jelly-crew-plate-edge)"
      />
      <circle
        cx={CELL / 2}
        cy={CELL * 3.5}
        r="9.8"
        strokeWidth="1.2"
        className="fill-(--jelly-crew-seat-2) stroke-(--jelly-crew-seat-edge)"
      />
      <circle
        cx={CELL / 2 + 7.7}
        cy={CELL * 3.5 - 7.7}
        r="4.1"
        strokeWidth="1"
        className="fill-(--jelly-crew-plate) stroke-(--jelly-crew-plate-edge)"
      />
      <circle
        cx={CELL / 2 + 7.7}
        cy={CELL * 3.5 - 7.7}
        r="1.9"
        className="fill-(--jelly-crew-sign)"
      />
      {/* A mango waiting in the other room. */}
      <rect
        x={3 * CELL + 1.5}
        y={4 * CELL + 1.5}
        width={CELL - 3}
        height={CELL - 3}
        rx="6"
        className="fill-(--jelly-crew-mango-edge)"
      />
      <rect
        x={3 * CELL + 3.2}
        y={4 * CELL + 3.2}
        width={CELL - 6.4}
        height={CELL - 6.4}
        rx="4.5"
        className="fill-(--jelly-crew-mango)"
      />
      <rect
        x={3.5 * CELL - 2.8}
        y={4.5 * CELL - 2.4}
        width="5.6"
        height="5.6"
        className="fill-(--jelly-crew-mango-mark)"
      />
    </svg>
  );
}
