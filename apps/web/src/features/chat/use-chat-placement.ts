"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/** Where the chat goes: a sheet from below, a column beside the board, or over the controls. */
export const CHAT_LAYOUT = {
  Phone: "phone",
  /** A phone turned sideways: the same query as the `short-landscape:` variant of `styles.css`. */
  Landscape: "landscape",
  Desktop: "desktop",
} as const;
export type ChatLayout = (typeof CHAT_LAYOUT)[keyof typeof CHAT_LAYOUT];

const LANDSCAPE_QUERY = "(orientation: landscape) and (max-height: 32rem)";
const DESKTOP_QUERY = "(min-width: 1024px)";
/**
 * Room for the panel beside the lobby's column: a 576 px column in the middle, 320 px and 24 px on
 * the right. Narrower, the panel would cover the players and its own button: a sheet, as on a phone.
 */
const LOBBY_BESIDE_QUERY = "(min-width: 1264px)";

function matches(query: string): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(query).matches;
}

function currentLayout(inLobby: boolean): ChatLayout {
  if (matches(LANDSCAPE_QUERY)) return CHAT_LAYOUT.Landscape;
  if (!matches(DESKTOP_QUERY) || (inLobby && !matches(LOBBY_BESIDE_QUERY)))
    return CHAT_LAYOUT.Phone;
  return CHAT_LAYOUT.Desktop;
}

function subscribeLayout(listener: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => undefined;
  const queries = [LANDSCAPE_QUERY, DESKTOP_QUERY, LOBBY_BESIDE_QUERY].map((query) =>
    window.matchMedia(query),
  );
  for (const query of queries) query.addEventListener("change", listener);
  return () => {
    for (const query of queries) query.removeEventListener("change", listener);
  };
}

export function useChatLayout(inLobby: boolean): ChatLayout {
  return useSyncExternalStore(
    subscribeLayout,
    () => currentLayout(inLobby),
    () => CHAT_LAYOUT.Phone,
  );
}

/** Whether `element` lies over the board where it is on screen now. */
export function liesOverBoard(element: Element | null): boolean {
  const board = document.querySelector("[data-play-board]")?.getBoundingClientRect();
  const box = element?.getBoundingClientRect();
  if (board === undefined || box === undefined || board.width === 0 || box.width === 0)
    return false;
  return (
    box.left < board.right &&
    board.left < box.right &&
    box.top < board.bottom &&
    board.top < box.bottom
  );
}

/** Whether the main pointer is a finger: then opening the chat must not bring up the keyboard. */
export function isTouchScreen(): boolean {
  return matches("(pointer: coarse)");
}

/** Not in every browser's every context, whatever the types say. */
function currentViewport(): VisualViewport | null {
  return "visualViewport" in window ? window.visualViewport : null;
}

/**
 * How much of the bottom of the page the on-screen keyboard covers, from the visual viewport:
 * `interactive-widget` does not exist on iOS Safari, and the page itself must not resize or the
 * board would jump. Pinching to zoom shrinks the visual viewport as well: that is no keyboard.
 */
export function readKeyboardHeight(): number {
  const viewport = currentViewport();
  if (viewport === null || viewport.scale > 1.01) return 0;
  return Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop));
}

export function useKeyboardHeight(active: boolean): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const viewport = currentViewport();
    if (viewport === null) return undefined;
    const update = () => {
      setHeight(readKeyboardHeight());
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, [active]);
  return active ? height : 0;
}

/** A sheet on a phone: 48 % of what the keyboard leaves. */
const SHEET_SHARE = 0.48;
/** At least this much of the sheet, and of the board above it, whatever happens to the other. */
const SHEET_MIN_PX = 240;
const BOARD_LEFT_IN_VIEW_PX = 96;

/**
 * How tall the sheet is. Without a keyboard, lower when the board starts low on the screen, so part
 * of it stays in view: the board never moves for the chat. With one, the field and the latest
 * message matter more.
 */
export function sheetHeight(viewportHeight: number, keyboard: number, boardTop: number | null) {
  const base = Math.round((viewportHeight - keyboard) * SHEET_SHARE);
  if (keyboard > 0 || boardTop === null) return base;
  return Math.min(
    base,
    Math.max(SHEET_MIN_PX, Math.round(viewportHeight - boardTop - BOARD_LEFT_IN_VIEW_PX)),
  );
}

/**
 * The room to scroll the whole board above the sheet: it lengthens the page below, so nothing above
 * moves. Closing keeps it while the page is scrolled into it, or the browser would pull the board
 * back; it goes as soon as the player has scrolled out.
 */
export function useSheetSpacer(wanted: number): number {
  const [height, setHeight] = useState(wanted);
  useEffect(() => {
    const settle = () => {
      setHeight((current) => {
        if (wanted >= current) return wanted;
        const root = document.documentElement;
        const furthest = root.scrollHeight - current + wanted - window.innerHeight;
        return window.scrollY > furthest ? current : wanted;
      });
    };
    settle();
    window.addEventListener("scroll", settle, { passive: true });
    return () => {
      window.removeEventListener("scroll", settle);
    };
  }, [wanted]);
  return height;
}

export interface DockBox {
  readonly left: number;
  /** From the top of the page, not of the screen. */
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The box of the play screen's column the chat goes in (`data-chat-dock`, a grid item of no height
 * of its own), measured whenever it may change: the grid's rows change with the words in them. The
 * chat stays in a portal, so that the field keeps its focus as the game replaces the lobby.
 */
export function useChatDock(active: boolean, over: boolean, button: unknown): DockBox | null {
  const [box, setBox] = useState<DockBox | null>(null);

  const measure = useCallback(() => {
    const dock = document.querySelector("[data-chat-dock]");
    const rect = dock?.getBoundingClientRect();
    if (rect === undefined || rect.width === 0) {
      setBox(null);
      return;
    }
    setBox((current) => {
      const next = {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
      };
      return current?.left === next.left &&
        current.top === next.top &&
        current.width === next.width &&
        current.height === next.height
        ? current
        : next;
    });
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the box can only be measured once rendered
    measure();
    window.addEventListener("resize", measure);
    const dock = document.querySelector("[data-chat-dock]");
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (dock !== null) observer?.observe(dock);
    observer?.observe(document.documentElement);
    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
    // The game's result moves the dock; the button comes with the play screen that holds the dock.
  }, [active, measure, over, button]);

  return active ? box : null;
}
