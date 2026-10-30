import { ENGINE_ERROR, err, ok, type Result } from "./errors";
import { isPlainObject } from "./guards";
import { activeEntries, currentState, replayEntry, type Session, startSession } from "./session";
import type { GameDefinition, GameId, HistoryEntry } from "./types";

export const RECORD_VERSION = 1;

/**
 * A game as a list of moves, for saving, reconnecting and replaying. It holds the outcomes already
 * locked into each move but nothing about the random generator, so it is safe to send to a client.
 */
export interface GameRecord<Move = unknown, Outcome = unknown, Options = unknown> {
  readonly version: typeof RECORD_VERSION;
  readonly gameId: GameId;
  readonly playerCount: number;
  readonly options: Options;
  /** Only the moves in effect; undone moves are not recorded. */
  readonly entries: readonly HistoryEntry<Move, Outcome>[];
}

export function toRecord<State, Move, Outcome, Options>(
  session: Session<State, Move, Outcome, Options>,
): GameRecord<Move, Outcome, Options> {
  return {
    version: RECORD_VERSION,
    gameId: session.gameId,
    playerCount: session.playerCount,
    options: session.options,
    entries: activeEntries(session),
  };
}

/**
 * Rebuilds a session from a record that came from outside (IndexedDB, the network, Redis), checking
 * every part of it. Never throws: anything the rules choke on becomes `corrupt-record`, and so does
 * data that throws when read (a getter, a Proxy), which only code in the same process can pass.
 */
export function fromRecord<
  State,
  Move,
  Outcome = never,
  Options extends object = Record<string, never>,
>(
  game: GameDefinition<State, Move, Outcome, Options>,
  raw: unknown,
): Result<Session<State, Move, Outcome, Options>> {
  try {
    return rebuild(game, raw);
  } catch {
    return err(ENGINE_ERROR.CorruptRecord);
  }
}

function rebuild<State, Move, Outcome, Options extends object>(
  game: GameDefinition<State, Move, Outcome, Options>,
  raw: unknown,
): Result<Session<State, Move, Outcome, Options>> {
  if (!isPlainObject(raw) || typeof raw.version !== "number") {
    return err(ENGINE_ERROR.CorruptRecord);
  }
  if (raw.version !== RECORD_VERSION) return err(ENGINE_ERROR.UnsupportedRecordVersion);
  if (typeof raw.gameId !== "string" || !Array.isArray(raw.entries)) {
    return err(ENGINE_ERROR.CorruptRecord);
  }
  if (raw.gameId !== game.id) return err(ENGINE_ERROR.GameMismatch);
  const rawEntries: readonly unknown[] = raw.entries;

  const started = startSession(game, raw.playerCount, raw.options);
  if (!started.ok) return err(ENGINE_ERROR.CorruptRecord);

  // Grown in place and wrapped in a session once: copying the history for every entry made a
  // rebuild quadratic, so one long record (40 000 entries took 12 s) could tie up the server.
  let state = currentState(started.value);
  const states: State[] = [state];
  const entries: HistoryEntry<Move, Outcome>[] = [];
  for (const rawEntry of rawEntries) {
    const stepped = replayEntry(game, state, rawEntry);
    if (!stepped.ok) return err(ENGINE_ERROR.CorruptRecord);
    state = stepped.value.state;
    entries.push(stepped.value.entry);
    states.push(state);
  }
  return ok({ ...started.value, states, entries, cursor: entries.length });
}
