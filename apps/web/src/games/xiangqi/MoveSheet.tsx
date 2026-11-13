"use client";

import type { GameResult } from "@board-games/engine";
import { cn } from "@board-games/ui";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { useDescribeNotation } from "./words";

interface MoveSheetProps {
  /** Every move of the game in Vietnamese notation (`state.notes`). */
  readonly notes: readonly string[];
  readonly result: GameResult | null;
  readonly className?: string | undefined;
}

/** The score of a finished game, as written under its moves, and as read out. */
function scoreOf(result: GameResult): {
  readonly shown: string;
  readonly words: "red" | "black" | "draw";
} {
  if (result.kind === "draw") return { shown: "½–½", words: "draw" };
  return result.winners.includes(0)
    ? { shown: "1–0", words: "red" }
    : { shown: "0–1", words: "black" };
}

/**
 * The score sheet (spec "Sổ ghi nước đi Cờ tướng"): the moves numbered in pairs (Đỏ, then Đen) in
 * Vietnamese notation, the newest marked and scrolled to, then the score once the game is over. A
 * scrolling frame that takes the focus (to scroll it with the keys); never a live region: the turn
 * line tells moves. A column on a laptop, a one-line strip on a phone, as the Chess sheet.
 */
export function XiangqiMoveSheet({ notes, result, className }: MoveSheetProps) {
  const t = useTranslations("Games.xiangqi.sheet");
  const describe = useDescribeNotation();
  const frameRef = useRef<HTMLDivElement>(null);
  const finished = result !== null;

  useEffect(() => {
    const frame = frameRef.current;
    if (frame === null) return;
    frame.scrollTop = frame.scrollHeight;
    frame.scrollLeft = frame.scrollWidth;
  }, [notes.length, finished]);

  const rows = Array.from({ length: Math.ceil(notes.length / 2) }, (_unused, index) => ({
    number: index + 1,
    red: notes[index * 2] ?? "",
    black: notes[index * 2 + 1],
  }));
  const last = notes.length - 1;
  const score = result === null ? null : scoreOf(result);
  const move = (note: string, index: number) => (
    <span
      aria-current={index === last ? "true" : undefined}
      className={cn(
        "inline-flex min-h-7 items-center justify-self-start rounded-[6px] px-1.5 font-semibold",
        index === last && "bg-surface-muted font-bold shadow-[inset_0_-2px_0_var(--fg)]",
      )}
    >
      <span aria-hidden>{note}</span>
      <span className="sr-only">{describe(note)}</span>
    </span>
  );

  return (
    <div
      className={cn(
        "min-w-0 rounded-card border border-border bg-surface px-1.5 py-1 lg:px-3 lg:pt-2.5 lg:pb-2",
        className,
      )}
    >
      <h2 className="mb-1.5 text-caption font-bold text-fg-muted max-lg:sr-only">{t("title")}</h2>
      <div
        ref={frameRef}
        role="region"
        aria-label={t("title")}
        tabIndex={0}
        translate="no"
        className={cn(
          "focus-ring relative rounded-[6px] text-small",
          "flex h-9 items-center overflow-x-auto overflow-y-hidden",
          "lg:block lg:h-auto lg:max-h-56 lg:overflow-x-hidden lg:overflow-y-auto",
        )}
      >
        {notes.length === 0 ? (
          <p className="px-1.5 whitespace-nowrap text-fg-muted">{t("empty")}</p>
        ) : (
          <ol className="flex shrink-0 gap-0.5 lg:block">
            {rows.map(({ number, red, black }) => (
              <li
                key={number}
                className="flex shrink-0 items-center whitespace-nowrap lg:grid lg:min-h-7.5 lg:grid-cols-[2.6rem_1fr_1fr] lg:border-b lg:border-border lg:last:border-b-0"
              >
                <span className="pl-1.5 text-caption text-fg-muted tabular-nums lg:pl-0">
                  {number}.
                </span>
                {move(red, number * 2 - 2)}
                {black !== undefined && move(black, number * 2 - 1)}
              </li>
            ))}
          </ol>
        )}
        {score !== null && (
          <p className="shrink-0 px-1.5 font-bold whitespace-nowrap lg:mt-1 lg:pl-[2.6rem]">
            <span aria-hidden>{score.shown}</span>
            <span className="sr-only">{t(`score.${score.words}`)}</span>
          </p>
        )}
      </div>
    </div>
  );
}
