import type { GameResult, HistoryEntry, PlayerIndex } from "@board-games/engine";
import {
  type Fence,
  FENCE_RACE_REASON,
  fenceRace,
  type FenceRaceMove,
  type FenceRaceState,
} from "@board-games/games/fence-race";
import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import { defaultBoardLayout } from "../types";
import { FenceRaceBoard } from "./Board";

/** A cell by its name, on a board of `rows`. */
function at(name: string, rows = 11) {
  return { row: rows - Number(name.slice(1)), col: name.charCodeAt(0) - 65 };
}

/** The fence between rows `low` and `low + 1` (from the bottom), over column `left` and the next. */
function rowFence(low: number, left: string, rows = 11): Fence {
  return { ...at(`${left}${low + 1}`, rows), dir: "h" };
}

/** The fence between column `left` and the next, over rows `low` and `low + 1`. */
function colFence(left: string, low: number, rows = 11): Fence {
  return { ...at(`${left}${low + 1}`, rows), dir: "v" };
}

interface PositionConfig {
  readonly players?: number;
  readonly pawns?: readonly string[];
  readonly fences?: readonly Fence[];
  readonly toMove?: number;
  readonly moveCount?: number;
  readonly fencesLeft?: readonly number[];
  readonly breaksLeft?: readonly number[];
  readonly lastFrom?: string;
  readonly result?: GameResult;
}

function position({
  players = 2,
  pawns,
  fences = [],
  toMove = 0,
  moveCount = 0,
  fencesLeft,
  breaksLeft,
  lastFrom,
  result,
}: PositionConfig = {}): FenceRaceState {
  const start = fenceRace.setup({ playerCount: players, options: {} });
  const rows = start.rows;
  return {
    ...start,
    pawns: pawns === undefined ? start.pawns : pawns.map((name) => at(name, rows)),
    fences,
    toMove,
    moveCount,
    fencesLeft: fencesLeft ?? start.fencesLeft,
    breaksLeft: breaksLeft ?? start.breaksLeft,
    lastFrom: lastFrom === undefined ? null : at(lastFrom, rows),
    result: result ?? null,
  };
}

interface BoardConfig {
  readonly state?: FenceRaceState;
  readonly legalMoves?: readonly FenceRaceMove[];
  readonly disabled?: boolean;
  /** An ending outside the rules is here only: `state.result` stays empty. Default: the state's. */
  readonly result?: GameResult | null;
  readonly viewer?: PlayerIndex | null;
  readonly lastEntry?: HistoryEntry<FenceRaceMove, never> | null;
  readonly lockedReason?: string | null;
  readonly onMove?: (move: FenceRaceMove) => void;
}

function boardElement({
  state = position(),
  legalMoves,
  disabled = false,
  result,
  viewer = null,
  lastEntry = null,
  lockedReason = null,
  onMove = () => undefined,
}: BoardConfig = {}) {
  return (
    <FenceRaceBoard
      state={state}
      legalMoves={legalMoves ?? fenceRace.legalMoves(state)}
      onMove={onMove}
      disabled={disabled}
      result={result === undefined ? state.result : result}
      lastEntry={lastEntry}
      viewer={viewer}
      layout={defaultBoardLayout}
      lockedReason={lockedReason}
    />
  );
}

function renderBoard(config: BoardConfig = {}) {
  const view = renderWithIntl(boardElement(config));
  return {
    ...view,
    update: (next: BoardConfig) => {
      view.rerender(boardElement(next));
    },
  };
}

function found<T extends Element>(element: T | null | undefined): T {
  if (element === null || element === undefined) throw new Error("Not on the page");
  return element;
}

const svg = () => found(document.querySelector("svg"));
const cell = (name: string) => found(document.querySelector<HTMLElement>(`[data-cell="${name}"]`));
const mode = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name}`) });
const layer = () => screen.getByRole("application");
const place = () => screen.getByRole("button", { name: "Đặt rào" });
const preview = () => svg().querySelector("[data-preview]");
/** The line under the board, as it shows: the same words may also be in the live region. */
const shows = (text: string | RegExp) => {
  const visible = screen
    .getAllByText(text)
    .filter((element) => !element.classList.contains("sr-only"));
  expect(visible.length, String(text)).toBeGreaterThan(0);
};

// The board is measured at 30 px a cell and a mat of 16 px when nothing lays it out (tests).
const CELL = 30;
const GUTTER = 16;
/** A point on the board (in lines from the top left), on screen. */
const screenAt = (a: number, b: number) => ({
  clientX: GUTTER + a * CELL,
  clientY: GUTTER + b * CELL,
});

function tap(target: Element, a: number, b: number) {
  const point = screenAt(a, b);
  fireEvent.pointerDown(target, { pointerId: 1, isPrimary: true, ...point });
  fireEvent.pointerUp(target, { pointerId: 1, isPrimary: true, ...point });
}

function drag(target: Element, from: readonly [number, number], to: readonly [number, number]) {
  fireEvent.pointerDown(target, {
    pointerId: 1,
    isPrimary: true,
    ...screenAt(from[0], from[1]),
  });
  moveTo(target, to);
}

/** A finger or a button still down, moving. */
function moveTo(target: Element, to: readonly [number, number]) {
  fireEvent.pointerMove(target, {
    pointerId: 1,
    isPrimary: true,
    buttons: 1,
    ...screenAt(to[0], to[1]),
  });
}

/** Into the mode, and a fence tried near the line between rows from the top `line`, column `col`. */
async function tryFence(user: ReturnType<typeof userEvent.setup>, a: number, b: number) {
  await user.click(mode("Đặt rào"));
  tap(layer(), a, b);
}

describe("Hiển thị bàn", () => {
  it("draws a cell button for each cell of the board, in the board's proportions", () => {
    renderBoard();

    expect(document.querySelectorAll("[data-cell]")).toHaveLength(99);
    expect(svg().getAttribute("viewBox")).toBe(`0 0 ${9 * CELL + 32} ${11 * CELL + 32}`);
    const board = document.querySelector("[data-fence-race-board]");
    expect(board).toHaveAttribute("data-rows", "11");
    expect(board).toHaveAttribute("data-seats", "2");
    expect(screen.getAllByRole("row")).toHaveLength(11);
  });

  it("Cổng đích theo người chơi", () => {
    renderBoard();

    // Seat 0, going up, has its gate along the top: the seat to move's, in full colour.
    const first = svg().querySelector('[data-gate="0"]');
    expect(first).toHaveAttribute("transform", "matrix(1 0 0 1 0 0)");
    expect(first).toHaveAttribute("data-active");
    expect(first?.querySelector("path")).toHaveClass("fill-piece-red");
    // Seat 1's along the bottom, in a tint: a block of its own, with the seat's symbol on its posts.
    const second = svg().querySelector('[data-gate="1"]');
    expect(second?.getAttribute("transform")).toMatch(/^matrix\(1 0 0 -1 /);
    expect(second).not.toHaveAttribute("data-active");
    expect(second?.querySelector("path")?.getAttribute("class")).toContain("color-mix");
    // The other cells of the edge have only their names, on the paper.
    const names = [...svg().querySelectorAll("text")].map((text) => text.textContent);
    for (const name of ["A", "B", "C", "G", "H", "I", "1", "11"]) expect(names).toContain(name);
    expect(names.filter((name) => name === "C")).toHaveLength(2);
    // A shape, not only a colour: the roof of a gate.
    expect(first?.querySelector("path")?.getAttribute("d")).toContain("Q");
  });

  it("gates four edges at four players, and leaves the fourth edge plain at three", () => {
    const { unmount } = renderBoard({ state: position({ players: 4 }) });
    expect(svg().querySelectorAll("[data-gate]")).toHaveLength(4);
    unmount();

    renderBoard({ state: position({ players: 3 }) });
    expect(svg().querySelectorAll("[data-gate]")).toHaveLength(3);
    // Seat 2, from the left, has its gate on the right.
    expect(svg().querySelector('[data-gate="2"]')?.getAttribute("transform")).toMatch(
      /^matrix\(0 1 -1 0 /,
    );
  });

  it("Bốn quân chung ô", () => {
    const state = position({ players: 4, pawns: ["E5", "E5", "E5", "E5"] });
    renderBoard({ state, viewer: null });

    const pawns = svg().querySelectorAll("[data-pawn]");
    expect(pawns).toHaveLength(4);
    // Each with its own symbol, in a place of its own.
    const places = new Set(
      [...pawns].map((pawn) => {
        const hat = found(pawn.querySelector("circle"));
        return `${hat.getAttribute("cx") ?? ""}:${hat.getAttribute("cy") ?? ""}`;
      }),
    );
    expect(places.size).toBe(4);
    expect(svg().querySelector("[data-share]")).not.toBeNull();
    expect(cell("E5")).toHaveAccessibleName(/Đỏ, Xanh dương, Vàng và Xanh lá/);
  });

  it("shows the seat to move on the board: a ring around its pawn, its gate full", () => {
    renderBoard({ state: position({ toMove: 1, moveCount: 1 }) });

    const pawn = svg().querySelector('[data-pawn="1"]');
    expect(pawn?.querySelectorAll(".stroke-game-highlight")).toHaveLength(1);
    expect(svg().querySelector('[data-pawn="0"] .stroke-game-highlight')).toBeNull();
    expect(svg().querySelector('[data-gate="1"]')).toHaveAttribute("data-active");
  });

  it("draws every fence on the board, the one just placed in a dashed frame", () => {
    const fences = [rowFence(4, "C"), colFence("F", 7)];
    const state = position({ fences, toMove: 1, moveCount: 1 });
    renderBoard({ state, lastEntry: { move: { kind: "fence", ...rowFence(4, "C") } } });

    expect(svg().querySelectorAll("[data-wall]")).toHaveLength(2);
    expect(svg().querySelectorAll("[data-just]")).toHaveLength(1);
    expect(svg().querySelector("[data-just]")?.getAttribute("data-wall")).toBe("h:6:2");
  });

  it("Đánh dấu rào vừa phá", () => {
    const state = position({ toMove: 1, moveCount: 3, breaksLeft: [0, 1] });
    renderBoard({ state, lastEntry: { move: { kind: "break", ...rowFence(4, "C") } } });

    expect(svg().querySelector("[data-gone]")).not.toBeNull();
    shows("Đỏ vừa phá rào giữa hàng 4 và 5, cột C–D.");
    expect(cell("C5")).toHaveAccessibleName(/rào vừa bị phá phía dưới/);
    expect(cell("D4")).toHaveAccessibleName(/rào vừa bị phá phía trên/);
    expect(cell("E5")).not.toHaveAccessibleName(/rào vừa/);
  });

  it("Tải lại vẫn thấy ô vừa rời: from the state, without any history", () => {
    renderBoard({
      state: position({ pawns: ["E2", "E11"], toMove: 1, moveCount: 1, lastFrom: "E1" }),
    });

    expect(svg().querySelector("[data-left]")).not.toBeNull();
    expect(cell("E1")).toHaveAccessibleName(/quân vừa rời ô này/);
  });

  it("Đánh dấu khi kết thúc", () => {
    const state = position({
      pawns: ["E11", "E5"],
      toMove: 1,
      moveCount: 21,
      lastFrom: "E10",
      result: { kind: "win", winners: [0], reason: "goal" },
    });
    renderBoard({
      state,
      legalMoves: [],
      disabled: true,
      lastEntry: { move: { kind: "step", ...at("E11") } },
    });

    expect(svg().querySelector("[data-goal]")).not.toBeNull();
    // The winner: the ring, and its gate full; the other's a tint, whoever is "to move".
    expect(svg().querySelector('[data-pawn="0"] .stroke-game-highlight')).not.toBeNull();
    expect(svg().querySelector('[data-gate="0"]')).toHaveAttribute("data-active");
    expect(svg().querySelector('[data-gate="1"]')).not.toHaveAttribute("data-active");
    // No marker of the cell left, no controls.
    expect(svg().querySelector("[data-left]")).toBeNull();
    expect(screen.queryByRole("group", { name: "Chế độ" })).not.toBeInTheDocument();
  });

  it("does not mark the gate of a win when the moves ran out", () => {
    const state = position({
      pawns: ["E9", "E7"],
      moveCount: 200,
      result: { kind: "win", winners: [0], reason: "turn-limit" },
    });
    renderBoard({ state, legalMoves: [], disabled: true });

    expect(svg().querySelector("[data-goal]")).toBeNull();
    expect(svg().querySelector('[data-pawn="0"] .stroke-game-highlight')).not.toBeNull();
  });
});

describe("Ba chế độ thao tác", () => {
  it("starts on Đi quân, with dots on the cells the pawn can step to", () => {
    renderBoard();

    expect(mode("Đi quân")).toHaveAttribute("aria-pressed", "true");
    expect(mode("Đặt rào")).toHaveAttribute("aria-pressed", "false");
    expect(mode("Phá rào")).toHaveAttribute("aria-pressed", "false");
    expect(svg().querySelectorAll("[data-target]")).toHaveLength(3);
    expect(cell("E2")).toHaveAttribute("aria-disabled", "false");
    expect(cell("E3")).toHaveAttribute("aria-disabled", "true");
    // Nothing over the board.
    expect(screen.queryByRole("application")).not.toBeInTheDocument();
  });

  it("Đi quân bằng một chạm", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    renderBoard({ onMove });

    await user.click(cell("E2"));

    expect(onMove).toHaveBeenCalledExactlyOnceWith({ kind: "step", ...at("E2") });
  });

  it("frames a cell the pawn can step to when another pawn stands on it", () => {
    renderBoard({ state: position({ pawns: ["E5", "E6"] }) });

    expect(svg().querySelectorAll("[data-target] rect")).toHaveLength(2);
  });

  it("does nothing for a cell it cannot step to", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    renderBoard({ onMove });

    await user.click(cell("E3"));

    expect(onMove).not.toHaveBeenCalled();
  });

  it("Hết rào", async () => {
    const user = userEvent.setup();
    renderBoard({ state: position({ fencesLeft: [0, 9] }) });

    expect(mode("Đặt rào")).toHaveAttribute("aria-disabled", "true");
    expect(mode("Đặt rào")).toHaveTextContent("Đã hết rào");

    await user.click(mode("Đặt rào"));

    expect(mode("Đi quân")).toHaveAttribute("aria-pressed", "true");
    shows("Đã hết rào");
    expect(screen.getByText("Chọn việc khác cho lượt này.")).toBeInTheDocument();
  });

  it.each([
    ["no break left", { breaksLeft: [0, 1], fences: [rowFence(4, "C")] }, "Đã phá rào"],
    ["no fence yet", {}, "Chưa có rào"],
  ])("says why Phá rào cannot be chosen: %s", (_case, config, reason) => {
    renderBoard({ state: position(config) });

    expect(mode("Phá rào")).toHaveAttribute("aria-disabled", "true");
    expect(mode("Phá rào")).toHaveTextContent(reason);
  });

  it("says how many are left on each mode", () => {
    renderBoard({ state: position({ fencesLeft: [5, 9], fences: [rowFence(4, "C")] }) });

    expect(mode("Đi quân")).toHaveTextContent("10 bước");
    expect(mode("Đặt rào")).toHaveTextContent("Còn 5");
    expect(mode("Phá rào")).toHaveTextContent("Còn 1 lần");
  });

  it("locks every mode while waiting, and says so", () => {
    renderBoard({
      state: position({ toMove: 1, moveCount: 3 }),
      disabled: true,
      viewer: 0,
      lockedReason: "Đang chờ Minh",
    });

    for (const name of ["Đi quân", "Đặt rào", "Phá rào"]) {
      expect(mode(name)).toHaveAttribute("aria-disabled", "true");
      expect(mode(name)).toHaveTextContent("Chưa tới lượt");
    }
    expect(screen.getByText("Đang chờ Minh")).toBeInTheDocument();
    expect(screen.getByText("Tới lượt bạn mới chọn được việc.")).toBeInTheDocument();
    expect(svg().querySelectorAll("[data-target]")).toHaveLength(0);
  });

  it("has a hint for each mode", async () => {
    const user = userEvent.setup();
    renderBoard({ state: position({ fences: [rowFence(4, "C")], moveCount: 2 }), viewer: 0 });

    expect(screen.getByText("Chạm ô có chấm để đi một ô.")).toBeInTheDocument();

    await user.click(mode("Đặt rào"));
    expect(screen.getByText("Chạm lên bàn, gần đường kẻ muốn chặn.")).toBeInTheDocument();
    expect(screen.getByText("Kéo để dời, chạm lại đúng rào để xoay.")).toBeInTheDocument();

    await user.click(mode("Phá rào"));
    expect(screen.getByText("Chạm gần rào muốn phá.")).toBeInTheDocument();
  });

  it("Trở về Đi quân", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    const state = position();
    const { update } = renderBoard({ state, onMove });

    await tryFence(user, 3.5, 5.02);
    await user.click(place());
    expect(onMove).toHaveBeenCalledTimes(1);

    const placed = fenceRace.applyMove(state, onMove.mock.calls[0]?.[0] as FenceRaceMove);
    update({ state: placed, onMove });
    const again = fenceRace.applyMove(placed, { kind: "step", ...at("E10") });
    update({ state: again, onMove });

    expect(mode("Đi quân")).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("application")).not.toBeInTheDocument();
  });

  it("Câu mục tiêu đầu ván", () => {
    renderBoard();

    expect(screen.getByText("Về cổng màu đỏ ● ở cạnh trên trước mọi người.")).toBeInTheDocument();
  });

  it("says the goal by the player on a turned board, and for each seat in turn", () => {
    const { unmount } = renderBoard({ state: position({ toMove: 1, moveCount: 1 }), viewer: 1 });
    // Seat 1's gate is on the bottom edge of the board: at the top of a turned screen.
    expect(
      screen.getByText("Về cổng màu xanh dương ■ ở cạnh trên trước mọi người."),
    ).toBeInTheDocument();
    unmount();

    renderBoard({ state: position({ players: 4, toMove: 1, moveCount: 1 }) });
    expect(
      screen.getByText("Về cổng màu xanh dương ■ ở cạnh phải trước mọi người."),
    ).toBeInTheDocument();
  });

  it("says the goal of the player here while waiting for the first moves", () => {
    renderBoard({
      state: position({ players: 4 }),
      disabled: true,
      viewer: 2,
      lockedReason: "Đang chờ Minh",
    });

    expect(screen.getByText("Về cổng màu vàng ▲ ở cạnh dưới trước mọi người.")).toBeInTheDocument();
    expect(screen.getByText("Đang chờ Minh")).toBeInTheDocument();
  });

  it("drops the goal once everyone has had a turn", () => {
    renderBoard({ state: position({ moveCount: 2 }) });

    expect(screen.queryByText(/Về cổng màu/)).not.toBeInTheDocument();
  });
});

describe("Đặt rào có xem trước", () => {
  it("Xem trước rồi xác nhận", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    renderBoard({ onMove });

    await user.click(mode("Đặt rào"));
    tap(layer(), 3.5, 5.02);

    // Near the line between the 5th and 6th rows from the top, in the middle of a column.
    expect(preview()).toHaveAttribute("data-preview", "ok");
    expect(onMove).not.toHaveBeenCalled();
    shows("Rào giữa hàng 6 và 7, cột D–E.");

    await user.click(place());

    expect(onMove).toHaveBeenCalledExactlyOnceWith({ kind: "fence", row: 4, col: 3, dir: "h" });
  });

  it("takes the direction of the nearest line on a first touch", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    renderBoard({ onMove });

    await tryFence(user, 3.02, 5.5);
    await user.click(place());

    expect(onMove).toHaveBeenCalledExactlyOnceWith({ kind: "fence", row: 5, col: 2, dir: "v" });
  });

  it("Xoay rào", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    renderBoard({
      state: position({ fences: [colFence("D", 6)] }),
      onMove,
    });

    // Across the fence's middle once turned: it stands, and is refused once turned.
    await tryFence(user, 4.5, 3.02);
    expect(preview()).toHaveAttribute("data-preview", "ok");

    await user.click(screen.getByRole("button", { name: "Xoay" }));
    expect(onMove).not.toHaveBeenCalled();
    await user.click(place());

    expect(onMove).toHaveBeenCalledExactlyOnceWith({ kind: "fence", row: 2, col: 4, dir: "v" });
  });

  it("Xoay rào: the fence's validity follows", async () => {
    const user = userEvent.setup();
    renderBoard({ state: position({ fences: [colFence("D", 6)] }) });

    // The crossing of the fence that stands: along a row it would cross it.
    await tryFence(user, 3.6, 5.02);
    // Turned, on the existing fence's own crossing it overlaps; along the row it crosses.
    expect(preview()).toHaveAttribute("data-preview", "bad");
    shows(/^Cắt ngang rào giữa cột D và E, hàng 6–7/);

    await user.click(screen.getByRole("button", { name: "Xoay" }));

    expect(preview()).toHaveAttribute("data-preview", "bad");
    shows(/^Đè lên rào giữa cột D và E, hàng 6–7/);
  });

  it("Kéo giữ hướng", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    renderBoard({ onMove });
    await tryFence(user, 3.5, 5.02);
    await user.click(screen.getByRole("button", { name: "Xoay" }));

    // Along a diagonal, across many lines of both kinds: it follows, and stays turned.
    fireEvent.pointerDown(layer(), { pointerId: 1, isPrimary: true, ...screenAt(4, 5) });
    for (let step = 1; step <= 6; step += 1) {
      fireEvent.pointerMove(layer(), {
        pointerId: 1,
        isPrimary: true,
        buttons: 1,
        ...screenAt(4 + step * 0.45, 5 + step * 0.45),
      });
      expect(document.querySelector("[data-preview]")?.getAttribute("transform")).toContain(
        "rotate(90)",
      );
    }
    fireEvent.pointerUp(layer(), { pointerId: 1, isPrimary: true, ...screenAt(6.7, 7.7) });
    await user.click(place());

    const move = onMove.mock.calls[0]?.[0] as FenceRaceMove;
    expect(move).toMatchObject({ kind: "fence", dir: "v" });
    if (move.kind === "step") throw new Error("not a fence");
    // Moved with the finger: by as much as it moved, from where the fence was.
    expect([move.row, move.col]).toEqual([7, 6]);
  });

  it("Kéo giữ hướng: a drag from near the fence moves it without a jump", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    renderBoard({ onMove });
    await tryFence(user, 3.5, 5.02);

    // Pressed two rows under the fence, moved one column right: the fence moves one column.
    drag(layer(), [4, 7], [5, 7]);
    fireEvent.pointerUp(layer(), { pointerId: 1, isPrimary: true, ...screenAt(5, 7) });
    await user.click(place());

    expect(onMove).toHaveBeenCalledExactlyOnceWith({ kind: "fence", row: 4, col: 4, dir: "h" });
  });

  it("Kéo để dời rào starts a fence where the press was, far from the one tried", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    renderBoard({ onMove });
    await tryFence(user, 1.5, 1.02);

    // A tap far away keeps the direction and moves it there.
    tap(layer(), 6.1, 8.6);
    await user.click(place());

    expect(onMove).toHaveBeenCalledExactlyOnceWith({ kind: "fence", row: 8, col: 5, dir: "h" });
  });

  it("only follows the primary finger: a second one changes nothing", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    renderBoard({ onMove });
    await tryFence(user, 3.5, 5.02);

    fireEvent.pointerDown(layer(), { pointerId: 2, isPrimary: false, ...screenAt(7, 8) });
    fireEvent.pointerMove(layer(), {
      pointerId: 2,
      isPrimary: false,
      buttons: 1,
      ...screenAt(8, 9),
    });
    fireEvent.pointerUp(layer(), { pointerId: 2, isPrimary: false, ...screenAt(8, 9) });
    await user.click(place());

    expect(onMove).toHaveBeenCalledExactlyOnceWith({ kind: "fence", row: 4, col: 3, dir: "h" });
  });

  it("puts the fence back if the browser takes the finger (pointercancel)", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    renderBoard({ onMove });
    await tryFence(user, 3.5, 5.02);

    drag(layer(), [4, 5], [7, 8]);
    fireEvent.pointerCancel(layer(), { pointerId: 1, isPrimary: true });
    await user.click(place());

    expect(onMove).toHaveBeenCalledExactlyOnceWith({ kind: "fence", row: 4, col: 3, dir: "h" });
  });

  it("is pinch-zoomable and not scrollable under one finger while placing", async () => {
    const user = userEvent.setup();
    renderBoard();

    await user.click(mode("Đặt rào"));

    expect(layer()).toHaveClass("touch-pinch-zoom");
    // Outside the grid: it stands for a position, not a cell.
    expect(layer().closest('[role="grid"]')).toBeNull();
  });

  it("Chạm lại không đặt nhầm", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    renderBoard({ onMove });
    await tryFence(user, 3.5, 5.02);
    expect(preview()?.getAttribute("transform")).not.toContain("rotate");

    tap(layer(), 4, 5);

    expect(preview()?.getAttribute("transform")).toContain("rotate(90)");
    expect(onMove).not.toHaveBeenCalled();
  });

  it("Huỷ", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    renderBoard({ onMove });
    await tryFence(user, 3.5, 5.02);

    await user.click(screen.getByRole("button", { name: "Huỷ" }));

    expect(preview()).toBeNull();
    expect(mode("Đặt rào")).toHaveAttribute("aria-pressed", "true");
    expect(onMove).not.toHaveBeenCalled();
    expect(screen.getByText("Chạm lên bàn, gần đường kẻ muốn chặn.")).toBeInTheDocument();
  });

  it("Báo đường dài ra", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    renderBoard({
      // Seat 1 at the top goes down column E: a fence right across adds a step.
      state: position({ pawns: ["A1", "E8"] }),
      onMove,
    });

    await tryFence(user, 4.5, 5.02);

    shows("Xanh dương: 7 → 8 bước");
    // Its way is shown as dots, for whoever's way changes only.
    expect(svg().querySelector('[data-way="1"]')).not.toBeNull();
    expect(svg().querySelector('[data-way="0"]')).toBeNull();
    expect(onMove).not.toHaveBeenCalled();
  });

  it("says when nobody has further to go, with no way drawn", async () => {
    const user = userEvent.setup();
    renderBoard({ state: position({ pawns: ["E1", "E11"] }) });

    await tryFence(user, 1.5, 1.02);

    expect(screen.getByText("Không ai phải đi xa hơn.")).toBeInTheDocument();
    expect(svg().querySelector("[data-way]")).toBeNull();
  });

  it("Rào bịt kín đường", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    // I1 is closed above; a fence to its left over the same rows seals it.
    const state = position({
      pawns: ["I1", "A11"],
      fences: [rowFence(1, "H")],
      toMove: 1,
      moveCount: 1,
    });
    renderBoard({ state, onMove });

    await user.click(mode("Đặt rào"));
    tap(layer(), 7.02, 10.2);

    expect(preview()).toHaveAttribute("data-preview", "bad");
    shows("Bịt kín đường của Đỏ");
    expect(place()).toHaveAttribute("aria-disabled", "true");
    expect(place()).toHaveAccessibleDescription("Bịt kín đường của Đỏ");

    await user.click(place());

    expect(onMove).not.toHaveBeenCalled();
    expect(preview()).not.toBeNull();
  });

  it("shows a bad fence hollow and crossed out, a good one with handles", async () => {
    const user = userEvent.setup();
    const { unmount } = renderBoard({ state: position({ fences: [rowFence(4, "C")] }) });
    await tryFence(user, 3.5, 7.02);
    expect(svg().querySelector('[data-preview="bad"]')?.querySelectorAll("rect")).toHaveLength(2);
    expect(svg().querySelector('[data-preview="bad"] path')).not.toBeNull();
    unmount();

    renderBoard();
    await tryFence(user, 3.5, 5.02);
    expect(svg().querySelector('[data-preview="ok"]')?.querySelectorAll("circle")).toHaveLength(2);
  });

  it("does not move the board: nothing around it comes or goes with a preview", async () => {
    const user = userEvent.setup();
    renderBoard();
    await tryFence(user, 3.5, 5.02);

    // The row of modes gives way to the row of tools, both 44 px high.
    expect(screen.getByRole("button", { name: "Xoay" }).closest(".grid")).toBeVisible();
    expect(screen.queryByRole("group", { name: "Chế độ" })).not.toBeInTheDocument();
  });
});

describe("Phá rào có xác nhận", () => {
  const fences = [rowFence(4, "C"), rowFence(7, "F")];

  it("Chọn rồi phá", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    renderBoard({ state: position({ fences }), onMove });

    await user.click(mode("Phá rào"));
    tap(layer(), 3, 6.8);

    expect(svg().querySelector("[data-chosen]")).not.toBeNull();
    expect(onMove).not.toHaveBeenCalled();
    shows("Rào giữa hàng 4 và 5, cột C–D.");

    await user.click(screen.getByRole("button", { name: "Phá rào" }));

    expect(onMove).toHaveBeenCalledExactlyOnceWith({ kind: "break", ...rowFence(4, "C") });
  });

  it("Đổi ý", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    renderBoard({ state: position({ fences }), onMove });

    await user.click(mode("Phá rào"));
    tap(layer(), 3, 6.8);
    await user.click(screen.getByRole("button", { name: "Huỷ" }));
    await user.click(mode("Đi quân"));

    expect(onMove).not.toHaveBeenCalled();
    expect(svg().querySelector("[data-chosen]")).toBeNull();
    expect(mode("Phá rào")).toHaveAttribute("aria-disabled", "false");
  });

  it("says whose way gets shorter, and shows it", async () => {
    const user = userEvent.setup();
    const fence = rowFence(4, "E");
    renderBoard({ state: position({ pawns: ["E1", "A11"], fences: [fence] }) });

    await user.click(mode("Phá rào"));
    tap(layer(), 5, 6.8);

    shows("Đỏ: 11 → 10 bước");
    expect(svg().querySelector('[data-way="0"]')).not.toBeNull();
  });

  it("says when nobody's way gets shorter", async () => {
    const user = userEvent.setup();
    renderBoard({ state: position({ pawns: ["E1", "E11"], fences: [rowFence(9, "A")] }) });

    await user.click(mode("Phá rào"));
    tap(layer(), 1, 1.8);

    expect(screen.getByText("Không ai ngắn đường hơn.")).toBeInTheDocument();
  });
});

describe("Vòng đời rào xem trước", () => {
  it("Mất kết nối khi đang xem trước", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    const state = position();
    const { update } = renderBoard({ state, onMove, viewer: 0 });
    await tryFence(user, 3.5, 5.02);
    await user.click(screen.getByRole("button", { name: "Xoay" }));

    // The connection goes: the state is rebuilt, the same position.
    const rebuilt = JSON.parse(JSON.stringify(state)) as FenceRaceState;
    update({
      state: rebuilt,
      disabled: true,
      viewer: 0,
      lockedReason: "Đang chờ kết nối…",
      onMove,
    });

    expect(preview()).not.toBeNull();
    expect(preview()?.getAttribute("transform")).toContain("rotate(90)");
    expect(layer()).toHaveAttribute("data-fence-race-layer", "place");
    expect(place()).toHaveAttribute("aria-disabled", "true");
    expect(place()).toHaveAccessibleDescription("Đang chờ kết nối…");

    await user.click(place());
    expect(onMove).not.toHaveBeenCalled();

    // Back: it goes through.
    update({ state: JSON.parse(JSON.stringify(state)) as FenceRaceState, viewer: 0, onMove });
    expect(place()).toHaveAttribute("aria-disabled", "false");
    await user.click(place());
    expect(onMove).toHaveBeenCalledTimes(1);
  });

  it("Hoàn tác khi đang xem trước", async () => {
    const user = userEvent.setup();
    const state = position({ moveCount: 2 });
    const { update } = renderBoard({ state });
    await tryFence(user, 3.5, 5.02);

    update({ state: { ...state, moveCount: 1, toMove: 1 } });

    expect(preview()).toBeNull();
    expect(mode("Đi quân")).toHaveAttribute("aria-pressed", "true");
  });

  it.each([
    ["a redo", { moveCount: 3, toMove: 1 }],
    ["a new game", { moveCount: 0, toMove: 0 }],
    ["the AI standing in", { moveCount: 3, toMove: 1 }],
  ])("drops it on %s", async (_case, next) => {
    const user = userEvent.setup();
    const state = position({ moveCount: 2 });
    const { update } = renderBoard({ state });
    await tryFence(user, 3.5, 5.02);

    update({ state: { ...state, ...next }, disabled: true });

    expect(preview()).toBeNull();
    expect(mode("Đi quân")).toHaveAttribute("aria-pressed", "true");
  });

  it("Rào đang gửi không nháy", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    const state = position();
    const { update } = renderBoard({ state, onMove, viewer: 0 });
    await tryFence(user, 3.5, 5.02);
    await user.click(place());
    const move = onMove.mock.calls[0]?.[0] as FenceRaceMove;

    // On its way: locked, and drawn as what it will be.
    update({ state, disabled: true, viewer: 0, lockedReason: "Đang gửi…", onMove });
    expect(svg().querySelector("[data-wall]")).not.toBeNull();
    expect(preview()).toBeNull();
    expect(screen.getByText("Đang gửi…")).toBeInTheDocument();
    expect(mode("Đặt rào")).toHaveAttribute("aria-disabled", "true");
    // Sent once: pressing again sends nothing.
    expect(onMove).toHaveBeenCalledTimes(1);

    // The room answers: still there, in the same place.
    const after = fenceRace.applyMove(state, move);
    update({ state: after, disabled: true, viewer: 0, lastEntry: { move }, onMove });
    expect(svg().querySelector("[data-wall]")?.getAttribute("data-wall")).toBe("h:4:3");
    expect(svg().querySelector("[data-just]")).not.toBeNull();
  });

  it("Nước bị từ chối", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    const state = position();
    const { update } = renderBoard({ state, onMove, viewer: 0 });
    await tryFence(user, 3.5, 5.02);
    await user.click(place());
    update({ state, disabled: true, viewer: 0, lockedReason: "Đang gửi…", onMove });

    // Refused: the room answers with the same position, unlocked.
    update({ state, viewer: 0, onMove });

    expect(preview()).toHaveAttribute("data-preview", "ok");
    expect(place()).toHaveAttribute("aria-disabled", "false");
    expect(svg().querySelector("[data-wall]")).toBeNull();
  });

  it("releases a finger held on the fence when the position changes", async () => {
    const user = userEvent.setup();
    const state = position({ moveCount: 2 });
    const { update } = renderBoard({ state });
    await tryFence(user, 3.5, 5.02);
    const element = layer();
    const release = vi.fn();
    Object.assign(element, {
      setPointerCapture: () => undefined,
      hasPointerCapture: () => true,
      releasePointerCapture: release,
    });
    fireEvent.pointerDown(element, { pointerId: 1, isPrimary: true, ...screenAt(4, 5) });

    update({ state: { ...state, moveCount: 3, toMove: 1 } });

    expect(release).toHaveBeenCalledWith(1);
    expect(screen.queryByRole("application")).not.toBeInTheDocument();
  });
});

describe("Bàn quay theo người chơi", () => {
  const turnedTop = () => {
    const pawn = svg().querySelector('[data-pawn="1"] circle');
    return Number(pawn?.getAttribute("cy"));
  };

  it("Ghế thứ hai online", () => {
    const { unmount } = renderBoard({ state: position({ toMove: 1, moveCount: 1 }), viewer: 1 });
    // Its pawn, at row 0 of the board, is at the bottom of a turned screen.
    expect(turnedTop()).toBeGreaterThan(300);
    // The cell is called the same either way.
    expect(cell("E11")).toHaveAccessibleName(/^Ô E11/);
    const rows = screen.getAllByRole("row");
    expect(
      within(found(rows[0])).getAllByRole("gridcell")[0]?.querySelector("button"),
    ).toHaveAttribute("data-cell", "I1");
    unmount();

    renderBoard({ state: position({ toMove: 1, moveCount: 1 }), viewer: 0 });
    expect(turnedTop()).toBeLessThan(100);
    const upright = screen.getAllByRole("row");
    expect(
      within(found(upright[0])).getAllByRole("gridcell")[0]?.querySelector("button"),
    ).toHaveAttribute("data-cell", "A11");
  });

  it("Ván ba người không quay", () => {
    renderBoard({ state: position({ players: 3, toMove: 2, moveCount: 2 }), viewer: 2 });

    const upright = screen.getAllByRole("row");
    expect(
      within(found(upright[0])).getAllByRole("gridcell")[0]?.querySelector("button"),
    ).toHaveAttribute("data-cell", "A9");
  });

  it("Ván bốn người không quay", () => {
    renderBoard({ state: position({ players: 4, toMove: 1, moveCount: 1 }), viewer: 1 });

    const upright = screen.getAllByRole("row");
    expect(
      within(found(upright[0])).getAllByRole("gridcell")[0]?.querySelector("button"),
    ).toHaveAttribute("data-cell", "A9");
    // Seat 1's gate, in its colour and symbol, on the right edge.
    expect(svg().querySelector('[data-gate="1"]')?.getAttribute("transform")).toMatch(
      /^matrix\(0 1 -1 0 /,
    );
  });

  it("reads a touch through the turned board", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    renderBoard({ state: position({ toMove: 1, moveCount: 1 }), viewer: 1, onMove });

    await user.click(mode("Đặt rào"));
    tap(layer(), 3.5, 5.02);
    await user.click(place());

    // On screen 3.5 lines from the left and 5 from the top are, turned, 5.5 and 6 on the board.
    expect(onMove).toHaveBeenCalledExactlyOnceWith({ kind: "fence", row: 5, col: 5, dir: "h" });
  });
});

describe("Dùng được bằng bàn phím", () => {
  it("Đi quân bằng bàn phím", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    renderBoard({ onMove, viewer: 0 });

    await user.tab();
    // The board comes first in the page's order: its one stop is the pawn's cell.
    expect(cell("E1")).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(cell("E2")).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(onMove).toHaveBeenCalledExactlyOnceWith({ kind: "step", ...at("E2") });
  });

  it("is one stop in the Tab order: the pawn's cell", () => {
    renderBoard({ viewer: 0 });

    const stops = [...document.querySelectorAll('[data-cell][tabindex="0"]')];
    expect(stops).toHaveLength(1);
    expect(stops[0]).toHaveAttribute("data-cell", "E1");
  });

  it("follows the screen with the arrows on a turned board", async () => {
    const user = userEvent.setup();
    renderBoard({ state: position({ toMove: 1, moveCount: 1 }), viewer: 1 });

    cell("E5").focus();
    await user.keyboard("{ArrowUp}");
    // Turned: up on screen is towards row 1.
    expect(cell("E4")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(cell("D4")).toHaveFocus();
  });

  it("stops at the edge", async () => {
    const user = userEvent.setup();
    renderBoard();

    cell("A1").focus();
    await user.keyboard("{ArrowLeft}{ArrowDown}");
    expect(cell("A1")).toHaveFocus();
  });

  it("Đặt rào bằng bàn phím", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    renderBoard({ state: position({ pawns: ["E5", "A11"] }), onMove, viewer: 0 });

    mode("Đặt rào").focus();
    await user.keyboard("{Enter}");
    // From the keyboard, the next keys are the board's.
    expect(layer()).toHaveFocus();

    // By the pawn at first: across the line above row E5's neighbours.
    await user.keyboard("{ArrowUp}");
    await user.keyboard("{ArrowUp}");
    await user.keyboard("r");
    expect(preview()?.getAttribute("transform")).toContain("rotate(90)");
    await user.keyboard("{Enter}");

    expect(onMove).toHaveBeenCalledExactlyOnceWith({ kind: "fence", row: 5, col: 4, dir: "v" });
  });

  it("does not place a bad fence with Enter", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    const fence = { row: 6, col: 4, dir: "h" as const };
    renderBoard({ state: position({ pawns: ["E5", "A11"], fences: [fence] }), onMove });

    mode("Đặt rào").focus();
    await user.keyboard("{Enter}");
    await user.keyboard("{ArrowUp}");

    expect(preview()).toHaveAttribute("data-preview", "bad");
    await user.keyboard("{Enter}");
    expect(onMove).not.toHaveBeenCalled();
  });

  it("Esc goes back to Đi quân while the connection is lost too", async () => {
    const user = userEvent.setup();
    const state = position();
    const { update } = renderBoard({ state, viewer: 0 });
    mode("Đặt rào").focus();
    await user.keyboard("{Enter}");
    await user.keyboard("{ArrowUp}");

    update({ state, viewer: 0, disabled: true, lockedReason: "Đang chờ kết nối…" });
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("application")).not.toBeInTheDocument();
    expect(mode("Đi quân")).toHaveAttribute("aria-pressed", "true");
  });

  it("Esc goes back to Đi quân, with the focus on the pawn", async () => {
    const user = userEvent.setup();
    renderBoard({ viewer: 0 });

    mode("Đặt rào").focus();
    await user.keyboard("{Enter}");
    await user.keyboard("{Escape}");

    expect(mode("Đi quân")).toHaveAttribute("aria-pressed", "true");
    expect(cell("E1")).toHaveFocus();
    expect(screen.queryByRole("application")).not.toBeInTheDocument();
  });

  it("R and Esc work from the row of tools", async () => {
    const user = userEvent.setup();
    renderBoard({ viewer: 0 });

    mode("Đặt rào").focus();
    await user.keyboard("{Enter}");
    await user.keyboard("{ArrowUp}");
    screen.getByRole("button", { name: "Xoay" }).focus();
    await user.keyboard("r");

    expect(preview()?.getAttribute("transform")).toContain("rotate(90)");

    await user.keyboard("{Escape}");
    expect(cell("E1")).toHaveFocus();
  });

  it("Tiêu điểm sau khi đặt rào", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    const state = position({ pawns: ["E5", "A11"] });
    const { update } = renderBoard({ state, onMove, viewer: 0 });

    mode("Đặt rào").focus();
    await user.keyboard("{Enter}");
    await user.keyboard("{ArrowUp}");
    await user.keyboard("{Enter}");
    const move = onMove.mock.calls[0]?.[0] as FenceRaceMove;

    update({
      state: fenceRace.applyMove(state, move),
      onMove,
      viewer: 0,
      disabled: true,
      lastEntry: { move },
    });

    expect(cell("E5")).toHaveFocus();
    expect(document.body).not.toHaveFocus();
  });

  it("Tiêu điểm: the confirm button pressed from the keyboard does not lose it", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    const state = position({ pawns: ["E5", "A11"] });
    const { update } = renderBoard({ state, onMove });

    mode("Đặt rào").focus();
    await user.keyboard("{Enter}");
    await user.keyboard("{ArrowUp}");
    place().focus();
    await user.keyboard("{Enter}");
    const move = onMove.mock.calls[0]?.[0] as FenceRaceMove;
    update({ state: fenceRace.applyMove(state, move), onMove, lastEntry: { move } });

    // On a shared device, with the pawn of who just moved.
    expect(cell("E5")).toHaveFocus();
  });

  it("keeps the mode button that cannot be chosen focusable, with its reason", () => {
    renderBoard({ state: position({ fencesLeft: [0, 9] }) });

    mode("Đặt rào").focus();

    expect(mode("Đặt rào")).toHaveFocus();
    expect(mode("Đặt rào")).toHaveAccessibleName(/Đã hết rào/);
  });

  it("Phá rào bằng bàn phím", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    const left = rowFence(5, "C");
    const right = rowFence(5, "G");
    const up = rowFence(9, "C");
    renderBoard({
      state: position({ pawns: ["C5", "A11"], fences: [left, right, up] }),
      onMove,
    });

    mode("Phá rào").focus();
    await user.keyboard("{Enter}");
    await user.keyboard("{ArrowRight}");
    // The nearest fence to the pawn first.
    expect(svg().querySelector("[data-chosen]")).not.toBeNull();
    shows("Rào giữa hàng 5 và 6, cột C–D.");

    await user.keyboard("{ArrowRight}");
    shows("Rào giữa hàng 5 và 6, cột G–H.");
    await user.keyboard("{Enter}");

    expect(onMove).toHaveBeenCalledExactlyOnceWith({ kind: "break", ...right });
  });
});

describe("Dùng được bằng trình đọc màn hình", () => {
  it("Đọc rào quanh ô", () => {
    renderBoard({
      state: position({ pawns: ["C4", "A11"], fences: [rowFence(4, "C")] }),
    });

    const target = cell("C4");
    expect(target).toHaveAccessibleName(/^Ô C4/);
    expect(target).toHaveAccessibleName(/có quân Đỏ/);
    expect(target).toHaveAccessibleName(/rào phía trên/);
    expect(cell("C3")).toHaveAccessibleName(/đi được/);
    expect(cell("C5")).toHaveAccessibleName(/rào phía dưới/);
  });

  it("names the sides as they are on screen when the board is turned, and whose gate a cell is", () => {
    renderBoard({
      state: position({
        pawns: ["C4", "A11"],
        fences: [rowFence(4, "C")],
        toMove: 1,
        moveCount: 1,
      }),
      viewer: 1,
    });

    expect(cell("C4")).toHaveAccessibleName(/rào phía dưới/);
    expect(cell("E11")).toHaveAccessibleName(/cổng đích của Đỏ/);
    expect(cell("E1")).toHaveAccessibleName(/cổng đích của Bạn/);
    expect(cell("A1")).not.toHaveAccessibleName(/cổng đích/);
  });

  it("tells a player's own pawn and who is there", () => {
    renderBoard({ state: position({ pawns: ["E5", "E5"] }), viewer: 0 });

    expect(cell("E5")).toHaveAccessibleName(/có quân Bạn và Xanh dương/);
  });

  it("Đọc lý do", async () => {
    const user = userEvent.setup();
    renderBoard({ state: position({ pawns: ["E5", "A11"], fences: [rowFence(4, "D")] }) });

    mode("Đặt rào").focus();
    await user.keyboard("{Enter}");
    await user.keyboard("{ArrowUp}");

    const live = document.querySelector('[aria-live="polite"]');
    expect(live).toHaveTextContent("Rào giữa hàng 4 và 5, cột E–F.");
    expect(live).toHaveTextContent("Đè lên rào giữa hàng 4 và 5, cột D–E");
    expect(layer()).toHaveAccessibleName(/Đè lên rào giữa hàng 4 và 5, cột D–E/);
  });

  it("reads the steps with the fence, not the hint of a mode", async () => {
    const user = userEvent.setup();
    renderBoard({ state: position({ pawns: ["A1", "E8"], moveCount: 2 }), viewer: 0 });
    const live = () => document.querySelector('[aria-live="polite"]');
    expect(live()).toHaveTextContent("");

    await user.click(mode("Đặt rào"));
    expect(live()).toHaveTextContent("");

    tap(layer(), 4.5, 5.02);
    expect(live()).toHaveTextContent("Xanh dương: 7 → 8 bước");
  });

  it("does not repeat a line the turn line already says online", () => {
    const state = position({ pawns: ["E2", "E11"], toMove: 1, moveCount: 1, lastFrom: "E1" });
    renderBoard({
      state,
      viewer: 1,
      lastEntry: { move: { kind: "step", ...at("E2") } },
    });

    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent("");
  });

  it("reads the move on a shared device, as there is no turn line telling it", () => {
    const state = position({ pawns: ["E2", "E11"], toMove: 1, moveCount: 2, lastFrom: "E1" });
    renderBoard({ state, lastEntry: { move: { kind: "step", ...at("E2") } } });

    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent("Đỏ vừa đi tới E2.");
  });

  it("has no status role and no id in its notes: the chat draws them twice", () => {
    renderBoard({ state: position({ moveCount: 3, toMove: 1 }) });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    const live = document.querySelector('[aria-live="polite"]');
    expect(live?.closest("[id]")).toBeNull();
    const notes = live?.parentElement;
    expect(notes?.querySelector("[id]")).toBeNull();
  });
});

describe("Dùng được trên điện thoại", () => {
  it("Vùng chạm ở khung thấp: a small cell's target reaches 24 × 24 px", () => {
    const observers: ResizeObserverCallback[] = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: ResizeObserverCallback) {
          observers.push(callback);
        }
        observe() {
          return undefined;
        }
        disconnect() {
          return undefined;
        }
      },
    );
    const measured = vi
      .spyOn(Element.prototype, "getBoundingClientRect")
      .mockImplementation(function measuredBox(this: Element) {
        if (this.hasAttribute("data-fence-race-grid")) {
          return { left: 14, top: 14, width: 18.9 * 9, height: 18.9 * 11 } as DOMRect;
        }
        return { left: 0, top: 0, width: 18.9 * 9 + 28, height: 18.9 * 11 + 28 } as DOMRect;
      });
    try {
      renderBoard();

      for (const name of ["E2", "D1", "F1"]) {
        const target = cell(name);
        expect(Number.parseFloat(target.style.width)).toBeGreaterThanOrEqual(24);
        expect(Number.parseFloat(target.style.height)).toBeGreaterThanOrEqual(24);
      }
      // A cell it cannot step to stays its own size.
      expect(cell("E3").style.width).toBe("");
    } finally {
      measured.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});

describe("chuyển động", () => {
  function withAnimate() {
    const animate = vi.fn();
    Object.assign(SVGElement.prototype, { animate });
    return animate;
  }

  it("slides the pawn for one new move, and not for a position opened or undone", () => {
    const animate = withAnimate();
    const state = position({ moveCount: 4 });
    const { update } = renderBoard({ state });
    expect(animate).not.toHaveBeenCalled();

    const move: FenceRaceMove = { kind: "step", ...at("E2") };
    const after = fenceRace.applyMove(state, move);
    update({ state: after, lastEntry: { move } });
    expect(animate).toHaveBeenCalledTimes(1);

    update({ state });
    expect(animate).toHaveBeenCalledTimes(1);
  });

  it("does not move anything with reduced motion", () => {
    const animate = withAnimate();
    const matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    });
    vi.stubGlobal("matchMedia", matchMedia);
    Object.assign(window, { matchMedia });
    try {
      const state = position({ moveCount: 4 });
      const { update } = renderBoard({ state });
      const move: FenceRaceMove = { kind: "step", ...at("E2") };
      act(() => {
        update({ state: fenceRace.applyMove(state, move), lastEntry: { move } });
      });

      expect(animate).not.toHaveBeenCalled();
      // The end of it is on the board all the same.
      expect(svg().querySelector('[data-pawn="0"]')).not.toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

const tag = () => document.querySelector("[data-fence-race-tag]");
const chosenMark = () => svg().querySelector("[data-chosen]");
const walls = () => svg().querySelectorAll("[data-wall]");
const RESIGNED: GameResult = { kind: "win", winners: [1], reason: "resigned" };

describe("Ván kết thúc ngoài luật", () => {
  it("drops the fence tried when the other player resigns, the position unchanged", async () => {
    const user = userEvent.setup();
    const state = position({ moveCount: 2 });
    const { update } = renderBoard({ state, viewer: 0 });
    await tryFence(user, 3.5, 5.02);
    expect(preview()).not.toBeNull();

    update({ state, viewer: 0, disabled: true, result: RESIGNED });

    expect(state.result).toBeNull();
    expect(preview()).toBeNull();
    expect(svg().querySelectorAll("[data-way]")).toHaveLength(0);
    expect(screen.queryByRole("application")).not.toBeInTheDocument();
  });

  it("does not draw a fence sent and never answered", async () => {
    const user = userEvent.setup();
    const state = position({ moveCount: 2 });
    const { update } = renderBoard({ state, viewer: 0 });
    await tryFence(user, 3.5, 5.02);
    await user.click(place());
    expect(walls()).toHaveLength(1);

    update({ state, viewer: 0, disabled: true, result: RESIGNED });

    expect(state.fences).toHaveLength(0);
    expect(walls()).toHaveLength(0);
  });

  it("drops the fence chosen to break", async () => {
    const user = userEvent.setup();
    const state = position({ moveCount: 2, fences: [rowFence(4, "C")] });
    const { update } = renderBoard({ state, viewer: 0 });
    await user.click(mode("Phá rào"));
    tap(layer(), 3, 6);
    expect(chosenMark()).not.toBeNull();

    update({ state, viewer: 0, disabled: true, result: RESIGNED });

    expect(chosenMark()).toBeNull();
    expect(walls()).toHaveLength(1);
  });

  it("drops the finger on the board", async () => {
    const user = userEvent.setup();
    const state = position({ moveCount: 2 });
    const { update } = renderBoard({ state, viewer: 0 });
    await user.click(mode("Đặt rào"));
    drag(layer(), [2, 2], [6, 6]);
    expect(tag()).not.toBeNull();

    update({ state, viewer: 0, disabled: true, result: RESIGNED });

    expect(tag()).toBeNull();
  });

  it("marks every winner: resigning to the AI makes all its seats win", () => {
    renderBoard({
      state: position({ players: 4, pawns: ["E1", "A5", "E9", "I5"] }),
      viewer: 0,
      result: { kind: "win", winners: [1, 2, 3], reason: "resigned" },
    });

    for (const seat of [1, 2, 3]) {
      expect(svg().querySelector(`[data-gate="${seat}"]`)).toHaveAttribute("data-active");
    }
    expect(svg().querySelector('[data-gate="0"]')).not.toHaveAttribute("data-active");
    expect(svg().querySelectorAll("[data-goal]")).toHaveLength(0);
    // The ring goes round the winners' hats, not the one who resigned.
    const ringed = (seat: number) =>
      svg().querySelector(`[data-pawn="${seat}"] .stroke-game-highlight`) !== null;
    expect([0, 1, 2, 3].map(ringed)).toEqual([false, true, true, true]);
  });

  it("marks every winner at a gate, and the cell winners share", () => {
    renderBoard({
      state: position({ players: 4, pawns: ["E1", "E5", "E5", "I5"] }),
      viewer: 0,
      result: { kind: "win", winners: [1, 2], reason: FENCE_RACE_REASON.Goal },
    });

    expect(svg().querySelectorAll("[data-goal]")).toHaveLength(2);
    expect(svg().querySelectorAll("[data-share]")).toHaveLength(1);
  });
});

describe("Giữ phím trên thiết bị dùng chung", () => {
  const state = position({ pawns: ["E5", "E7"], moveCount: 2 });

  it.each(["Enter", " "])("does not press a cell again with %j held down", (key) => {
    renderBoard({ state });

    // Prevented: the browser's click on the cell, which would play the next player's move, is off.
    expect(fireEvent.keyDown(cell("E6"), { key, repeat: true })).toBe(false);
    expect(fireEvent.keyDown(cell("E6"), { key })).toBe(true);
  });

  it.each(["Enter", " "])("does not confirm a fence with %j held down", async (key) => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    renderBoard({ state, onMove });
    await tryFence(user, 3.5, 5.02);

    fireEvent.keyDown(layer(), { key, repeat: true });
    expect(onMove).not.toHaveBeenCalled();

    fireEvent.keyDown(layer(), { key });
    expect(onMove).toHaveBeenCalledTimes(1);
  });

  it("does not press the buttons again either", async () => {
    const user = userEvent.setup();
    renderBoard({ state });
    await user.click(mode("Đặt rào"));

    expect(fireEvent.keyDown(mode("Đi quân"), { key: "Enter", repeat: true })).toBe(false);
  });
});

describe("Mọi rào đều tới được bằng bàn phím", () => {
  // A real record: with the arrows alone, 2,6,h... leave 6,3,v out of reach.
  const FENCES: readonly Fence[] = [
    { row: 1, col: 1, dir: "v" },
    { row: 2, col: 6, dir: "h" },
    { row: 4, col: 0, dir: "h" },
    { row: 4, col: 6, dir: "h" },
    { row: 6, col: 3, dir: "v" },
    { row: 8, col: 0, dir: "h" },
    { row: 8, col: 6, dir: "h" },
    { row: 9, col: 0, dir: "h" },
    { row: 9, col: 7, dir: "v" },
  ];

  it.each([
    ["as it is", 0],
    ["turned", 1],
  ] as const)("reaches all of them with PageDown and PageUp, the board %s", async (_name, seat) => {
    const user = userEvent.setup();
    const state = position({ fences: FENCES, toMove: seat, moveCount: 9 });
    const onMove = vi.fn();
    renderBoard({ state, viewer: seat, onMove });
    await user.click(mode("Phá rào"));
    layer().focus();

    const names = async (key: string) => {
      const seen = new Set<string | null>();
      for (let left = FENCES.length; left > 0; left -= 1) {
        await user.keyboard(key);
        seen.add(layer().getAttribute("aria-label"));
      }
      return seen;
    };
    expect(await names("{PageDown}")).toHaveLength(FENCES.length);
    expect(await names("{PageUp}")).toHaveLength(FENCES.length);

    await user.keyboard("{Enter}");
    expect(onMove).toHaveBeenCalledTimes(1);
  });

  it("says so in the name of the layer, and leaves PageDown to the page in Đặt rào", async () => {
    const user = userEvent.setup();
    renderBoard({ state: position({ fences: FENCES, moveCount: 9 }), viewer: 0 });

    await user.click(mode("Phá rào"));
    expect(layer()).toHaveAccessibleName(/PageUp, PageDown/);

    await user.keyboard("{Escape}");
    await user.click(mode("Đặt rào"));
    layer().focus();
    // Not prevented: the page still scrolls.
    expect(fireEvent.keyDown(layer(), { key: "PageDown" })).toBe(true);
    expect(fireEvent.keyDown(layer(), { key: "PageUp" })).toBe(true);
    expect(preview()).toBeNull();
  });
});

describe("Lý do từ chối chế độ", () => {
  it("gives way to the fence tried", async () => {
    const user = userEvent.setup();
    renderBoard({
      state: position({ moveCount: 2, fences: [rowFence(4, "C")], breaksLeft: [0, 1] }),
      viewer: 0,
    });
    const bad = () => document.querySelector("[data-bad]");

    await user.click(mode("Đặt rào"));
    await user.click(mode("Phá rào"));
    expect(bad()).toHaveTextContent("Đã phá rào");

    tap(layer(), 6.5, 2.02);

    expect(bad()).toBeNull();
    shows(/^Rào giữa/);
  });

  it("gives way to why a fence may not go there", async () => {
    const user = userEvent.setup();
    const fence = rowFence(4, "C");
    renderBoard({ state: position({ moveCount: 2, fences: [fence], breaksLeft: [0, 1] }) });

    await user.click(mode("Đặt rào"));
    await user.click(mode("Phá rào"));
    tap(layer(), fence.col + 1, fence.row + 1);

    expect(document.querySelector("[data-bad]")).not.toHaveTextContent("Đã phá rào");
  });
});

describe("Một ván mới", () => {
  it("drops the mode and the fence tried from the first move, after a game ended", async () => {
    const user = userEvent.setup();
    const state = position();
    const { update } = renderBoard({ state, viewer: 0 });
    await tryFence(user, 3.5, 5.02);

    update({ state, viewer: 0, result: RESIGNED });
    update({ state, viewer: 0 });

    expect(preview()).toBeNull();
    expect(screen.queryByRole("application")).not.toBeInTheDocument();
    expect(mode("Đi quân")).toHaveAttribute("aria-pressed", "true");
  });

  it.each([
    ["seats", { players: 4 }],
    ["seats and size", { players: 3 }],
  ])("drops them with other %s", async (_name, config) => {
    const user = userEvent.setup();
    const { update } = renderBoard({ state: position(), viewer: 0 });
    await tryFence(user, 3.5, 5.02);

    update({ state: position(config), viewer: 0 });

    expect(preview()).toBeNull();
    expect(mode("Đi quân")).toHaveAttribute("aria-pressed", "true");
  });

  it("cannot tell an unfinished game with no move yet from the new one: the states are the same", async () => {
    const user = userEvent.setup();
    const state = position();
    const { update } = renderBoard({ state, viewer: 0 });
    await tryFence(user, 3.5, 5.02);

    update({ state: position(), viewer: 0 });

    expect(preview()).not.toBeNull();
  });
});

describe("Tiêu điểm", () => {
  const start = position({ moveCount: 2 });
  const answered = (fence: Fence): FenceRaceState => ({
    ...start,
    fences: [fence],
    toMove: 1,
    moveCount: 3,
  });

  it("stays on the layer while the move is sent, and comes back there when refused", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    const { update } = renderBoard({ state: start, viewer: 0, onMove });
    mode("Đặt rào").focus();
    await user.keyboard("{Enter}");
    await user.keyboard("{ArrowUp}{Enter}");
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(layer()).toHaveFocus();

    update({ state: start, viewer: 0, disabled: true, lockedReason: "Đang gửi…" });
    expect(layer()).toHaveFocus();

    update({ state: start, viewer: 0 });
    expect(layer()).toHaveFocus();
    const before = layer().getAttribute("aria-label");
    await user.keyboard("r");
    expect(layer().getAttribute("aria-label")).not.toBe(before);

    await user.keyboard("{Escape}");
    expect(mode("Đi quân")).toHaveAttribute("aria-pressed", "true");
    expect(cell("E1")).toHaveFocus();
  });

  it("goes to the pawn when the answer comes", async () => {
    const user = userEvent.setup();
    const { update } = renderBoard({ state: start, viewer: 0 });
    mode("Đặt rào").focus();
    await user.keyboard("{Enter}");
    await user.keyboard("{ArrowUp}{Enter}");

    update({ state: start, viewer: 0, disabled: true, lockedReason: "Đang gửi…" });
    update({ state: answered(rowFence(1, "E")), viewer: 0, disabled: true });

    expect(cell("E1")).toHaveFocus();
  });

  it("goes to the layer, not the page, when the mouse presses the button that goes away", async () => {
    const user = userEvent.setup();
    const { update } = renderBoard({ state: start, viewer: 0 });
    await tryFence(user, 3.5, 5.02);

    await user.click(place());
    update({ state: start, viewer: 0, disabled: true, lockedReason: "Đang gửi…" });

    expect(layer()).toHaveFocus();
  });

  it("follows the pawn when a move by Enter is answered online", async () => {
    const user = userEvent.setup();
    const { update } = renderBoard({ state: start, viewer: 0 });
    cell("E2").focus();
    await user.keyboard("{Enter}");
    update({ state: start, viewer: 0, disabled: true, lockedReason: "Đang gửi…" });

    update({
      state: { ...start, pawns: [at("E2"), at("E11")], toMove: 1, moveCount: 3 },
      viewer: 0,
      disabled: true,
    });

    expect(cell("E2")).toHaveFocus();
    expect(cell("E2")).toHaveAttribute("tabindex", "0");
  });

  it("forgets a move refused: the next position does not take the focus", async () => {
    const user = userEvent.setup();
    const { update } = renderBoard({ state: start, viewer: 0 });
    cell("E2").focus();
    await user.keyboard("{Enter}");
    update({ state: start, viewer: 0, disabled: true, lockedReason: "Đang gửi…" });
    update({ state: start, viewer: 0 });
    cell("C3").focus();

    update({ state: { ...start, toMove: 1, moveCount: 3 }, viewer: 0, disabled: true });

    expect(cell("C3")).toHaveFocus();
  });

  it("leaves the rest of the page alone: typing in the chat keeps it", async () => {
    const user = userEvent.setup();
    const { update } = renderBoard({ state: start, viewer: 0 });
    cell("E2").focus();
    await user.keyboard("{Enter}");
    update({ state: start, viewer: 0, disabled: true, lockedReason: "Đang gửi…" });
    const chat = document.createElement("input");
    document.body.append(chat);
    chat.focus();

    update({
      state: { ...start, pawns: [at("E2"), at("E11")], toMove: 1, moveCount: 3 },
      viewer: 0,
      disabled: true,
    });

    expect(chat).toHaveFocus();
    chat.remove();
  });

  describe("on a shared device", () => {
    // Seat 1 to move, whose pawn is at E9; seat 0's at E3.
    const shared = position({ pawns: ["E3", "E9"], toMove: 1, moveCount: 3 });

    it("Esc goes to the pawn of the player to move, not the one who just moved", async () => {
      const user = userEvent.setup();
      renderBoard({ state: shared });
      mode("Đặt rào").focus();
      await user.keyboard("{Enter}");

      await user.keyboard("{Escape}");

      expect(cell("E9")).toHaveFocus();
    });

    it("the button Đi quân does the same", async () => {
      const user = userEvent.setup();
      renderBoard({ state: shared });
      await user.click(mode("Đặt rào"));
      mode("Đi quân").focus();

      await user.keyboard("{Enter}");

      expect(cell("E9")).toHaveFocus();
    });

    it("a fence confirmed goes to the pawn of who placed it", async () => {
      const user = userEvent.setup();
      const { update } = renderBoard({ state: shared });
      mode("Đặt rào").focus();
      await user.keyboard("{Enter}");
      await user.keyboard("{ArrowUp}{Enter}");

      update({
        state: { ...shared, fences: [rowFence(1, "E")], toMove: 0, moveCount: 4 },
      });

      expect(cell("E9")).toHaveFocus();
    });
  });

  it("Esc works from a cell too, should the focus be there in another mode", async () => {
    const user = userEvent.setup();
    renderBoard({ state: start, viewer: 0 });
    await user.click(mode("Đặt rào"));
    cell("C3").focus();

    await user.keyboard("{Escape}");

    expect(mode("Đi quân")).toHaveAttribute("aria-pressed", "true");
  });
});

describe("Con trỏ trên lớp phủ", () => {
  const start = position({ moveCount: 2, fences: [rowFence(4, "C"), rowFence(7, "F")] });

  it("takes no button but the main one", async () => {
    const user = userEvent.setup();
    renderBoard({ state: start, viewer: 0 });
    await user.click(mode("Đặt rào"));

    fireEvent.pointerDown(layer(), { pointerId: 1, isPrimary: true, button: 2, ...screenAt(2, 2) });

    expect(preview()).toBeNull();
  });

  it("ends the press once no button is down, wherever the lift went", async () => {
    const user = userEvent.setup();
    renderBoard({ state: start, viewer: 0 });
    await user.click(mode("Đặt rào"));
    drag(layer(), [2, 2], [5, 5]);
    expect(tag()).not.toBeNull();
    const before = preview()?.getAttribute("transform");

    fireEvent.pointerMove(layer(), {
      pointerId: 1,
      isPrimary: true,
      buttons: 0,
      ...screenAt(2, 9),
    });

    expect(tag()).toBeNull();
    expect(preview()?.getAttribute("transform")).toBe(before);
    moveTo(layer(), [7, 2]);
    expect(preview()?.getAttribute("transform")).toBe(before);
  });

  it("drops the tag with a lift", async () => {
    const user = userEvent.setup();
    renderBoard({ state: start, viewer: 0 });
    await user.click(mode("Đặt rào"));
    drag(layer(), [2, 2], [5, 5]);

    fireEvent.pointerUp(layer(), { pointerId: 1, isPrimary: true, ...screenAt(5, 5) });

    expect(tag()).toBeNull();
  });

  it("drops the tag with a new position", async () => {
    const user = userEvent.setup();
    const { update } = renderBoard({ state: start, viewer: 0 });
    await user.click(mode("Đặt rào"));
    drag(layer(), [2, 2], [5, 5]);

    update({ state: { ...start, toMove: 1, moveCount: 3 }, viewer: 0, disabled: true });

    expect(tag()).toBeNull();

    // Any tag hides with no fence to name, so a drag left on only shows with the next fence tried.
    update({ state: { ...start, moveCount: 4 }, viewer: 0 });
    await user.click(mode("Đặt rào"));
    fireEvent.keyDown(layer(), { key: "ArrowUp" });
    expect(preview()).not.toBeNull();
    expect(tag()).toBeNull();
  });

  it("drops the tag and the press with Esc during a drag", async () => {
    const user = userEvent.setup();
    renderBoard({ state: start, viewer: 0 });
    await user.click(mode("Đặt rào"));
    drag(layer(), [2, 2], [5, 5]);
    expect(tag()).not.toBeNull();

    fireEvent.keyDown(layer(), { key: "Escape" });
    expect(tag()).toBeNull();

    await user.click(mode("Đặt rào"));
    expect(tag()).toBeNull();
    moveTo(layer(), [7, 2]);
    expect(preview()).toBeNull();

    // Any tag hides with no fence to name, so a drag left on only shows with the next fence tried.
    fireEvent.keyDown(layer(), { key: "ArrowUp" });
    expect(preview()).not.toBeNull();
    expect(tag()).toBeNull();
  });

  it("takes the fence back when the browser takes the pointer", async () => {
    const user = userEvent.setup();
    renderBoard({ state: start, viewer: 0 });
    await user.click(mode("Đặt rào"));
    tap(layer(), 2, 2);
    const before = preview()?.getAttribute("transform");
    drag(layer(), [6, 8], [7, 9]);

    fireEvent.lostPointerCapture(layer(), { pointerId: 1, isPrimary: true });

    expect(tag()).toBeNull();
    expect(preview()?.getAttribute("transform")).toBe(before);
  });

  it("takes the fence chosen to break back on a cancel: a second finger's first", async () => {
    const user = userEvent.setup();
    renderBoard({ state: start, viewer: 0 });
    await user.click(mode("Phá rào"));
    tap(layer(), 3, 6);
    const before = layer().getAttribute("aria-label");

    fireEvent.pointerDown(layer(), { pointerId: 1, isPrimary: true, ...screenAt(6, 3) });
    expect(layer().getAttribute("aria-label")).not.toBe(before);
    fireEvent.pointerCancel(layer(), { pointerId: 1, isPrimary: true });

    expect(layer().getAttribute("aria-label")).toBe(before);
  });

  it("does not move a fence on its way to the server", async () => {
    const user = userEvent.setup();
    renderBoard({ state: start, viewer: 0 });
    await user.click(mode("Đặt rào"));
    drag(layer(), [2, 2], [3, 3]);
    fireEvent.keyDown(layer(), { key: "Enter" });
    const sent = [...walls()].map((wall) => wall.getAttribute("data-wall"));

    moveTo(layer(), [7, 9]);

    expect([...walls()].map((wall) => wall.getAttribute("data-wall"))).toEqual(sent);
  });

  it("does not take a press while locked", async () => {
    const user = userEvent.setup();
    const { update } = renderBoard({ state: start, viewer: 0 });
    await user.click(mode("Đặt rào"));
    tap(layer(), 2, 2);
    const before = preview()?.getAttribute("transform");

    update({ state: start, viewer: 0, disabled: true, lockedReason: "Chờ kết nối lại" });
    fireEvent.pointerDown(layer(), { pointerId: 1, isPrimary: true, ...screenAt(7, 9) });

    expect(preview()?.getAttribute("transform")).toBe(before);
    expect(tag()).toBeNull();
  });
});

describe("Bàn đã quay", () => {
  const seatTwo = position({ toMove: 1, moveCount: 3 });

  it("moves the fence by the arrows as seen on the screen", async () => {
    const user = userEvent.setup();
    renderBoard({ state: seatTwo, viewer: 1 });
    mode("Đặt rào").focus();
    await user.keyboard("{Enter}");

    await user.keyboard("{ArrowUp}");
    expect(layer()).toHaveAccessibleName(/hàng 10 và 11, cột E–F/);

    // Up on the screen is towards row 1 for this player.
    await user.keyboard("{ArrowUp}");
    expect(layer()).toHaveAccessibleName(/hàng 9 và 10, cột E–F/);

    // Right on the screen is towards column A.
    await user.keyboard("{ArrowRight}");
    expect(layer()).toHaveAccessibleName(/hàng 9 và 10, cột D–E/);
  });

  it("says where the player's gate is on this player's screen while waiting", () => {
    renderBoard({
      state: position(),
      disabled: true,
      viewer: 1,
      lockedReason: "Đang chờ Minh",
    });

    expect(screen.getByText(/^Về cổng .* ở cạnh trên/)).toBeInTheDocument();
  });

  it("stretches the touch area of a small cell away from the pawn, as seen on the screen", () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {
          return undefined;
        }
        disconnect() {
          return undefined;
        }
      },
    );
    const measured = vi
      .spyOn(Element.prototype, "getBoundingClientRect")
      .mockImplementation(function measuredBox(this: Element) {
        if (this.hasAttribute("data-fence-race-grid")) {
          return { left: 14, top: 14, width: 18.9 * 9, height: 18.9 * 11 } as DOMRect;
        }
        return { left: 0, top: 0, width: 18.9 * 9 + 28, height: 18.9 * 11 + 28 } as DOMRect;
      });
    try {
      const { unmount } = renderBoard({ state: position({ toMove: 0, moveCount: 2 }), viewer: 0 });
      // Seat 0 at E1 steps to E2: up on its screen, so the area grows upwards.
      const asIs = Number.parseFloat(cell("E2").style.top);
      unmount();
      renderBoard({ state: seatTwo, viewer: 1 });
      // Seat 1 at E11 steps to E10: up on its own turned screen as well.
      expect(Number.parseFloat(cell("E10").style.top)).toBe(asIs);
      expect(asIs).toBeLessThan(0);
    } finally {
      measured.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});

describe("Trong lúc nước đang gửi", () => {
  const start = position({ moveCount: 2 });
  const wallsNow = () => [...walls()].map((wall) => wall.getAttribute("data-wall"));

  it("Tiêu điểm khi nước đang gửi: R, the arrows and Esc do nothing yet", async () => {
    const user = userEvent.setup();
    const { update } = renderBoard({ state: start, viewer: 0 });
    mode("Đặt rào").focus();
    await user.keyboard("{Enter}");
    await user.keyboard("{ArrowUp}{Enter}");
    update({ state: start, viewer: 0, disabled: true, lockedReason: "Đang gửi…" });
    const sent = wallsNow();
    expect(sent).toHaveLength(1);
    const name = layer().getAttribute("aria-label");

    await user.keyboard("r");
    await user.keyboard("{ArrowUp}");
    await user.keyboard("{Escape}");

    expect(layer()).toHaveFocus();
    expect(layer()).toHaveAttribute("data-fence-race-layer", "place");
    expect(layer().getAttribute("aria-label")).toBe(name);
    expect(wallsNow()).toEqual(sent);
  });

  it("does not turn the fence sent when the finger held on it lifts", async () => {
    const user = userEvent.setup();
    renderBoard({ state: start, viewer: 0 });
    await user.click(mode("Đặt rào"));
    tap(layer(), 3.5, 5.02);
    fireEvent.pointerDown(layer(), { pointerId: 1, isPrimary: true, ...screenAt(3.5, 5.02) });
    fireEvent.keyDown(layer(), { key: "Enter" });
    const sent = wallsNow();
    expect(sent).toHaveLength(1);

    fireEvent.pointerUp(layer(), { pointerId: 1, isPrimary: true, ...screenAt(3.5, 5.02) });

    expect(wallsNow()).toEqual(sent);
  });

  it("does not take the fence sent back when the browser takes the pointer", async () => {
    const user = userEvent.setup();
    renderBoard({ state: start, viewer: 0 });
    await user.click(mode("Đặt rào"));
    tap(layer(), 2, 2);
    fireEvent.pointerDown(layer(), { pointerId: 1, isPrimary: true, ...screenAt(6.3, 8) });
    fireEvent.keyDown(layer(), { key: "Enter" });
    const sent = wallsNow();
    expect(sent).toHaveLength(1);

    fireEvent.pointerCancel(layer(), { pointerId: 1, isPrimary: true });

    expect(wallsNow()).toEqual(sent);
  });

  it("does not turn the fence from the button with the connection lost, as R does not", async () => {
    const user = userEvent.setup();
    const { update } = renderBoard({ state: start, viewer: 0 });
    await user.click(mode("Đặt rào"));
    tap(layer(), 3.5, 5.02);
    const before = preview()?.getAttribute("transform");

    update({ state: start, viewer: 0, disabled: true, lockedReason: "Chờ kết nối lại" });
    await user.click(screen.getByRole("button", { name: "Xoay" }));
    expect(preview()?.getAttribute("transform")).toBe(before);

    update({ state: start, viewer: 0 });
    await user.click(screen.getByRole("button", { name: "Xoay" }));
    expect(preview()?.getAttribute("transform")).not.toBe(before);
  });

  it("forgets the move when the game ends unanswered: the next game does not take the focus", async () => {
    const user = userEvent.setup();
    const { update } = renderBoard({ state: start, viewer: 0 });
    mode("Đặt rào").focus();
    await user.keyboard("{Enter}");
    await user.keyboard("{ArrowUp}{Enter}");
    update({ state: start, viewer: 0, disabled: true, lockedReason: "Đang gửi…" });

    update({ state: start, viewer: 0, disabled: true, result: RESIGNED });
    expect(document.body).toHaveFocus();
    update({ state: position(), viewer: 0 });

    expect(document.body).toHaveFocus();
  });

  it("still follows the pawn after the move that wins the game", async () => {
    const user = userEvent.setup();
    const near = position({ moveCount: 2, pawns: ["E10", "A5"] });
    const { update } = renderBoard({ state: near, viewer: 0 });
    cell("E11").focus();
    await user.keyboard("{Enter}");

    update({
      state: {
        ...near,
        pawns: [at("E11"), at("A5")],
        toMove: 1,
        moveCount: 3,
        result: { kind: "win", winners: [0], reason: FENCE_RACE_REASON.Goal },
      },
      viewer: 0,
      disabled: true,
    });

    expect(cell("E11")).toHaveFocus();
  });
});

describe("Phím kèm phím bổ trợ", () => {
  it.each(["ctrlKey", "metaKey", "altKey"])("leaves R with %s to the browser", async (modifier) => {
    const user = userEvent.setup();
    renderBoard({ state: position({ moveCount: 2 }), viewer: 0 });
    await user.click(mode("Đặt rào"));
    tap(layer(), 3.5, 5.02);
    const before = preview()?.getAttribute("transform");

    expect(fireEvent.keyDown(layer(), { key: "r", [modifier]: true })).toBe(true);

    expect(preview()?.getAttribute("transform")).toBe(before);
    expect(fireEvent.keyDown(layer(), { key: "r" })).toBe(false);
    expect(preview()?.getAttribute("transform")).not.toBe(before);
  });
});

describe("Space ở chế độ Đi quân", () => {
  it("plays the move", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    renderBoard({ onMove, viewer: 0 });
    cell("E2").focus();

    await user.keyboard(" ");

    expect(onMove).toHaveBeenCalledExactlyOnceWith({ kind: "step", ...at("E2") });
  });
});

describe("Quân thắng đứng chung ô", () => {
  it("marks the cell and the goal, not a hat of it", () => {
    renderBoard({
      state: position({ pawns: ["E11", "E11"], moveCount: 21, toMove: 1 }),
      viewer: 0,
      result: { kind: "win", winners: [0], reason: FENCE_RACE_REASON.Goal },
    });

    expect(svg().querySelectorAll("[data-share]")).toHaveLength(1);
    expect(svg().querySelectorAll("[data-goal]")).toHaveLength(1);
    expect(svg().querySelectorAll("[data-pawn] .stroke-game-highlight")).toHaveLength(0);
  });
});
