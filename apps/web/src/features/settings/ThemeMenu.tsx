"use client";

import {
  Menu,
  MenuButton,
  MenuRadioGroup,
  MenuRadioItem,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from "@board-games/ui";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

import { useInitialTheme } from "./InitialThemeProvider";
import { SETTING_BUTTON } from "./setting-button";
import { applyTheme, currentTheme, THEME } from "./theme";

const OPTIONS = [
  { value: THEME.Light, Icon: SunIcon },
  { value: THEME.Dark, Icon: MoonIcon },
  { value: THEME.System, Icon: MonitorIcon },
] as const;

/** Follows `<html data-theme>`, whoever changes it. */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => {
    observer.disconnect();
  };
}

/**
 * "Theme" on the top bar of every page: a button showing the theme chosen (sun, moon, or a screen
 * for the system's) and named by it ("Giao diện: Theo hệ thống"), opening a menu of light, dark and
 * the system's, applied at once and remembered (`applyTheme`). What it shows is what `<html>` shows,
 * read after hydration (the server's choice before), so a page restored from the browser's cache
 * after a change in another tab shows the right choice. Nothing else re-renders: a game goes on.
 */
export function ThemeMenu() {
  const t = useTranslations("Settings");
  const initialTheme = useInitialTheme();
  const theme = useSyncExternalStore(
    subscribe,
    () => currentTheme(),
    () => initialTheme,
  );
  const { Icon } = OPTIONS.find((option) => option.value === theme) ?? OPTIONS[2];

  return (
    <Menu>
      <MenuButton
        aria-label={t("themeButton", { theme: t(`themes.${theme}`) })}
        className={SETTING_BUTTON}
      >
        <Icon aria-hidden className="size-5" />
      </MenuButton>
      <MenuRadioGroup>
        {OPTIONS.map(({ value, Icon: ItemIcon }) => (
          <MenuRadioItem
            key={value}
            checked={value === theme}
            icon={<ItemIcon aria-hidden />}
            onSelect={() => {
              applyTheme(value);
            }}
          >
            {t(`themes.${value}`)}
          </MenuRadioItem>
        ))}
      </MenuRadioGroup>
    </Menu>
  );
}
