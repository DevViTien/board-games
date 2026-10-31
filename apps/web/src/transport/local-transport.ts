import {
  type AiLevel,
  canRedo,
  canUndo,
  createSession,
  currentState,
  fromRecord,
  type GameDefinition,
  lastEntry,
  type PlayerIndex,
  playMove,
  redo,
  type Rng,
  type Session,
  sessionResult,
  toRecord,
  undo,
} from "@board-games/engine";

import { AI_MIN_DELAY_MS, AI_TIME_LIMIT_MS } from "./ai-timing";
import { withStoreTimeout } from "./store-timeout";
import type {
  AiPlayer,
  AiSetup,
  LoadedGame,
  LocalSetup,
  ModeSettings,
  PlaySetup,
  PlaySnapshot,
  SavedGameStore,
  SaveSlot,
  SeatController,
  SlotMode,
  Transport,
  TransportEvent,
} from "./types";

/**
 * Which saved game the transport plays, and how to set up a new one. `start` begins a new game in
 * place of the saved one (the setup screen's "Start"); without it the saved game is resumed.
 */
type ModeOptions =
  | {
      /** Every seat is a person on this device. */
      readonly mode?: "local" | undefined;
      readonly start?: LocalSetup | undefined;
    }
  | {
      /** The player against the AI, each AI seat at its level. */
      readonly mode: "ai";
      readonly start?: AiSetup | undefined;
      /** How to set up a game when none is saved: the last choices made for this game. */
      readonly fallback: AiSetup;
      /** Chooses the AI's moves; the caller creates and disposes it. */
      readonly ai: AiPlayer;
    };

export type LocalTransportOptions<State, Move, Outcome, Options extends object> = {
  readonly definition: GameDefinition<State, Move, Outcome, Options>;
  /** Keeps the game in progress between visits. */
  readonly store: SavedGameStore;
  /** Draws random outcomes (dice), who moves first when random, and the AI's seeds. */
  readonly rng: Rng;
} & ModeOptions;

const LOADING = { status: "loading" } as const;
const HUMAN: SeatController = { kind: "human" };
const MAX_SEED = 2 ** 32 - 1;

/**
 * Play on this device, seat by seat: each seat is a person here or the AI. Moves go straight to the
 * engine, and the transport alone decides whose turn it is to act, so the play screen only reads
 * snapshots. It restores the saved game on creation and saves after every change, which keeps
 * autosave out of the play screen (and out of online games, which use another transport).
 */
// `Outcome` defaults to `never` as in the engine: a game without randomness gives nothing to infer
// it from, and the fallback `unknown` would not match its UI's `GameUI<State, Move>`.
export function createLocalTransport<
  State,
  Move,
  Outcome = never,
  Options extends object = Record<string, never>,
>(options: LocalTransportOptions<State, Move, Outcome, Options>): Transport<State, Move, Outcome> {
  type GameSession = Session<State, Move, Outcome, Options>;
  const { definition, store, rng } = options;
  const mode: SlotMode = options.mode ?? "local";
  const slot: SaveSlot = { gameId: definition.id, mode };
  const ai = options.mode === "ai" ? options.ai : undefined;

  let session: GameSession | null = null;
  let settings: ModeSettings = { kind: "local" };
  let seats: readonly SeatController[] = [];
  let snapshot: PlaySnapshot<State, Move, Outcome> = LOADING;
  let disposed = false;
  // Cleared when the saved game could not be read: it may still be there (a passing storage
  // error, or a game saved by a newer version of the app), and this session must not overwrite it.
  let mayWrite = true;
  // Raised whenever the game on screen changes and on dispose, so an AI move chosen for an earlier
  // position is dropped, even one that has arrived and only waits to be shown.
  let aiRequest = 0;
  let aiTimer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<(event: TransportEvent) => void>();

  function emit(event: TransportEvent): void {
    if (disposed) return;
    for (const listener of listeners) listener(event);
  }

  function isHuman(player: PlayerIndex): boolean {
    return seats[player]?.kind === "human";
  }

  /** Whether a person here made one of the moves in effect (a move is made by the player to move). */
  function humanHasMoved(next: GameSession): boolean {
    return next.states
      .slice(0, next.cursor)
      .some((state) => isHuman(definition.currentPlayer(state)));
  }

  /** The seat that played the last move in effect: the player to move before it. */
  function lastMover(next: GameSession): PlayerIndex | null {
    const before = next.cursor > 0 ? next.states[next.cursor - 1] : undefined;
    return before === undefined ? null : definition.currentPlayer(before);
  }

  function newSession(): GameSession {
    // Choosing the number of players and rule options comes with the first game that needs it (M6).
    const created = createSession(definition, { playerCount: definition.meta.players.min });
    if (!created.ok) throw new Error(`Cannot start ${definition.id}: ${created.error}`);
    return created.value;
  }

  /** Seats a new game set up like `setup`, drawing who moves first when it is random. */
  function seat(setup: PlaySetup, next: GameSession): void {
    const { playerCount } = next;
    if (setup.mode === "local") {
      settings = { kind: "local" };
      seats = Array.from({ length: playerCount }, () => HUMAN);
      return;
    }
    const firstSeat = definition.currentPlayer(currentState(next));
    const humanFirst =
      setup.first === "human" || (setup.first === "random" && rng.nextInt(0, 1) === 0);
    const humanSeat = humanFirst ? firstSeat : (firstSeat + 1) % playerCount;
    seats = Array.from({ length: playerCount }, (_, index) =>
      index === humanSeat ? HUMAN : { kind: "ai", level: setup.level },
    );
    settings = { kind: "ai", first: setup.first, seats };
  }

  function cancelAiTurn(): void {
    aiRequest += 1;
    if (aiTimer !== undefined) {
      clearTimeout(aiTimer);
      aiTimer = undefined;
    }
  }

  function show(next: GameSession): void {
    cancelAiTurn();
    session = next;
    const state = currentState(next);
    const result = sessionResult(definition, next);
    const currentPlayer = definition.currentPlayer(state);
    const turn = seats[currentPlayer];
    const waitingFor = result === null && turn?.kind === "ai" ? "ai" : null;
    const humanSeats = seats.flatMap((controller, index) =>
      controller.kind === "human" ? [index] : [],
    );
    const humanMoved = humanHasMoved(next);
    snapshot = {
      status: "ready",
      state,
      legalMoves: result === null ? definition.legalMoves(state) : [],
      currentPlayer,
      result,
      lastEntry: lastEntry(next),
      lastMover: lastMover(next),
      moveCount: next.cursor,
      canUndo: humanMoved,
      canRedo: canRedo(next),
      canMove: result === null && isHuman(currentPlayer) && waitingFor === null,
      viewer: humanSeats.length === 1 ? (humanSeats[0] ?? null) : null,
      seats,
      waitingFor,
      inProgress: result === null && humanMoved,
    };
    emit({ type: "changed" });
    // A listener may already have changed the game, and started the AI's turn for that one.
    if (turn?.kind === "ai" && waitingFor === "ai" && session === next && !disposed) {
      startAiTurn(next, turn.level);
    }
  }

  /**
   * Asks the AI for a move and plays it once it has arrived and the minimum delay has passed,
   * unless the game on screen changed meanwhile. A failure never leaves the game stuck on the AI's
   * turn: a random legal move is played instead.
   */
  function startAiTurn(position: GameSession, level: AiLevel): void {
    if (ai === undefined) return;
    const request = aiRequest;
    let chosen: { readonly move: unknown } | null | undefined;
    let delayed = false;

    function finish(): void {
      if (chosen === undefined || !delayed) return;
      // Checked right before the move: undo, redo, a new game or dispose may have come in between.
      if (request !== aiRequest || disposed || session !== position) return;
      playAiMove(position, chosen);
    }

    aiTimer = setTimeout(() => {
      aiTimer = undefined;
      delayed = true;
      finish();
    }, AI_MIN_DELAY_MS);
    // Wrapped so that an AI player throwing instead of rejecting fails the same way.
    new Promise<unknown>((resolve) => {
      resolve(
        ai.chooseMove({
          gameId: definition.id,
          state: currentState(position),
          level,
          timeLimitMs: AI_TIME_LIMIT_MS[level],
          seed: rng.nextInt(0, MAX_SEED),
        }),
      );
    }).then(
      (move) => {
        chosen = { move };
        finish();
      },
      () => {
        chosen = null;
        finish();
      },
    );
  }

  function playAiMove(position: GameSession, chosen: { readonly move: unknown } | null): void {
    const played = chosen === null ? undefined : playMove(definition, position, chosen.move, rng);
    if (played?.ok === true) {
      commit(played.value);
      return;
    }
    // The AI failed or chose a move the rules refuse.
    const legalMoves = definition.legalMoves(currentState(position));
    if (legalMoves.length === 0) return;
    const random = playMove(
      definition,
      position,
      legalMoves[rng.nextInt(0, legalMoves.length - 1)],
      rng,
    );
    if (random.ok) commit(random.value);
  }

  function persist(next: GameSession): void {
    if (!mayWrite) return;
    // A finished game is not worth resuming, nor an empty same-device board; a game against the AI
    // is kept from the start, for its level and seats. Storage errors (private mode, blocked
    // storage) must not stop the game: it simply is not saved. The move is already on screen, so a
    // store that throws instead of rejecting must not break the click either.
    try {
      const saved =
        sessionResult(definition, next) !== null || (mode === "local" && next.cursor === 0)
          ? store.clear(slot)
          : store.save(slot, {
              settings,
              record: toRecord(next),
              inProgress: humanHasMoved(next),
            });
      saved.catch(() => undefined);
    } catch {
      // Same as a rejected write.
    }
  }

  function commit(next: GameSession): void {
    show(next);
    persist(next);
  }

  function start(setup: PlaySetup, save: boolean): void {
    const next = newSession();
    seat(setup, next);
    if (save) commit(next);
    else show(next);
  }

  /**
   * The seats of a saved game, or `undefined` when they do not fit this mode or its record. A game
   * against the AI has exactly one person here and the AI in every other seat: without a person the
   * AI would play itself, and without the AI it would be a same-device game in the wrong slot.
   */
  function savedSeats(
    saved: ModeSettings,
    playerCount: number,
  ): readonly SeatController[] | undefined {
    if (saved.kind !== mode) return undefined;
    if (saved.kind === "local") return Array.from({ length: playerCount }, () => HUMAN);
    const people = saved.seats.filter((controller) => controller.kind === "human").length;
    return saved.seats.length === playerCount && people === 1 && playerCount > 1
      ? saved.seats
      : undefined;
  }

  interface Restored {
    readonly session: GameSession;
    readonly settings: ModeSettings;
    readonly seats: readonly SeatController[];
  }

  async function restore(): Promise<Restored | undefined> {
    let loaded: LoadedGame | undefined;
    try {
      loaded = await withStoreTimeout(() => store.load(slot));
    } catch {
      // Storage unavailable or not answering, or a game this version cannot read but must keep:
      // play a new game without saving it.
      mayWrite = false;
      return undefined;
    }
    if (loaded === undefined) return undefined;
    const rebuilt = fromRecord(definition, loaded.record);
    const restoredSeats = rebuilt.ok
      ? savedSeats(loaded.settings, rebuilt.value.playerCount)
      : undefined;
    // A finished game is never kept (it is only stored if clearing it failed), so it is dropped
    // like a corrupt one or one from an older format, and a new game starts.
    if (
      rebuilt.ok &&
      restoredSeats !== undefined &&
      sessionResult(definition, rebuilt.value) === null
    ) {
      return { session: rebuilt.value, settings: loaded.settings, seats: restoredSeats };
    }
    try {
      await withStoreTimeout(() => store.clear(slot));
    } catch {
      // Not dropped this time; it is replaced or dropped again on the next visit.
    }
    return undefined;
  }

  // The saved game is read even when a new one was asked for, so that one that cannot be read is
  // never overwritten (`mayWrite`).
  void restore().then((restored) => {
    if (disposed) return;
    if (options.start !== undefined) {
      start(options.start, true);
    } else if (restored !== undefined) {
      settings = restored.settings;
      seats = restored.seats;
      show(restored.session);
    } else if (options.mode === "ai") {
      // Saved at once, so a reload before the first move keeps the level and who moves first.
      start(options.fallback, true);
    } else {
      start({ mode: "local" }, false);
    }
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
      // Only the AI moves for its seats.
      if (!isHuman(definition.currentPlayer(currentState(session)))) {
        emit({ type: "rejected", code: "illegal-move" });
        return;
      }
      const played = playMove(definition, session, move, rng);
      if (played.ok) commit(played.value);
      else emit({ type: "rejected", code: played.error });
    },
    // Takes back the AI's replies with the person's move before them, back to a turn of a person
    // here: undoing on a shared device takes one move, as before.
    requestUndo: () => {
      if (disposed || session === null) return;
      if (!humanHasMoved(session)) {
        emit({ type: "rejected", code: "nothing-to-undo" });
        return;
      }
      let undone = session;
      let tookHumanMove = false;
      while (canUndo(undone)) {
        const before = undone.states[undone.cursor - 1];
        const stepped = undo(undone);
        if (!stepped.ok) break;
        undone = stepped.value;
        tookHumanMove ||= before !== undefined && isHuman(definition.currentPlayer(before));
        if (tookHumanMove && isHuman(definition.currentPlayer(currentState(undone)))) break;
      }
      commit(undone);
    },
    // Replays the undone moves up to the next turn of a person here, the AI's replies included.
    requestRedo: () => {
      if (disposed || session === null) return;
      if (!canRedo(session)) {
        emit({ type: "rejected", code: "nothing-to-redo" });
        return;
      }
      let redone = session;
      do {
        const stepped = redo(redone);
        if (!stepped.ok) break;
        redone = stepped.value;
      } while (canRedo(redone) && !isHuman(definition.currentPlayer(currentState(redone))));
      commit(redone);
    },
    // Same seats, except that a random first player is drawn again.
    requestNewGame: () => {
      if (disposed || session === null) return;
      const next = newSession();
      const aiSeat = seats.find((controller) => controller.kind === "ai");
      if (settings.kind === "ai" && settings.first === "random" && aiSeat?.kind === "ai") {
        seat({ mode: "ai", level: aiSeat.level, first: "random" }, next);
      }
      commit(next);
    },
    // A disposed transport is dead: a late click from an unmounted screen (or React's development
    // double mount) must neither change the game nor write over what the live transport saves,
    // and a move the AI is still choosing is dropped.
    dispose: () => {
      disposed = true;
      cancelAiTurn();
      listeners.clear();
    },
  };
}
