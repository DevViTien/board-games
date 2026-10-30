import type {
  EngineErrorCode,
  GameRecord,
  GameResult,
  HistoryEntry,
  PlayerIndex,
} from "@board-games/engine";

/** Everything the play screen shows, computed by the transport from the session it owns. */
export interface ReadySnapshot<State, Move, Outcome = never> {
  readonly status: "ready";
  readonly state: State;
  /** Empty once the game has a result. */
  readonly legalMoves: readonly Move[];
  readonly currentPlayer: PlayerIndex;
  readonly result: GameResult | null;
  readonly lastEntry: HistoryEntry<Move, Outcome> | null;
  /** Moves in effect, not counting undone ones. */
  readonly moveCount: number;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  /**
   * Whether a player at this device may choose a move now. The transport decides, because only it
   * knows who sits where: false once the game is over, and later also while it is the AI's or the
   * online opponent's turn (M2, M4) or while a move is on its way to the server.
   */
  readonly canMove: boolean;
  /**
   * The seat whose side the board is shown from (Chess, online), or `null` when every seat is on
   * this device. Only for display: whether a move may be made is `canMove`.
   */
  readonly viewer: PlayerIndex | null;
}

export type PlaySnapshot<State, Move, Outcome = never> =
  { readonly status: "loading" } | ReadySnapshot<State, Move, Outcome>;

export type TransportEvent =
  { readonly type: "changed" } | { readonly type: "rejected"; readonly code: EngineErrorCode };

/**
 * The only owner of a game session. The play screen reads snapshots and sends requests, so it
 * works the same whoever the opponent is: same device now, AI (M2) or online (M4) later. Requests
 * are answered through events, never synchronously, because online play is asynchronous.
 */
export interface Transport<State, Move, Outcome = never> {
  /** Returns the same object until something changes, as `useSyncExternalStore` requires. */
  getSnapshot(this: void): PlaySnapshot<State, Move, Outcome>;
  subscribe(this: void, listener: (event: TransportEvent) => void): () => void;
  submit(this: void, move: Move): void;
  requestUndo(this: void): void;
  requestRedo(this: void): void;
  requestNewGame(this: void): void;
  dispose(this: void): void;
}

/** Where same-device games in progress are kept between visits, one per game. */
export interface SavedGameStore {
  /**
   * The saved record, still untrusted, or `undefined` when there is none (an unreadable one is
   * dropped). Rejects when a saved game may exist but cannot be read now and must be kept: storage
   * unavailable, or a game saved by a newer version of the app. The caller must then not write over
   * it.
   */
  load(this: void, gameId: string): Promise<unknown>;
  save(this: void, gameId: string, record: GameRecord): Promise<void>;
  clear(this: void, gameId: string): Promise<void>;
  listSavedGameIds(this: void): Promise<readonly string[]>;
}
