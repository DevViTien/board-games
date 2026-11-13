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
  /** The safety limit of moves was reached with a mold still empty: nobody wins. */
  TooLong: "too-long",
} as const;

export type JellyCrewReason = (typeof JELLY_CREW_REASON)[keyof typeof JELLY_CREW_REASON];

/**
 * The most moves a game can have (design §10.3): not a rule to play by (the longest solution takes
 * 89 steps) but what keeps a game, its record and the server's replay of it finite.
 */
export const JELLY_CREW_MAX_MOVES = 3000;

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

/** What a seat does: a step in one of four directions, or the map put back as it began. */
export const JELLY_CREW_ACTION = {
  Up: "U",
  Down: "D",
  Left: "L",
  Right: "R",
  Reset: "reset",
} as const;

export type JellyCrewAction = (typeof JELLY_CREW_ACTION)[keyof typeof JELLY_CREW_ACTION];

/** A seat, as the first character of a move. */
export type JellyCrewSeatDigit = "0" | "1" | "2" | "3";

/**
 * A move names its seat and what it does (design §10.3): `"1L"` is the second seat stepping left,
 * `"0reset"` the first seat putting the map back. Short, as the whole record is sent on every write.
 */
export type JellyCrewMove = `${JellyCrewSeatDigit}${JellyCrewAction}`;

export type JellyCrewDirection =
  | typeof JELLY_CREW_ACTION.Up
  | typeof JELLY_CREW_ACTION.Down
  | typeof JELLY_CREW_ACTION.Left
  | typeof JELLY_CREW_ACTION.Right;

export const JELLY_CREW_DIRECTIONS = [
  JELLY_CREW_ACTION.Up,
  JELLY_CREW_ACTION.Down,
  JELLY_CREW_ACTION.Left,
  JELLY_CREW_ACTION.Right,
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
  /** The game is over. */
  Over: "over",
} as const;

export type JellyCrewBlocked = (typeof JELLY_CREW_BLOCKED)[keyof typeof JELLY_CREW_BLOCKED];
