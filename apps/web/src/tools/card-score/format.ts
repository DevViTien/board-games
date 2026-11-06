"use client";

import { cn } from "@board-games/ui";
import { useFormatter } from "next-intl";
import { useCallback } from "react";

/** A score with its sign, "+12", "−5", "0": the sign says it, not the colour alone. */
export function useScoreFormat(): (score: number) => string {
  const format = useFormatter();
  return useCallback(
    (score: number) => format.number(score, { signDisplay: "exceptZero" }).replace("-", "−"),
    [format],
  );
}

/**
 * When something was saved, on this device's clock: the app's fixed time zone is for what the server
 * renders, and this only renders after reading the browser's storage.
 */
export function useLocalTimeFormat(): {
  readonly time: (iso: string) => string;
  readonly dateTime: (iso: string) => string;
  readonly date: (at: Date) => string;
} {
  const format = useFormatter();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    time: (iso) => format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit", timeZone }),
    dateTime: (iso) =>
      format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short", timeZone }),
    date: (at) => format.dateTime(at, { dateStyle: "medium", timeZone }),
  };
}

/** The colour of a score, beside its sign. */
export function scoreClass(score: number): string {
  return cn(score > 0 && "text-success-ink", score < 0 && "text-danger-ink");
}
