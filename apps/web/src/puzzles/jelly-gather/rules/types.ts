// Gom thạch's rules are plain functions of plain data (design §3): no React, no DOM, no randomness.

/** What a cell of a piece is made of. */
export const JELLY_KIND = {
  Strawberry: "strawberry",
  Pandan: "pandan",
  Mango: "mango",
  Taro: "taro",
  Coconut: "coconut",
  Grass: "grass",
  Ice: "ice",
} as const;
export type JellyKind = (typeof JELLY_KIND)[keyof typeof JELLY_KIND];

/** The kinds a level is won on: each must end up in one piece. Grass jelly and ice do not count. */
export const COLOURS = [
  JELLY_KIND.Strawberry,
  JELLY_KIND.Pandan,
  JELLY_KIND.Mango,
  JELLY_KIND.Taro,
  JELLY_KIND.Coconut,
] as const satisfies readonly JellyKind[];
export type Colour = (typeof COLOURS)[number];

/** Every kind, in the order the app names them. */
export const KINDS = [
  ...COLOURS,
  JELLY_KIND.Grass,
  JELLY_KIND.Ice,
] as const satisfies readonly JellyKind[];

export const DIRECTION = { Up: "U", Down: "D", Left: "L", Right: "R" } as const;
export type Direction = (typeof DIRECTION)[keyof typeof DIRECTION];
export const DIRECTIONS = [
  DIRECTION.Up,
  DIRECTION.Down,
  DIRECTION.Left,
  DIRECTION.Right,
] as const satisfies readonly Direction[];

/** The step on the grid of each direction, as [dx, dy]. */
export const OFFSET: Readonly<Record<Direction, readonly [number, number]>> = {
  [DIRECTION.Up]: [0, -1],
  [DIRECTION.Down]: [0, 1],
  [DIRECTION.Left]: [-1, 0],
  [DIRECTION.Right]: [1, 0],
};

/** The first level of each mechanic says a line about it. */
export const HINT = { Push: "push", Ice: "ice", Grass: "grass", Coconut: "coconut" } as const;
export type Hint = (typeof HINT)[keyof typeof HINT];

/**
 * Cells that move together. `kinds[i]` is what `cells[i]` is made of: one kind, or several once
 * grass jelly holds them. Cells are in increasing order; a cell is `y * width + x`.
 */
export interface Piece {
  readonly cells: readonly number[];
  readonly kinds: readonly JellyKind[];
  /** A coconut cell of it touches a wall: it never moves again. */
  readonly fixed: boolean;
}

/** Where everything is. Pieces are in the order of their first cell, so equal boards are equal. */
export interface Board {
  readonly player: number;
  readonly pieces: readonly Piece[];
}

/** `<chapter>-<level>`, both from 1. */
export type LevelId = `${number}-${number}`;

export interface Level {
  readonly id: LevelId;
  readonly chapter: number;
  /** Changes when a released level's design changes: its saved attempt and best then no longer apply. */
  readonly version: number;
  readonly width: number;
  readonly height: number;
  readonly walls: ReadonlySet<number>;
  readonly start: Board;
  /** The fewest moves that solve it, proved by the solver in the levels' tests. */
  readonly minMoves: number;
  readonly hint?: Hint;
}

/** Why a move did not happen. */
export const BLOCKED = {
  /** The player would walk into a wall. */
  Wall: "wall",
  /** A pushed piece would move into a coconut piece stuck to a wall. */
  Fixed: "fixed",
  /** A pushed piece would move into a wall. */
  Jam: "jam",
  /** The level is solved: nothing moves any more. */
  Solved: "solved",
} as const;
export type Blocked = (typeof BLOCKED)[keyof typeof BLOCKED];

/** What a move did, for what is said and shown; the board itself is the truth. */
export interface Outcome {
  readonly player: number;
  /** The kinds of every piece pushed, in `KINDS` order. */
  readonly pushed: readonly JellyKind[];
  /** Colours that now make fewer pieces, with how many are left. */
  readonly stuck: readonly { readonly colour: Colour; readonly pieces: number }[];
  /** Kinds grass jelly took hold of in this move, in `KINDS` order. */
  readonly glued: readonly JellyKind[];
  /** A piece stuck to a wall in this move. */
  readonly fixed: boolean;
  readonly solved: boolean;
}

export type StepResult =
  | {
      readonly ok: true;
      readonly board: Board;
      /**
       * The board right after the push, before anything stuck: the same pieces as before the move,
       * in the same order, the pushed ones one cell on. What a slide is drawn from.
       */
      readonly moved: Board;
      /** Indexes in the previous board of the pieces pushed. */
      readonly pushedPieces: readonly number[];
      readonly outcome: Outcome;
    }
  | { readonly ok: false; readonly blocked: Blocked };
