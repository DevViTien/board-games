import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

// Each game's `theme.css` gives values to the shared `--game-*` contract (packages/ui styles.css,
// design §6 of `add-design-foundation`): only inside its own `[data-game="<id>"]`, every value in
// light and in both dark blocks, the two dark blocks identical, and its marks readable on its
// board in both themes.

const GAMES_DIR = import.meta.dirname;

const GAME_IDS = readdirSync(GAMES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

/** The declarations of the first rule whose selector is exactly `selector`. */
function block(source: string, selector: string): ReadonlyMap<string, string> {
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

/** WCAG contrast ratio of two `#rrggbb` colours. */
function contrast(a: string, b: string): number {
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
  path.join(GAMES_DIR, "../../../../packages/ui/src/styles.css"),
  "utf8",
);
const SHARED = {
  light: block(SHARED_CSS, ":root"),
  dark: block(SHARED_CSS, ':root[data-theme="dark"]'),
} as const;

function shared(theme: keyof typeof SHARED, name: string): string {
  const value = SHARED[theme].get(name);
  if (value === undefined) throw new Error(`No ${name} in styles.css`);
  return value;
}

describe.each(GAME_IDS)("games/%s/theme.css", (id) => {
  const css = readFileSync(path.join(GAMES_DIR, id, "theme.css"), "utf8");
  const scope = `[data-game="${id}"]`;
  const light = block(css, scope);
  const systemDark = block(
    css.slice(css.indexOf("@media (prefers-color-scheme: dark)")),
    `:root:not([data-theme="light"]) ${scope}`,
  );
  const chosenDark = block(css, `:root[data-theme="dark"] ${scope}`);

  it("styles only its own game", () => {
    for (const [, game] of css.matchAll(/data-game="([^"]*)"/g)) expect(game).toBe(id);
  });

  it("gives every value a dark one, the same in both dark blocks", () => {
    expect(light.size).toBeGreaterThan(0);
    expect([...systemDark.keys()].toSorted()).toEqual([...light.keys()].toSorted());
    expect(Object.fromEntries(chosenDark)).toEqual(Object.fromEntries(systemDark));
  });

  it("sets only the shared contract and variables of its own", () => {
    for (const name of light.keys()) expect(name).toMatch(new RegExp(`^--(game|${id})-`));
  });

  it.each([
    ["light", light],
    ["dark", chosenDark],
  ] as const)(
    "%s: one ring of the shared focus ring is 3:1 on its board and its tint",
    (theme, tokens) => {
      for (const name of ["--game-board", "--game-tint"]) {
        const background = tokens.get(name);
        if (background === undefined) continue;
        const best = Math.max(
          contrast(shared(theme, "--focus-ring"), background),
          contrast(shared(theme, "--focus-ring-halo"), background),
        );
        expect(best, name).toBeGreaterThanOrEqual(3);
      }
    },
  );

  it.each([
    ["light", light],
    ["dark", chosenDark],
  ] as const)("%s: its marks and lines are at least 3:1 on its board", (_, tokens) => {
    const board = tokens.get("--game-board");
    for (const name of ["--game-mark-1", "--game-mark-2", "--game-line"]) {
      const colour = tokens.get(name);
      if (board === undefined || colour === undefined) continue;
      expect(contrast(colour, board), name).toBeGreaterThanOrEqual(3);
    }
  });
});

/**
 * A game's value of `name` in `theme`: its own, or the contract's default (a shared token), with
 * `var(--x)` read from the shared tokens of that theme.
 */
function resolve(theme: keyof typeof SHARED, tokens: ReadonlyMap<string, string>, name: string) {
  // The contract's defaults (`--game-*`) are in the light block only, as `var(--…)` of a theme.
  const value = tokens.get(name) ?? SHARED[theme].get(name) ?? shared("light", name);
  const reference = /^var\((--[\w-]+)\)$/.exec(value)?.[1];
  return reference === undefined ? value : shared(theme, reference);
}

/** Pairs every game's screen must meet (text 4.5:1, marks and edges 3:1): design of each change. */
const COMMON_PAIRS: readonly (readonly [string, string, number])[] = [
  // The turn line, the hints and the chips around the board, on the page.
  ["--fg", "--game-page", 4.5],
  ["--fg-muted", "--game-page", 4.5],
  // The last move's marker on a cell.
  ["--game-last-move", "--game-board", 3],
  // Each mark on a cell (a game with only one player's colours ignores the other).
  ["--game-mark-1", "--game-board", 3],
  ["--game-mark-2", "--game-board", 3],
];

/** Pairs of one game's look (`redesign-game-boards` design §2–§4). */
const GAME_PAIRS: Readonly<Record<string, readonly (readonly [string, string, number])[]>> = {
  // A tile that may be chosen: its edge against the lilac page and its own face.
  tictactoe: [
    ["--game-line", "--game-page", 3],
    ["--game-line", "--game-board", 3],
    ["--game-win", "--game-board", 3],
  ],
  // Grid lines on the paper; the loop around the winning line.
  caro: [
    ["--game-line", "--game-board", 3],
    ["--game-win", "--game-board", 3],
    // The stone previewed on a cell selected by a first tap (that cell's highlight is inset, so
    // the grid lines around it stay on the paper).
    ["--game-mark-1", "--game-highlight", 3],
    ["--game-mark-2", "--game-highlight", 3],
  ],
  // Track lines, the target of a choice, the board's frame on the paper.
  ludo: [
    ["--game-line", "--game-board", 3],
    ["--game-highlight", "--game-board", 3],
    ["--ludo-frame", "--game-page", 3],
  ],
};

describe.each(GAME_IDS)("games/%s/theme.css, contrast of its screen", (id) => {
  const css = readFileSync(path.join(GAMES_DIR, id, "theme.css"), "utf8");
  const scope = `[data-game="${id}"]`;
  const themes = [
    ["light", block(css, scope)],
    ["dark", block(css, `:root[data-theme="dark"] ${scope}`)],
  ] as const;

  it.each(themes)("%s: text, marks and edges meet their ratio", (theme, tokens) => {
    for (const [fg, bg, ratio] of [...COMMON_PAIRS, ...(GAME_PAIRS[id] ?? [])]) {
      const pair = `${fg} on ${bg}`;
      expect(
        contrast(resolve(theme, tokens, fg), resolve(theme, tokens, bg)),
        pair,
      ).toBeGreaterThanOrEqual(ratio);
    }
  });

  it.each(themes)("%s: one ring of the focus ring is 3:1 on the page", (theme, tokens) => {
    const page = resolve(theme, tokens, "--game-page");
    expect(
      Math.max(
        contrast(shared(theme, "--focus-ring"), page),
        contrast(shared(theme, "--focus-ring-halo"), page),
      ),
    ).toBeGreaterThanOrEqual(3);
  });
});

describe("games/ludo/theme.css with the shared piece colours", () => {
  const css = readFileSync(path.join(GAMES_DIR, "ludo", "theme.css"), "utf8");
  const themes = [
    ["light", block(css, '[data-game="ludo"]')],
    ["dark", block(css, ':root[data-theme="dark"] [data-game="ludo"]')],
  ] as const;

  it.each(themes)(
    "%s: frames on the paper and piece edges on the track are 3:1",
    (theme, tokens) => {
      const paper = tokens.get("--game-tint") ?? "";
      const track = tokens.get("--game-board") ?? "";
      for (const piece of ["red", "blue", "yellow", "green"]) {
        expect(
          contrast(shared(theme, `--piece-${piece}-line`), paper),
          piece,
        ).toBeGreaterThanOrEqual(3);
      }
      expect(contrast(shared(theme, "--border-control"), paper)).toBeGreaterThanOrEqual(3);
      expect(contrast(shared(theme, "--piece-edge"), track)).toBeGreaterThanOrEqual(3);
      expect(contrast(shared(theme, "--piece-yellow-line"), track)).toBeGreaterThanOrEqual(3);
      // The die's frame against the die's face (the track's colour; against the paper above),
      // and the edge of a horse's choice against the button's face.
      for (const piece of ["red", "blue", "yellow", "green"]) {
        const line = shared(theme, `--piece-${piece}-line`);
        expect(contrast(line, track), `${piece} on the die`).toBeGreaterThanOrEqual(3);
        expect(
          contrast(line, shared(theme, "--surface")),
          `${piece} on a choice`,
        ).toBeGreaterThanOrEqual(3);
      }
    },
  );
});
