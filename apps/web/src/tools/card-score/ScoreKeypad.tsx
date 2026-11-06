"use client";

import { ArrowDownIcon, cn, DeleteIcon } from "@board-games/ui";
import { useTranslations } from "next-intl";
import type { ComponentProps, PointerEvent, ReactNode } from "react";

export type KeypadKey = "0" | "00" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

interface ScoreKeypadProps {
  readonly onDigits: (digits: KeypadKey) => void;
  readonly onSign: () => void;
  readonly onBack: () => void;
  readonly onNext: () => void;
  readonly onSave: () => void;
  /** Why the round cannot be saved now: its id, the status line's. */
  readonly saveBlockedBy: string | undefined;
  readonly saveLabel: string;
}

const KEY =
  "focus-ring grid touch-manipulation place-items-center border-r border-b border-border bg-surface text-heading font-semibold tabular-nums active:bg-border";

// A press must not take the focus from the score being typed. It acts on click, which a screen
// reader or a switch also fires, so this is no more than keeping the focus where it was.
const keepFocus = (event: PointerEvent) => {
  event.preventDefault();
};

function Key({ className, ...props }: ComponentProps<"button"> & { children: ReactNode }) {
  return (
    <button type="button" onPointerDown={keepFocus} className={cn(KEY, className)} {...props} />
  );
}

const ROWS: readonly (readonly KeypadKey[])[] = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
];

/** The digits, the sign, and the two keys that move on, within reach of the thumb. */
export function ScoreKeypad({
  onDigits,
  onSign,
  onBack,
  onNext,
  onSave,
  saveBlockedBy,
  saveLabel,
}: ScoreKeypadProps) {
  const t = useTranslations("CardScore");
  const digit = (digits: KeypadKey) => (
    <Key
      key={digits}
      onClick={() => {
        onDigits(digits);
      }}
    >
      {digits}
    </Key>
  );
  const [top, middle, bottom] = ROWS;

  return (
    <div
      role="group"
      aria-label={t("keypadLabel")}
      data-keypad=""
      className="grid shrink-0 auto-rows-[3rem] grid-cols-4 border-t border-border pb-[var(--safe-bottom)] short-landscape:w-75 short-landscape:auto-rows-fr short-landscape:border-t-0 short-landscape:border-l"
    >
      {top?.map(digit)}
      <Key aria-label={t("keyBack")} className="bg-surface-muted" onClick={onBack}>
        <DeleteIcon aria-hidden className="size-6" />
      </Key>
      {middle?.map(digit)}
      <Key aria-label={t("keySign")} className="bg-surface-muted font-bold" onClick={onSign}>
        <span aria-hidden>±</span>
      </Key>
      {bottom?.map(digit)}
      <Key
        className="flex items-center justify-center gap-0.5 bg-accent-soft text-small font-bold text-accent-ink"
        onClick={onNext}
      >
        {t("keyNext")}
        <ArrowDownIcon aria-hidden className="size-4" />
      </Key>
      <Key
        className="col-span-2"
        onClick={() => {
          onDigits("0");
        }}
      >
        0
      </Key>
      <Key
        onClick={() => {
          onDigits("00");
        }}
      >
        00
      </Key>
      <Key
        aria-disabled={saveBlockedBy !== undefined}
        aria-describedby={saveBlockedBy}
        className={cn(
          "text-small font-bold",
          saveBlockedBy === undefined
            ? "bg-accent text-accent-fg active:bg-accent-hover"
            : "cursor-not-allowed bg-surface-muted text-fg-muted inset-ring-[1.5px] inset-ring-border-control active:bg-surface-muted",
        )}
        onClick={saveBlockedBy === undefined ? onSave : undefined}
      >
        {saveLabel}
      </Key>
    </div>
  );
}
