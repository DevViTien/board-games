import { tictactoe, type TicTacToeMove, type TicTacToeState } from "@board-games/games";
import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { tictactoeEntry } from "@/games/tictactoe";
import type { BoardProps, GameUI } from "@/games/types";
import { changingTransport } from "@/test/fake-transport";
import { renderWithIntl } from "@/test/render-with-intl";
import type { ReadySnapshot } from "@/transport/types";

import { PlayScreen } from "./PlayScreen";
import { usePresentationHold } from "./presentation-hold";

// The play screen while a board holds what it shows (design of redesign-ludo-play §4): the turn
// line, the seats and the game's buttons wait; the connection is always the live one; nothing
// but the board's controls can be reached; a game replaced ends the hold.

const realUi = tictactoeEntry.open(
  (_definition, ui) => ui as unknown as GameUI<TicTacToeState, TicTacToeMove>,
);

/** A board with two controls of its own: hold and release the screen. */
function HoldingBoard({ layout }: BoardProps<TicTacToeState, TicTacToeMove>) {
  const presentation = usePresentationHold();
  return layout({
    board: <p>board</p>,
    controls: (
      <>
        <button type="button" onClick={presentation.hold}>
          Hold
        </button>
        <button type="button" onClick={presentation.release}>
          Release
        </button>
      </>
    ),
  });
}

const ui: GameUI<TicTacToeState, TicTacToeMove> = { ...realUi, Board: HoldingBoard };

function snapshot(
  overrides: Partial<ReadySnapshot<TicTacToeState, TicTacToeMove>> = {},
): ReadySnapshot<TicTacToeState, TicTacToeMove> {
  const state = tictactoe.setup();
  return {
    status: "ready",
    state,
    legalMoves: tictactoe.legalMoves(state),
    currentPlayer: 0,
    result: null,
    lastEntry: null,
    lastMover: null,
    moveCount: 4,
    canUndo: false,
    canRedo: false,
    canMove: true,
    viewer: 0,
    seats: [{ kind: "human" }, { kind: "remote", name: "Minh" }],
    waitingFor: null,
    inProgress: false,
    supportsUndo: false,
    canStartNewGame: false,
    resign: { outcome: "loss", available: true },
    turn: null,
    cooperative: false,
    ending: null,
    connection: "online",
    options: {},
    ...overrides,
  };
}

const status = () => screen.getByRole("status");
const press = (name: string) => {
  fireEvent.click(screen.getByRole("button", { name }));
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PlayScreen while a board holds it", () => {
  it("keeps the turn line as it was, until released", () => {
    const { transport, change } = changingTransport(snapshot());
    renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={ui} />);
    expect(status()).toHaveTextContent("Đến lượt bạn (X)");

    press("Hold");
    change({ moveCount: 5, currentPlayer: 1, canMove: false, waitingFor: "opponent" });
    expect(status()).toHaveTextContent("Đến lượt bạn (X)");

    press("Release");
    expect(status()).toHaveTextContent("Đang chờ Minh");
  });

  it("shows the connection as it is now, also while held", () => {
    const { transport, change } = changingTransport(snapshot());
    renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={ui} />);

    press("Hold");
    change({ connection: "reconnecting", canMove: false });
    // Told once it has been lost for a moment.
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText(/Đang kết nối lại/)).toBeInTheDocument();
    // The turn line still waits.
    expect(status()).toHaveTextContent("Đến lượt bạn (X)");
  });

  it("makes everything but the board's controls inert while held", () => {
    const { transport } = changingTransport(snapshot());
    renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={ui} />);
    const resign = screen.getByRole("button", { name: "Đầu hàng" });
    const rules = screen.getByRole("button", { name: "Luật chơi" });
    expect(resign.closest("[inert]")).toBeNull();

    press("Hold");

    expect(resign.closest("[inert]")).not.toBeNull();
    expect(rules.closest("[inert]")).not.toBeNull();
    expect(screen.getByText("board").closest("[inert]")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Release" }).closest("[inert]")).toBeNull();

    press("Release");
    expect(resign.closest("[inert]")).toBeNull();
  });

  it("releases at once when the game is replaced (fewer moves: a new game, undo)", () => {
    const { transport, change } = changingTransport(snapshot());
    renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={ui} />);

    press("Hold");
    change({ moveCount: 0, currentPlayer: 1, canMove: false, waitingFor: "opponent" });

    expect(status()).toHaveTextContent("Minh");
    expect(screen.getByRole("button", { name: "Đầu hàng" }).closest("[inert]")).toBeNull();
  });

  it("releases when the live snapshot is loading again", () => {
    const { transport, change } = changingTransport(snapshot());
    renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={ui} />);

    press("Hold");
    change({ status: "loading" } as never);

    expect(screen.queryByRole("button", { name: "Hold" })).toBeNull();
    change({
      ...snapshot({ moveCount: 6, currentPlayer: 1, canMove: false, waitingFor: "opponent" }),
    });
    expect(status()).toHaveTextContent("Đang chờ Minh");
  });
});
