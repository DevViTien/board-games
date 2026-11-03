import { AI_LEVEL, type OptionChoiceList, type OptionValue } from "@board-games/engine";
import { z } from "zod";

import { SETUP_CHOICE_KEY_PREFIX } from "@/config/storage-keys";
import { type ChosenOptions, findChoice } from "@/lib/option-choices";
import { FIRST_PLAYER } from "@/transport/types";

import { SETUP_MODE, type SetupChoice } from "./play-setup";

const setupChoiceSchema = z.object({
  mode: z.enum(SETUP_MODE),
  level: z.enum(AI_LEVEL),
  first: z.enum(FIRST_PLAYER),
  // Absent from choices remembered before games had rule options; checked option by option, so
  // anything here (even not an object) costs the player no more than the rule options.
  options: z.unknown().optional(),
});

/**
 * Each option of `choices` as remembered when it is still one of the game's values, otherwise the
 * game's default for that option alone: a value the game no longer offers does not cost the player
 * the rest of their choice.
 */
function rememberedOptions(
  choices: readonly OptionChoiceList[],
  defaults: ChosenOptions,
  remembered: unknown,
): ChosenOptions {
  const stored: Readonly<Record<string, unknown>> =
    typeof remembered === "object" && remembered !== null && !Array.isArray(remembered)
      ? { ...remembered }
      : {};
  const options: Record<string, OptionValue> = {};
  for (const { name, values } of choices) {
    const value =
      (Object.hasOwn(stored, name) ? findChoice(values, stored[name]) : undefined) ??
      findChoice(values, defaults[name]);
    if (value !== undefined) options[name] = value;
  }
  return options;
}

/**
 * The choice made the last time a game of `gameId` was started on this browser, or `undefined`
 * when there is none or it cannot be read (corrupt, storage blocked): the caller then uses the
 * default, without telling the player. A game that cannot be played against the AI gets the
 * same-device mode instead; online play is open to every game. The rule options are checked one by
 * one against `choices`, the game's `defaults` replacing any missing or no longer offered. Read
 * only after mount, since the server cannot see it.
 */
export function readSetupChoice(
  gameId: string,
  supportsAI: boolean,
  choices: readonly OptionChoiceList[],
  defaults: ChosenOptions,
): SetupChoice | undefined {
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
  const { mode, level, first } = parsed.data;
  return {
    mode: supportsAI || mode !== "ai" ? mode : "local",
    level,
    first,
    options: rememberedOptions(choices, defaults, parsed.data.options),
  };
}

/** Remembers the choice a game was just started with; not remembering it is no reason to fail. */
export function writeSetupChoice(gameId: string, choice: SetupChoice): void {
  try {
    window.localStorage.setItem(
      SETUP_CHOICE_KEY_PREFIX + gameId,
      JSON.stringify({
        mode: choice.mode,
        level: choice.level,
        first: choice.first,
        options: choice.options,
      }),
    );
  } catch {
    // Private mode or blocked storage: the default is shown next time.
  }
}
