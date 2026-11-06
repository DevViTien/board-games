import { ChevronRightIcon } from "@board-games/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { AppTopBar } from "@/features/shell/AppTopBar";
import { type ToolEntry, TOOLS } from "@/tools/registry";

interface ToolboxPageProps {
  /** The tools on show: every registered one by default (tests). */
  readonly tools?: readonly ToolEntry[];
}

/** `/tools`: things that help when playing together at a table, each leading to its own pages. */
export function ToolboxPage({ tools = TOOLS }: ToolboxPageProps) {
  const t = useTranslations("Toolbox");

  return (
    <>
      <AppTopBar />
      <main className="mx-auto flex max-w-3xl flex-col gap-5 pt-6 px-safe-4 pb-14 sm:px-safe-6 lg:pt-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-title">{t("title")}</h1>
          <p className="text-body text-fg-muted">{t("lead")}</p>
        </div>
        <ul className="flex flex-col gap-4">
          {tools.map(({ id, href, Artwork }, index) => (
            <li key={`${id}-${index}`}>
              <Link
                href={href}
                className="focus-ring flex items-center gap-4 rounded-card border border-border bg-surface p-5 shadow-card transition-lift hover:shadow-raised motion-reduce:transition-none"
              >
                <span className="grid size-22 shrink-0 place-items-center rounded-control bg-accent-soft">
                  <Artwork />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-heading">{t(`tools.${id}.name`)}</span>
                  <span className="mt-1 block text-small text-fg-muted">
                    {t(`tools.${id}.tagline`)}
                  </span>
                </span>
                <ChevronRightIcon aria-hidden className="size-5 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
