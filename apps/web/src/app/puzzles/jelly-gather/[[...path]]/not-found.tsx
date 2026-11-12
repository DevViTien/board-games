import { buttonVariants } from "@board-games/ui";
import type { Route } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { AppStateScreen } from "@/features/shell/AppStateScreen";
import { BACK_LINK_CLASS } from "@/features/shell/AppTopBar";
import { LEVELS } from "@/puzzles/jelly-gather/levels";
import { JELLY_GATHER_HOME } from "@/puzzles/jelly-gather/routes";

const HOME = JELLY_GATHER_HOME as Route;

/** An address of Gom thạch that is no level: say so, and lead back to the levels. */
export default function LevelNotFound() {
  const t = useTranslations("JellyGather");
  return (
    <AppStateScreen
      title={t("notFound.title")}
      description={t("notFound.description", {
        count: LEVELS.length,
        first: LEVELS[0]?.id ?? "",
        last: LEVELS.at(-1)?.id ?? "",
      })}
      tone="warning"
      back={
        <Link href={HOME} className={BACK_LINK_CLASS}>
          {t("play.backToList")}
        </Link>
      }
    >
      <Link href={HOME} className={buttonVariants()}>
        {t("notFound.back")}
      </Link>
    </AppStateScreen>
  );
}
