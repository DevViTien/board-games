import js from "@eslint/js";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Architecture layers (plan.md §3.1). Dependencies only flow downwards:
 * `internal` lists the workspace packages a layer may import, `runtime` decides
 * which frameworks it may touch.
 *
 * @type {Record<Layer, { internal: Layer[]; runtime: "pure" | "react" | "next" }>}
 * @typedef {"engine" | "games" | "protocol" | "ui" | "web"} Layer
 */
const LAYERS = {
  engine: { internal: [], runtime: "pure" },
  games: { internal: ["engine"], runtime: "pure" },
  protocol: { internal: ["engine"], runtime: "pure" },
  ui: { internal: [], runtime: "react" },
  web: { internal: ["engine", "games", "protocol", "ui"], runtime: "next" },
};

const FORBIDDEN_FRAMEWORKS = {
  pure: ["react", "react/**", "react-dom", "react-dom/**", "next", "next/**"],
  react: ["next", "next/**"],
  next: [],
};

/** Third-party packages wrapped by `@board-games/ui`, so they can be swapped in one place. */
const WRAPPED_BY_UI = ["lucide-react", "lucide-react/**"];

/** Files that frameworks require to use a default export. */
const NEXT_DEFAULT_EXPORT_FILES = [
  "**/app/**/{page,layout,template,loading,error,global-error,not-found,default,forbidden,unauthorized}.tsx",
  "**/app/**/{icon,apple-icon,opengraph-image,twitter-image,sitemap,robots,manifest}.{ts,tsx}",
  "**/i18n/request.ts",
  "**/*.config.{ts,mts}",
];

/** @param {Layer} layer */
function boundaries(layer) {
  const { internal, runtime } = LAYERS[layer];
  const forbiddenPackages = Object.keys(LAYERS).filter(
    (name) => name !== layer && !internal.includes(/** @type {Layer} */ (name)),
  );

  const patterns = [
    {
      group: ["@board-games/*/src", "@board-games/*/src/**"],
      message: "Import from the package entry point, not its internal files.",
    },
  ];
  if (forbiddenPackages.length > 0) {
    patterns.push({
      group: forbiddenPackages.flatMap((name) => [
        `@board-games/${name}`,
        `@board-games/${name}/**`,
      ]),
      message: `The "${layer}" layer must not depend on this package (plan.md §3.1).`,
    });
  }
  if (FORBIDDEN_FRAMEWORKS[runtime].length > 0) {
    patterns.push({
      group: FORBIDDEN_FRAMEWORKS[runtime],
      message:
        runtime === "pure"
          ? `The "${layer}" layer must stay framework-free so it runs on the server and in Web Workers.`
          : `The "${layer}" layer must not depend on Next.js.`,
    });
  }
  if (layer !== "ui") {
    patterns.push({
      group: WRAPPED_BY_UI,
      message: "Import icons and UI primitives from @board-games/ui.",
    });
  }

  return { rules: { "no-restricted-imports": ["error", { patterns }] } };
}

/** @param {string} tsconfigRootDir */
function typescript(tsconfigRootDir) {
  return [
    globalIgnores(["dist/**", ".next/**", "coverage/**", "playwright-report/**", "next-env.d.ts"]),
    js.configs.recommended,
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    { languageOptions: { parserOptions: { projectService: true, tsconfigRootDir } } },
    {
      files: ["**/*.{ts,tsx,mts,cts}"],
      rules: {
        "@typescript-eslint/consistent-type-imports": "error",
        "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
        // `this: void` marks methods that are safe to call unbound (see GameDefinition).
        "@typescript-eslint/no-invalid-void-type": ["error", { allowAsThisParameter: true }],
      },
    },
    {
      files: ["**/*.{js,mjs,cjs}"],
      extends: [tseslint.configs.disableTypeChecked],
      languageOptions: { globals: globals.node },
    },
    {
      files: ["**/*.{ts,tsx}"],
      ignores: NEXT_DEFAULT_EXPORT_FILES,
      rules: {
        "no-restricted-syntax": [
          "error",
          { selector: "ExportDefaultDeclaration", message: "Use named exports (plan.md §4)." },
        ],
      },
    },
    {
      plugins: { "simple-import-sort": simpleImportSort },
      rules: {
        "simple-import-sort/imports": "error",
        "simple-import-sort/exports": "error",
      },
    },
  ];
}

/**
 * @param {Layer} layer
 * @param {string} packageDir
 */
function runtimeConfig(layer, packageDir) {
  switch (LAYERS[layer].runtime) {
    case "pure":
      return [];
    case "react":
      // Mirrors what eslint-config-next gives the web app, minus the Next.js plugin.
      return [
        react.configs.flat.recommended,
        react.configs.flat["jsx-runtime"],
        reactHooks.configs.flat.recommended,
        jsxA11y.flatConfigs.recommended,
        {
          settings: { react: { version: "detect" } },
          languageOptions: { globals: globals.browser },
        },
      ];
    case "next":
      // rootDir lets the Next.js rules find the app when ESLint runs from the repo root (lint-staged).
      return [nextCoreWebVitals, { settings: { next: { rootDir: packageDir } } }];
  }
}

/**
 * ESLint config for one workspace package.
 *
 * @example
 * // packages/engine/eslint.config.js
 * export default createConfig("engine", import.meta.dirname);
 *
 * @param {Layer} layer
 * @param {string} tsconfigRootDir pass `import.meta.dirname` of the consuming package
 */
export function createConfig(layer, tsconfigRootDir) {
  // Runtime presets go first: eslint-config-next sets its own parser, which the
  // typescript-eslint parser must override for type-aware rules to work.
  return defineConfig(
    runtimeConfig(layer, tsconfigRootDir),
    typescript(tsconfigRootDir),
    boundaries(layer),
  );
}
