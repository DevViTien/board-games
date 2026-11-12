"use client";

import { cn } from "@board-games/ui";
import { useTranslations } from "next-intl";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { CHAT_COLUMN, readChatColumn, writeChatColumn } from "./chat-column";
import { useChatBodyText } from "./chat-content";
import { ChatBubble, ChatPeek, ChatReactionFloat } from "./ChatBubble";
import { ChatPanel } from "./ChatPanel";
import { CHAT_COLUMN_PLACE, ChatRail } from "./ChatRail";
import {
  CHAT_LAYOUT,
  type ChatLayout,
  type DockBox,
  keyboardHeight,
  useChatDock,
  useChatLayout,
  useViewportBox,
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

/** What the player did last with the column: where the focus goes as it changes. */
type ColumnMove = "expand" | "collapse" | null;

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

/** The panel over the column beside the board, on a small laptop (`dock`). */
function dockPlace(
  dock: DockBox | null,
  over: boolean,
): { readonly style: CSSProperties; readonly className: string } {
  const frame = "z-32 overflow-hidden rounded-card border-[1.5px] border-border-control";
  if (dock === null) {
    return {
      style: {},
      className: cn(
        "fixed top-[calc(var(--top-bar-height)+var(--safe-top)+2rem)] right-6 bottom-6 w-80 shadow-raised",
        frame,
      ),
    };
  }
  // From the top of the page: the panel scrolls with the column on a small laptop.
  return {
    style: {
      left: dock.left - DOCK_OVERHANG_PX,
      width: dock.width + 2 * DOCK_OVERHANG_PX,
      top: over ? dock.top + DOCK_OVERHANG_PX : dock.top,
      height: Math.max(dock.height - DOCK_OVERHANG_PX, DOCK_MIN_HEIGHT_PX),
    },
    className: cn("absolute", frame),
  };
}

interface ChatDialogProps {
  readonly chat: RoomChat;
  /** Its name for assistive technology: the chat's title. */
  readonly label: string;
  readonly children: (keyboard: boolean) => ReactNode;
}

/**
 * The chat over the whole screen (`dialog`): a modal `<dialog>`, so the page under it is out of
 * reach and the system's back gesture closes it. As tall as the part of the screen seen now: the
 * on-screen keyboard never hides the field (design §4 of `rework-chat-layout`).
 */
function ChatDialog({ chat, label, children }: ChatDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const box = useViewportBox(true);
  const keyboard = box !== null && keyboardHeight(box) >= KEYBOARD_MIN_PX;

  useLayoutEffect(() => {
    const element = dialog.current;
    if (element === null) return undefined;
    if (!element.open) element.showModal();
    // Not `close()`: it would give the focus back to the opener and scroll the page to it. Taken
    // out of the page, the dialog leaves the top layer; then the button gets the focus without the
    // page moving, unless the chat stays open elsewhere (the game replacing the lobby).
    return () => {
      queueMicrotask(() => {
        if (!chat.getSnapshot().open) chat.focusButton();
      });
    };
  }, [chat]);

  return (
    <dialog
      ref={dialog}
      aria-label={label}
      data-chat-dialog=""
      style={box === null ? undefined : { top: box.top, height: box.height }}
      className="fixed inset-x-0 top-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden bg-surface p-0 text-fg backdrop:bg-transparent"
      onCancel={(event) => {
        // The back gesture, or an Esc the panel did not take: never in the middle of a word.
        if (chat.isComposing()) event.preventDefault();
      }}
      onClose={() => {
        chat.setOpen(false);
        chat.focusButton();
      }}
    >
      {children(keyboard)}
    </dialog>
  );
}

/**
 * The chat as it floats over the page, in a portal so no ancestor's transform breaks it: above the
 * branch between lobby and game, so the field keeps its focus and its words when the game replaces
 * the lobby. Sets `data-game` itself, like the die's overlay. Stacked over the top bar (30) and
 * under the throw (35): panel and column 32, bubble and tab 33, reaction 34; the dialog is in the
 * top layer. Its live region is out of every `inert` wrapper of the play screen, so it reads through
 * a throw.
 *
 * On a wide screen it is a column at the right edge (`column`): it tells the page so on `<html>`
 * (`data-chat-column`), and the page leaves it the room (`--chat-room` in `globals.css`).
 */
export function ChatLayer({ chat }: ChatLayerProps) {
  const t = useTranslations("Chat");
  const bodyText = useChatBodyText();
  const snapshot = useRoomChatSnapshot(chat);
  const { visible, open, gameId, play, muted, unread, bubble, reaction, announced, button } =
    snapshot;
  const layout = useChatLayout(gameId === null);
  const over = play?.over === true;
  const column = visible && layout === CHAT_LAYOUT.Column;
  // The column beside the board, where the panel goes on a small laptop, and where a bubble goes on
  // a phone turned sideways: it has no box on a phone held upright.
  const dock = useChatDock(
    visible && gameId !== null && layout !== CHAT_LAYOUT.Column,
    over,
    button,
  );
  const [move, setMove] = useState<ColumnMove>(null);

  // Into the column: as this browser left it. Out of it: closed, so no dialog opens by itself as a
  // window is made narrower.
  const previous = useRef<ChatLayout | null>(null);
  useLayoutEffect(() => {
    chat.setColumn(column);
    const was = previous.current;
    previous.current = visible ? layout : null;
    if (!visible) return;
    if (layout === CHAT_LAYOUT.Column && was !== CHAT_LAYOUT.Column) {
      chat.setOpen(readChatColumn() === CHAT_COLUMN.Open);
    } else if (layout !== CHAT_LAYOUT.Column && was === CHAT_LAYOUT.Column) {
      chat.setOpen(false);
    }
  }, [chat, column, layout, visible]);

  useEffect(
    () => () => {
      chat.setColumn(false);
    },
    [chat],
  );

  // Before the page paints: the board is measured with the column's room left already.
  useLayoutEffect(() => {
    if (!column) return undefined;
    const root = document.documentElement;
    root.dataset.chatColumn = open ? "open" : "rail";
    return () => {
      delete root.dataset.chatColumn;
    };
  }, [column, open]);

  const quiet = open || muted || bubble !== null || reaction !== null || unread === 0;
  const buttonInView = useButtonInView(button, visible && !quiet && !column);

  if (!visible) return null;
  const say =
    announced === null || open || muted
      ? ""
      : `${t("announce", {
          name: announced.message.name,
          text: bodyText(announced.message.body),
        })}${announced.count % 2 === 0 ? REPEAT_MARK : ""}`;

  const collapse = () => {
    writeChatColumn(CHAT_COLUMN.Collapsed);
    setMove("collapse");
    chat.setOpen(false);
  };
  const expand = () => {
    writeChatColumn(CHAT_COLUMN.Open);
    setMove("expand");
    chat.setOpen(true);
  };

  let panel: ReactNode = null;
  if (open && layout === CHAT_LAYOUT.Column) {
    panel = (
      <ChatPanel
        chat={chat}
        snapshot={snapshot}
        layout={layout}
        keyboard={false}
        focusOnMount={move === "expand"}
        onClose={collapse}
        className={cn(CHAT_COLUMN_PLACE, "w-72 motion-safe:animate-chat-fade")}
      />
    );
  } else if (open && layout === CHAT_LAYOUT.Dock) {
    const place = dockPlace(dock, over);
    panel = (
      <ChatPanel
        chat={chat}
        snapshot={snapshot}
        layout={layout}
        keyboard={false}
        focusOnMount
        style={place.style}
        className={cn(place.className, "motion-safe:animate-chat-fade")}
      />
    );
  } else if (open) {
    panel = (
      <ChatDialog chat={chat} label={t("title")}>
        {(keyboard) => (
          <ChatPanel
            chat={chat}
            snapshot={snapshot}
            layout={layout}
            keyboard={keyboard}
            focusOnMount
            className="size-full animate-chat-fade"
          />
        )}
      </ChatDialog>
    );
  }

  return createPortal(
    <div data-game={gameId ?? undefined} data-chat-layer="">
      {panel}
      {column && !open && (
        <ChatRail chat={chat} focusOnMount={move === "collapse"} onExpand={expand} />
      )}
      {/* Out of reach under the throw, as what it covers is. */}
      <div inert={play?.held === true || undefined}>
        {!open && bubble !== null && (
          <ChatBubble chat={chat} message={bubble} unread={unread} layout={layout} dock={dock} />
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
        {!quiet && !column && !buttonInView && <ChatPeek chat={chat} snapshot={snapshot} />}
      </div>
      <p aria-live="polite" className="sr-only">
        {say}
      </p>
    </div>,
    document.body,
  );
}
