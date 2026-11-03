import "./theme.css";

import { cn } from "@board-games/ui";

import type { ArtworkProps } from "../types";

// The pieces are the board's own files ("staunty", CC BY-NC-SA 4.0, `public/pieces/staunty/`, see
// its LICENSE.txt), by address: an artwork imports no other module of its game, or the menu would
// load the board (design §4).

/** Cờ vua on the menu and the setup screen: four squares, a White king and a Black knight. */
export function ChessArtwork({ className }: ArtworkProps) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden className={cn("size-30", className)}>
      <g>
        <rect x="4" y="4" width="56" height="56" className="fill-game-board" />
        <rect x="60" y="4" width="56" height="56" className="fill-(--chess-square-dark)" />
        <rect x="4" y="60" width="56" height="56" className="fill-(--chess-square-dark)" />
        <rect x="60" y="60" width="56" height="56" className="fill-game-board" />
        <rect
          x="4"
          y="4"
          width="112"
          height="112"
          fill="none"
          strokeWidth="2"
          className="stroke-game-line"
        />
      </g>
      <image href="/pieces/staunty/wK.svg" x="6" y="6" width="52" height="52" />
      <image href="/pieces/staunty/bN.svg" x="62" y="62" width="52" height="52" />
    </svg>
  );
}
