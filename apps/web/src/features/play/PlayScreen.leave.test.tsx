import { createRng } from "@board-games/engine";
import { tictactoe, type TicTacToeMove, type TicTacToeState } from "@board-games/games";
import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TicTacToeBoard } from "@/games/tictactoe/Board";
import { useTicTacToeMoveLabel } from "@/games/tictactoe/move-label";
import { useTicTacToePlayerLabel } from "@/games/tictactoe/player-label";
import { changingTransport } from "@/test/fake-transport";
import { renderWithIntl } from "@/test/render-with-intl";
import { createLocalTransport } from "@/transport/local-transport";
import { createMemoryStore } from "@/transport/memory-store";
import type { AiPlayer, ReadySnapshot, SeatView, TurnClock } from "@/transport/types";

import { PlayScreen } from "./PlayScreen";

// Resigning and a player gone too long, on the play screen (change `add-resign-and-abandon`).

type Snapshot = ReadySnapshot<TicTacToeState, TicTacToeMove>;

const COLOURS = ["Đỏ", "Xanh dương", "Vàng", "Xanh lá"];
/** Seats named by colour and moves told as rolls, on a Tic-tac-toe board. */
const ui = {
  Board: TicTacToeBoard,
  usePlayerLabel: () => (player: number) => COLOURS[player] ?? "?",
  useMoveLabel: () => () => "gieo được 3, mất lượt",
};

const MINUTE = 60_000;
const NOW = 50_000_000;
const ME = { kind: "human" } as const;
const MINH = { kind: "remote", name: "Minh" } as const;
const LAN = { kind: "remote", name: "Lan" } as const;
const standIn = (name: string): SeatView => ({ kind: "ai", level: "medium", standInFor: name });

/** An online game seen from the first seat, Minh in the second, the player to move by default. */
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
    moveCount: 2,
    canUndo: false,
    canRedo: false,
    canMove: true,
    viewer: 0,
    seats: [ME, MINH],
    waitingFor: null,
    inProgress: false,
    supportsUndo: false,
    canStartNewGame: false,
    connection: "online",
    options: {},
    resign: { outcome: "loss", available: true },
    turn: { player: 0, gameNumber: 1, moveIndex: 2, startedAt: NOW, claim: null, available: true },
    ...overrides,
  };
}

/** Minh to move for `elapsed` ms, claimable by the player here as `claim` says. */
function waitingForMinh(elapsed: number, claim: TurnClock["claim"] = "win"): Partial<Snapshot> {
  return {
    currentPlayer: 1,
    canMove: false,
    waitingFor: "opponent",
    turn: {
      player: 1,
      gameNumber: 1,
      moveIndex: 3,
      startedAt: NOW - elapsed,
      claim,
      available: true,
    },
  };
}

function render(snapshot: Snapshot) {
  const fake = changingTransport(snapshot);
  renderWithIntl(<PlayScreen gameId="tictactoe" transport={fake.transport} ui={ui} />);
  return fake;
}

const status = () => screen.getByRole("status");
/** The question open now; the closed ones are hidden. */
const dialog = () => screen.getByRole("dialog");
const title = () => screen.getByRole("heading", { level: 1 });

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Đầu hàng khi chơi online", () => {
  it("Hỏi trước khi đầu hàng: asks first, saying Minh wins; keep playing changes nothing", async () => {
    const { transport } = render(online());
    const resign = screen.getByRole("button", { name: "Đầu hàng" });

    await userEvent.click(resign);

    expect(dialog()).toBeInTheDocument();
    expect(within(dialog()).getByText("Đầu hàng ván này?")).toBeInTheDocument();
    expect(
      within(dialog()).getByText("Minh sẽ thắng ván này. Sau đó cả phòng có thể chơi lại."),
    ).toBeInTheDocument();

    await userEvent.click(within(dialog()).getByRole("button", { name: "Chơi tiếp" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(transport.resign).not.toHaveBeenCalled();
    expect(resign).toHaveFocus();
  });

  it("Đầu hàng Cờ vua: resigns, then tells who won and why, the focus on the title", async () => {
    const { transport, change } = render(online());
    await userEvent.click(screen.getByRole("button", { name: "Đầu hàng" }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Đầu hàng" }));

    expect(transport.resign).toHaveBeenCalledTimes(1);
    change({
      result: { kind: "win", winners: [1], reason: "resigned" },
      resign: null,
      turn: null,
      canMove: false,
      canStartNewGame: true,
    });

    expect(status()).toHaveTextContent("Minh thắng!");
    expect(screen.getByText("Bạn đã đầu hàng.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chơi lại" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Đầu hàng" })).not.toBeInTheDocument();
    expect(title()).toHaveFocus();
  });

  it("tells the opponent who resigned", () => {
    render(
      online({
        seats: [LAN, ME],
        viewer: 1,
        result: { kind: "win", winners: [1], reason: "resigned" },
        resign: null,
        turn: null,
        canStartNewGame: true,
      }),
    );

    expect(status()).toHaveTextContent("Bạn thắng!");
    expect(screen.getByText("Lan đã đầu hàng.")).toBeInTheDocument();
  });

  it("Đầu hàng Cờ cá ngựa: asks about the stand-in, then shows the seat played for the player", async () => {
    const { change } = render(
      online({ seats: [ME, MINH, LAN], resign: { outcome: "stand-in", available: true } }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Đầu hàng" }));

    expect(
      within(dialog()).getByText(
        "Máy sẽ chơi thay bạn tới hết ván. Bạn vẫn ở trong phòng để xem và chơi ván sau.",
      ),
    ).toBeInTheDocument();
    await userEvent.click(within(dialog()).getByRole("button", { name: "Đầu hàng" }));
    change({
      seats: [standIn("Lan"), MINH, LAN],
      resign: null,
      canMove: false,
      currentPlayer: 1,
      waitingFor: "opponent",
      turn: null,
    });

    const mine = within(screen.getByRole("list", { name: "Người chơi" })).getAllByRole(
      "listitem",
    )[0];
    expect(mine).toHaveTextContent("Bạn · Đỏ");
    expect(mine).toHaveTextContent("Máy chơi thay");
    expect(screen.queryByRole("button", { name: "Đầu hàng" })).not.toBeInTheDocument();
    expect(title()).toHaveFocus();
  });

  it("Đang kết nối lại: the button stays, unavailable, saying why", async () => {
    const { transport } = render(
      online({
        connection: "reconnecting",
        canMove: false,
        resign: { outcome: "loss", available: false },
      }),
    );
    const resign = screen.getByRole("button", { name: "Đầu hàng" });

    await userEvent.click(resign);

    expect(resign).toHaveAttribute("aria-disabled", "true");
    expect(resign).toHaveAccessibleDescription("Chờ kết nối lại với máy chủ");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(transport.resign).not.toHaveBeenCalled();
  });

  it("Không có nút khi ván đã kết thúc: no resign button once the game has a result", () => {
    render(
      online({
        result: { kind: "win", winners: [0] },
        resign: null,
        turn: null,
        canStartNewGame: true,
      }),
    );

    expect(screen.queryByRole("button", { name: "Đầu hàng" })).not.toBeInTheDocument();
  });
});

describe("Chờ người lâu chưa đi", () => {
  it("Chưa tới 1 phút: shows no wait and no claim", () => {
    render(online(waitingForMinh(40_000)));

    expect(screen.queryByText(/chưa đi/u)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Xử thắng" })).not.toBeInTheDocument();
    expect(status()).toHaveTextContent("Đang chờ Minh…");
  });

  it("Đang chờ: shows how long Minh has been gone, and when a claim becomes possible", async () => {
    render(online(waitingForMinh(2 * MINUTE + 13_000)));
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(screen.getByText("Minh chưa đi · 2:13")).toBeInTheDocument();
    expect(screen.getByText(/Sau 5 phút, bạn có thể xử thắng\./u)).toBeInTheDocument();
    expect(status()).toHaveTextContent("Đang chờ Minh…");
  });

  it("Đủ 5 phút: the claim button appears and the turn line says it once", async () => {
    render(online(waitingForMinh(4 * MINUTE + 58_000)));
    await act(() => vi.advanceTimersByTimeAsync(0));
    const before = status().textContent;
    expect(screen.queryByRole("button", { name: "Xử thắng" })).not.toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(3000));

    expect(screen.getByRole("button", { name: "Xử thắng" })).toBeInTheDocument();
    expect(status()).toHaveTextContent("Minh đã 5 phút chưa đi. Bạn có thể xử thắng.");
    expect(status().textContent).not.toBe(before);
    const said = status().textContent;
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(status().textContent).toBe(said);
  });

  it("Xử thắng: asks first, claims, and tells the result and why", async () => {
    const { transport, change } = render(online(waitingForMinh(5 * MINUTE + 4000)));
    await act(() => vi.advanceTimersByTimeAsync(0));

    await userEvent.click(screen.getByRole("button", { name: "Xử thắng" }));
    expect(within(dialog()).getByText("Xử Minh thua vì bỏ ván?")).toBeInTheDocument();
    await userEvent.click(within(dialog()).getByRole("button", { name: "Xử thắng" }));
    expect(transport.claimAbandoned).toHaveBeenCalledTimes(1);
    change({
      result: { kind: "win", winners: [0], reason: "abandoned" },
      resign: null,
      turn: null,
      waitingFor: null,
      canStartNewGame: true,
    });

    expect(status()).toHaveTextContent("Bạn thắng!");
    expect(screen.getByText("Minh bỏ ván: quá 5 phút không đi.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chơi lại" })).toBeInTheDocument();
  });

  it("tells the player who was gone that they left the game", () => {
    render(
      online({
        result: { kind: "win", winners: [1], reason: "abandoned" },
        resign: null,
        turn: null,
        canStartNewGame: true,
      }),
    );

    expect(status()).toHaveTextContent("Minh thắng!");
    expect(screen.getByText("Bạn bỏ ván: quá 5 phút không đi.")).toBeInTheDocument();
  });

  it("Người vắng đi trong lúc hỏi: the question closes when Minh moves, the focus on the title", async () => {
    const { transport, change } = render(online(waitingForMinh(6 * MINUTE)));
    await act(() => vi.advanceTimersByTimeAsync(0));
    await userEvent.click(screen.getByRole("button", { name: "Xử thắng" }));
    expect(dialog()).toBeInTheDocument();

    change({
      currentPlayer: 0,
      canMove: true,
      waitingFor: null,
      moveCount: 3,
      turn: {
        player: 0,
        gameNumber: 1,
        moveIndex: 4,
        startedAt: NOW + 1000,
        claim: null,
        available: true,
      },
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(transport.claimAbandoned).not.toHaveBeenCalled();
    expect(title()).toHaveFocus();
  });

  it("Server chưa cho xử: says it cannot claim yet, with the server's time, the button gone", async () => {
    const { change, emit } = render(online(waitingForMinh(5 * MINUTE + 2000)));
    await act(() => vi.advanceTimersByTimeAsync(0));
    await userEvent.click(screen.getByRole("button", { name: "Xử thắng" }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Xử thắng" }));

    // The room again, the server's time 4:50, then the refusal.
    change(waitingForMinh(4 * MINUTE + 50_000));
    emit({ type: "claim-refused" });
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Chưa thể xử: lượt của Minh chưa đủ 5 phút.",
    );
    expect(screen.queryByRole("button", { name: "Xử thắng" })).not.toBeInTheDocument();
    expect(screen.getByText("Minh chưa đi · 4:50")).toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(11_000));
    expect(screen.getByRole("button", { name: "Xử thắng" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("Cho máy chơi thay: offers the AI for the seat in a Cờ cá ngựa room for three", async () => {
    render(online({ seats: [ME, MINH, LAN], ...waitingForMinh(6 * MINUTE, "stand-in") }));
    await act(() => vi.advanceTimersByTimeAsync(0));

    await userEvent.click(screen.getByRole("button", { name: "Cho máy chơi thay" }));

    expect(within(dialog()).getByText("Cho máy chơi thay Minh?")).toBeInTheDocument();
    expect(status()).toHaveTextContent("Minh đã 5 phút chưa đi. Bạn có thể cho máy chơi thay.");
  });

  it("Giờ của thiết bị sai: counts from the turn's start the transport worked out", async () => {
    render(online(waitingForMinh(MINUTE)));
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(screen.queryByRole("button", { name: "Xử thắng" })).not.toBeInTheDocument();
  });

  it("keeps the claim unavailable while reconnecting", async () => {
    const { transport } = render(
      online({
        ...waitingForMinh(6 * MINUTE),
        connection: "reconnecting",
        turn: {
          player: 1,
          gameNumber: 1,
          moveIndex: 3,
          startedAt: NOW - 6 * MINUTE,
          claim: "win",
          available: false,
        },
      }),
    );
    await act(() => vi.advanceTimersByTimeAsync(0));
    const claim = screen.getByRole("button", { name: "Xử thắng" });

    await userEvent.click(claim);

    expect(claim).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(transport.claimAbandoned).not.toHaveBeenCalled();
  });
});

describe("the same turn reckoned again", () => {
  /** The same turn of Minh, its start a few ms off, as after a reconnection. */
  const drifted = (elapsed: number) => waitingForMinh(elapsed + 7);

  it("keeps the turn line, the claim button and its focus", async () => {
    const { change } = render(online(waitingForMinh(6 * MINUTE)));
    await act(() => vi.advanceTimersByTimeAsync(0));
    const claim = screen.getByRole("button", { name: "Xử thắng" });
    claim.focus();
    const said = status().textContent;

    change(drifted(6 * MINUTE));
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(screen.getByRole("button", { name: "Xử thắng" })).toBe(claim);
    expect(claim).toHaveFocus();
    expect(status().textContent).toBe(said);
  });

  it("keeps the question about the turn open", async () => {
    const { change } = render(online(waitingForMinh(6 * MINUTE)));
    await act(() => vi.advanceTimersByTimeAsync(0));
    await userEvent.click(screen.getByRole("button", { name: "Xử thắng" }));

    change(drifted(6 * MINUTE));
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(dialog()).toBeInTheDocument();
    expect(title()).not.toHaveFocus();
  });
});

describe("asking while the connection is lost", () => {
  it("keeps the resign question open, its answer unavailable with the reason", async () => {
    const { transport, change } = render(online());
    await userEvent.click(screen.getByRole("button", { name: "Đầu hàng" }));

    change({ connection: "reconnecting", resign: { outcome: "loss", available: false } });
    const confirm = within(dialog()).getByRole("button", { name: "Đầu hàng" });
    await userEvent.click(confirm);

    expect(confirm).toHaveAttribute("aria-disabled", "true");
    expect(confirm).toHaveAccessibleDescription("Chờ kết nối lại với máy chủ");
    expect(transport.resign).not.toHaveBeenCalled();
  });

  it("keeps the claim question open, its answer unavailable, pointing to Continue when paused", async () => {
    const { transport, change } = render(online(waitingForMinh(6 * MINUTE)));
    await act(() => vi.advanceTimersByTimeAsync(0));
    await userEvent.click(screen.getByRole("button", { name: "Xử thắng" }));

    change({
      connection: "idle",
      turn: {
        player: 1,
        gameNumber: 1,
        moveIndex: 3,
        startedAt: NOW - 6 * MINUTE,
        claim: "win",
        available: false,
      },
    });
    const confirm = within(dialog()).getByRole("button", { name: "Xử thắng" });
    await userEvent.click(confirm);

    expect(confirm).toHaveAttribute("aria-disabled", "true");
    expect(confirm).toHaveAccessibleDescription("Đã tạm ngắt: bấm “Tiếp tục” để kết nối lại");
    expect(transport.claimAbandoned).not.toHaveBeenCalled();
  });
});

describe("Nhắc người đến lượt", () => {
  it("Còn dưới một phút: tells the player to move how long is left, the turn line once", async () => {
    render(
      online({
        turn: {
          player: 0,
          gameNumber: 1,
          moveIndex: 2,
          startedAt: NOW - (4 * MINUTE + 18_000),
          claim: null,
          available: true,
        },
      }),
    );
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(
      screen.getByText("Còn 0:42. Quá 5 phút, người khác có thể xử thắng."),
    ).toBeInTheDocument();
    expect(status()).toHaveTextContent(
      "Đến lượt bạn (Đỏ) Chưa tới 1 phút nữa, người khác có thể xử thắng.",
    );
  });

  it("Đi xong thì hết nhắc: the reminder goes once the player has moved", async () => {
    const { change } = render(
      online({
        turn: {
          player: 0,
          gameNumber: 1,
          moveIndex: 2,
          startedAt: NOW - 4 * MINUTE - 1000,
          claim: null,
          available: true,
        },
      }),
    );
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByText(/^Còn 0:5\d\./u)).toBeInTheDocument();

    change(waitingForMinh(0));
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(screen.queryByText(/^Còn /u)).not.toBeInTheDocument();
  });
});

describe("Ghế máy chơi thay trên màn hình", () => {
  it("Báo nước của máy chơi thay: tells the move as the AI's for Minh", () => {
    render(
      online({
        seats: [ME, standIn("Minh"), LAN],
        lastMover: 1,
        lastEntry: { move: { cell: 4 } },
        moveCount: 3,
      }),
    );

    expect(status()).toHaveTextContent(
      /^Máy \(thay Minh\) gieo được 3, mất lượt\. Đến lượt bạn \(Đỏ\)$/u,
    );
    const seat = within(screen.getByRole("list", { name: "Người chơi" })).getAllByRole(
      "listitem",
    )[1];
    expect(seat).toHaveTextContent("Minh · Xanh dương");
    expect(seat).toHaveTextContent("Máy chơi thay");
  });

  it("Máy chơi thay mình: says the AI is playing for the player", () => {
    render(
      online({
        seats: [standIn("Lan"), MINH],
        canMove: false,
        waitingFor: "ai",
        resign: null,
        turn: null,
      }),
    );

    expect(status()).toHaveTextContent("Máy đang chơi thay bạn.");
  });

  it("Máy chơi thay thắng: says the AI won for Lan, without celebrating on her screen", () => {
    const { change } = render(
      online({
        seats: [standIn("Lan"), MINH],
        canMove: false,
        waitingFor: "ai",
        resign: null,
        turn: null,
      }),
    );

    change({ result: { kind: "win", winners: [0] }, canStartNewGame: true, waitingFor: null });

    expect(status()).toHaveTextContent("Máy (thay Lan) thắng!");
    expect(screen.getByText("Kết thúc")).toBeInTheDocument();
    expect(document.querySelector("[data-confetti]")).toBeNull();
  });

  it("names every winner when the AI won for Lan together with an AI seat", () => {
    render(
      online({
        seats: [MINH, standIn("Lan"), { kind: "ai", level: "medium" }],
        result: { kind: "win", winners: [1, 2], reason: "abandoned" },
        resign: null,
        turn: null,
        canStartNewGame: true,
      }),
    );

    expect(status()).toHaveTextContent("Máy (thay Lan) và Máy (Vàng) thắng!");
  });

  it("says the AI won for Lan on the other players' screens too", () => {
    render(
      online({
        seats: [MINH, standIn("Lan")],
        result: { kind: "win", winners: [1] },
        resign: null,
        turn: null,
        canStartNewGame: true,
      }),
    );

    expect(status()).toHaveTextContent("Máy (thay Lan) thắng!");
  });
});

describe("Đầu hàng khi đấu với máy", () => {
  const tictactoeUi = {
    Board: TicTacToeBoard,
    usePlayerLabel: useTicTacToePlayerLabel,
    useMoveLabel: useTicTacToeMoveLabel,
  };

  /** The AI plays the first empty cell. */
  const firstCellAi: AiPlayer = {
    chooseMove: (request) =>
      Promise.resolve(tictactoe.legalMoves(request.state as TicTacToeState)[0]),
    dispose: () => undefined,
  };

  async function renderVsAi(ai: AiPlayer = firstCellAi) {
    const transport = createLocalTransport({
      definition: tictactoe,
      store: createMemoryStore(),
      rng: createRng(1),
      mode: "ai",
      fallback: { mode: "ai", level: "medium", first: "human" },
      ai,
    });
    renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={tictactoeUi} />);
    await screen.findByRole("group", { name: "Bàn cờ" });
    return transport;
  }

  const cell = (row: number, col: number) =>
    screen.getByRole("button", {
      name: new RegExp(`^Hàng ${String(row)}, cột ${String(col)},`, "u"),
    });

  it("Huỷ đầu hàng: asks that the computer will win; keep playing changes nothing", async () => {
    await renderVsAi();
    await userEvent.click(cell(2, 2));
    await act(() => vi.advanceTimersByTimeAsync(500));

    await userEvent.click(screen.getByRole("button", { name: "Đầu hàng" }));
    expect(within(dialog()).getByText("Máy sẽ thắng ván này.")).toBeInTheDocument();
    await userEvent.click(within(dialog()).getByRole("button", { name: "Chơi tiếp" }));

    expect(status()).toHaveTextContent(/Đến lượt bạn \(X\)$/u);
  });

  it("Đầu hàng giữa ván: the computer wins, and only a new game is left", async () => {
    await renderVsAi();
    await userEvent.click(cell(2, 2));
    await act(() => vi.advanceTimersByTimeAsync(500));
    await userEvent.click(cell(3, 3));
    await act(() => vi.advanceTimersByTimeAsync(500));

    await userEvent.click(screen.getByRole("button", { name: "Đầu hàng" }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Đầu hàng" }));

    expect(status()).toHaveTextContent("Máy thắng!");
    expect(screen.getByText("Bạn đã đầu hàng.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ván mới" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hoàn tác" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("button", { name: "Làm lại" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.queryByRole("button", { name: "Đầu hàng" })).not.toBeInTheDocument();
  });

  it("Đầu hàng khi máy đang nghĩ: the move the computer was choosing never shows", async () => {
    let answer: ((move: unknown) => void) | undefined;
    await renderVsAi({
      chooseMove: () =>
        new Promise((resolve) => {
          answer = resolve;
        }),
      dispose: () => undefined,
    });
    await userEvent.click(cell(2, 2));

    await userEvent.click(screen.getByRole("button", { name: "Đầu hàng" }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Đầu hàng" }));
    answer?.({ cell: 0 });
    await act(() => vi.advanceTimersByTimeAsync(1000));

    expect(status()).toHaveTextContent("Máy thắng!");
    expect(cell(1, 1)).toHaveAccessibleName(/trống$/u);
  });

  it("Đầu hàng với ba máy: the computer wins, whichever seats it played", () => {
    render(
      online({
        connection: null,
        seats: [
          { kind: "human" },
          { kind: "ai", level: "medium" },
          { kind: "ai", level: "medium" },
          { kind: "ai", level: "medium" },
        ],
        result: { kind: "win", winners: [1, 2, 3], reason: "resigned" },
        resign: null,
        turn: null,
        supportsUndo: true,
        canStartNewGame: true,
      }),
    );

    expect(status()).toHaveTextContent("Máy thắng!");
    expect(screen.getByText("Bạn đã đầu hàng.")).toBeInTheDocument();
  });
});

describe("Không đầu hàng khi chơi cùng máy", () => {
  it("Ván cùng máy: has no resign button, and still a new game", async () => {
    const transport = createLocalTransport({
      definition: tictactoe,
      store: createMemoryStore(),
      rng: createRng(1),
    });
    renderWithIntl(
      <PlayScreen
        gameId="tictactoe"
        transport={transport}
        ui={{
          Board: TicTacToeBoard,
          usePlayerLabel: useTicTacToePlayerLabel,
          useMoveLabel: useTicTacToeMoveLabel,
        }}
      />,
    );
    await screen.findByRole("group", { name: "Bàn cờ" });

    expect(screen.queryByRole("button", { name: "Đầu hàng" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ván mới" })).toBeInTheDocument();
  });
});
