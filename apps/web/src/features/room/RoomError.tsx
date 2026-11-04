"use client";

import { Button, buttonVariants } from "@board-games/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { AppStateScreen } from "@/features/shell/AppStateScreen";

import { ROOM_PROBLEM, type RoomProblem } from "./room-problem";

interface RoomErrorProps {
  readonly problem: RoomProblem;
  /** Opens the room again from scratch; offered when the room's data could not be read. */
  readonly onRetry?: (() => void) | undefined;
  /** Reloads the page, for an app older than the server; the browser's own reload by default. */
  readonly onReload?: (() => void) | undefined;
  /**
   * The page replaces another one in the browser (the lobby, the game, "joining"), whose focused
   * button is gone: the title takes the focus, so the keyboard and screen readers start here.
   */
  readonly focusTitle?: boolean | undefined;
}

function reloadPage(): void {
  window.location.reload();
}

/** A room that cannot be entered, with a way out: never reconnects by itself. */
export function RoomError({
  problem,
  onRetry,
  onReload = reloadPage,
  focusTitle = false,
}: RoomErrorProps) {
  const t = useTranslations("Room.errors");
  const tPlay = useTranslations("Play");
  const canRetry = problem === ROOM_PROBLEM.Broken && onRetry !== undefined;
  const canReload = problem === ROOM_PROBLEM.Outdated;

  return (
    <AppStateScreen
      title={t(`${problem}.title`)}
      description={t(`${problem}.description`)}
      // An app to reload is not wrong, only old; the rest are rooms that cannot be entered.
      tone={canReload ? "warning" : "danger"}
      focusTitle={focusTitle}
    >
      {canReload && <Button onClick={onReload}>{t("outdated.reload")}</Button>}
      {canRetry && <Button onClick={onRetry}>{t("broken.retry")}</Button>}
      <Link
        href="/"
        className={buttonVariants({ variant: canReload || canRetry ? "secondary" : "primary" })}
      >
        {tPlay("backToMenu")}
      </Link>
    </AppStateScreen>
  );
}
