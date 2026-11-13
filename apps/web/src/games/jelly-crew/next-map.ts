import type { GameResult } from "@board-games/engine";
import { JELLY_CREW_MAPS, JELLY_CREW_REASON } from "@board-games/games/jelly-crew";

/**
 * The map after the one just won, in the order of the setup screen (spec "Độ khó và bản đồ tiếp
 * theo"): none after the last map, nor after a game that was not won (too long, given up).
 */
export function jellyCrewNextOptions(result: GameResult, options: unknown) {
  if (result.kind !== "win" || result.reason !== JELLY_CREW_REASON.Filled) return null;
  const map =
    typeof options === "object" && options !== null && "map" in options ? options.map : undefined;
  const index = JELLY_CREW_MAPS.findIndex((id) => id === map);
  const next = index === -1 ? undefined : JELLY_CREW_MAPS[index + 1];
  return next === undefined ? null : { map: next };
}

/** `GameUI.useNextOptions` of Đội gom thạch. */
export function useJellyCrewNextOptions() {
  return jellyCrewNextOptions;
}
