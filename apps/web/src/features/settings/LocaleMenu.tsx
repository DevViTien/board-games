"use client";

import {
  cn,
  GlobeIcon,
  LoaderIcon,
  Menu,
  MenuButton,
  MenuRadioGroup,
  MenuRadioItem,
} from "@board-games/ui";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useState, useTransition } from "react";

import { setLocale } from "@/i18n/actions";
import { DEFAULT_LOCALE, isLocale, LOCALE_LABELS, LOCALES } from "@/i18n/config";

import { SETTING_BUTTON } from "./setting-button";

/**
 * "Language" on the top bar of every page: a globe and the language's code ("VI"), named by the
 * language ("Ngôn ngữ: Tiếng Việt, VI"), opening a menu of the languages, each named in itself.
 * A menu, not radios: moving through it changes nothing until one is chosen. Choosing saves it and
 * re-renders the page's server components in place (no reload, no navigation), so a game on screen
 * keeps its state and its connection. Meanwhile the button is busy (a spinner, still when motion is
 * reduced) and does not open; it keeps the focus. Saving may fail (offline, an app older than the
 * server after a deploy): the language then stays as it was, a short line under the button says so
 * (read politely), and the page — a game on it — is not touched.
 */
/** How long the line saying a language could not be saved stays. */
const FAILURE_SHOWN_MS = 8000;

export function LocaleMenu() {
  const t = useTranslations("Settings");
  const locale = useLocale();
  const current = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const code = current.toUpperCase();
  const [isPending, startTransition] = useTransition();
  const busyId = useId();
  // Whether the last choice could not be saved: said for a while, or until the next choice.
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!failed) return;
    const timer = window.setTimeout(() => {
      setFailed(false);
    }, FAILURE_SHOWN_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [failed]);
  const Icon = isPending ? LoaderIcon : GlobeIcon;

  return (
    <div className="relative flex">
      <Menu>
        <MenuButton
          busy={isPending}
          aria-describedby={isPending ? busyId : undefined}
          aria-label={t("languageButton", { language: LOCALE_LABELS[current], code })}
          className={SETTING_BUTTON}
        >
          <Icon
            aria-hidden
            className={cn("size-5", isPending && "animate-spin motion-reduce:animate-none")}
          />
          <span translate="no">{code}</span>
        </MenuButton>
        <MenuRadioGroup>
          {LOCALES.map((value) => (
            <MenuRadioItem
              key={value}
              checked={value === current}
              lang={value}
              onSelect={() => {
                setFailed(false);
                if (value === current) return;
                startTransition(async () => {
                  // Caught here: a failed server action would otherwise reach the route's error page
                  // and take the game on screen (and its connection) down with it.
                  try {
                    await setLocale(value);
                  } catch {
                    setFailed(true);
                  }
                });
              }}
            >
              {LOCALE_LABELS[value]}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
        {/* Read with the button while it is busy. Not a live region: the play screen's turn line is
          the page's one status. */}
        <span id={busyId} hidden>
          {t("languageSwitching")}
        </span>
      </Menu>
      {/* Always there, empty unless a choice failed: a live region is read when its words change. */}
      <p
        aria-live="polite"
        className="absolute top-full right-0 z-40 mt-2 w-max max-w-[min(18rem,calc(100vw-2rem))] rounded-control border border-border bg-surface px-3 py-2 text-small text-fg shadow-raised empty:border-0 empty:p-0 empty:shadow-none"
      >
        {failed ? t("languageFailed") : ""}
      </p>
    </div>
  );
}
