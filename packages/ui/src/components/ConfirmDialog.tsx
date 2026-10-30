"use client";

import { useEffect, useId, useRef } from "react";

import { Button } from "./Button";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  /** Also called when the player presses Esc. */
  onCancel: () => void;
}

/**
 * A modal question built on the native `<dialog>`: `showModal()` traps focus and puts the rest of
 * the page out of reach, and Esc cancels, without a dialog library. Texts arrive already translated.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description === undefined ? undefined : descriptionId}
      // Esc fires `cancel`; the parent owns `open`, so let it close the dialog.
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      // The browser may also close the dialog by itself: Chromium's close watcher skips `cancel`
      // for a repeated Esc without user activation. Tell the parent, or `open` stays true and the
      // dialog can never be opened again. A close the parent asked for arrives with `open` false.
      onClose={() => {
        if (open) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-card border border-border bg-surface p-6 text-fg shadow-lg backdrop:bg-overlay"
    >
      <h2 id={titleId} className="text-lg font-semibold">
        {title}
      </h2>
      {description !== undefined && (
        <p id={descriptionId} className="mt-2 text-sm text-fg-muted">
          {description}
        </p>
      )}
      {/* Cancel comes first: showModal() focuses it, so Enter right away never discards anything. */}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </dialog>
  );
}
