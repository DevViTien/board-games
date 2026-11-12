"use client";

import type { PlayerIndex } from "@board-games/engine";
import { ABANDON_AFTER_MS } from "@board-games/protocol";
import { Button } from "@board-games/ui";
import { useTranslations } from "next-intl";
import { type MouseEvent, useId } from "react";

import type { ResignOption, TurnClock } from "@/transport/types";

import { useTickingClock } from "./use-ticking-clock";
import { TURN_LEVEL, type TurnLevel } from "./use-turn-thresholds";

/** `m:ss`, for a duration of at most an hour or so: digits and a colon in every language. */
function clockText(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, "0")}`;
}

interface AbandonNoticeProps {
  readonly turn: TurnClock;
  readonly level: TurnLevel;
  readonly viewer: PlayerIndex | null;
  /** The name of the player to move, as the turn line says it. */
  readonly name: string;
  /** What leaving would do to the player here: tells the player to move what they risk. */
  readonly resign: ResignOption | null;
  /** The server found the claim too early, and the turn has not changed since. */
  readonly refused: boolean;
  /** Why the claim button cannot be pressed while not connected. */
  readonly unavailableReason: string;
  /** The claim button was pressed (and may be): the play screen asks first. */
  readonly onClaim: (event: MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Under the turn line, online: how long the player to move has been gone, and from 5 minutes the
 * button to claim the turn abandoned; for the player to move, from 4 minutes, how long is left.
 * Never a live region itself, as its seconds tick: the turn line says each threshold once.
 */
export function AbandonNotice({
  turn,
  level,
  viewer,
  name,
  resign,
  refused,
  unavailableReason,
  onClaim,
}: AbandonNoticeProps) {
  const t = useTranslations("Play.abandon");
  const reasonId = useId();
  const mover = turn.player === viewer;
  const claimable = level === TURN_LEVEL.Claimable;
  // A clock on screen: the time left for the player to move from 4 minutes, the time gone for the
  // others from 1 minute. Only this notice renders every second for it; the play screen does not.
  const ticking = mover
    ? level === TURN_LEVEL.Warn || claimable
    : turn.claim !== null && level !== TURN_LEVEL.None;
  const now = useTickingClock(1000, ticking);
  const elapsed = now - turn.startedAt;
  const notYet =
    refused && !claimable ? (
      <p role="alert" className="text-small text-danger">
        {t("notYet", { name })}
      </p>
    ) : null;

  if (mover) {
    if (!ticking) return null;
    const warn =
      resign?.outcome === "end"
        ? "warnTeam"
        : resign?.outcome === "stand-in"
          ? "warnStandIn"
          : "warnWin";
    return (
      <p className="mt-2 rounded-control bg-warning-soft px-3 py-2 text-small text-warning-ink tabular-nums">
        {t(warn, { remaining: clockText(ABANDON_AFTER_MS - elapsed) })}
      </p>
    );
  }

  const { claim } = turn;
  if (claim === null || level === TURN_LEVEL.None) return notYet;
  const waiting = (
    <span className="tabular-nums">{t("waiting", { name, elapsed: clockText(elapsed) })}</span>
  );
  if (!claimable) {
    const hint = claim === "stand-in" ? "hintStandIn" : claim === "end" ? "hintEnd" : "hintWin";
    return (
      <div className="mt-2 flex flex-col items-center gap-1 lg:items-start short-landscape:items-start">
        <p className="text-small text-fg-muted">
          {waiting} {t(hint, { name })}
        </p>
        {notYet}
      </div>
    );
  }
  const label = claim === "stand-in" ? "claimStandIn" : claim === "end" ? "claimEnd" : "claimWin";
  return (
    <div className="mt-2 flex flex-col items-center gap-2 lg:items-start short-landscape:items-start">
      <p className="text-small text-fg-muted">{waiting}</p>
      <Button
        aria-disabled={!turn.available}
        aria-describedby={turn.available ? undefined : reasonId}
        onClick={(event) => {
          if (turn.available) onClaim(event);
        }}
      >
        {t(label)}
      </Button>
      {!turn.available && (
        <p id={reasonId} className="sr-only">
          {unavailableReason}
        </p>
      )}
    </div>
  );
}
