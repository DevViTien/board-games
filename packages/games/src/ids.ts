/**
 * The id of every game the app can play, without their rules: what client code that only checks
 * or names a game imports (`@board-games/games/ids`), so the rules and AI of every game stay out
 * of its bundle. `index.test.ts` checks it lists exactly the games of `GAMES`, in the same order.
 */
export const GAME_IDS = [
  "tictactoe",
  "caro",
  "ludo",
  "chess",
  "fence-race",
  "jelly-crew",
  "forbidden-triangle",
] as const;

export type RegisteredGameId = (typeof GAME_IDS)[number];

export function isRegisteredGameId(id: string): id is RegisteredGameId {
  return GAME_IDS.some((registered) => registered === id);
}
