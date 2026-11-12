import { readFileSync } from "node:fs";
import path from "node:path";

// Reading the `theme.css` of a game or a puzzle in tests: its blocks of tokens, the shared tokens of
// packages/ui, and WCAG contrast. The checks themselves stay with each kind's own test.

/** The declarations of the first rule whose selector is exactly `selector`. */
export function block(source: string, selector: string): ReadonlyMap<string, string> {
  const start = source.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No block ${selector}`);
  const open = source.indexOf("{", start);
  const close = source.indexOf("}", open);
  const tokens = new Map<string, string>();
  for (const [, name, value] of source.slice(open + 1, close).matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    if (name !== undefined && value !== undefined) tokens.set(name, value.trim());
  }
  return tokens;
}

/** The three blocks of a `theme.css` scoped to `scope`: light, the system's dark, the chosen dark. */
export function themeBlocks(css: string, scope: string) {
  return {
    light: block(css, scope),
    systemDark: block(
      css.slice(css.indexOf("@media (prefers-color-scheme: dark)")),
      `:root:not([data-theme="light"]) ${scope}`,
    ),
    chosenDark: block(css, `:root[data-theme="dark"] ${scope}`),
  };
}

/** WCAG contrast ratio of two `#rrggbb` colours. */
export function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r = 0, g = 0, bl = 0] = [1, 3, 5].map((index) => {
      const value = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
      return value <= 0.040_45 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [high = 0, low = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

/** The shared tokens (packages/ui styles.css), light and chosen dark. */
const SHARED_CSS = readFileSync(
  path.join(import.meta.dirname, "../../../../packages/ui/src/styles.css"),
  "utf8",
);
const SHARED = {
  light: block(SHARED_CSS, ":root"),
  dark: block(SHARED_CSS, ':root[data-theme="dark"]'),
} as const;

export type Theme = keyof typeof SHARED;

/** A shared token's value in `theme`. */
export function shared(theme: Theme, name: string): string {
  const value = SHARED[theme].get(name);
  if (value === undefined) throw new Error(`No ${name} in styles.css`);
  return value;
}

/**
 * The value of `name` in `theme` for a theme's own `tokens`: its own, or the contract's default (a
 * shared token), with `var(--x)` read from the shared tokens of that theme.
 */
export function resolve(theme: Theme, tokens: ReadonlyMap<string, string>, name: string): string {
  // The contract's defaults (`--game-*`) are in the light block only, as `var(--…)` of a theme.
  const value = tokens.get(name) ?? SHARED[theme].get(name) ?? shared("light", name);
  const reference = /^var\((--[\w-]+)\)$/.exec(value)?.[1];
  return reference === undefined ? value : shared(theme, reference);
}
