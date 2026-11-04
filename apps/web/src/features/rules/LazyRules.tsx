"use client";

import type { RegisteredGameId } from "@board-games/games/ids";
import { Button } from "@board-games/ui";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import type { Locale } from "@/i18n/config";

import type { LoadedRules } from "./load-rules";

/** Loads `load-rules.ts` itself on demand: its code, like the rules, stays out of the page's bundle. */
function loadRulesLazily(gameId: RegisteredGameId, locale: Locale): Promise<LoadedRules> {
  return import("./load-rules").then((module) => module.loadRules(gameId, locale));
}

type RulesLoad = { readonly attempt: number } & (
  { readonly status: "ready"; readonly loaded: LoadedRules } | { readonly status: "failed" }
);

interface LazyRulesProps {
  readonly gameId: RegisteredGameId;
  /** Whether the dialog showing the rules is open: opening it again after a failure retries. */
  readonly open: boolean;
  /** How the rules are loaded: `loadRules`, on demand, in the app; a stand-in in tests. */
  readonly load?: (gameId: RegisteredGameId, locale: Locale) => Promise<LoadedRules>;
}

/**
 * A game's rules in the play screen's dialog, in every mode: loaded when the dialog first opens (it
 * mounts this), so no page carries them before, with a line while they load and, when they cannot
 * be loaded (the connection is down), a word saying so and a way to try again. Opening the dialog
 * again after a failure tries again by itself. The game is not touched meanwhile.
 */
export function LazyRules({ gameId, open, load = loadRulesLazily }: LazyRulesProps) {
  const t = useTranslations("Play");
  const locale = useLocale();
  // Raised by "Try again" and by opening the dialog again after a failure: a new attempt, whose
  // result replaces the failed one.
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<RulesLoad | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  // Set by "Try again": once the rules arrive, the focus moves to them from the button they replace.
  const focusOnReady = useRef(false);
  const content = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let current = true;
    load(gameId, locale).then(
      (loaded) => {
        if (current) setResult({ attempt, status: "ready", loaded });
      },
      () => {
        if (current) setResult({ attempt, status: "failed" });
      },
    );
    return () => {
      current = false;
    };
  }, [gameId, locale, attempt, load]);

  const shown = result?.attempt === attempt ? result : null;
  // Adjusted during render: the dialog opened again on rules that failed to load.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open && shown?.status === "failed") setAttempt((previous) => previous + 1);
  }

  const ready = shown?.status === "ready";
  useEffect(() => {
    if (!ready || !focusOnReady.current) return;
    focusOnReady.current = false;
    content.current?.focus();
  }, [ready]);

  if (result === null) {
    return (
      <p role="status" className="text-body text-fg-muted">
        {t("rulesDialog.loading")}
      </p>
    );
  }
  if (shown?.status === "ready") {
    const { Rules, t: tRules } = shown.loaded;
    return (
      // Focusable by script only: where the focus goes from "Try again".
      <div ref={content} tabIndex={-1} className="flex flex-col gap-6 focus:outline-none">
        <Rules t={tRules} place="dialog" />
      </div>
    );
  }
  // Failed, or trying again after a failure: the button stays (with the focus) until the answer.
  const retrying = shown === null;
  return (
    <div
      aria-busy={retrying}
      className="flex flex-col items-start gap-3 rounded-card border border-warning bg-warning-soft p-4"
    >
      <p role="alert" className="text-body text-warning-ink">
        {t("rulesDialog.loadError")}
      </p>
      <Button
        variant="secondary"
        aria-disabled={retrying}
        onClick={() => {
          focusOnReady.current = true;
          setAttempt((previous) => previous + 1);
        }}
      >
        {t("rulesDialog.retry")}
      </Button>
    </div>
  );
}
