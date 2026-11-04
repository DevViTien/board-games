"use client";

import { useId } from "react";

import { Button } from "./Button";
import { DialogFrame } from "./DialogFrame";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  /** Also called when the player presses Esc. */
  onCancel: () => void;
  /**
   * Why the confirm button cannot be pressed right now (the connection is lost), shown under the
   * question; the button stays focusable (`aria-disabled`) and does nothing. Absent: it can.
   */
  confirmUnavailableReason?: string | undefined;
}

/**
 * A modal question in the shared `DialogFrame` (the native `<dialog>`): Esc cancels. Texts arrive
 * already translated.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  confirmUnavailableReason,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const reasonId = useId();
  const unavailable = confirmUnavailableReason !== undefined;

  return (
    <DialogFrame
      open={open}
      onDismiss={onCancel}
      labelledBy={titleId}
      describedBy={description === undefined ? undefined : descriptionId}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-card border border-border p-6"
    >
      <h2 id={titleId} className="text-heading">
        {title}
      </h2>
      {description !== undefined && (
        <p id={descriptionId} className="mt-2 text-body text-fg-muted">
          {description}
        </p>
      )}
      {/* Cancel comes first: showModal() focuses it, so Enter right away never discards anything. */}
      {unavailable && (
        <p id={reasonId} className="mt-3 text-small text-fg-muted">
          {confirmUnavailableReason}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button
          aria-disabled={unavailable}
          aria-describedby={unavailable ? reasonId : undefined}
          onClick={() => {
            if (!unavailable) onConfirm();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </DialogFrame>
  );
}
