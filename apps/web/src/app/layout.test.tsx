import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RootLayout from "./layout";

const cookie = vi.hoisted(() => ({ value: undefined as string | undefined }));

vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) =>
        name === "theme" && cookie.value !== undefined ? { name, value: cookie.value } : undefined,
    }),
}));

vi.mock("next/font/google", () => ({
  Be_Vietnam_Pro: () => ({ variable: "font-app" }),
  Noto_Sans_JP: () => ({ variable: "font-cjk" }),
}));

vi.mock("next-intl/server", () => ({
  getLocale: () => Promise.resolve("vi"),
  getTranslations: () => Promise.resolve(() => ""),
}));

async function html(): Promise<ReactElement<{ lang: string; "data-theme"?: string }>> {
  return (await RootLayout({ children: null })) as ReactElement<{
    lang: string;
    "data-theme"?: string;
  }>;
}

describe("RootLayout", () => {
  beforeEach(() => {
    cookie.value = undefined;
  });

  it("Giữ giao diện sau khi tải lại: the server's HTML is dark for a player who picked dark", async () => {
    cookie.value = "dark";

    const page = await html();

    expect(page.type).toBe("html");
    expect(page.props["data-theme"]).toBe("dark");
    expect(page.props.lang).toBe("vi");
  });

  it("is light for a player who picked light, even on a dark system", async () => {
    cookie.value = "light";

    expect((await html()).props["data-theme"]).toBe("light");
  });

  it.each([undefined, "khong-hop-le"])(
    "follows the system without a theme (cookie %j)",
    async (value) => {
      cookie.value = value;

      expect((await html()).props["data-theme"]).toBeUndefined();
    },
  );
});
