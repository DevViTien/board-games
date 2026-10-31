import { AI_LEVEL, type AiLevel } from "@board-games/engine";
import { z } from "zod";

import {
  type AiSetup,
  FIRST_PLAYER,
  type FirstPlayer,
  type LocalSetup,
  type PlaySetup,
  type SlotMode,
} from "@/transport/types";

/**
 * What the setup screen shows and remembers. The level and who moves first are kept even when the
 * player picks the same-device mode, so switching back to the AI shows them again.
 */
export interface SetupChoice {
  readonly mode: SlotMode;
  readonly level: AiLevel;
  readonly first: FirstPlayer;
}

/** The choice before the player has made any: against the AI, Medium, the player first. */
export const DEFAULT_PLAY_SETUP = {
  mode: "ai",
  level: "medium",
  first: "human",
} as const satisfies AiSetup & SetupChoice;

/** The game a choice sets up; the level and who moves first only matter against the AI. */
export function toPlaySetup({ mode, level, first }: SetupChoice): PlaySetup {
  return mode === "ai" ? { mode, level, first } : { mode };
}

/**
 * The play screen's address that starts a new game set up like `setup`, e.g.
 * `/play/tictactoe/ai?new=1&level=hard&first=random`. The play screen reads it once and removes it.
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

/**
 * The new game asked for by the address of the play screen of `mode` (see `toStartUrl`), or
 * `undefined` when it asks for none or its values are missing or wrong: the saved game is then
 * resumed instead.
 */
export function readStartRequest(params: SearchParamsLike, mode: "local"): LocalSetup | undefined;
export function readStartRequest(params: SearchParamsLike, mode: "ai"): AiSetup | undefined;
export function readStartRequest(params: SearchParamsLike, mode: SlotMode): PlaySetup | undefined;
export function readStartRequest(params: SearchParamsLike, mode: SlotMode): PlaySetup | undefined {
  if (mode === "local") {
    return newGameSchema.safeParse({ new: params.get("new") }).success ? { mode } : undefined;
  }
  const parsed = aiStartSchema.safeParse({
    new: params.get("new"),
    level: params.get("level"),
    first: params.get("first"),
  });
  return parsed.success ? { mode, level: parsed.data.level, first: parsed.data.first } : undefined;
}
