import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { LOCALE_COOKIE, TIME_ZONE } from "./config";
import { MESSAGE_LOADERS } from "./messages";
import { resolveLocale } from "./resolve-locale";

// Entry point next-intl loads for every request (wired in next.config.ts).
export default getRequestConfig(async () => {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const locale = resolveLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    headerList.get("accept-language"),
  );

  return {
    locale,
    messages: (await MESSAGE_LOADERS[locale]()).default,
    timeZone: TIME_ZONE,
  };
});
