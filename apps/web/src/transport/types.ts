import type {
  AiLevel,
  EngineErrorCode,
  GameRecord,
  GameResult,
  HistoryEntry,
  PlayerIndex,
} from "@board-games/engine";
import type { RegisteredGameId } from "@board-games/games";

/** The ways to play a game on this device; each has its own saved game (game × mode). */
export const SLOT_MODE = {
  Local: "local",
  Ai: "ai",
} as const;

export type SlotMode = (typeof SLOT_MODE)[keyof typeof SLOT_MODE];

/** Where one game in progress is kept: one per game and mode, stored as `"<gameId>:<mode>"`. */
export interface SaveSlot {
  readonly gameId: string;
  readonly mode: SlotMode;
}

/**
 * Who plays a seat. M4 adds `{ kind: "remote" }`; M6 seats several AIs, each with its own level.
 */
export type SeatController =
  { readonly kind: "human" } | { readonly kind: "ai"; readonly level: AiLevel };

/** Who moves first against the AI, as the player chose it; `random` is drawn when a game starts. */
export const FIRST_PLAYER = {
  Human: "human",
  Ai: "ai",
  Random: "random",
} as const;

export type FirstPlayer = (typeof FIRST_PLAYER)[keyof typeof FIRST_PLAYER];

/**
 * How to set up a new game, from the setup screen to the play screen. M5 adds rule options here
 * without changing how it travels.
 */
export type PlaySetup =
  | { readonly mode: "local" }
  | { readonly mode: "ai"; readonly level: AiLevel; readonly first: FirstPlayer };

export type LocalSetup = Extract<PlaySetup, { mode: "local" }>;
export type AiSetup = Extract<PlaySetup, { mode: "ai" }>;

/**
 * What a saved game needs besides its record: who plays each seat, and the player's choice of who
 * moves first, so that "New game" after a reload still knows to draw it again.
 */
export type ModeSettings =
  | { readonly kind: "local" }
  | {
      readonly kind: "ai";
      readonly first: FirstPlayer;
      readonly seats: readonly SeatController[];
    };

/** Everything the play screen shows, computed by the transport from the session it owns. */
export interface ReadySnapshot<State, Move, Outcome = never> {
  readonly status: "ready";
  readonly state: State;
  /** Empty once the game has a result. */
  readonly legalMoves: readonly Move[];
  readonly currentPlayer: PlayerIndex;
  readonly result: GameResult | null;
  readonly lastEntry: HistoryEntry<Move, Outcome> | null;
  /** The seat that played `lastEntry`, so the screen can tell who just moved. */
  readonly lastMover: PlayerIndex | null;
  /** Moves in effect, not counting undone ones. */
  readonly moveCount: number;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  /**
   * Whether a player at this device may choose a move now. The transport decides, because only it
   * knows who sits where: false once the game is over, while it is the AI's turn, and later also
   * while it is the online opponent's turn (M4) or while a move is on its way to the server.
   */
  readonly canMove: boolean;
  /**
   * The seat whose side the board is shown from (Chess, online), or `null` when every seat is on
   * this device. Only for display: whether a move may be made is `canMove`.
   */
  readonly viewer: PlayerIndex | null;
  /** Who plays each seat, indexed by `PlayerIndex`. */
  readonly seats: readonly SeatController[];
  /** Someone other than a player at this device is choosing the next move. M4 adds "opponent". */
  readonly waitingFor: "ai" | null;
  /**
   * The game is not over and a player at this device has made at least one move still in effect.
   * Only such a game is listed as in progress or asked about before it is dropped.
   */
  readonly inProgress: boolean;
}

export type PlaySnapshot<State, Move, Outcome = never> =
  { readonly status: "loading" } | ReadySnapshot<State, Move, Outcome>;

export type TransportEvent =
  { readonly type: "changed" } | { readonly type: "rejected"; readonly code: EngineErrorCode };

/**
 * The only owner of a game session. The play screen reads snapshots and sends requests, so it
 * works the same whoever the opponent is: same device, the AI, or online (M4). Requests
 * are answered through events, never synchronously, because online play is asynchronous.
 */
export interface Transport<State, Move, Outcome = never> {
  /** Returns the same object until something changes, as `useSyncExternalStore` requires. */
  getSnapshot(this: void): PlaySnapshot<State, Move, Outcome>;
  subscribe(this: void, listener: (event: TransportEvent) => void): () => void;
  submit(this: void, move: Move): void;
  /** Takes back moves until a player at this device is to move again, AI replies included. */
  requestUndo(this: void): void;
  requestRedo(this: void): void;
  requestNewGame(this: void): void;
  dispose(this: void): void;
}

/** A saved game as read back: the settings, and the record still untrusted. */
export interface LoadedGame {
  readonly settings: ModeSettings;
  readonly record: unknown;
}

interface GameToSave {
  readonly settings: ModeSettings;
  readonly record: GameRecord;
  /** See `ReadySnapshot.inProgress`; lists of games in progress read only this. */
  readonly inProgress: boolean;
}

/** A game in progress, as listed by the menu and the setup screen. */
export interface SavedGameSummary {
  readonly gameId: RegisteredGameId;
  readonly mode: SlotMode;
  readonly settings: ModeSettings;
  /** ISO 8601. */
  readonly savedAt: string;
}

/** Where games in progress are kept between visits, one per game and mode. */
export interface SavedGameStore {
  /**
   * The saved game, its record still untrusted, or `undefined` when there is none (an unreadable
   * one is dropped). Rejects when a saved game may exist but cannot be read now and must be kept:
   * storage unavailable, or a game saved by a newer version of the app. The caller must then not
   * write over it.
   */
  load(this: void, slot: SaveSlot): Promise<LoadedGame | undefined>;
  save(this: void, slot: SaveSlot, game: GameToSave): Promise<void>;
  clear(this: void, slot: SaveSlot): Promise<void>;
  /**
   * Readable games marked in progress, of registered games only, most recently saved first. Only
   * reads: nothing is dropped here.
   */
  listInProgress(this: void): Promise<readonly SavedGameSummary[]>;
}

/** What the AI needs to choose a move; plain data, so it can be posted to a Worker. */
export interface AiRequest {
  readonly gameId: string;
  readonly state: unknown;
  readonly level: AiLevel;
  readonly timeLimitMs: number;
  /** Seeds the AI's own random choices (between tied moves, Easy's random moves). */
  readonly seed: number;
}

/** Chooses the AI's moves, in a Web Worker in the app. */
export interface AiPlayer {
  /**
   * The chosen move, untrusted: the transport plays it through the rules, which check it. Rejects
   * when no move could be chosen.
   */
  chooseMove(this: void, request: AiRequest): Promise<unknown>;
  dispose(this: void): void;
}
