"use client";

import { ToggleGroup } from "@board-games/ui";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { setLocale } from "@/i18n/actions";
import { DEFAULT_LOCALE, isLocale, LOCALE_LABELS, LOCALES } from "@/i18n/config";

const OPTIONS = LOCALES.map((value) => ({ value, label: LOCALE_LABELS[value], lang: value }));

interface LocaleSwitcherProps {
  readonly className?: string | undefined;
}

/**
 * "Language": each language named in itself, a button each. Not radios: their arrow keys would
 * reload the page in every language passed on the way. While the new language is saved and the page
 * re-rendered, the group is busy and ignores presses; the button pressed keeps the focus.
 */
export function LocaleSwitcher({ className }: LocaleSwitcherProps) {
  const t = useTranslations("Settings");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  return (
    <ToggleGroup
      label={t("language")}
      size="sm"
      options={OPTIONS}
      value={isLocale(locale) ? locale : DEFAULT_LOCALE}
      busy={isPending}
      className={className}
      onChange={(next) => {
        startTransition(async () => {
          await setLocale(next);
        });
      }}
    />
  );
}
