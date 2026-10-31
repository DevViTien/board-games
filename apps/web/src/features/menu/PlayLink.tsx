import type { RegisteredGameId } from "@board-games/games";
import { buttonVariants } from "@board-games/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface PlayLinkProps {
  readonly gameId: RegisteredGameId;
  /** Id of the card heading, so screen readers announce which game the link plays. */
  readonly describedBy: string;
}

/**
 * The way into a game: always "Play", to its setup screen. A game may now have a game in progress
 * per mode, so one card label could not name the right one; they are listed by `ContinueList`.
 */
export function PlayLink({ gameId, describedBy }: PlayLinkProps) {
  const t = useTranslations("Menu");

  return (
    <Link
      href={`/play/${gameId}`}
      aria-describedby={describedBy}
      className={buttonVariants({ className: "min-w-28 self-start" })}
    >
      {t("play")}
    </Link>
  );
}
