export const LOCALES = ["vi", "en", "ja"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "vi";

/** Cookie holding the language the player picked; it outranks the browser's preferences. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Names shown in the language switcher, each written in its own language. */
export const LOCALE_LABELS: Record<Locale, string> = {
  vi: "Tiếng Việt",
  en: "English",
  ja: "日本語",
};

/** Used by date/time formatting until players can pick their own time zone. */
export const TIME_ZONE = "Asia/Ho_Chi_Minh";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
