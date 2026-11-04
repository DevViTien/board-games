import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";
import { rulesTranslator } from "@/test/rules-translator";

import { ChessRules } from "./Rules";

function sectionOf(title: string): HTMLElement {
  const section = screen.getByRole("heading", { level: 2, name: title }).closest("section");
  if (section === null) throw new Error(`No section for ${title}`);
  return section;
}

describe("ChessRules", () => {
  it("Các mục của Cờ vua: pieces, castling, en passant, promotion and the end of a game", () => {
    renderWithIntl(<ChessRules t={rulesTranslator()} place="page" />);

    for (const title of [
      "Cách đi của quân",
      "Nhập thành",
      "Bắt tốt qua đường",
      "Phong cấp",
      "Kết thúc ván",
    ]) {
      expect(screen.getByRole("heading", { level: 2, name: title })).toBeInTheDocument();
    }
    expect(screen.getByText(/Trắng đi trước/)).toBeInTheDocument();
    expect(sectionOf("Bắt tốt qua đường")).toHaveTextContent(/ngay nước kế tiếp/);
  });

  it("tells the draws that end a game by themselves from the ones a player claims", () => {
    renderWithIntl(<ChessRules t={rulesTranslator()} place="page" />);

    const end = sectionOf("Kết thúc ván");
    expect(end).toHaveTextContent(/Hoà tự động: một thế lặp lại lần thứ năm, 75 nước/);
    expect(end).toHaveTextContent(/không đủ quân để chiếu hết/);
    expect(end).toHaveTextContent(/Đòi hoà: khi thế cờ đã lặp lại ba lần, hoặc 50 nước/);
    expect(end).toHaveTextContent(/Hết nước đi/);
  });

  it("Ghi nguồn bộ quân: the staunty set, its licence, and a link to the licences", () => {
    renderWithIntl(<ChessRules t={rulesTranslator()} place="page" />);

    expect(
      screen.getByText(/bộ “staunty” của sadsnake1 \(Lichess\), giấy phép CC BY-NC-SA 4\.0/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Giấy phép" })).toHaveAttribute(
      "href",
      "/third-party-licenses.txt",
    );
  });

  it("Mục đầu hàng của Cờ vua: resigning and a turn claimed after 5 minutes, no computer", () => {
    renderWithIntl(<ChessRules t={rulesTranslator()} place="page" />);

    const leaving = sectionOf("Đầu hàng và bỏ ván");
    expect(leaving).toHaveTextContent(/“Đầu hàng”/);
    expect(leaving).toHaveTextContent(/5 phút/);
    expect(leaving).not.toHaveTextContent(/đấu với máy/);
  });

  it("draws how the pieces move, castling, en passant and promotion, each with a name", () => {
    renderWithIntl(<ChessRules t={rulesTranslator()} place="page" />);

    expect(screen.getAllByRole("img")).toHaveLength(4);
    expect(screen.getByRole("img", { name: /^Nhập thành cánh vua của Trắng/ })).toBeInTheDocument();
  });
});
