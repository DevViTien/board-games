import type { RegisteredGameId } from "@board-games/games";
import type { ComponentType } from "react";

import { CaroArtwork } from "./caro/Artwork";
import { ChessArtwork } from "./chess/Artwork";
import { FenceRaceArtwork } from "./fence-race/Artwork";
import { JellyCrewArtwork } from "./jelly-crew/Artwork";
import { LudoArtwork } from "./ludo/Artwork";
import { TicTacToeArtwork } from "./tictactoe/Artwork";
import type { ArtworkProps } from "./types";

/**
 * Each registered game's picture on the menu and the setup screen, drawn with the game's own tokens
 * (`games/<id>/theme.css`) inside an element with `data-game="<id>"`. Rendered on the server.
 *
 * Kept apart from `GAME_ENTRY_LOADERS` on purpose: a server component that imports the loaders
 * puts every game's board (client components behind those dynamic imports) in its page's client
 * manifest, so the menu would download all boards. Adding a game is one line here too; a missing or
 * extra game is a type error.
 */
export const GAME_ARTWORK = {
  tictactoe: TicTacToeArtwork,
  caro: CaroArtwork,
  ludo: LudoArtwork,
  chess: ChessArtwork,
  "fence-race": FenceRaceArtwork,
  "jelly-crew": JellyCrewArtwork,
} as const satisfies Readonly<Record<RegisteredGameId, ComponentType<ArtworkProps>>>;
