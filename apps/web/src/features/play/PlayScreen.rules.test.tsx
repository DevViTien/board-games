import { createRng, listOptionChoices } from "@board-games/engine";
import { caro, type CaroMove, type CaroState } from "@board-games/games";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { CaroBoard } from "@/games/caro/Board";
import { useCaroMoveLabel } from "@/games/caro/move-label";
import { useCaroPlayerLabel } from "@/games/caro/player-label";
import { renderWithIntl } from "@/test/render-with-intl";
import { createLocalTransport } from "@/transport/local-transport";
import { createMemoryStore } from "@/transport/memory-store";
import type { Transport } from "@/transport/types";

import { PlayScreen } from "./PlayScreen";

const caroUi = {
  Board: CaroBoard,
  usePlayerLabel: useCaroPlayerLabel,
  useMoveLabel: useCaroMoveLabel,
};

/** The invisible mark the play screen adds to make the turn line be read again. */
const REPEAT_MARK = String.fromCodePoint(0x200b);

const RULES = <p>Năm quân liền nhau là thắng.</p>;

/** A same-device Cờ caro game on a 19×19 board with the free-style rule. */
async function renderCaro({ withRules = true }: { withRules?: boolean } = {}) {
  const transport: Transport<CaroState, CaroMove> = createLocalTransport({
    definition: caro,
    store: createMemoryStore(),
    rng: createRng(1),
    start: { mode: "local", options: { size: 19, rule: "free" } },
    fallback: { mode: "local" },
  });
  renderWithIntl(
    <PlayScreen
      gameId="caro"
      transport={transport}
      ui={caroUi}
      optionChoices={listOptionChoices(caro)}
      rules={withRules ? RULES : undefined}
    />,
  );
  await screen.findByRole("grid", { name: "Bàn cờ" });
  return transport;
}

const rulesButton = () => screen.getByRole("button", { name: "Luật chơi" });

describe("PlayScreen's rules", () => {
  it("Đọc luật giữa ván: the dialog says the rules of this game; closing it changes nothing", async () => {
    const transport = await renderCaro();
    transport.submit({ cell: 0 });
    transport.submit({ cell: 20 });
    const user = userEvent.setup();

    await user.click(rulesButton());

    const dialog = screen.getByRole("dialog", { name: "Luật chơi Cờ caro" });
    expect(within(dialog).getByText("Ván này: 19×19 · Tự do")).toBeVisible();
    expect(within(dialog).getByText("Năm quân liền nhau là thắng.")).toBeVisible();
    expect(within(dialog).queryAllByRole("link")).toHaveLength(0);

    await user.click(within(dialog).getByRole("button", { name: "Đóng" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(transport.getSnapshot()).toMatchObject({ status: "ready", moveCount: 2 });
    expect(screen.getByRole("button", { name: /^Hàng 1, cột 1, X/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Hàng 2, cột 2, O/ })).toBeInTheDocument();
  });

  it("reads the turn line again once the dialog closes", async () => {
    await renderCaro();
    const user = userEvent.setup();
    const status = screen.getAllByRole("status")[0];
    if (status === undefined) throw new Error("no status line");
    const before = status.textContent;

    await user.click(rulesButton());
    await user.click(screen.getByRole("button", { name: "Đóng" }));

    // The same words, with or without the invisible mark: a change the live region reads out.
    expect(status.textContent).not.toBe(before);
    const words = (text: string | null) => (text ?? "").replace(REPEAT_MARK, "");
    expect(words(status.textContent)).toBe(words(before));
  });

  it("opens again after being closed, with its content kept", async () => {
    await renderCaro();
    const user = userEvent.setup();

    await user.click(rulesButton());
    await user.click(screen.getByRole("button", { name: "Đóng" }));
    await user.click(rulesButton());

    expect(screen.getByRole("dialog", { name: "Luật chơi Cờ caro" })).toBeVisible();
    expect(screen.getByText("Năm quân liền nhau là thắng.")).toBeVisible();
  });

  it("Nút trên màn hình chơi ở điện thoại: the button is named even with its icon alone", async () => {
    await renderCaro();

    // Its words are for screen readers only below 640 px (`sr-only sm:not-sr-only`).
    expect(rulesButton()).toHaveClass("size-11");
    expect(within(rulesButton()).getByText("Luật chơi")).toHaveClass("sr-only");
  });

  it("loads the game's own rules when the dialog first opens", async () => {
    await renderCaro({ withRules: false });

    await userEvent.click(rulesButton());

    const dialog = screen.getByRole("dialog", { name: "Luật chơi Cờ caro" });
    expect(
      await within(dialog).findByRole("heading", { level: 3, name: "Luật “tự do”" }),
    ).toBeInTheDocument();
  });
});
