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

/**
 * The only parts of the web app allowed to import the server folder: the server itself and the
 * route handlers, which run on the server. Everything else may end up in a browser bundle, so a
 * new folder is barred by default (plan.md §3.2).
 */
const WEB_SERVER_FILES = ["src/server/**", "src/app/api/**"];

/** The server folder, by alias and by every relative path a file under `src/` could use. */
const SERVER_IMPORTS = [
  "@/server",
  "@/server/**",
  ...["./", "../", "../../", "../../../", "../../../../", "../../../../../"].flatMap((up) => [
    `${up}server`,
    `${up}server/**`,
  ]),
];

/**
 * Client code of the web app that must not bring every game's rules and AI into its bundle (the
 * menu, the setup screen, the room page, the stores they share): it may import types from
 * `@board-games/games`, and game ids from `@board-games/games/ids`. A game's own rules reach the
 * browser only with its lazily loaded play screen (`src/games/**`) or in the AI's Worker. The
 * menu's server-side helper builds plain data from the registry.
 */
const WEB_REGISTRY_FREE_FILES = ["src/features/**", "src/transport/**", "src/lib/**"];
/**
 * A tool is not a game: it plays no moves and talks to no server, so it stays out of what games are
 * made of (design of add-toolbox-card-score).
 */
const WEB_TOOL_FILES = ["src/tools/**"];
const WEB_TOOL_FORBIDDEN = ["transport", "server", "games", "ai-worker"].flatMap((folder) => [
  `@/${folder}`,
  `@/${folder}/**`,
  ...["../", "../../", "../../../", "../../../../"].flatMap((up) => [
    `${up}${folder}`,
    `${up}${folder}/**`,
  ]),
]);
const WEB_TOOL_FORBIDDEN_PACKAGES = ["engine", "games", "protocol"].flatMap((name) => [
  `@board-games/${name}`,
  `@board-games/${name}/**`,
]);

const WEB_REGISTRY_FREE_EXCEPTIONS = ["**/*.test.{ts,tsx}", "src/features/menu/menu-games.ts"];

/**
 * Each game's UI, loaded only with its play screen: it imports its own rules from the game's
 * subpath (`@board-games/games/caro`), never from the root, which brings every game's rules along.
 */
const WEB_GAME_UI_FILES = ["src/games/**"];

/**
 * Each game's picture and the map of them, drawn on the server for the menu and the setup screen:
 * they must not reach a game's board, rules or UI entry, or every board would load with the menu.
 */
const WEB_GAME_ARTWORK_FILES = ["src/games/artwork.ts", "src/games/*/Artwork.tsx"];

/**
 * Each game's rules (`Rules.tsx`), their figures (`rules/**`) and the map of them (`rules.ts`): the
 * rules page renders them on the server, the play screen's dialog loads them in the browser when it
 * first opens. An allow-list of what each may import, so a board, a game's entry or the registry
 * (which would load every board with the rules) never slips in.
 */
const WEB_GAME_RULES = {
  /** `games/rules.ts` imports each game's `./<id>/Rules`. */
  map: { files: ["src/games/rules.ts"], relative: String.raw`^\./[\w-]+/Rules$` },
  /** `games/<id>/Rules.tsx` imports its theme and its figures. */
  rules: {
    files: ["src/games/*/Rules.tsx"],
    relative: String.raw`^\./(theme\.css|rules/[\w-]+)$`,
  },
  /** `games/<id>/rules/*.tsx` import each other and the board's geometry, symbols and pieces. */
  figures: {
    files: ["src/games/*/rules/**"],
    relative: String.raw`^(\./[\w-]+|\.\./(board-layout|ColourSymbol|piece-style|pieces))$`,
  },
};

/**
 * A `no-restricted-imports` pattern barring every relative import but those `allowed` matches,
 * and every `@/` import but `@/features/rules/*` (types are let through).
 *
 * @param {string} allowed
 */
function rulesImportPatterns(allowed) {
  const message =
    "A game's rules may only import their own figures, the board's geometry, symbols and pieces, and features/rules: a board, a game's entry or the registry would load with the rules (design of add-rules-pages).";
  return [
    // `allowed` without its `^`, as a lookahead from the specifier's start.
    { regex: String.raw`^(?!${allowed.slice(1)})\.`, message },
    { regex: String.raw`^@/(?!features/rules/)`, allowTypeImports: true, message },
  ];
}

/** Files that frameworks require to use a default export. */
const NEXT_DEFAULT_EXPORT_FILES = [
  "**/app/**/{page,layout,template,loading,error,global-error,not-found,default,forbidden,unauthorized}.tsx",
  "**/app/**/{icon,apple-icon,opengraph-image,twitter-image,sitemap,robots,manifest}.{ts,tsx}",
  "**/i18n/request.ts",
  "**/*.config.{ts,mts}",
];

/** Tests and their helpers: the only files allowed to import the engine's test-only entry point. */
const TEST_FILES = ["**/*.test.{ts,tsx}", "src/test/**"];

/** `@board-games/engine/testing` imports Vitest and sample games: never in code that ships. */
const TESTING_ONLY = {
  group: ["@board-games/engine/testing"],
  message: "Test-only entry point (it imports Vitest): import it from tests and src/test/ only.",
};

/**
 * Ludo's 3D die (design of redesign-ludo-play §2): three.js and cannon-es only in its two modules,
 * and those only through the `import()` of `load-dice3d.ts`, so they stay in a chunk of their own,
 * out of every page's first load. `dice-stage.ts` may import `throw-sim.ts`.
 */
const DICE_3D_MODULES = [
  "src/games/ludo/dice3d/dice-stage.ts",
  "src/games/ludo/dice3d/throw-sim.ts",
];
const DICE_3D_ONLY = [
  {
    group: ["three", "three/**", "cannon-es", "cannon-es/**"],
    message:
      "three.js and cannon-es belong to Ludo's lazy 3D chunk: import them only in games/ludo/dice3d/dice-stage.ts and throw-sim.ts.",
  },
  {
    regex: String.raw`(^|/)(dice-stage|throw-sim)$`,
    message:
      "This would put three.js and cannon-es in a page's first load: load the 3D die with load-dice3d.ts (`import()`).",
  },
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

  /** @param {object[]} extra */
  const restrict = (...extra) => ({
    "no-restricted-imports": ["error", { patterns: [...patterns, ...extra] }],
  });
  // Each block below replaces the rule of the ones before it for its files, so every block repeats
  // the patterns it keeps; tests get the same rule without the ban on the test-only entry point.
  const base = [{ rules: restrict(TESTING_ONLY) }, { files: TEST_FILES, rules: restrict() }];
  if (layer !== "web") return base;
  const serverOnly = {
    group: SERVER_IMPORTS,
    message:
      "Server-only code (Redis, WebSocket) must not be imported outside src/server and src/app/api.",
  };
  // Same rule again for everything outside the server side of the app, plus the server folder:
  // `redis` and `ws` must never reach a client bundle.
  return [
    ...base,
    {
      files: WEB_REGISTRY_FREE_FILES,
      ignores: WEB_REGISTRY_FREE_EXCEPTIONS,
      rules: {
        // A rule of its own (typescript-eslint's), so it adds to `no-restricted-imports` above
        // instead of replacing it, and lets types through.
        "@typescript-eslint/no-restricted-imports": [
          "error",
          {
            paths: [
              {
                name: "@board-games/games",
                allowTypeImports: true,
                message:
                  "This would put every game's rules and AI in a client bundle: import game ids from @board-games/games/ids, or pass plain data from the server.",
              },
            ],
          },
        ],
      },
    },
    {
      files: WEB_TOOL_FILES,
      rules: {
        "@typescript-eslint/no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: [...WEB_TOOL_FORBIDDEN, ...WEB_TOOL_FORBIDDEN_PACKAGES],
                message:
                  "A tool does not touch what games are made of: no transport, server, games, AI or protocol.",
              },
            ],
          },
        ],
      },
    },
    {
      files: WEB_GAME_UI_FILES,
      ignores: ["**/*.test.{ts,tsx}"],
      rules: {
        "@typescript-eslint/no-restricted-imports": [
          "error",
          {
            paths: [
              {
                name: "@board-games/games",
                allowTypeImports: true,
                message:
                  "This would put every game's rules in this game's chunk: import from the game's own subpath (@board-games/games/<id>).",
              },
            ],
          },
        ],
      },
    },
    {
      files: WEB_GAME_ARTWORK_FILES,
      rules: {
        // Replaces the game UI block's rule for these files, so it repeats its path.
        "@typescript-eslint/no-restricted-imports": [
          "error",
          {
            paths: [
              {
                name: "@board-games/games",
                allowTypeImports: true,
                message:
                  "An artwork is drawn on the server for the menu: it must not bring any game's rules.",
              },
            ],
            patterns: [
              {
                regex: "^@board-games/games/",
                allowTypeImports: true,
                message:
                  "An artwork is drawn on the server for the menu: it must not bring the game's rules.",
              },
              {
                // The registry, a game's entry (`.`, `./index`, `./caro`) and its board.
                regex: String.raw`(^|/)(registry|index|Board[\w.-]*)$|^\.{1,2}$|^\./(?!types$)[\w-]+$`,
                message:
                  "An artwork is drawn on the server for the menu: importing a board, a game's entry or the registry would put every board in the menu's bundle (design of add-design-foundation).",
              },
            ],
          },
        ],
      },
    },
    ...Object.values(WEB_GAME_RULES).map(({ files, relative }) => ({
      files,
      ignores: ["**/*.test.{ts,tsx}"],
      rules: {
        // Replaces the game UI block's rule for these files, so it repeats its path.
        "@typescript-eslint/no-restricted-imports": [
          "error",
          {
            paths: [
              {
                name: "@board-games/games",
                allowTypeImports: true,
                message:
                  "A game's rules must not bring every game's rules: import from the game's own subpath (@board-games/games/<id>).",
              },
            ],
            patterns: rulesImportPatterns(relative),
          },
        ],
      },
    })),
    {
      files: ["src/**"],
      ignores: WEB_SERVER_FILES,
      rules: restrict(serverOnly, TESTING_ONLY, ...DICE_3D_ONLY),
    },
    // The 3D die's own modules: the libraries, and `dice-stage.ts` the physics.
    { files: DICE_3D_MODULES, rules: restrict(serverOnly, TESTING_ONLY) },
    {
      files: TEST_FILES.map((glob) => (glob.startsWith("src/") ? glob : `src/${glob}`)),
      ignores: WEB_SERVER_FILES,
      rules: restrict(serverOnly),
    },
  ];
}

/**
 * The `Rules` messages never reach the browser (the root layout's provider leaves them out,
 * plan.md §4.7): a client component asking for them would only get missing keys. The rules dialog
 * loads them itself (`features/rules/load-rules.ts`, `createTranslator`).
 */
const CLIENT_RULES_MESSAGES = {
  selector: String.raw`Program:has(> ExpressionStatement[directive='use client']) CallExpression[callee.name=/^(useTranslations|getTranslations)$/][arguments.0.value=/^Rules($|\.)/]`,
  message:
    "The Rules messages are not sent to the client: translate the rules on the server, or load them as features/rules/load-rules.ts does.",
};

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
          CLIENT_RULES_MESSAGES,
        ],
      },
    },
    // Framework files may export a default, but a client one must not translate the rules either.
    {
      files: NEXT_DEFAULT_EXPORT_FILES,
      rules: { "no-restricted-syntax": ["error", CLIENT_RULES_MESSAGES] },
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
