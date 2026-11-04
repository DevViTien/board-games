import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { PAGE_BACKGROUND } from "./page-background";

// The tokens of styles.css, read as text: every colour has a light value and the same dark value in
// both dark blocks, and the pairs of the contrast table (design §2 of `add-design-foundation`) meet
// WCAG 2.2 AA. A token changed without its table fails here.

const css = readFileSync(path.join(import.meta.dirname, "styles.css"), "utf8");

type Tokens = ReadonlyMap<string, string>;

/** The declarations of the first rule whose selector is exactly `selector`. */
function block(source: string, selector: string): Tokens {
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

const light = block(css, ":root");
const systemDark = block(
  css.slice(css.indexOf("@media (prefers-color-scheme: dark)")),
  ':root:not([data-theme="light"])',
);
const chosenDark = block(css, ':root[data-theme="dark"]');

/** WCAG relative luminance of `#rrggbb`. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => {
    const value = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
    return value <= 0.040_45 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const [r = 0, g = 0, b = 0] = channels;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05);
}

const THEMES = [
  ["light", light],
  ["dark", chosenDark],
] as const;

/** A token's colour in one theme. Boards are the games' own (apps/web games/theme-css.test.ts). */
function colour(tokens: Tokens, name: string): string {
  const value = tokens.get(`--${name}`);
  if (value === undefined || !/^#[\da-f]{6}$/i.test(value)) {
    throw new Error(`--${name} is not a #rrggbb colour: ${String(value)}`);
  }
  return value;
}

const SURFACES = ["bg", "surface", "surface-muted", "surface-raised"];
const PIECES = ["red", "blue", "yellow", "green"];

/** [foreground, background, minimum]: text 4.5, graphics and edges 3. */
const PAIRS: readonly (readonly [string, string, number])[] = [
  ["fg", "bg", 4.5],
  ["fg", "surface-muted", 4.5],
  ["fg", "surface-raised", 4.5],
  // The edge of the seat whose turn it is, and the words of a player's row (add-game-feedback).
  ["fg", "surface", 4.5],
  // The "Your turn" chip of the players' panel (Badge `ink`), paper on ink.
  ["bg", "fg", 4.5],
  ["fg-muted", "bg", 4.5],
  ["fg-muted", "surface-muted", 4.5],
  ["fg-muted", "surface", 4.5],
  ["fg-muted", "surface-raised", 4.5],
  ...SURFACES.map((surface) => ["border-control", surface, 3] as const),
  ["accent-fg", "accent", 4.5],
  ["accent-fg", "accent-hover", 4.5],
  ["accent", "surface", 4.5],
  ["accent-ink", "accent-soft", 4.5],
  ["danger", "bg", 4.5],
  ["danger-ink", "danger-soft", 4.5],
  ["success", "surface", 3],
  ["success-ink", "success-soft", 4.5],
  ["success-ink", "bg", 4.5],
  ["warning", "surface", 4.5],
  ["warning-ink", "warning-soft", 4.5],
  ["celebration", "surface", 3],
  ["celebration-ink", "celebration-soft", 4.5],
  ...PIECES.flatMap((piece) => [
    [`piece-${piece}-ink`, `piece-${piece}`, 4.5] as const,
    [`piece-${piece}-ink`, `piece-${piece}-hover`, 4.5] as const,
  ]),
];

/** Backgrounds a focused control may sit on: one of the two rings must be 3:1 against each. */
const FOCUS_BACKGROUNDS = [...SURFACES, "accent", ...PIECES.map((piece) => `piece-${piece}`)];

describe("styles.css", () => {
  it("gives every colour of the light theme a dark value, the same in both dark blocks", () => {
    const colours = [...light.keys()].filter(
      (name) => !light.get(name)?.startsWith("var(") && !name.startsWith("--game-"),
    );

    expect(colours.length).toBeGreaterThan(40);
    expect([...systemDark.keys()].toSorted()).toEqual(colours.toSorted());
    expect(Object.fromEntries(chosenDark)).toEqual(Object.fromEntries(systemDark));
  });

  it("maps every colour token to a Tailwind colour", () => {
    for (const name of light.keys()) {
      if (name.startsWith("--elevation-") || name === "--overlay") continue;
      expect(css, name).toContain(`--color-${name.slice(2)}: var(${name});`);
    }
  });

  it("gives the page's background to what cannot read a variable (the server's theme-color)", () => {
    expect(PAGE_BACKGROUND).toEqual({ light: light.get("--bg"), dark: chosenDark.get("--bg") });
  });

  it("has the layout and motion tokens, and the variant and padding they go with", () => {
    for (const token of [
      "--safe-top",
      "--safe-right",
      "--safe-bottom",
      "--safe-left",
      "--top-bar-height",
      "--duration-fast",
      "--duration-base",
      "--ease-standard",
    ]) {
      expect(css, token).toMatch(new RegExp(`${token}:`));
    }
    expect(css).toContain("@custom-variant short-landscape");
    expect(css).toContain("scroll-padding-top: calc(var(--top-bar-height) + var(--safe-top))");
    expect(css).toMatch(
      /@utility transition-lift \{[^}]*var\(--tw-duration, var\(--duration-base\)\)[^}]*var\(--tw-ease, var\(--ease-standard\)\)/,
    );
  });

  it("names no game: games give their own values in apps/web", () => {
    expect(css).not.toMatch(/data-game="[a-z]/);
  });

  for (const [theme, tokens] of THEMES) {
    it.each(PAIRS)(`${theme}: %s on %s is at least %d:1`, (fg, bg, minimum) => {
      expect(contrast(colour(tokens, fg), colour(tokens, bg))).toBeGreaterThanOrEqual(minimum);
    });

    it.each(FOCUS_BACKGROUNDS)(`${theme}: one ring of the focus ring is 3:1 on %s`, (bg) => {
      const background = colour(tokens, bg);
      const best = Math.max(
        contrast(colour(tokens, "focus-ring"), background),
        contrast(colour(tokens, "focus-ring-halo"), background),
      );
      expect(best).toBeGreaterThanOrEqual(3);
    });
  }

  it("light: a yellow piece has an edge that shows on it and on a light cell", () => {
    expect(
      contrast(colour(light, "piece-edge"), colour(light, "piece-yellow")),
    ).toBeGreaterThanOrEqual(3);
  });
});
