import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";
import { rulesTranslator } from "@/test/rules-translator";

import { RulesFigure } from "./RulesFigure";
import { RulesLeavingSection } from "./RulesLeavingSection";
import { RulesPage } from "./RulesPage";
import { RulesSection } from "./RulesSection";

vi.mock("@/i18n/actions", () => ({ setLocale: vi.fn() }));

function renderPage() {
  return renderWithIntl(
    <RulesPage
      gameId="caro"
      title="Luật chơi Cờ caro"
      facts="2 người · ~10 phút"
      artwork={<svg data-testid="artwork" />}
      playLabel="Chơi Cờ caro"
    >
      <RulesSection
        place="page"
        title="Hoà"
        figures={
          <RulesFigure label="Bàn đầy" caption="Bàn đầy: hoà." viewBox="0 0 10 10">
            <rect width="10" height="10" className="fill-game-board" />
          </RulesFigure>
        }
      >
        <p>Bàn đầy mà không ai thắng thì hoà.</p>
      </RulesSection>
    </RulesPage>,
  );
}

describe("RulesPage", () => {
  it("has the page's title, the game's colours, and its sections under it", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Luật chơi Cờ caro" })).toBeVisible();
    // The top bar too, and the browser's bar after it (`ThemeColorSync`).
    expect(screen.getByRole("main").closest("[data-game]")).toHaveAttribute("data-game", "caro");
    expect(screen.getByRole("main").closest("[data-game]")).toContainElement(
      screen.getByRole("banner"),
    );
    expect(screen.getByRole("heading", { level: 2, name: "Hoà" })).toBeVisible();
    expect(screen.getByText("2 người · ~10 phút")).toBeVisible();
  });

  it("offers to play the game at the top and at the end, and the way back to the menu", () => {
    renderPage();

    const play = screen.getAllByRole("link", { name: "Chơi Cờ caro" });
    expect(play).toHaveLength(2);
    for (const link of play) expect(link).toHaveAttribute("href", "/play/caro");
    expect(screen.getByRole("link", { name: "Về menu" })).toHaveAttribute("href", "/");
  });

  it("Cuộn trang luật: has the top bar with the way back, the theme and the language", () => {
    renderPage();

    const bar = within(screen.getByRole("banner"));
    expect(bar.getByRole("link", { name: "Về menu" })).toBeInTheDocument();
    expect(bar.getByRole("button", { name: /^Giao diện: / })).toBeInTheDocument();
    expect(bar.getByRole("button", { name: /^Ngôn ngữ: / })).toBeInTheDocument();
    // The title shows there too, for sight only: the heading tells it.
    expect(bar.getByText("Luật chơi Cờ caro")).toHaveAttribute("aria-hidden", "true");
  });

  it("shows a figure as a named picture with its caption", () => {
    renderPage();

    expect(screen.getByRole("img", { name: "Bàn đầy" })).toBeInTheDocument();
    expect(screen.getByText("Bàn đầy: hoà.")).toBeVisible();
  });
});

describe("RulesLeavingSection", () => {
  it("in a room of two: resigning, and the win claimed after 5 minutes", () => {
    renderWithIntl(
      <RulesLeavingSection t={rulesTranslator()} place="page" rooms="two" vsAi={false} />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Đầu hàng và bỏ ván" })).toBeVisible();
    expect(screen.getByText(/“Đầu hàng”/)).toBeVisible();
    expect(screen.getByText(/bấm được “Xử thắng” và thắng ván/)).toBeVisible();
    expect(screen.queryByText(/máy chơi thay/)).not.toBeInTheDocument();
  });

  it("in rooms of three or four: the computer stands in; against it, it wins", () => {
    renderWithIntl(
      <RulesLeavingSection t={rulesTranslator()} place="dialog" rooms="standIn" vsAi />,
    );

    expect(screen.getByRole("heading", { level: 3 })).toBeVisible();
    expect(screen.getByText(/“Máy chơi thay”/)).toBeVisible();
    expect(screen.getByText("Khi đấu với máy: đầu hàng thì máy thắng.")).toBeVisible();
  });
});
