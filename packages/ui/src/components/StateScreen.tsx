"use client";

import { cva } from "class-variance-authority";
import { type ReactNode, useCallback } from "react";

import { cn } from "../lib/cn";
import { LogoMark } from "./LogoMark";

type StateTone = "neutral" | "danger" | "warning";

const artFrame = cva(
  "grid size-24 place-items-center rounded-card border-2 bg-surface shadow-card",
  {
    variants: {
      tone: {
        neutral: "border-border",
        danger: "border-danger",
        warning: "border-warning",
      },
    },
  },
);

interface StateScreenProps {
  /** Already translated: the page's title, or what is loading. */
  readonly title: string;
  /** Already translated: what happened and what to do. */
  readonly description?: ReactNode;
  /** The ways on: links and buttons, the main one first. */
  readonly children?: ReactNode;
  /** The picture; the app's mark by default, set askew for a `danger` or `warning` screen. */
  readonly art?: ReactNode;
  readonly tone?: StateTone;
  /**
   * Something is loading: the title is the page's status line (`role="status"`, announced when it
   * changes) instead of its heading, and the picture pulses unless motion is reduced.
   */
  readonly busy?: boolean;
  /**
   * The page replaces another one in the browser (the lobby, the game, "joining"), whose focused
   * button is gone: the title takes the focus, so the keyboard and screen readers start here.
   */
  readonly focusTitle?: boolean;
  /** The page's top bar (`TopBar`), above the screen: the way back and the settings. */
  readonly topBar?: ReactNode;
}

/**
 * A whole screen about a state rather than content: loading, not found, failed. It always says
 * what is going on in words and, unless loading, offers a way on.
 */
export function StateScreen({
  title,
  description,
  children,
  art,
  tone = "neutral",
  busy = false,
  focusTitle = false,
  topBar,
}: StateScreenProps) {
  const titleRef = useCallback(
    (heading: HTMLHeadingElement | null) => {
      if (focusTitle) heading?.focus();
    },
    [focusTitle],
  );

  return (
    <>
      {topBar}
      <main className="mx-auto flex min-h-[70dvh] max-w-xl flex-col items-center justify-center gap-6 py-14 px-safe-4 text-center">
        <div className={artFrame({ tone })}>
          {art ?? <LogoMark tone={tone} pulse={busy} className="size-12" />}
        </div>
        <div className="flex flex-col items-center gap-2">
          {busy ? (
            <p role="status" className="text-heading">
              {title}
            </p>
          ) : (
            <h1
              ref={titleRef}
              tabIndex={focusTitle ? -1 : undefined}
              className={cn("text-title text-balance", focusTitle && "focus:outline-none")}
            >
              {title}
            </h1>
          )}
          {description !== undefined && (
            <p className="max-w-prose text-body text-pretty text-fg-muted">{description}</p>
          )}
        </div>
        {children !== undefined && (
          <div className="flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center">
            {children}
          </div>
        )}
      </main>
    </>
  );
}
