import { createRng } from "@board-games/engine";
import { tictactoe, type TicTacToeMove, type TicTacToeState } from "@board-games/games";
import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TicTacToeBoard } from "@/games/tictactoe/Board";
import { useTicTacToeMoveLabel } from "@/games/tictactoe/move-label";
import { useTicTacToePlayerLabel } from "@/games/tictactoe/player-label";
import { renderWithIntl } from "@/test/render-with-intl";
import { createLocalTransport } from "@/transport/local-transport";
import { createMemoryStore } from "@/transport/memory-store";
import type {
  AiPlayer,
  AiSetup,
  ReadySnapshot,
  SavedGameStore,
  Transport,
} from "@/transport/types";

import { PlayScreen } from "./PlayScreen";

const ui = {
  Board: TicTacToeBoard,
  usePlayerLabel: useTicTacToePlayerLabel,
  useMoveLabel: useTicTacToeMoveLabel,
};

/** Renders the play screen and waits until the saved game (if any) has been loaded. */
async function renderPlay(store: SavedGameStore = createMemoryStore()) {
  const transport = createLocalTransport({ definition: tictactoe, store, rng: createRng(1) });
  const view = renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={ui} />);
  await screen.findByRole("group", { name: "Bàn cờ" });
  return { transport, view };
}

type TicTacToeTransport = Transport<TicTacToeState, TicTacToeMove>;

/** A transport frozen on one snapshot, standing in for the AI (M2) or online (M4) transports. */
function fakeTransport(
  overrides: Partial<ReadySnapshot<TicTacToeState, TicTacToeMove>>,
): TicTacToeTransport {
  const state = tictactoe.setup();
  const snapshot: ReadySnapshot<TicTacToeState, TicTacToeMove> = {
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
    ...overrides,
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: () => () => undefined,
    submit: vi.fn(),
    requestUndo: vi.fn(),
    requestRedo: vi.fn(),
    requestNewGame: vi.fn(),
    dispose: vi.fn(),
  };
}

/** Wraps a transport to count the listeners still subscribed. */
function countListeners(transport: TicTacToeTransport) {
  let active = 0;
  const counted: TicTacToeTransport = {
    ...transport,
    subscribe: (listener) => {
      active += 1;
      const unsubscribe = transport.subscribe(listener);
      return () => {
        active -= 1;
        unsubscribe();
      };
    },
  };
  return { transport: counted, active: () => active };
}

const cell = (row: number, col: number) =>
  screen.getByRole("button", { name: new RegExp(`^Hàng ${row}, cột ${col},`) });
const status = () => screen.getByRole("status");
const button = (name: string) => screen.getByRole("button", { name });

/** Plays cells given as [row, col] pairs, X first. */
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

describe("PlayScreen", () => {
  it("shows a loading state until the transport is ready", async () => {
    const transport = createLocalTransport({
      definition: tictactoe,
      store: createMemoryStore(),
      rng: createRng(1),
    });
    renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={ui} />);

    expect(screen.getByRole("status")).toHaveTextContent("Đang tải…");
    expect(await screen.findByRole("heading", { name: "Tic-tac-toe" })).toBeInTheDocument();
  });

  it("says whose turn it is, and the turn passes after each move", async () => {
    await renderPlay();
    expect(status()).toHaveTextContent("Đến lượt X");

    await play([2, 2]);

    expect(status()).toHaveTextContent("Đến lượt O");
    expect(cell(2, 2)).toHaveAccessibleName("Hàng 2, cột 2, X");
  });

  it("ignores a press on a marked cell", async () => {
    await renderPlay();
    await play([2, 2]);

    await play([2, 2]);

    expect(status()).toHaveTextContent("Đến lượt O");
    expect(cell(2, 2)).toHaveAttribute("aria-disabled", "true");
  });

  it("announces the winner, locks the board and offers a new game and the menu", async () => {
    await renderPlay();

    await play(...X_WINS_TOP_ROW);

    expect(status()).toHaveTextContent("X thắng!");
    for (const button of within(screen.getByRole("group", { name: "Bàn cờ" })).getAllByRole(
      "button",
    )) {
      expect(button).toHaveAttribute("aria-disabled", "true");
    }
    expect(button("Ván mới")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Về menu" })).toHaveAttribute("href", "/");
  });

  it("announces a draw", async () => {
    await renderPlay();

    // X O X / X O O / O X X
    await play([1, 1], [1, 2], [1, 3], [2, 2], [2, 1], [2, 3], [3, 2], [3, 1], [3, 3]);

    expect(status()).toHaveTextContent("Hoà!");
  });

  it("disables undo and redo at the start of a game, keeping them focusable", async () => {
    const { transport } = await renderPlay();
    const events: unknown[] = [];
    transport.subscribe((event) => events.push(event));

    for (const name of ["Hoàn tác", "Làm lại"]) {
      expect(button(name)).toHaveAttribute("aria-disabled", "true");
      expect(button(name)).toBeEnabled();
      await userEvent.click(button(name), { pointerEventsCheck: 0 });
    }

    expect(events).toEqual([]);
  });

  it("undoes the winning move, reopening the game for X, and redoes it", async () => {
    await renderPlay();
    await play(...X_WINS_TOP_ROW);

    await userEvent.click(button("Hoàn tác"));

    expect(cell(1, 3)).toHaveAccessibleName("Hàng 1, cột 3, trống");
    expect(status()).toHaveTextContent("Đến lượt X");
    expect(cell(1, 3)).toHaveAttribute("aria-disabled", "false");

    await userEvent.click(button("Làm lại"));
    expect(status()).toHaveTextContent("X thắng!");
  });

  it("asks before discarding a game in progress, and keeps it on cancel", async () => {
    await renderPlay();
    await play([1, 1], [2, 2], [3, 3]);

    await userEvent.click(button("Ván mới"));
    const dialog = screen.getByRole("dialog", { name: "Bắt đầu ván mới?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Chơi tiếp" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(cell(1, 1)).toHaveAccessibleName("Hàng 1, cột 1, X");
    expect(cell(3, 3)).toHaveAccessibleName("Hàng 3, cột 3, X");
  });

  it("starts a new game once confirmed", async () => {
    await renderPlay();
    await play([1, 1], [2, 2], [3, 3]);

    await userEvent.click(button("Ván mới"));
    const dialog = screen.getByRole("dialog", { name: "Bắt đầu ván mới?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Ván mới" }));

    expect(cell(1, 1)).toHaveAccessibleName("Hàng 1, cột 1, trống");
    expect(status()).toHaveTextContent("Đến lượt X");
  });

  it("starts a new game at once, without asking, after the game has ended", async () => {
    await renderPlay();
    await play(...X_WINS_TOP_ROW);

    await userEvent.click(button("Ván mới"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(cell(1, 1)).toHaveAccessibleName("Hàng 1, cột 1, trống");
  });

  it("plays a move with the keyboard and keeps focus on the board", async () => {
    await renderPlay();
    const user = userEvent.setup();

    cell(2, 1).focus();
    await user.tab();
    await user.keyboard("{Enter}");

    expect(cell(2, 2)).toHaveAccessibleName("Hàng 2, cột 2, X");
    expect(cell(2, 2)).toHaveFocus();
  });

  it("renders in the player's language", async () => {
    const transport = createLocalTransport({
      definition: tictactoe,
      store: createMemoryStore(),
      rng: createRng(1),
    });
    renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={ui} />, {
      locale: "ja",
    });

    expect(await screen.findByRole("heading", { name: "三目並べ" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Xの番です");
  });

  it("stops listening when unmounted", async () => {
    const local = createLocalTransport({
      definition: tictactoe,
      store: createMemoryStore(),
      rng: createRng(1),
    });
    const { transport, active } = countListeners(local);
    const view = renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={ui} />);
    await screen.findByRole("group", { name: "Bàn cờ" });
    expect(active()).toBeGreaterThan(0);

    view.unmount();

    expect(active()).toBe(0);
  });

  it("locks the board whenever the transport allows no move, even mid-game", async () => {
    // As when it is the AI's or the online opponent's turn: the game is on, but not for this device.
    const transport = fakeTransport({ canMove: false, viewer: 1 });
    renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={ui} />);

    await userEvent.click(cell(2, 2));

    for (const boardCell of within(screen.getByRole("group", { name: "Bàn cờ" })).getAllByRole(
      "button",
    )) {
      expect(boardCell).toHaveAttribute("aria-disabled", "true");
    }
    expect(transport.submit).not.toHaveBeenCalled();
  });

  it.each([
    ["vi", [0, 1], "X và O thắng!"],
    ["en", [0, 1], "X and O win!"],
    ["en", [0], "X wins!"],
    ["ja", [0, 1], "X、Oの勝ち！"],
  ] as const)("names the winners as a list of the language (%s, %j)", (locale, winners, text) => {
    const transport = fakeTransport({
      result: { kind: "win", winners },
      legalMoves: [],
      canMove: false,
    });
    renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={ui} />, { locale });

    expect(screen.getByRole("status")).toHaveTextContent(text);
  });
});

describe("PlayScreen with a saved game", () => {
  /** Lets the fire-and-forget store writes settle. */
  const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

  it("restores the board, the turn and undo after a reload in the middle of a game", async () => {
    const store = createMemoryStore();
    const first = await renderPlay(store);
    await play([1, 1], [2, 2], [3, 3], [1, 3]);
    await flush();
    first.view.unmount();

    await renderPlay(store);

    expect(cell(1, 1)).toHaveAccessibleName("Hàng 1, cột 1, X");
    expect(cell(2, 2)).toHaveAccessibleName("Hàng 2, cột 2, O");
    expect(cell(3, 3)).toHaveAccessibleName("Hàng 3, cột 3, X");
    expect(cell(1, 3)).toHaveAccessibleName("Hàng 1, cột 3, O");
    expect(status()).toHaveTextContent("Đến lượt X");
    expect(button("Hoàn tác")).toBeEnabled();
  });

  it("starts a new game after a finished one instead of restoring it", async () => {
    const store = createMemoryStore();
    const first = await renderPlay(store);
    await play(...X_WINS_TOP_ROW);
    await flush();
    first.view.unmount();

    await renderPlay(store);

    expect(cell(1, 1)).toHaveAccessibleName("Hàng 1, cột 1, trống");
    expect(status()).toHaveTextContent("Đến lượt X");
  });

  it("starts a new game, without any error, when the saved data is corrupt", async () => {
    const store = createMemoryStore({
      "tictactoe:local": {
        settings: { kind: "local" },
        record: { version: 1, gameId: "tictactoe", entries: 7 },
      },
    });

    await renderPlay(store);

    expect(cell(2, 2)).toHaveAccessibleName("Hàng 2, cột 2, trống");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

/** An AI that plays the given cells in order, then fails. */
function scriptedAi(...cells: readonly number[]): AiPlayer {
  const moves = [...cells];
  return {
    chooseMove: () => {
      const cell = moves.shift();
      return cell === undefined ? Promise.reject(new Error("no move")) : Promise.resolve({ cell });
    },
    dispose: () => undefined,
  };
}

/** Lets time pass on the fake clock, and React show what changed meanwhile. */
const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

/** Lets the AI answer: its move shows up 300 ms after its turn came. */
const aiAnswers = () => wait(300);

/** Renders a game against `ai`, set up like `setup`, once the transport is ready. */
async function renderVsAi(ai: AiPlayer, setup: Partial<AiSetup> = {}) {
  const start = { mode: "ai", level: "medium", first: "human", ...setup } as const;
  const transport = createLocalTransport({
    definition: tictactoe,
    store: createMemoryStore(),
    rng: createRng(1),
    mode: "ai",
    start,
    fallback: start,
    ai,
  });
  renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={ui} />);
  await wait(0);
  expect(screen.getByRole("group", { name: "Bàn cờ" })).toBeInTheDocument();
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
}

describe("PlayScreen against the AI", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("tells the player it is their turn, with their symbol", async () => {
    await renderVsAi(scriptedAi(4));

    expect(status()).toHaveTextContent("Đến lượt bạn (X)");
  });

  it("says the AI is thinking and locks the board until its move shows up", async () => {
    const user = await renderVsAi(scriptedAi(4));

    await user.click(cell(1, 1));

    expect(status()).toHaveTextContent("Máy đang nghĩ…");
    expect(cell(3, 3)).toHaveAttribute("aria-disabled", "true");
    await wait(299);
    expect(status()).toHaveTextContent("Máy đang nghĩ…");
    expect(cell(2, 2)).toHaveAccessibleName("Hàng 2, cột 2, trống");
    await wait(1);
    expect(cell(2, 2)).toHaveAccessibleName("Hàng 2, cột 2, O");
    expect(cell(3, 3)).toHaveAttribute("aria-disabled", "false");
  });

  it("tells where the AI played, and marks that cell as the last move", async () => {
    const user = await renderVsAi(scriptedAi(5));

    await user.click(cell(1, 1));
    await aiAnswers();

    expect(status()).toHaveTextContent(/^Máy đánh hàng 2, cột 3\. Đến lượt bạn \(X\)$/);
    expect(cell(2, 3)).toHaveAccessibleName("Hàng 2, cột 3, O");
    expect(cell(2, 3)).toHaveAccessibleDescription("Nước vừa đi");
    expect(cell(1, 1)).not.toHaveAccessibleDescription();
  });

  it("tells where the AI played its first move", async () => {
    await renderVsAi(scriptedAi(0), { first: "ai" });

    await aiAnswers();

    expect(status()).toHaveTextContent(/^Máy đánh hàng 1, cột 1\. Đến lượt bạn \(O\)$/);
  });

  it("announces the player's win", async () => {
    const user = await renderVsAi(scriptedAi(3, 4), { level: "easy" });

    await user.click(cell(1, 1));
    await aiAnswers();
    await user.click(cell(1, 2));
    await aiAnswers();
    await user.click(cell(1, 3));

    expect(status()).toHaveTextContent("Bạn thắng!");
  });

  it("announces the AI's win", async () => {
    // The AI moves first, so it plays X and the player answers as O.
    const user = await renderVsAi(scriptedAi(0, 1, 2), { first: "ai" });
    await aiAnswers();

    await user.click(cell(2, 1));
    await aiAnswers();
    await user.click(cell(2, 2));
    await aiAnswers();

    expect(status()).toHaveTextContent("Máy thắng!");
  });

  it("shows the mode and level next to the game's name", async () => {
    await renderVsAi(scriptedAi(4), { level: "hard" });

    expect(screen.getByText("Với máy · Khó")).toBeInTheDocument();
  });

  it("starts a new game at once when only the AI has moved", async () => {
    const user = await renderVsAi(scriptedAi(4, 0), { first: "ai" });
    await aiAnswers();
    expect(cell(2, 2)).toHaveAccessibleName("Hàng 2, cột 2, X");

    await user.click(button("Ván mới"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(cell(2, 2)).toHaveAccessibleName("Hàng 2, cột 2, trống");
  });

  it("still asks before a new game once the player has moved", async () => {
    const user = await renderVsAi(scriptedAi(4));
    await user.click(cell(1, 1));
    await aiAnswers();

    await user.click(button("Ván mới"));

    expect(screen.getByRole("dialog", { name: "Bắt đầu ván mới?" })).toBeInTheDocument();
  });

  it("stops asking about a new game once the AI has ended the game", async () => {
    // The AI plays X on the top row; the player answers on the middle row.
    const user = await renderVsAi(scriptedAi(0, 1, 2), { first: "ai" });
    await aiAnswers();
    await user.click(cell(2, 1));
    await aiAnswers();
    await user.click(cell(2, 2));

    // Asked while the AI is choosing the move that wins.
    await user.click(button("Ván mới"));
    expect(screen.getByRole("dialog", { name: "Bắt đầu ván mới?" })).toBeInTheDocument();
    await aiAnswers();

    expect(status()).toHaveTextContent("Máy thắng!");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Nor does the question come back once the next game is in progress.
    await user.click(button("Ván mới"));
    await aiAnswers();
    await user.click(cell(3, 3));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the same-device wording, without a mode label, when every seat is a person here", async () => {
    await renderPlay();

    expect(status()).toHaveTextContent("Đến lượt X");
    expect(screen.queryByText(/Cùng máy|Với máy/)).not.toBeInTheDocument();
  });

  it("tells where the computer played in English", () => {
    const state = tictactoe.applyMove(tictactoe.setup(), { cell: 5 });
    const transport = fakeTransport({
      state,
      legalMoves: tictactoe.legalMoves(state),
      seats: [{ kind: "ai", level: "hard" }, { kind: "human" }],
      viewer: 1,
      currentPlayer: 1,
      lastEntry: { move: { cell: 5 } },
      lastMover: 0,
      moveCount: 1,
    });
    renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={ui} />, {
      locale: "en",
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "The computer played row 2, column 3. Your move (O)",
    );
    expect(screen.getByRole("button", { name: "Row 2, column 3, X" })).toHaveAccessibleDescription(
      "Last move",
    );
  });

  it("speaks of you and the computer in English", () => {
    const transport = fakeTransport({
      seats: [{ kind: "ai", level: "hard" }, { kind: "human" }],
      viewer: 1,
      currentPlayer: 0,
      canMove: false,
      waitingFor: "ai",
    });
    renderWithIntl(<PlayScreen gameId="tictactoe" transport={transport} ui={ui} />, {
      locale: "en",
    });

    expect(screen.getByRole("status")).toHaveTextContent("The computer is thinking…");
    expect(screen.getByText("Vs computer · Hard")).toBeInTheDocument();
  });
});
