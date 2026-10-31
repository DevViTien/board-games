import { buttonVariants } from "@board-games/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";

/**
 * `/play/<gameId>/<mode>` with an unknown game or mode, or the AI mode of a game without an AI.
 * It does not claim the game does not exist: the mode may be what is wrong.
 */
export default function PlayModeNotFound() {
  const t = useTranslations("Play");

  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{t("modeNotFound.title")}</h1>
      <p className="text-fg-muted">{t("modeNotFound.description")}</p>
      <Link href="/" className={buttonVariants()}>
        {t("backToMenu")}
      </Link>
    </main>
  );
}
