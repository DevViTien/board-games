import { buttonVariants } from "@board-games/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function GameNotFound() {
  const t = useTranslations("Play");

  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{t("notFound.title")}</h1>
      <p className="text-fg-muted">{t("notFound.description")}</p>
      <Link href="/" className={buttonVariants()}>
        {t("backToMenu")}
      </Link>
    </main>
  );
}
