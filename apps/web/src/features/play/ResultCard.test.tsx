import { createRng } from "@board-games/engine";
import { tictactoe, type TicTacToeMove, type TicTacToeState } from "@board-games/games";
import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { tictactoeEntry } from "@/games/tictactoe";
import type { GameUI } from "@/games/types";
import { changingTransport, stubReducedMotion } from "@/test/fake-transport";
import { renderWithIntl } from "@/test/render-with-intl";
import { createLocalTransport } from "@/transport/local-transport";
import { createMemoryStore } from "@/transport/memory-store";
import type { ReadySnapshot } from "@/transport/types";

import { PlayScreen } from "./PlayScreen";

// Spec local-play "Báo kết quả": the result card, one live region, no repeated button, confetti.

const ui = tictactoeEntry.open(
  (_definition, gameUi) => gameUi as unknown as GameUI<TicTacToeState, TicTacToeMove>,
);

const status = () => screen.getByRole("status");
const button = (name: string) => screen.getByRole("button", { name });
const cell = (row: number, col: number) =>
  screen.getByRole("button", { name: new RegExp(`^Hàng ${row}, cột ${col},`) });
const confetti = () => document.querySelector("[data-confetti]");

async function play(...cells: readonly (readonly [number, number])[]) {
  for (const [row, col] of cells) await userEvent.click(cell(row, col));
}

const X_WINS_TOP_ROW = [
  [1, 1],
  [2, 1],
  [1, 2],
  [2, 2],
  [1, 3],
] as const;

async function renderLocal() {
  const transport = createLocalTransport({
    definition: tictactoe,
    store: createMemoryStore(),
    rng: createRng(1),
  });
  renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={ui} />);
  await screen.findByRole("group", { name: "Bàn cờ" });
}

/** A game against the AI (the player is X), after `cells`, X first. */
function vsAi(cells: readonly number[]): ReadySnapshot<TicTacToeState, TicTacToeMove> {
  const state = cells.reduce(
    (current, played) => tictactoe.applyMove(current, { cell: played }),
    tictactoe.setup(),
  );
  const result = tictactoe.result(state);
  const currentPlayer = tictactoe.currentPlayer(state);
  return {
    status: "ready",
    state,
    legalMoves: result === null ? tictactoe.legalMoves(state) : [],
    currentPlayer,
    result,
    lastEntry: cells.length === 0 ? null : { move: { cell: cells.at(-1) ?? 0 } },
    lastMover: cells.length === 0 ? null : (cells.length - 1) % 2,
    moveCount: cells.length,
    canUndo: cells.length > 0,
    canRedo: false,
    canMove: result === null && currentPlayer === 0,
    viewer: 0,
    seats: [{ kind: "human" }, { kind: "ai", level: "medium" }],
    waitingFor: result === null && currentPlayer === 1 ? "ai" : null,
    inProgress: result === null && cells.length > 0,
    supportsUndo: true,
    canStartNewGame: true,
    resign: null,
    turn: null,
    cooperative: false,
    ending: null,
    freePlay: false,
    gameTime: null,
    connection: null,
    options: {},
  };
}

// X takes the top row while O (the AI) plays the middle row.
const BEFORE_X_WINS = [0, 3, 1, 4];
const X_WINS = [...BEFORE_X_WINS, 2];
// O (the AI) takes the middle row.
const O_WINS = [0, 3, 1, 4, 8, 5];

describe("Báo kết quả", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the result card with one 'New game', the menu once, and confetti (Có người thắng)", async () => {
    await renderLocal();

    await play(...X_WINS_TOP_ROW);

    expect(status()).toHaveTextContent("X thắng!");
    const card = status().parentElement;
    if (card === null) throw new Error("no card");
    expect(within(card).getByText("Kết thúc")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Ván mới" })).toHaveLength(1);
    expect(within(card).getByRole("button", { name: "Ván mới" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Về menu" })).toHaveLength(1);
    expect(within(card).queryByRole("link")).not.toBeInTheDocument();
    for (const tile of within(screen.getByRole("group", { name: "Bàn cờ" })).getAllByRole(
      "button",
    )) {
      expect(tile).toHaveAttribute("aria-disabled", "true");
    }
    expect(confetti()).toBeInTheDocument();

    // The confetti never holds the button back; the focus follows "New game" to the buttons.
    await userEvent.click(within(card).getByRole("button", { name: "Ván mới" }));

    expect(status()).toHaveTextContent("Đến lượt X");
    expect(screen.queryByText("Kết thúc")).not.toBeInTheDocument();
    expect(button("Ván mới")).toHaveFocus();
    expect(confetti()).not.toBeInTheDocument();
  });

  it("removes the confetti once every piece has fallen", async () => {
    await renderLocal();
    await play(...X_WINS_TOP_ROW);
    const shower = confetti();
    if (shower === null) throw new Error("no confetti");

    for (const piece of shower.children) fireEvent.animationEnd(piece);

    expect(confetti()).not.toBeInTheDocument();
    expect(status()).toHaveTextContent("X thắng!");
  });

  it("removes the confetti after 2 s even if no animation ever ends", async () => {
    vi.useFakeTimers();
    try {
      const { transport, change } = changingTransport(vsAi(BEFORE_X_WINS));
      renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={ui} />);
      change(vsAi(X_WINS));
      expect(confetti()).toBeInTheDocument();

      await act(() => vi.advanceTimersByTimeAsync(2000));

      expect(confetti()).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("says draw, without celebrating (Hoà)", async () => {
    await renderLocal();

    // X O X / X O O / O X X
    await play([1, 1], [1, 2], [1, 3], [2, 2], [2, 1], [2, 3], [3, 2], [3, 1], [3, 3]);

    expect(status()).toHaveTextContent("Hoà!");
    expect(screen.getByText("Kết thúc")).toBeInTheDocument();
    expect(confetti()).not.toBeInTheDocument();
  });

  it("names both winners in the card (Nhiều người cùng thắng)", () => {
    const { transport } = changingTransport({
      ...vsAi([]),
      viewer: null,
      seats: [{ kind: "human" }, { kind: "human" }],
      result: { kind: "win", winners: [0, 1] },
      legalMoves: [],
      canMove: false,
    });
    renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={ui} />);

    expect(status()).toHaveTextContent("X và O thắng!");
    expect(screen.getByText("Kết thúc")).toBeInTheDocument();
  });

  it("tells the AI's win without celebrating (Máy thắng)", () => {
    const { transport, change } = changingTransport(vsAi(O_WINS.slice(0, -1)));
    renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={ui} />);

    change(vsAi(O_WINS));

    expect(status()).toHaveTextContent("Máy thắng!");
    expect(screen.getByText("Kết thúc")).toBeInTheDocument();
    expect(confetti()).not.toBeInTheDocument();
  });

  it("reads the result from the turn line's own region (Câu kết quả được đọc từ dòng lượt)", () => {
    const { transport, change } = changingTransport(vsAi(BEFORE_X_WINS));
    renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={ui} />);
    const before = status();

    change(vsAi(X_WINS));

    expect(status()).toBe(before);
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(before).toHaveTextContent("Bạn thắng!");
    expect(before).toHaveAttribute("aria-live", "polite");
  });

  it("turns the card back into the turn line on undo (Hoàn tác nước thắng trả lại dòng lượt)", async () => {
    await renderLocal();
    await play(...X_WINS_TOP_ROW);
    const line = status();

    await userEvent.click(button("Hoàn tác"));

    expect(status()).toBe(line);
    expect(line).toHaveTextContent("Đến lượt X");
    expect(screen.queryByText("Kết thúc")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Ván mới" })).toHaveLength(1);
    expect(line.parentElement).not.toContainElement(button("Ván mới"));
  });

  it("celebrates again when the winning move is played again after an undo", async () => {
    await renderLocal();
    await play(...X_WINS_TOP_ROW);
    await userEvent.click(button("Hoàn tác"));
    expect(confetti()).not.toBeInTheDocument();

    await play([1, 3]);

    expect(confetti()).toBeInTheDocument();
  });

  it("does not celebrate a game opened already won", () => {
    const { transport } = changingTransport(vsAi(X_WINS));
    renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={ui} />);

    expect(status()).toHaveTextContent("Bạn thắng!");
    expect(confetti()).not.toBeInTheDocument();
  });

  it("runs no effect with reduced motion (Giảm chuyển động)", () => {
    stubReducedMotion(true);
    const { transport, change } = changingTransport(vsAi(BEFORE_X_WINS));
    renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={ui} />);

    change(vsAi(X_WINS));

    expect(status()).toHaveTextContent("Bạn thắng!");
    expect(
      within(status().parentElement ?? document.body).getByRole("button", { name: "Ván mới" }),
    ).toBeInTheDocument();
    expect(confetti()).not.toBeInTheDocument();
    // The winning line is drawn whole at once.
    for (const stroke of document.querySelectorAll("[data-winning-line] path")) {
      expect(stroke).toHaveClass("motion-reduce:animate-none");
    }
  });

  it("offers 'Play again' online in the card only, once the game is over", () => {
    const { transport } = changingTransport({
      ...vsAi(X_WINS),
      seats: [{ kind: "human" }, { kind: "remote", name: "Minh" }],
      supportsUndo: false,
      connection: "online",
    });
    renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={ui} />);

    expect(screen.getAllByRole("button", { name: "Chơi lại" })).toHaveLength(1);
    expect(status().parentElement).toContainElement(button("Chơi lại"));
  });
});
