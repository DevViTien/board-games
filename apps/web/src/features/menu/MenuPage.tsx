import { Badge, Card, ClockIcon, UsersIcon } from "@board-games/ui";
import { useTranslations } from "next-intl";

import { SITE } from "@/config/site";
import { LocaleSwitcher } from "@/features/settings/LocaleSwitcher";

import { UPCOMING_GAMES } from "./upcoming-games";

export function MenuPage() {
  const t = useTranslations("Menu");
  const tSite = useTranslations("Site");
  const tGames = useTranslations("Games");

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{SITE.name}</h1>
          <p className="text-fg-muted">{tSite("tagline")}</p>
        </div>
        <LocaleSwitcher />
      </header>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {UPCOMING_GAMES.map((game) => (
          <li key={game.id}>
            <Card className="flex h-full flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-medium">{tGames(`${game.id}.name`)}</h2>
                <Badge>{t("comingSoon")}</Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-fg-muted">
                <span className="inline-flex items-center gap-1.5">
                  <UsersIcon aria-hidden className="size-4" />
                  {game.players.min === game.players.max
                    ? t("playersFixed", { count: game.players.min })
                    : t("playersRange", game.players)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ClockIcon aria-hidden className="size-4" />
                  {t("duration", { minutes: game.durationMinutes })}
                </span>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </main>
  );
}
