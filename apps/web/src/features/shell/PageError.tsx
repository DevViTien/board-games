"use client";

import { Button, buttonVariants } from "@board-games/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { AppStateScreen } from "./AppStateScreen";

export interface PageErrorProps {
  readonly error: unknown;
  /** Renders the route again. */
  readonly retry: () => void;
}

/**
 * A page that failed to render (an `error.tsx`): said in the player's language, with the app's top
 * bar, a way to try again and the way back to the menu, instead of Next's untranslated page.
 */
export function PageError({ retry }: PageErrorProps) {
  const t = useTranslations("PageError");

  return (
    <AppStateScreen title={t("title")} description={t("description")} tone="warning">
      <Button onClick={retry}>{t("retry")}</Button>
      <Link href="/" className={buttonVariants({ variant: "secondary" })}>
        {t("backToMenu")}
      </Link>
    </AppStateScreen>
  );
}
