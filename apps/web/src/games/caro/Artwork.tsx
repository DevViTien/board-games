import "./theme.css";

import { cn } from "@board-games/ui";

import type { ArtworkProps } from "../types";

const LINES = Array.from({ length: 9 }, (_, index) => index * 15);
const XS = [
  [2, 5],
  [3, 4],
  [4, 3],
  [5, 2],
] as const;
const OS = [
  [3, 3],
  [4, 4],
  [2, 4],
] as const;

/** Cờ caro on the menu and the setup screen: a corner of a notebook page mid-game. Decorative. */
export function CaroArtwork({ className }: ArtworkProps) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden className={cn("size-30", className)}>
      <rect width="120" height="120" className="fill-game-board" />
      <g strokeWidth="1" className="stroke-game-line/45">
        {LINES.map((at) => (
          <g key={at}>
            <line x1={at} y1="0" x2={at} y2="120" />
            <line x1="0" y1={at} x2="120" y2={at} />
          </g>
        ))}
      </g>
      <line x1="22" y1="0" x2="22" y2="120" strokeWidth="1.5" className="stroke-(--caro-margin)" />
      <g fill="none" strokeLinecap="round">
        {XS.map(([col, row]) => (
          <path
            key={`x${col}-${row}`}
            d={`M${col * 15 + 3} ${row * 15 + 3}l9 9M${col * 15 + 12} ${row * 15 + 3}l-9 9`}
            strokeWidth="2.4"
            className="stroke-game-mark-1"
          />
        ))}
        {OS.map(([col, row]) => (
          <circle
            key={`o${col}-${row}`}
            cx={col * 15 + 7.5}
            cy={row * 15 + 7.5}
            r="4.6"
            strokeWidth="2.2"
            className="stroke-game-mark-2"
          />
        ))}
      </g>
    </svg>
  );
}
