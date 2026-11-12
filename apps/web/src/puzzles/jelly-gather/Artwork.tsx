import "./theme.css";

import { cn } from "@board-games/ui";

import { PieceShape, Player } from "./pieces";
import { DIRECTION, JELLY_KIND, type Piece } from "./rules/types";

const CELL = 30;
const WIDTH = 4;
const NONE: ReadonlySet<number> = new Set();

/** Two strawberries stuck as one, a pandan alone, mango held by grass jelly, and the player. */
const PIECES: readonly Piece[] = [
  { cells: [1, 2], kinds: [JELLY_KIND.Strawberry, JELLY_KIND.Strawberry], fixed: false },
  { cells: [4], kinds: [JELLY_KIND.Pandan], fixed: false },
  {
    cells: [6, 7, 11],
    kinds: [JELLY_KIND.Grass, JELLY_KIND.Mango, JELLY_KIND.Mango],
    fixed: false,
  },
];

/** Gom thạch on the menu: a corner of the tray. Decorative, drawn from the board's own shapes. */
export function JellyGatherArtwork({ className }: { readonly className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${WIDTH * CELL} ${3 * CELL}`}
      aria-hidden
      className={cn("h-24 w-32", className)}
    >
      {PIECES.map((piece) => (
        <PieceShape
          key={piece.cells[0]}
          piece={piece}
          width={WIDTH}
          walls={NONE}
          slid={NONE}
          cell={CELL}
        />
      ))}
      <Player x={1.5 * CELL} y={2.5 * CELL} face={DIRECTION.Right} cell={CELL} />
    </svg>
  );
}
