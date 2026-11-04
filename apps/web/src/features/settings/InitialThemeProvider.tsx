"use client";

import { createContext, type ReactNode, use } from "react";

import { THEME, type Theme } from "./theme";

const InitialThemeContext = createContext<Theme>(THEME.System);

/**
 * The theme the server rendered the page in (`readTheme`, from the request's cookie), given once by
 * the root layout: what the theme menu shows until hydration has read `<html>`, so its icon is right
 * in the server's HTML on every page.
 */
export function InitialThemeProvider({
  theme,
  children,
}: {
  readonly theme: Theme;
  readonly children: ReactNode;
}) {
  return <InitialThemeContext value={theme}>{children}</InitialThemeContext>;
}

export function useInitialTheme(): Theme {
  return use(InitialThemeContext);
}
