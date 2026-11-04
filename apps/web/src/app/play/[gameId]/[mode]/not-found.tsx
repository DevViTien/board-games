import { buttonVariants } from "@board-games/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { AppStateScreen } from "@/features/shell/AppStateScreen";

/**
 * `/play/<gameId>/<mode>` with an unknown game or mode, or the AI mode of a game without an AI.
 * It does not claim the game does not exist: the mode may be what is wrong.
 */
export default function PlayModeNotFound() {
  const t = useTranslations("Play");

  return (
    <AppStateScreen
      title={t("modeNotFound.title")}
      description={t("modeNotFound.description")}
      tone="warning"
    >
      <Link href="/" className={buttonVariants()}>
        {t("backToMenu")}
      </Link>
    </AppStateScreen>
  );
}
