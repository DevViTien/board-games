"use client";

import { Card, cn, PencilIcon } from "@board-games/ui";
import { useTranslations } from "next-intl";

import { scoreClass, useLocalTimeFormat, useScoreFormat } from "./format";
import type { CardScoreGroup, CardScoreRound } from "./group";
import type { Standing } from "./summary";

interface RoundHistoryProps {
  readonly group: CardScoreGroup;
  readonly table: readonly Standing[];
  /** The round just saved, lit up. */
  readonly highlightRoundId: string | null;
  readonly onEdit: (round: CardScoreRound) => void;
}

const CELL = "border-b border-border bg-surface px-2.5 py-2 text-right whitespace-nowrap";
const FIRST_COLUMN = "sticky left-0 z-1 border-r text-left";

/**
 * Every round, the newest first, a column each player. Eight players do not fit a phone: the table
 * scrolls inside its frame, the first column staying, and the page never scrolls sideways.
 */
export function RoundHistory({ group, table, highlightRoundId, onEdit }: RoundHistoryProps) {
  const t = useTranslations("CardScore");
  const formatScore = useScoreFormat();
  const { time } = useLocalTimeFormat();
  const totalOf = (playerId: string) =>
    table.find((standing) => standing.player.id === playerId)?.total ?? 0;
  const newestFirst = group.rounds.map((round, index) => ({ round, number: index + 1 })).reverse();

  return (
    <Card className="overflow-hidden p-0">
      <h2 className="p-5 pb-3 text-heading">{t("roundsTitle")}</h2>
      {group.rounds.length === 0 ? (
        <p className="px-5 pb-5 text-body text-fg-muted">{t("roundsEmpty")}</p>
      ) : (
        <div
          role="region"
          aria-label={t("historyLabel")}

          tabIndex={0}
          className="focus-ring overflow-x-auto border-t border-border"
        >
          <table className="w-full border-separate border-spacing-0 text-small tabular-nums">
            <thead>
              <tr>
                <th
                  scope="col"
                  className={cn(CELL, FIRST_COLUMN, "align-bottom text-caption text-fg-muted")}
                >
                  {t("colRound")}
                </th>
                {group.players.map((player) => (
                  <th
                    key={player.id}
                    scope="col"
                    className={cn(
                      CELL,
                      "align-bottom text-caption whitespace-normal text-fg-muted",
                    )}
                  >
                    <span translate="no" title={player.name} className="line-clamp-2 min-w-16">
                      {player.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th
                  scope="row"
                  className={cn(CELL, FIRST_COLUMN, "bg-surface-muted font-extrabold")}
                >
                  {t("rowTotal")}
                </th>
                {group.players.map((player) => {
                  const total = totalOf(player.id);
                  return (
                    <td
                      key={player.id}
                      className={cn(CELL, "bg-surface-muted font-extrabold", scoreClass(total))}
                    >
                      {formatScore(total)}
                    </td>
                  );
                })}
              </tr>
              {newestFirst.map(({ round, number }) => {
                const lit = round.id === highlightRoundId;
                return (
                  <tr key={round.id}>
                    <th scope="row" className={cn(CELL, FIRST_COLUMN, lit && "bg-accent-soft")}>
                      <button
                        type="button"
                        aria-label={t("editRoundLabel", { number })}
                        className="focus-ring -mx-1.5 -my-1 inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-sm px-1.5 font-semibold hover:bg-surface-muted"
                        onClick={() => {
                          onEdit(round);
                        }}
                      >
                        {number}
                        <PencilIcon aria-hidden className="size-3.5 text-fg-muted" />
                      </button>
                      <span className="ml-3 text-caption font-normal text-fg-muted">
                        {time(round.at)}
                      </span>
                    </th>
                    {group.players.map((player) => {
                      const score = round.scores[player.id];
                      return (
                        <td
                          key={player.id}
                          className={cn(
                            CELL,
                            lit && "bg-accent-soft",
                            score === undefined ? "text-fg-muted" : scoreClass(score),
                          )}
                        >
                          {score === undefined ? "—" : formatScore(score)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
