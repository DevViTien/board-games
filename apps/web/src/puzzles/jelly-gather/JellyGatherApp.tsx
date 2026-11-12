"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { SITE } from "@/config/site";

import { LevelList } from "./LevelList";
import { PlayLevel } from "./PlayLevel";
import { JELLY_GATHER_HOME, routeOf } from "./routes";

/** The path's segments after `/puzzles/jelly-gather`, decoded as the server's route gets them. */
function segmentsOf(pathname: string): readonly string[] {
  return pathname
    .slice(JELLY_GATHER_HOME.length)
    .split("/")
    .filter((segment) => segment !== "")
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        // A broken "%" pushed by hand: no level has that name.
        return segment;
      }
    });
}

/**
 * Every screen of Gom thạch in one client page, chosen by the address: once open, moving between
 * the level list and every level needs no network (design §6). An address the client does not know
 * (pushed by hand) shows the list.
 */
export function JellyGatherApp() {
  const route = routeOf(segmentsOf(usePathname())) ?? { screen: "list" };
  const t = useTranslations("JellyGather");
  // The server titles the page it sends; moving between screens here asks it nothing, so the tab's
  // title follows in the same form ("Màn 2-1 · Gom thạch · Board Games Hub").
  const title =
    route.screen === "level"
      ? `${t("play.title", { level: route.level.id })} · ${t("title")}`
      : t("title");
  useEffect(() => {
    document.title = `${title} · ${SITE.name}`;
  }, [title]);
  return route.screen === "list" ? (
    <LevelList />
  ) : (
    <PlayLevel key={route.level.id} level={route.level} />
  );
}
