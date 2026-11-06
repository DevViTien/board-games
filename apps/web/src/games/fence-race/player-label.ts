import type { PlayerIndex } from "@board-games/engine";
import type { FenceRaceState } from "@board-games/games/fence-race";
import { useTranslations } from "next-intl";

import { seatColour } from "./piece-style";

/** A seat is named by its colour ("Đỏ"); the seats take the colours in order. */
export function useFenceRacePlayerLabel(): (player: PlayerIndex, state: FenceRaceState) => string {
  const t = useTranslations("Games.fence-race.colours");
  return (player) => t(seatColour(player));
}
