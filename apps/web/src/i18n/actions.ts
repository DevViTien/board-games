"use server";

import { cookies } from "next/headers";

import { isLocale, LOCALE_COOKIE } from "./config";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

/** Saves the player's language; setting a cookie in a server action re-renders the page. */
export async function setLocale(locale: string): Promise<void> {
  // Server actions are public endpoints, so the argument is untrusted input.
  if (!isLocale(locale)) throw new Error(`Unsupported locale: ${locale}`);

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR_IN_SECONDS,
    sameSite: "lax",
  });
}
