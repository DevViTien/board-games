import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RoomRoute } from "@/features/room/RoomRoute";
import { renderWithIntl } from "@/test/render-with-intl";

import RoomNotFound from "./not-found";
import RoomPage, { generateMetadata } from "./page";

const NOT_FOUND = new Error("NEXT_NOT_FOUND");
const REDIRECT = new Error("NEXT_REDIRECT");

const navigation = vi.hoisted(() => ({ redirect: vi.fn() }));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw NOT_FOUND;
  },
  redirect: (url: string) => {
    navigation.redirect(url);
    throw REDIRECT;
  },
}));

vi.mock("next/server", () => ({ connection: () => Promise.resolve() }));

vi.mock("next-intl/server", () => ({
  getTranslations: () =>
    Promise.resolve((key: string, values: { code: string }) => `${key} ${values.code}`),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  navigation.redirect.mockReset();
});

const open = (code: string) => RoomPage({ params: Promise.resolve({ code }) });

describe("/room/[code]", () => {
  it("renders the room of a code in canonical form, passing only plain values", async () => {
    vi.stubEnv("REALTIME_URL", "ws://localhost:3101/api/realtime");

    const page = await open("ABC234");

    expect(page.type).toBe(RoomRoute);
    expect(page.props).toEqual({ code: "ABC234", realtimeUrl: "ws://localhost:3101/api/realtime" });
  });

  it("leaves the realtime server to the page's origin when none is configured in production", async () => {
    vi.stubEnv("REALTIME_URL", undefined);
    vi.stubEnv("NODE_ENV", "production");

    expect((await open("ABC234")).props).toEqual({ code: "ABC234", realtimeUrl: null });
  });

  it("sends a code in lower case to its canonical address", async () => {
    await expect(open("abc234")).rejects.toBe(REDIRECT);

    expect(navigation.redirect).toHaveBeenCalledWith("/room/ABC234");
  });

  it.each(["khong-co-ma", "ABC23", "ABC2340", "ABCD1O"])(
    "calls notFound for %s, which cannot be a room code",
    async (code) => {
      await expect(open(code)).rejects.toBe(NOT_FOUND);
    },
  );

  it("is titled with the room's code", async () => {
    expect(await generateMetadata({ params: Promise.resolve({ code: "ABC234" }) })).toEqual({
      title: "title ABC234",
    });
    expect(await generateMetadata({ params: Promise.resolve({ code: "nope" }) })).toEqual({});
  });

  it("says the room was not found, with a way back to the menu", () => {
    renderWithIntl(<RoomNotFound />);

    expect(screen.getByRole("heading", { name: "Không tìm thấy phòng" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Về menu" })).toHaveAttribute("href", "/");
  });
});
