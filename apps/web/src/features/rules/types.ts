import type { createTranslator } from "next-intl";
import type { ReactNode } from "react";

import type { Messages } from "@/i18n/messages";

/**
 * The translations of the `Rules` namespace, as `getTranslations("Rules")` gives them on the server
 * and `createTranslator` in the browser (`load-rules.ts`, when the rules dialog first opens).
 */
export type RulesTranslator = ReturnType<typeof createTranslator<Messages, "Rules">>;

/**
 * Where a game's rules are shown: their own page (`/rules/<id>`, sections are `h2` under the page's
 * `h1`, links may leave), or the dialog of the play screen (sections are `h3` under the dialog's
 * `h2`, and nothing may lead away from the game).
 */
export type RulesPlace = "page" | "dialog";

/** What a game's rules (`games/<id>/Rules.tsx`) receive. */
export interface GameRulesProps {
  readonly t: RulesTranslator;
  readonly place: RulesPlace;
}

/**
 * A game's rules: plain markup with no hooks of its own, so the same component renders on the
 * server (the rules page) and in the browser (the play screen's rules dialog).
 */
export type GameRulesComponent = (props: GameRulesProps) => ReactNode;
