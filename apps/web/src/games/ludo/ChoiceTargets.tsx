"use client";

import { type KeyboardEvent, type Ref, useState } from "react";

import { toFramePercent } from "./board-geometry";
import type { Point } from "./board-layout";

interface ChoiceTarget {
  readonly horse: number;
  /** What it does, read as its name ("Ngựa 2: ra chuồng, đá ngựa Vàng"). */
  readonly label: string;
  /** The horse's visual centre on the board. */
  readonly centre: Point;
}

interface ChoiceTargetsProps {
  readonly label: string;
  readonly choices: readonly ChoiceTarget[];
  readonly onChoose: (horse: number) => void;
  /** The choice to preview (focused), or `null`. */
  readonly onPreview: (horse: number | null) => void;
  /** The first choice, for the focus after a roll. */
  readonly firstRef: Ref<HTMLButtonElement>;
}

const KEY_STEP: Readonly<Record<string, number>> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

/**
 * The horses that may move, as buttons laid over them (design of redesign-ludo-play §5): see-through,
 * centred on each horse's figure, at least 24 × 24 px (about 30 px on a 360 px screen), one stop of
 * Tab for the group and the arrow keys from one to the next. A touch or a click goes through them
 * (`pointer-events: none`) to the board, which takes the horse nearest it; the keyboard and screen
 * readers press them.
 */
export function ChoiceTargets({
  label,
  choices,
  onChoose,
  onPreview,
  firstRef,
}: ChoiceTargetsProps) {
  const [active, setActive] = useState(0);
  const current = active < choices.length ? active : 0;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
    const index = buttons.findIndex((button) => button === document.activeElement);
    let next: number | null = null;
    const step = KEY_STEP[event.key];
    if (step !== undefined) next = (index + step + buttons.length) % buttons.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = buttons.length - 1;
    if (next === null) return;
    event.preventDefault();
    buttons[next]?.focus();
  }

  return (
    <div
      role="group"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="pointer-events-none absolute inset-0"
    >
      {choices.map((choice, index) => {
        const { left, top } = toFramePercent(choice.centre);
        return (
          <button
            key={choice.horse}
            ref={index === 0 ? firstRef : undefined}
            type="button"
            data-ludo-choice=""
            data-horse={choice.horse}
            aria-label={choice.label}
            tabIndex={index === current ? 0 : -1}
            // Where the horse is: geometry from the game, not a look.
            style={{ left: `${left}%`, top: `${top}%` }}
            className="pointer-events-none focus-ring absolute aspect-square w-[max(24px,calc(100%*1.36/15))] -translate-1/2 rounded-full bg-transparent"
            onClick={(event) => {
              // A press from the keyboard or a screen reader; the board takes every touch itself.
              event.stopPropagation();
              onChoose(choice.horse);
            }}
            onFocus={() => {
              // Only the keyboard (or a script after a roll from it) focuses these buttons: a
              // touch goes through them.
              setActive(index);
              onPreview(choice.horse);
            }}
            onBlur={() => {
              onPreview(null);
            }}
          />
        );
      })}
    </div>
  );
}
