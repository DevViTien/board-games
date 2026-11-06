"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { GroupEdit } from "./GroupEdit";
import { NewGroup } from "./GroupForm";
import { GroupList } from "./GroupList";
import { CARD_SCORE_HOME, routeOf } from "./routes";
import { Scoreboard } from "./Scoreboard";

/** The path's segments after `/tools/card-score`, decoded as the server's route gets them. */
function segmentsOf(pathname: string): readonly string[] {
  return pathname
    .slice(CARD_SCORE_HOME.length)
    .split("/")
    .filter((segment) => segment !== "")
    .map(decodeURIComponent);
}

/**
 * Every screen of the tool in one client page, chosen by the address: once it is open, moving
 * between them needs no network (design §2).
 */
export function CardScoreApp() {
  const pathname = usePathname();
  const from = useSearchParams().get("from");
  const route = routeOf(segmentsOf(pathname)) ?? { screen: "list" };

  switch (route.screen) {
    case "list":
      return <GroupList />;
    case "new":
      return <NewGroup from={from} />;
    case "board":
      return <Scoreboard key={route.groupId} groupId={route.groupId} />;
    case "edit":
      return <GroupEdit key={route.groupId} groupId={route.groupId} />;
  }
}
