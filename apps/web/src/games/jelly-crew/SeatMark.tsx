import type { JellyCrewState } from "@board-games/games/jelly-crew";

import type { SeatMarkProps } from "../types";
import { Character } from "./pieces";

/** A seat's character in the players' panel: its colour and its number. */
export function JellyCrewSeatMark({ player }: SeatMarkProps<JellyCrewState>) {
  return (
    <svg viewBox="0 0 56 56" aria-hidden className="size-full">
      <Character cx={28} cy={28} seat={player} now={false} />
    </svg>
  );
}
