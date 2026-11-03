import type { LudoState } from "@board-games/games/ludo";
import { cn } from "@board-games/ui";

import type { SeatMarkProps } from "../types";
import { ColourSymbol } from "./ColourSymbol";
import { PIECE_FILL, PIECE_INK_FILL } from "./piece-style";
import { colourNameOf } from "./player-label";

/** A seat's horse in the players' panel: a disc of its colour with the colour's symbol. */
export function LudoSeatMark({ player, state }: SeatMarkProps<LudoState>) {
  const colour = colourNameOf(state, player);
  return (
    <svg viewBox="0 0 1 1" aria-hidden className="size-full">
      <circle
        cx="0.5"
        cy="0.5"
        r="0.46"
        strokeWidth="0.05"
        className={cn(PIECE_FILL[colour], "stroke-piece-edge")}
      />
      <ColourSymbol
        colour={colour}
        at={{ x: 0.5, y: 0.5 }}
        size={0.2}
        className={PIECE_INK_FILL[colour]}
      />
    </svg>
  );
}
