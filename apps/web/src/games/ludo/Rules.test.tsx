import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";
import { rulesTranslator } from "@/test/rules-translator";

import { LudoRules } from "./Rules";

function sectionOf(title: string): HTMLElement {
  const section = screen.getByRole("heading", { level: 2, name: title }).closest("section");
  if (section === null) throw new Error(`No section for ${title}`);
  return section;
}

describe("LudoRules", () => {
  it("Các luật đã chốt: out, a 6, moving and sending home, a 1, climbing home, winning", () => {
    renderWithIntl(<LudoRules t={rulesTranslator()} place="page" />);

    for (const title of [
      "Ra quân",
      "Lượt đi và gieo 6",
      "Đi và đá",
      "Gieo 1: nhảy tới chân chuồng",
      "Lên chuồng",
      "Thắng",
    ]) {
      expect(screen.getByRole("heading", { level: 2, name: title })).toBeInTheDocument();
    }
    expect(sectionOf("Ra quân")).toHaveTextContent(
      /Ô xuất phát đang có ngựa mình thì không ra được/,
    );
    const one = sectionOf("Gieo 1: nhảy tới chân chuồng");
    expect(one).toHaveTextContent(/Nhảy được thì bắt buộc nhảy/);
    expect(one).toHaveTextContent(/ngựa đối thủ đứng ở chân chuồng đó bị đá/);
    expect(sectionOf("Lượt đi và gieo 6")).toHaveTextContent(/Gieo được 6 thì được gieo thêm/);
    expect(sectionOf("Đi và đá")).toHaveTextContent(/Không vượt qua ngựa nào/);
    // Không đi quá chân chuồng: one round only, stopping right on its own home entry.
    expect(sectionOf("Đi và đá")).toHaveTextContent(/Không đi quá chân chuồng của mình/);
    expect(one).toHaveTextContent(/xa nhất là chân chuồng của chính nó/);
  });

  it("Điều kiện thắng: the first with 4 horses on steps 3, 4, 5 and 6 wins", () => {
    renderWithIntl(<LudoRules t={rulesTranslator()} place="page" />);

    expect(sectionOf("Thắng")).toHaveTextContent(
      "Người đầu tiên có đủ 4 ngựa ở bậc 3, 4, 5 và 6 của chuồng đích thắng; ván kết thúc ngay.",
    );
  });

  it("Máy chơi thay trên trang Cờ cá ngựa: the computer stands in a room of 3–4, one of 2 ends", () => {
    renderWithIntl(<LudoRules t={rulesTranslator()} place="page" />);

    const leaving = sectionOf("Đầu hàng và bỏ ván");
    expect(leaving).toHaveTextContent(/Phòng 3–4 người: máy chơi thay .*“Máy chơi thay”/);
    expect(leaving).toHaveTextContent(/Phòng 2 người: ván kết thúc, người kia thắng/);
    expect(leaving).toHaveTextContent(/5 phút/);
  });

  it("draws the way, the jump of a 1 and climbing home, each with a name", () => {
    renderWithIntl(<LudoRules t={rulesTranslator()} place="page" />);

    expect(
      screen.getByRole("img", { name: /^Bàn chữ thập: ngựa Đỏ ra ở ô xuất phát/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /^Hàng trên: ngựa Đỏ gieo 1/ })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /^Chuồng đích 6 bậc/ })).toBeInTheDocument();
  });
});
