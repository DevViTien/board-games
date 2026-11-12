import { fileURLToPath } from "node:url";

import { sharedTestOptions } from "@board-games/config/vitest";
import { configDefaults, defineConfig } from "vitest/config";

const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

/**
 * Server code (WebSocket, Redis, sockets) is tested in Node, where `ws` and `redis` really run;
 * everything else renders React in jsdom. Only the shared options (`passWithNoTests`, coverage)
 * stay at the root: projects get the root's `include` added to theirs.
 */
const SERVER_TESTS = ["src/server/**/*.test.ts", "src/app/api/**/*.test.ts"];
/**
 * A puzzle's rules and levels are plain functions with no DOM: they run in Node, without the DOM
 * setup, where the levels' solver also runs fastest (design §5 of add-jelly-gather-puzzle).
 */
const PURE_TESTS = ["src/puzzles/*/rules/**/*.test.ts", "src/puzzles/*/levels*.test.ts"];

export default defineConfig({
  test: {
    ...sharedTestOptions,
    projects: [
      {
        resolve: { alias },
        test: {
          name: "dom",
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: [...configDefaults.exclude, ...SERVER_TESTS, ...PURE_TESTS],
        },
      },
      {
        resolve: { alias },
        test: { name: "server", environment: "node", include: SERVER_TESTS },
      },
      {
        resolve: { alias },
        test: { name: "pure", environment: "node", include: PURE_TESTS },
      },
    ],
  },
});
