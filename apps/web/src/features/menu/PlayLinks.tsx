import type { RegisteredGameId } from "@board-games/games";
import { buttonVariants, cn } from "@board-games/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { SETUP_MODE } from "@/features/setup/play-setup";

interface PlayLinksProps {
  readonly gameId: RegisteredGameId;
  /** Id of the card heading, so screen readers announce which game each link plays. */
  readonly describedBy: string;
}

/**
 * The ways into a game, both to its setup screen: "Play", and "Online" with that mode already
 * chosen. A game may have a game in progress per mode, so a card label could not name the right
 * one; they are listed by `ContinueList`.
 */
export function PlayLinks({ gameId, describedBy }: PlayLinksProps) {
  const t = useTranslations("Menu");

  return (
    <div className="flex gap-2">
      <Link
        href={`/play/${gameId}`}
        aria-describedby={describedBy}
        className={cn(buttonVariants(), "flex-1")}
      >
        {t("play")}
      </Link>
      <Link
        href={`/play/${gameId}?mode=${SETUP_MODE.Online}`}
        aria-describedby={describedBy}
        className={buttonVariants({ variant: "secondary" })}
      >
        {t("online")}
      </Link>
    </div>
  );
}
