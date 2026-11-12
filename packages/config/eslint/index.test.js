import { Linter } from "eslint";
import tseslint from "typescript-eslint";
import { describe, expect, it } from "vitest";

import { createConfig } from "./index.js";

// The web app's import boundaries and client-only guards, checked on small fixtures with only the
// rules under test (no type information needed): what each kind of file may and may not import.

const CWD = "/repo/apps/web";
const CHECKED_RULES = ["@typescript-eslint/no-restricted-imports", "no-restricted-syntax"];

/** The web config's blocks that set the checked rules, keeping only those rules. */
const checkedBlocks = createConfig("web", CWD).flatMap((block) => {
  const rules = Object.fromEntries(
    Object.entries(block.rules ?? {}).filter(([name]) => CHECKED_RULES.includes(name)),
  );
  if (Object.keys(rules).length === 0) return [];
  return [
    {
      ...(block.files && { files: block.files }),
      ...(block.ignores && { ignores: block.ignores }),
      rules,
    },
  ];
});

const linter = new Linter({ cwd: CWD });
const config = [
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "@typescript-eslint": tseslint.plugin },
  },
  ...checkedBlocks,
];

/** The messages of the checked rules for `code` in the file at `path` (relative to the app). */
function problems(path, code) {
  return linter
    .verify(code, config, { filename: `${CWD}/${path}` })
    .filter((message) => message.ruleId !== null && CHECKED_RULES.includes(message.ruleId));
}

const imports = (specifier) => `import { x } from "${specifier}";\nexport const y = x;\n`;

describe("a tool stays out of what games are made of", () => {
  it.each([
    "@/transport/types",
    "../../transport/types",
    "@/server/env",
    "../../server/env",
    "@/games/registry",
    "../games/registry",
    "@/ai-worker/ai-player",
    "@board-games/engine",
    "@board-games/games",
    "@board-games/games/ids",
    "@board-games/protocol",
  ])("src/tools/card-score/x.ts may not import %s", (specifier) => {
    expect(problems("src/tools/card-score/x.ts", imports(specifier))).not.toEqual([]);
  });

  it.each(["@/puzzles/registry", "../../puzzles/jelly-gather/levels"])(
    "src/tools/card-score/x.ts may not import %s",
    (specifier) => {
      expect(problems("src/tools/card-score/x.ts", imports(specifier))).not.toEqual([]);
    },
  );

  it.each(["@board-games/ui", "@/features/shell/AppTopBar", "@/lib/random-id", "./group"])(
    "src/tools/card-score/x.ts may import %s",
    (specifier) => {
      expect(problems("src/tools/card-score/x.ts", imports(specifier))).toEqual([]);
    },
  );
});

describe("a puzzle stays out of games, tools and the server", () => {
  it.each([
    "@/transport/types",
    "../../transport/types",
    "@/server/env",
    "../../server/env",
    "@/games/registry",
    "../../games/artwork",
    "@/ai-worker/ai-player",
    "@/tools/registry",
    "../../tools/card-score/group",
    "@board-games/engine",
    "@board-games/games",
    "@board-games/games/ids",
    "@board-games/protocol",
  ])("src/puzzles/jelly-gather/x.ts may not import %s", (specifier) => {
    expect(problems("src/puzzles/jelly-gather/x.ts", imports(specifier))).not.toEqual([]);
  });

  it.each([
    "@board-games/ui",
    "@/features/shell/client-navigation",
    "@/lib/with-timeout",
    "@/config/storage-keys",
    "@/test/theme-css",
    "./rules/step",
    "../registry",
  ])("src/puzzles/jelly-gather/x.ts may import %s", (specifier) => {
    expect(problems("src/puzzles/jelly-gather/x.ts", imports(specifier))).toEqual([]);
  });
});

describe("a game's rules may only import what their page needs", () => {
  it.each([
    ["src/games/rules.ts", "./caro/Rules"],
    ["src/games/rules.ts", "@/features/rules/types"],
    ["src/games/caro/Rules.tsx", "./theme.css"],
    ["src/games/caro/Rules.tsx", "./rules/blocked"],
    ["src/games/caro/Rules.tsx", "@/features/rules/RulesSection"],
    ["src/games/caro/rules/edge.tsx", "./strip"],
    ["src/games/ludo/rules/path.tsx", "../board-layout"],
    ["src/games/ludo/rules/parts.tsx", "../ColourSymbol"],
    ["src/games/ludo/rules/parts.tsx", "../piece-style"],
    ["src/games/chess/rules/parts.tsx", "../pieces"],
    ["src/games/ludo/rules/path.tsx", "@board-games/games/ludo"],
  ])("%s may import %s", (path, specifier) => {
    expect(problems(path, imports(specifier))).toEqual([]);
  });

  it.each([
    ["src/games/rules.ts", "./registry"],
    ["src/games/rules.ts", "./caro"],
    ["src/games/caro/Rules.tsx", "./Board"],
    ["src/games/caro/Rules.tsx", "."],
    ["src/games/caro/Rules.tsx", "./index"],
    ["src/games/chess/rules/moves.tsx", "../BoardSquare"],
    ["src/games/chess/rules/moves.tsx", "../MoveSheet"],
    ["src/games/chess/rules/moves.tsx", "../use-selection"],
    ["src/games/chess/rules/moves.tsx", ".."],
    ["src/games/caro/rules/five.tsx", "@/games/registry"],
    ["src/games/caro/rules/five.tsx", "@board-games/games"],
  ])("%s may not import %s", (path, specifier) => {
    expect(problems(path, imports(specifier))).toHaveLength(1);
  });
});

describe("a game's artwork may not import a board, an entry or the registry", () => {
  it.each([["../types"], ["./theme.css"], ["@board-games/ui"]])("may import %s", (specifier) => {
    expect(problems("src/games/caro/Artwork.tsx", imports(specifier))).toEqual([]);
  });

  it.each([
    ["./Board"],
    ["./BoardSquare"],
    ["."],
    [".."],
    ["./index"],
    ["../registry"],
    ["./pieces"],
  ])("may not import %s", (specifier) => {
    expect(problems("src/games/caro/Artwork.tsx", imports(specifier))).toHaveLength(1);
  });
});

describe("the Rules messages stay on the server", () => {
  it("stops a client component from asking for them", () => {
    const code = `"use client";\nimport { useTranslations } from "next-intl";\nexport function A() { return useTranslations("Rules.caro"); }\n`;

    expect(problems("src/features/play/A.tsx", code)).toHaveLength(1);
    expect(
      problems("src/app/play/page.tsx", code.replace("export function", "export default function")),
    ).toHaveLength(1);
  });

  it("lets a server component, and a client one asking for other messages, translate", () => {
    const server = `import { useTranslations } from "next-intl";\nexport function A() { return useTranslations("Rules"); }\n`;
    const client = `"use client";\nimport { useTranslations } from "next-intl";\nexport function A() { return useTranslations("Play"); }\n`;

    expect(problems("src/app/rules/A.tsx", server)).toEqual([]);
    expect(problems("src/features/play/A.tsx", client)).toEqual([]);
  });
});

describe("Ludo's 3D die stays in its lazy chunk", () => {
  const coreLinter = new Linter({ cwd: CWD });
  const coreConfig = [
    {
      files: ["**/*.{ts,tsx}"],
      languageOptions: {
        parser: tseslint.parser,
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
    },
    ...createConfig("web", CWD).flatMap((block) =>
      block.rules?.["no-restricted-imports"] === undefined
        ? []
        : [
            {
              ...(block.files && { files: block.files }),
              ...(block.ignores && { ignores: block.ignores }),
              rules: { "no-restricted-imports": block.rules["no-restricted-imports"] },
            },
          ],
    ),
  ];
  /** The messages of the core `no-restricted-imports` for `code` in the file at `path`. */
  const coreProblems = (path, code) =>
    coreLinter
      .verify(code, coreConfig, { filename: `${CWD}/${path}` })
      .filter((message) => message.ruleId === "no-restricted-imports");

  it.each([
    ["src/games/ludo/dice3d/dice-stage.ts", "three"],
    ["src/games/ludo/dice3d/dice-stage.ts", "./throw-sim"],
    ["src/games/ludo/dice3d/throw-sim.ts", "cannon-es"],
    ["src/games/ludo/dice3d/throw-sim.test.ts", "./throw-sim"],
    ["src/games/ludo/dice3d/load-dice3d.ts", "./stage-types"],
  ])("%s may import %s", (path, specifier) => {
    expect(coreProblems(path, imports(specifier))).toEqual([]);
  });

  it.each([
    ["src/games/ludo/Board.tsx", "three"],
    ["src/games/ludo/dice3d/ThrowOverlay.tsx", "three/src/math/Vector3.js"],
    ["src/games/ludo/dice3d/use-dice-throw.ts", "cannon-es"],
    ["src/games/ludo/Board.tsx", "./dice3d/dice-stage"],
    ["src/games/ludo/dice3d/load-dice3d.ts", "./dice-stage"],
    ["src/games/ludo/dice3d/use-dice-throw.ts", "./throw-sim"],
    ["src/features/play/PlayScreen.tsx", "three"],
  ])("%s may not import %s", (path, specifier) => {
    expect(coreProblems(path, imports(specifier))).toHaveLength(1);
  });

  it("lets load-dice3d.ts load the stage with import()", () => {
    const code = `export const load = () => import("./dice-stage");`;
    expect(coreProblems("src/games/ludo/dice3d/load-dice3d.ts", code)).toEqual([]);
  });
});
