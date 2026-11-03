"use client";

import { type RejectionCode, ROOM_ERROR } from "@board-games/protocol";
import { Button, buttonVariants } from "@board-games/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";

/** Why a room cannot be entered, as the player is told (design of `add-online-play`, §6). */
export const ROOM_PROBLEM = {
  NotFound: "notFound",
  Full: "full",
  /** The app is older than the server: only a reload helps. */
  Outdated: "outdated",
  /** The room's data cannot be turned into a game of this app. */
  Broken: "broken",
} as const;

export type RoomProblem = (typeof ROOM_PROBLEM)[keyof typeof ROOM_PROBLEM];

/** The page for a connection that gave up with `code`. */
export function roomProblemOf(code: RejectionCode | null): RoomProblem {
  switch (code) {
    case ROOM_ERROR.RoomNotFound: {
      return ROOM_PROBLEM.NotFound;
    }
    case ROOM_ERROR.RoomFull: {
      return ROOM_PROBLEM.Full;
    }
    case ROOM_ERROR.OutdatedClient: {
      return ROOM_PROBLEM.Outdated;
    }
    default: {
      return ROOM_PROBLEM.Broken;
    }
  }
}

interface RoomErrorProps {
  readonly problem: RoomProblem;
  /** Opens the room again from scratch; offered when the room's data could not be read. */
  readonly onRetry?: (() => void) | undefined;
  /** Reloads the page, for an app older than the server; the browser's own reload by default. */
  readonly onReload?: (() => void) | undefined;
}

function reloadPage(): void {
  window.location.reload();
}

/** A room that cannot be entered, with a way out: never reconnects by itself. */
export function RoomError({ problem, onRetry, onReload = reloadPage }: RoomErrorProps) {
  const t = useTranslations("Room.errors");
  const tPlay = useTranslations("Play");
  const canRetry = problem === ROOM_PROBLEM.Broken && onRetry !== undefined;
  const canReload = problem === ROOM_PROBLEM.Outdated;

  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{t(`${problem}.title`)}</h1>
      <p className="text-fg-muted">{t(`${problem}.description`)}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {canReload && <Button onClick={onReload}>{t("outdated.reload")}</Button>}
        {canRetry && <Button onClick={onRetry}>{t("broken.retry")}</Button>}
        <Link
          href="/"
          className={buttonVariants({ variant: canReload || canRetry ? "secondary" : "primary" })}
        >
          {tPlay("backToMenu")}
        </Link>
      </div>
    </main>
  );
}
