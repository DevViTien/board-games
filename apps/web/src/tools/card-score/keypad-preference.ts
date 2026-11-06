"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import { CARD_SCORE_KEYBOARD_KEY } from "@/config/storage-keys";

const COARSE = "(pointer: coarse)";

function subscribe(onChange: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => undefined;
  const query = window.matchMedia(COARSE);
  query.addEventListener("change", onChange);
  return () => {
    query.removeEventListener("change", onChange);
  };
}

function isCoarse(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(COARSE).matches;
}

function readPrefersKeyboard(): boolean {
  try {
    return window.localStorage.getItem(CARD_SCORE_KEYBOARD_KEY) === "true";
  } catch {
    return false;
  }
}

function writePrefersKeyboard(prefers: boolean): void {
  try {
    if (prefers) window.localStorage.setItem(CARD_SCORE_KEYBOARD_KEY, "true");
    else window.localStorage.removeItem(CARD_SCORE_KEYBOARD_KEY);
  } catch {
    // Blocked storage: the choice lasts until the screen closes.
  }
}

export interface KeypadPreference {
  /** The device's main pointer is a finger: the keypad is on offer. */
  readonly coarse: boolean;
  readonly showKeypad: boolean;
  readonly toggle: () => void;
}

/**
 * Whether the round screen shows its keypad. The player can change to the device's own keyboard at
 * any time: the way out for a screen reader, dictation, a tablet with a keyboard attached.
 */
export function useKeypadPreference(): KeypadPreference {
  const coarse = useSyncExternalStore(subscribe, isCoarse, () => false);
  const [prefersKeyboard, setPrefersKeyboard] = useState(readPrefersKeyboard);
  const toggle = useCallback(() => {
    setPrefersKeyboard((current) => {
      writePrefersKeyboard(!current);
      return !current;
    });
  }, []);
  return { coarse, showKeypad: coarse && !prefersKeyboard, toggle };
}
