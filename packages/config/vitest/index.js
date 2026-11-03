import { defineConfig } from "vitest/config";

/**
 * Test options every workspace package shares, for configs that cannot use `createVitestConfig`
 * as a whole (a package split into Vitest projects puts them at its root).
 *
 * @type {import("./index").SharedTestOptions}
 */
export const sharedTestOptions = {
  passWithNoTests: true,
  coverage: {
    provider: "v8",
    include: ["src/**/*.{ts,tsx}"],
    exclude: ["src/**/*.test.{ts,tsx}", "src/**/index.ts"],
    reporter: ["text", "html"],
  },
};

/**
 * Vitest config shared by every workspace package.
 *
 * @param {import("./index").VitestOptions} [options]
 */
export function createVitestConfig({ environment = "node", setupFiles = [], alias = {} } = {}) {
  return defineConfig({
    resolve: { alias },
    test: {
      ...sharedTestOptions,
      environment,
      setupFiles,
      include: ["src/**/*.test.{ts,tsx}"],
    },
  });
}
