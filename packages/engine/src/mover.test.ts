import { describe, expect, it } from "vitest";

import { moverOf } from "./mover";
import { counterGame } from "./test-fixtures/counter-game";

describe("moverOf", () => {
  it("is the player to move in a game with turns", () => {
    const state = counterGame.setup();
    expect(moverOf(counterGame, state, { add: 1 })).toBe(counterGame.currentPlayer(state));
  });

  it("is the seat a move names in a game played freely", () => {
    const free = {
      ...counterGame,
      meta: { ...counterGame.meta, freePlay: true },
      moverOf: (move: { add: number }) => move.add - 1,
    };
    const state = free.setup();
    expect(moverOf(free, state, { add: 2 })).toBe(1);
  });

  it("throws for a game played freely without moverOf", () => {
    const broken = { ...counterGame, meta: { ...counterGame.meta, freePlay: true } };
    const state = broken.setup();
    expect(() => moverOf(broken, state, { add: 1 })).toThrow(/without moverOf/u);
  });
});
