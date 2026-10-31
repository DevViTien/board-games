"use client";

import { Button, buttonVariants } from "@board-games/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { forgetFailedGameEntryLoads } from "./game-entry-loads";

export interface PlayLoadErrorProps {
  readonly error: unknown;
  /** Re-renders the route; a failed load of the game's code is forgotten first, so it is tried again. */
  readonly retry: () => void;
}

/**
 * Shown by the play routes' `error.tsx` when a screen fails, most likely because the game's code
 * could not be loaded (offline, or an old tab after a deploy). Without it the player would get
 * Next's untranslated error page and could only reload.
 */
export function PlayLoadError({ retry }: PlayLoadErrorProps) {
  const t = useTranslations("Play");

  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{t("loadError.title")}</h1>
      <p className="text-fg-muted">{t("loadError.description")}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          onClick={() => {
            forgetFailedGameEntryLoads();
            retry();
          }}
        >
          {t("loadError.retry")}
        </Button>
        <Link href="/" className={buttonVariants({ variant: "secondary" })}>
          {t("backToMenu")}
        </Link>
      </div>
    </main>
  );
}
