import { useTranslations } from "next-intl";

/** Shown while a game's code or its saved game is loading. */
export function PlayLoading() {
  const t = useTranslations("Play");
  return (
    <main className="mx-auto flex max-w-3xl justify-center px-4 py-16">
      <p role="status" className="text-fg-muted">
        {t("loading")}
      </p>
    </main>
  );
}
