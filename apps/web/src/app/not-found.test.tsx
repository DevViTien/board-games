import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import NotFound from "./not-found";

describe("not-found page", () => {
  it.each([
    ["vi", "Không tìm thấy trang", "Về menu"],
    ["ja", "ページが見つかりません", "メニューに戻る"],
  ] as const)("is translated (%s) and leads back to the menu", (locale, title, back) => {
    renderWithIntl(<NotFound />, { locale });

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: back })).toHaveAttribute("href", "/");
  });
});
