import { buttonVariants } from "@board-games/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { AppStateScreen } from "@/features/shell/AppStateScreen";

export default function GameNotFound() {
  const t = useTranslations("Play");

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
