"use client";

import { useEffect } from "react";

const META_SELECTOR = 'meta[name="theme-color"]';

/** The colour of the page's top bar, which is the page's own background (a game's, or `--bg`). */
function pageColour(): string {
  const bar = document.querySelector("[data-top-bar]") ?? document.body;
  return getComputedStyle(bar).backgroundColor;
}

/**
 * Sets every `theme-color` tag (the server may send one per colour scheme: whichever the browser
 * picks shows the page's colour) to the page's colour, only where it differs, so the observer
 * watching them never loops on its own writes.
 */
function sync(): void {
  const colour = pageColour();
  const metas = document.querySelectorAll<HTMLMetaElement>(META_SELECTOR);
  if (metas.length === 0) {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = colour;
    document.head.append(meta);
    return;
  }
  for (const meta of metas) if (meta.content !== colour) meta.content = colour;
}

/**
 * Keeps the browser's bar (`<meta name="theme-color">`) the colour of the page on screen: a game's
 * own background on its play screen and rules, the shared one elsewhere, in the theme shown (picked
 * or the system's). Mounted with every page's top bar, it sets it when the page opens, when the
 * player picks a theme (`<html data-theme>`), when the system's setting changes, and whenever the
 * tags themselves change — a new language re-renders the page's head, whose tags come back with the
 * server's colours. Until this runs, the bar shows the server's: the shared background of the theme
 * (`generateViewport`), not yet a game's.
 */
export function ThemeColorSync() {
  useEffect(() => {
    sync();
    const theme = new MutationObserver(sync);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    // The tags replaced or rewritten by the server's head (a language changed, a navigation).
    const head = new MutationObserver((records) => {
      const touched = records.some(
        (record) =>
          (record.target instanceof HTMLMetaElement && record.target.name === "theme-color") ||
          [...record.addedNodes].some(
            (node) => node instanceof HTMLMetaElement && node.name === "theme-color",
          ),
      );
      if (touched) sync();
    });
    head.observe(document.head, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["content", "media"],
    });
    // Absent where the browser cannot tell (jsdom): the theme then only changes by `data-theme`.
    const scheme =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;
    scheme?.addEventListener("change", sync);
    return () => {
      theme.disconnect();
      head.disconnect();
      scheme?.removeEventListener("change", sync);
    };
  }, []);
  return null;
}
