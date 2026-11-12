"use client";

import {
  Button,
  CircleAlertIcon,
  cn,
  MessageCircleIcon,
  MessageCircleOffIcon,
} from "@board-games/ui";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { unreadChip } from "./chat-content";
import { type RoomChat, useRoomChatValue } from "./use-room-chat";

/** The chat's panel, for `aria-controls`; a page has one room. */
export const CHAT_PANEL_ID = "room-chat";

interface ChatButtonProps {
  readonly chat: RoomChat;
  readonly className?: string;
}

/**
 * Opens and closes the room's chat: in the row of the game's buttons, and on the lobby's title row.
 * Says how many messages are unread, in its name too, or that the chat is muted. Not there while
 * the chat is the column of a wide screen.
 */
export function ChatButton({ chat, className }: ChatButtonProps) {
  const t = useTranslations("Chat");
  // Each on its own: a key typed in the field changes none of them.
  const open = useRoomChatValue(chat, (snapshot) => snapshot.open);
  const muted = useRoomChatValue(chat, (snapshot) => snapshot.muted);
  const unread = useRoomChatValue(chat, (snapshot) => snapshot.unread);
  // Closed, nothing else says a message did not go through.
  const notSent = useRoomChatValue(chat, (snapshot) => !snapshot.open && snapshot.failure !== null);
  // On a wide screen the column's strip opens the chat instead (`ChatRail`).
  const column = useRoomChatValue(chat, (snapshot) => snapshot.column);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (column) return undefined;
    const element = button.current;
    chat.registerButton(element);
    return () => {
      chat.releaseButton(element);
    };
  }, [chat, column]);

  if (column) return null;
  return (
    <Button
      ref={button}
      variant="secondary"
      aria-expanded={open}
      aria-controls={open ? CHAT_PANEL_ID : undefined}
      data-chat-button=""
      className={cn(
        "relative aria-expanded:border-accent-ink aria-expanded:bg-accent-soft aria-expanded:text-accent-ink",
        className,
      )}
      onClick={() => {
        chat.setOpen(!open);
      }}
    >
      {muted ? (
        <MessageCircleOffIcon aria-hidden className="size-4" />
      ) : (
        <MessageCircleIcon aria-hidden className="size-4" />
      )}
      {/* In words, not an `aria-label`: what is on the button stays part of its name. */}
      {t("title")} {muted && <span className="text-caption font-normal">{t("mutedWord")}</span>}
      {!muted && unread > 0 && <span className="sr-only">{t("unread", { count: unread })}</span>}
      {!muted && unread > 0 && (
        <span
          aria-hidden
          className="absolute -top-2 -right-1.5 h-6 min-w-6 rounded-full border-2 border-game-page bg-fg px-1 text-center text-caption/5 text-bg tabular-nums"
        >
          {unreadChip(unread)}
        </span>
      )}
      {notSent && (
        <>
          {" "}
          <CircleAlertIcon aria-hidden className="size-4 text-danger" />
          <span className="sr-only">{t("failed")}</span>
        </>
      )}
    </Button>
  );
}
