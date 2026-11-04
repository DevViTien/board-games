import type { RegisteredGameId } from "@board-games/games/ids";
import { createTranslator } from "next-intl";

import { GAME_RULES } from "@/games/rules";
import { type Locale, TIME_ZONE } from "@/i18n/config";
import { MESSAGE_LOADERS } from "@/i18n/messages";

import type { GameRulesComponent, RulesTranslator } from "./types";

/** A game's rules, ready to show: the component and its translations. */
export interface LoadedRules {
  readonly Rules: GameRulesComponent;
  readonly t: RulesTranslator;
}

/**
 * Loads a game's rules in the browser: its component (`GAME_RULES`) and the messages of the
 * language in use, whose `Rules` namespace the page's provider leaves out. This module, the rules
 * and the messages are chunks of their own, fetched the first time the rules dialog opens.
 */
export async function loadRules(gameId: RegisteredGameId, locale: Locale): Promise<LoadedRules> {
  const [Rules, messages] = await Promise.all([GAME_RULES[gameId](), MESSAGE_LOADERS[locale]()]);
  return {
    Rules,
    t: createTranslator({
      locale,
      messages: messages.default,
      namespace: "Rules",
      timeZone: TIME_ZONE,
    }),
  };
}
