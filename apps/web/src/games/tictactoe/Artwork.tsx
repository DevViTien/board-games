import "./theme.css";

import { cn } from "@board-games/ui";

import type { ArtworkProps } from "../types";

const CELLS = [0, 1, 2].flatMap((row) => [0, 1, 2].map((col) => ({ row, col })));

/** Tic-tac-toe on the menu and the setup screen: sticker cells, two X and an O. Decorative. */
export function TicTacToeArtwork({ className }: ArtworkProps) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden className={cn("size-30", className)}>
      {CELLS.map(({ row, col }) => (
        <rect
          key={`${row}-${col}`}
          x={4 + col * 40}
          y={4 + row * 40}
          width="34"
          height="34"
          rx="9"
          className="fill-game-board"
        />
      ))}
      <g fill="none" strokeLinecap="round" strokeWidth="6">
        <path d="M12 12l18 18M30 12L12 30" className="stroke-game-mark-1" />
        <circle cx="61" cy="61" r="9" className="stroke-game-mark-2" />
        <path d="M92 92l18 18M110 92l-18 18" className="stroke-game-mark-1" />
      </g>
    </svg>
  );
}
