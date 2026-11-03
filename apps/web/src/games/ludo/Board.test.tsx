import {
  IN_STABLE,
  ludo,
  LUDO_DEFAULT_OPTIONS,
  type LudoEvent,
  type LudoMove,
  type LudoOutcome,
  type LudoState,
  OWN_GATE,
} from "@board-games/games/ludo";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import type { BoardProps } from "../types";
import { LudoBoard } from "./Board";

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
      const horse = container.querySelector(`g[data-colour="${colour}"]`);
      const symbol = horse?.lastElementChild;
      return `${symbol?.tagName ?? ""}:${symbol?.getAttribute("points")?.split(" ").length ?? 0}`;
    };
    const symbols = ["red", "blue", "yellow", "green"].map(symbolOf);
    expect(symbols).toEqual(["circle:0", "rect:0", "polygon:3", "polygon:4"]);
    expect(container.querySelectorAll("g[data-colour]")).toHaveLength(16);
  });

  it("Đánh dấu nước vừa đi: the horse just moved and the die in the mover's colour", () => {
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
    const die = screen.getByRole("img", { name: "Xúc xắc: 4 (Xanh dương)" });
    expect(die).toHaveAttribute("data-colour", "blue");
    expect(container.querySelectorAll("g[data-last]")).toHaveLength(1);
    expect(container.querySelector("g[data-last]")).toHaveAttribute("data-colour", "blue");
  });

  it("shows an empty die before the first roll", () => {
    renderWithIntl(<LudoBoard {...boardProps(position(2, {}))} />);

    expect(screen.getByRole("img", { name: "Xúc xắc: chưa gieo" })).toBeInTheDocument();
  });
});

describe("Gieo và chọn ngựa trên bàn", () => {
  it("Gieo xúc xắc: shows the number rolled", async () => {
    renderWithIntl(<PlayableBoard start={position(2, { 0: [10] })} faces={[5]} />);

    await userEvent.click(rollButton());

    expect(screen.getByRole("img", { name: "Xúc xắc: 5 (Đỏ)" })).toBeInTheDocument();
    expect(screen.getByText("Đỏ gieo được 5. Chọn ngựa để đi.")).toBeInTheDocument();
  });

  it("Chọn ngựa: bring a horse out, or move one onto a Yellow horse and kick it", () => {
    // Yellow's progress 44 is Red's square 16, six squares ahead of Red's horse 2.
    const state = position(2, { 0: [S, 10, step(6), step(5)], 1: [44] }, { die: 6 });
    renderWithIntl(<LudoBoard {...boardProps(state)} />);

    const choices = within(choiceGroup()).getAllByRole("button");
    expect(choices.map((button) => button.textContent)).toEqual([
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

    expect(screen.getByText("Đỏ gieo được 6, không đi được, được gieo thêm.")).toBeInTheDocument();
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

  it("lets a horse on the board be clicked", async () => {
    const onMove = vi.fn();
    const state = position(2, { 0: [S, 10] }, { die: 3 });
    const { container } = renderWithIntl(<LudoBoard {...boardProps(state, { onMove })} />);

    const horse = container.querySelector('g[data-choice="1"]');
    if (horse === null) throw new Error("No horse to click");
    await userEvent.click(horse);

    expect(onMove).toHaveBeenCalledWith({ type: "move", horse: 1 });
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
    expect(screen.queryByText(/Chọn ngựa để đi/)).not.toBeInTheDocument();
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
