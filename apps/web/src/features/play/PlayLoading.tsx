import { useTranslations } from "next-intl";

import { AppStateScreen } from "@/features/shell/AppStateScreen";

/** Shown while a game's code or its saved game is loading. */
export function PlayLoading() {
  const t = useTranslations("Play");
  return <AppStateScreen title={t("loading")} busy />;
}
