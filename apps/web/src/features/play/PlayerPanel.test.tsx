import { createRng } from "@board-games/engine";
import {
  ludo,
  LUDO_DEFAULT_OPTIONS,
  type LudoMove,
  type LudoOutcome,
  type LudoState,
  tictactoe,
  type TicTacToeMove,
  type TicTacToeState,
} from "@board-games/games";
import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ludoEntry } from "@/games/ludo";
import { tictactoeEntry } from "@/games/tictactoe";
import type { GameUI } from "@/games/types";
import { changingTransport } from "@/test/fake-transport";
import { renderWithIntl } from "@/test/render-with-intl";
import { createLocalTransport } from "@/transport/local-transport";
import { createMemoryStore } from "@/transport/memory-store";
import type { ReadySnapshot } from "@/transport/types";

import { PlayScreen } from "./PlayScreen";

// Spec local-play "Bảng người chơi", online-play "Bảng người chơi khi chơi online".

const tictactoeUi = tictactoeEntry.open(
  (_definition, ui) => ui as unknown as GameUI<TicTacToeState, TicTacToeMove>,
);
const ludoUi = ludoEntry.open(
  (_definition, ui) => ui as unknown as GameUI<LudoState, LudoMove, LudoOutcome>,
);

const panel = () => screen.getByRole("list", { name: "Người chơi" });
const rows = () => within(panel()).getAllByRole("listitem");
const row = (index: number) => {
  const found = rows()[index];
  if (found === undefined) throw new Error(`no row ${index}`);
  return found;
};

function tictactoeSnapshot(
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
    moveCount: 0,
    canUndo: false,
    canRedo: false,
    canMove: true,
    viewer: null,
    seats: [{ kind: "human" }, { kind: "human" }],
    waitingFor: null,
    inProgress: false,
    supportsUndo: true,
    canStartNewGame: true,
    resign: null,
    turn: null,
    cooperative: false,
    ending: null,
    connection: null,
    options: {},
    ...overrides,
  };
}

/** An online Tic-tac-toe game where Lan (here, X) plays Minh, X to move. */
const ONLINE = {
  viewer: 0,
  seats: [{ kind: "human" }, { kind: "remote", name: "Minh" }],
  supportsUndo: false,
  canStartNewGame: false,
  resign: null,
  turn: null,
  cooperative: false,
  ending: null,
  connection: "online",
} as const;

describe("Bảng người chơi", () => {
  it("lists both seats of a same-device game, X to move (Ván cùng máy)", async () => {
    const transport = createLocalTransport({
      definition: tictactoe,
      store: createMemoryStore(),
      rng: createRng(1),
    });
    renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={tictactoeUi} />);
    await screen.findByRole("group", { name: "Bàn cờ" });

    expect(rows()).toHaveLength(2);
    expect(row(0)).toHaveTextContent(/^X/);
    expect(row(0)).toHaveTextContent("Ở máy này");
    expect(within(row(0)).getByText("Đến lượt")).toBeInTheDocument();
    expect(row(1)).toHaveTextContent(/^O/);
    expect(within(row(1)).queryByText("Đến lượt")).not.toBeInTheDocument();

    // Lượt đổi trong bảng.
    await userEvent.click(screen.getByRole("button", { name: "Hàng 2, cột 2, trống" }));

    expect(within(row(1)).getByText("Đến lượt")).toBeInTheDocument();
    expect(within(row(0)).queryByText("Đến lượt")).not.toBeInTheDocument();
  });

  it("is not a live region: the turn line is the one status of the page (Bảng không đọc lại lượt)", () => {
    renderWithIntl(
      <PlayScreen
        gameId="tictactoe"
        transport={changingTransport(tictactoeSnapshot()).transport}
        ui={tictactoeUi}
      />,
    );

    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(panel()).not.toHaveAttribute("aria-live");
    expect(panel().querySelector("[aria-live], [role='status'], [role='alert']")).toBeNull();
  });

  it("names you, and each AI by its colour and level (Ván với nhiều máy)", () => {
    const state = ludo.setup({ playerCount: 4, options: LUDO_DEFAULT_OPTIONS });
    const medium = { kind: "ai", level: "medium" } as const;
    const { transport } = changingTransport<LudoState, LudoMove, LudoOutcome>({
      ...tictactoeSnapshot(),
      state,
      legalMoves: ludo.legalMoves(state),
      lastEntry: null,
      viewer: 0,
      seats: [{ kind: "human" }, medium, medium, medium],
      options: LUDO_DEFAULT_OPTIONS,
    });
    renderWithIntl(<PlayScreen gameId="ludo" transport={transport} ui={ludoUi} />);

    expect(rows()).toHaveLength(4);
    expect(row(0)).toHaveTextContent("Bạn · Đỏ");
    expect(row(0)).toHaveTextContent("Chưa ra quân");
    expect(within(row(0)).getByText("Đến lượt")).toBeInTheDocument();
    for (const [index, colour] of [
      [1, "Xanh dương"],
      [2, "Vàng"],
      [3, "Xanh lá"],
    ] as const) {
      expect(row(index)).toHaveTextContent(`Máy · ${colour}`);
      expect(row(index)).toHaveTextContent("Mức Vừa");
    }
    // The colour's piece and symbol, drawn by the game.
    expect(row(0).querySelector("svg circle")).toHaveClass("fill-piece-red");
  });

  it("marks the winner once the game is over, and no seat to move", () => {
    renderWithIntl(
      <PlayScreen
        gameId="tictactoe"
        transport={
          changingTransport(
            tictactoeSnapshot({
              result: { kind: "win", winners: [1] },
              legalMoves: [],
              canMove: false,
            }),
          ).transport
        }
        ui={tictactoeUi}
      />,
    );

    expect(within(panel()).queryByText("Đến lượt")).not.toBeInTheDocument();
    expect(within(row(1)).getByText("Thắng")).toBeInTheDocument();
    expect(within(row(0)).queryByText("Thắng")).not.toBeInTheDocument();
  });
});

describe("Bảng người chơi khi chơi online", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows you, connected, and the other player by name (Hai người trong phòng)", () => {
    renderWithIntl(
      <PlayScreen
        gameId="tictactoe"
        transport={changingTransport(tictactoeSnapshot(ONLINE)).transport}
        ui={tictactoeUi}
      />,
    );

    expect(row(0)).toHaveTextContent("Bạn · X");
    expect(within(row(0)).getByText("Đã kết nối")).toBeInTheDocument();
    expect(row(1)).toHaveTextContent("Minh · O");
    expect(row(1)).toHaveTextContent("Chơi từ xa");
  });

  it("says the connection is lost once lost for 1.5 s, each sentence once (Mất kết nối)", async () => {
    const { transport, change } = changingTransport(tictactoeSnapshot(ONLINE));
    renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={tictactoeUi} />);

    change({ connection: "reconnecting", canMove: false });
    await act(() => vi.advanceTimersByTimeAsync(1499));
    expect(within(row(0)).getByText("Đã kết nối")).toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(within(row(0)).getByText("Mất kết nối")).toBeInTheDocument();
    expect(screen.getAllByText("Mất kết nối")).toHaveLength(1);
    expect(screen.getAllByText("Đang kết nối lại…")).toHaveLength(1);

    change({ connection: "online", canMove: true });
    expect(within(row(0)).getByText("Đã kết nối")).toBeInTheDocument();
  });

  it("says the connection is lost at once when paused for inactivity", () => {
    renderWithIntl(
      <PlayScreen
        gameId="tictactoe"
        transport={
          changingTransport(tictactoeSnapshot({ ...ONLINE, connection: "idle", canMove: false }))
            .transport
        }
        ui={tictactoeUi}
      />,
    );

    expect(within(row(0)).getByText("Mất kết nối")).toBeInTheDocument();
  });

  it("names an AI seat of the room as the computer, without a level nobody chose", () => {
    renderWithIntl(
      <PlayScreen
        gameId="tictactoe"
        transport={
          changingTransport(
            tictactoeSnapshot({
              ...ONLINE,
              seats: [{ kind: "human" }, { kind: "ai", level: "medium" }],
            }),
          ).transport
        }
        ui={tictactoeUi}
      />,
    );

    expect(row(1)).toHaveTextContent("Máy · O");
    expect(row(1)).not.toHaveTextContent("Mức");
  });
});
