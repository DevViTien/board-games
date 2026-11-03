import { createConfig } from "@board-games/config/eslint";

const CHESS_JS_MESSAGE =
  "Only the chess adapter (src/chess/chess-js.ts) touches chess.js: it calls an internal method checked against the pinned version (design of add-chess-rules §1–§2).";

export default [
  ...createConfig("games", import.meta.dirname),
  {
    // A rule of its own (typescript-eslint's), so it adds to the `no-restricted-imports` of
    // `createConfig` instead of replacing it.
    files: ["src/**/*.ts"],
    ignores: ["src/chess/chess-js.ts", "**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "chess.js",
              message: CHESS_JS_MESSAGE,
            },
          ],
          patterns: [{ group: ["chess.js/*"], message: CHESS_JS_MESSAGE }],
        },
      ],
    },
  },
];
