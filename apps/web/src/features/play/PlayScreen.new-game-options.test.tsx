import { createRng, listOptionChoices } from "@board-games/engine";
import {
  caro,
  type CaroMove,
  type CaroState,
  tictactoe,
  type TicTacToeMove,
  type TicTacToeState,
} from "@board-games/games";
import { jellyCrew } from "@board-games/games/jelly-crew";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { readSetupChoice } from "@/features/setup/setup-preferences";
import { CaroBoard } from "@/games/caro/Board";
import { useCaroMoveLabel } from "@/games/caro/move-label";
import { useCaroPlayerLabel } from "@/games/caro/player-label";
import { useJellyCrewNextOptions } from "@/games/jelly-crew/next-map";
import { TicTacToeBoard } from "@/games/tictactoe/Board";
import { changingTransport } from "@/test/fake-transport";
import { renderWithIntl } from "@/test/render-with-intl";
import { createLocalTransport } from "@/transport/local-transport";
import { createMemoryStore } from "@/transport/memory-store";
import type { ReadySnapshot, Transport } from "@/transport/types";

import { PlayScreen } from "./PlayScreen";

// Changing the rule options of the next game from the result card, and the next game a game
// suggests (change `add-new-game-options`).

const caroUi = {
  Board: CaroBoard,
  usePlayerLabel: useCaroPlayerLabel,
  useMoveLabel: useCaroMoveLabel,
};
const CARO_CHOICES = listOptionChoices(caro);
const CREW_CHOICES = listOptionChoices(jellyCrew);

afterEach(() => {
  window.localStorage.clear();
});

/** A same-device Cờ caro game, 15×15 free style; `win` plays X's five on the top row. */
async function renderCaro({ win = true } = {}) {
  const transport: Transport<CaroState, CaroMove> = createLocalTransport({
    definition: caro,
    store: createMemoryStore(),
    rng: createRng(1),
    start: { mode: "local", options: { size: 15, rule: "free" } },
    fallback: { mode: "local" },
  });
  renderWithIntl(
    <PlayScreen
      gameId="caro"
      transport={transport}
      ui={caroUi}
      optionChoices={CARO_CHOICES}
      rules={<p />}
    />,
  );
  await screen.findByRole("grid", { name: "Bàn cờ" });
  if (win) for (const cell of [0, 30, 1, 31, 2, 32, 3, 33, 4]) transport.submit({ cell });
  return transport;
}

const changeButton = () => screen.queryByRole("button", { name: "Đổi bàn, luật" });

describe("Đổi tuỳ chọn khi ván kết thúc", () => {
  it("Đổi bàn Cờ caro cùng máy: starts a 19×19 game, remembered for the setup screen", async () => {
    const transport = await renderCaro();
    const user = userEvent.setup();
    expect(screen.getByRole("button", { name: "Ván mới" })).toBeVisible();

    await user.click(changeButton() ?? new HTMLElement());
    const dialog = screen.getByRole("dialog", { name: "Đổi bàn, luật" });
    // Hộp chọn sẵn tuỳ chọn đang chơi.
    expect(within(dialog).getByRole("radio", { name: "15×15" })).toBeChecked();
    expect(within(dialog).getByRole("radio", { name: "Tự do" })).toBeChecked();
    await user.click(within(dialog).getByRole("radio", { name: "19×19" }));
    await user.click(within(dialog).getByRole("button", { name: "Bắt đầu ván mới" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(transport.getSnapshot()).toMatchObject({
      status: "ready",
      moveCount: 0,
      result: null,
      options: { size: 19, rule: "free" },
    });
    expect(screen.getByText("19×19 · Tự do")).toBeVisible();
    // Màn bắt đầu ván nhớ bàn vừa đổi.
    expect(
      readSetupChoice(
        "caro",
        true,
        CARO_CHOICES,
        { size: 15, rule: "blocked-ends" },
        caro.meta.players,
      )?.options,
    ).toEqual({ size: 19, rule: "free" });
  });

  it("Huỷ đổi tuỳ chọn: the game just over stays, with its rules", async () => {
    const transport = await renderCaro();
    const user = userEvent.setup();

    await user.click(changeButton() ?? new HTMLElement());
    const dialog = screen.getByRole("dialog", { name: "Đổi bàn, luật" });
    await user.click(within(dialog).getByRole("radio", { name: "19×19" }));
    await user.click(within(dialog).getByRole("button", { name: "Huỷ" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(transport.getSnapshot()).toMatchObject({ moveCount: 9, options: { size: 15 } });
    expect(screen.getByText("15×15 · Tự do")).toBeVisible();
    expect(changeButton()).toHaveFocus();
  });

  it("Không đổi được giữa ván: no button while the game is on", async () => {
    await renderCaro({ win: false });

    expect(changeButton()).not.toBeInTheDocument();
  });

  it("Game không gợi ý: Cờ caro offers only a new game and the change", async () => {
    await renderCaro();

    expect(screen.queryByRole("button", { name: /^Bản đồ tiếp/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ván mới" })).toBeVisible();
    expect(changeButton()).toBeVisible();
  });
});

type TicTacToeSnapshot = ReadySnapshot<TicTacToeState, TicTacToeMove>;

/** A game over, as the fake transport shows it: a board stands in, only the options matter. */
function over(overrides: Partial<TicTacToeSnapshot> = {}): TicTacToeSnapshot {
  const state = tictactoe.setup();
  return {
    status: "ready",
    state,
    legalMoves: [],
    currentPlayer: 0,
    result: { kind: "win", winners: [0, 1], reason: "filled" },
    lastEntry: null,
    lastMover: null,
    moveCount: 25,
    canUndo: true,
    canRedo: false,
    canMove: false,
    viewer: null,
    seats: [{ kind: "human" }, { kind: "human" }],
    waitingFor: null,
    inProgress: false,
    supportsUndo: true,
    canStartNewGame: true,
    connection: null,
    options: { map: "kitchen" },
    resign: null,
    turn: null,
    cooperative: true,
    ending: null,
    freePlay: true,
    gameTime: null,
    ...overrides,
  };
}

const plainUi = {
  Board: TicTacToeBoard,
  usePlayerLabel: () => (player: number) => ["Lam", "Hồng"][player] ?? "?",
  useMoveLabel: () => () => "đi sang trái",
};
const crewUi = { ...plainUi, useNextOptions: useJellyCrewNextOptions };

function renderCrew(snapshot: TicTacToeSnapshot) {
  const fake = changingTransport(snapshot);
  renderWithIntl(
    <PlayScreen
      gameId="jelly-crew"
      transport={fake.transport}
      ui={crewUi}
      optionChoices={CREW_CHOICES}
      rules={<p />}
    />,
  );
  return fake;
}

describe("Ván tiếp theo do game gợi ý", () => {
  it("Sang bản đồ tiếp sau khi thắng: the suggestion first, and a click starts it", async () => {
    const { transport } = renderCrew(over());
    const user = userEvent.setup();

    const card = screen.getByText("Cả đội thắng!").parentElement ?? document.body;
    expect(
      within(card)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Bản đồ tiếp: Tiệm chè", "Ván mới", "Đổi bản đồ"]);

    await user.click(screen.getByRole("button", { name: "Bản đồ tiếp: Tiệm chè" }));

    expect(transport.requestNewGame).toHaveBeenCalledWith({ map: "dessert-shop" });
  });

  it("offers no suggestion after the last map", () => {
    renderCrew(over({ options: { map: "moon-festival" } }));

    expect(screen.queryByRole("button", { name: /^Bản đồ tiếp/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đổi bản đồ" })).toBeVisible();
  });

  it("shows the maps as a grid with their difficulty in the dialog", async () => {
    renderCrew(over());
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Đổi bản đồ" }));

    const dialog = screen.getByRole("dialog", { name: "Đổi bản đồ" });
    expect(within(dialog).getAllByRole("radio")).toHaveLength(8);
    expect(within(dialog).getByRole("radio", { name: "Hai gian bếp, Dễ" })).toBeChecked();
    expect(within(dialog).getByRole("radio", { name: "Đêm trăng rằm, Rất khó" })).not.toBeChecked();
  });

  it("Game không có tuỳ chọn: Tic-tac-toe offers only a new game", () => {
    const fake = changingTransport(
      over({ options: {}, cooperative: false, freePlay: false, result: { kind: "draw" } }),
    );
    renderWithIntl(
      <PlayScreen gameId="tictactoe" transport={fake.transport} ui={plainUi} rules={<p />} />,
    );

    expect(screen.getByRole("button", { name: "Ván mới" })).toBeVisible();
    expect(screen.queryByRole("button", { name: /^Đổi/ })).not.toBeInTheDocument();
  });
});

describe("Báo ván mới với tuỳ chọn khác", () => {
  it("Bạn đổi bản đồ: a game played freely says the new map first", () => {
    const online = {
      viewer: 1,
      seats: [{ kind: "remote", name: "Minh" }, { kind: "human" }],
      connection: "online",
    } as const;
    const { change } = renderCrew(over(online));

    change(
      over({
        ...online,
        result: null,
        moveCount: 0,
        canStartNewGame: false,
        options: { map: "dessert-shop" },
      }),
    );

    expect(screen.getAllByRole("status")[0]).toHaveTextContent(
      "Ván mới: Tiệm chè · Cả đội cùng đi · bạn là Hồng",
    );
    expect(screen.getByText("Tiệm chè")).toBeVisible();
  });

  const onlineCaro = (overrides: Partial<TicTacToeSnapshot>) =>
    over({
      viewer: 0,
      seats: [{ kind: "human" }, { kind: "remote", name: "Lan" }],
      connection: "online",
      cooperative: false,
      freePlay: false,
      supportsUndo: false,
      canUndo: false,
      result: { kind: "win", winners: [1] },
      options: { size: 15, rule: "blocked-ends" },
      ...overrides,
    });

  function renderOnlineCaro() {
    const fake = changingTransport(onlineCaro({}));
    renderWithIntl(
      <PlayScreen
        gameId="caro"
        transport={fake.transport}
        ui={plainUi}
        optionChoices={CARO_CHOICES}
        rules={<p />}
      />,
    );
    return fake;
  }

  const newGame = { result: null, moveCount: 0, canStartNewGame: false, canMove: true } as const;

  it("Bạn đổi bản đồ: tells the new rules until the first move", () => {
    const { change } = renderOnlineCaro();

    change(onlineCaro({ ...newGame, options: { size: 19, rule: "blocked-ends" } }));

    const status = screen.getAllByRole("status")[0];
    expect(status).toHaveTextContent(/^Ván mới: bạn cầm .+ · 19×19 · Chặn hai đầu$/u);
    expect(screen.getByText("19×19 · Chặn hai đầu")).toBeVisible();

    change(onlineCaro({ ...newGame, options: { size: 19, rule: "blocked-ends" }, moveCount: 1 }));
    expect(screen.getAllByRole("status")[0]).not.toHaveTextContent("19×19");
  });

  it("Chơi lại giữ tuỳ chọn: the new game is told as before", () => {
    const { change } = renderOnlineCaro();

    change(onlineCaro(newGame));

    expect(screen.getAllByRole("status")[0]).toHaveTextContent(/^Ván mới: bạn cầm [^·]+$/u);
  });
});
