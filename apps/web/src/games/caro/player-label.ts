import type { PlayerIndex } from "@board-games/engine";
import { useTranslations } from "next-intl";

/** Seat 0 plays X and moves first; seat 1 plays O, whatever the state. */
export function useCaroPlayerLabel(): (player: PlayerIndex) => string {
  const t = useTranslations("Games.caro.players");
  return (player) => (player === 0 ? t("x") : t("o"));
}
