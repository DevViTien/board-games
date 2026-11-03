"use client";

import {
  type ChessMove,
  type ChessPieceMove,
  type ChessSquare,
  type ChessState,
  isChessDrawClaim,
} from "@board-games/games/chess";
import { useMemo, useState } from "react";

/**
 * What a position is, for a selection: the placement and side to move with the castling and en
 * passant rights (`fen`), and how many moves led there (`san.length`), so the same position reached
 * again by other moves is another one. Compared by content, not by object: online, the state is
 * rebuilt from the room's record on every update of the room (a name, a reconnection) while the
 * position stays.
 */
export function positionKey(state: ChessState): string {
  return `${state.fen}|${state.san.length}`;
}

/** A pawn's move to the last rank waiting for its piece: its four moves differ only by it. */
interface PendingPromotion {
  readonly from: ChessSquare;
  readonly to: ChessSquare;
}

interface Selected {
  readonly key: string;
  readonly from: ChessSquare;
  readonly promotion: ChessSquare | null;
}

export interface Selection {
  /** The legal piece moves, by the square they start from. */
  readonly movesFrom: ReadonlyMap<ChessSquare, readonly ChessPieceMove[]>;
  /** The square of the selected piece, or `null`. */
  readonly from: ChessSquare | null;
  /** The promotion whose piece is being chosen, or `null`. */
  readonly promotion: PendingPromotion | null;
  readonly select: (from: ChessSquare) => void;
  readonly askPromotion: (to: ChessSquare) => void;
  /** Closes the promotion picker and keeps the pawn selected. */
  readonly cancelPromotion: () => void;
  readonly clear: () => void;
}

/**
 * The selected piece and the promotion being chosen, kept while the board shows the same position
 * (`positionKey`) and may be played on. Another position (a move by anyone, undo, a new game), a
 * locked board, or a selection with no legal move left drops both: adjusted during render, so a
 * stale selection is never drawn.
 */
export function useSelection(
  state: ChessState,
  legalMoves: readonly ChessMove[],
  disabled: boolean,
): Selection {
  const key = positionKey(state);
  const movesFrom = useMemo(() => {
    const grouped = new Map<ChessSquare, ChessPieceMove[]>();
    for (const move of legalMoves) {
      if (isChessDrawClaim(move)) continue;
      const moves = grouped.get(move.from);
      if (moves === undefined) grouped.set(move.from, [move]);
      else moves.push(move);
    }
    return grouped;
  }, [legalMoves]);

  const [selected, setSelected] = useState<Selected | null>(null);
  const holds = selected !== null && !disabled && selected.key === key;
  const moves = holds ? movesFrom.get(selected.from) : undefined;
  const kept = moves === undefined ? null : selected;
  // The promotion holds while its moves are still legal.
  const promotionHolds =
    kept?.promotion != null &&
    (moves ?? []).some((move) => move.to === kept.promotion && move.promotion !== undefined);
  const next =
    kept === null
      ? null
      : promotionHolds || kept.promotion === null
        ? kept
        : { ...kept, promotion: null };
  if (next !== selected) setSelected(next);

  return {
    movesFrom,
    from: next?.from ?? null,
    promotion: next?.promotion == null ? null : { from: next.from, to: next.promotion },
    select: (from) => {
      setSelected({ key, from, promotion: null });
    },
    askPromotion: (to) => {
      setSelected((current) => (current === null ? null : { ...current, promotion: to }));
    },
    cancelPromotion: () => {
      setSelected((current) => (current === null ? null : { ...current, promotion: null }));
    },
    clear: () => {
      setSelected(null);
    },
  };
}
