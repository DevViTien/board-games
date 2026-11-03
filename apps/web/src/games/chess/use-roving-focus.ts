"use client";

import {
  CHESS_COLOR,
  type ChessColor,
  type ChessSquare,
  chessSquareName,
} from "@board-games/games/chess";
import { type FocusEvent, type KeyboardEvent, type RefObject, useState } from "react";

/** A square's place on screen: row 0 at the top, column 0 on the left. */
interface ScreenPlace {
  readonly row: number;
  readonly col: number;
}

/** The square shown at a place on screen, with `bottom`'s side at the bottom. */
export function squareAtPlace({ row, col }: ScreenPlace, bottom: ChessColor): ChessSquare {
  return bottom === CHESS_COLOR.White
    ? chessSquareName(col, 7 - row)
    : chessSquareName(7 - col, row);
}

/** Where a square is shown, with `bottom`'s side at the bottom. */
export function placeOfSquare(square: ChessSquare, bottom: ChessColor): ScreenPlace {
  const file = square.charCodeAt(0) - "a".charCodeAt(0);
  const rank = Number(square[1]) - 1;
  return bottom === CHESS_COLOR.White ? { row: 7 - rank, col: file } : { row: rank, col: 7 - file };
}

/**
 * The square a key moves the focus to, as the board is shown (an arrow goes the way it points on
 * screen, the board flipped or not), or `null` for any other key. Stops at the edges.
 */
function squareAfterKey(key: string, square: ChessSquare, bottom: ChessColor): ChessSquare | null {
  const { row, col } = placeOfSquare(square, bottom);
  const at = (r: number, c: number) =>
    squareAtPlace({ row: Math.min(Math.max(r, 0), 7), col: Math.min(Math.max(c, 0), 7) }, bottom);
  switch (key) {
    case "ArrowUp":
      return at(row - 1, col);
    case "ArrowDown":
      return at(row + 1, col);
    case "ArrowLeft":
      return at(row, col - 1);
    case "ArrowRight":
      return at(row, col + 1);
    case "Home":
      return at(row, 0);
    case "End":
      return at(row, 7);
    default:
      return null;
  }
}

/** The square a grid event happened on, from the `data-square` of its button. */
export function squareOf(target: EventTarget): ChessSquare | null {
  if (!(target instanceof Element)) return null;
  const value = target.closest<HTMLElement>("[data-square]")?.dataset.square;
  return value === undefined ? null : (value as ChessSquare);
}

/** Focuses the button of `square` inside `grid`. */
export function focusSquare(grid: HTMLElement | null, square: ChessSquare): void {
  grid?.querySelector<HTMLElement>(`[data-square="${square}"]`)?.focus();
}

interface RovingFocus {
  /** The one square of the grid in the Tab order. */
  readonly tabStop: ChessSquare;
  readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  readonly onFocus: (event: FocusEvent<HTMLElement>) => void;
}

/**
 * The grid as one Tab stop (roving tabindex): Tab enters on the square focused last, else on
 * `fallback`; arrows, Home and End move the focus as the board is shown. A key held down is not
 * repeated (holding Enter must not open the promotion picker and pick in it at once).
 */
export function useRovingFocus(
  grid: RefObject<HTMLElement | null>,
  bottom: ChessColor,
  fallback: ChessSquare,
): RovingFocus {
  const [focused, setFocused] = useState<ChessSquare | null>(null);
  return {
    tabStop: focused ?? fallback,
    onKeyDown: (event) => {
      if (event.repeat) {
        event.preventDefault();
        return;
      }
      const square = squareOf(event.target);
      if (square === null) return;
      const next = squareAfterKey(event.key, square, bottom);
      if (next === null) return;
      event.preventDefault();
      setFocused(next);
      focusSquare(grid.current, next);
    },
    onFocus: (event) => {
      const square = squareOf(event.target);
      if (square !== null) setFocused(square);
    },
  };
}
