import type { AnyGameDefinition } from "@board-games/engine";

import { tictactoe } from "./tictactoe";

/**
 * Every game the app can play. Adding a game is one entry here; each entry is declared with
 * `as const satisfies GameDefinition<…>` so its id stays a literal and `RegisteredGameId` is a union.
 */
export const GAMES = [tictactoe] as const;

export type RegisteredGameId = (typeof GAMES)[number]["id"];

export function isRegisteredGameId(id: string): id is RegisteredGameId {
  return GAMES.some((game) => game.id === id);
}

export function findGame(id: string): AnyGameDefinition | undefined {
  return GAMES.find((game) => game.id === id);
}

export * from "./tictactoe";
