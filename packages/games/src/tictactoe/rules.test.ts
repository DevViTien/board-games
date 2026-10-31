import {
  createRng,
  createSession,
  currentState,
  playMove,
  type Session,
} from "@board-games/engine";
import { describeGameContract } from "@board-games/engine/testing";
import { describe, expect, it } from "vitest";

import { tictactoe, type TicTacToeMove, type TicTacToeState, WINNING_LINES } from "./rules";

type TicTacToeSession = Session<TicTacToeState, TicTacToeMove, never, Record<string, never>>;

const rng = createRng(1);

function newGame(): TicTacToeSession {
  const created = createSession(tictactoe, { playerCount: 2 });
  if (!created.ok) throw new Error(created.error);
  return created.value;
}

/** Plays the given cells in order (X, O, X, …), failing the test on the first rejected move. */
function play(cells: readonly number[]): TicTacToeSession {
  return cells.reduce((session, cell) => {
    const played = playMove(tictactoe, session, { cell }, rng);
    if (!played.ok) throw new Error(`cell ${cell}: ${played.error}`);
    return played.value;
  }, newGame());
}

function holdsALine(cells: readonly number[]): boolean {
  return WINNING_LINES.some((line) => line.every((cell) => cells.includes(cell)));
}

/** A move order in which `winner` completes `line` and the other player never lines up three. */
function gameWonOn(line: readonly number[], winner: 0 | 1): number[] {
  const loserCells: number[] = [];
  const filler = (): number => {
    const cell = [0, 1, 2, 3, 4, 5, 6, 7, 8].find(
      (candidate) =>
        !line.includes(candidate) &&
        !loserCells.includes(candidate) &&
        !holdsALine([...loserCells, candidate]),
    );
    if (cell === undefined) throw new Error("no safe filler cell");
    loserCells.push(cell);
    return cell;
  };

  const moves: number[] = [];
  for (const cell of line) {
    // O moves second, so when O wins, X places a filler before each of O's line cells.
    if (winner === 1) moves.push(filler());
    moves.push(cell);
    if (winner === 0 && cell !== line[2]) moves.push(filler());
  }
  return moves;
}

describe("tictactoe rules", () => {
  it("declares two players, the classic category, about 2 minutes and play against the AI", () => {
    expect(tictactoe.meta).toEqual({
      players: { min: 2, max: 2 },
      category: "classic",
      durationMinutes: 2,
      supportsAI: true,
    });
    expect(tictactoe.defaultOptions).toEqual({});
  });

  it("starts with nine empty cells and X to move", () => {
    const state = currentState(newGame());

    expect(state.board).toEqual(Array.from({ length: 9 }, () => null));
    expect(tictactoe.currentPlayer(state)).toBe(0);
    expect(tictactoe.legalMoves(state)).toHaveLength(9);
  });

  it("marks the chosen cell for the player to move and passes the turn", () => {
    const state = currentState(play([4]));

    expect(state.board[4]).toBe(0);
    expect(tictactoe.currentPlayer(state)).toBe(1);
  });

  it("refuses a move on a marked cell and leaves the board unchanged", () => {
    const session = play([4]);

    expect(playMove(tictactoe, session, { cell: 4 }, rng)).toEqual({
      ok: false,
      error: "illegal-move",
    });
    expect(tictactoe.legalMoves(currentState(session))).not.toContainEqual({ cell: 4 });
  });

  it.each(
    WINNING_LINES.flatMap(
      (line) =>
        [
          [line.join("-"), "X", line, 0],
          [line.join("-"), "O", line, 1],
        ] as const,
    ),
  )("ends with a win on line %s for %s", (_label, _mark, line, winner) => {
    const state = currentState(play(gameWonOn(line, winner)));

    expect(tictactoe.result(state)).toEqual({ kind: "win", winners: [winner] });
    expect(tictactoe.legalMoves(state)).toEqual([]);
  });

  it("is a draw when the board fills up without three in a row", () => {
    // X O X / X O O / O X X
    const state = currentState(play([0, 1, 2, 4, 3, 5, 7, 6, 8]));

    expect(tictactoe.result(state)).toEqual({ kind: "draw" });
    expect(tictactoe.legalMoves(state)).toEqual([]);
  });

  it("is a win, not a draw, when the ninth move completes a line", () => {
    // X O X / O O X / O X X — no line until X's ninth move (cell 8) completes the right column.
    const state = currentState(play([0, 1, 2, 3, 5, 4, 7, 6, 8]));

    expect(state.board.every((mark) => mark !== null)).toBe(true);
    expect(tictactoe.result(state)).toEqual({ kind: "win", winners: [0] });
  });
});

describeGameContract(tictactoe, { seeds: [1, 2, 3, 4, 5, 6, 7, 8], maxPlies: 9 });
