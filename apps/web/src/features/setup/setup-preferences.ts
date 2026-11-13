import { AI_LEVEL, type OptionChoiceList, type OptionValue } from "@board-games/engine";
import { z } from "zod";

import { SETUP_CHOICE_KEY_PREFIX } from "@/config/storage-keys";
import { type ChosenOptions, findChoice } from "@/lib/option-choices";
import { FIRST_PLAYER } from "@/transport/types";

import {
  DEFAULT_PLAY_SETUP,
  type PlayerRange,
  SETUP_MODE,
  type SetupChoice,
  type SetupMode,
} from "./play-setup";

const setupChoiceSchema = z.object({
  mode: z.enum(SETUP_MODE),
  level: z.enum(AI_LEVEL),
  first: z.enum(FIRST_PLAYER),
  // Absent from choices remembered before games had rule options; checked option by option, so
  // anything here (even not an object) costs the player no more than the rule options.
  options: z.unknown().optional(),
  // Absent from choices remembered before games had a choice of players; checked against the
  // game's range, so a wrong one costs the player no more than the number.
  playerCount: z.unknown().optional(),
});

/** The remembered number of players when the game still allows it, otherwise its smallest. */
function rememberedPlayerCount({ min, max }: PlayerRange, remembered: unknown): number {
  return typeof remembered === "number" &&
    Number.isInteger(remembered) &&
    remembered >= min &&
    remembered <= max
    ? remembered
    : min;
}

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
 * one against `choices`, the game's `defaults` replacing any missing or no longer offered, and the
 * number of players against `players`, its smallest replacing one missing or not allowed. Read
 * only after mount, since the server cannot see it.
 */
export function readSetupChoice(
  gameId: string,
  supportsAI: boolean,
  choices: readonly OptionChoiceList[],
  defaults: ChosenOptions,
  players: PlayerRange,
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
    playerCount: rememberedPlayerCount(players, parsed.data.playerCount),
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
        playerCount: choice.playerCount,
        options: choice.options,
      }),
    );
  } catch {
    // Private mode or blocked storage: the default is shown next time.
  }
}

/**
 * Remembers rule options changed from the play screen (change `add-new-game-options`): the rest
 * of the remembered choice stays, or, with none remembered yet, is the game played now: `mode`,
 * its `playerCount`, the default level and first player.
 */
export function rememberSetupOptions(
  gameId: string,
  mode: SetupMode,
  options: ChosenOptions,
  { playerCount }: { readonly playerCount?: number } = {},
): void {
  let stored: z.output<typeof setupChoiceSchema> | undefined;
  try {
    const raw = window.localStorage.getItem(SETUP_CHOICE_KEY_PREFIX + gameId);
    const parsed = raw === null ? undefined : setupChoiceSchema.safeParse(JSON.parse(raw));
    stored = parsed?.success === true ? parsed.data : undefined;
  } catch {
    stored = undefined;
  }
  try {
    window.localStorage.setItem(
      SETUP_CHOICE_KEY_PREFIX + gameId,
      JSON.stringify({
        mode,
        level: DEFAULT_PLAY_SETUP.level,
        first: DEFAULT_PLAY_SETUP.first,
        playerCount,
        ...stored,
        options,
      }),
    );
  } catch {
    // Private mode or blocked storage: the setup screen shows the last choice it remembered.
  }
}
