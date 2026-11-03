"use client";

import {
  CHESS_PROMOTION_PIECES,
  type ChessColor,
  type ChessPromotionPiece,
  type ChessSquare,
} from "@board-games/games/chess";
import { Button, cn } from "@board-games/ui";
import { useTranslations } from "next-intl";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";

import { ChessPiece } from "./pieces";

export interface PromotionRequest {
  readonly from: ChessSquare;
  readonly to: ChessSquare;
  /** The side of the pawn, for the colour of the pieces shown. */
  readonly colour: ChessColor;
}

interface PromotionPickerProps {
  /** The promotion to choose a piece for, or `null`: closed. The parent owns it. */
  readonly request: PromotionRequest | null;
  readonly onChoose: (piece: ChessPromotionPiece) => void;
  /** Esc, "Cancel", or the browser closing the dialog by itself: no move. */
  readonly onCancel: () => void;
  /**
   * After the dialog closed, however it closed: Safari does not give the focus back to what had it
   * before, so the parent moves it (to the square the pawn was going to).
   */
  readonly onClosed: () => void;
}

/**
 * Which piece a pawn becomes (design §6): a modal `<dialog>` (`showModal()` traps the focus) titled
 * by the move ("Tốt g2 → g1"), with the four pieces in the colour of the pawn's side, the queen
 * focused first, and "Cancel". It closes the way `ConfirmDialog` does: the parent owns `request`,
 * Esc cancels, and a close the browser makes by itself (Chromium's close watcher) is a cancel too.
 * Never chooses for the player.
 */
export function PromotionPicker({ request, onChoose, onCancel, onClosed }: PromotionPickerProps) {
  const t = useTranslations("Games.chess");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const queenRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  // What the dialog shows while it closes, so its words never go blank before it is gone.
  const [shown, setShown] = useState(request);
  if (
    request !== null &&
    (request.from !== shown?.from || request.to !== shown.to || request.colour !== shown.colour)
  ) {
    setShown(request);
  }
  const open = request !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Explicitly: the first focusable element of a dialog differs between browsers.
      queenRef.current?.focus();
    }
    if (!open && dialog.open) {
      dialog.close();
      onClosed();
    }
  }, [open, onClosed]);

  // Arrows move between the four pieces, as in a row of choices (Tab still goes through them).
  function handleChoiceKey(event: KeyboardEvent<HTMLDivElement>) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (step === 0) return;
    const choices = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
    const index = choices.findIndex((choice) => choice === document.activeElement);
    if (index === -1) return;
    event.preventDefault();
    choices[(index + step + choices.length) % choices.length]?.focus();
  }

  // A key held down on the board (Enter on the square) must not pick a piece as it repeats here.
  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.repeat && event.key !== "Escape") event.preventDefault();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onKeyDown={handleKeyDown}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClose={() => {
        if (open) {
          onCancel();
          onClosed();
        }
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md overscroll-contain rounded-card border border-border bg-surface p-5 text-fg shadow-raised backdrop:bg-overlay"
    >
      {shown !== null && (
        <>
          <h2 id={titleId} className="text-heading">
            {t("promotion.title", { from: shown.from, to: shown.to })}
          </h2>
          <p id={descriptionId} className="mt-1 text-small text-fg-muted">
            {t("promotion.description")}
          </p>
          <div className="mt-4 grid grid-cols-4 gap-2.5" onKeyDown={handleChoiceKey}>
            {CHESS_PROMOTION_PIECES.map((piece, index) => (
              <button
                key={piece}
                ref={index === 0 ? queenRef : undefined}
                type="button"
                onClick={() => {
                  onChoose(piece);
                }}
                className={cn(
                  "focus-ring flex min-h-16 cursor-pointer flex-col items-center gap-1 rounded-control border-[1.5px] border-game-line bg-game-board px-1 pt-2.5 pb-2 text-small font-semibold text-(--chess-coord)",
                  "hover:bg-(--chess-mark-light)",
                )}
              >
                <ChessPiece type={piece} look={shown.colour} className="size-12 sm:size-14" />
                {t(`promotion.choice.${piece}`)}
              </button>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              {t("promotion.cancel")}
            </Button>
          </div>
        </>
      )}
    </dialog>
  );
}
