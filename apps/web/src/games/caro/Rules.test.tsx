import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";
import { rulesTranslator } from "@/test/rules-translator";

import { CaroRules } from "./Rules";

function sectionOf(title: string): HTMLElement {
  const section = screen.getByRole("heading", { level: 2, name: title }).closest("section");
  if (section === null) throw new Error(`No section for ${title}`);
  return section;
}

const BLOCKED = "Luật “chặn hai đầu” (mặc định)";

describe("CaroRules", () => {
  it("Hai luật thắng: a section for each winning rule, and the three board sizes", () => {
    renderWithIntl(<CaroRules t={rulesTranslator()} place="page" />);

    expect(sectionOf("Luật “tự do”")).toHaveTextContent(/Từ 5 quân liền trở lên/);
    const blocked = sectionOf(BLOCKED);
    expect(blocked).toHaveTextContent(/cả hai ô ngay ngoài hai đầu chuỗi là quân đối thủ/);
    expect(blocked).toHaveTextContent("Mép bàn không tính là chặn.");
    expect(blocked).toHaveTextContent("Chuỗi dài hơn 5 quân thắng theo cùng điều kiện.");
    expect(screen.getByText(/Bàn 15×15, 19×19 hoặc vô hạn/)).toBeInTheDocument();
    expect(screen.getByText(/Bàn vô hạn bắt đầu 15×15 và tự nở/)).toBeInTheDocument();
    expect(sectionOf("Hoà")).toHaveTextContent("Bàn đầy mà không ai thắng thì hoà.");
  });

  it("names the blocked-ends rule in its goal", () => {
    renderWithIntl(<CaroRules t={rulesTranslator()} place="page" />);

    expect(sectionOf("Mục tiêu")).toHaveTextContent(/chặn hai đầu/);
  });

  it("Hình của luật chặn hai đầu: both ends blocked no win, one end a win, the edge a win", () => {
    renderWithIntl(<CaroRules t={rulesTranslator()} place="page" />);

    const figures = within(sectionOf(BLOCKED)).getAllByRole("figure");
    expect(figures).toHaveLength(2);
    expect(figures[0]).toHaveTextContent(
      "Trên: bị chặn hai đầu, không thắng. Dưới: chỉ bị chặn một đầu, thắng.",
    );
    expect(figures[1]).toHaveTextContent(
      "Chạm mép bàn, đầu kia là O: thắng, vì mép bàn không chặn.",
    );
  });

  it("Hình có tên đọc được: five X blocked at both ends by O, and no win", () => {
    renderWithIntl(<CaroRules t={rulesTranslator()} place="page" />);

    expect(
      screen.getByRole("img", {
        name: "Hàng trên: năm X bị hai quân O chặn hai đầu, không thắng. Hàng dưới: năm X chỉ bị chặn một đầu, X thắng",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Năm X chạm mép bàn, đầu kia là O: X thắng vì mép bàn không chặn",
      }),
    ).toBeInTheDocument();
  });
});
