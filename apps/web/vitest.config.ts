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
          exclude: [...configDefaults.exclude, ...SERVER_TESTS],
        },
      },
      {
        resolve: { alias },
        test: { name: "server", environment: "node", include: SERVER_TESTS },
      },
    ],
  },
});
