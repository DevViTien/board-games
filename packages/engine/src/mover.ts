import type { GameDefinition, PlayerIndex } from "./types";

/**
 * The seat that plays `move` in `stateBefore`: the seat the move names in a game played freely
 * (`meta.freePlay`), the player to move otherwise. Who made a move of a record is
 * `moverOf(game, session.states[i], session.entries[i].move)`.
 */
export function moverOf<State, Move, Outcome, Options extends object>(
  game: GameDefinition<State, Move, Outcome, Options>,
  stateBefore: State,
  move: Move,
): PlayerIndex {
  if (game.meta.freePlay === true) {
    if (game.moverOf === undefined) throw new Error(`${game.id} plays freely without moverOf`);
    return game.moverOf(move);
  }
  return game.currentPlayer(stateBefore);
}
