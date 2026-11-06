import type { PlayerIndex } from "@board-games/engine";
import { fenceRaceDistance, type FenceRaceState } from "@board-games/games/fence-race";
import { useTranslations } from "next-intl";

import type { SeatSummary } from "../types";

/**
 * Hook returning a seat's line in the players' panel: "5 rào · phá · 7 bước", the same on a phone
 * and beside the board, so the panel does not change height when the turn passes.
 */
export function useFenceRaceSeatSummary(): (
  player: PlayerIndex,
  state: FenceRaceState,
) => SeatSummary {
  const t = useTranslations("Games.fence-race.summary");
  return (player, state) => {
    const line = t("line", {
      fences: t("fences", { count: state.fencesLeft[player] ?? 0 }),
      broke: t((state.breaksLeft[player] ?? 0) > 0 ? "canBreak" : "broke"),
      steps: t("steps", { count: fenceRaceDistance(state, player) }),
    });
    return { full: line, short: line };
  };
}
