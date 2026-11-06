import type { Route } from "next";
import type { ComponentType } from "react";

import { CardScoreArtwork } from "./card-score/Artwork";

export interface ToolEntry {
  /** Its name and tagline: `Toolbox.tools.<id>` in the messages. */
  readonly id: "card-score";
  readonly href: Route;
  readonly Artwork: ComponentType;
}

/** The toolbox's page is built from this list: a new tool is one more line, and its folder. */
export const TOOLS: readonly ToolEntry[] = [
  { id: "card-score", href: "/tools/card-score" as Route, Artwork: CardScoreArtwork },
];
