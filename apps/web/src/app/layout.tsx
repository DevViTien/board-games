import "./globals.css";

import type { Metadata } from "next";
import { Be_Vietnam_Pro, Noto_Sans_JP } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { SITE } from "@/config/site";
import { readTheme } from "@/features/settings/read-theme";
import { themeAttribute } from "@/features/settings/theme";

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
  };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const [locale, theme] = await Promise.all([getLocale(), readTheme()]);

  return (
    // The picked theme is in the server's HTML, so the page never shows the other one first.
    // `auto-phrase`: Japanese lines break between phrases, not inside a word (others unaffected).
    <html
      lang={locale}
      data-theme={themeAttribute(theme)}
      className={`${appFont.variable} ${cjkFont.variable}`}
    >
      <body className="min-h-dvh bg-bg font-sans text-body [word-break:auto-phrase] text-fg antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
