import type { RegisteredGameId } from "@board-games/games";

import type { GameEntry } from "./types";

/** One loader per registered game, each loading the entry of that very game. */
export type GameEntryLoaders = {
  readonly [Id in RegisteredGameId]: () => Promise<GameEntry<Id>>;
};

/**
 * The UI of every registered game, loaded only when its play screen opens. Adding a game is one
 * line here; a missing or extra game, or a key loading another game's entry, is a type error.
 */
export const GAME_ENTRY_LOADERS = {
  tictactoe: () => import("./tictactoe").then((module) => module.tictactoeEntry),
} satisfies GameEntryLoaders;
