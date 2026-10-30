import { buttonVariants } from "@board-games/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";

/** Any URL without a page (`/play`, a typo): translated, with a way back, unlike Next's default. */
export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-fg-muted">{t("description")}</p>
      <Link href="/" className={buttonVariants()}>
        {t("backToMenu")}
      </Link>
    </main>
  );
}
