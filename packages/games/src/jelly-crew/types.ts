import type { PlayerIndex } from "@board-games/engine";

import type {
  JellyCrewAction,
  JellyCrewGroup,
  JellyCrewKind,
  JellyCrewMapId,
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
 * One map for one number of players: what never moves and where everything starts. Looked up from the state's `map` and `playerCount`, never stored in it.
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
  readonly action: JellyCrewAction;
  readonly pushed: readonly JellyCrewKind[];
  readonly opened: readonly JellyCrewGroup[];
  readonly closed: readonly JellyCrewGroup[];
  /** The molds after the move, when it changed how many fit; `null` otherwise. */
  readonly molds: JellyCrewMolds | null;
}

export interface JellyCrewState {
  readonly map: JellyCrewMapId;
  readonly playerCount: number;
  readonly board: JellyCrewBoard;
  /** Steps the whole team took, kept through a reset. */
  readonly steps: number;
  /** Moves played, resets included: what the safety limit counts. */
  readonly moves: number;
  readonly last: JellyCrewNews | null;
  readonly result: JellyCrewReason | null;
}

export interface JellyCrewOptions {
  readonly map: JellyCrewMapId;
}
