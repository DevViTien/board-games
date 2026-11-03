"use client";

import { Button } from "@board-games/ui";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";

import { CONNECTION_STATUS, type ConnectionStatus } from "@/transport/types";

/**
 * How long the connection must stay lost before it is mentioned: Vercel cuts every connection
 * about every 5 minutes and the client is back within ~0.3 s, which must not make text flicker.
 */
const NOTICE_DELAY_MS = 1500;

interface ConnectionNoticeProps {
  readonly status: ConnectionStatus;
  /** Reconnects after an idle pause. */
  readonly onResume: () => void;
  /** Shown in the same place while the connection is fine: a short message about the game. */
  readonly children?: ReactNode;
}

/**
 * A line kept below the header of online screens, holding its space even when empty so the board
 * never moves: "reconnecting" once the connection has been lost for 1.5 s, or at once the idle
 * pause with its "Continue" button. Announced politely to screen readers. Its negative margins
 * take back the gap of the column it sits in, so the line costs no more height than its own.
 */
export function ConnectionNotice({ status, onResume, children }: ConnectionNoticeProps) {
  const t = useTranslations("Play.connection");
  const idle = status === CONNECTION_STATUS.Idle;
  const lost = status !== CONNECTION_STATUS.Online && !idle;
  const [late, setLate] = useState(false);

  // Adjusted during render: back online, the next loss starts its own delay.
  if (late && !lost) setLate(false);

  useEffect(() => {
    if (!lost) return;
    const timer = setTimeout(() => {
      setLate(true);
    }, NOTICE_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [lost]);

  const message = idle ? t("idle") : lost && late ? t("reconnecting") : null;

  return (
    <div className="-my-3 flex min-h-10 flex-wrap items-center justify-center gap-3">
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
