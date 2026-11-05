"use client";

import type { ChatBody, ChatReaction } from "@board-games/protocol";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

/** How the app draws each reaction: only its id crosses the network. */
export const CHAT_REACTION_EMOJI = {
  like: "👍",
  laugh: "😂",
  wow: "😮",
  sad: "😢",
  fire: "🔥",
  clap: "👏",
} as const satisfies Record<ChatReaction, string>;

/**
 * A message's words in the reader's language: a text as its sender typed it, a preset and a
 * reaction's name from the translations.
 */
export function useChatBodyText(): (body: ChatBody) => string {
  const t = useTranslations("Chat");
  return useCallback(
    (body) => {
      switch (body.kind) {
        case "text":
          return body.text;
        case "preset":
          return t(`preset.${body.preset}`);
        case "reaction":
          return t(`reaction.${body.reaction}`);
      }
    },
    [t],
  );
}

/** The most unread messages a chip shows as a number: more does not fit, and says no more. */
const UNREAD_SHOWN_UP_TO = 9;

/** The words of a chip counting unread messages. */
export function unreadChip(count: number): string {
  return count > UNREAD_SHOWN_UP_TO ? `${String(UNREAD_SHOWN_UP_TO)}+` : String(count);
}
