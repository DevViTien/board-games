import type { GameResult } from "@board-games/engine";
import type { CaroState } from "@board-games/games/caro";
import { useTranslations } from "next-intl";

import { useCaroPlayerLabel } from "./player-label";

/** The direction of a line of cells on a board of `size`, from its first two cells. */
function directionOf(cells: readonly number[], size: number) {
  const [first, second] = cells;
  if (first === undefined || second === undefined) return null;
  const rows = Math.floor(second / size) - Math.floor(first / size);
  const cols = (second % size) - (first % size);
  if (rows === 0) return "row";
  if (cols === 0) return "column";
  return rows * cols > 0 ? "diagonal" : "antiDiagonal";
}

/** Hook returning the result card's line of a Cờ caro game: how many stones in a line, which way. */
export function useCaroResultDetail(): (result: GameResult, state: CaroState) => string | null {
  const t = useTranslations("Games.caro.result");
  const playerLabel = useCaroPlayerLabel();
  return (result, state) => {
    if (result.kind !== "win" || state.win === null) return null;
    const direction = directionOf(state.win.cells, state.size);
    if (direction === null) return null;
    return t("line", {
      count: state.win.cells.length,
      mark: playerLabel(state.win.player),
      direction: t(`direction.${direction}`),
    });
  };
}
