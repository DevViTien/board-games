import { buttonVariants } from "@board-games/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { AppStateScreen } from "@/features/shell/AppStateScreen";

/** `/rules/<id>` of no registered game: said in words, with the way back to the menu. */
export default function RulesNotFound() {
  const t = useTranslations("Rules");

  return (
    <AppStateScreen
      title={t("notFound.title")}
      description={t("notFound.description")}
      tone="warning"
    >
      <Link href="/" className={buttonVariants()}>
        {t("backToMenu")}
      </Link>
    </AppStateScreen>
  );
}
