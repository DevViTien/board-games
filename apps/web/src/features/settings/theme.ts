import { z } from "zod";

import { THEME_COOKIE } from "@/config/storage-keys";

/** The themes a player may pick; `system` follows the device's light or dark setting. */
export const THEME = { Light: "light", Dark: "dark", System: "system" } as const;

export type Theme = (typeof THEME)[keyof typeof THEME];

/** What the cookie may hold: a picked theme. Following the system is the absence of the cookie. */
const pickedThemeSchema = z.enum([THEME.Light, THEME.Dark]);

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

/**
 * The theme a cookie value stands for: `light` or `dark`, anything else (none, an old or broken
 * value) following the system, without telling the player.
 */
export function parseTheme(raw: string | undefined): Theme {
  const parsed = pickedThemeSchema.safeParse(raw);
  return parsed.success ? parsed.data : THEME.System;
}

/** The `data-theme` of `<html>` for a theme: none follows the system (styles.css). */
export function themeAttribute(theme: Theme): "light" | "dark" | undefined {
  return theme === THEME.System ? undefined : theme;
}

/**
 * Shows `theme` at once and remembers it for a year, on this browser only: `<html data-theme>` for
 * the page on screen, the cookie for the next ones, which the server then renders in it. Following
 * the system forgets both, so styles.css follows the device's setting, even as it changes.
 */
export function applyTheme(theme: Theme, page: Document = document): void {
  const attribute = themeAttribute(theme);
  if (attribute === undefined) {
    page.cookie = `${THEME_COOKIE}=; path=/; max-age=0; samesite=lax`;
    delete page.documentElement.dataset.theme;
  } else {
    page.cookie = `${THEME_COOKIE}=${attribute}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; samesite=lax`;
    page.documentElement.dataset.theme = attribute;
  }
}

/** The theme `<html>` shows now: what the server or an earlier choice set. */
export function currentTheme(page: Document = document): Theme {
  return parseTheme(page.documentElement.dataset.theme);
}
