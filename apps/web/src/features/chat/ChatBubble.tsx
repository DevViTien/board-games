"use client";

import type { ChatMessageView } from "@board-games/protocol";
import { cn, MessageCircleIcon } from "@board-games/ui";
import { useTranslations } from "next-intl";
import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";

import { CHAT_REACTION_EMOJI, unreadChip, useChatBodyText } from "./chat-content";
import { CHAT_LAYOUT, type ChatLayout, type DockBox, liesOverBoard } from "./use-chat-placement";
import type { RoomChat, RoomChatSnapshot } from "./use-room-chat";

/** Right under the top bar: only words there, never the board, the die or the game's buttons. */
const UNDER_TOP_BAR = "fixed top-[calc(var(--top-bar-height)+var(--safe-top)+0.375rem)]";

interface SpotProps {
  readonly layout: ChatLayout;
  /** The column beside the board; `null` on a phone and in the lobby. */
  readonly dock: DockBox | null;
}

/**
 * Across the column beside the board, the screen on a phone, a corner in the lobby on a laptop, and
 * next to the strip of a collapsed column on a wide screen.
 */
function spot({ layout, dock }: SpotProps) {
  if (layout === CHAT_LAYOUT.Column) return { className: "right-[4.25rem] w-72" };
  if (dock !== null) return { className: "", style: { left: dock.left, width: dock.width } };
  if (layout === CHAT_LAYOUT.Dialog) return { className: "inset-x-3" };
  return { className: "right-6 w-80" };
}

/**
 * Calls `report` with whether `element` lies over the board, now and whenever the page scrolls:
 * under the top bar is free of the board only until the page has scrolled the board up there.
 */
function useWatchOverBoard(
  element: RefObject<HTMLElement | null>,
  report: (over: boolean) => void,
): void {
  // Before it paints: it must never be seen over the board.
  useLayoutEffect(() => {
    report(liesOverBoard(element.current));
  }, [element, report]);

  useEffect(() => {
    const check = () => {
      report(liesOverBoard(element.current));
    };
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [element, report]);
}

/** Whether `element` lies over the board; it stays in the page, without being seen, to be measured. */
function useOverBoard(element: RefObject<HTMLElement | null>): boolean {
  const [over, setOver] = useState(false);
  useWatchOverBoard(element, setOver);
  return over;
}

interface ChatBubbleProps extends SpotProps {
  readonly chat: RoomChat;
  readonly message: ChatMessageView;
  readonly unread: number;
}

/**
 * A message that came while the chat is closed: a tap opens the chat. Moves nothing around it. Over
 * a board the page has scrolled up to, it goes: the count on the chat's button says the rest.
 */
export function ChatBubble({ chat, message, unread, layout, dock }: ChatBubbleProps) {
  const t = useTranslations("Chat");
  const bodyText = useChatBodyText();
  const element = useRef<HTMLButtonElement>(null);
  const text = bodyText(message.body);
  const place = spot({ layout, dock });
  const [report] = useState(() => (over: boolean) => {
    if (over) chat.dismissBubble();
  });
  useWatchOverBoard(element, report);

  return (
    <button
      ref={element}
      type="button"
      data-chat-bubble=""
      style={place.style}
      className={cn(
        UNDER_TOP_BAR,
        place.className,
        "focus-ring z-33 flex cursor-pointer flex-col rounded-control border-[1.5px] border-border-control bg-surface px-3 py-2 text-left text-fg shadow-raised",
        "animate-chat-bubble motion-reduce:animate-chat-fade",
      )}
      onClick={() => {
        chat.setOpen(true);
      }}
      onPointerEnter={() => {
        chat.pauseBubble(true);
      }}
      onPointerLeave={() => {
        chat.pauseBubble(false);
      }}
      onFocus={() => {
        chat.pauseBubble(true);
      }}
      onBlur={() => {
        chat.pauseBubble(false);
      }}
    >
      <span className="sr-only">{t("openChat")}</span>{" "}
      <span className="flex justify-between gap-2 text-caption font-bold">
        <span className="min-w-0 truncate">{message.name}</span>{" "}
        <span className="shrink-0 font-semibold text-accent-ink">
          {t("unread", { count: unread })}
        </span>{" "}
      </span>
      <span dir="auto" className="line-clamp-2 text-small wrap-anywhere">
        {text}
      </span>
    </button>
  );
}

interface ChatReactionFloatProps extends SpotProps {
  readonly message: ChatMessageView;
  /** A bubble is on screen: under it, as it would hide part of it. */
  readonly belowBubble: boolean;
}

/**
 * A reaction that came while the chat is closed: it floats up and goes; the count stays. The next
 * one is a new element (`key` at its use): an animation that ended does not run again by itself.
 */
export function ChatReactionFloat({ message, belowBubble, layout, dock }: ChatReactionFloatProps) {
  const element = useRef<HTMLDivElement>(null);
  const over = useOverBoard(element);
  if (message.body.kind !== "reaction") return null;
  const place =
    layout === CHAT_LAYOUT.Column
      ? { right: "5rem" }
      : dock === null
        ? { right: "1.25rem" }
        : { left: dock.left + dock.width - 72 };

  return (
    <div
      ref={element}
      aria-hidden
      data-chat-reaction=""
      style={place}
      className={cn(
        UNDER_TOP_BAR,
        belowBubble && "mt-20",
        over && "invisible",
        "pointer-events-none z-34 flex flex-col items-center",
        "animate-chat-reaction motion-reduce:animate-chat-reaction-still",
      )}
    >
      <span className="text-display/none">{CHAT_REACTION_EMOJI[message.body.reaction]}</span>
      <span className="mt-px max-w-32 truncate rounded-full bg-fg px-2 text-caption text-bg">
        {message.name}
      </span>
    </div>
  );
}

interface ChatPeekProps {
  readonly chat: RoomChat;
  readonly snapshot: RoomChatSnapshot;
}

/**
 * Below the top bar once the bubble has gone, when the chat's button is off the screen and messages
 * are still unread: the player learns of them without scrolling. Not over a board the page has
 * scrolled up to: then the count is left to the button.
 */
export function ChatPeek({ chat, snapshot }: ChatPeekProps) {
  const t = useTranslations("Chat");
  const { unread } = snapshot;
  const element = useRef<HTMLButtonElement>(null);
  const over = useOverBoard(element);

  return (
    <button
      ref={element}
      type="button"
      data-chat-peek=""
      className={cn(
        UNDER_TOP_BAR,
        over && "invisible",
        "focus-ring right-3 z-33 inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-control border-[1.5px] border-fg bg-surface px-2.5 text-small font-semibold text-fg shadow-raised",
        "animate-chat-fade",
      )}
      onClick={() => {
        chat.setOpen(true);
      }}
    >
      <MessageCircleIcon aria-hidden className="size-4" />
      <span>
        <span className="sr-only">{t("openPrefix")}</span> {t("title")}{" "}
        <span className="sr-only">{t("unread", { count: unread })}</span>
      </span>
      <span
        aria-hidden
        className="h-5 min-w-5 rounded-full bg-fg px-1 text-center text-caption/5 text-bg tabular-nums"
      >
        {unreadChip(unread)}
      </span>
    </button>
  );
}
