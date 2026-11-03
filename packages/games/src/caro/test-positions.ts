// Test helpers for Cờ caro: positions and games described by cells counted from 1, as players and
// the specs name them ("row 8, column 8"). Only the tests import this file.
import {
  createRng,
  createSession,
  currentState,
  type PlayerIndex,
  playMove,
  type Session,
} from "@board-games/engine";

import { CARO_DEFAULT_OPTIONS, type CaroOptions } from "./options";
import { caro, type CaroMove, type CaroState } from "./rules";

export type CaroSession = Session<CaroState, CaroMove, never, CaroOptions>;

/** Row and column, both counted from 1. */
export type RowCol = readonly [row: number, col: number];

export function cellAt(size: number, [row, col]: RowCol): number {
  if (row < 1 || row > size || col < 1 || col > size) {
    throw new Error(`No cell at row ${row}, column ${col} on a ${size}×${size} board`);
  }
  return (row - 1) * size + (col - 1);
}

export function rowColOf(size: number, cell: number): RowCol {
  return [Math.floor(cell / size) + 1, (cell % size) + 1];
}

/** Cells `[row, col]` from `from` to `to` (inclusive) along a line, both counted from 1. */
export function lineOf(from: RowCol, to: RowCol): RowCol[] {
  const rowStep = Math.sign(to[0] - from[0]);
  const colStep = Math.sign(to[1] - from[1]);
  const length = Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1])) + 1;
  return Array.from({ length }, (_unused, index) => [
    from[0] + index * rowStep,
    from[1] + index * colStep,
  ]);
}

export interface Stones {
  readonly x?: readonly RowCol[];
  readonly o?: readonly RowCol[];
}

/**
 * A position with the given stones and nobody having won; the player to move follows from the
 * counts (X moves first) unless given.
 */
export function position(
  options: Partial<CaroOptions>,
  { x = [], o = [] }: Stones,
  toMove?: PlayerIndex,
): CaroState {
  const { size, rule } = { ...CARO_DEFAULT_OPTIONS, ...options };
  const board: (PlayerIndex | null)[] = Array.from({ length: size * size }, () => null);
  for (const stone of x) board[cellAt(size, stone)] = 0;
  for (const stone of o) board[cellAt(size, stone)] = 1;
  return {
    size,
    rule,
    board,
    toMove: toMove ?? (x.length > o.length ? 1 : 0),
    filled: x.length + o.length,
    win: null,
  };
}

/** A position drawn as rows of "X", "O" and "." from the top; rows not drawn are empty. */
export function drawnPosition(
  options: Partial<CaroOptions>,
  rows: readonly string[],
  toMove?: PlayerIndex,
): CaroState {
  const x: RowCol[] = [];
  const o: RowCol[] = [];
  rows.forEach((line, row) => {
    for (let col = 0; col < line.length; col += 1) {
      if (line.charAt(col) === "X") x.push([row + 1, col + 1]);
      if (line.charAt(col) === "O") o.push([row + 1, col + 1]);
    }
  });
  return position(options, { x, o }, toMove);
}

export function newGame(options: Partial<CaroOptions> = {}): CaroSession {
  const created = createSession(caro, {
    playerCount: 2,
    options: { ...CARO_DEFAULT_OPTIONS, ...options },
  });
  if (!created.ok) throw new Error(created.error);
  return created.value;
}

/**
 * Plays `cells` in order (X first) through the session, failing on the first rejected move.
 * `onEachMove` sees the state after every move but the last.
 */
export function playCells(
  options: Partial<CaroOptions>,
  cells: readonly number[],
  onEachMove?: (state: CaroState, index: number) => void,
): CaroSession {
  const rng = createRng(1);
  return cells.reduce((session, cell, index) => {
    const played = playMove(caro, session, { cell }, rng);
    if (!played.ok) throw new Error(`move ${index + 1} on cell ${cell}: ${played.error}`);
    if (index < cells.length - 1) onEachMove?.(currentState(played.value), index);
    return played.value;
  }, newGame(options));
}

/** Out-of-the-way cells for moves that must not matter: no two of a colour touch. */
const FILLERS: Readonly<Record<"x" | "o", readonly RowCol[]>> = {
  x: [1, 3, 5, 7, 9, 11, 13, 15].map((col) => [13, col]),
  o: [1, 3, 5, 7, 9, 11, 13, 15].map((col) => [15, col]),
};

/**
 * The moves of a game in which `winner` places `stones` (the last one being the final move) and
 * the other player `others`; each side's missing moves go to filler cells far from rows 1–10.
 */
export function gameEndingWith(
  size: number,
  winner: "x" | "o",
  stones: readonly RowCol[],
  others: readonly RowCol[],
): number[] {
  const last = stones.at(-1);
  if (last === undefined) throw new Error("No final move");
  const before = stones.slice(0, -1);
  const loser = winner === "x" ? "o" : "x";
  // X moves first. X ending the game: X0 O0 … X(t−1) O(t−1) last. O ending it: X0 O0 … X(t−1) last.
  const turns =
    winner === "x"
      ? Math.max(before.length, others.length)
      : Math.max(before.length + 1, others.length);
  const pad = (cells: readonly RowCol[], side: "x" | "o", length: number): RowCol[] => {
    const fillers = FILLERS[side].slice(0, Math.max(0, length - cells.length));
    if (cells.length + fillers.length < length) throw new Error("Not enough filler cells");
    return [...cells, ...fillers];
  };
  const own = pad(before, winner, winner === "x" ? turns : turns - 1);
  const theirs = pad(others, loser, turns);
  const xs = winner === "x" ? own : theirs;
  const os = winner === "x" ? theirs : own;
  const moves: RowCol[] = [];
  for (let turn = 0; turn < turns; turn += 1) {
    const x = xs[turn];
    const o = os[turn];
    if (x !== undefined) moves.push(x);
    if (o !== undefined) moves.push(o);
  }
  moves.push(last);
  return moves.map((stone) => cellAt(size, stone));
}
