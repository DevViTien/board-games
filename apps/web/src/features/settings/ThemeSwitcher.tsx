"use client";

import { MonitorIcon, MoonIcon, RadioGroup, SunIcon } from "@board-games/ui";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

import { applyTheme, currentTheme, THEME, type Theme } from "./theme";

const OPTIONS = [
  { value: THEME.Light, icon: SunIcon },
  { value: THEME.Dark, icon: MoonIcon },
  { value: THEME.System, icon: MonitorIcon },
] as const;

/** Follows `<html data-theme>`, whoever changes it. */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => {
    observer.disconnect();
  };
}

interface ThemeSwitcherProps {
  /** The theme the server rendered the page in (`readTheme`), so the first paint shows it chosen. */
  readonly initialTheme: Theme;
}

/**
 * "Theme": light, dark or the system's, applied at once and remembered (`applyTheme`). Radios fit:
 * stepping through them with the arrow keys costs nothing. What it shows is what `<html>` shows,
 * read after hydration, so a page restored from the browser's cache after a change in another tab
 * shows the right choice.
 */
export function ThemeSwitcher({ initialTheme }: ThemeSwitcherProps) {
  const t = useTranslations("Settings");
  const theme = useSyncExternalStore(
    subscribe,
    () => currentTheme(),
    () => initialTheme,
  );

  return (
    <RadioGroup
      legend={t("theme")}
      hideLegend
      compact
      size="sm"
      options={OPTIONS.map(({ value, icon }) => ({ value, icon, label: t(`themes.${value}`) }))}
      value={theme}
      onChange={(next) => {
        applyTheme(next);
      }}
    />
  );
}
