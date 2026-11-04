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
