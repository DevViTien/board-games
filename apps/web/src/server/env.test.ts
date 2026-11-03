import { describe, expect, it } from "vitest";

import { readServerEnv, ServerConfigError } from "./env";

const REDIS_URL = "rediss://default:secret@example.upstash.io:6379";

describe("readServerEnv", () => {
  it("keeps rooms in memory off Vercel without REDIS_URL", () => {
    expect(readServerEnv({})).toEqual({ store: { kind: "memory" }, realtimePort: 3001 });
    expect(readServerEnv({ REDIS_URL: "" }).store).toEqual({ kind: "memory" });
  });

  it("refuses to run on Vercel without REDIS_URL", () => {
    expect(() => readServerEnv({ VERCEL: "1", VERCEL_ENV: "preview" })).toThrow(ServerConfigError);
  });

  it.each(["https://example.upstash.io", "example.upstash.io:6379", "redis://"])(
    "refuses REDIS_URL %j",
    (url) => {
      expect(() => readServerEnv({ REDIS_URL: url })).toThrow(ServerConfigError);
    },
  );

  it.each([
    ["production", "production:"],
    ["preview", "preview:"],
    ["development", "dev:"],
    [undefined, "dev:"],
  ])("prefixes the keys of VERCEL_ENV %j with %j", (vercelEnv, keyPrefix) => {
    const env = vercelEnv === undefined ? { REDIS_URL } : { REDIS_URL, VERCEL_ENV: vercelEnv };

    expect(readServerEnv(env).store).toEqual({ kind: "redis", url: REDIS_URL, keyPrefix });
  });

  it("reads the realtime port", () => {
    expect(readServerEnv({ REALTIME_PORT: "4100" }).realtimePort).toBe(4100);
    expect(() => readServerEnv({ REALTIME_PORT: "http" })).toThrow(ServerConfigError);
  });
});
