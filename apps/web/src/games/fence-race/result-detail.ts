import type { GameResult } from "@board-games/engine";
import {
  FENCE_RACE_REASON,
  fenceRaceDistance,
  fenceRaceMoveLimit,
  type FenceRaceState,
} from "@board-games/games/fence-race";
import { useFormatter, useTranslations } from "next-intl";

import { cellName } from "./board-layout";
import { useFenceRacePlayerLabel } from "./player-label";

/**
 * Hook returning the result card's line of a Cờ rào game: where the winner reached their gate, or,
 * when the moves ran out, who was nearest or that the nearest were level.
 */
export function useFenceRaceResultDetail(): (
  result: GameResult,
  state: FenceRaceState,
) => string | null {
  const t = useTranslations("Games.fence-race.result");
  const format = useFormatter();
  const colour = useFenceRacePlayerLabel();
  return (result, state) => {
    const limit = fenceRaceMoveLimit(state.pawns.length);
    const stepsOf = state.pawns.map((_pawn, seat) => fenceRaceDistance(state, seat));
    if (result.kind === "draw") {
      const nearest = Math.min(...stepsOf);
      const tied = stepsOf.flatMap((steps, seat) => (steps === nearest ? [seat] : []));
      return t("draw", {
        limit,
        steps: nearest,
        players: format.list(
          tied.map((seat) => colour(seat, state)),
          { type: "conjunction" },
        ),
      });
    }
    const [winner] = result.winners;
    if (winner === undefined) return null;
    const pawn = state.pawns[winner];
    if (result.reason === FENCE_RACE_REASON.Goal && pawn !== undefined) {
      return t("goal", {
        player: colour(winner, state),
        cell: cellName(pawn, state.rows),
        moves: state.moveCount,
      });
    }
    if (result.reason !== FENCE_RACE_REASON.TurnLimit) return null;
    const others = state.pawns.flatMap((_pawn, seat) =>
      seat === winner
        ? []
        : [t("other", { player: colour(seat, state), steps: stepsOf[seat] ?? 0 })],
    );
    return t("turnLimit", {
      player: colour(winner, state),
      limit,
      steps: stepsOf[winner] ?? 0,
      others: format.list(others, { type: "unit", style: "short" }),
    });
  };
}
