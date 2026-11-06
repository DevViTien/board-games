"use client";

import {
  ArrowRightIcon,
  Button,
  buttonVariants,
  Card,
  CheckIcon,
  cn,
  ConfirmDialog,
  Dialog,
  PlusIcon,
  Share2Icon,
  Trash2Icon,
  TrophyIcon,
  UsersIcon,
} from "@board-games/ui";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { AppStateScreen } from "@/features/shell/AppStateScreen";
import { AppTopBar } from "@/features/shell/AppTopBar";
import { randomId } from "@/lib/random-id";

import { scoreClass, useLocalTimeFormat, useScoreFormat } from "./format";
import {
  addRound,
  type CardScoreGroup,
  type CardScoreRound,
  deleteRound,
  displayName,
  editRound,
  MAX_ROUNDS,
} from "./group";
import { groupStore } from "./group-store";
import { BackLink, goTo, ScreenTitle, ToolLink } from "./navigation";
import { clearRoundDraft, readRoundDraft } from "./round-draft";
import { RoundHistory } from "./RoundHistory";
import { type RoundRequest, RoundSheet } from "./RoundSheet";
import { CARD_SCORE_HOME, editHref, newHref } from "./routes";
import type { Scores } from "./score-logic";
import { shareSummary } from "./share-summary";
import { settlements, type Standing, standings, summaryText } from "./summary";
import { useGroup } from "./use-group";

interface Notice {
  readonly text: string;
  /** The round it is about, while it can still be corrected from here. */
  readonly round?: CardScoreRound | undefined;
}

/** `/tools/card-score/<id>`: where a group stands, and the way to the next round. */
export function Scoreboard({ groupId }: { readonly groupId: string }) {
  const t = useTranslations("CardScore");
  const { state, change } = useGroup(groupId);
  const back = <BackLink href={CARD_SCORE_HOME} label={t("backToGroups")} />;

  switch (state.status) {
    case "loading":
      return <AppStateScreen title={t("loading")} busy back={back} />;
    case "unavailable":
      return (
        <AppStateScreen
          title={t("unavailableTitle")}
          description={t("unavailableText")}
          tone="warning"
          back={back}
        />
      );
    case "missing":
      return (
        <AppStateScreen
          title={t("notFoundTitle")}
          description={t("notFoundText")}
          tone="warning"
          back={back}
        >
          <ToolLink href={CARD_SCORE_HOME} className={buttonVariants()}>
            {t("backToGroups")}
          </ToolLink>
        </AppStateScreen>
      );
    case "newer":
      return (
        <AppStateScreen
          title={t("newerTitle")}
          description={t("newerText")}
          tone="warning"
          back={back}
        />
      );
    case "corrupt":
      return <CorruptGroup groupId={groupId} />;
    case "ready":
      return <Board group={state.group} change={change} />;
  }
}

/** A group that cannot be read: said so, left alone, and deleted only if the player chooses. */
function CorruptGroup({ groupId }: { readonly groupId: string }) {
  const t = useTranslations("CardScore");
  const [asking, setAsking] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <AppStateScreen
      title={t("corruptTitle")}
      description={failed ? t("errorDelete") : t("corruptText")}
      tone="warning"
      back={<BackLink href={CARD_SCORE_HOME} label={t("backToGroups")} />}
    >
      <Button
        variant="secondary"
        onClick={() => {
          setAsking(true);
        }}
      >
        {t("deleteGroup")}
      </Button>
      <ConfirmDialog
        open={asking}
        title={t("corruptTitle")}
        description={t("corruptDeleteText")}
        confirmLabel={t("deleteGroup")}
        cancelLabel={t("cancel")}
        onCancel={() => {
          setAsking(false);
        }}
        onConfirm={() => {
          setAsking(false);
          groupStore.remove(groupId).then(
            () => {
              goTo(CARD_SCORE_HOME, { replace: true });
            },
            () => {
              setFailed(true);
            },
          );
        }}
      />
    </AppStateScreen>
  );
}

/** A round left half typed comes back, unless those playing have changed since or it was saved. */
function restoredRound(group: CardScoreGroup): RoundRequest | null {
  const draft = readRoundDraft(group.id);
  if (draft === null) return null;
  const players = group.players.filter((player) => player.active);
  const same =
    draft.playerIds.length === players.length &&
    draft.playerIds.every((id, at) => id === players[at]?.id);
  if (!same || group.rounds.some((round) => round.id === draft.roundId)) {
    clearRoundDraft(group.id);
    return null;
  }
  return {
    key: draft.roundId,
    groupId: group.id,
    roundId: draft.roundId,
    number: group.rounds.length + 1,
    players,
    values: draft.values,
    editing: false,
  };
}

interface BoardProps {
  readonly group: CardScoreGroup;
  readonly change: (apply: (group: CardScoreGroup) => CardScoreGroup) => Promise<CardScoreGroup>;
}

function Board({ group, change }: BoardProps) {
  const t = useTranslations("CardScore");
  const formatScore = useScoreFormat();
  const { date } = useLocalTimeFormat();
  const table = useMemo(() => standings(group), [group]);
  const name = displayName(group);
  const nextNumber = group.rounds.length + 1;
  const full = group.rounds.length >= MAX_ROUNDS;
  const enterButton = useRef<HTMLButtonElement>(null);
  // Where the page was when the round screen opened: giving the focus back to a button stuck to the
  // bottom of the screen would move the page by itself.
  const scrollWhenOpened = useRef(0);

  const [sheet, setSheet] = useState<RoundRequest | null>(() => restoredRound(group));
  const [notice, setNotice] = useState<Notice | null>(null);
  const [asking, setAsking] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [summaryToCopy, setSummaryToCopy] = useState<string | null>(null);

  const activePlayers = group.players.filter((player) => player.active);

  const openNew = () => {
    scrollWhenOpened.current = window.scrollY;
    setNotice(null);
    setSheet({
      key: randomId(),
      groupId: group.id,
      roundId: randomId(),
      number: nextNumber,
      players: activePlayers,
      values: activePlayers.map(() => ""),
      editing: false,
    });
  };

  const openEdit = (round: CardScoreRound) => {
    scrollWhenOpened.current = window.scrollY;
    const players = group.players.filter((player) => player.id in round.scores);
    setSheet({
      key: randomId(),
      groupId: group.id,
      roundId: round.id,
      number: group.rounds.findIndex((other) => other.id === round.id) + 1,
      players,
      values: players.map((player) => String(round.scores[player.id] ?? "")),
      editing: true,
    });
  };

  /**
   * Closes the screen and only then says what happened: while the modal dialog is open the status
   * outside it is out of reach, and a screen reader would say nothing. The button that opened the
   * screen may be gone (a deleted round); the focus then goes to the next round's.
   */
  const closeSheet = (message?: Notice, { toTop = false } = {}) => {
    setSheet(null);
    setTimeout(() => {
      // At once: the button that had the focus may go with the old message.
      if (message !== undefined) {
        flushSync(() => {
          setNotice(message);
        });
      }
      if (document.activeElement === document.body || document.activeElement === null) {
        enterButton.current?.focus();
      }
      // A new round: what it changed, and the message, are at the top.
      window.scrollTo(0, toTop ? 0 : scrollWhenOpened.current);
    }, 0);
  };

  const saveRound = async (request: RoundRequest, scores: Scores) => {
    const now = new Date();
    const updated = await change((current) =>
      request.editing
        ? editRound(current, request.roundId, scores, now)
        : addRound(current, { id: request.roundId, scores }, now),
    );
    // Its number as it is now: another tab may have saved or deleted one meanwhile.
    const number = updated.rounds.findIndex((round) => round.id === request.roundId) + 1;
    closeSheet(
      {
        text: request.editing ? t("edited", { number }) : t("saved", { number }),
        round: updated.rounds[number - 1],
      },
      { toTop: !request.editing },
    );
  };

  const removeRound = async (request: RoundRequest) => {
    await change((current) => deleteRound(current, request.roundId, new Date()));
    closeSheet({ text: t("removed", { number: request.number }) });
  };

  const share = async () => {
    const text = summaryText(group, name, date(new Date()), table, {
      header: (groupName, day, count) => t("summaryHeader", { name: groupName, date: day, count }),
      standing: (place, playerName, total) =>
        t("summaryStanding", { place, name: playerName, total }),
      settlementsTitle: () => t("summarySettlements"),
      settlement: (from, to, amount) => t("summarySettlement", { from, to, amount }),
      formatScore,
    });
    const outcome = await shareSummary(text);
    if (outcome === "copied") setNotice({ text: t("shareCopied") });
    if (outcome === "failed") setSummaryToCopy(text);
  };

  return (
    <>
      <AppTopBar
        back={<BackLink href={CARD_SCORE_HOME} label={t("backToGroups")} />}
        title={
          <ScreenTitle translate="no" className="min-w-0 truncate text-body font-bold">
            {name}
          </ScreenTitle>
        }
      />
      <main className="mx-auto flex max-w-6xl flex-col gap-5 pt-6 px-safe-4 sm:px-safe-6 lg:gap-6 lg:pt-8 lg:px-safe-10 lg:pb-14">
        {/* The main action comes first for the keyboard; on a phone it stays under the thumb. */}
        <div className="sticky bottom-0 z-20 order-last -mx-4 border-t border-border bg-bg pt-2.5 px-safe-4 pb-safe-3 sm:-mx-6 lg:static lg:order-none lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
          <Button
            ref={enterButton}
            aria-disabled={full}
            aria-describedby={full ? "card-score-round-limit" : undefined}
            className="w-full lg:w-auto"
            onClick={openNew}
          >
            <PlusIcon aria-hidden className="size-5" />
            {t("enterRound", { number: nextNumber })}
          </Button>
          {full && (
            <p id="card-score-round-limit" className="mt-2 text-small text-fg-muted">
              {t("roundLimit", { max: MAX_ROUNDS })}
            </p>
          )}
        </div>

        {/* Always in the page: a live region must exist before what it announces. */}
        <div
          className={cn(
            // Out of the page's flow while empty: no gap for nothing.
            notice === null && "absolute",
            notice !== null &&
              "flex min-h-12 items-center gap-2 rounded-control bg-success-soft py-1 pr-1 pl-3 text-small font-semibold text-success-ink",
          )}
        >
          {notice !== null && <CheckIcon aria-hidden className="size-4 shrink-0" />}
          <p role="status" className="min-w-0 flex-1">
            {notice?.text}
          </p>
          {notice?.round !== undefined && (
            <Button
              variant="ghost"
              size="sm"
              className="text-success-ink underline underline-offset-2"
              aria-label={t("editRoundLabel", {
                number: group.rounds.findIndex((round) => round.id === notice.round?.id) + 1,
              })}
              onClick={() => {
                const current = group.rounds.find((round) => round.id === notice.round?.id);
                if (current !== undefined) openEdit(current);
              }}
            >
              {t("editSaved")}
            </Button>
          )}
        </div>

        {/* What a Tab reaches is not left under the bar at the bottom of a phone (WCAG 2.4.11). */}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-6 [&_[tabindex]]:scroll-mb-24 [&_a]:scroll-mb-24 [&_button]:scroll-mb-24">
          <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-heading">{t("standingsTitle")}</h2>
                <p className="text-caption text-fg-muted">
                  {t("roundCount", { count: group.rounds.length })}
                </p>
              </div>
              <StandingsList table={table} />
              <div className="mt-3 flex flex-wrap gap-2 [&>*]:flex-auto">
                <ToolLink
                  href={editHref(group.id)}
                  className={buttonVariants({ variant: "secondary", size: "sm" })}
                >
                  <UsersIcon aria-hidden className="size-4" />
                  {t("editGroup")}
                </ToolLink>
                <Button
                  variant="secondary"
                  size="sm"
                  aria-disabled={group.rounds.length === 0}
                  aria-describedby={group.rounds.length === 0 ? "card-score-no-share" : undefined}
                  onClick={() => {
                    void share();
                  }}
                >
                  <Share2Icon aria-hidden className="size-4" />
                  {t("share")}
                </Button>
                <ToolLink
                  href={newHref(group.id)}
                  className={buttonVariants({ variant: "secondary", size: "sm" })}
                >
                  <PlusIcon aria-hidden className="size-4" />
                  {t("newSession")}
                </ToolLink>
              </div>
              {group.rounds.length === 0 && (
                <p id="card-score-no-share" className="mt-2 text-small text-fg-muted">
                  {t("shareNoRounds")}
                </p>
              )}
            </Card>
            <SettlementCard table={table} />
          </div>
          <div className="flex min-w-0 flex-col gap-5 pb-2 lg:gap-6">
            <RoundHistory
              group={group}
              table={table}
              highlightRoundId={notice?.round?.id ?? null}
              onEdit={openEdit}
            />
            <div>
              <Button
                variant="secondary"
                size="sm"
                className="border-danger-ink text-danger-ink"
                onClick={() => {
                  setAsking(true);
                }}
              >
                <Trash2Icon aria-hidden className="size-4" />
                {t("deleteGroup")}
              </Button>
              {deleteFailed && (
                <p role="alert" className="mt-2 text-small font-semibold text-danger-ink">
                  {t("errorDelete")}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      <RoundSheet
        request={sheet}
        onSave={saveRound}
        onDelete={removeRound}
        onClose={() => {
          closeSheet();
        }}
      />
      <ConfirmDialog
        open={asking}
        title={t("deleteGroupTitle", { name })}
        description={t("deleteGroupText", { count: group.rounds.length })}
        confirmLabel={t("deleteGroup")}
        cancelLabel={t("cancel")}
        onCancel={() => {
          setAsking(false);
        }}
        onConfirm={() => {
          setAsking(false);
          clearRoundDraft(group.id);
          groupStore.remove(group.id).then(
            () => {
              goTo(CARD_SCORE_HOME, { replace: true });
            },
            () => {
              setDeleteFailed(true);
            },
          );
        }}
      />
      <Dialog
        open={summaryToCopy !== null}
        title={t("shareDialogTitle")}
        closeLabel={t("closeRound")}
        onClose={() => {
          setSummaryToCopy(null);
        }}
      >
        <p className="mb-3 text-small text-fg-muted">{t("shareDialogHint")}</p>
        <pre
          translate="no"
          className="rounded-control bg-surface-muted p-4 font-sans text-small whitespace-pre-wrap select-all"
        >
          {summaryToCopy}
        </pre>
      </Dialog>
    </>
  );
}

function StandingsList({ table }: { readonly table: readonly Standing[] }) {
  const t = useTranslations("CardScore");
  const formatScore = useScoreFormat();
  return (
    <ol className="-mx-2 mt-3 flex flex-col gap-0.5">
      {table.map(({ player, total, place, wins }) => {
        const leads = place === 1 && total > 0;
        return (
          <li
            key={player.id}
            className={cn(
              "grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-2 rounded-control p-2",
              leads && "bg-celebration-soft",
            )}
          >
            <span
              className={cn(
                "grid place-items-center text-small font-extrabold",
                leads && "text-celebration-ink",
              )}
            >
              {leads && <TrophyIcon aria-hidden className="size-5" />}
              {!leads && <span aria-hidden>{place}</span>}
              <span className="sr-only">{t("place", { place })}</span>
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1 font-semibold">
                <span translate="no" className="min-w-0 truncate">
                  {player.name}
                </span>
                {!player.active && (
                  <span className="shrink-0 rounded-full bg-surface-muted px-1.5 text-caption text-fg-muted">
                    {t("rested")}
                  </span>
                )}
              </span>
              <span className="block text-caption font-normal text-fg-muted">
                {t("wins", { count: wins })}
              </span>
            </span>
            <span className={cn("text-heading font-extrabold tabular-nums", scoreClass(total))}>
              {formatScore(total)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function SettlementCard({ table }: { readonly table: readonly Standing[] }) {
  const t = useTranslations("CardScore");
  const moves = settlements(table);
  return (
    <Card>
      <h2 className="text-heading">{t("settlementsTitle")}</h2>
      {moves.length === 0 ? (
        <p className="mt-2 text-body text-fg-muted">{t("settlementsNone")}</p>
      ) : (
        <>
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {moves.map(({ from, to, amount }) => (
              <li key={`${from.id}-${to.id}`}>
                <span className="sr-only">
                  {t("settlementRead", { from: from.name, to: to.name, amount })}
                </span>
                <span aria-hidden className="flex flex-wrap items-center gap-1.5">
                  <b translate="no" className="min-w-0 font-bold break-words">
                    {from.name}
                  </b>
                  <ArrowRightIcon className="size-4 shrink-0" />
                  <b translate="no" className="min-w-0 font-bold break-words">
                    {to.name}
                  </b>
                  <span className="ml-auto font-bold tabular-nums">{t("amount", { amount })}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-small text-fg-muted">{t("settlementsHint")}</p>
        </>
      )}
    </Card>
  );
}
