import type { ViteUserConfig } from "vitest/config";

export interface VitestOptions {
  /** "node" for pure packages, "jsdom" for packages that render React. */
  environment?: "node" | "jsdom";
  /** Package-local setup files, e.g. Testing Library matchers and cleanup. */
  setupFiles?: string[];
  /** Import aliases matching the package's tsconfig `paths`. */
  alias?: Record<string, string>;
}

export type SharedTestOptions = Pick<
  NonNullable<ViteUserConfig["test"]>,
  "passWithNoTests" | "coverage"
>;

/** `passWithNoTests` and the coverage settings, shared by every package. */
export declare const sharedTestOptions: SharedTestOptions;

export declare function createVitestConfig(options?: VitestOptions): ViteUserConfig;
