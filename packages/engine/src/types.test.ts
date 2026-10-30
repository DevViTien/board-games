import { describe, expect, expectTypeOf, it } from "vitest";

import { GAME_CATEGORY } from "./constants";
import type { AnyGameDefinition, GameDefinition } from "./types";

interface FlipState {
  readonly heads: boolean;
}
interface FlipMove {
  readonly flip: true;
}

const flipGame = {
  id: "flip",
  meta: {
    players: { min: 1, max: 1 },
    category: GAME_CATEGORY.Original,
    durationMinutes: 1,
    supportsAI: false,
  },
  defaultOptions: {},
  setup: () => ({ heads: true }),
  currentPlayer: () => 0,
  legalMoves: (state) => (state.heads ? [{ flip: true }] : []),
  applyMove: () => ({ heads: false }),
  result: (state) => (state.heads ? null : { kind: "win", winners: [0] }),
} as const satisfies GameDefinition<FlipState, FlipMove>;

describe("GameDefinition", () => {
  it("lets a game with its own State and Move join a list of any games", () => {
    expectTypeOf(flipGame).toExtend<AnyGameDefinition>();
    const games: readonly AnyGameDefinition[] = [flipGame];
    expect(games).toHaveLength(1);
  });

  it("keeps a literal id when declared with `as const satisfies`", () => {
    expectTypeOf(flipGame.id).toEqualTypeOf<"flip">();
  });

  // Checked by lint, not at run time: `@typescript-eslint/unbound-method` reports this
  // destructuring unless every method of GameDefinition declares `this: void`. It must read from a
  // value typed as GameDefinition (method syntax): `flipGame` itself has arrow-function
  // properties, which never trigger the rule.
  it("allows its rule functions to be used unbound", () => {
    const game: GameDefinition<FlipState, FlipMove> = flipGame;
    const { setup, applyMove, legalMoves } = game;
    const start = setup({ playerCount: 1, options: {} });

    expect(legalMoves(start)).toEqual([{ flip: true }]);
    expect(applyMove(start, { flip: true })).toEqual({ heads: false });
  });
});
