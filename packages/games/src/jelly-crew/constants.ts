/** The maps of the game, each with a layout for 2, 3 and 4 players. */
export const JELLY_CREW_MAP = {
  Kitchen: "kitchen",
  Market: "market",
  ColdStore: "cold-store",
} as const;

export type JellyCrewMapId = (typeof JELLY_CREW_MAP)[keyof typeof JELLY_CREW_MAP];

/** In the order the setup screen lists them: the easiest first, and the default. */
export const JELLY_CREW_MAPS = [
  JELLY_CREW_MAP.Kitchen,
  JELLY_CREW_MAP.Market,
  JELLY_CREW_MAP.ColdStore,
] as const satisfies readonly JellyCrewMapId[];

/** Why a game ended by its rules, in `GameResult.reason`; the app translates it. */
export const JELLY_CREW_REASON = {
  /** Every mold holds its kind: the whole team wins. */
  Filled: "filled",
  /** The last round is over and a mold is still empty: nobody wins. */
  OutOfRounds: "out-of-rounds",
} as const;

export type JellyCrewReason = (typeof JELLY_CREW_REASON)[keyof typeof JELLY_CREW_REASON];

/** Steps a player may take in one turn. */
export const JELLY_CREW_STEPS = 5;

/** Steps a player may take back in one turn: a game can never grow without end (design §3). */
export const JELLY_CREW_BACKS = 5;

/** What a cell of jelly is made of. */
export const JELLY_CREW_KIND = {
  Strawberry: "strawberry",
  Pandan: "pandan",
  Mango: "mango",
  Taro: "taro",
  Grass: "grass",
  Ice: "ice",
} as const;

export type JellyCrewKind = (typeof JELLY_CREW_KIND)[keyof typeof JELLY_CREW_KIND];

/** Every kind, in the order the app names them. */
export const JELLY_CREW_KINDS = [
  JELLY_CREW_KIND.Strawberry,
  JELLY_CREW_KIND.Pandan,
  JELLY_CREW_KIND.Mango,
  JELLY_CREW_KIND.Taro,
  JELLY_CREW_KIND.Grass,
  JELLY_CREW_KIND.Ice,
] as const satisfies readonly JellyCrewKind[];

/** The group of a plate and the doors it opens, told by its sign: ●, ▲ or ■. */
export const JELLY_CREW_GROUP = {
  Circle: "circle",
  Triangle: "triangle",
  Square: "square",
} as const;

export type JellyCrewGroup = (typeof JELLY_CREW_GROUP)[keyof typeof JELLY_CREW_GROUP];

export const JELLY_CREW_GROUPS = [
  JELLY_CREW_GROUP.Circle,
  JELLY_CREW_GROUP.Triangle,
  JELLY_CREW_GROUP.Square,
] as const satisfies readonly JellyCrewGroup[];

/** The four steps, then the moves that end or change a turn. */
export const JELLY_CREW_MOVE = {
  Up: "U",
  Down: "D",
  Left: "L",
  Right: "R",
  End: "end",
  Back: "back",
  Reset: "reset",
} as const;

export type JellyCrewMove = (typeof JELLY_CREW_MOVE)[keyof typeof JELLY_CREW_MOVE];

export type JellyCrewDirection =
  | typeof JELLY_CREW_MOVE.Up
  | typeof JELLY_CREW_MOVE.Down
  | typeof JELLY_CREW_MOVE.Left
  | typeof JELLY_CREW_MOVE.Right;

export const JELLY_CREW_DIRECTIONS = [
  JELLY_CREW_MOVE.Up,
  JELLY_CREW_MOVE.Down,
  JELLY_CREW_MOVE.Left,
  JELLY_CREW_MOVE.Right,
] as const satisfies readonly JellyCrewDirection[];

/** Why a step cannot be taken, for the reason a disabled direction gives. */
export const JELLY_CREW_BLOCKED = {
  /** The character would walk into a wall or off the board. */
  Wall: "wall",
  /** The character would walk into a closed door. */
  Door: "door",
  /** Another character stands there. */
  Seat: "seat",
  /** A pushed piece would move into a wall. */
  PushWall: "push-wall",
  /** A pushed piece would move into a closed door. */
  PushDoor: "push-door",
  /** A pushed piece would move into a character. */
  PushSeat: "push-seat",
  /** The player has taken every step of the turn. */
  NoSteps: "no-steps",
  /** The game is over. */
  Over: "over",
} as const;

export type JellyCrewBlocked = (typeof JELLY_CREW_BLOCKED)[keyof typeof JELLY_CREW_BLOCKED];
