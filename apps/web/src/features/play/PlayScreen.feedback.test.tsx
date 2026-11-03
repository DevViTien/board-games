import { createRng } from "@board-games/engine";
import {
  caro,
  type CaroMove,
  type CaroState,
  ludo,
  LUDO_DEFAULT_OPTIONS,
  type LudoMove,
  type LudoOutcome,
  type LudoState,
  tictactoe,
  type TicTacToeMove,
  type TicTacToeState,
} from "@board-games/games";
import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { caroEntry } from "@/games/caro";
import { ludoEntry } from "@/games/ludo";
import { tictactoeEntry } from "@/games/tictactoe";
import type { GameUI } from "@/games/types";
import { changingTransport } from "@/test/fake-transport";
import { renderWithIntl } from "@/test/render-with-intl";
import { createLocalTransport } from "@/transport/local-transport";
import { createMemoryStore } from "@/transport/memory-store";
import type { AiPlayer, ReadySnapshot } from "@/transport/types";

import { PlayScreen } from "./PlayScreen";

// Spec play-vs-ai "Tín hiệu máy đang nghĩ", local-play "Lý do nút không bấm được".

const tictactoeUi = tictactoeEntry.open(
  (_definition, ui) => ui as unknown as GameUI<TicTacToeState, TicTacToeMove>,
);
const caroUi = caroEntry.open((_definition, ui) => ui as unknown as GameUI<CaroState, CaroMove>);
const ludoUi = ludoEntry.open(
  (_definition, ui) => ui as unknown as GameUI<LudoState, LudoMove, LudoOutcome>,
);

const button = (name: string) => screen.getByRole("button", { name });
const cell = (row: number, col: number) =>
  screen.getByRole("button", { name: new RegExp(`^Hàng ${row}, cột ${col},`) });
const aiRow = () =>
  within(screen.getByRole("list", { name: "Người chơi" }))
    .getAllByRole("listitem")
    .find((item) => item.textContent.includes("Máy ·"));

/** An AI that plays the given cells in order, then fails. */
function scriptedAi(...cells: readonly number[]): AiPlayer {
  const moves = [...cells];
  return {
    chooseMove: () => {
      const next = moves.shift();
      return next === undefined
        ? Promise.reject(new Error("no move"))
        : Promise.resolve({ cell: next });
    },
    dispose: () => undefined,
  };
}

const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

describe("Tín hiệu máy đang nghĩ", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks the AI's seat as thinking and the board as busy until the AI has moved", async () => {
    const start = { mode: "ai", level: "medium", first: "human" } as const;
    const transport = createLocalTransport({
      definition: caro,
      store: createMemoryStore(),
      rng: createRng(1),
      mode: "ai",
      start,
      fallback: start,
      ai: scriptedAi(113),
    });
    renderWithIntl(<PlayScreen gameId="caro" transport={transport} ui={caroUi} />);
    await wait(0);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const board = () => screen.getByRole("grid", { name: "Bàn cờ" }).closest("[aria-busy]");
    expect(board()).toHaveAttribute("aria-busy", "false");

    // Máy đang nghĩ.
    await user.click(cell(8, 8));

    expect(aiRow()).toHaveTextContent("Đang nghĩ…");
    expect(within(aiRow() ?? document.body).getByText("Đến lượt")).toBeInTheDocument();
    expect(board()).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Máy đang nghĩ…");

    // Máy đi xong.
    await wait(300);

    expect(cell(8, 9)).toHaveAccessibleName("Hàng 8, cột 9, O");
    expect(aiRow()).not.toHaveTextContent("Đang nghĩ…");
    expect(aiRow()).toHaveTextContent("Mức Vừa");
    expect(board()).toHaveAttribute("aria-busy", "false");
  });

  it("stops the dots with reduced motion", async () => {
    const start = { mode: "ai", level: "medium", first: "ai" } as const;
    const transport = createLocalTransport({
      definition: tictactoe,
      store: createMemoryStore(),
      rng: createRng(1),
      mode: "ai",
      start,
      fallback: start,
      ai: scriptedAi(0),
    });
    renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={tictactoeUi} />);
    await wait(0);

    const dots = aiRow()?.querySelectorAll(".animate-thinking-dots") ?? [];
    expect(dots).toHaveLength(3);
    for (const dot of dots) expect(dot).toHaveClass("motion-reduce:animate-none");
  });
});

describe("Lý do nút không bấm được", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("says there is no move to undo yet when undo gets the focus (Đầu ván)", async () => {
    const transport = createLocalTransport({
      definition: tictactoe,
      store: createMemoryStore(),
      rng: createRng(1),
    });
    renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={tictactoeUi} />);
    await screen.findByRole("group", { name: "Bàn cờ" });

    expect(button("Hoàn tác")).toHaveAccessibleDescription("Chưa có nước nào để hoàn tác");
    expect(button("Làm lại")).toHaveAccessibleDescription("Không có nước nào để làm lại");
    expect(screen.getByText("Chưa có nước nào để hoàn tác")).toHaveClass("sr-only");

    act(() => {
      button("Hoàn tác").focus();
    });

    expect(screen.getByText("Chưa có nước nào để hoàn tác")).not.toHaveClass("sr-only");
    expect(screen.getByText("Không có nước nào để làm lại")).toHaveClass("sr-only");
  });

  it("says no move of yours is left when the AI moved first (Máy đi trước)", async () => {
    vi.useFakeTimers();
    const start = { mode: "ai", level: "medium", first: "ai" } as const;
    const transport = createLocalTransport({
      definition: tictactoe,
      store: createMemoryStore(),
      rng: createRng(1),
      mode: "ai",
      start,
      fallback: start,
      ai: scriptedAi(0),
    });
    renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={tictactoeUi} />);
    await wait(0);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    // The AI's first move shows up after its delay.
    await wait(300);
    expect(cell(1, 1)).toHaveAccessibleName("Hàng 1, cột 1, X");

    await user.click(button("Hoàn tác"));

    expect(cell(1, 1)).toHaveAccessibleName("Hàng 1, cột 1, X");
    expect(screen.getByText("Chưa có nước nào của bạn để hoàn tác")).not.toHaveClass("sr-only");
    expect(button("Hoàn tác")).toHaveAccessibleDescription("Chưa có nước nào của bạn để hoàn tác");
  });

  it("says a roll cannot be undone right after one (Ngay sau lần gieo)", async () => {
    const transport = createLocalTransport({
      definition: ludo,
      store: createMemoryStore(),
      rng: createRng(1),
    });
    renderWithIntl(<PlayScreen gameId="ludo" transport={transport} ui={ludoUi} />);
    const roll = await screen.findByRole("button", { name: "Gieo xúc xắc" });
    await userEvent.click(roll);
    const ply = () => document.querySelector("[data-ply]")?.getAttribute("data-ply");
    expect(ply()).toBe("1");

    await userEvent.click(button("Hoàn tác"));

    expect(ply()).toBe("1");
    expect(screen.getByText("Không hoàn tác được lần gieo xúc xắc")).not.toHaveClass("sr-only");
  });

  it("keeps undo without a reason while it can be pressed", async () => {
    const transport = createLocalTransport({
      definition: tictactoe,
      store: createMemoryStore(),
      rng: createRng(1),
    });
    renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={tictactoeUi} />);
    await screen.findByRole("group", { name: "Bàn cờ" });

    await userEvent.click(cell(2, 2));

    expect(button("Hoàn tác")).not.toHaveAccessibleDescription();
  });
});

describe("Lý do không gieo được, from the play screen", () => {
  function ludoGame(
    seats: ReadySnapshot<LudoState, LudoMove, LudoOutcome>["seats"],
    waitingFor: "ai" | "opponent",
  ) {
    return ludoGameTransport(seats, waitingFor).transport;
  }

  function ludoGameTransport(
    seats: ReadySnapshot<LudoState, LudoMove, LudoOutcome>["seats"],
    waitingFor: "ai" | "opponent",
  ) {
    const state = { ...ludo.setup({ playerCount: 4, options: LUDO_DEFAULT_OPTIONS }), toMove: 2 };
    return changingTransport<LudoState, LudoMove, LudoOutcome>({
      status: "ready",
      state,
      legalMoves: ludo.legalMoves(state),
      currentPlayer: 2,
      result: null,
      lastEntry: null,
      lastMover: null,
      moveCount: 0,
      canUndo: false,
      canRedo: false,
      canMove: false,
      viewer: 0,
      seats,
      waitingFor,
      inProgress: false,
      supportsUndo: false,
      canStartNewGame: false,
      connection: "online",
      options: LUDO_DEFAULT_OPTIONS,
    });
  }

  it("names the remote player the game waits for", () => {
    const minh = { kind: "remote", name: "Minh" } as const;
    renderWithIntl(
      <PlayScreen
        gameId="ludo"
        transport={ludoGame([{ kind: "human" }, minh, minh, minh], "opponent")}
        ui={ludoUi}
      />,
    );

    expect(button("Gieo xúc xắc")).toHaveAccessibleDescription("Đang chờ Minh");
  });

  it("names the AI the game waits for by its colour, among several", () => {
    const ai = { kind: "ai", level: "medium" } as const;
    renderWithIntl(
      <PlayScreen
        gameId="ludo"
        transport={ludoGame([{ kind: "human" }, ai, ai, ai], "ai")}
        ui={ludoUi}
      />,
    );

    expect(button("Gieo xúc xắc")).toHaveAccessibleDescription("Đang chờ máy (Vàng)");
  });
  it("says the board waits for the connection while reconnecting", () => {
    const minh = { kind: "remote", name: "Minh" } as const;
    const { transport, change } = ludoGameTransport(
      [{ kind: "human" }, minh, minh, minh],
      "opponent",
    );
    renderWithIntl(<PlayScreen gameId="ludo" transport={transport} ui={ludoUi} />);

    change({ connection: "reconnecting", waitingFor: null });

    expect(button("Gieo xúc xắc")).toHaveAccessibleDescription("Chờ kết nối lại với máy chủ");
  });
});

describe("Hoàn tác trong Cờ cá ngựa với máy", () => {
  it("says a roll stands in the way once the AI rolled and moved after the player", () => {
    // Red (here) moved a horse out; the AI (Yellow) then rolled and moved: undo stops at that roll.
    const medium = { kind: "ai", level: "medium" } as const;
    const start = ludo.setup({ playerCount: 2, options: LUDO_DEFAULT_OPTIONS });
    const state = {
      ...start,
      horses: [
        [0, -1, -1, -1],
        [0, -1, -1, -1],
      ],
      toMove: 0,
    };
    const { transport } = changingTransport<LudoState, LudoMove, LudoOutcome>({
      status: "ready",
      state,
      legalMoves: ludo.legalMoves(state),
      currentPlayer: 0,
      result: null,
      lastEntry: { move: { type: "move", horse: 0 } },
      lastMover: 1,
      moveCount: 6,
      canUndo: false,
      canRedo: false,
      canMove: true,
      viewer: 0,
      seats: [{ kind: "human" }, medium],
      waitingFor: null,
      inProgress: true,
      supportsUndo: true,
      canStartNewGame: true,
      connection: null,
      options: LUDO_DEFAULT_OPTIONS,
    });
    renderWithIntl(<PlayScreen gameId="ludo" transport={transport} ui={ludoUi} />);

    expect(button("Hoàn tác")).toHaveAccessibleDescription("Không hoàn tác được lần gieo xúc xắc");
  });
});

describe("Ghi chú lý do sau một nước", () => {
  it("hides the note shown by a press once a move is played (a tap may never blur)", () => {
    const state = tictactoe.setup();
    const { transport, change } = changingTransport<TicTacToeState, TicTacToeMove>({
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
      connection: null,
      options: {},
    });
    renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={tictactoeUi} />);

    fireEvent.pointerDown(button("Làm lại"));
    expect(screen.getByText("Không có nước nào để làm lại")).not.toHaveClass("sr-only");

    const next = tictactoe.applyMove(state, { cell: 4 });
    change({ state: next, moveCount: 1, canUndo: true, lastEntry: { move: { cell: 4 } } });

    expect(screen.getByText("Không có nước nào để làm lại")).toHaveClass("sr-only");
  });
});

describe("Tiêu điểm sau Chơi lại", () => {
  it("moves the focus to the game's title once the new online game arrives", async () => {
    const state = [0, 3, 1, 4, 2].reduce(
      (current, cell) => tictactoe.applyMove(current, { cell }),
      tictactoe.setup(),
    );
    const { transport, change } = changingTransport<TicTacToeState, TicTacToeMove>({
      status: "ready",
      state,
      legalMoves: [],
      currentPlayer: 1,
      result: { kind: "win", winners: [0] },
      lastEntry: { move: { cell: 2 } },
      lastMover: 0,
      moveCount: 5,
      canUndo: false,
      canRedo: false,
      canMove: false,
      viewer: 0,
      seats: [{ kind: "human" }, { kind: "remote", name: "Minh" }],
      waitingFor: null,
      inProgress: false,
      supportsUndo: false,
      canStartNewGame: true,
      connection: "online",
      options: {},
    });
    renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={tictactoeUi} />);

    await userEvent.click(button("Chơi lại"));
    const fresh = tictactoe.setup();
    change({
      state: fresh,
      legalMoves: [],
      currentPlayer: 0,
      result: null,
      lastEntry: null,
      lastMover: null,
      moveCount: 0,
      canStartNewGame: false,
      viewer: 1,
      seats: [{ kind: "remote", name: "Minh" }, { kind: "human" }],
      waitingFor: "opponent",
    });

    expect(screen.getByRole("heading", { level: 1, name: "Tic-tac-toe" })).toHaveFocus();
  });
});

describe("Đọc lần gieo một lần", () => {
  it("does not say the turn again when a person here rolls and keeps the turn", () => {
    const start = ludo.setup({ playerCount: 2, options: LUDO_DEFAULT_OPTIONS });
    const rolled = ludo.applyMove(start, { type: "roll" }, 6);
    const base = {
      status: "ready",
      legalMoves: ludo.legalMoves(start),
      currentPlayer: 0,
      result: null,
      canUndo: false,
      canRedo: false,
      canMove: true,
      viewer: null,
      seats: [{ kind: "human" }, { kind: "human" }],
      waitingFor: null,
      inProgress: false,
      supportsUndo: true,
      canStartNewGame: true,
      connection: null,
      options: LUDO_DEFAULT_OPTIONS,
    } as const;
    const { transport, change } = changingTransport<LudoState, LudoMove, LudoOutcome>({
      ...base,
      state: start,
      lastEntry: null,
      lastMover: null,
      moveCount: 0,
    });
    renderWithIntl(<PlayScreen gameId="ludo" transport={transport} ui={ludoUi} />);
    const before = screen.getByRole("status").textContent;

    change({
      state: rolled,
      legalMoves: ludo.legalMoves(rolled),
      lastEntry: { move: { type: "roll" }, outcome: 6 },
      lastMover: 0,
      moveCount: 1,
      inProgress: true,
    });

    // Same words, no invisible mark: the live region does not change, the board's hint tells the roll.
    expect(screen.getByRole("status").textContent).toBe(before);
  });
});
