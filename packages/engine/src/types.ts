import type { EndingReason, GameCategory } from "./constants";

/** Kebab-case game identifier. `packages/games` narrows it to the ids it registers. */
export type GameId = string;

/** A seat at the table, `0..playerCount - 1`. The app decides how to name it (X/O, a colour…). */
export type PlayerIndex = number;

export interface GameMeta {
  readonly players: { readonly min: number; readonly max: number };
  readonly category: GameCategory;
  readonly durationMinutes: number;
  readonly supportsAI: boolean;
}

/** `reason` is a code chosen by the game (e.g. "checkmate"); the app translates it. */
export type GameResult =
  | { readonly kind: "win"; readonly winners: readonly PlayerIndex[]; readonly reason?: string }
  | { readonly kind: "draw"; readonly reason?: string };

/**
 * A game ended outside its rules: `player` resigned or abandoned it, and every other seat wins with
 * `reason`. Plain data, kept in the session and in its record.
 */
export interface GameEnding {
  readonly reason: EndingReason;
  readonly player: PlayerIndex;
}

/** One possible random outcome of a move; `weight` is a positive integer. */
export interface WeightedOutcome<Outcome> {
  readonly outcome: Outcome;
  readonly weight: number;
}

/** A move as played, with the random outcome it was locked to (if the move had one). */
export interface HistoryEntry<Move, Outcome> {
  readonly move: Move;
  readonly outcome?: Outcome;
}

export interface Rng {
  /** Integer in `[min, max]`, both inclusive. */
  nextInt(this: void, min: number, max: number): number;
  /** Number in `[0, 1)`. */
  nextFloat(this: void): number;
}

/** A value a rule option can take; only these can be listed for a player to choose. */
export type OptionValue = string | number | boolean;

/**
 * For each rule option: the values a player may choose, in display order. Values only, no
 * display text: the app translates them. The order of the keys is the order of the groups.
 */
export type OptionChoices<Options extends object> = {
  readonly [K in keyof Options]: Options[K] extends OptionValue ? readonly Options[K][] : never;
};

export interface SetupContext<Options> {
  readonly playerCount: number;
  readonly options: Options;
}

/**
 * The rules of one game, as pure functions over plain-data state.
 *
 * Methods use method syntax so every game is assignable to `AnyGameDefinition`, and declare
 * `this: void` so they can be passed around unbound (`legalMoves.map(game.moveKey)`).
 */
export interface GameDefinition<
  State,
  Move,
  Outcome = never,
  Options extends object = Record<string, never>,
> {
  readonly id: GameId;
  readonly meta: GameMeta;
  readonly defaultOptions: Options;
  /**
   * The values a player may choose for each rule option, read without starting a game (the setup
   * screen). Absent: the game offers no choice. Code shared between games reads it through
   * `listOptionChoices`; the contract suite's `option-choices` checks it.
   */
  readonly optionChoices?: OptionChoices<Options>;
  /** Validates options received from outside; `null` rejects them. Without it, only `{}` is accepted. */
  parseOptions?(this: void, raw: unknown): Options | null;
  /** Must be deterministic: any randomness at setup is decided by the caller and passed in `options`. */
  setup(this: void, context: SetupContext<Options>): State;
  currentPlayer(this: void, state: State): PlayerIndex;
  legalMoves(this: void, state: State): readonly Move[];
  /** Possible random outcomes of a legal move; empty (or absent) when the move is not random. */
  outcomes?(this: void, state: State, move: Move): readonly WeightedOutcome<Outcome>[];
  /** Must be deterministic and must not modify `state`. */
  applyMove(this: void, state: State, move: Move, outcome?: Outcome): State;
  result(this: void, state: State): GameResult | null;
  /**
   * How good an unfinished `state` looks for `player`, higher is better; required when
   * `meta.supportsAI`. Scale: a finite number, preferably an integer, with an absolute value below
   * 10^8 (the AI clamps anything larger, and wins and losses score far above that). The AI treats
   * any difference as real, so round away differences that are only noise.
   */
  evaluate?(this: void, state: State, player: PlayerIndex): number;
  /**
   * The moves the AI considers in `state`, best first: for games whose boards are too large to
   * search every legal move (Gomoku). While the game is unfinished it MUST be a non-empty subset of
   * `legalMoves(state)`, without duplicates, deterministic and leaving `state` untouched (the
   * contract suite's `candidate-moves` checks it). It must also keep every move that wins at once
   * and every move that stops the opponent winning at once, or Medium and Hard lose their
   * guarantees. Absent: the AI considers every legal move.
   */
  candidateMoves?(this: void, state: State): readonly Move[];
  /** Identity of a move; defaults to JSON with sorted keys. */
  moveKey?(this: void, move: Move): string;
}

export type AnyGameDefinition = GameDefinition<unknown, unknown, unknown, object>;
