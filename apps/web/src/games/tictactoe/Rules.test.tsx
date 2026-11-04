import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";
import { rulesTranslator } from "@/test/rules-translator";

import { TicTacToeRules } from "./Rules";

describe("TicTacToeRules", () => {
  it("Các mục của Tic-tac-toe: moves, winning and draw, with the three winning lines", () => {
    renderWithIntl(<TicTacToeRules t={rulesTranslator()} place="page" />);

    for (const title of ["Cách đi", "Thắng", "Hoà"]) {
      expect(screen.getByRole("heading", { level: 2, name: title })).toBeInTheDocument();
    }
    expect(screen.getByText(/X đi trước/)).toBeInTheDocument();
    expect(screen.getByText(/3 hàng ngang, 3 cột dọc hoặc 2 đường chéo/)).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /hàng ngang.*cột dọc.*đường chéo/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Ba kiểu đường thắng: một hàng ngang, một cột dọc, một đường chéo."),
    ).toBeInTheDocument();
  });

  it("says that against the computer, resigning hands it the win", () => {
    renderWithIntl(<TicTacToeRules t={rulesTranslator()} place="page" />);

    expect(screen.getByText("Khi đấu với máy: đầu hàng thì máy thắng.")).toBeInTheDocument();
  });
});
