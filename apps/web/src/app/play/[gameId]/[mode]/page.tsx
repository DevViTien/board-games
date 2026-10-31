import { findGame, isRegisteredGameId, type RegisteredGameId } from "@board-games/games";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PlayRoute } from "@/features/play/PlayRoute";
import { isSlotMode } from "@/transport/saved-game";
import type { SlotMode } from "@/transport/types";

interface PlayModePageProps {
  readonly params: Promise<{ gameId: string; mode: string }>;
}

/** The game and mode of the address, or `undefined` when there is no such play screen. */
function playScreenOf(
  gameId: string,
  mode: string,
): { gameId: RegisteredGameId; mode: SlotMode } | undefined {
  if (!isRegisteredGameId(gameId) || !isSlotMode(mode)) return undefined;
  // Against the AI only for a game that has one.
  if (mode === "ai" && findGame(gameId)?.meta.supportsAI !== true) return undefined;
  return { gameId, mode };
}

export async function generateMetadata({ params }: PlayModePageProps): Promise<Metadata> {
  const { gameId, mode } = await params;
  const screen = playScreenOf(gameId, mode);
  if (screen === undefined) return {};
  const t = await getTranslations("Games");
  return { title: t(`${screen.gameId}.name`) };
}

/** `/play/<gameId>/local` and `/play/<gameId>/ai`: the play screen of one mode. */
export default async function PlayModePage({ params }: PlayModePageProps) {
  const { gameId, mode } = await params;
  const screen = playScreenOf(gameId, mode);
  if (screen === undefined) notFound();
  // Only strings cross to the client: the game's rules are functions.
  return <PlayRoute gameId={screen.gameId} mode={screen.mode} />;
}
