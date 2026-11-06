import type { FenceRaceMove, FenceRaceState } from "@board-games/games/fence-race";

import { useFenceMoveWords } from "./words";

/**
 * A move as an action, after the name of who played it: "đi tới E9", "đặt rào giữa hàng 4 và 5, cột
 * C–D". A fence is named by the cells it stands between, the same whichever way the board is turned.
 */
export function useFenceRaceMoveLabel(): (move: FenceRaceMove, state: FenceRaceState) => string {
  const words = useFenceMoveWords();
  return (move, state) => words(move, state.rows);
}
