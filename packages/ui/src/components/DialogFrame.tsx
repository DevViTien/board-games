"use client";

import { type ReactNode, type RefObject, useEffect, useRef } from "react";

import { cn } from "../lib/cn";

interface DialogFrameProps {
  readonly open: boolean;
  /** Called when the player dismisses the dialog: Esc, or the browser closing it by itself. */
  readonly onDismiss: () => void;
  /** Id of the element naming the dialog (its title). */
  readonly labelledBy: string;
  /** Id of the element describing the dialog, if any. */
  readonly describedBy?: string | undefined;
  /**
   * The element to focus once the dialog has opened, instead of the first control `showModal()`
   * focuses (a title read from the top, rather than a close button).
   */
  readonly initialFocus?: RefObject<HTMLElement | null> | undefined;
  readonly className?: string | undefined;
  readonly children: ReactNode;
}

/**
 * The frame every modal dialog shares, built on the native `<dialog>`: `showModal()` traps focus
 * and puts the rest of the page out of reach, Esc dismisses it, and closing gives the focus back to
 * what had it before (the browser's own behaviour), without a dialog library. The parent owns
 * `open`.
 */
export function DialogFrame({
  open,
  onDismiss,
  labelledBy,
  describedBy,
  initialFocus,
  className,
  children,
}: DialogFrameProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (open && !dialog.open) {
      dialog.showModal();
      initialFocus?.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open, initialFocus]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      // Esc fires `cancel`; the parent owns `open`, so let it close the dialog.
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
      // The browser may also close the dialog by itself: Chromium's close watcher skips `cancel`
      // for a repeated Esc without user activation. Tell the parent, or `open` stays true and the
      // dialog can never be opened again. A close the parent asked for arrives with `open` false.
      onClose={() => {
        if (open) onDismiss();
      }}
      className={cn("bg-surface text-fg shadow-raised backdrop:bg-overlay", className)}
    >
      {children}
    </dialog>
  );
}
