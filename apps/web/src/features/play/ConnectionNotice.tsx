"use client";

import { Button, cn } from "@board-games/ui";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { CONNECTION_STATUS, type ConnectionStatus } from "@/transport/types";

import { useLostForAWhile } from "./use-lost-for-a-while";

interface ConnectionNoticeProps {
  readonly status: ConnectionStatus;
  /** Reconnects after an idle pause. */
  readonly onResume: () => void;
  /** Shown in the same place while the connection is fine: a short message about the game. */
  readonly children?: ReactNode;
  /**
   * Keeps the line's height while it is empty, so nothing below it moves (a board). Off where a
   * shift is harmless (the lobby): the empty line then takes no room at all.
   */
  readonly reserveSpace?: boolean;
  readonly className?: string | undefined;
}

/**
 * A line kept below the header of online screens, holding its space even when empty so the board
 * never moves (unless `reserveSpace` is off): "reconnecting" once the connection has been lost for
 * 1.5 s, or at once the idle pause with its "Continue" button. Announced politely to screen
 * readers. Its negative margins take back the gap of the column it sits in, so the line costs no
 * more height than its own.
 */
export function ConnectionNotice({
  status,
  onResume,
  children,
  reserveSpace = true,
  className,
}: ConnectionNoticeProps) {
  const t = useTranslations("Play.connection");
  const idle = status === CONNECTION_STATUS.Idle;
  const late = useLostForAWhile(status);

  const message = idle ? t("idle") : late ? t("reconnecting") : null;

  return (
    <div
      className={cn(
        "-my-3 flex flex-wrap items-center justify-center gap-3",
        reserveSpace && "min-h-10",
        className,
      )}
    >
      <p aria-live="polite" className="text-sm text-fg-muted">
        {message}
      </p>
      {idle && (
        <Button size="sm" onClick={onResume}>
          {t("resume")}
        </Button>
      )}
      {message === null && children}
    </div>
  );
}
