"use client";

import { Button, buttonVariants } from "@board-games/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface PlayErrorProps {
  readonly error: unknown;
  /** Re-renders the play route, which loads the game's code again. */
  readonly retry: () => void;
}

/**
 * Shown when the play screen fails, most likely because the game's code could not be loaded
 * (offline, or an old tab after a deploy). Without it the player would get Next's untranslated
 * error page and could only reload.
 */
export default function PlayError({ retry }: PlayErrorProps) {
  const t = useTranslations("Play");

  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{t("loadError.title")}</h1>
      <p className="text-fg-muted">{t("loadError.description")}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={retry}>{t("loadError.retry")}</Button>
        <Link href="/" className={buttonVariants({ variant: "secondary" })}>
          {t("backToMenu")}
        </Link>
      </div>
    </main>
  );
}
