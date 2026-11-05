import "./globals.css";

import { PAGE_BACKGROUND } from "@board-games/ui";
import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Noto_Sans_JP } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { SITE } from "@/config/site";
import { InitialThemeProvider } from "@/features/settings/InitialThemeProvider";
import { readTheme } from "@/features/settings/read-theme";
import { THEME, themeAttribute } from "@/features/settings/theme";
import { clientMessages } from "@/i18n/client-messages";

// The weights the type scale uses (packages/ui styles.css): body 400, captions and chips 600,
// headings and buttons 700, the display and status lines 800. Each is a preloaded file per subset.
const appFont = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-app",
  display: "swap",
});

// Fallback for Japanese glyphs. Not preloaded: the browser only fetches the slices a page uses.
const cjkFont = Noto_Sans_JP({
  variable: "--font-cjk",
  display: "swap",
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Site");
  return {
    title: {
      default: SITE.name,
      template: `%s · ${SITE.name}`,
    },
    description: t("tagline"),
    // iOS would turn numbers into links, and what players type is plain text.
    formatDetection: { telephone: false },
  };
}

/**
 * Drawn to the screen's edges (`viewport-fit=cover`): the pages keep their words and controls inside
 * the safe area (`--safe-*`). Zooming stays allowed (no `maximum-scale`, no `user-scalable`).
 * The browser's bar takes the page's background before any script runs: the picked theme's, or one
 * per colour scheme; `ThemeColorSync` then sets a game's own.
 */
export async function generateViewport(): Promise<Viewport> {
  const theme = await readTheme();
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor:
      theme === THEME.System
        ? [
            { media: "(prefers-color-scheme: light)", color: PAGE_BACKGROUND.light },
            { media: "(prefers-color-scheme: dark)", color: PAGE_BACKGROUND.dark },
          ]
        : PAGE_BACKGROUND[theme],
  };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const [locale, theme, messages] = await Promise.all([getLocale(), readTheme(), getMessages()]);

  return (
    // The picked theme is in the server's HTML, so the page never shows the other one first.
    // `auto-phrase`: Japanese lines break between phrases, not inside a word (others unaffected).
    <html
      lang={locale}
      data-theme={themeAttribute(theme)}
      className={`${appFont.variable} ${cjkFont.variable}`}
    >
      <body className="min-h-dvh bg-bg font-sans text-body [word-break:auto-phrase] text-fg antialiased">
        {/* Every message but the rules' (`clientMessages`): the rules page translates them on the
            server, the play screen's rules dialog loads them when it first opens. */}
        <NextIntlClientProvider messages={clientMessages(messages)}>
          <InitialThemeProvider theme={theme}>{children}</InitialThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
