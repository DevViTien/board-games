import {
  jellyCrew,
  jellyCrewLayout,
  type JellyCrewMove,
  type JellyCrewState,
  jellyCrewTryStep,
} from "@board-games/games/jelly-crew";
import { fireEvent, screen, within } from "@testing-library/react";
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
/** Hồng walks onto plate ●, which opens door ●. */
const ONTO_PLATE: readonly JellyCrewMove[] = ["1D", "1D", "1D", "1L", "1L"];

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
    show: (next: JellyCrewState) => {
      view.rerender(<JellyCrewBoard {...props(next)} />);
    },
  };
}

const chip = (name: string) => document.querySelector(`[data-chip="${name}"]`);
const button = (name: string) => screen.getByRole("button", { name });
/** What the board says for screen readers (and shows, for a refused step). */
const said = () => document.querySelector("[aria-live]")?.textContent ?? "";
const frame = (container: HTMLElement) => {
  const found = container.querySelector<HTMLElement>("[data-crew-board]")?.parentElement;
  if (found == null) throw new Error("no board");
  return found;
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Hiển thị bàn", () => {
  it("Nhân vật của mình: online, only this player's character is ringed, no turn colour", () => {
    const { container } = renderBoard(start(), { viewer: 1 });

    expect(container.querySelector('[data-char="2"][data-now]')).not.toBeNull();
    expect(container.querySelector('[data-char="1"][data-now]')).toBeNull();
    expect(frame(container).className).toContain("border-transparent");
  });

  it("rings the character picked on one device: the second at first", () => {
    const { container } = renderBoard(start());
    expect(container.querySelector('[data-char="2"][data-now]')).not.toBeNull();
  });

  it("Cửa mở và đóng: plate ● held, door ● open, door ▲ closed, a badge on the character", () => {
    const { container } = renderBoard(play(start(), ONTO_PLATE));

    expect(container.querySelector('[data-door="circle"][data-open]')).not.toBeNull();
    expect(container.querySelector('[data-door="triangle"]:not([data-open])')).not.toBeNull();
    expect(container.querySelector('[data-char="2"] [data-holding="circle"]')).not.toBeNull();
  });
});

describe("Chip của ván", () => {
  it("Chip giữa ván: the team's steps and the molds, no turn or round", () => {
    renderBoard(play(start(), ["0D", "1D", "0R"]));

    expect(chip("steps")).toHaveTextContent("Bước 3");
    expect(chip("molds")).toHaveTextContent("Khuôn 0/4");
    expect(chip("turn")).toBeNull();
    expect(chip("round")).toBeNull();
  });
});

describe("Thao tác", () => {
  it("has no Xong lượt, Lùi bước or Giữ nút", () => {
    renderBoard(play(start(), ONTO_PLATE), { viewer: 1 });

    expect(screen.queryByRole("button", { name: /Xong lượt/u })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Lùi bước/u })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Giữ nút/u })).not.toBeInTheDocument();
  });

  it("Đi bằng phím khi online: arrows and W A S D both move this player's character", () => {
    const { onMove } = renderBoard(start(), { viewer: 1 });

    fireEvent.keyDown(document.body, { key: "ArrowLeft" });
    fireEvent.keyDown(document.body, { key: "ArrowLeft", repeat: true });
    fireEvent.keyDown(document.body, { key: "a" });

    expect(onMove).toHaveBeenNthCalledWith(1, "1L");
    expect(onMove).toHaveBeenNthCalledWith(2, "1L");
    expect(onMove).toHaveBeenCalledTimes(2);
  });

  it("Hướng bị chặn: the up button cannot be pressed and says it is a wall", async () => {
    const { onMove } = renderBoard(start(), { viewer: 1 });

    const up = button("Lên");
    expect(up).toHaveAttribute("aria-disabled", "true");
    expect(up).toHaveAccessibleDescription("Tường");
    await userEvent.click(up);
    expect(onMove).not.toHaveBeenCalled();
  });

  it("Báo bước bị chặn: names the character and the closed door ●, the game unchanged", () => {
    // Lam pushes the strawberries up to door ●, which nobody holds open.
    const beside = play(start(), ["0D", "0R", "0R"]);
    const { onMove } = renderBoard(beside);

    fireEvent.keyDown(document.body, { key: "d" });

    expect(onMove).not.toHaveBeenCalled();
    expect(said()).toBe("Lam: không đi sang phải được, Thạch vướng cửa ● đóng.");
  });

  it("Đặt lại có hỏi lại: keeping the map changes nothing, resetting sends the move", async () => {
    const { onMove } = renderBoard(play(start(), ["0D"]), { viewer: 1 });

    await userEvent.click(button("Đặt lại bản đồ"));
    const dialog = screen.getByRole("dialog", { name: "Đặt lại bản đồ?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Để nguyên" }));
    expect(onMove).not.toHaveBeenCalled();

    await userEvent.click(button("Đặt lại bản đồ"));
    await userEvent.click(screen.getByRole("button", { name: "Đặt lại" }));
    expect(onMove).toHaveBeenCalledWith("1reset");
  });

  it("cannot reset a map as it began, and says why", () => {
    renderBoard(start());
    expect(button("Đặt lại bản đồ")).toHaveAttribute("aria-disabled", "true");
    expect(button("Đặt lại bản đồ")).toHaveAccessibleDescription("Bản đồ đang như lúc bắt đầu");
  });

  it("does nothing while this device cannot move, and says why", async () => {
    const { onMove } = renderBoard(start(), {
      viewer: 1,
      disabled: true,
      lockedReason: "Đang kết nối lại…",
    });

    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    await userEvent.click(button("Xuống"));

    expect(onMove).not.toHaveBeenCalled();
    expect(button("Xuống")).toHaveAccessibleDescription("Đang kết nối lại…");
  });

  it("ignores keys typed in a field", () => {
    const { onMove } = renderBoard(start());
    const field = document.createElement("input");
    document.body.append(field);

    fireEvent.keyDown(field, { key: "ArrowDown" });
    fireEvent.keyDown(field, { key: "s" });

    expect(onMove).not.toHaveBeenCalled();
    field.remove();
  });

  it("swipes on the board, from 32 px, for the character driven", () => {
    const { onMove, container } = renderBoard(start(), { viewer: 1 });
    const board = frame(container);

    fireEvent.pointerDown(board, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerUp(board, { pointerId: 1, pointerType: "touch", clientX: 104, clientY: 150 });
    fireEvent.pointerDown(board, {
      pointerId: 2,
      pointerType: "touch",
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerUp(board, { pointerId: 2, pointerType: "touch", clientX: 120, clientY: 110 });

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith("1D");
  });

  it("lets the page scroll on the board when this device cannot move", () => {
    const { container } = renderBoard(start(), { disabled: true, viewer: 1 });
    expect(frame(container).style.touchAction).toBe("pan-y");
  });
});

describe("Chọn nhân vật khi chơi cùng máy", () => {
  it("Hai người chung bàn phím: W A S D move Lam, the arrows the character picked", () => {
    const { onMove } = renderBoard(start());

    fireEvent.keyDown(document.body, { key: "d" });
    fireEvent.keyDown(document.body, { key: "ArrowLeft" });

    expect(onMove).toHaveBeenNthCalledWith(1, "0R");
    expect(onMove).toHaveBeenNthCalledWith(2, "1L");
    expect(screen.getByRole("radio", { name: /Hồng/u })).toBeChecked();
  });

  it("Đổi nhân vật: key 3 picks Cam, whom the arrows then move", () => {
    const four = start(4);
    const { onMove } = renderBoard(four);
    const direction = (["U", "D", "L", "R"] as const).find(
      (candidate) => jellyCrewTryStep(four, 2, candidate).ok,
    );
    if (direction === undefined) throw new Error("Cam cannot move");
    const key = { U: "ArrowUp", D: "ArrowDown", L: "ArrowLeft", R: "ArrowRight" }[direction];

    fireEvent.keyDown(document.body, { key: "3" });
    fireEvent.keyDown(document.body, { key });

    expect(screen.getByRole("radio", { name: /Cam/u })).toBeChecked();
    expect(screen.getByRole("group", { name: "Hướng đi của Cam" })).toBeInTheDocument();
    expect(onMove).toHaveBeenCalledWith(`2${direction}`);
  });

  it("picks by the radios too, and has no picker online", async () => {
    const { onMove } = renderBoard(start());
    await userEvent.click(screen.getByRole("radio", { name: /Lam/u }));
    await userEvent.click(button("Xuống"));
    expect(onMove).toHaveBeenCalledWith("0D");

    const online = renderBoard(start(), { viewer: 0 });
    expect(within(online.container).queryByRole("radio")).not.toBeInTheDocument();
  });
});

describe("Dùng được bằng trình đọc màn hình", () => {
  it("Báo cửa mở: what a move did, naming the character", () => {
    const before = play(start(), ONTO_PLATE.slice(0, -1));
    const { show } = renderBoard(before);
    show(play(before, ONTO_PLATE.slice(-1)));
    expect(said()).toBe("Hồng đi sang trái, cửa ● mở");
  });

  it("Không đọc bước trống của người khác: online, another's walk is not said, one's own is", () => {
    const { show } = renderBoard(start(), { viewer: 1 });
    const minhWalked = play(start(), ["0D"]);
    show(minhWalked);
    expect(said()).toBe("");
    const lanWalked = play(minhWalked, ["1D"]);
    show(lanWalked);
    expect(said()).toBe("Hồng đi xuống");
  });

  it("says another's move that did something", () => {
    const before = play(start(), ["0D"]);
    const { show } = renderBoard(before, { viewer: 1 });
    show(play(before, ["0R"]));
    expect(said()).toBe("Lam đẩy thạch dâu sang phải");
  });
});

describe("a game over", () => {
  it("shows no ring and no pad once someone gave up", () => {
    const state = play(start(), ["0D"]);
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
    expect(screen.queryByRole("group", { name: "Bàn điều khiển" })).not.toBeInTheDocument();
  });

  it("Ván xong: the molds chip full once the team won", () => {
    const won = play(start(), [
      "0D",
      ...ONTO_PLATE,
      "0R",
      "0R",
      "0R",
      "0R",
      "0R",
      "0R",
      "0L",
      "0L",
      "0L",
      "0L",
      "0D",
      "0D",
      "1R",
      "1U",
      "1U",
      "1L",
      "1L",
      "1L",
      "1L",
    ]);
    expect(won.result).toBe("filled");
    renderBoard(won);
    expect(chip("molds")).toHaveTextContent("Khuôn 4/4");
    expect(screen.queryByRole("group", { name: "Bàn điều khiển" })).not.toBeInTheDocument();
  });
});

describe("Chuyển động", () => {
  it("shows the board after a step at once when motion is reduced", () => {
    stubReducedMotion(true);
    const before = play(start(), ["0D"]);
    const { show } = renderBoard(before);

    show(play(before, ["0R"]));

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
    expect(list).toHaveTextContent(`cột ${String((PLATE % KITCHEN.width) + 1)}: nút ●`);
  });
});
