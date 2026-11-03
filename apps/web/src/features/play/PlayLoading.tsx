import { StateScreen } from "@board-games/ui";
import { useTranslations } from "next-intl";

/** Shown while a game's code or its saved game is loading. */
export function PlayLoading() {
  const t = useTranslations("Play");
  return <StateScreen title={t("loading")} busy />;
}
