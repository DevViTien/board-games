import { NextIntlClientProvider } from "next-intl";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InitialThemeProvider } from "@/features/settings/InitialThemeProvider";

import messages from "../../messages/vi.json";
import RootLayout, { generateViewport } from "./layout";

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
  getMessages: () => Promise.resolve(messages),
}));

async function html(): Promise<ReactElement<{ lang: string; "data-theme"?: string }>> {
  return (await RootLayout({ children: null })) as ReactElement<{
    lang: string;
    "data-theme"?: string;
  }>;
}

/** The first element of `type` in a tree of elements, depth first. */
function findElement(node: ReactNode, type: unknown): ReactElement | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<{ children?: ReactNode }>(child)) continue;
    if (child.type === type) return child;
    const found = findElement(child.props.children, type);
    if (found !== undefined) return found;
  }
  return undefined;
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

  it("sends every message to the browser but the rules", async () => {
    const provider = findElement(await html(), NextIntlClientProvider) as
      ReactElement<{ messages: Record<string, unknown> }> | undefined;

    expect(provider?.props.messages).not.toHaveProperty("Rules");
    expect(provider?.props.messages).toHaveProperty("Play");
    expect(provider?.props.messages).toHaveProperty("Games");
  });

  it("gives the browser's bar the picked theme's background, the one chosen too", async () => {
    cookie.value = "dark";
    const provider = findElement(await html(), InitialThemeProvider) as
      ReactElement<{ theme: string }> | undefined;

    expect(provider?.props.theme).toBe("dark");
    expect((await generateViewport()).themeColor).toBe("#121322");
  });

  it("gives the browser's bar one background per colour scheme while following the system", async () => {
    expect((await generateViewport()).themeColor).toEqual([
      { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
      { media: "(prefers-color-scheme: dark)", color: "#121322" },
    ]);
  });

  it("Phóng to: draws to the screen's edges and never blocks zooming", async () => {
    const viewport = await generateViewport();

    expect(viewport).toMatchObject({
      width: "device-width",
      initialScale: 1,
      viewportFit: "cover",
    });
    expect(viewport).not.toHaveProperty("maximumScale");
    expect(viewport).not.toHaveProperty("userScalable");
  });
});
