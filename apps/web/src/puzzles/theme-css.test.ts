import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { contrast, resolve, shared, themeBlocks } from "@/test/theme-css";

// Each puzzle's `theme.css`, like each game's (games/theme-css.test.ts): only inside its own
// `[data-game="<id>"]`, the shared `--game-*` contract and variables of its own, every value in light
// and in both dark blocks, the two dark blocks identical, and its pieces readable on its tray.

const PUZZLES_DIR = import.meta.dirname;

const PUZZLE_IDS = readdirSync(PUZZLES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

/** A colour on a background and the ratio it must meet (design §9 of add-jelly-gather-puzzle). */
type Pair = readonly [string, string, number];

const COMMON_PAIRS: readonly Pair[] = [
  ["--fg", "--game-page", 4.5],
  ["--fg-muted", "--game-page", 4.5],
];

const JELLY_KINDS = ["strawberry", "pandan", "mango", "taro", "coconut", "grass", "ice"] as const;

const PUZZLE_PAIRS: Readonly<Record<string, readonly Pair[]>> = {
  "jelly-gather": [
    ...JELLY_KINDS.flatMap((kind): Pair[] => [
      [`--jelly-gather-${kind}-edge`, "--game-board", 3],
      [`--jelly-gather-${kind}-mark`, `--jelly-gather-${kind}`, 3],
    ]),
    ["--jelly-gather-wall", "--game-board", 3],
    ["--jelly-gather-player", "--game-board", 3],
    ["--jelly-gather-player-eye", "--jelly-gather-player", 3],
    ["--jelly-gather-pin", "--jelly-gather-coconut", 3],
  ],
};

describe.each(PUZZLE_IDS)("puzzles/%s/theme.css", (id) => {
  const css = readFileSync(path.join(PUZZLES_DIR, id, "theme.css"), "utf8");
  const { light, systemDark, chosenDark } = themeBlocks(css, `[data-game="${id}"]`);

  it("styles only its own puzzle", () => {
    for (const [, scope] of css.matchAll(/data-game="([^"]*)"/g)) expect(scope).toBe(id);
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
  ] as const)("%s: text, pieces, walls and signs meet their ratio", (theme, tokens) => {
    for (const [fg, bg, ratio] of [...COMMON_PAIRS, ...(PUZZLE_PAIRS[id] ?? [])]) {
      expect(
        contrast(resolve(theme, tokens, fg), resolve(theme, tokens, bg)),
        `${fg} on ${bg}`,
      ).toBeGreaterThanOrEqual(ratio);
    }
  });

  it.each([
    ["light", light],
    ["dark", chosenDark],
  ] as const)("%s: one ring of the focus ring is 3:1 on the page and the tray", (theme, tokens) => {
    for (const name of ["--game-page", "--game-board"]) {
      const background = resolve(theme, tokens, name);
      expect(
        Math.max(
          contrast(shared(theme, "--focus-ring"), background),
          contrast(shared(theme, "--focus-ring-halo"), background),
        ),
        name,
      ).toBeGreaterThanOrEqual(3);
    }
  });
});
