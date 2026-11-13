import "./theme.css";

import { cn } from "@board-games/ui";

import type { ArtworkProps } from "../types";

/** Six guests on a circle of radius 36 around (50, 50), from the top, clockwise. */
const SEATS = Array.from({ length: 6 }, (_, guest) => {
  const angle = -Math.PI / 2 + (Math.PI * guest) / 3;
  return { x: 50 + 36 * Math.cos(angle), y: 50 + 36 * Math.sin(angle) };
});

/** Lines drawn: two guests and whose (0 red, solid; 1 blue, dashed). */
const LINES = [
  [0, 1, 0],
  [1, 2, 0],
  [0, 2, 0],
  [2, 4, 1],
  [3, 5, 1],
  [0, 4, 1],
  [1, 3, 0],
] as const;

const at = (guest: number) => SEATS[guest] ?? { x: 50, y: 50 };

/**
 * Tam giác cấm on the menu and the setup screen: six guests at a table, a few red and blue lines
 * and the red triangle just closed. Drawn on its own, without the board's code. Decorative.
 */
export function ForbiddenTriangleArtwork({ className }: ArtworkProps) {
  const triangle = [0, 1, 2].map((guest) => `${String(at(guest).x)},${String(at(guest).y)}`);
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={cn("size-30", className)}>
      <rect width="100" height="100" rx="12" className="fill-game-board" />
      <polygon
        points={triangle.join(" ")}
        strokeWidth="1.6"
        strokeLinejoin="round"
        className="fill-game-mark-1/20 stroke-game-win"
      />
      {LINES.map(([a, b, owner]) => (
        <line
          key={`${String(a)}-${String(b)}`}
          x1={at(a).x}
          y1={at(a).y}
          x2={at(b).x}
          y2={at(b).y}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={owner === 1 ? "5 4" : undefined}
          className={owner === 0 ? "stroke-game-mark-1" : "stroke-game-mark-2"}
        />
      ))}
      {SEATS.map(({ x, y }, guest) => (
        <circle
          key={guest}
          cx={x}
          cy={y}
          r="7"
          strokeWidth="1.6"
          className="fill-(--forbidden-triangle-guest) stroke-(--forbidden-triangle-guest-edge)"
        />
      ))}
    </svg>
  );
}
