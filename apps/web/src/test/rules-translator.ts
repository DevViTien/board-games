import { createTranslator } from "next-intl";

import type { RulesTranslator } from "@/features/rules/types";
import { type Locale, TIME_ZONE } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";

import en from "../../messages/en.json";
import ja from "../../messages/ja.json";
import vi from "../../messages/vi.json";

const MESSAGES: Record<Locale, Messages> = { vi, en, ja };

/** The `Rules` translations of a locale, as the server hands them to a game's rules. */
export function rulesTranslator(locale: Locale = "vi"): RulesTranslator {
  return createTranslator({
    locale,
    messages: MESSAGES[locale],
    namespace: "Rules",
    timeZone: TIME_ZONE,
  });
}
