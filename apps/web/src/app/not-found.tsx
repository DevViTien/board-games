import { buttonVariants, StateScreen } from "@board-games/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";

/** Any URL without a page (`/play`, a typo): translated, with a way back, unlike Next's default. */
export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <StateScreen title={t("title")} description={t("description")} tone="warning">
      <Link href="/" className={buttonVariants()}>
        {t("backToMenu")}
      </Link>
    </StateScreen>
  );
}
