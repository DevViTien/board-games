import { tictactoe, type TicTacToeMove, type TicTacToeState } from "@board-games/games";
import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TicTacToeBoard } from "@/games/tictactoe/Board";
import { changingTransport } from "@/test/fake-transport";
import { renderWithIntl } from "@/test/render-with-intl";
import type { ReadySnapshot, SeatView } from "@/transport/types";

import { PlayScreen } from "./PlayScreen";

// A cooperative game on the play screen (change `add-jelly-crew-game`): the team wins, ends or
// stops a game together, and the words of resigning and claiming say so. Tic-tac-toe stands in
// for the game: only the snapshot's `cooperative` flag matters to the screen.

type Snapshot = ReadySnapshot<TicTacToeState, TicTacToeMove>;

const COLOURS = ["Lam", "Hồng", "Cam"];
const ui = {
  Board: TicTacToeBoard,
  usePlayerLabel: () => (player: number) => COLOURS[player] ?? "?",
  useMoveLabel: () => () => "đi sang trái",
  useResultDetail: () => () => "Hết 40 vòng, còn 3 ô khuôn trống.",
};

const MINUTE = 60_000;
const NOW = 50_000_000;
const ME = { kind: "human" } as const;
const MINH: SeatView = { kind: "remote", name: "Minh" };
const LAN: SeatView = { kind: "remote", name: "Lan" };

/** An online game of three, seen from the first seat, the player to move. */
function online(overrides: Partial<Snapshot> = {}): Snapshot {
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
    seats: [ME, MINH, LAN],
    waitingFor: null,
    inProgress: false,
    supportsUndo: false,
    canStartNewGame: false,
    connection: "online",
    options: {},
    resign: { outcome: "end", available: true },
    turn: { player: 0, gameNumber: 1, moveIndex: 4, startedAt: NOW, claim: null, available: true },
    cooperative: true,
    ending: null,
    ...overrides,
  };
}

/** The same game on one device: three people here, no resigning, undo. */
function local(overrides: Partial<Snapshot> = {}): Snapshot {
  return online({
    viewer: null,
    seats: [ME, ME, ME],
    connection: null,
    resign: null,
    turn: null,
    supportsUndo: true,
    canStartNewGame: true,
    ...overrides,
  });
}

const STOPPED = { result: { kind: "draw", reason: "resigned" }, resign: null, turn: null } as const;

function render(snapshot: Snapshot) {
  const fake = changingTransport(snapshot);
  renderWithIntl(<PlayScreen gameId="tictactoe" transport={fake.transport} ui={ui} />);
  return fake;
}

const status = () => screen.getByRole("status");
const dialog = () => screen.getByRole("dialog");

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Game cùng phe khi chơi online", () => {
  it("Hỏi trước khi bỏ cuộc: the button says give up, the question says the team stops", async () => {
    const { transport } = render(online());
    expect(screen.queryByRole("button", { name: "Đầu hàng" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Bỏ cuộc" }));

    expect(within(dialog()).getByText("Bỏ cuộc ván này?")).toBeInTheDocument();
    expect(
      within(dialog()).getByText(
        "Ván sẽ dừng cho cả đội, không ai thắng. Sau đó cả phòng có thể chơi lại.",
      ),
    ).toBeInTheDocument();
    expect(within(dialog()).queryByText(/thắng ván này/u)).not.toBeInTheDocument();
    expect(within(dialog()).getByRole("button", { name: "Chơi tiếp" })).toBeInTheDocument();

    await userEvent.click(within(dialog()).getByRole("button", { name: "Bỏ cuộc" }));
    expect(transport.resign).toHaveBeenCalledTimes(1);
  });

  it("Bỏ cuộc trong ván cùng phe: the one who gave up reads that they did", () => {
    render(online({ ...STOPPED, ending: { reason: "resigned", player: 0 } }));

    expect(status()).toHaveTextContent("Ván dừng");
    expect(screen.getByText("Bạn đã bỏ cuộc.")).toBeInTheDocument();
    expect(status()).not.toHaveTextContent(/thắng/u);
  });

  it("Bỏ cuộc trong ván cùng phe: the others read who gave up, and may play again", () => {
    render(
      online({ ...STOPPED, ending: { reason: "resigned", player: 2 }, canStartNewGame: true }),
    );

    expect(status()).toHaveTextContent("Ván dừng");
    expect(screen.getByText("Lan đã bỏ cuộc.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chơi lại" })).toBeInTheDocument();
    expect(document.querySelector("[data-confetti]")).toBeNull();
  });

  it("tells a player gone too long, not one who gave up", () => {
    render(
      online({
        ...STOPPED,
        result: { kind: "draw", reason: "abandoned" },
        ending: { reason: "abandoned", player: 1 },
      }),
    );

    expect(status()).toHaveTextContent("Ván dừng");
    expect(screen.getByText("Minh bỏ ván: quá 5 phút không đi.")).toBeInTheDocument();
  });

  it("Chờ quá 5 phút trong ván cùng phe: only ending the game is offered, and it asks first", async () => {
    render(
      online({
        currentPlayer: 1,
        canMove: false,
        waitingFor: "opponent",
        turn: {
          player: 1,
          gameNumber: 1,
          moveIndex: 4,
          startedAt: NOW - (5 * MINUTE + 10_000),
          claim: "end",
          available: true,
        },
      }),
    );
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(screen.queryByRole("button", { name: "Xử thắng" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Kết thúc ván" }));

    expect(
      within(dialog()).getByText(
        "Minh đã không đi 5 phút. Ván sẽ dừng cho cả đội, không ai thắng; sau đó cả phòng có thể chơi lại.",
      ),
    ).toBeInTheDocument();
  });

  it("Nhắc người đến lượt trong ván cùng phe: the reminder says the game would stop", async () => {
    render(
      online({
        turn: {
          player: 0,
          gameNumber: 1,
          moveIndex: 4,
          startedAt: NOW - (4 * MINUTE + 18_000),
          claim: null,
          available: true,
        },
      }),
    );
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(
      screen.getByText("Còn 0:42. Quá 5 phút, người khác có thể kết thúc ván cho cả đội."),
    ).toBeInTheDocument();
    expect(status()).toHaveTextContent(
      "Chưa tới 1 phút nữa, người khác có thể kết thúc ván cho cả đội.",
    );
  });

  it("Cả đội thắng khi chơi online: every screen says the team won, and celebrates", () => {
    const { change } = render(online());

    change({
      result: { kind: "win", winners: [0, 1, 2], reason: "filled" },
      resign: null,
      turn: null,
      canMove: false,
      canStartNewGame: true,
    });

    expect(status()).toHaveTextContent("Cả đội thắng!");
    expect(document.querySelector("[data-confetti]")).not.toBeNull();
    const panel = screen.getByRole("list", { name: "Người chơi" });
    expect(within(panel).queryByText("Thắng")).not.toBeInTheDocument();
  });
});

describe("Kết quả của game cùng phe", () => {
  it("Cả đội thắng khi chơi cùng máy: no seat named, a celebration", () => {
    const { change } = render(local());

    change({ result: { kind: "win", winners: [0, 1, 2], reason: "filled" }, canMove: false });

    expect(status()).toHaveTextContent("Cả đội thắng!");
    expect(status()).not.toHaveTextContent(/Lam|Hồng|Cam/u);
    expect(document.querySelector("[data-confetti]")).not.toBeNull();
  });

  it("Hết vòng khi chơi cùng máy: the game is over, with the game's line and a new game", () => {
    const { change } = render(local());

    change({ result: { kind: "draw", reason: "out-of-rounds" }, canMove: false });

    expect(status()).toHaveTextContent("Ván kết thúc");
    expect(screen.getByText("Hết 40 vòng, còn 3 ô khuôn trống.")).toBeInTheDocument();
    expect(document.querySelector("[data-confetti]")).toBeNull();
    expect(screen.getByRole("button", { name: "Ván mới" })).toBeInTheDocument();
  });
});
