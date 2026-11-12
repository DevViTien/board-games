import type { Route } from "next";
import type { ComponentType } from "react";

import { JellyGatherArtwork } from "./jelly-gather/Artwork";
import { LEVELS } from "./jelly-gather/levels";

export interface PuzzleEntry {
  /** Its name and tagline: `Puzzles.<id>` in the messages; also its `data-game` scope. */
  readonly id: "jelly-gather";
  readonly href: Route;
  readonly Artwork: ComponentType;
  readonly levelCount: number;
}

/** The menu's puzzle cards are built from this list: a new puzzle is one more line, and its folder. */
export const PUZZLES: readonly PuzzleEntry[] = [
  {
    id: "jelly-gather",
    href: "/puzzles/jelly-gather" as Route,
    Artwork: JellyGatherArtwork,
    levelCount: LEVELS.length,
  },
];
