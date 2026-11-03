import { AI_LEVEL, type AiLevel, type GameMeta } from "@board-games/engine";
import { z } from "zod";

import type { ChosenOptions } from "@/lib/option-choices";
import {
  type AiSetup,
  FIRST_PLAYER,
  type FirstPlayer,
  type LocalSetup,
  type PlaySetup,
  SLOT_MODE,
  type SlotMode,
} from "@/transport/types";

/**
 * The modes the setup screen offers: those with a saved game on this device, and online play,
 * whose game lives on the server (so it has no slot).
 */
export const SETUP_MODE = { ...SLOT_MODE, Online: "online" } as const;

export type SetupMode = (typeof SETUP_MODE)[keyof typeof SETUP_MODE];

/** How many players a game allows, from its `meta`: plain data the server page can pass on. */
export type PlayerRange = GameMeta["players"];

/**
 * What the setup screen shows and remembers. The level and who moves first are kept even when the
 * player picks another mode, so switching back to the AI shows them again; the number of players
 * and the rule options apply to every mode.
 */
export interface SetupChoice {
  readonly mode: SetupMode;
  readonly level: AiLevel;
  readonly first: FirstPlayer;
  /** Within the game's `PlayerRange`; its minimum for a game with a fixed number of players. */
  readonly playerCount: number;
  /** One value per rule option the game offers; `{}` for a game without choices. */
  readonly options: ChosenOptions;
}

/** Whether the players may choose how many they are: only then is the number asked and sent. */
export function hasPlayerChoice({ min, max }: PlayerRange): boolean {
  return min < max;
}

/**
 * The choice before the player has made any: against the AI, Medium, the player first. The rule
 * options are the game's own defaults.
 */
export const DEFAULT_PLAY_SETUP = {
  mode: "ai",
  level: "medium",
  first: "human",
} as const satisfies AiSetup & Omit<SetupChoice, "options" | "playerCount">;

/**
 * The game a choice sets up; the level and who moves first only matter against the AI, and a game
 * without rule options gets none, nor the number of players when it is fixed by the game's
 * `players` (its start address stays as it was).
 */
export function toPlaySetup(
  { mode, level, first, playerCount, options }: SetupChoice & { readonly mode: SlotMode },
  players: PlayerRange,
): PlaySetup {
  const extra = {
    ...(hasPlayerChoice(players) ? { playerCount } : {}),
    ...(Object.keys(options).length > 0 ? { options } : {}),
  };
  return mode === "ai" ? { mode, level, first, ...extra } : { mode, ...extra };
}

/**
 * The play screen's address that starts a new game set up like `setup`, e.g.
 * `/play/caro/ai?new=1&level=hard&first=random&options=%7B%22size%22%3A19%7D`, the rule options
 * as JSON, and `players=<n>` when the setup has a number of players. The play screen reads it once
 * and removes it.
 */
export function toStartUrl(
  gameId: string,
  setup: PlaySetup,
): `/play/${string}/${SlotMode}?${string}` {
  const query = new URLSearchParams({ new: "1" });
  if (setup.mode === "ai") {
    query.set("level", setup.level);
    query.set("first", setup.first);
  }
  if (typeof setup.playerCount === "number") query.set("players", String(setup.playerCount));
  if (setup.options !== undefined) query.set("options", JSON.stringify(setup.options));
  return `/play/${gameId}/${setup.mode}?${query.toString()}`;
}

/** What `readStartRequest` needs from the address's query (`URLSearchParams`, Next's own). */
interface SearchParamsLike {
  get(name: string): string | null;
}

const newGameSchema = z.object({ new: z.literal("1") });
const aiStartSchema = newGameSchema.extend({
  level: z.enum(AI_LEVEL),
  first: z.enum(FIRST_PLAYER),
});

/** The `options` of the query: absent, or the JSON it holds; `invalid` when it is not JSON. */
function readOptions(params: SearchParamsLike): { readonly options?: unknown } | "invalid" {
  const raw = params.get("options");
  if (raw === null) return {};
  try {
    return { options: JSON.parse(raw) as unknown };
  } catch {
    return "invalid";
  }
}

/**
 * The `players` of the query: absent, or the whole number it holds; `invalid` otherwise. Whether
 * the game allows that many is checked when it starts, as for the rule options.
 */
function readPlayerCount(params: SearchParamsLike): { readonly playerCount?: number } | "invalid" {
  const raw = params.get("players");
  if (raw === null) return {};
  return /^\d{1,3}$/.test(raw) ? { playerCount: Number(raw) } : "invalid";
}

/**
 * The new game asked for by the address of the play screen of `mode` (see `toStartUrl`), or
 * `undefined` when it asks for none or its values are missing or wrong: the saved game is then
 * resumed instead. The rule options are only read as JSON here, and the number of players as a
 * whole number; the game checks them when it starts, and resumes the saved game if it refuses them.
 */
export function readStartRequest(params: SearchParamsLike, mode: "local"): LocalSetup | undefined;
export function readStartRequest(params: SearchParamsLike, mode: "ai"): AiSetup | undefined;
export function readStartRequest(params: SearchParamsLike, mode: SlotMode): PlaySetup | undefined;
export function readStartRequest(params: SearchParamsLike, mode: SlotMode): PlaySetup | undefined {
  const parsedOptions = readOptions(params);
  const playerCount = readPlayerCount(params);
  if (parsedOptions === "invalid" || playerCount === "invalid") return undefined;
  const extra = { ...playerCount, ...parsedOptions };
  if (mode === "local") {
    return newGameSchema.safeParse({ new: params.get("new") }).success
      ? { mode, ...extra }
      : undefined;
  }
  const parsed = aiStartSchema.safeParse({
    new: params.get("new"),
    level: params.get("level"),
    first: params.get("first"),
  });
  return parsed.success
    ? { mode, level: parsed.data.level, first: parsed.data.first, ...extra }
    : undefined;
}

/**
 * The mode asked for by the setup screen's address (`/play/<gameId>?mode=online`, the menu's
 * "Online"), or `undefined` when none is, or one the game does not offer, or not a mode at all:
 * the screen then shows the remembered or default mode, without telling the player.
 */
export function readInitialMode(
  raw: string | readonly string[] | undefined,
  supportsAI: boolean,
): SetupMode | undefined {
  const parsed = z.enum(SETUP_MODE).safeParse(raw);
  if (!parsed.success) return undefined;
  return parsed.data === SETUP_MODE.Ai && !supportsAI ? undefined : parsed.data;
}
