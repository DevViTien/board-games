import type { PlayerIndex } from "@board-games/engine";

import type {
  JellyCrewGroup,
  JellyCrewKind,
  JellyCrewMapId,
  JellyCrewMove,
  JellyCrewReason,
} from "./constants";

/**
 * Cells that move together. `kinds[i]` is what `cells[i]` is made of. Cells are in increasing
 * order; a cell is `y * width + x`.
 */
export interface JellyCrewPiece {
  readonly cells: readonly number[];
  readonly kinds: readonly JellyCrewKind[];
}

/**
 * Where everything is: the cell of each seat's character, and the pieces in the order of their
 * first cell, so that two equal boards are equal data (the canonical form `settle` returns).
 */
export interface JellyCrewBoard {
  readonly chars: readonly number[];
  readonly pieces: readonly JellyCrewPiece[];
}

/** What a mold asks for. */
export type JellyCrewMoldKind = JellyCrewKind;

/**
 * One map for one number of players: what never moves, where everything starts, and the rounds
 * the team has. Looked up from the state's `map` and `playerCount`, never stored in it.
 */
export interface JellyCrewLayout {
  readonly map: JellyCrewMapId;
  readonly playerCount: number;
  readonly width: number;
  readonly height: number;
  readonly walls: ReadonlySet<number>;
  readonly plates: ReadonlyMap<number, JellyCrewGroup>;
  readonly doors: ReadonlyMap<number, JellyCrewGroup>;
  readonly molds: ReadonlyMap<number, JellyCrewMoldKind>;
  readonly start: JellyCrewBoard;
  readonly rounds: number;
}

/** How many mold cells hold the kind they ask for, of how many. */
export interface JellyCrewMolds {
  readonly fitted: number;
  readonly total: number;
}

/**
 * What the move just played did, for what is said and shown (the board itself is the truth): who
 * played it, the kinds of every piece pushed, the groups whose doors opened or closed, and the
 * molds when their count changed.
 */
export interface JellyCrewNews {
  readonly seat: PlayerIndex;
  readonly move: JellyCrewMove;
  readonly pushed: readonly JellyCrewKind[];
  readonly opened: readonly JellyCrewGroup[];
  readonly closed: readonly JellyCrewGroup[];
  /** The molds after the move, when it changed how many fit; `null` otherwise. */
  readonly molds: JellyCrewMolds | null;
}

/** The cells a character walked through in the latest turn that had steps, from where it began. */
export interface JellyCrewTrail {
  readonly seat: PlayerIndex;
  readonly cells: readonly number[];
}

export interface JellyCrewState {
  readonly map: JellyCrewMapId;
  readonly playerCount: number;
  readonly board: JellyCrewBoard;
  /** The seat to move. */
  readonly turn: PlayerIndex;
  /** Steps taken in this turn, 0 to 5. */
  readonly taken: number;
  /** Steps taken back in this turn, 0 to 5. */
  readonly backs: number;
  /** Turns over in the whole game. */
  readonly turnsDone: number;
  /** Steps the team took in the whole game, less those taken back; kept through a reset. */
  readonly steps: number;
  /** The board before each step of this turn, the latest last: what a step back returns to. */
  readonly turnBoards: readonly JellyCrewBoard[];
  readonly trail: JellyCrewTrail | null;
  readonly last: JellyCrewNews | null;
  readonly result: JellyCrewReason | null;
}

export interface JellyCrewOptions {
  readonly map: JellyCrewMapId;
}
