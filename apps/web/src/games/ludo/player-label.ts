import type { PlayerIndex } from "@board-games/engine";
import { LUDO_COLOUR_NAMES, type LudoColourName, type LudoState } from "@board-games/games/ludo";
import { useTranslations } from "next-intl";

/** The colour a seat plays: two players hold Red and Yellow, three the first three colours. */
export function colourNameOf(state: LudoState, player: PlayerIndex): LudoColourName {
  return LUDO_COLOUR_NAMES[state.colours[player] ?? 0];
}

/** A seat is named by its colour ("Đỏ"), which depends on the number of players. */
export function useLudoPlayerLabel(): (player: PlayerIndex, state: LudoState) => string {
  const t = useTranslations("Games.ludo.colours");
  return (player, state) => t(colourNameOf(state, player));
}
