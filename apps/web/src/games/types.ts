import type { GameDefinition, GameResult, HistoryEntry, PlayerIndex } from "@board-games/engine";
import type { RegisteredGameId } from "@board-games/games";
import type { ComponentType } from "react";

/** What every board receives. A board only displays and reports moves; the engine checks them. */
export interface BoardProps<State, Move, Outcome = never> {
  readonly state: State;
  /** Moves the player to move may choose; a board makes only these selectable. */
  readonly legalMoves: readonly Move[];
  readonly onMove: (move: Move) => void;
  /** No move may be chosen now; the play screen passes the snapshot's `!canMove`. */
  readonly disabled: boolean;
  /** For marking a winning line (Gomoku). */
  readonly result: GameResult | null;
  /** The move just played, with its random outcome (last-move marker, dice animation). */
  readonly lastEntry: HistoryEntry<Move, Outcome> | null;
  /** The seat this device plays, to orient the board (Chess, online); `null` on a shared device. */
  readonly viewer: PlayerIndex | null;
}

/** The part of a game that lives in the app: its board and how its players are named. */
export interface GameUI<State, Move, Outcome = never> {
  readonly Board: ComponentType<BoardProps<State, Move, Outcome>>;
  /** Hook returning the translated name or symbol of a seat (X/O, a colour…). */
  readonly usePlayerLabel: () => (player: PlayerIndex) => string;
}

/**
 * Receives a game's rules and UI with their types still paired. Being generic, it cannot mix up
 * one game's board with another game's rules.
 */
type GameEntryVisitor<Result> = <State, Move, Outcome, Options extends object>(
  definition: GameDefinition<State, Move, Outcome, Options>,
  ui: GameUI<State, Move, Outcome>,
) => Result;

/**
 * A registered game with its types closed over: from here on nothing depends on the game's own
 * `State` and `Move`, so entries of different games fit in one registry. `Id` keeps the literal
 * id, so the registry can check that each key loads its own game. `open` hands rules and UI to the
 * caller instead of rendering them, which keeps the play screen (and, from M2, the choice of
 * transport) in `features/play` and out of `games/`.
 */
export interface GameEntry<Id extends string = RegisteredGameId> {
  readonly id: Id;
  readonly open: <Result>(visitor: GameEntryVisitor<Result>) => Result;
}
