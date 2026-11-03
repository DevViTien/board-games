import { LogoMark } from "@board-games/ui";

import { SITE } from "@/config/site";
import { LocaleSwitcher } from "@/features/settings/LocaleSwitcher";
import type { Theme } from "@/features/settings/theme";
import { ThemeSwitcher } from "@/features/settings/ThemeSwitcher";

interface AppBarProps {
  /** The theme the page is rendered in, from the request's cookie. */
  readonly theme: Theme;
}

/**
 * The menu's top bar: the app's mark and name, then the theme and the language. Below 640 px the
 * language takes a row of its own, so nothing scrolls sideways at 360 px.
 */
export function AppBar({ theme }: AppBarProps) {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-10">
        {/* Takes the room left beside the theme, its name wrapping on a narrow phone, so the bar
            stays two rows (the language below) down to 360 px. */}
        <p
          translate="no"
          className="flex min-w-0 grow basis-0 items-center gap-2 text-body leading-tight font-extrabold"
        >
          <LogoMark className="size-8" />
          <span className="min-w-0">{SITE.name}</span>
        </p>
        <ThemeSwitcher initialTheme={theme} />
        <LocaleSwitcher className="max-sm:w-full max-sm:*:flex-1" />
      </div>
    </header>
  );
}
