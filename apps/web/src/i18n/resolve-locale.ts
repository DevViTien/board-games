import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";

/**
 * Picks the UI language for a request: the player's saved choice first, then the
 * browser's preferred languages, then the default.
 *
 * URLs carry no locale on purpose, so a shared room link opens in each friend's own language.
 */
export function resolveLocale(
  savedLocale: string | undefined,
  acceptLanguage: string | null,
): Locale {
  if (isLocale(savedLocale)) return savedLocale;

  for (const tag of parseAcceptLanguage(acceptLanguage)) {
    const language = tag.split("-")[0]?.toLowerCase();
    if (isLocale(language)) return language;
  }

  return DEFAULT_LOCALE;
}

/** Language tags from an Accept-Language header, most preferred first. */
function parseAcceptLanguage(header: string | null): string[] {
  if (!header) return [];

  return header
    .split(",")
    .map((part) => {
      const [tag = "", ...params] = part.split(";").map((piece) => piece.trim());
      const qualityParam = params.find((param) => param.startsWith("q="));
      const quality = qualityParam === undefined ? 1 : Number(qualityParam.slice(2));
      return { tag, quality: Number.isNaN(quality) ? 0 : quality };
    })
    .filter((entry) => entry.tag !== "" && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality)
    .map((entry) => entry.tag);
}
