"use client";

import { Select } from "@board-games/ui";
import { useLocale, useTranslations } from "next-intl";
import { useId, useTransition } from "react";

import { setLocale } from "@/i18n/actions";
import { isLocale, LOCALE_LABELS, LOCALES } from "@/i18n/config";

export function LocaleSwitcher() {
  const t = useTranslations("Settings");
  const locale = useLocale();
  const selectId = useId();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={selectId} className="text-sm text-fg-muted">
        {t("language")}
      </label>
      <Select
        id={selectId}
        value={locale}
        disabled={isPending}
        onChange={(event) => {
          const next = event.target.value;
          if (!isLocale(next)) return;
          startTransition(async () => {
            await setLocale(next);
          });
        }}
      >
        {LOCALES.map((value) => (
          <option key={value} value={value} lang={value}>
            {LOCALE_LABELS[value]}
          </option>
        ))}
      </Select>
    </div>
  );
}
