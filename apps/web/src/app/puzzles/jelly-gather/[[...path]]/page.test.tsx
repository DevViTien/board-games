import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { JellyGatherApp } from "@/puzzles/jelly-gather/JellyGatherApp";
import { renderWithIntl } from "@/test/render-with-intl";

import LevelNotFound from "./not-found";
import JellyGatherRoute from "./page";

const NOT_FOUND = new Error("NEXT_NOT_FOUND");

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw NOT_FOUND;
  },
}));

const route = (path?: string[]) =>
  JellyGatherRoute({ params: Promise.resolve(path === undefined ? {} : { path }) });

describe("/puzzles/jelly-gather/[[...path]]", () => {
  it.each([[undefined], [["1-1"]], [["2-1"]]])("renders the puzzle for %j", async (path) => {
    expect((await route(path)).type).toBe(JellyGatherApp);
  });

  it.each([[["4-1"]], [["1-1", "x"]], [["nope"]], [["1-1", "edit"]]])(
    "Màn không có: %j is not found",
    async (path) => {
      await expect(route(path)).rejects.toBe(NOT_FOUND);
    },
  );

  it("says the level is not there and leads back to the levels", () => {
    renderWithIntl(<LevelNotFound />);
    expect(screen.getByRole("heading", { name: "Không có màn này" })).toBeVisible();
    const back = screen.getAllByRole("link", { name: /danh sách màn/i });
    expect(back.length).toBeGreaterThan(0);
    for (const link of back) expect(link).toHaveAttribute("href", "/puzzles/jelly-gather");
  });
});
