import { defineConfig } from "vitest/config";

/**
 * Vitest config shared by every workspace package.
 *
 * @param {import("./index").VitestOptions} [options]
 */
export function createVitestConfig({ environment = "node", setupFiles = [], alias = {} } = {}) {
  return defineConfig({
    resolve: { alias },
    test: {
      environment,
      setupFiles,
      include: ["src/**/*.test.{ts,tsx}"],
      passWithNoTests: true,
      coverage: {
        provider: "v8",
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/**/*.test.{ts,tsx}", "src/**/index.ts"],
        reporter: ["text", "html"],
      },
    },
  });
}
