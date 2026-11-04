import type {
  AiLevel,
  GameRecord,
  GameResult,
  HistoryEntry,
  PlayerIndex,
} from "@board-games/engine";
import type { RegisteredGameId } from "@board-games/games";
import type { RejectionCode } from "@board-games/protocol";

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
 * Who plays a seat of a game on this device, as saved with it. A game against the AI has one person
 * and the AI in every other seat, each AI seat with its own level (all the same for now).
 */
export type SeatController =
  { readonly kind: "human" } | { readonly kind: "ai"; readonly level: AiLevel };

/**
 * Who plays a seat, as the play screen shows it: a seat on this device, or a player elsewhere
 * (online), named, or `null` while the seat is empty. Never saved: an online game lives on the
 * server, so `remote` never enters `ModeSettings`. Online, a seat whose person resigned or was
 * ruled to have left is played by the server's AI and keeps their name (`standInFor`), this
 * player's own seat included.
 */
export type SeatView =
  | SeatController
  | { readonly kind: "ai"; readonly level: AiLevel; readonly standInFor: string }
  | { readonly kind: "remote"; readonly name: string | null };

/** The name of the person the AI stands in for in `seat`, or `null` for any other seat. */
export function standInName(seat: SeatView | undefined): string | null {
  return seat !== undefined && "standInFor" in seat ? seat.standInFor : null;
}

/** Where an online room's connection stands, as the play screen and the lobby show it. */
export const CONNECTION_STATUS = {
  /** Not yet in the room since the page opened. */
  Connecting: "connecting",
  Online: "online",
  /** Lost the connection after having been in the room; trying again. */
  Reconnecting: "reconnecting",
  /** Closed because the page has been hidden for a while; reopens when it shows again. */
  Paused: "paused",
  /** Closed after a long time without anything happening; reopens on `resume()`. */
  Idle: "idle",
  /** Will not reconnect: the room is gone, full, or this app is older than the server. */
  Failed: "failed",
} as const;

export type ConnectionStatus = (typeof CONNECTION_STATUS)[keyof typeof CONNECTION_STATUS];

/** Who moves first against the AI, as the player chose it; `random` is drawn when a game starts. */
export const FIRST_PLAYER = {
  Human: "human",
  Ai: "ai",
  Random: "random",
} as const;

export type FirstPlayer = (typeof FIRST_PLAYER)[keyof typeof FIRST_PLAYER];

/**
 * How to set up a new game, from the setup screen to the play screen. `options` are the rule
 * options and `playerCount` the number of players, both untrusted (they come from the address or
 * browser storage): the transport checks them with the game's rules. Absent: the game's defaults
 * and its smallest number of players.
 */
export type PlaySetup =
  | { readonly mode: "local"; readonly options?: unknown; readonly playerCount?: unknown }
  | {
      readonly mode: "ai";
      readonly level: AiLevel;
      readonly first: FirstPlayer;
      readonly options?: unknown;
      readonly playerCount?: unknown;
    };

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
   * knows who sits where: false once the game is over, while it is the AI's or the online
   * opponent's turn, while a move is on its way to the server, and while not connected.
   */
  readonly canMove: boolean;
  /**
   * The seat whose side the board is shown from (Chess, online), or `null` when every seat is on
   * this device. Only for display: whether a move may be made is `canMove`.
   */
  readonly viewer: PlayerIndex | null;
  /** Who plays each seat, indexed by `PlayerIndex`. */
  readonly seats: readonly SeatView[];
  /** Someone other than a player at this device is choosing the next move. */
  readonly waitingFor: "ai" | "opponent" | null;
  /**
   * The game is not over and a player at this device has made at least one move still in effect.
   * Only such a game is listed as in progress or asked about before it is dropped. Always false
   * online, where the server keeps the game and nothing can be lost.
   */
  readonly inProgress: boolean;
  /** Whether undo and redo exist at all in this mode; online they do not. */
  readonly supportsUndo: boolean;
  /** Whether a new game may be asked for now; online only once the game has a result. */
  readonly canStartNewGame: boolean;
  /** The connection to the server, or `null` for a game on this device only. */
  readonly connection: ConnectionStatus | null;
  /** The rule options the game is played with, as the rules checked them. */
  readonly options: unknown;
  /**
   * Whether the player at this device can resign now, and what follows: they lose (`loss`), or the
   * server's AI plays their seat to the end (`stand-in`). `null` when there is no resigning: on one
   * device, once the game has a result, while the room waits for players, for a seat the AI
   * already plays.
   */
  readonly resign: ResignOption | null;
  /**
   * The turn running online while a person plays the seat to move: whose, since when by this
   * device's clock (from the server's duration, never its own idea of the time), and what a claim
   * that they left would do. `null` on one device, while moves are being shown, once the game has
   * a result, and while the AI plays the seat to move.
   */
  readonly turn: TurnClock | null;
}

export interface ResignOption {
  readonly outcome: "loss" | "stand-in";
  /** False while not connected: the button stays, with the reason. */
  readonly available: boolean;
}

export interface TurnClock {
  readonly player: PlayerIndex;
  /** Which turn: the game of the room and how many moves it had when the turn began. */
  readonly gameNumber: number;
  readonly moveIndex: number;
  /**
   * `Date.now()` of this device when the turn began. Reckoned again it may move by a few ms (or by
   * the server's correction): the turn itself is `gameNumber` + `moveIndex` + `player`.
   */
  readonly startedAt: number;
  /**
   * What claiming this turn abandoned does for the player here: they win (`win`), the game ends
   * without them playing on (`end`: the AI already plays their own seat), or the AI takes the seat
   * (`stand-in`). `null` when they cannot claim it: their own turn, no seat.
   */
  readonly claim: "win" | "end" | "stand-in" | null;
  /** False while not connected. */
  readonly available: boolean;
}

export type PlaySnapshot<State, Move, Outcome = never> =
  { readonly status: "loading" } | ReadySnapshot<State, Move, Outcome>;

export type TransportEvent =
  | { readonly type: "changed" }
  /** The rules (`illegal-move`…) or, online, the server (`not-your-turn`…) refused a request. */
  | { readonly type: "rejected"; readonly code: RejectionCode }
  /** The server found the turn claimed abandoned not long enough yet (`not-abandoned`). */
  | { readonly type: "claim-refused" };

/**
 * The only owner of a game session. The play screen reads snapshots and sends requests, so it
 * works the same whoever the opponent is: same device, the AI, or online. Requests
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
  /** Gives up the game, when `ReadySnapshot.resign` is available. */
  resign(this: void): void;
  /** Claims the running turn abandoned (`ReadySnapshot.turn`); the server decides. Online only. */
  claimAbandoned(this: void): void;
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
  /** The rule options of its record, unchecked: shown only when they match the game's choices. */
  readonly options: unknown;
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
