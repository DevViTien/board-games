import {
  canRedo,
  canUndo,
  createSession,
  currentState,
  fromRecord,
  type GameDefinition,
  lastEntry,
  playMove,
  redo,
  type Rng,
  type Session,
  sessionResult,
  toRecord,
  undo,
} from "@board-games/engine";

import type { PlaySnapshot, SavedGameStore, Transport, TransportEvent } from "./types";

export interface LocalTransportOptions<State, Move, Outcome, Options extends object> {
  readonly definition: GameDefinition<State, Move, Outcome, Options>;
  /** Keeps the game in progress between visits. */
  readonly store: SavedGameStore;
  /** Draws random outcomes (dice) for every move. */
  readonly rng: Rng;
}

const LOADING = { status: "loading" } as const;

/**
 * Same-device play: every seat is on this device and moves go straight to the engine. It restores
 * the saved game on creation and saves after every change, which keeps autosave out of the play
 * screen (and out of online games, which use another transport).
 */
// `Outcome` defaults to `never` as in the engine: a game without randomness gives nothing to infer
// it from, and the fallback `unknown` would not match its UI's `GameUI<State, Move>`.
export function createLocalTransport<
  State,
  Move,
  Outcome = never,
  Options extends object = Record<string, never>,
>({
  definition,
  store,
  rng,
}: LocalTransportOptions<State, Move, Outcome, Options>): Transport<State, Move, Outcome> {
  type GameSession = Session<State, Move, Outcome, Options>;

  let session: GameSession | null = null;
  let snapshot: PlaySnapshot<State, Move, Outcome> = LOADING;
  let disposed = false;
  // Cleared when the saved game could not be read: it may still be there (a passing storage
  // error, or a game saved by a newer version of the app), and this session must not overwrite it.
  let mayWrite = true;
  const listeners = new Set<(event: TransportEvent) => void>();

  function emit(event: TransportEvent): void {
    if (disposed) return;
    for (const listener of listeners) listener(event);
  }

  function newSession(): GameSession {
    // Choosing the number of players and rule options comes with the first game that needs it (M6).
    const created = createSession(definition, { playerCount: definition.meta.players.min });
    if (!created.ok) throw new Error(`Cannot start ${definition.id}: ${created.error}`);
    return created.value;
  }

  function show(next: GameSession): void {
    session = next;
    const state = currentState(next);
    const result = sessionResult(definition, next);
    snapshot = {
      status: "ready",
      state,
      legalMoves: result === null ? definition.legalMoves(state) : [],
      currentPlayer: definition.currentPlayer(state),
      result,
      lastEntry: lastEntry(next),
      moveCount: next.cursor,
      canUndo: canUndo(next),
      canRedo: canRedo(next),
      // Every seat is on this device, so someone here may move until the game ends.
      canMove: result === null,
      viewer: null,
    };
    emit({ type: "changed" });
  }

  function persist(next: GameSession): void {
    if (!mayWrite) return;
    // A finished game or an empty board is not worth resuming. Storage errors (private mode,
    // blocked storage) must not stop the game: it simply is not saved. The move is already on
    // screen, so a store that throws instead of rejecting must not break the click either.
    try {
      const saved =
        next.cursor === 0 || sessionResult(definition, next) !== null
          ? store.clear(definition.id)
          : store.save(definition.id, toRecord(next));
      saved.catch(() => undefined);
    } catch {
      // Same as a rejected write.
    }
  }

  function commit(next: GameSession): void {
    show(next);
    persist(next);
  }

  async function restore(): Promise<GameSession | undefined> {
    let raw: unknown;
    try {
      raw = await store.load(definition.id);
    } catch {
      // Storage unavailable, or a game this version cannot read but must keep: play a new game
      // without saving it.
      mayWrite = false;
      return undefined;
    }
    if (raw === undefined) return undefined;
    const rebuilt = fromRecord(definition, raw);
    // A finished game is never kept (it is only stored if clearing it failed), so it is dropped
    // like a corrupt one or one from an older format, and a new game starts.
    if (rebuilt.ok && sessionResult(definition, rebuilt.value) === null) return rebuilt.value;
    try {
      await store.clear(definition.id);
    } catch {
      // Not dropped this time; it is replaced or dropped again on the next visit.
    }
    return undefined;
  }

  void restore().then((restored) => {
    if (!disposed) show(restored ?? newSession());
  });

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    submit: (move) => {
      if (disposed || session === null) return;
      const played = playMove(definition, session, move, rng);
      if (played.ok) commit(played.value);
      else emit({ type: "rejected", code: played.error });
    },
    requestUndo: () => {
      if (disposed || session === null) return;
      const undone = undo(session);
      if (undone.ok) commit(undone.value);
      else emit({ type: "rejected", code: undone.error });
    },
    requestRedo: () => {
      if (disposed || session === null) return;
      const redone = redo(session);
      if (redone.ok) commit(redone.value);
      else emit({ type: "rejected", code: redone.error });
    },
    requestNewGame: () => {
      if (!disposed && session !== null) commit(newSession());
    },
    // A disposed transport is dead: a late click from an unmounted screen (or React's development
    // double mount) must neither change the game nor write over what the live transport saves.
    dispose: () => {
      disposed = true;
      listeners.clear();
    },
  };
}
