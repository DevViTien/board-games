import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
/** The realtime server of the tests, next to the app's port and away from `pnpm dev`'s 3001. */
const REALTIME_PORT = 3101;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    // The UI language follows the browser's, so pin it; tests override it with test.use().
    locale: "vi-VN",
    trace: "on-first-retry",
    // Ludo's 3D die draws with WebGL: headless Chromium falls back to SwiftShader, which recent
    // versions only allow with this flag (`e2e/ludo-throw.spec.ts` checks the 3D throw ran).
    launchOptions: { args: ["--enable-unsafe-swiftshader"] },
  },
  projects: [
    // The laptop the design is checked at (redesign-game-boards): board, turn and buttons fit
    // 1280 × 800 without scrolling. Playwright's own "Desktop Chrome" is 720 px high.
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    // Online rooms: `next start` cannot serve WebSockets, so the realtime server runs on its own,
    // with rooms in memory (an empty REDIS_URL counts as unset). Never reused, even locally: a
    // server left running from an older checkout would test old server code, and its rooms would
    // outlive the run. A port already taken fails the run instead.
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
    // Runs against the production build; turbo builds first (test:e2e depends on build). The
    // realtime server's address is read at request time, so the build does not depend on it.
    {
      command: `pnpm start --port ${PORT}`,
      url: `http://localhost:${PORT}`,
      env: { REALTIME_URL: `ws://localhost:${REALTIME_PORT}/api/realtime` },
      reuseExistingServer: !isCI,
    },
  ],
});
