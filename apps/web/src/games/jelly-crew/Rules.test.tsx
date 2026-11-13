import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";
import { rulesTranslator } from "@/test/rules-translator";

import { JellyCrewRules } from "./Rules";
import { BLOCKED_SCENE, HOLD_SCENE } from "./rules/figures";

function sectionOf(title: string): HTMLElement {
  const section = screen.getByRole("heading", { level: 2, name: title }).closest("section");
  if (section === null) throw new Error(`No section for ${title}`);
  return section;
}

describe("Luật Đội gom thạch", () => {
  it("Nêu nút và cửa: a section with a figure of one holding plate ● for another", () => {
    renderWithIntl(<JellyCrewRules t={rulesTranslator()} place="page" />);

    const doors = sectionOf("Nút và cửa");
    expect(doors).toHaveTextContent(
      /Cửa mở khi có người hay thạch đứng trên một nút cùng ký hiệu/u,
    );
    const figure = within(doors).getByRole("img", {
      name: "Hồng đứng trên nút ●, cửa ● mở; Lam đẩy thạch dâu qua cửa ●.",
    });
    expect(figure.closest("figure")).toHaveTextContent(
      "Hồng giữ nút ● để Lam đẩy thạch dâu qua cửa ●.",
    );
  });

  it("Nêu cách đi tự do: no turns, no step limit, no rounds", () => {
    renderWithIntl(<JellyCrewRules t={rulesTranslator()} place="page" />);

    expect(sectionOf("Mọi người cùng đi")).toHaveTextContent(/bất cứ lúc nào/u);
    expect(sectionOf("Mọi người cùng đi")).toHaveTextContent(/W A S D luôn đi Lam/u);
    const page = document.body.textContent;
    expect(page).not.toMatch(/Xong lượt|vòng/u);
  });

  it("names the team's goal, the kinds, the end without losing, the reset and the maps", () => {
    renderWithIntl(<JellyCrewRules t={rulesTranslator()} place="page" />);

    expect(sectionOf("Mục tiêu")).toHaveTextContent(/cả đội thắng/u);
    expect(sectionOf("Đẩy và dính")).toHaveTextContent(/Sương sáo dính với mọi loại thạch/u);
    expect(sectionOf("Nhân vật chắn đường")).toHaveTextContent(/không đẩy được nhân vật/u);
    expect(sectionOf("Kết thúc ván")).toHaveTextContent(/không có thua/u);
    expect(sectionOf("Đặt lại bản đồ")).toHaveTextContent(/ai cũng bấm được/u);
    expect(sectionOf("Bản đồ")).toHaveTextContent(/Hai gian bếp.*Chợ đêm.*Kho lạnh/u);
  });

  it("Bỏ cuộc trên trang Đội gom thạch: giving up stops the game for the team, no stand-in", () => {
    renderWithIntl(<JellyCrewRules t={rulesTranslator()} place="page" />);

    const leaving = sectionOf("Bỏ cuộc");
    expect(leaving).toHaveTextContent(/“Bỏ cuộc”/u);
    expect(leaving).toHaveTextContent(/cả đội, không ai thắng/u);
    expect(leaving).not.toHaveTextContent(/Máy chơi thay/u);
    expect(leaving).toHaveTextContent(/không ai bị xử bỏ ván/u);
  });

  it("draws its figures as the rules play them", () => {
    // The hold: Pink stands on plate ● (cell 0), the strawberry in the open door.
    expect(HOLD_SCENE.chars[1]).toBe(HOLD_SCENE.plates[0]?.[0]);
    expect(HOLD_SCENE.pieces[0]?.cells[0]).toBe(HOLD_SCENE.doors[0]?.[0]);
    // The block: the mango right of Blue, Pink right of the mango.
    const [blue, pink] = BLOCKED_SCENE.chars;
    expect(BLOCKED_SCENE.pieces[0]?.cells[0]).toBe((blue ?? 0) + 1);
    expect(pink).toBe((blue ?? 0) + 2);
  });
});
