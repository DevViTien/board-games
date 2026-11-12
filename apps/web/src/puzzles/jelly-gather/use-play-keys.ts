"use client";

import { useLayoutEffect, useRef } from "react";

import { DIRECTION, type Direction } from "./rules/types";

const KEY_DIRECTION: Readonly<Record<string, Direction>> = {
  ArrowUp: DIRECTION.Up,
  ArrowDown: DIRECTION.Down,
  ArrowLeft: DIRECTION.Left,
  ArrowRight: DIRECTION.Right,
  w: DIRECTION.Up,
  s: DIRECTION.Down,
  a: DIRECTION.Left,
  d: DIRECTION.Right,
};

export interface PlayKeys {
  readonly move: (direction: Direction) => void;
  readonly undo: () => void;
  readonly restart: () => void;
}

/**
 * Whether a key press is for someone else (design §7): a field being typed in, an open dialog, a
 * menu of the top bar (which handles its own arrows and letters), or a handler that took it.
 */
function belongsElsewhere(event: KeyboardEvent): boolean {
  if (event.defaultPrevented) return true;
  const target = event.target instanceof Element ? event.target : null;
  if (target === null) return false;
  if (target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) {
    return true;
  }
  if (target.closest('dialog[open], [role="menu"], [role="dialog"]')) return true;
  try {
    return document.querySelector(":popover-open") !== null;
  } catch {
    // A browser (or jsdom) without popovers has none open.
    return false;
  }
}

/**
 * Arrows or W A S D move, Z (or Ctrl/⌘ + Z) undoes, R restarts, while the play screen is open.
 * Any other modifier leaves the key to the browser (⌘ R reloads, Ctrl D bookmarks). Holding a
 * direction repeats it; holding R does not.
 */
export function usePlayKeys(keys: PlayKeys, enabled: boolean): void {
  const latest = useRef(keys);
  useLayoutEffect(() => {
    latest.current = keys;
  });

  // Before the screen is painted: a key pressed as soon as the level shows is not lost.
  useLayoutEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (belongsElsewhere(event)) return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const command = event.ctrlKey || event.metaKey;
      if (command && !event.shiftKey && !event.altKey && key === "z") {
        event.preventDefault();
        latest.current.undo();
        return;
      }
      if (command || event.altKey || event.shiftKey) return;
      const direction = KEY_DIRECTION[key];
      if (direction !== undefined) {
        event.preventDefault();
        latest.current.move(direction);
      } else if (key === "z") {
        latest.current.undo();
      } else if (key === "r" && !event.repeat) {
        latest.current.restart();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [enabled]);
}
