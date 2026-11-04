import { findGame, isRegisteredGameId } from "@board-games/games";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { RulesPage } from "@/features/rules/RulesPage";
import { GAME_ARTWORK } from "@/games/artwork";
import { GAME_RULES } from "@/games/rules";

interface RulesRouteProps {
  readonly params: Promise<{ gameId: string }>;
}

export async function generateMetadata({ params }: RulesRouteProps): Promise<Metadata> {
  const { gameId } = await params;
  if (!isRegisteredGameId(gameId)) return {};
  const [t, tGames] = await Promise.all([getTranslations("Rules"), getTranslations("Games")]);
  return { title: t("title", { game: tGames(`${gameId}.name`) }) };
}

/**
 * `/rules/<gameId>`: a game's rules, rendered and translated on the server. The page has no client
 * component of its own: its words (the `Rules` messages, which the client never receives) and its
 * figures arrive as HTML.
 */
export default async function RulesRoute({ params }: RulesRouteProps) {
  const { gameId } = await params;
  const game = findGame(gameId);
  if (!isRegisteredGameId(gameId) || game === undefined) notFound();
  const [t, tGames, tMenu, Rules] = await Promise.all([
    getTranslations("Rules"),
    getTranslations("Games"),
    getTranslations("Menu"),
    GAME_RULES[gameId](),
  ]);
  const name = tGames(`${gameId}.name`);
  const { players, durationMinutes } = game.meta;
  const Artwork = GAME_ARTWORK[gameId];
  return (
    <RulesPage
      gameId={gameId}
      title={t("title", { game: name })}
      facts={
        <>
          {players.min === players.max
            ? tMenu("playersFixed", { count: players.min })
            : tMenu("playersRange", players)}
          <span aria-hidden> · </span>
          {tMenu("duration", { minutes: durationMinutes })}
        </>
      }
      artwork={<Artwork className="size-16" />}
      playLabel={t("play", { game: name })}
    >
      <Rules t={t} place="page" />
    </RulesPage>
  );
}
