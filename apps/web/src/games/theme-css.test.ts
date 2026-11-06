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
    "%s: one ring of the shared focus ring is 3:1 on its board, its tint and its own squares",
    (theme, tokens) => {
      for (const name of ["--game-board", "--game-tint", ...(FOCUS_BACKGROUNDS[id] ?? [])]) {
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

/**
 * The other backgrounds of a game the focus ring is drawn on, besides `--game-board` and
 * `--game-tint`: a game's own squares (Chess: its dark squares, and both tints of a selected or
 * just-played square).
 */
const FOCUS_BACKGROUNDS: Readonly<Record<string, readonly string[]>> = {
  chess: ["--chess-square-dark", "--chess-mark-light", "--chess-mark-dark"],
};

/**
 * A colour on a background, and the ratio it must meet. The colour may be two layers (a piece's
 * body and its edge, a mark's ink core and its light halo): then the better of the two must meet it,
 * as the eye reads the layer that stands out.
 */
type Pair = readonly [string | readonly [string, string], string, number];

/** Pairs every game's screen must meet (text 4.5:1, marks and edges 3:1): design of each change. */
const COMMON_PAIRS: readonly Pair[] = [
  // The turn line, the hints and the chips around the board, on the page.
  ["--fg", "--game-page", 4.5],
  ["--fg-muted", "--game-page", 4.5],
  // The last move's marker on a cell.
  ["--game-last-move", "--game-board", 3],
  // Each mark on a cell (a game with only one player's colours ignores the other).
  ["--game-mark-1", "--game-board", 3],
  ["--game-mark-2", "--game-board", 3],
];

/** The four backgrounds a chess piece or mark sits on. */
const CHESS_SQUARES = [
  "--game-board",
  "--chess-square-dark",
  "--chess-mark-light",
  "--chess-mark-dark",
] as const;

/** The three kinds of field of Cờ rào. */
const FENCE_RACE_FIELDS = ["--game-board", "--fence-race-plot-2", "--fence-race-plot-3"] as const;

/** Pairs of one game's look (`redesign-game-boards` design §2–§4). */
const GAME_PAIRS: Readonly<Record<string, readonly Pair[]>> = {
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
  // Design §3 of `add-chess-board`, row by row.
  chess: [
    ["--fg-muted", "--game-tint", 4.5],
    // Pieces (the staunty set) on both squares, both tints and the check's glow: a light body with
    // a dark edge, a dark grey body with a near-black edge.
    ...CHESS_SQUARES.flatMap((square): Pair[] => [
      [["--chess-piece-light", "--game-mark-1"], square, 3],
      [["--chess-piece-dark", "--game-mark-2"], square, 3],
    ]),
    [["--chess-piece-light", "--game-mark-1"], "--chess-check", 3],
    [["--chess-piece-dark", "--game-mark-2"], "--chess-check", 3],
    // Marks (the selection's frame, a target's dot, a capture's corners, the check ring, the last
    // move's dashed frame): an ink core with a light halo.
    ...CHESS_SQUARES.flatMap((square): Pair[] => [
      [["--game-highlight", "--chess-paper"], square, 3],
      [["--game-last-move", "--chess-paper"], square, 3],
    ]),
    [["--game-highlight", "--chess-paper"], "--chess-check", 3],
    // Coordinates: dark green on a light square and on a tinted one, cream on a dark square.
    ["--chess-coord", "--game-board", 4.5],
    ["--chess-coord", "--chess-mark-light", 4.5],
    ["--chess-coord", "--chess-mark-dark", 4.5],
    ["--chess-coord-on-dark", "--chess-square-dark", 4.5],
    ["--game-line", "--game-board", 3],
    // The score sheet's moves and numbers.
    ["--fg", "--chess-sheet", 4.5],
    ["--fg-muted", "--chess-sheet", 4.5],
    ["--fg", "--chess-sheet-current", 4.5],
    ["--fg-muted", "--chess-sheet-current", 4.5],
    // The two bodies told apart by lightness alone.
    ["--chess-piece-light", "--chess-piece-dark", 3],
  ],
  // Design §4 of `add-fence-race-game`, row by row: dikes and fences on each kind of field, a fence
  // on a dike, the fence tried and the fence refused, the dots and markers, the names on the mat.
  "fence-race": [
    ["--fg-muted", "--game-tint", 4.5],
    ...FENCE_RACE_FIELDS.flatMap((field): Pair[] => [
      ["--game-line", field, 3],
      ["--fence-race-wall", field, 3],
      ["--fence-race-preview", field, 3],
      ["--fence-race-bad", field, 3],
      ["--game-highlight", field, 3],
      ["--game-last-move", field, 3],
    ]),
    ["--fence-race-wall", "--game-line", 3],
    ["--fence-race-wall", "--fence-race-halo", 3],
    ["--fence-race-bad-ink", "--fence-race-bad", 3],
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
      const layers = typeof fg === "string" ? [fg] : fg;
      const background = resolve(theme, tokens, bg);
      const best = Math.max(
        ...layers.map((layer) => contrast(resolve(theme, tokens, layer), background)),
      );
      expect(best, `${layers.join(" + ")} on ${bg}`).toBeGreaterThanOrEqual(ratio);
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

describe("games/chess/theme.css and its piece files", () => {
  // The tokens of the pieces mirror the staunty files (public/pieces/staunty), so the contrast pairs
  // above measure the pieces really drawn.
  const css = readFileSync(path.join(GAMES_DIR, "chess", "theme.css"), "utf8");
  const piecesDir = path.join(GAMES_DIR, "../../public/pieces/staunty");
  const colours = (file: string) => {
    const svg = readFileSync(path.join(piecesDir, file), "utf8");
    return {
      fills: new Set([...svg.matchAll(/fill="(#[0-9a-f]{6})"/g)].map((match) => match[1])),
      strokes: new Set([...svg.matchAll(/stroke="(#[0-9a-f]{6})"/g)].map((match) => match[1])),
    };
  };

  it.each([
    ["light", block(css, '[data-game="chess"]')],
    ["dark", block(css, ':root[data-theme="dark"] [data-game="chess"]')],
  ] as const)("%s: the piece tokens are the colours of the files", (_theme, tokens) => {
    for (const type of ["K", "Q", "R", "B", "N", "P"]) {
      const white = colours(`w${type}.svg`);
      const black = colours(`b${type}.svg`);
      expect(white.fills, type).toContain(tokens.get("--chess-piece-light"));
      expect([...white.strokes], type).toEqual([tokens.get("--game-mark-1")]);
      expect(black.fills, type).toContain(tokens.get("--chess-piece-dark"));
      expect([...black.strokes], type).toEqual([tokens.get("--game-mark-2")]);
    }
  });
});
