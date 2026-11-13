import type { AnyGameDefinition } from "@board-games/engine";

import { caro } from "./caro";
import { fenceRace } from "./fence-race";
import { forbiddenTriangle } from "./forbidden-triangle";
import type { RegisteredGameId } from "./ids";
import { ludo } from "./ludo";
import { tictactoe } from "./tictactoe";
import { xiangqi } from "./xiangqi";

/**
 * The games the AI plays (`meta.supportsAI`), for the AI's Worker (`@board-games/games/ai`): it
 * imports only these, so the rules of a game without an AI (Chess and its `chess.js`) stay out of
 * its bundle. A game with an AI adds one entry here; `index.test.ts` checks this lists exactly the
 * games of `GAMES` whose `meta.supportsAI` is true, in the same order.
 */
export const AI_GAMES = [
  tictactoe,
  caro,
  ludo,
  fenceRace,
  forbiddenTriangle,
  xiangqi,
] as const satisfies readonly (AnyGameDefinition & {
  readonly id: RegisteredGameId;
})[];

/** The game the AI plays with this id, or `undefined` (unknown, or a game without an AI). */
export function findAiGame(id: string): AnyGameDefinition | undefined {
  return AI_GAMES.find((game) => game.id === id);
}
