import "./globals.css";

import type { Metadata } from "next";
import { Be_Vietnam_Pro, Noto_Sans_JP } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { SITE } from "@/config/site";

const appFont = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
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
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${appFont.variable} ${cjkFont.variable}`}>
      <body className="min-h-dvh bg-bg font-sans text-fg antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
