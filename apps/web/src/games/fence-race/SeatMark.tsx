import type { FenceRaceState } from "@board-games/games/fence-race";

import type { SeatMarkProps } from "../types";
import { Hat } from "./pieces";

/** A seat's pawn in the players' panel: its hat, with the seat's symbol. */
export function FenceRaceSeatMark({ player }: SeatMarkProps<FenceRaceState>) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden className="size-full">
      <Hat player={player} x={14} y={14} radius={12.25} />
    </svg>
  );
}
