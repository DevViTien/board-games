import { describe, expect, it } from "vitest";

import { configuredRealtimeUrl, resolveRealtimeUrl } from "./realtime-url";

describe("realtime server address", () => {
  it("uses the configured address, whatever the environment", () => {
    for (const NODE_ENV of ["production", "development", undefined]) {
      expect(
        configuredRealtimeUrl({ REALTIME_URL: "ws://localhost:3101/api/realtime", NODE_ENV }),
      ).toBe("ws://localhost:3101/api/realtime");
    }
  });

  it("uses the server of `pnpm dev` in development when none is configured", () => {
    expect(configuredRealtimeUrl({ NODE_ENV: "development" })).toBe(
      "ws://localhost:3001/api/realtime",
    );
  });

  it("leaves it to the page's own origin otherwise", () => {
    expect(configuredRealtimeUrl({ NODE_ENV: "production" })).toBeNull();
    expect(configuredRealtimeUrl({})).toBeNull();
  });

  it("ignores a configured value that is not a WebSocket address", () => {
    expect(
      configuredRealtimeUrl({ REALTIME_URL: "https://example.com", NODE_ENV: "production" }),
    ).toBeNull();
    expect(configuredRealtimeUrl({ REALTIME_URL: "nope", NODE_ENV: "development" })).toBe(
      "ws://localhost:3001/api/realtime",
    );
  });

  it("connects to the page's own origin, secure on a secure page", () => {
    expect(resolveRealtimeUrl(null, { protocol: "https:", host: "board-games.vercel.app" })).toBe(
      "wss://board-games.vercel.app/api/realtime",
    );
    expect(resolveRealtimeUrl(null, { protocol: "http:", host: "192.168.1.5:3000" })).toBe(
      "ws://192.168.1.5:3000/api/realtime",
    );
  });

  it("connects to the configured address when there is one", () => {
    expect(
      resolveRealtimeUrl("ws://localhost:3101/api/realtime", { protocol: "https:", host: "x.app" }),
    ).toBe("ws://localhost:3101/api/realtime");
  });
});
