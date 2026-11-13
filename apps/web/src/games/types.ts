import type { GameDefinition, GameResult, HistoryEntry, PlayerIndex } from "@board-games/engine";
import type { RegisteredGameId } from "@board-games/games";
import { type ComponentType, createElement, Fragment, type ReactNode } from "react";

import type { GameTime } from "@/transport/types";

/** The parts a board draws, for the play screen to place: the board, and its own controls. */
interface BoardParts {
  /** The board itself. */
  readonly board: ReactNode;
  /** Controls of the game beside the board (a die, a roll button, choices), or `null`. */
  readonly controls: ReactNode;
  /**
   * For a game of two seats around the board (Chess): the seat shown above the board and the one
   * below it, as the board is turned now. The play screen then draws a bar for each seat right above
   * and right below the board instead of its players' panel. Without it, the panel as before.
   */
  readonly seatOrder?: readonly [top: PlayerIndex, bottom: PlayerIndex] | undefined;
  /**
   * The board's words about the position (what is selected, a check), above its controls. Apart
   * from them because something over the column may have to show them elsewhere: online, the chat's
   * panel covers them, and says them at its head. Their height, if kept, stays kept meanwhile.
   */
  readonly notes?: ReactNode;
}

/**
 * Places a board's parts on the screen. A board returns `layout({ board, controls })` instead of
 * wrapping them itself, so both parts stay in one component (their state, their focus) while the
 * play screen decides where each goes. Every board MUST call `layout` exactly once, on every render,
 * unconditionally, and return what it gives: the play screen's turn line (`role="status"`), its
 * connection line and its buttons are in that layout, so a board that skips it hides them
 * (checked for every registered game by `features/play/every-game.test.tsx`). The play screen's layout gives its board room as
 * `--board-room` (a length): a board sizes its square as `min(var(--board-room, 100%), <its max>)`.
 */
export type BoardLayout = (parts: BoardParts) => ReactNode;

/** The board, then its controls below it: a board shown on its own (tests). */
export const defaultBoardLayout: BoardLayout = ({ board, notes, controls }) =>
  createElement(Fragment, null, board, notes, controls);

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
  /** Where the board's parts go: the play screen's layout, or `defaultBoardLayout`. */
  readonly layout: BoardLayout;
  /**
   * Why no move may be chosen now, translated, while `disabled` and the game is on ("Waiting for
   * Minh", "Waiting for the connection…", "Sending…"), else `null`: the play screen knows why, so a
   * board can say it on a control of its own (Ludo's roll button) without guessing. Optional.
   */
  readonly lockedReason?: string | null | undefined;
}

/** The part of a game that lives in the app: its board and how its players are named. */
export interface GameUI<State, Move, Outcome = never> {
  readonly Board: ComponentType<BoardProps<State, Move, Outcome>>;
  /**
   * Hook returning the translated name or symbol of a seat (X/O, a colour…). `state` is the game on
   * screen, for a name that depends on it (which colours a game for fewer players uses); a game
   * whose seats are always named the same ignores it.
   */
  readonly usePlayerLabel: () => (player: PlayerIndex, state: State) => string;
  /**
   * Hook returning how a move is read out, as the action it was, to follow the name of who played
   * it in a sentence ("played row 2, column 3", "rolled a 5"): the play screen tells what the AI or
   * the opponent just did with it. `state` is the game's state after that move, for what the move
   * alone does not say (the size of a Gomoku board).
   */
  readonly useMoveLabel: () => (move: Move, state: State) => string;
  /**
   * Optional hook returning a short line about a seat for the players' panel ("2 horses on the
   * track"), with a shorter form for a phone's narrow tile, or `null` for nothing. A game without it
   * shows no such line.
   */
  readonly useSeatSummary?: () => (player: PlayerIndex, state: State) => SeatSummary | null;
  /**
   * Optional hook returning the line under the result on the result card, saying how the game was
   * won ("Three X in row 1"), or `null` for nothing (a draw). A game without it shows no such line.
   * `gameTime` is when the game began and ended, when known (`ReadySnapshot.gameTime`).
   */
  readonly useResultDetail?: () => (
    result: GameResult,
    state: State,
    gameTime: GameTime | null,
  ) => string | null;
  /**
   * Optional hook returning the rule options the game suggests for the next game, given how the
   * game just over ended and the options it was played with ("the next map" after a win), or
   * `null` for none. The play screen offers them on the result card only when they are among the
   * game's choices. A game without it suggests nothing.
   */
  readonly useNextOptions?: () => (result: GameResult, options: unknown) => unknown;
  /**
   * Optional mark of a seat in the players' panel (decorative: the seat's name says it), drawn in
   * a 28 px ring. Without it, the panel draws the seat's symbol (`usePlayerLabel`) in the game's
   * `--game-mark-1` / `--game-mark-2`, which fits a game of two seats named by symbols (X, O).
   */
  readonly SeatMark?: ComponentType<SeatMarkProps<State>>;
}

/** A seat's line in the players' panel: in full, and short for a narrow tile (a phone). */
export interface SeatSummary {
  readonly full: string;
  readonly short: string;
}

/** What a game's own seat mark receives. */
export interface SeatMarkProps<State> {
  readonly player: PlayerIndex;
  readonly state: State;
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

/** What a game's artwork (`games/<id>/Artwork.tsx`) receives: decorative, sized by its caller. */
export interface ArtworkProps {
  readonly className?: string | undefined;
}
