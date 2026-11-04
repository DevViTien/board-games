import { Badge, Card, cn } from "@board-games/ui";
import { useTranslations } from "next-intl";

import { AppTopBar } from "@/features/shell/AppTopBar";
import { GAME_ARTWORK } from "@/games/artwork";

import { ContinueList } from "./ContinueList";
import { JoinRoomForm } from "./JoinRoomForm";
import { buildMenu, buildOptionChoices, type MenuGame } from "./menu-games";
import { PlayLinks } from "./PlayLinks";

interface MenuPageProps {
  /** The game cards, in order: the menu of every registered and planned game by default (tests). */
  readonly cards?: readonly MenuGame[];
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

/**
 * A card pointed at or reached with Tab lifts a little, its picture grows a touch inside its frame,
 * and it settles while pressed; nothing around it moves (its box keeps its size). Only on a device
 * that hovers (Tailwind's `hover:`), and without moving when motion is reduced.
 */
const LIFT =
  "transition-lift motion-reduce:transition-none hover:shadow-raised has-focus-visible:shadow-raised motion-safe:hover:-translate-y-0.5 motion-safe:has-focus-visible:-translate-y-0.5 active:shadow-card motion-safe:active:translate-y-0";
const GROW =
  "transition-lift motion-reduce:transition-none motion-safe:group-hover:scale-[1.03] motion-safe:group-has-focus-visible:scale-[1.03]";

export function MenuPage({ cards = buildMenu() }: MenuPageProps) {
  const t = useTranslations("Menu");
  const tGames = useTranslations("Games");

  return (
    <>
      <AppTopBar home />
      <main className="mx-auto flex max-w-6xl flex-col gap-8 pt-8 px-safe-4 pb-14 sm:px-safe-6 lg:gap-10 lg:pt-10 lg:px-safe-10">
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
          {cards.map((game) => {
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
                <Card className={cn("group flex w-full flex-col overflow-hidden p-0", LIFT)}>
                  {/* The game's own colours apply inside `data-game` (games/<id>/theme.css). */}
                  <div
                    data-game={game.id}
                    className="grid h-42 place-items-center overflow-hidden bg-game-tint"
                  >
                    <div className={GROW}>
                      <Artwork />
                    </div>
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
      {/* Attribution of the third-party code and art shipped with the app (chess.js, the
          "staunty" pieces): a static file, so a plain link. */}
      <footer className="mx-auto max-w-6xl px-safe-4 pb-safe-8 sm:px-safe-6 lg:px-safe-10">
        <a
          href="/third-party-licenses.txt"
          className="focus-ring inline-block rounded-sm py-2 text-small text-fg-muted underline underline-offset-2 transition-lift hover:text-fg hover:decoration-2 focus-visible:decoration-2 motion-reduce:transition-none"
        >
          {t("thirdPartyLicenses")}
        </a>
      </footer>
    </>
  );
}
