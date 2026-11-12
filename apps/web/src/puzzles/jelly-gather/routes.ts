// The addresses of Gom thạch's screens: plain data, for the server's route to check them too.

import { findLevel } from "./levels";
import type { Level } from "./rules/types";

export const JELLY_GATHER_HOME = "/puzzles/jelly-gather";

export type JellyGatherRoute =
  { readonly screen: "list" } | { readonly screen: "level"; readonly level: Level };

/** The screen of a path's segments after `/puzzles/jelly-gather`, or `null` for no such page. */
export function routeOf(segments: readonly string[]): JellyGatherRoute | null {
  if (segments.length === 0) return { screen: "list" };
  const [id] = segments;
  const level = segments.length === 1 && id !== undefined ? findLevel(id) : undefined;
  return level === undefined ? null : { screen: "level", level };
}

export const levelHref = (level: Pick<Level, "id">) => `${JELLY_GATHER_HOME}/${level.id}`;
