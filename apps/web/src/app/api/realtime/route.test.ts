import { upgradeWebSocket } from "@vercel/functions";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as Env from "@/server/env";
import { readServerEnv, serverEnv } from "@/server/env";

import { GET } from "./route";

vi.mock("@vercel/functions", () => ({ upgradeWebSocket: vi.fn() }));
vi.mock("next/server", () => ({ connection: vi.fn(() => Promise.resolve()) }));
// The real environment is read once per process; each test decides what it is.
vi.mock("@/server/env", async (importOriginal) => ({
  ...(await importOriginal<typeof Env>()),
  serverEnv: vi.fn(),
}));

const upgradeRequest = () =>
  new Request("https://example.test/api/realtime", {
    headers: { upgrade: "websocket", connection: "Upgrade" },
  });

describe("GET /api/realtime", () => {
  beforeEach(() => {
    vi.mocked(serverEnv).mockImplementation(() => readServerEnv({}));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.mocked(upgradeWebSocket).mockReset();
    vi.restoreAllMocks();
  });

  it("answers 426 to a request that is not a WebSocket upgrade", async () => {
    const response = await GET(new Request("https://example.test/api/realtime"));

    expect(response.status).toBe(426);
    expect(upgradeWebSocket).not.toHaveBeenCalled();
  });

  it("answers 501 where the runtime cannot upgrade (next dev, next start)", async () => {
    vi.mocked(upgradeWebSocket).mockRejectedValue(new Error("upgradeWebSocket is not available"));

    expect((await GET(upgradeRequest())).status).toBe(501);
  });

  it("answers 503 on Vercel without REDIS_URL", async () => {
    vi.mocked(serverEnv).mockImplementation(() => readServerEnv({ VERCEL: "1" }));

    expect((await GET(upgradeRequest())).status).toBe(503);
    expect(upgradeWebSocket).not.toHaveBeenCalled();
  });

  it("upgrades with a 16 KB message limit", async () => {
    const upgraded = new Response(null, { status: 204 });
    vi.mocked(upgradeWebSocket).mockResolvedValue(upgraded);

    expect(await GET(upgradeRequest())).toBe(upgraded);
    expect(upgradeWebSocket).toHaveBeenCalledWith(expect.any(Function), {
      maxPayload: 16 * 1024,
    });
  });
});
