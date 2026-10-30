import type { Locale } from "./config";
import type { Messages } from "./messages";

// Makes useTranslations/getTranslations check message keys and ICU arguments at compile time.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
