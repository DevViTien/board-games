import { AI_LEVEL } from "@board-games/engine";
import { z } from "zod";

import { SETUP_CHOICE_KEY_PREFIX } from "@/config/storage-keys";
import { FIRST_PLAYER, SLOT_MODE } from "@/transport/types";

import type { SetupChoice } from "./play-setup";

const setupChoiceSchema = z.object({
  mode: z.enum(SLOT_MODE),
  level: z.enum(AI_LEVEL),
  first: z.enum(FIRST_PLAYER),
});

/**
 * The choice made the last time a game of `gameId` was started on this browser, or `undefined`
 * when there is none or it cannot be read (corrupt, storage blocked): the caller then uses the
 * default, without telling the player. A game that cannot be played against the AI only gets the
 * same-device mode. Read only after mount, since the server cannot see it.
 */
export function readSetupChoice(gameId: string, supportsAI: boolean): SetupChoice | undefined {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(SETUP_CHOICE_KEY_PREFIX + gameId);
  } catch {
    return undefined;
  }
  if (raw === null) return undefined;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return undefined;
  }
  const parsed = setupChoiceSchema.safeParse(json);
  if (!parsed.success) return undefined;
  return supportsAI ? parsed.data : { ...parsed.data, mode: "local" };
}

/** Remembers the choice a game was just started with; not remembering it is no reason to fail. */
export function writeSetupChoice(gameId: string, choice: SetupChoice): void {
  try {
    window.localStorage.setItem(
      SETUP_CHOICE_KEY_PREFIX + gameId,
      JSON.stringify({ mode: choice.mode, level: choice.level, first: choice.first }),
    );
  } catch {
    // Private mode or blocked storage: the default is shown next time.
  }
}
