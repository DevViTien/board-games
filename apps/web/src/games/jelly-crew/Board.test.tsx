import {
  jellyCrew,
  jellyCrewLayout,
  type JellyCrewMove,
  type JellyCrewState,
} from "@board-games/games/jelly-crew";
import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubReducedMotion } from "@/test/fake-transport";
import { renderWithIntl } from "@/test/render-with-intl";

import { defaultBoardLayout } from "../types";
import { JellyCrewBoard } from "./Board";

const KITCHEN = jellyCrewLayout("kitchen", 2);
const at = (x: number, y: number) => y * KITCHEN.width + x;
/** Hồng's plate ● in the 2-player kitchen. */
const PLATE = at(15, 4);

function start(playerCount = 2): JellyCrewState {
  return jellyCrew.setup({ playerCount, options: { map: "kitchen" } });
}

function play(state: JellyCrewState, moves: readonly JellyCrewMove[]): JellyCrewState {
  return moves.reduce((current, move) => jellyCrew.applyMove(current, move), state);
}

interface Options {
  readonly onMove?: (move: JellyCrewMove) => void;
  readonly disabled?: boolean;
  readonly viewer?: number | null;
  readonly lockedReason?: string | null;
}

function renderBoard(state: JellyCrewState, options: Options = {}) {
  const onMove = options.onMove ?? vi.fn();
  const props = (next: JellyCrewState) => ({
    state: next,
    legalMoves: jellyCrew.legalMoves(next),
    onMove,
    disabled: options.disabled ?? false,
    result: jellyCrew.result(next),
    lastEntry: null,
    viewer: options.viewer ?? null,
    layout: defaultBoardLayout,
    lockedReason: options.lockedReason ?? null,
  });
  const view = renderWithIntl(<JellyCrewBoard {...props(state)} />);
  return {
    ...view,
    onMove,
    show: (next: JellyCrewState, entry: JellyCrewMove | null = null) => {
      view.rerender(
        <JellyCrewBoard {...props(next)} lastEntry={entry === null ? null : { move: entry }} />,
      );
    },
  };
}

const chip = (name: string) => document.querySelector(`[data-chip="${name}"]`);
const button = (name: string) => screen.getByRole("button", { name });

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Hiển thị bàn", () => {
  it("Lượt trên bàn: the second seat ringed, the frame in its colour, its chip", () => {
    const { container } = renderBoard(play(start(), ["end"]));

    expect(container.querySelector('[data-char="2"][data-now]')).not.toBeNull();
    expect(container.querySelector('[data-char="1"][data-now]')).toBeNull();
    expect(container.querySelector('[data-turn-seat="2"]')).not.toBeNull();
    expect(chip("turn")).toHaveTextContent("Hồng · còn 5 bước");
  });

  it("Cửa mở và đóng: plate ● held, door ● open, door ▲ closed, a badge on the character", () => {
    const state = {
      ...play(start(), ["end"]),
      board: { ...KITCHEN.start, chars: [at(1, 1), PLATE] },
    };
    const { container } = renderBoard(state);

    expect(container.querySelector('[data-door="circle"][data-open]')).not.toBeNull();
    expect(container.querySelector('[data-door="triangle"]:not([data-open])')).not.toBeNull();
    expect(container.querySelector('[data-plate="circle"][data-held]')).not.toBeNull();
    expect(container.querySelector('[data-char="2"] [data-holding="circle"]')).not.toBeNull();
  });

  it("marks the latest turn's trail", () => {
    const { container } = renderBoard(play(start(), ["D", "R", "end"]));

    // Lam walked from (1,1) through (1,2) to (2,2): two dots behind it.
    expect(container.querySelectorAll("[data-trail]")).toHaveLength(2);
  });
});

describe("Chip của ván", () => {
  it("Chip đầu lượt: whose turn and steps left, the round of the rounds", () => {
    renderBoard(play(start(), ["end", "end", "end", "end", "end"]));

    expect(chip("turn")).toHaveTextContent("Hồng · còn 5 bước");
    expect(chip("round")).toHaveTextContent(`Vòng 3/${String(KITCHEN.rounds)}`);
    expect(chip("molds")).toHaveTextContent("Khuôn 0/4");
  });

  it("Hết bước: says the steps are over and to end the turn", () => {
    renderBoard(play(start(), ["D", "D", "D", "D", "R"]));

    expect(chip("turn")).toHaveTextContent("Lam · hết bước, bấm Xong lượt");
  });

  it("Ván xong: no turn chip once the team won, the molds full", () => {
    const won = play(start(), [
      "D",
      "end",
      "D",
      "D",
      "D",
      "L",
      "L",
      "end",
      "R",
      "R",
      "R",
      "R",
      "R",
      "end",
      "end",
      "R",
      "L",
      "L",
      "L",
      "L",
      "end",
      "R",
      "U",
      "U",
      "end",
      "D",
      "D",
      "end",
      "L",
      "L",
      "L",
      "L",
    ]);
    expect(jellyCrew.result(won)?.kind).toBe("win");
    renderBoard(won, { disabled: true });

    expect(chip("turn")).toBeNull();
    expect(chip("molds")).toHaveTextContent("Khuôn 4/4");
    expect(screen.queryByRole("group", { name: "Điều khiển" })).not.toBeInTheDocument();
  });
});

describe("a game stopped outside its rules", () => {
  it("shows no turn, no turn chip and no pad once someone gave up", () => {
    const state = play(start(), ["D"]);
    renderWithIntl(
      <JellyCrewBoard
        state={state}
        legalMoves={[]}
        onMove={vi.fn()}
        disabled
        result={{ kind: "draw", reason: "resigned" }}
        lastEntry={null}
        viewer={0}
        layout={defaultBoardLayout}
      />,
    );

    expect(document.querySelector("[data-now]")).toBeNull();
    expect(document.querySelector("[data-turn-seat]")).toBeNull();
    expect(chip("turn")).toBeNull();
    expect(screen.queryByRole("group", { name: "Điều khiển" })).not.toBeInTheDocument();
  });
});

describe("Thao tác", () => {
  it("Đi bằng phím: an arrow steps, a held key does not repeat", () => {
    const { onMove } = renderBoard(start());

    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    fireEvent.keyDown(document.body, { key: "ArrowDown", repeat: true });
    fireEvent.keyDown(document.body, { key: "s" });

    expect(onMove).toHaveBeenNthCalledWith(1, "D");
    expect(onMove).toHaveBeenNthCalledWith(2, "D");
    expect(onMove).toHaveBeenCalledTimes(2);
  });

  it("Hướng bị chặn: the up button cannot be pressed and says it is a wall", async () => {
    const { onMove } = renderBoard(start());

    const up = button("Lên");
    expect(up).toHaveAttribute("aria-disabled", "true");
    expect(up).toHaveAccessibleDescription("Tường");
    await userEvent.click(up);

    expect(onMove).not.toHaveBeenCalled();
    expect(screen.getByText("Không đi lên được: Tường.")).toBeInTheDocument();
  });

  it("Báo bước bị chặn: a closed door ▲ in the way is said, the game unchanged", () => {
    // Lam just left of door ▲ (12,2) inside the hall: nobody on plate ▲.
    const state = { ...start(), board: { ...KITCHEN.start, chars: [at(11, 3), at(17, 1)] } };
    const inHall = { ...state, board: { ...state.board, chars: [at(11, 2), at(17, 1)] } };
    const { onMove } = renderBoard(inHall);

    fireEvent.keyDown(document.body, { key: "ArrowRight" });

    expect(onMove).not.toHaveBeenCalled();
    expect(screen.getByText("Không đi sang phải được: Cửa ▲ đóng.")).toBeInTheDocument();
  });

  it("Enter trên một nút: Enter on the reset button opens its question, the turn goes on", async () => {
    const { onMove } = renderBoard(play(start(), ["D"]));

    button("Đặt lại bản đồ").focus();
    await userEvent.keyboard("{Enter}");

    expect(screen.getByRole("dialog")).toHaveAccessibleName("Đặt lại bản đồ?");
    expect(onMove).not.toHaveBeenCalled();
  });

  it("ends the turn with Enter away from any button", () => {
    const { onMove } = renderBoard(start());

    fireEvent.keyDown(document.body, { key: "Enter" });

    expect(onMove).toHaveBeenCalledWith("end");
  });

  it("Đặt lại có hỏi lại: keeping the map changes nothing, resetting sends the move", async () => {
    const { onMove } = renderBoard(play(start(), ["D"]));

    await userEvent.click(button("Đặt lại bản đồ"));
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText(
        "Mọi người và thạch về chỗ ban đầu. Lượt của bạn kết thúc; các vòng đã chơi vẫn được tính.",
      ),
    ).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Để nguyên" }));
    expect(onMove).not.toHaveBeenCalled();

    await userEvent.click(button("Đặt lại bản đồ"));
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Đặt lại" }),
    );
    expect(onMove).toHaveBeenCalledWith("reset");
  });

  it("Cùng máy không có Lùi bước: no step back on one device, nor Z", () => {
    const { onMove } = renderBoard(play(start(), ["D"]));

    expect(screen.queryByRole("button", { name: "Lùi bước" })).not.toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: "z" });
    expect(onMove).not.toHaveBeenCalled();
  });

  it("steps back online, by its button or Z", async () => {
    const { onMove } = renderBoard(play(start(), ["D"]), { viewer: 0 });

    await userEvent.click(button("Lùi bước"));
    fireEvent.keyDown(document.body, { key: "z" });

    expect(onMove).toHaveBeenCalledTimes(2);
    expect(onMove).toHaveBeenCalledWith("back");
  });

  it("does nothing when it is not this device's turn, and says why", () => {
    const { onMove } = renderBoard(start(), {
      disabled: true,
      viewer: 1,
      lockedReason: "Đang chờ Minh",
    });

    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    fireEvent.keyDown(document.body, { key: "Enter" });

    expect(onMove).not.toHaveBeenCalled();
    expect(button("Xuống")).toHaveAttribute("aria-disabled", "true");
    expect(button("Xuống")).toHaveAccessibleDescription("Đang chờ Minh");
    expect(button("Xong lượt")).toHaveAccessibleDescription("Đang chờ Minh");
  });

  it("ignores keys typed in a field", () => {
    const { onMove } = renderBoard(start());
    const field = document.createElement("input");
    document.body.append(field);

    fireEvent.keyDown(field, { key: "ArrowDown" });
    fireEvent.keyDown(field, { key: "Enter" });

    expect(onMove).not.toHaveBeenCalled();
    field.remove();
  });

  it("swipes on the board, from 32 px", () => {
    const { onMove, container } = renderBoard(start());
    const frame = container.querySelector("[data-turn-seat]");
    if (frame === null) throw new Error("no board");

    fireEvent.pointerDown(frame, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerUp(frame, { pointerId: 1, pointerType: "touch", clientX: 104, clientY: 150 });
    fireEvent.pointerDown(frame, {
      pointerId: 2,
      pointerType: "touch",
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerUp(frame, { pointerId: 2, pointerType: "touch", clientX: 120, clientY: 110 });

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith("D");
  });

  it("lets the page scroll on the board when this device cannot move", () => {
    const { container } = renderBoard(start(), { disabled: true, viewer: 1 });

    expect(container.querySelector<HTMLElement>("[data-turn-seat]")?.style.touchAction).toBe(
      "pan-y",
    );
  });
});

describe("Đứng giữ nút", () => {
  /** Hồng on plate ●, her turn on one device. */
  const onPlate = (): JellyCrewState => ({
    ...play(start(), ["end"]),
    board: { ...KITCHEN.start, chars: [at(1, 1), PLATE] },
  });

  it("Tự xong lượt khi giữ nút: once held, the seat's next turn ends by itself", async () => {
    vi.useFakeTimers();
    const onMove = vi.fn();
    const { show } = renderBoard(onPlate(), { onMove });

    fireEvent.click(button("Giữ nút ●"));
    expect(button("Giữ nút ●")).toHaveAttribute("aria-pressed", "true");
    await act(() => vi.advanceTimersByTimeAsync(600));
    expect(onMove).toHaveBeenCalledWith("end");

    // Lam's turn, then Hồng's again: ended by itself once more.
    onMove.mockClear();
    const lamsTurn = play(onPlate(), ["end"]);
    show(lamsTurn, "end");
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(onMove).not.toHaveBeenCalled();
    show(play(lamsTurn, ["end"]), "end");
    await act(() => vi.advanceTimersByTimeAsync(600));
    expect(onMove).toHaveBeenCalledWith("end");
  });

  it("Thôi giữ khi đi: a step of the seat lets go", async () => {
    vi.useFakeTimers();
    const onMove = vi.fn();
    renderBoard(onPlate(), { onMove });

    fireEvent.click(button("Giữ nút ●"));
    fireEvent.keyDown(document.body, { key: "ArrowLeft" });
    expect(onMove).toHaveBeenCalledWith("L");
    await act(() => vi.advanceTimersByTimeAsync(1000));

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(button("Giữ nút ●")).toHaveAttribute("aria-pressed", "false");
  });

  it("never ends turns by itself when every seat holds a plate", async () => {
    vi.useFakeTimers();
    const onMove = vi.fn();
    // Lam on plate ▲, Hồng on plate ●: once both hold, neither turn ends by itself.
    const both = { ...start(), board: { ...KITCHEN.start, chars: [at(3, 4), PLATE] } };
    const { show } = renderBoard(both, { onMove });
    fireEvent.click(button("Giữ nút ▲"));
    await act(() => vi.advanceTimersByTimeAsync(600));
    expect(onMove).toHaveBeenCalledWith("end");

    onMove.mockClear();
    const hong = play(both, ["end"]);
    show(hong);
    fireEvent.click(button("Giữ nút ●"));
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(onMove).not.toHaveBeenCalled();
  });

  it("holds online for the player here, whoever's turn it is", () => {
    const state = { ...start(), board: { ...KITCHEN.start, chars: [at(1, 1), PLATE] } };
    renderBoard(state, { viewer: 1, disabled: true, lockedReason: "Đang chờ Lan" });

    expect(button("Giữ nút ●")).toHaveAttribute("aria-pressed", "false");
  });

  it("has no hold button for a character off the plates", () => {
    renderBoard(start());

    expect(screen.queryByRole("button", { name: /Giữ nút/u })).not.toBeInTheDocument();
  });
});

describe("Chuyển động", () => {
  it("shows the board after a step at once when motion is reduced", () => {
    stubReducedMotion(true);
    const before = play(start(), ["D"]);
    const { show } = renderBoard(before);

    const after = play(before, ["R"]);
    show(after, "R");

    expect(screen.getByText(/Hàng 3: .*cột 3: Lam \(số 1\)/u)).toBeInTheDocument();
    expect(screen.getByText(/cột 4: thạch dâu; cột 5: thạch dâu/u)).toBeInTheDocument();
  });
});

describe("Mô tả bàn", () => {
  it("names each character, jelly, mold, plate and door by row", () => {
    renderBoard(start());

    const list = screen.getByRole("list", { name: "Mô tả bàn" });
    expect(list).toHaveTextContent("Hàng 2: cột 2: Lam (số 1); cột 18: Hồng (số 2)");
    expect(list).toHaveTextContent("cột 7: cửa ● đóng");
    expect(list).toHaveTextContent("cột 9: khuôn dâu");
    expect(list).toHaveTextContent("cột 16: nút ●");
  });
});
