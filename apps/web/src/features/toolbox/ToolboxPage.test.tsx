import { screen } from "@testing-library/react";
import type { Route } from "next";
import { describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";
import { TOOLS } from "@/tools/registry";

import { ToolboxPage } from "./ToolboxPage";

vi.mock("@/i18n/actions", () => ({ setLocale: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("ToolboxPage", () => {
  it("Mở Hộp công cụ: its title, and a card that opens the tool", () => {
    renderWithIntl(<ToolboxPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Hộp công cụ" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ghi điểm đánh bài/ })).toHaveAttribute(
      "href",
      "/tools/card-score",
    );
    expect(screen.getByRole("link", { name: "Về menu" })).toHaveAttribute("href", "/");
  });

  it("Trang bằng ngôn ngữ khác", () => {
    renderWithIntl(<ToolboxPage />, { locale: "ja" });

    expect(screen.getByRole("heading", { level: 1, name: "ツールボックス" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /カードゲーム点数記録/ })).toBeInTheDocument();
  });

  it("Công cụ mới: one more entry is one more card, nothing else to change", () => {
    const [first] = TOOLS;
    if (first === undefined) throw new Error("no tool");
    renderWithIntl(
      <ToolboxPage tools={[...TOOLS, { ...first, href: "/tools/card-score/trial" as Route }]} />,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(TOOLS.length + 1);
    expect(screen.getAllByRole("link", { name: /Ghi điểm đánh bài/ }).at(-1)).toHaveAttribute(
      "href",
      "/tools/card-score/trial",
    );
  });
});
