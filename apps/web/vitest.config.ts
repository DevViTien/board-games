import { fileURLToPath } from "node:url";

import { createVitestConfig } from "@board-games/config/vitest";

export default createVitestConfig({
  environment: "jsdom",
  setupFiles: ["./vitest.setup.ts"],
  alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
});
