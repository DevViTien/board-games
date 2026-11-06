import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import { AppStateScreen } from "./AppStateScreen";
import { AppTopBar } from "./AppTopBar";

vi.mock("@/i18n/actions", () => ({ setLocale: vi.fn() }));

const SETTINGS = ["Giao diện: Theo hệ thống", "Ngôn ngữ: Tiếng Việt, VI"] as const;

describe("AppTopBar", () => {
  it("is the page's banner: the way back, the title and actions, then the two settings", () => {
    renderWithIntl(
      <AppTopBar title={<h1>Cờ vua</h1>} actions={<button type="button">Luật chơi</button>} />,
    );

    const bar = within(screen.getByRole("banner"));
    // Its words hide on a phone, its name stays.
    expect(bar.getByRole("link", { name: "Về menu" })).toHaveAttribute("href", "/");
    expect(bar.getByRole("heading", { level: 1, name: "Cờ vua" })).toBeInTheDocument();
    expect(
      bar
        .getAllByRole("button")
        .map((button) => button.getAttribute("aria-label") ?? button.textContent),
    ).toEqual(["Luật chơi", ...SETTINGS]);
  });

  it("on the menu, shows the app's name instead of the way back, the settings still there", () => {
    renderWithIntl(<AppTopBar home />);

    const bar = within(screen.getByRole("banner"));
    expect(bar.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByRole("banner")).toHaveTextContent("Board Games Hub");
    for (const name of SETTINGS) expect(bar.getByRole("button", { name })).toBeInTheDocument();
  });

  it("Trang không tìm thấy: a state screen has the bar with the way back and the settings", () => {
    renderWithIntl(<AppStateScreen title="Không tìm thấy trang" tone="warning" />);

    const bar = within(screen.getByRole("banner"));
    expect(bar.getByRole("link", { name: "Về menu" })).toBeInTheDocument();
    for (const name of SETTINGS) expect(bar.getByRole("button", { name })).toBeInTheDocument();
    expect(screen.getByRole("main")).not.toContainElement(screen.getByRole("banner"));
  });

  it("a page deeper in the app has its own way back, instead of the menu's", () => {
    renderWithIntl(<AppTopBar back={<a href="#toolbox">Hộp công cụ</a>} />);

    const bar = within(screen.getByRole("banner"));
    expect(bar.getByRole("link", { name: "Hộp công cụ" })).toHaveAttribute("href", "#toolbox");
    expect(bar.queryByRole("link", { name: "Về menu" })).not.toBeInTheDocument();
    for (const name of SETTINGS) expect(bar.getByRole("button", { name })).toBeInTheDocument();
  });

  it("so does a state screen of such a page", () => {
    renderWithIntl(
      <AppStateScreen
        title="Không thấy nhóm"
        tone="warning"
        back={<a href="#groups">Các nhóm</a>}
      />,
    );

    const bar = within(screen.getByRole("banner"));
    expect(bar.getByRole("link", { name: "Các nhóm" })).toBeInTheDocument();
    expect(bar.queryByRole("link", { name: "Về menu" })).not.toBeInTheDocument();
  });
});
