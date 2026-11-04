"use client";

import { Badge, cn, TrophyIcon } from "@board-games/ui";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

type ResultCardVariant = "turn" | "over" | "won";

interface ResultCardProps {
  /** The words of the turn line, then of the result: the page's one live region reads them. */
  readonly announcement: ReactNode;
  /**
   * `turn`: the game is on, the frame is the turn line. `over`: the frame is the result card.
   * `won`: the result card of a game a person here won, its chip in the celebration colour.
   */
  readonly variant: ResultCardVariant;
  /** The line under the result saying how it was won, or `null`. */
  readonly detail: string | null;
  /** The card's one action ("New game" / "Play again"), or `null`. */
  readonly action: ReactNode;
  /**
   * Under the turn line while the game is on (online: a player gone for a while), outside the live
   * region; `null` for nothing.
   */
  readonly notice?: ReactNode;
  readonly className?: string | undefined;
}

/**
 * The turn line, and once the game is over the result card around it. The element with
 * `role="status"` is always the same one, in the same frame: when the game ends only the frame's
 * look changes and siblings appear around it (the chip, the detail, the action), so a screen
 * reader reads the result from the region it already follows, and nothing is read twice. Undoing
 * the winning move turns the card back into the turn line, again in place.
 */
export function ResultCard({
  announcement,
  variant,
  detail,
  action,
  notice = null,
  className,
}: ResultCardProps) {
  const t = useTranslations("Play");
  const finished = variant !== "turn";
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col",
        finished
          ? // A card on the page, as on the mockup: white, rounded, words first.
            "items-start gap-3 rounded-card border border-border bg-surface p-4 text-left shadow-card sm:p-5"
          : "items-center text-center lg:items-start lg:text-left short-landscape:items-start short-landscape:text-left",
        className,
      )}
    >
      {finished && (
        <Badge variant={variant === "won" ? "celebration" : "neutral"}>
          <TrophyIcon aria-hidden className="size-3.5" />
          {t("finished")}
        </Badge>
      )}
      <p
        role="status"
        aria-live="polite"
        className={cn("text-balance", finished ? "text-display" : "text-status")}
      >
        {announcement}
      </p>
      {finished && detail !== null && <p className="text-body text-fg-muted">{detail}</p>}
      {finished && action}
      {!finished && notice}
    </div>
  );
}
