import type { PlayerIndex } from "@board-games/engine";
import { IN_STABLE, type LudoState, OWN_GATE } from "@board-games/games/ludo";
import { useTranslations } from "next-intl";

import type { SeatSummary } from "../types";

/**
 * Hook returning a seat's line in the players' panel: where its horses are, as counts ("2 horses on
 * the track · 1 home"), or "no horse out yet", with a shorter form for a phone's narrow tile.
 */
export function useLudoSeatSummary(): (player: PlayerIndex, state: LudoState) => SeatSummary {
  const t = useTranslations("Games.ludo.summary");
  return (player, state) => {
    const horses = state.horses[player] ?? [];
    const track = horses.filter((progress) => progress > IN_STABLE && progress <= OWN_GATE).length;
    const home = horses.filter((progress) => progress > OWN_GATE).length;
    if (track === 0 && home === 0) return { full: t("none"), short: t("short.none") };
    if (home === 0) {
      return { full: t("track", { count: track }), short: t("short.track", { count: track }) };
    }
    if (track === 0) {
      return { full: t("home", { count: home }), short: t("short.home", { count: home }) };
    }
    return { full: t("both", { track, home }), short: t("short.both", { track, home }) };
  };
}
