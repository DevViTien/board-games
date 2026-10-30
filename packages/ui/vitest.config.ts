import { createVitestConfig } from "@board-games/config/vitest";

export default createVitestConfig({ environment: "jsdom", setupFiles: ["./vitest.setup.ts"] });
