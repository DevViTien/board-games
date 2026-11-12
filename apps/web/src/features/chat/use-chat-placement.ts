"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/**
 * Where the chat goes (design §1 of `rework-chat-layout`): a column at the right of a wide screen, a
 * panel over the words of the column beside the board on a small laptop, or a dialog over the whole
 * screen everywhere else.
 */
export const CHAT_LAYOUT = {
  Column: "column",
  Dock: "dock",
  Dialog: "dialog",
} as const;
export type ChatLayout = (typeof CHAT_LAYOUT)[keyof typeof CHAT_LAYOUT];

/** A phone turned sideways: the same query as the `short-landscape:` variant of `styles.css`. */
const LANDSCAPE_QUERY = "(orientation: landscape) and (max-height: 32rem)";
/** Room for the column without squeezing the board (design §3): the `xl:` of Tailwind. */
const COLUMN_QUERY = "(min-width: 1280px)";
/** Room for the panel over the column beside the board: the `lg:` of Tailwind. */
const DOCK_QUERY = "(min-width: 1024px)";

function matches(query: string): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(query).matches;
}

function currentLayout(inLobby: boolean): ChatLayout {
  if (matches(LANDSCAPE_QUERY)) return CHAT_LAYOUT.Dialog;
  if (matches(COLUMN_QUERY)) return CHAT_LAYOUT.Column;
  if (!inLobby && matches(DOCK_QUERY)) return CHAT_LAYOUT.Dock;
  return CHAT_LAYOUT.Dialog;
}

function subscribeLayout(listener: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => undefined;
  const queries = [LANDSCAPE_QUERY, COLUMN_QUERY, DOCK_QUERY].map((query) =>
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
    () => CHAT_LAYOUT.Dialog,
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

/** Where the screen is seen now, from the top of the layout viewport. */
export interface ViewportBox {
  readonly top: number;
  readonly height: number;
}

/**
 * The part of the page seen now, from the visual viewport: the on-screen keyboard covers the rest,
 * and `interactive-widget` does not exist on iOS Safari, so the dialog follows this instead of the
 * page resizing. Pinching to zoom shrinks the visual viewport as well: that is no keyboard.
 */
export function readViewportBox(): ViewportBox {
  const viewport = currentViewport();
  if (viewport === null || viewport.scale > 1.01) return { top: 0, height: window.innerHeight };
  return { top: Math.round(viewport.offsetTop), height: Math.round(viewport.height) };
}

/** How much of the bottom of the screen the keyboard covers, as `readViewportBox` sees it. */
export function keyboardHeight(box: ViewportBox): number {
  return Math.max(0, window.innerHeight - box.top - box.height);
}

export function useViewportBox(active: boolean): ViewportBox | null {
  const [box, setBox] = useState<ViewportBox | null>(null);
  useEffect(() => {
    if (!active) return undefined;
    const update = () => {
      setBox((current) => {
        const next = readViewportBox();
        return current?.top === next.top && current.height === next.height ? current : next;
      });
    };
    update();
    const viewport = currentViewport();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [active]);
  return active ? box : null;
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
