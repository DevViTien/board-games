"use client";

import { buttonVariants, InfoIcon, PlusIcon } from "@board-games/ui";
import { ArrowLeftIcon } from "@board-games/ui";
import type { Route } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { AppStateScreen } from "@/features/shell/AppStateScreen";
import { AppTopBar, BACK_LINK_CLASS } from "@/features/shell/AppTopBar";

import { CardScoreArtwork } from "./Artwork";
import { useLocalTimeFormat } from "./format";
import { type CardScoreGroup, displayName } from "./group";
import { ScreenTitle, ToolLink } from "./navigation";
import { boardHref, newHref } from "./routes";
import { useGroups } from "./use-group";

const TOOLBOX: Route = "/tools";

/** The way back out of the tool: a real page, the only link here that needs the network. */
function BackToToolbox() {
  const t = useTranslations("CardScore");
  return (
    <Link href={TOOLBOX} className={BACK_LINK_CLASS}>
      <ArrowLeftIcon aria-hidden className="size-5" />
      <span className="max-sm:sr-only">{t("backToToolbox")}</span>
    </Link>
  );
}

function GroupCard({ group }: { readonly group: CardScoreGroup }) {
  const t = useTranslations("CardScore");
  const { dateTime } = useLocalTimeFormat();
  return (
    <li>
      <ToolLink
        href={boardHref(group.id)}
        className="focus-ring block rounded-card border border-border bg-surface p-5 shadow-card transition-lift hover:shadow-raised motion-reduce:transition-none"
      >
        <span className="flex items-baseline justify-between gap-3">
          <strong translate="no" className="min-w-0 truncate text-heading">
            {displayName(group)}
          </strong>
          <span className="shrink-0 text-caption text-fg-muted">
            {t("roundCount", { count: group.rounds.length })}
          </span>
        </span>
        {group.name !== "" && (
          <span translate="no" className="mt-0.5 block truncate text-small text-fg-muted">
            {group.players.map((player) => player.name).join(", ")}
          </span>
        )}
        <span className="mt-1.5 block text-small text-fg-muted">{dateTime(group.updatedAt)}</span>
      </ToolLink>
    </li>
  );
}

/** `/tools/card-score`: the groups on this browser, and the way to a new one. */
export function GroupList() {
  const t = useTranslations("CardScore");
  const state = useGroups();

  if (state.status === "loading") {
    return <AppStateScreen title={t("loading")} busy back={<BackToToolbox />} />;
  }
  if (state.status === "unavailable") {
    return (
      <AppStateScreen
        title={t("unavailableTitle")}
        description={t("unavailableText")}
        tone="warning"
        back={<BackToToolbox />}
      >
        <Link href={TOOLBOX} className={buttonVariants()}>
          {t("backToToolbox")}
        </Link>
      </AppStateScreen>
    );
  }

  const createLink = (
    <ToolLink href={newHref()} className={buttonVariants()}>
      <PlusIcon aria-hidden className="size-5" />
      {t("create")}
    </ToolLink>
  );
  const hasGroups = state.groups.length > 0;

  return (
    <>
      <AppTopBar back={<BackToToolbox />} />
      <main className="mx-auto flex max-w-3xl flex-col gap-5 pt-6 px-safe-4 pb-14 sm:px-safe-6 lg:pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ScreenTitle className="text-title">{t("title")}</ScreenTitle>
          {hasGroups && createLink}
        </div>

        {state.newer > 0 && (
          <p className="rounded-control bg-warning-soft px-3 py-2 text-small font-semibold text-warning-ink">
            {t("someNewer", { count: state.newer })}
          </p>
        )}
        {state.corruptIds.length > 0 && (
          <div className="rounded-control bg-warning-soft px-3 py-2 text-small font-semibold text-warning-ink">
            <p>{t("someCorrupt", { count: state.corruptIds.length })}</p>
            <ul className="mt-1 flex flex-wrap gap-x-3">
              {state.corruptIds.map((id, index) => (
                <li key={id}>
                  <ToolLink
                    href={boardHref(id)}
                    className="focus-ring inline-block rounded-sm py-1 underline underline-offset-2"
                  >
                    {t("openCorrupt", { number: index + 1 })}
                  </ToolLink>
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasGroups ? (
          <ul className="flex flex-col gap-4">
            {state.groups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface px-4 py-8 text-center shadow-card">
            <span className="grid size-22 place-items-center rounded-control bg-accent-soft">
              <CardScoreArtwork />
            </span>
            <h2 className="text-heading">{t("emptyTitle")}</h2>
            <p className="max-w-prose text-body text-pretty text-fg-muted">{t("emptyText")}</p>
            {createLink}
          </div>
        )}

        <p className="flex items-start gap-2.5 rounded-control bg-surface-muted px-3 py-2.5 text-small text-fg-muted">
          <InfoIcon aria-hidden className="mt-0.5 size-5 shrink-0" />
          <span>{t("notice")}</span>
        </p>
      </main>
    </>
  );
}
