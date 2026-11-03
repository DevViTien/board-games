import { buttonVariants, StateScreen } from "@board-games/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function GameNotFound() {
  const t = useTranslations("Play");

  return (
    <StateScreen title={t("notFound.title")} description={t("notFound.description")} tone="warning">
      <Link href="/" className={buttonVariants()}>
        {t("backToMenu")}
      </Link>
    </StateScreen>
  );
}
