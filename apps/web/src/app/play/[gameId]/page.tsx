import { findGame, isRegisteredGameId } from "@board-games/games";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";

import { SetupScreen } from "@/features/setup/SetupScreen";
import { configuredRealtimeUrl } from "@/lib/realtime-url";

interface SetupPageProps {
  readonly params: Promise<{ gameId: string }>;
}

export async function generateMetadata({ params }: SetupPageProps): Promise<Metadata> {
  const { gameId } = await params;
  if (!isRegisteredGameId(gameId)) return {};
  const t = await getTranslations("Games");
  return { title: t(`${gameId}.name`) };
}

/** `/play/<gameId>`: the setup screen, where a game is started or one in progress continued. */
export default async function SetupPage({ params }: SetupPageProps) {
  const { gameId } = await params;
  const game = findGame(gameId);
  if (!isRegisteredGameId(gameId) || game === undefined) notFound();
  // Read at request time, not at build time: E2E points a production build at its own server.
  await connection();
  // Only plain values cross to the client: the game's rules are functions.
  return (
    <SetupScreen
      gameId={gameId}
      supportsAI={game.meta.supportsAI}
      realtimeUrl={configuredRealtimeUrl(process.env)}
    />
  );
}
