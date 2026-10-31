import { AI_LEVEL, chooseMove, createRng, type PlayerIndex, type Rng } from "@board-games/engine";
import { neverExpires } from "@board-games/engine/testing";
import { describe, expect, it } from "vitest";

import { tictactoe, type TicTacToeState } from "./rules";

/** A position from 9 characters, "X", "O" or "." per cell, row by row; X moves first. */
function position(cells: string): TicTacToeState {
  const board = Array.from({ length: 9 }, (_unused, index) => {
    const cell = cells.charAt(index);
    return cell === "X" ? 0 : cell === "O" ? 1 : null;
  });
  return { board, toMove: board.filter((mark) => mark !== null).length % 2 };
}

describe("tictactoe evaluate", () => {
  it("scores two in an open line above an empty board", () => {
    // X X . / . O . / . . .  — X holds two of the open top row.
    expect(tictactoe.evaluate(position("XX..O...."), 0)).toBeGreaterThan(
      tictactoe.evaluate(tictactoe.setup(), 0),
    );
  });

  it("flips sign when seen from the other seat", () => {
    for (const cells of ["X........", "XX..O....", "X.O.X..O.", "XOX.O...."]) {
      const state = position(cells);
      expect(tictactoe.evaluate(state, 1)).toBe(-tictactoe.evaluate(state, 0));
    }
  });

  it("stays an integer within ±800 on every reachable unfinished position", () => {
    // The AI only evaluates unfinished positions, where no line holds three marks.
    const values: number[] = [];
    const visit = (state: TicTacToeState): void => {
      if (tictactoe.result(state) !== null) return;
      values.push(tictactoe.evaluate(state, 0), tictactoe.evaluate(state, 1));
      for (const move of tictactoe.legalMoves(state)) visit(tictactoe.applyMove(state, move));
    };
    visit(tictactoe.setup());

    expect(values.every((value) => Number.isInteger(value) && Math.abs(value) <= 800)).toBe(true);
  });
});

describe("tictactoe against the Hard AI", () => {
  /** Plays every human move against the AI's choice; returns how many games the human won. */
  function humanWins(state: TicTacToeState, aiSeat: PlayerIndex, rng: Rng): number {
    const result = tictactoe.result(state);
    if (result !== null) return result.kind === "win" && !result.winners.includes(aiSeat) ? 1 : 0;
    if (tictactoe.currentPlayer(state) === aiSeat) {
      const chosen = chooseMove(tictactoe, state, {
        level: AI_LEVEL.Hard,
        rng,
        // Time never passes: Hard must search each position to the end of the game.
        now: neverExpires(),
        timeLimitMs: 1000,
      });
      if (!chosen.ok) throw new Error(chosen.error);
      return humanWins(tictactoe.applyMove(state, chosen.value), aiSeat, rng);
    }
    return tictactoe
      .legalMoves(state)
      .reduce((wins, move) => wins + humanWins(tictactoe.applyMove(state, move), aiSeat, rng), 0);
  }

  it.each([
    [1, 1],
    [1, 0],
    [2, 1],
    [2, 0],
    [3, 1],
    [3, 0],
  ] as const)("never loses whatever the human plays (seed %i, AI seat %i)", (seed, aiSeat) => {
    expect(humanWins(tictactoe.setup(), aiSeat, createRng(seed))).toBe(0);
  });
});
