import { buttonVariants } from "@board-games/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { AppStateScreen } from "@/features/shell/AppStateScreen";

/** Any URL without a page (`/play`, a typo): translated, with a way back, unlike Next's default. */
export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <AppStateScreen title={t("title")} description={t("description")} tone="warning">
      <Link href="/" className={buttonVariants()}>
        {t("backToMenu")}
      </Link>
    </AppStateScreen>
  );
}
