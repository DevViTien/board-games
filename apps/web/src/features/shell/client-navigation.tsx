"use client";

import { ArrowLeftIcon, cn } from "@board-games/ui";
import { type ComponentProps, type MouseEvent, useCallback } from "react";

import { BACK_LINK_CLASS } from "./AppTopBar";

// Screens that are one client page (a tool, a puzzle): moving between them asks the server nothing,
// so they all keep working when the network goes (design §2 of add-toolbox-card-score). Next.js
// syncs `usePathname` to the browser's own `pushState`.

// The screen arrived at by the app's own move takes the focus when its title appears, for the
// keyboard and screen readers to start there: the link that was pressed is gone.
let titleTakesFocus = false;

/** Goes to another screen of the same client page. `replace`: Back must not come here again (a sent form). */
export function goTo(href: string, { replace = false } = {}): void {
  titleTakesFocus = true;
  if (replace) window.history.replaceState(null, "", href);
  else window.history.pushState(null, "", href);
  window.scrollTo(0, 0);
}

/** A real link to another screen of the same client page: opens in a new tab like any other. */
export function HistoryLink({ href, onClick, ...props }: ComponentProps<"a"> & { href: string }) {
  const follow = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    goTo(href);
  };
  return <a href={href} onClick={follow} {...props} />;
}

/** The top bar's way back to another screen of the same client page. */
export function BackLink({ href, label }: { readonly href: string; readonly label: string }) {
  return (
    <HistoryLink href={href} className={BACK_LINK_CLASS}>
      <ArrowLeftIcon aria-hidden className="size-5" />
      <span className="max-sm:sr-only">{label}</span>
    </HistoryLink>
  );
}

/** A screen's title, which takes the focus when the app has just moved to this screen. */
export function ScreenTitle({ className, ...props }: ComponentProps<"h1">) {
  const ref = useCallback((heading: HTMLHeadingElement | null) => {
    if (heading !== null && titleTakesFocus) {
      titleTakesFocus = false;
      heading.focus({ preventScroll: true });
    }
  }, []);
  return <h1 ref={ref} tabIndex={-1} className={cn("focus:outline-none", className)} {...props} />;
}
