import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { JellyGatherApp } from "@/puzzles/jelly-gather/JellyGatherApp";
import { routeOf } from "@/puzzles/jelly-gather/routes";

interface JellyGatherRouteProps {
  readonly params: Promise<{ path?: string[] }>;
}

export async function generateMetadata({ params }: JellyGatherRouteProps): Promise<Metadata> {
  const t = await getTranslations("JellyGather");
  const { path = [] } = await params;
  const route = routeOf(path);
  return {
    title:
      route?.screen === "level"
        ? `${t("play.title", { level: route.level.id })} · ${t("title")}`
        : t("title"),
  };
}

/**
 * Every address of Gom thạch: the level list and each level. The screens are one client page, so
 * moving between them works without the network; this only refuses the addresses that are none of
 * them (design §6 of add-jelly-gather-puzzle).
 */
export default async function JellyGatherRoute({ params }: JellyGatherRouteProps) {
  const { path = [] } = await params;
  if (routeOf(path) === null) notFound();
  return <JellyGatherApp />;
}
