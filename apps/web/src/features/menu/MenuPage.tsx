import { Badge, Card } from "@board-games/ui";
import { useTranslations } from "next-intl";

import { THEME, type Theme } from "@/features/settings/theme";
import { GAME_ARTWORK } from "@/games/artwork";

import { AppBar } from "./AppBar";
import { ContinueList } from "./ContinueList";
import { JoinRoomForm } from "./JoinRoomForm";
import { buildMenu, buildOptionChoices, type MenuGame } from "./menu-games";
import { PlayLinks } from "./PlayLinks";

interface MenuPageProps {
  /** The theme the page is rendered in, from the request's cookie; the system's by default. */
  readonly theme?: Theme;
}

/** "2 người · ~10 phút": each part its own element, so each reads and wraps on its own. */
function GameFacts({ game }: { readonly game: MenuGame }) {
  const t = useTranslations("Menu");
  return (
    <p className="flex flex-wrap gap-x-1 text-caption text-fg-muted">
      <span>
        {game.players.min === game.players.max
          ? t("playersFixed", { count: game.players.min })
          : t("playersRange", game.players)}
      </span>
      <span aria-hidden>·</span>
      <span>{t("duration", { minutes: game.durationMinutes })}</span>
    </p>
  );
}

export function MenuPage({ theme = THEME.System }: MenuPageProps) {
  const t = useTranslations("Menu");
  const tGames = useTranslations("Games");

  return (
    <>
      <AppBar theme={theme} />
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pt-8 pb-14 sm:px-6 lg:gap-10 lg:px-10 lg:pt-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_24rem] lg:gap-8">
          <div className="flex flex-col justify-center gap-3">
            <h1 className="text-display text-balance">{t("heroTitle")}</h1>
            <p className="text-body text-pretty text-fg-muted">{t("heroLead")}</p>
          </div>
          {/* Joining comes first: the games in progress appear once loaded, and must not push it
              away from under the player's finger. */}
          <Card className="flex flex-col gap-4">
            <JoinRoomForm />
            <ContinueList optionChoices={buildOptionChoices()} />
          </Card>
        </div>

        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {buildMenu().map((game) => {
            const headingId = `game-${game.id}`;
            if (game.kind === "planned") {
              // Not a link nor a card: a thin dashed row, below the playable games.
              return (
                <li key={game.id} className="sm:col-span-2 lg:col-span-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-card border-[1.5px] border-dashed border-border-control px-4 py-3">
                    <h2 id={headingId} className="text-body font-bold">
                      {tGames(`${game.id}.name`)}
                    </h2>
                    <GameFacts game={game} />
                    <Badge className="ml-auto">{t("comingSoon")}</Badge>
                  </div>
                </li>
              );
            }
            const Artwork = GAME_ARTWORK[game.id];
            return (
              <li key={game.id} className="flex">
                <Card className="flex w-full flex-col overflow-hidden p-0">
                  {/* The game's own colours apply inside `data-game` (games/<id>/theme.css). */}
                  <div data-game={game.id} className="grid h-42 place-items-center bg-game-tint">
                    <Artwork />
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <h2 id={headingId} className="text-heading">
                        {tGames(`${game.id}.name`)}
                      </h2>
                      <GameFacts game={game} />
                    </div>
                    <p className="text-small text-fg-muted">{tGames(`${game.id}.tagline`)}</p>
                    <div className="mt-auto pt-4">
                      <PlayLinks gameId={game.id} describedBy={headingId} />
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
