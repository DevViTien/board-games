import { ArrowLeftIcon, buttonVariants, cn, LogoMark, TopBar } from "@board-games/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { SITE } from "@/config/site";
import { LocaleMenu } from "@/features/settings/LocaleMenu";
import { ThemeColorSync } from "@/features/settings/ThemeColorSync";
import { ThemeMenu } from "@/features/settings/ThemeMenu";

/** The look of the top bar's way back: its icon alone below 640 px, named all the same. */
export const BACK_LINK_CLASS = cn(
  buttonVariants({ variant: "ghost" }),
  "px-3 whitespace-nowrap max-sm:size-11 max-sm:px-0",
);

interface AppTopBarProps {
  /** The menu's bar: the app's mark and name, instead of the way back to the menu. */
  readonly home?: boolean;
  /** The way back, instead of the one to the menu: a page deeper in the app (`BACK_LINK_CLASS`). */
  readonly back?: ReactNode;
  /** The page's title (the play screen's game), one line, truncated on a phone. */
  readonly title?: ReactNode;
  /** The page's own actions ("Luật chơi"), before the settings. */
  readonly actions?: ReactNode;
}

/**
 * The top bar of every page of the app (`TopBar`): "← Về menu" (its icon alone below 640 px, named
 * all the same) or, on the menu, the app's name; the page's title; its actions; and always the theme
 * and language menus last, so no page can leave them out. Usable on the server (the rules page) and
 * in the client (the play screen).
 */
export function AppTopBar({ home = false, back, title, actions }: AppTopBarProps) {
  const t = useTranslations("Play");

  return (
    <TopBar
      start={
        home ? (
          <p
            translate="no"
            className="flex min-w-0 items-center gap-2 text-body leading-tight font-extrabold"
          >
            <LogoMark className="size-8 shrink-0" />
            <span className="min-w-0 truncate">{SITE.name}</span>
          </p>
        ) : (
          (back ?? (
            <Link href="/" className={BACK_LINK_CLASS}>
              <ArrowLeftIcon aria-hidden className="size-5" />
              <span className="max-sm:sr-only">{t("backToMenu")}</span>
            </Link>
          ))
        )
      }
      center={title}
      end={
        <>
          {actions}
          <ThemeMenu />
          <LocaleMenu />
          <ThemeColorSync />
        </>
      }
    />
  );
}
