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

  it("Nêu giới hạn lượt và vòng", () => {
    renderWithIntl(<JellyCrewRules t={rulesTranslator()} place="page" />);

    expect(sectionOf("Lượt chơi")).toHaveTextContent(/tối đa 5 bước/u);
    expect(sectionOf("Giới hạn vòng")).toHaveTextContent(
      /hết vòng mà khuôn chưa đầy thì ván kết thúc/u,
    );
  });

  it("names the team's goal, the kinds, the tools and the maps", () => {
    renderWithIntl(<JellyCrewRules t={rulesTranslator()} place="page" />);

    expect(sectionOf("Mục tiêu")).toHaveTextContent(/cả đội thắng/u);
    expect(sectionOf("Đẩy và dính")).toHaveTextContent(/Sương sáo dính với mọi loại thạch/u);
    expect(sectionOf("Nhân vật chắn đường")).toHaveTextContent(/không đẩy được nhân vật/u);
    const tools = sectionOf("Lùi bước, đặt lại, giữ nút");
    expect(tools).toHaveTextContent(/Lùi bước \(chơi online\)/u);
    expect(tools).toHaveTextContent(/Đặt lại bản đồ/u);
    expect(sectionOf("Bản đồ")).toHaveTextContent(/Hai gian bếp.*Chợ đêm.*Kho lạnh/u);
  });

  it("Bỏ cuộc trên trang Đội gom thạch: giving up stops the game for the team, no stand-in", () => {
    renderWithIntl(<JellyCrewRules t={rulesTranslator()} place="page" />);

    const leaving = sectionOf("Bỏ cuộc và bỏ ván");
    expect(leaving).toHaveTextContent(/“Bỏ cuộc”/u);
    expect(leaving).toHaveTextContent(/cả đội, không ai thắng/u);
    expect(leaving).not.toHaveTextContent(/Máy chơi thay/u);
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
