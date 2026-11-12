"use client";

import { cn, MessageCircleIcon, MessageCircleOffIcon } from "@board-games/ui";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { unreadChip } from "./chat-content";
import { type RoomChat, useRoomChatValue } from "./use-room-chat";

/** Under the top bar, at the right edge of a wide screen: the column's place, and the strip's. */
export const CHAT_COLUMN_PLACE =
  "fixed top-[calc(var(--top-bar-height)+var(--safe-top))] right-0 bottom-0 z-32 border-l-[1.5px] border-border-control";

interface ChatRailProps {
  readonly chat: RoomChat;
  /** The player just collapsed the column: the focus comes here, where its button was. */
  readonly focusOnMount: boolean;
  readonly onExpand: () => void;
}

/**
 * The column collapsed: a strip with the button that opens it again, saying how many messages are
 * unread, in its name too. While it is on screen it is the chat's button, where the focus goes back.
 */
export function ChatRail({ chat, focusOnMount, onExpand }: ChatRailProps) {
  const t = useTranslations("Chat");
  const muted = useRoomChatValue(chat, (snapshot) => snapshot.muted);
  const unread = useRoomChatValue(chat, (snapshot) => snapshot.unread);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = button.current;
    chat.registerButton(element);
    // Only where the collapse button was, gone with the column: never away from something else.
    if (focusOnMount && document.activeElement === document.body) {
      element?.focus({ preventScroll: true });
    }
    return () => {
      chat.releaseButton(element);
    };
    // Focused once, as it comes: not again when the same strip renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat]);

  return (
    <div
      data-chat-rail=""
      className={cn(CHAT_COLUMN_PLACE, "flex w-14 justify-center bg-surface pt-3")}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={false}
        data-chat-button=""
        className="focus-ring relative inline-flex size-11 cursor-pointer items-center justify-center rounded-control border-[1.5px] border-border-control bg-surface text-fg hover:bg-surface-muted"
        onClick={onExpand}
      >
        {muted ? (
          <MessageCircleOffIcon aria-hidden className="size-5" />
        ) : (
          <MessageCircleIcon aria-hidden className="size-5" />
        )}
        <span className="sr-only">
          {t("expand")}
          {muted ? ` ${t("mutedWord")}` : ""}
          {!muted && unread > 0 ? `, ${t("unread", { count: unread })}` : ""}
        </span>
        {!muted && unread > 0 && (
          <span
            aria-hidden
            className="absolute -top-2 -right-2 h-6 min-w-6 rounded-full border-2 border-surface bg-fg px-1 text-center text-caption/5 text-bg tabular-nums"
          >
            {unreadChip(unread)}
          </span>
        )}
      </button>
    </div>
  );
}
