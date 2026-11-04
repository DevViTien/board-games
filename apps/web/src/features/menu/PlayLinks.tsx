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
 * one; they are listed by `ContinueList`. Below them, a small link to the game's rules, named with
 * the game for screen readers ("Luật chơi Cờ caro"), so the four of the menu read apart.
 */
export function PlayLinks({ gameId, describedBy }: PlayLinksProps) {
  const t = useTranslations("Menu");
  const tGames = useTranslations("Games");

  return (
    <div className="flex flex-col gap-1">
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
      <Link
        href={`/rules/${gameId}`}
        className="focus-ring self-center rounded-sm px-1 py-2 text-small font-semibold text-accent-ink underline underline-offset-2 transition-lift hover:text-fg hover:decoration-2 focus-visible:decoration-2 motion-reduce:transition-none"
      >
        {t.rich("rulesLink", {
          game: tGames(`${gameId}.name`),
          hidden: (chunks) => <span className="sr-only">{chunks}</span>,
        })}
      </Link>
    </div>
  );
}
