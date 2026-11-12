import { ENDING_REASON } from "./constants";
import { ENGINE_ERROR, err, ok, type Result } from "./errors";
import { isPlainObject } from "./guards";
import { moveKeyOf, stableStringify } from "./move-key";
import { parseGameOptions } from "./options";
import { checkOutcomeWeights } from "./outcome-weights";
import type {
  GameDefinition,
  GameEnding,
  GameId,
  GameResult,
  HistoryEntry,
  Rng,
  WeightedOutcome,
} from "./types";

/**
 * A game in progress, as plain data: safe to keep in app state or send to a Worker.
 *
 * A session is trusted: only the functions of this module build one, and none of them re-checks a
 * session it is given. Anything saved or received from outside travels as a `GameRecord`
 * (`toRecord` / `fromRecord`), which is checked entry by entry.
 */
export interface Session<State = unknown, Move = unknown, Outcome = unknown, Options = unknown> {
  readonly gameId: GameId;
  readonly playerCount: number;
  readonly options: Options;
  /** `states[i]` is the state after `i` entries, so there is always one more state than entries. */
  readonly states: readonly State[];
  /** Every move played, including the undone ones after `cursor`; see `activeEntries`. */
  readonly entries: readonly HistoryEntry<Move, Outcome>[];
  /** How many entries are in effect. */
  readonly cursor: number;
  /**
   * The game ended outside its rules after the last entry (`concede`). It ends the game only once
   * every entry is shown (`cursor === entries.length`); nothing can be played or undone after it.
   */
  readonly ending?: GameEnding;
}

export interface SessionInit<Options> {
  readonly playerCount: number;
  /** Defaults to the game's `defaultOptions`; validated like options from outside. */
  readonly options?: Options;
}

// The public functions default `Outcome` to `never`: a game without `outcomes` gives nothing to
// infer it from, and the fallback `unknown` would stop its history matching `HistoryEntry<Move>`.

export function createSession<
  State,
  Move,
  Outcome = never,
  Options extends object = Record<string, never>,
>(
  game: GameDefinition<State, Move, Outcome, Options>,
  init: SessionInit<Options>,
): Result<Session<State, Move, Outcome, Options>> {
  return startSession(game, init.playerCount, init.options ?? game.defaultOptions);
}

/** Like `createSession`, for a player count and options that come from untrusted data. */
export function startSession<State, Move, Outcome, Options extends object>(
  game: GameDefinition<State, Move, Outcome, Options>,
  playerCount: unknown,
  rawOptions: unknown,
): Result<Session<State, Move, Outcome, Options>> {
  const { min, max } = game.meta.players;
  if (
    typeof playerCount !== "number" ||
    !Number.isInteger(playerCount) ||
    playerCount < min ||
    playerCount > max
  ) {
    return err(ENGINE_ERROR.InvalidPlayerCount);
  }
  const options = parseGameOptions(game, rawOptions);
  if (!options.ok) return options;

  return ok({
    gameId: game.id,
    playerCount,
    options: options.value,
    states: [game.setup({ playerCount, options: options.value })],
    entries: [],
    cursor: 0,
  });
}

export function currentState<State>(session: Session<State>): State {
  const state = session.states[session.cursor];
  if (state === undefined) throw new Error(`Session has no state at cursor ${session.cursor}`);
  return state;
}

/** The moves in effect, oldest first: `entries` without the undone ones. */
export function activeEntries<Move, Outcome>(
  session: Session<unknown, Move, Outcome>,
): readonly HistoryEntry<Move, Outcome>[] {
  return session.entries.slice(0, session.cursor);
}

/** The move that led to the current state, or `null` before the first move (or after undoing it). */
export function lastEntry<Move, Outcome>(
  session: Session<unknown, Move, Outcome>,
): HistoryEntry<Move, Outcome> | null {
  return session.entries[session.cursor - 1] ?? null;
}

/**
 * The result of the current state; the caller pairs the session with its own game. A game ended by
 * `concede` is won by every other seat, once the session shows every entry; a cooperative game
 * ended so is a draw, nobody winning, with the ending's reason.
 */
export function sessionResult<
  State,
  Move,
  Outcome = never,
  Options extends object = Record<string, never>,
>(
  game: GameDefinition<State, Move, Outcome, Options>,
  session: Session<State, Move, Outcome, Options>,
): GameResult | null {
  const { ending } = session;
  if (ending !== undefined && session.cursor === session.entries.length) {
    if (game.meta.cooperative === true) return { kind: "draw", reason: ending.reason };
    const winners = Array.from({ length: session.playerCount }, (_, seat) => seat).filter(
      (seat) => seat !== ending.player,
    );
    return { kind: "win", winners, reason: ending.reason };
  }
  return game.result(currentState(session));
}

/** Whether `raw` (data from outside) is an ending a game of `playerCount` seats can have. */
export function isGameEnding(raw: unknown, playerCount: number): raw is GameEnding {
  if (!isPlainObject(raw)) return false;
  const { reason, player } = raw;
  return (
    Object.values<unknown>(ENDING_REASON).includes(reason) &&
    typeof player === "number" &&
    Number.isInteger(player) &&
    player >= 0 &&
    player < playerCount
  );
}

/**
 * Ends an unfinished game outside its rules: `ending.player` resigns or abandons it and every other
 * seat wins (a cooperative game stops, nobody winning: `sessionResult`). Undone moves are dropped first, as for a new move; no move is added. A game that has a
 * result already is `game-over`; a seat outside the game is `illegal-move`. Never throws.
 */
export function concede<
  State,
  Move,
  Outcome = never,
  Options extends object = Record<string, never>,
>(
  game: GameDefinition<State, Move, Outcome, Options>,
  session: Session<State, Move, Outcome, Options>,
  ending: GameEnding,
): Result<Session<State, Move, Outcome, Options>> {
  if (session.gameId !== game.id) return err(ENGINE_ERROR.GameMismatch);
  if (session.ending !== undefined || game.result(currentState(session)) !== null) {
    return err(ENGINE_ERROR.GameOver);
  }
  if (!isGameEnding(ending, session.playerCount)) return err(ENGINE_ERROR.IllegalMove);
  return ok({
    ...session,
    entries: activeEntries(session),
    states: session.states.slice(0, session.cursor + 1),
    ending: { reason: ending.reason, player: ending.player },
  });
}

/** Plays `move` (untrusted, e.g. from the network); a random move's outcome is drawn from `rng`. */
export function playMove<
  State,
  Move,
  Outcome = never,
  Options extends object = Record<string, never>,
>(
  game: GameDefinition<State, Move, Outcome, Options>,
  session: Session<State, Move, Outcome, Options>,
  move: unknown,
  rng: Rng,
): Result<Session<State, Move, Outcome, Options>> {
  if (session.gameId !== game.id) return err(ENGINE_ERROR.GameMismatch);
  if (session.ending !== undefined) return err(ENGINE_ERROR.GameOver);
  const stepped = step(game, currentState(session), move, (legalMove, choices) =>
    choices.length === 0
      ? { move: legalMove }
      : { move: legalMove, outcome: pickOutcome(choices, rng) },
  );
  return stepped.ok ? ok(appendEntry(session, stepped.value)) : stepped;
}

/**
 * Applies an entry played elsewhere (`{ move, outcome? }`, e.g. broadcast by the online server)
 * with the outcome locked into it, instead of drawing a new one. The entry is untrusted and checked
 * like an entry of a record; one the rules refuse or choke on is an `illegal-move`. Never throws.
 */
export function applyEntry<
  State,
  Move,
  Outcome = never,
  Options extends object = Record<string, never>,
>(
  game: GameDefinition<State, Move, Outcome, Options>,
  session: Session<State, Move, Outcome, Options>,
  rawEntry: unknown,
): Result<Session<State, Move, Outcome, Options>> {
  if (session.gameId !== game.id) return err(ENGINE_ERROR.GameMismatch);
  if (session.ending !== undefined) return err(ENGINE_ERROR.GameOver);
  try {
    const stepped = replayEntry(game, currentState(session), rawEntry);
    return stepped.ok ? ok(appendEntry(session, stepped.value)) : stepped;
  } catch {
    return err(ENGINE_ERROR.IllegalMove);
  }
}

/** A game ended by `concede` can be neither undone nor redone. */
export function canUndo(session: Session): boolean {
  return session.ending === undefined && session.cursor > 0;
}

export function canRedo(session: Session): boolean {
  return session.ending === undefined && session.cursor < session.entries.length;
}

export function undo<S extends Session>(session: S): Result<S> {
  if (session.ending !== undefined) return err(ENGINE_ERROR.GameOver);
  if (!canUndo(session)) return err(ENGINE_ERROR.NothingToUndo);
  return ok({ ...session, cursor: session.cursor - 1 });
}

export function redo<S extends Session>(session: S): Result<S> {
  if (session.ending !== undefined) return err(ENGINE_ERROR.GameOver);
  if (!canRedo(session)) return err(ENGINE_ERROR.NothingToRedo);
  return ok({ ...session, cursor: session.cursor + 1 });
}

/** One move applied to a state: the entry to record and the state it leads to. */
interface Step<State, Move, Outcome> {
  readonly entry: HistoryEntry<Move, Outcome>;
  readonly state: State;
}

/**
 * Checks an entry from outside (a record, the network) against the rules: the move must be legal,
 * and the stored outcome present exactly when the move is random, and one of its outcomes. May
 * throw when the data or the rules are broken; callers turn that into an error code.
 */
export function replayEntry<State, Move, Outcome, Options extends object>(
  game: GameDefinition<State, Move, Outcome, Options>,
  state: State,
  raw: unknown,
): Result<Step<State, Move, Outcome>> {
  if (!isPlainObject(raw) || !("move" in raw)) return err(ENGINE_ERROR.IllegalMove);
  return step(game, state, raw.move, (move, choices) => {
    if (choices.length === 0) return "outcome" in raw ? undefined : { move };
    if (!("outcome" in raw)) return undefined;
    // Keep the rules' own outcome object, as for moves: the stored one is untrusted data.
    const key = stableStringify(raw.outcome);
    const choice = choices.find((candidate) => stableStringify(candidate.outcome) === key);
    return choice === undefined ? undefined : { move, outcome: choice.outcome };
  });
}

/**
 * The steps shared by playing a move and applying a received entry. Only where the outcome comes
 * from differs: `lock` returns the entry to record, or `undefined` when no outcome fits.
 */
function step<State, Move, Outcome, Options extends object>(
  game: GameDefinition<State, Move, Outcome, Options>,
  state: State,
  candidate: unknown,
  lock: (
    move: Move,
    choices: readonly WeightedOutcome<Outcome>[],
  ) => HistoryEntry<Move, Outcome> | undefined,
): Result<Step<State, Move, Outcome>> {
  if (game.result(state) !== null) return err(ENGINE_ERROR.GameOver);
  const move = findLegalMove(game, state, candidate);
  if (move === undefined) return err(ENGINE_ERROR.IllegalMove);

  const choices = game.outcomes?.(state, move) ?? [];
  checkOutcomeWeights(choices);
  const entry = lock(move, choices);
  if (entry === undefined) return err(ENGINE_ERROR.IllegalMove);
  return ok({ entry, state: game.applyMove(state, move, entry.outcome) });
}

/**
 * The legal move whose key matches `candidate`, or `undefined`. Returns the rules' own move object,
 * so extra fields in data received from outside never reach `applyMove` or the history.
 */
function findLegalMove<State, Move, Outcome, Options extends object>(
  game: GameDefinition<State, Move, Outcome, Options>,
  state: State,
  candidate: unknown,
): Move | undefined {
  // The candidate is untrusted: a custom moveKey may throw on it, which simply means "no match".
  const keyOf = (move: unknown): string => moveKeyOf(game, move as Move);
  let key: string;
  try {
    key = keyOf(candidate);
  } catch {
    return undefined;
  }
  return game.legalMoves(state).find((move) => keyOf(move) === key);
}

/** Records a step after the entries in effect, dropping any undone ones. */
function appendEntry<State, Move, Outcome, Options>(
  session: Session<State, Move, Outcome, Options>,
  { entry, state }: Step<State, Move, Outcome>,
): Session<State, Move, Outcome, Options> {
  return {
    ...session,
    entries: [...activeEntries(session), entry],
    states: [...session.states.slice(0, session.cursor + 1), state],
    cursor: session.cursor + 1,
  };
}

/** `step` has checked the weights, so `total` is a positive integer. */
function pickOutcome<Outcome>(choices: readonly WeightedOutcome<Outcome>[], rng: Rng): Outcome {
  const total = choices.reduce((sum, choice) => sum + choice.weight, 0);
  const roll = rng.nextInt(0, total - 1);
  let remaining = roll;
  const picked =
    Number.isInteger(roll) && roll >= 0
      ? choices.find((choice) => {
          remaining -= choice.weight;
          return remaining < 0;
        })
      : undefined;
  // Only a faulty Rng gets here: the weights are fine but the roll is outside [0, total - 1].
  if (picked === undefined) throw new RangeError(`Rng.nextInt(0, ${total - 1}) returned ${roll}`);
  return picked.outcome;
}
