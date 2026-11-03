import type { GameResult } from "@board-games/engine";
import type { LudoState } from "@board-games/games/ludo";
import { useFormatter, useTranslations } from "next-intl";

import { useLudoPlayerLabel } from "./player-label";

/** Hook returning the result card's line of a Cờ cá ngựa game: whose horses all reached home. */
export function useLudoResultDetail(): (result: GameResult, state: LudoState) => string | null {
  const t = useTranslations("Games.ludo");
  const format = useFormatter();
  const colour = useLudoPlayerLabel();
  return (result, state) =>
    result.kind === "win"
      ? t("result", {
          colour: format.list(
            result.winners.map((winner) => colour(winner, state)),
            { type: "conjunction" },
          ),
        })
      : null;
}
