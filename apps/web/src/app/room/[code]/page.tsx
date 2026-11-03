import { normalizeRoomCode } from "@board-games/protocol";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";

import { RoomRoute } from "@/features/room/RoomRoute";
import { configuredRealtimeUrl } from "@/lib/realtime-url";

interface RoomPageProps {
  readonly params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: RoomPageProps): Promise<Metadata> {
  const code = normalizeRoomCode((await params).code);
  if (code === null) return {};
  const t = await getTranslations("Room");
  return { title: t("title", { code }) };
}

/**
 * `/room/<code>`: an online room, by its invite link or its code typed on the menu. A code typed
 * in lower case is sent to its canonical address, so every link to a room is the same.
 */
export default async function RoomPage({ params }: RoomPageProps) {
  const { code } = await params;
  const room = normalizeRoomCode(code);
  if (room === null) notFound();
  if (room !== code) redirect(`/room/${room}`);
  // Read at request time, not at build time: E2E points a production build at its own server.
  await connection();
  return <RoomRoute code={room} realtimeUrl={configuredRealtimeUrl(process.env)} />;
}
