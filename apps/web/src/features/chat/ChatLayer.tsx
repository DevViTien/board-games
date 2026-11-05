"use client";

import { cn } from "@board-games/ui";
import { useTranslations } from "next-intl";
import { type CSSProperties, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useChatBodyText } from "./chat-content";
import { ChatBubble, ChatPeek, ChatReactionFloat } from "./ChatBubble";
import { ChatPanel } from "./ChatPanel";
import {
  CHAT_LAYOUT,
  type ChatLayout,
  type DockBox,
  sheetHeight,
  useChatDock,
  useChatLayout,
  useKeyboardHeight,
  useSheetSpacer,
} from "./use-chat-placement";
import { type RoomChat, useRoomChatSnapshot } from "./use-room-chat";

/** Below this much the visual viewport lost, it is a browser's bars, not a keyboard. */
const KEYBOARD_MIN_PX = 100;

/** A zero-width space: nothing on screen, but a change of the live region's text. */
const REPEAT_MARK = "\u{200B}";

/** What the panel's frame looks like beside the board: over the words above the controls. */
const DOCK_MIN_HEIGHT_PX = 240;
/** The panel overhangs the column a little: its frame lines up with the cards' edges. */
const DOCK_OVERHANG_PX = 4;

interface ChatLayerProps {
  readonly chat: RoomChat;
}

/** Whether the chat's button is on the screen, whole, below the top bar. */
function useButtonInView(button: HTMLElement | null, watching: boolean): boolean {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    if (!watching || button === null || typeof IntersectionObserver === "undefined") {
      return undefined;
    }
    const topBar = document.querySelector("[data-top-bar]")?.getBoundingClientRect().bottom ?? 0;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(-1);
        if (entry !== undefined) setInView(entry.intersectionRatio >= 1);
      },
      { rootMargin: `-${String(Math.round(topBar))}px 0px 0px 0px`, threshold: [0, 1] },
    );
    observer.observe(button);
    return () => {
      observer.disconnect();
    };
  }, [button, watching]);
  return inView || !watching || button === null;
}

function panelPlace(
  layout: ChatLayout,
  keyboard: number,
  sheet: number,
  dock: DockBox | null,
  over: boolean,
  inGame: boolean,
): { readonly style: CSSProperties; readonly className: string } {
  if (layout === CHAT_LAYOUT.Phone) {
    return {
      style: { height: sheet, bottom: keyboard },
      className:
        "fixed inset-x-0 z-32 rounded-t-card border-t-[1.5px] border-border-control shadow-raised motion-safe:animate-chat-panel motion-reduce:animate-chat-fade",
    };
  }
  if (layout === CHAT_LAYOUT.Landscape) {
    return {
      style: { left: dock?.left ?? undefined, bottom: keyboard },
      className: cn(
        "fixed right-0 z-32 border-l-[1.5px] border-border-control shadow-raised motion-safe:animate-chat-fade",
        keyboard > 0 ? "top-0" : "top-[calc(var(--top-bar-height)+var(--safe-top))]",
        dock === null && "left-[45%]",
      ),
    };
  }
  if (!inGame || dock === null) {
    // The lobby on a laptop: beside the column.
    return {
      style: {},
      className:
        "fixed top-[calc(var(--top-bar-height)+var(--safe-top)+2rem)] right-6 bottom-6 z-32 w-80 overflow-hidden rounded-card border-[1.5px] border-border-control shadow-raised motion-safe:animate-chat-fade",
    };
  }
  // From the top of the page: the panel scrolls with the column on a small laptop.
  const height = Math.max(dock.height - DOCK_OVERHANG_PX, DOCK_MIN_HEIGHT_PX);
  return {
    style: {
      left: dock.left - DOCK_OVERHANG_PX,
      width: dock.width + 2 * DOCK_OVERHANG_PX,
      top: over ? dock.top + DOCK_OVERHANG_PX : dock.top,
      height,
    },
    className:
      "absolute z-32 overflow-hidden rounded-card border-[1.5px] border-border-control motion-safe:animate-chat-fade",
  };
}

/**
 * The chat as it floats over the page, in a portal so no ancestor's transform breaks it: above the
 * branch between lobby and game, so the field keeps its focus and its words when the game replaces
 * the lobby. Sets `data-game` itself, like the die's overlay. Stacked over the top bar (30) and
 * under the throw (35): panel 32, bubble and tab 33, reaction 34; dialogs are in the top layer.
 * Its live region is out of every `inert` wrapper of the play screen, so it reads through a throw.
 */
export function ChatLayer({ chat }: ChatLayerProps) {
  const t = useTranslations("Chat");
  const bodyText = useChatBodyText();
  const snapshot = useRoomChatSnapshot(chat);
  const { visible, open, gameId, play, muted, unread, bubble, reaction, announced, button } =
    snapshot;
  const layout = useChatLayout(gameId === null);
  const over = play?.over === true;
  const keyboard = useKeyboardHeight(visible && open && layout !== CHAT_LAYOUT.Desktop);
  const keyboardUp = keyboard >= KEYBOARD_MIN_PX;
  const shownKeyboard = keyboardUp ? keyboard : 0;
  const dock = useChatDock(
    visible && gameId !== null && layout !== CHAT_LAYOUT.Phone,
    over,
    button,
  );
  const [sheet, setSheet] = useState(0);

  // Measured on opening and when the keyboard changes, never while scrolling: the sheet stays put.
  useLayoutEffect(() => {
    if (!open || layout !== CHAT_LAYOUT.Phone) return;
    const board = document.querySelector("[data-play-board]")?.getBoundingClientRect().top ?? null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- where the board is on screen can only be measured once rendered, before the sheet paints
    setSheet(sheetHeight(window.innerHeight, shownKeyboard, board));
    // The game replacing the lobby under an open sheet brings a board to keep part of in view; its
    // button comes with the play screen that holds the board.
  }, [open, layout, shownKeyboard, gameId, button]);

  const spacer = useSheetSpacer(
    visible && open && layout === CHAT_LAYOUT.Phone ? sheet + shownKeyboard : 0,
  );
  const quiet = open || muted || bubble !== null || reaction !== null || unread === 0;
  const buttonInView = useButtonInView(button, visible && !quiet);

  if (!visible) return null;
  const place = panelPlace(layout, shownKeyboard, sheet, dock, over, gameId !== null);
  const say =
    announced === null || open || muted
      ? ""
      : `${t("announce", {
          name: announced.message.name,
          text: bodyText(announced.message.body),
        })}${announced.count % 2 === 0 ? REPEAT_MARK : ""}`;

  return (
    <>
      {spacer > 0 && (
        <div
          aria-hidden
          data-game={gameId ?? undefined}
          data-chat-spacer=""
          style={{ height: spacer }}
          className="bg-game-page"
        />
      )}
      {createPortal(
        <div data-game={gameId ?? undefined} data-chat-layer="">
          {open && (
            <ChatPanel
              chat={chat}
              snapshot={snapshot}
              layout={layout}
              keyboard={keyboardUp}
              style={place.style}
              className={place.className}
            />
          )}
          {/* Out of reach under the throw, as what it covers is. */}
          <div inert={play?.held === true || undefined}>
            {!open && bubble !== null && (
              <ChatBubble
                chat={chat}
                message={bubble}
                unread={unread}
                layout={layout}
                dock={dock}
              />
            )}
            {!open && reaction !== null && (
              <ChatReactionFloat
                key={reaction.seq}
                message={reaction}
                belowBubble={bubble !== null}
                layout={layout}
                dock={dock}
              />
            )}
            {!quiet && !buttonInView && <ChatPeek chat={chat} snapshot={snapshot} />}
          </div>
          <p aria-live="polite" className="sr-only">
            {say}
          </p>
        </div>,
        document.body,
      )}
    </>
  );
}
