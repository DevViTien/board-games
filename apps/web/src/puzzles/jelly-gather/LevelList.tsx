"use client";

import { buttonVariants, CheckIcon, cn } from "@board-games/ui";
import { useTranslations } from "next-intl";

import { AppTopBar } from "@/features/shell/AppTopBar";
import { HistoryLink, ScreenTitle } from "@/features/shell/client-navigation";

import { chapterKey, LEVELS, levelsByChapter } from "./levels";
import { PieceShape } from "./pieces";
import { continueLevel } from "./progress-store";
import { levelHref } from "./routes";
import { JELLY_KIND, type JellyKind, type Level } from "./rules/types";
import { useProgress } from "./use-progress";

const NONE: ReadonlySet<number> = new Set();

/** A kind drawn small, inline in the "how to play" text. */
function Swatch({ kind }: { readonly kind: JellyKind }) {
  return (
    <svg viewBox="0 0 22 22" aria-hidden className="inline-block size-5.5 align-[-5px]">
      <PieceShape
        piece={{ cells: [0], kinds: [kind], fixed: false }}
        width={1}
        walls={NONE}
        slid={NONE}
        cell={22}
      />
    </svg>
  );
}

function LevelLink({
  level,
  number,
  best,
}: {
  level: Level;
  number: number;
  best: number | undefined;
}) {
  const t = useTranslations("JellyGather");
  const solved = best !== undefined;
  return (
    <li>
      <HistoryLink
        href={levelHref(level)}
        className={cn(
          "focus-ring relative flex aspect-square flex-col items-center justify-center rounded-control border-[1.5px] text-heading font-bold transition-lift hover:bg-surface-muted motion-reduce:transition-none",
          solved
            ? "border-success-ink bg-success-soft text-success-ink"
            : "border-border-control bg-surface text-fg",
        )}
      >
        {/* The name is the hidden text; the visible number and count are part of it. */}
        <span className="sr-only">
          {solved
            ? t("levelLinkSolved", { level: level.id, moves: best })
            : t("levelLinkUnsolved", { level: level.id })}
        </span>
        {solved && <CheckIcon aria-hidden className="absolute top-1.5 right-1.5 size-4" />}
        <span aria-hidden className="tabular-nums">
          {number}
        </span>
        {solved && (
          <span aria-hidden className="text-caption font-semibold tabular-nums">
            {t("levelBest", { moves: best })}
          </span>
        )}
      </HistoryLink>
    </li>
  );
}

/** `/puzzles/jelly-gather`: how to play, "Tiếp tục", and every level by chapter. */
export function LevelList() {
  const t = useTranslations("JellyGather");
  const progress = useProgress();
  const total = LEVELS.length;
  const solvedCount = progress?.best.size ?? 0;
  const resume = progress === null ? undefined : continueLevel(LEVELS, progress);
  // "Bắt đầu" for a player who never moved; "Tiếp tục" once anything was played.
  const started =
    solvedCount > 0 ||
    [...(progress?.attempts.values() ?? [])].some((saved) => saved.history !== "");

  return (
    <div data-game="jelly-gather" className="flex min-h-dvh flex-col bg-game-page">
      <AppTopBar />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 pt-6 px-safe-4 pb-14 sm:px-safe-6 lg:pt-10 lg:px-safe-10">
        <div className="grid gap-5 lg:grid-cols-[1fr_24rem] lg:items-start lg:gap-8">
          <div className="flex flex-col gap-3">
            <ScreenTitle className="text-title">{t("title")}</ScreenTitle>
            <p className="text-body text-fg-muted">
              {t("lead")}{" "}
              {progress !== null &&
                (solvedCount === total
                  ? t("allSolved", { total })
                  : solvedCount > 0
                    ? t("solvedCount", { solved: solvedCount, total })
                    : t("fresh", { total }))}
            </p>
            {resume !== undefined && (
              <HistoryLink href={levelHref(resume)} className={cn(buttonVariants(), "self-start")}>
                {started ? t("continue", { level: resume.id }) : t("start", { level: resume.id })}
              </HistoryLink>
            )}
          </div>
          {/* Open for a new player once known; then left as the player sets it. */}
          <details
            key={progress === null ? "unread" : "read"}
            open={progress !== null && solvedCount === 0}
            className="rounded-card border border-border bg-surface p-5 shadow-card"
          >
            <summary className="focus-ring cursor-pointer rounded-sm text-heading">
              {t("howTo.title")}
            </summary>
            <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-small">
              <li>{t("howTo.push")}</li>
              <li>
                {t("howTo.stick")} <Swatch kind={JELLY_KIND.Strawberry} />{" "}
                <Swatch kind={JELLY_KIND.Pandan} /> <Swatch kind={JELLY_KIND.Mango} />{" "}
                <Swatch kind={JELLY_KIND.Taro} />
              </li>
              <li>{t.rich("howTo.goal", { b: (chunks) => <b>{chunks}</b> })}</li>
              <li>{t.rich("howTo.stuck", { b: (chunks) => <b>{chunks}</b> })}</li>
              <li>
                <Swatch kind={JELLY_KIND.Ice} /> {t("howTo.ice")}
              </li>
              <li>
                <Swatch kind={JELLY_KIND.Grass} /> {t("howTo.grass")}
              </li>
              <li>
                <Swatch kind={JELLY_KIND.Coconut} /> {t("howTo.coconut")}
              </li>
              <li>{t.rich("howTo.mold", { b: (chunks) => <b>{chunks}</b> })}</li>
            </ul>
          </details>
        </div>

        {levelsByChapter().map((levels, index) => {
          const chapter = chapterKey(index + 1);
          const headingId = `jelly-chapter-${chapter}`;
          return (
            <section key={chapter} aria-labelledby={headingId} className="flex flex-col gap-3">
              <div>
                <h2 id={headingId} className="text-heading">
                  {t("chapterTitle", { chapter, name: t(`chapters.${chapter}.name`) })}
                </h2>
                <p className="text-small text-fg-muted">{t(`chapters.${chapter}.lead`)}</p>
                {chapter === "5" && (
                  // Levels from Boxoban (Apache 2.0): their source and licence, by the levels.
                  <p className="text-caption text-fg-muted">
                    {t.rich("chapters.5.credit", {
                      b: (chunks) => <b>{chunks}</b>,
                      link: (chunks) => (
                        <a
                          href="/third-party-licenses.txt"
                          className="focus-ring rounded-sm font-semibold text-accent-ink underline underline-offset-2"
                        >
                          {chunks}
                        </a>
                      ),
                    })}
                  </p>
                )}
              </div>
              <ol
                aria-label={t("chapterLevels", { chapter })}
                className="grid grid-cols-4 gap-2.5 lg:grid-cols-8"
              >
                {levels.map((level, at) => (
                  <LevelLink
                    key={level.id}
                    level={level}
                    number={at + 1}
                    best={progress?.best.get(level.id)}
                  />
                ))}
              </ol>
            </section>
          );
        })}

        <p className="text-small text-fg-muted">{t("localOnly")}</p>
      </main>
    </div>
  );
}
