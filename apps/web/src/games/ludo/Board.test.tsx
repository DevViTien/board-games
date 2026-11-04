import {
  IN_STABLE,
  ludo,
  LUDO_DEFAULT_OPTIONS,
  type LudoColour,
  type LudoEvent,
  type LudoMove,
  type LudoOutcome,
  type LudoState,
  OWN_GATE,
} from "@board-games/games/ludo";
import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import { type BoardProps, defaultBoardLayout } from "../types";
import { LudoBoard } from "./Board";
import { horsePoint } from "./board-layout";

const S = IN_STABLE;
const step = (k: number) => OWN_GATE + k;

/** A position: each seat's horses by progress (missing: in the stable). */
function position(
  players: 2 | 3 | 4,
  horses: Readonly<Record<number, readonly number[]>>,
  extra: Partial<LudoState> = {},
): LudoState {
  const start = ludo.setup({ playerCount: players, options: LUDO_DEFAULT_OPTIONS });
  return {
    ...start,
    horses: start.horses.map((own, seat) => own.map((p, horse) => horses[seat]?.[horse] ?? p)),
    ...extra,
  };
}

function boardProps(
  state: LudoState,
  overrides: Partial<BoardProps<LudoState, LudoMove, LudoOutcome>> = {},
): BoardProps<LudoState, LudoMove, LudoOutcome> {
  return {
    state,
    legalMoves: ludo.legalMoves(state),
    onMove: vi.fn(),
    disabled: false,
    result: ludo.result(state),
    lastEntry: null,
    viewer: null,
    layout: defaultBoardLayout,
    ...overrides,
  };
}

/** A board whose parent plays each move, rolling the faces given in turn, like the play screen. */
function PlayableBoard({ start, faces }: { start: LudoState; faces: LudoOutcome[] }) {
  const [state, setState] = useState(start);
  return (
    <LudoBoard
      {...boardProps(state, {
        onMove: (move) => {
          setState(ludo.applyMove(state, move, move.type === "roll" ? faces.shift() : undefined));
        },
      })}
    />
  );
}

const rollButton = () => screen.getByRole("button", { name: "Gieo xúc xắc" });
const choiceGroup = () => screen.getByRole("group", { name: "Chọn ngựa" });
const positions = () => within(screen.getByRole("list", { name: "Vị trí các ngựa" }));

describe("Bàn Cờ cá ngựa", () => {
  it("Phân biệt không chỉ bằng màu: each colour's horses carry their own symbol", () => {
    const { container } = renderWithIntl(<LudoBoard {...boardProps(position(4, {}))} />);

    const symbolOf = (colour: string) => {
      const symbol = container.querySelector(`g[data-colour="${colour}"] [data-symbol] > *`);
      return `${symbol?.tagName ?? ""}:${symbol?.getAttribute("points")?.split(" ").length ?? 0}`;
    };
    const symbols = ["red", "blue", "yellow", "green"].map(symbolOf);
    expect(symbols).toEqual(["circle:0", "rect:0", "polygon:3", "polygon:4"]);
    expect(container.querySelectorAll("g[data-colour]")).toHaveLength(16);
  });

  it("Đánh dấu nước vừa đi: the horse just moved, a die waiting for Yellow, the roll before", () => {
    const last: LudoEvent = {
      kind: "move",
      player: 1,
      horse: 1,
      face: 4,
      from: 2,
      to: 6,
      kicked: null,
      again: false,
    };
    const { container } = renderWithIntl(
      <LudoBoard {...boardProps(position(4, { 1: [S, 6] }, { toMove: 2, last }))} />,
    );

    expect(positions().getByText("Xanh dương, ngựa 2: ô 7 (vừa đi)")).toBeInTheDocument();
    expect(container.querySelectorAll("g[data-last]")).toHaveLength(1);
    expect(container.querySelector("g[data-last]")).toHaveAttribute("data-colour", "blue");
    // No number yet, framed in the colour of the player about to roll.
    const die = screen.getByRole("img", { name: "Xúc xắc: Vàng sắp gieo" });
    expect(die).toHaveAttribute("data-colour", "yellow");
    expect(die).toHaveAttribute("data-waiting", "true");
    expect(screen.getByText("Lượt trước: Xanh dương gieo được 4")).toBeInTheDocument();
  });

  it("Xúc xắc khi đang chọn ngựa: the number rolled, in the colour of the player choosing", () => {
    const last: LudoEvent = { kind: "roll", player: 0, face: 6, lost: false, again: false };
    renderWithIntl(<LudoBoard {...boardProps(position(4, { 0: [10] }, { die: 6, last }))} />);

    const die = screen.getByRole("img", { name: "Xúc xắc: 6 (Đỏ)" });
    expect(die).toHaveAttribute("data-colour", "red");
    expect(die).not.toHaveAttribute("data-waiting");
    // The roll is the die's: no chip of a roll before.
    expect(screen.queryByText(/^Lượt trước/)).not.toBeInTheDocument();
  });

  it("Nút gieo theo màu người sắp gieo: Blue's colour once Red has moved", () => {
    const last: LudoEvent = {
      kind: "move",
      player: 0,
      horse: 0,
      face: 3,
      from: 10,
      to: 13,
      kicked: null,
      again: false,
    };
    renderWithIntl(<LudoBoard {...boardProps(position(4, { 0: [13] }, { toMove: 1, last }))} />);

    expect(rollButton()).toHaveAttribute("aria-disabled", "false");
    expect(rollButton()).toHaveClass("bg-piece-blue", "text-piece-blue-ink");
    expect(rollButton()).not.toHaveClass("bg-piece-red");
    expect(screen.getByRole("img", { name: "Xúc xắc: Xanh dương sắp gieo" })).toHaveAttribute(
      "data-colour",
      "blue",
    );
  });

  it("keeps a locked roll button on the board, in the shared locked look", () => {
    const last: LudoEvent = { kind: "roll", player: 0, face: 6, lost: false, again: false };
    renderWithIntl(<LudoBoard {...boardProps(position(4, { 0: [10] }, { die: 6, last }))} />);

    // Choosing a horse: the button stays (somewhere for the focus to go), locked.
    expect(rollButton()).toHaveAttribute("aria-disabled", "true");
    expect(rollButton()).toHaveClass(
      "aria-disabled:bg-surface-muted!",
      "aria-disabled:border-dashed!",
      "aria-disabled:text-fg-muted!",
    );
  });

  it("shows a die waiting for Red's first roll", () => {
    renderWithIntl(<LudoBoard {...boardProps(position(2, {}))} />);

    // A face of its own, not an empty box: waiting to be rolled.
    const die = screen.getByRole("img", { name: "Xúc xắc: Đỏ sắp gieo" });
    expect(die).toHaveAttribute("data-waiting", "true");
    expect(die).toHaveAttribute("data-colour", "red");
    expect(screen.queryByText(/^Lượt trước/)).not.toBeInTheDocument();
  });

  it("tells the roll before once the same player rolls again after a 6", () => {
    const last: LudoEvent = {
      kind: "move",
      player: 0,
      horse: 0,
      face: 6,
      from: IN_STABLE,
      to: 0,
      kicked: null,
      again: true,
    };
    renderWithIntl(<LudoBoard {...boardProps(position(2, { 0: [0] }, { toMove: 0, last }))} />);

    expect(screen.getByRole("img", { name: "Xúc xắc: Đỏ sắp gieo" })).toBeInTheDocument();
    expect(screen.getByText("Lượt trước: Đỏ gieo được 6")).toBeInTheDocument();
  });
});

describe("Chuồng của người đang đến lượt", () => {
  const activeStables = (container: HTMLElement) =>
    [...container.querySelectorAll("g[data-stable][data-active]")].map((stable) =>
      stable.getAttribute("data-stable"),
    );

  it("Chuyển lượt sang người kế tiếp: Blue's stable stands out once Red has moved", async () => {
    const { container } = renderWithIntl(
      <PlayableBoard start={position(4, { 0: [10] })} faces={[3]} />,
    );
    expect(activeStables(container)).toEqual(["red"]);

    await userEvent.click(rollButton());
    await userEvent.click(screen.getByRole("button", { name: "Ngựa 1: tới ô 14" }));

    expect(activeStables(container)).toEqual(["blue"]);
  });

  it("Ván kết thúc: no stable stands out, and the die shows the winning roll", () => {
    // Yellow's last horse has just gone up to step 3 with a 2.
    const last: LudoEvent = {
      kind: "move",
      player: 1,
      horse: 3,
      face: 2,
      from: step(1),
      to: step(3),
      kicked: null,
      again: false,
    };
    const won = position(2, { 1: [step(6), step(5), step(4), step(3)] }, { winner: 1, last });
    const { container } = renderWithIntl(<LudoBoard {...boardProps(won)} />);

    expect(activeStables(container)).toEqual([]);
    expect(container.querySelectorAll("g[data-stable]")).toHaveLength(4);
    // Nobody is about to roll: the last number rolled, in its roller's colour, and no chip.
    expect(screen.getByRole("img", { name: "Xúc xắc: 2 (Vàng)" })).toHaveAttribute(
      "data-colour",
      "yellow",
    );
    expect(screen.queryByRole("img", { name: /sắp gieo/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/^Lượt trước/)).not.toBeInTheDocument();
  });
});

describe("Gieo và chọn ngựa trên bàn", () => {
  it("Gieo xúc xắc: shows the number rolled", async () => {
    renderWithIntl(<PlayableBoard start={position(2, { 0: [10] })} faces={[5]} />);

    await userEvent.click(rollButton());

    expect(screen.getByRole("img", { name: "Xúc xắc: 5 (Đỏ)" })).toBeInTheDocument();
    expect(
      screen.getByText("Đỏ gieo được 5. Chọn một ngựa được đánh dấu để đi."),
    ).toBeInTheDocument();
  });

  it("Chọn ngựa: bring a horse out, or move one onto a Yellow horse and kick it", () => {
    // Yellow's progress 44 is Red's square 16, six squares ahead of Red's horse 2.
    const state = position(2, { 0: [S, 10, step(6), step(5)], 1: [44] }, { die: 6 });
    renderWithIntl(<LudoBoard {...boardProps(state)} />);

    const choices = within(choiceGroup()).getAllByRole("button");
    expect(choices.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Ngựa 1: ra chuồng",
      "Ngựa 2: tới ô 17, đá ngựa Vàng",
    ]);
  });

  it("offers no choice for a horse that cannot move", () => {
    const state = position(2, { 0: [S, 10, step(6), step(5)] }, { die: 3 });
    renderWithIntl(<LudoBoard {...boardProps(state)} />);

    expect(within(choiceGroup()).getAllByRole("button")).toHaveLength(1);
    expect(rollButton()).toHaveAttribute("aria-disabled", "true");
  });

  it("plays the chosen horse", async () => {
    const onMove = vi.fn();
    const state = position(2, { 0: [S, 10] }, { die: 6 });
    renderWithIntl(<LudoBoard {...boardProps(state, { onMove })} />);

    await userEvent.click(screen.getByRole("button", { name: "Ngựa 2: tới ô 17" }));

    expect(onMove).toHaveBeenCalledWith({ type: "move", horse: 1 });
  });

  it("Báo mất lượt", async () => {
    renderWithIntl(<PlayableBoard start={position(2, {})} faces={[3]} />);

    await userEvent.click(rollButton());

    expect(
      screen.getByText("Đỏ gieo được 3. Không ngựa nào đi được, mất lượt."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Chọn ngựa" })).not.toBeInTheDocument();
  });

  it("Gieo 6 không đi được: told as a roll again, not a lost turn", async () => {
    const start = position(2, { 0: [OWN_GATE - 3, step(6), step(5), step(4)] });
    renderWithIntl(<PlayableBoard start={start} faces={[6]} />);

    await userEvent.click(rollButton());

    expect(
      screen.getByText("Đỏ gieo được 6 nhưng không ngựa nào đi được, gieo thêm."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/mất lượt/)).not.toBeInTheDocument();
    expect(rollButton()).toHaveAttribute("aria-disabled", "false");
  });

  it("Ô đích khi đưa tiêu điểm: the horse and its square stand out", async () => {
    const state = position(2, { 0: [S, 10] }, { die: 6 });
    const { container } = renderWithIntl(<LudoBoard {...boardProps(state)} />);
    expect(container.querySelector("[data-target]")).toBeNull();

    screen.getByRole("button", { name: "Ngựa 2: tới ô 17" }).focus();

    await vi.waitFor(() => {
      expect(container.querySelector("[data-target]")).not.toBeNull();
    });
    expect(container.querySelector("g[data-highlighted]")).toHaveAttribute("data-colour", "red");
    expect(container.querySelector("g[data-ghost]")).not.toBeNull();
  });

  it("offers nothing while the board is disabled", () => {
    const state = position(2, { 0: [10] }, { die: 3 });
    renderWithIntl(<LudoBoard {...boardProps(state, { disabled: true })} />);

    expect(screen.queryByRole("group", { name: "Chọn ngựa" })).not.toBeInTheDocument();
    expect(rollButton()).toHaveAttribute("aria-disabled", "true");
  });
});

describe("Cờ cá ngựa bằng bàn phím và trình đọc màn hình", () => {
  it("Gieo và đi bằng bàn phím", async () => {
    const user = userEvent.setup();
    renderWithIntl(<PlayableBoard start={position(2, { 0: [10, 30] })} faces={[4]} />);

    await user.tab();
    expect(rollButton()).toHaveFocus();
    await user.keyboard("{Enter}");

    const [first] = within(choiceGroup()).getAllByRole("button");
    expect(first).toHaveFocus();
    expect(first).toHaveAccessibleName("Ngựa 1: tới ô 15");
    await user.keyboard("{Enter}");

    expect(rollButton()).toHaveFocus();
    expect(positions().getByText("Đỏ, ngựa 1: ô 15 (vừa đi)")).toBeInTheDocument();
  });

  it("keeps the focus on the roll button when the turn is lost", async () => {
    const user = userEvent.setup();
    renderWithIntl(<PlayableBoard start={position(2, {})} faces={[2]} />);

    await user.tab();
    await user.keyboard("{Enter}");

    expect(rollButton()).toHaveFocus();
  });

  it("Đọc vị trí ngựa", () => {
    const state = position(2, { 0: [16, S, OWN_GATE, step(3)] });
    renderWithIntl(<LudoBoard {...boardProps(state)} />);

    const list = positions();
    expect(list.getByText("Đỏ, ngựa 1: ô 17")).toBeInTheDocument();
    expect(list.getByText("Đỏ, ngựa 2: trong chuồng")).toBeInTheDocument();
    expect(list.getByText("Đỏ, ngựa 3: chân chuồng")).toBeInTheDocument();
    expect(list.getByText("Đỏ, ngựa 4: bậc 3")).toBeInTheDocument();
    expect(list.getByText("Vàng, ngựa 1: trong chuồng")).toBeInTheDocument();
    expect(list.getAllByRole("listitem")).toHaveLength(8);
  });

  it("reads out only the roll of a person at this device", () => {
    const aiRolled: LudoEvent = { kind: "roll", player: 1, face: 3, lost: true, again: false };
    const { container, rerender } = renderWithIntl(
      <LudoBoard {...boardProps(position(2, {}, { last: aiRolled }), { viewer: 0 })} />,
    );

    const live = container.querySelector('[aria-live="polite"]');
    expect(live).toHaveTextContent("");
    // Shown, not read out: the play screen's status line tells the AI's roll.
    expect(screen.getByText("Vàng gieo được 3. Không ngựa nào đi được, mất lượt.")).toBeVisible();

    const ownRoll: LudoEvent = { kind: "roll", player: 0, face: 2, lost: true, again: false };
    rerender(
      <LudoBoard {...boardProps(position(2, {}, { last: ownRoll, toMove: 1 }), { viewer: 0 })} />,
    );
    expect(live).toHaveTextContent("Đỏ gieo được 2. Không ngựa nào đi được, mất lượt.");
  });

  it("does not tell the player to choose after someone else's roll", () => {
    const aiRolled: LudoEvent = { kind: "roll", player: 1, face: 4, lost: false, again: false };
    const state = position(2, { 1: [10] }, { last: aiRolled, toMove: 1, die: 4 });
    renderWithIntl(<LudoBoard {...boardProps(state, { viewer: 0, disabled: true })} />);

    expect(screen.getByText("Vàng gieo được 4.")).toBeVisible();
    expect(screen.queryByText(/Chọn một ngựa/)).not.toBeInTheDocument();
  });

  it("tells a roll again after a 6", () => {
    const moved: LudoEvent = {
      kind: "move",
      player: 0,
      horse: 0,
      face: 6,
      from: S,
      to: 0,
      kicked: null,
      again: true,
    };
    renderWithIntl(<LudoBoard {...boardProps(position(2, { 0: [0] }, { last: moved }))} />);

    expect(screen.getByText("Đỏ được gieo thêm.")).toBeInTheDocument();
  });

  it("marks the horse just kicked in the list of positions", () => {
    const moved: LudoEvent = {
      kind: "move",
      player: 0,
      horse: 0,
      face: 3,
      from: 13,
      to: 16,
      kicked: { player: 1, horse: 2, from: 44 },
      again: false,
    };
    renderWithIntl(
      <LudoBoard {...boardProps(position(2, { 0: [16] }, { last: moved, toMove: 1 }))} />,
    );

    expect(positions().getByText("Vàng, ngựa 3: trong chuồng (vừa bị đá)")).toBeInTheDocument();
  });
});

describe("Lý do không gieo được", () => {
  it("Cần chọn ngựa trước: the roll button says a horse must be chosen first", async () => {
    const choosing = ludo.applyMove(position(2, {}), { type: "roll" }, 6);
    renderWithIntl(<LudoBoard {...boardProps(choosing)} />);
    expect(rollButton()).toHaveAccessibleDescription("Chọn ngựa trước");
    expect(screen.getByText("Chọn ngựa trước")).toHaveClass("sr-only");

    await userEvent.tab();
    while (document.activeElement !== rollButton()) await userEvent.tab();

    expect(screen.getByText("Chọn ngựa trước")).not.toHaveClass("sr-only");
  });

  it("Đang chờ người ở xa: a press rolls nothing and says who the game waits for", async () => {
    const onMove = vi.fn();
    renderWithIntl(
      <LudoBoard
        {...boardProps(position(2, {}), {
          disabled: true,
          lockedReason: "Đang chờ Minh",
          viewer: 1,
          onMove,
        })}
      />,
    );

    await userEvent.click(rollButton());

    expect(onMove).not.toHaveBeenCalled();
    expect(rollButton()).toHaveAccessibleDescription("Đang chờ Minh");
    expect(screen.getByText("Đang chờ Minh")).not.toHaveClass("sr-only");
  });

  it("says the play screen's reason while the board is locked", () => {
    renderWithIntl(
      <LudoBoard
        {...boardProps(position(2, {}), {
          disabled: true,
          lockedReason: "Chờ kết nối lại với máy chủ",
        })}
      />,
    );

    expect(rollButton()).toHaveAccessibleDescription("Chờ kết nối lại với máy chủ");
  });

  it("says nothing while the roll button can be pressed", () => {
    renderWithIntl(<LudoBoard {...boardProps(position(2, {}))} />);

    expect(rollButton()).not.toHaveAccessibleDescription();
  });
});

/** The board's frame laid out 300 px wide (a cell is 20 px), at the top left of the screen. */
function layOutBoard(container: HTMLElement): HTMLElement {
  const frame = container.querySelector<HTMLElement>("[data-ludo-board]");
  if (frame === null) throw new Error("No board");
  vi.spyOn(frame, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 300, (300 * 15.3) / 15),
  );
  return frame;
}

/** A touch at a point of the board (in cells), pressed and let go on the board. */
function touchAt(frame: HTMLElement, point: { x: number; y: number }) {
  const clientX = point.x * 20;
  const clientY = (point.y + 0.3) * 20;
  fireEvent.pointerDown(frame, { pointerId: 1, isPrimary: true, clientX, clientY });
  fireEvent.click(frame, { clientX, clientY });
}

/** Where a horse's figure stands: its square's centre, raised. */
function figureOf(colour: LudoColour, horse: number, progress: number) {
  const at = horsePoint(colour, horse, progress);
  return { x: at.x, y: at.y - 0.3 };
}

describe("Chạm ngựa để đi", () => {
  it("Một chạm là đi: a touch on a horse that may move moves it, with no confirming", () => {
    const onMove = vi.fn();
    const state = position(2, { 0: [10, 30] }, { die: 5 });
    const { container } = renderWithIntl(<LudoBoard {...boardProps(state, { onMove })} />);

    touchAt(layOutBoard(container), figureOf(0, 0, 10));

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith({ type: "move", horse: 0 });
  });

  it("Chạm ngựa không đi được: nothing moves, the horses to choose still stand out", () => {
    const onMove = vi.fn();
    // Horse 1 is blocked by horse 2, one square ahead.
    const state = position(2, { 0: [10, 11] }, { die: 3 });
    const { container } = renderWithIntl(<LudoBoard {...boardProps(state, { onMove })} />);
    expect(ludo.legalMoves(state)).toEqual([{ type: "move", horse: 1 }]);

    touchAt(layOutBoard(container), figureOf(0, 0, 10));

    expect(onMove).not.toHaveBeenCalled();
    expect(container.querySelectorAll("g[data-colour][data-movable]")).toHaveLength(1);
  });

  it("Chạm ngựa không đi được cạnh ngựa đi được: a touch on the Yellow horse next to one that may move moves nothing", () => {
    const onMove = vi.fn();
    // Red's horse on its square 12, Yellow's on the square right after it (Red's square 13).
    const state = position(2, { 0: [11], 1: [40] }, { die: 1 });
    const { container } = renderWithIntl(<LudoBoard {...boardProps(state, { onMove })} />);
    const red = figureOf(0, 0, 11);
    const yellow = figureOf(2, 0, 40);
    expect(Math.hypot(red.x - yellow.x, red.y - yellow.y)).toBeCloseTo(1);

    touchAt(layOutBoard(container), yellow);

    expect(onMove).not.toHaveBeenCalled();
  });

  it("Hai ngựa chọn được nằm sát nhau: the horse nearest the touch moves", () => {
    const onMove = vi.fn();
    // Horse 1 on square 3 (column 8), horse 2 on home step 2 (column 7), side by side.
    const state = position(2, { 0: [2, step(2)] }, { die: 3 });
    const { container } = renderWithIntl(<LudoBoard {...boardProps(state, { onMove })} />);
    expect(ludo.legalMoves(state)).toEqual([
      { type: "move", horse: 0 },
      { type: "move", horse: 1 },
    ]);

    // Between the two, nearer the second.
    const second = figureOf(0, 1, step(2));
    touchAt(layOutBoard(container), { x: second.x + 0.3, y: second.y });

    expect(onMove).toHaveBeenCalledWith({ type: "move", horse: 1 });
  });

  it("moves nothing on a touch before the roll", () => {
    const onMove = vi.fn();
    const { container } = renderWithIntl(
      <LudoBoard {...boardProps(position(2, { 0: [10] }), { onMove })} />,
    );

    touchAt(layOutBoard(container), figureOf(0, 0, 10));

    expect(onMove).not.toHaveBeenCalled();
  });

  it("moves the horse when the click of a touch carries another pointer id than its press", () => {
    const onMove = vi.fn();
    const state = position(2, { 0: [10] }, { die: 5 });
    const { container } = renderWithIntl(<LudoBoard {...boardProps(state, { onMove })} />);
    const frame = layOutBoard(container);
    const at = figureOf(0, 0, 10);
    const clientX = at.x * 20;
    const clientY = (at.y + 0.3) * 20;

    fireEvent.pointerDown(frame, { pointerId: 2, isPrimary: true, clientX, clientY });
    fireEvent(frame, new PointerEvent("click", { bubbles: true, pointerId: 7, clientX, clientY }));

    expect(onMove).toHaveBeenCalledWith({ type: "move", horse: 0 });
  });

  it("moves nothing when the browser cancelled the press (a scroll)", () => {
    const onMove = vi.fn();
    const state = position(2, { 0: [10] }, { die: 5 });
    const { container } = renderWithIntl(<LudoBoard {...boardProps(state, { onMove })} />);
    const frame = layOutBoard(container);
    const at = figureOf(0, 0, 10);

    fireEvent.pointerDown(frame, { pointerId: 1, isPrimary: true });
    fireEvent.pointerCancel(frame, { pointerId: 1 });
    fireEvent.click(frame, { clientX: at.x * 20, clientY: (at.y + 0.3) * 20 });

    expect(onMove).not.toHaveBeenCalled();
  });

  it("moves nothing on a click that was not pressed on the board", () => {
    const onMove = vi.fn();
    const state = position(2, { 0: [10] }, { die: 5 });
    const { container } = renderWithIntl(<LudoBoard {...boardProps(state, { onMove })} />);
    const frame = layOutBoard(container);
    const at = figureOf(0, 0, 10);

    fireEvent.click(frame, { clientX: at.x * 20, clientY: (at.y + 0.3) * 20 });

    expect(onMove).not.toHaveBeenCalled();
  });

  it("Không còn danh sách lựa chọn: the horses to choose stand out on the board, no list beside it", () => {
    const state = position(2, { 0: [S, 10, step(6), step(5)] }, { die: 6 });
    const { container } = renderWithIntl(<LudoBoard {...boardProps(state)} />);

    const frame = container.querySelector("[data-ludo-board]");
    const choices = container.querySelectorAll("[data-ludo-choice]");
    expect(choices).toHaveLength(2);
    for (const choice of choices) expect(frame?.contains(choice)).toBe(true);
    expect(container.querySelectorAll("g[data-colour][data-movable]")).toHaveLength(2);
    expect(container.querySelectorAll("[data-ring]")).toHaveLength(2);
  });

  it("Chuyển ngựa bằng phím mũi tên: the arrows go from one horse to the next, Tab leaves them", async () => {
    const user = userEvent.setup();
    const state = position(2, { 0: [S, 10, step(6), step(5)] }, { die: 6 });
    renderWithIntl(
      <>
        <LudoBoard {...boardProps(state)} />
        <button type="button">Sau</button>
      </>,
    );
    const [first, second] = within(choiceGroup()).getAllByRole("button");

    first?.focus();
    expect(first).toHaveAttribute("tabindex", "0");
    expect(second).toHaveAttribute("tabindex", "-1");
    await user.keyboard("{ArrowRight}");
    expect(second).toHaveFocus();
    expect(second).toHaveAttribute("tabindex", "0");
    await user.keyboard("{ArrowRight}");
    expect(first).toHaveFocus();

    await user.tab();
    expect(choiceGroup().contains(document.activeElement)).toBe(false);
  });

  it("sizes each target at least 24 px and centres it on its horse", () => {
    const state = position(2, { 0: [10] }, { die: 5 });
    renderWithIntl(<LudoBoard {...boardProps(state)} />);

    const [target] = within(choiceGroup()).getAllByRole("button");
    expect(target).toHaveClass("w-[max(24px,calc(100%*1.36/15))]", "aspect-square");
    const { x, y } = figureOf(0, 0, 10);
    expect(parseFloat(target?.style.left ?? "")).toBeCloseTo((x / 15) * 100);
    expect(parseFloat(target?.style.top ?? "")).toBeCloseTo(((y + 0.3) / 15.3) * 100);
  });
});

describe("Quân hình con ngựa", () => {
  it("Quân hình con ngựa: a Red horse on the track is a horse figure with Red's circle on its base", () => {
    const { container } = renderWithIntl(<LudoBoard {...boardProps(position(2, { 0: [10] }))} />);

    const red = container.querySelector('g[data-colour="red"]');
    // The head and the base, and the colour's symbol on the base.
    expect(red?.querySelectorAll("path").length).toBeGreaterThanOrEqual(2);
    expect(red?.querySelector("[data-symbol] > circle")).not.toBeNull();
  });

  it("keeps room above the top row for the horses standing there", () => {
    const { container } = renderWithIntl(<LudoBoard {...boardProps(position(2, { 0: [0] }))} />);

    expect(container.querySelector("svg")).toHaveAttribute("viewBox", "0 -0.3 15 15.3");
    expect(container.querySelector("[data-ludo-board]")).toHaveClass("aspect-[15/15.3]");
  });
});

describe("Nút gieo trên điện thoại", () => {
  it("never scrolls, selects or opens a menu on a long press, and stays the same button", () => {
    renderWithIntl(<LudoBoard {...boardProps(position(2, {}))} />);

    expect(rollButton()).toHaveClass("touch-none", "select-none", "[-webkit-touch-callout:none]");
    const menu = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    rollButton().dispatchEvent(menu);
    expect(menu.defaultPrevented).toBe(true);
    // Still the roll button, in the colour of the player to roll.
    expect(rollButton()).toHaveAttribute("aria-disabled", "false");
    expect(rollButton()).toHaveClass("bg-piece-red");
  });
});
