import { defineConfig, devices } from "@playwright/test";

// `pnpm ui:shots`: screenshots of the key screens for design review (the board-games-ui skill),
// not a test suite. It always runs against a local production build, never a deployed site, on
// ports of its own so it never meets `pnpm dev` (3000/3001) or the E2E run (3100/3101).
const PORT = 3200;
const REALTIME_PORT = 3201;

const VIEWPORTS = {
  phone: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 },
  desktop: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
} as const;
const SCHEMES = ["light", "dark"] as const;

export default defineConfig({
  testDir: "./ui-shots",
  testMatch: "**/*.shots.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  // Each worker runs a browser next to `next start` and the realtime server: keep memory low.
  workers: 2,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "vi-VN",
    trace: "retain-on-failure",

    // Ludo's 3D die draws with WebGL: headless Chromium falls back to SwiftShader, which recent
    // versions only allow with this flag (`e2e/ludo-throw.spec.ts` checks the 3D throw ran).
    launchOptions: { args: ["--enable-unsafe-swiftshader"] },
  },
  // One folder per project, holding its PNGs: `.ui-shots/<viewport>-<scheme>/<screen>.png`.
  // Playwright empties the folders of the projects it runs before each run.
  projects: Object.entries(VIEWPORTS).flatMap(([viewport, device]) =>
    SCHEMES.map((colorScheme) => ({
      name: `${viewport}-${colorScheme}`,
      outputDir: `./.ui-shots/${viewport}-${colorScheme}`,
      use: { ...device, colorScheme },
    })),
  ),
  // Same servers as playwright.config.ts, never reused so the shots always show the current build.
  webServer: [
    {
      command: "pnpm realtime",
      url: `http://localhost:${REALTIME_PORT}/healthz`,
      // A turn can be claimed abandoned after 3 s instead of 5 min: the browsers only move their
      // clocks with `page.clock.setSystemTime` (change `add-resign-and-abandon`).
      env: {
        REALTIME_PORT: String(REALTIME_PORT),
        REDIS_URL: "",
        VERCEL_ENV: "",
        REALTIME_ABANDON_AFTER_MS: "3000",
      },
      reuseExistingServer: false,
    },
    {
      command: `pnpm start --port ${PORT}`,
      url: `http://localhost:${PORT}`,
      env: { REALTIME_URL: `ws://localhost:${REALTIME_PORT}/api/realtime` },
      reuseExistingServer: false,
    },
  ],
});
