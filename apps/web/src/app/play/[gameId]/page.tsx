import { isRegisteredGameId } from "@board-games/games";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PlayRoute } from "@/features/play/PlayRoute";

interface PlayPageProps {
  readonly params: Promise<{ gameId: string }>;
}

export async function generateMetadata({ params }: PlayPageProps): Promise<Metadata> {
  const { gameId } = await params;
  if (!isRegisteredGameId(gameId)) return {};
  const t = await getTranslations("Games");
  return { title: t(`${gameId}.name`) };
}

export default async function PlayPage({ params }: PlayPageProps) {
  const { gameId } = await params;
  if (!isRegisteredGameId(gameId)) notFound();
  return <PlayRoute gameId={gameId} />;
}
