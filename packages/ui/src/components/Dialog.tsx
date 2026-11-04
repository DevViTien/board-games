"use client";

import { type ReactNode, useId, useRef } from "react";

import { XIcon } from "../icons";
import { cn } from "../lib/cn";
import { Button } from "./Button";
import { DialogFrame } from "./DialogFrame";

export interface DialogProps {
  readonly open: boolean;
  /** Already translated: the dialog's title, its accessible name. */
  readonly title: string;
  /** Already translated: the name of the close button ("Close"). */
  readonly closeLabel: string;
  /** Called by the close button, Esc, or the browser closing the dialog by itself. */
  readonly onClose: () => void;
  /** The content, which scrolls under the title when it is long. */
  readonly children?: ReactNode;
  readonly className?: string | undefined;
}

/**
 * A modal dialog of content (the rules of a game): a title, a close button and a body that
 * scrolls. The whole screen on a phone, a centred panel from 640 px. The title takes the focus
 * when it opens, so a screen reader reads from the top; closing gives the focus back to the button
 * that opened it (the native `<dialog>`'s own behaviour).
 */
export function Dialog({ open, title, closeLabel, onClose, children, className }: DialogProps) {
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);

  return (
    <DialogFrame
      open={open}
      onDismiss={onClose}
      labelledBy={titleId}
      initialFocus={titleRef}
      className={cn(
        // `open:flex`, never `flex`: a closed dialog must keep the browser's `display: none`.
        "m-0 h-dvh max-h-none w-full max-w-none flex-col overflow-hidden border-0 p-0 open:flex",
        "sm:m-auto sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)] sm:max-w-2xl sm:rounded-card sm:border sm:border-border",
        className,
      )}
    >
      {/* The whole screen on a phone: its words and close button inside the safe area. */}
      <header className="flex items-center gap-2 border-b border-border py-2 pr-[max(0.5rem,var(--safe-right))] pl-[max(1rem,var(--safe-left))] max-sm:pt-[calc(var(--safe-top)+0.5rem)] sm:pr-2 sm:pl-6">
        {/* Focusable by script only: where the focus goes when the dialog opens. */}
        <h2
          id={titleId}
          ref={titleRef}
          tabIndex={-1}
          className="min-w-0 flex-1 text-heading text-balance focus:outline-none"
        >
          {title}
        </h2>
        <Button variant="ghost" size="icon" aria-label={closeLabel} onClick={onClose}>
          <XIcon aria-hidden className="size-5" />
        </Button>
      </header>
      {/* Focusable, so the keyboard scrolls it too (the focus starts on the title, outside it). */}
      <div
        role="region"
        aria-labelledby={titleId}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrolling region the keyboard must reach (WCAG 2.1.1)
        tabIndex={0}
        className="focus-ring min-h-0 flex-1 overflow-y-auto overscroll-contain pt-4 px-safe-4 pb-safe-4 sm:p-6"
      >
        {children}
      </div>
    </DialogFrame>
  );
}
