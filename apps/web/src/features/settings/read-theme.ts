import { cookies } from "next/headers";

import { THEME_COOKIE } from "@/config/storage-keys";

import { parseTheme, type Theme } from "./theme";

/** The theme the player picked, from the request's cookie (server only). */
export async function readTheme(): Promise<Theme> {
  const cookieStore = await cookies();
  return parseTheme(cookieStore.get(THEME_COOKIE)?.value);
}
