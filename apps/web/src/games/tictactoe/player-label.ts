import type { PlayerIndex } from "@board-games/engine";
import { useTranslations } from "next-intl";

/** Seat 0 plays X and moves first; seat 1 plays O. */
export function useTicTacToePlayerLabel(): (player: PlayerIndex) => string {
  const t = useTranslations("Games.tictactoe.players");
  return (player) => (player === 0 ? t("x") : t("o"));
}
