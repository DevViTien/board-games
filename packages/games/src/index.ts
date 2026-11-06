import type { AnyGameDefinition } from "@board-games/engine";

import { caro } from "./caro";
import { chess } from "./chess";
import { fenceRace } from "./fence-race";
import type { RegisteredGameId } from "./ids";
import { ludo } from "./ludo";
import { tictactoe } from "./tictactoe";

/**
 * Every game the app can play. Adding a game is one entry here and its id in `GAME_IDS` (`ids.ts`,
 * for client code that must not load every game's rules); each entry is declared with
 * `as const satisfies GameDefinition<…>` so its id stays a literal, checked against `GAME_IDS`.
 */
export const GAMES = [
  tictactoe,
  caro,
  ludo,
  chess,
  fenceRace,
] as const satisfies readonly (AnyGameDefinition & {
  readonly id: RegisteredGameId;
})[];

export function findGame(id: string): AnyGameDefinition | undefined {
  return GAMES.find((game) => game.id === id);
}

export * from "./caro";
export * from "./chess";
export * from "./fence-race";
export { GAME_IDS, isRegisteredGameId, type RegisteredGameId } from "./ids";
export * from "./ludo";
export * from "./tictactoe";
