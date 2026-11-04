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
import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import { type BoardProps, defaultBoardLayout } from "../../types";
import { LudoBoard } from "../Board";
import type { DiceStage } from "./stage-types";
import { THROW_DEADLINE_MS, THROW_LATE_MS } from "./use-dice-throw";

// The throw of the 3D die on the board, with a stage of the test's own: jsdom draws no WebGL, and
// the physics is `throw-sim.test.ts`'s. The stage says when the die rests (`rest()`).

/** A stage that records what it is asked, and rests when the test says. */
class FakeStage implements DiceStage {
  readonly canvas = document.createElement("canvas");
  calls: string[] = [];
  power: number | null = null;
  face: number | null = null;
  withinMs: number | null = null;
  canLand = true;
  private onRest: (() => void) | null = null;
  private failure: (() => void) | null = null;

  prepare() {
    this.calls.push("prepare");
  }
  hold() {
    this.calls.push("hold");
  }
  release(power: number) {
    this.calls.push("release");
    this.power = power;
  }
  land(face: number, withinMs: number, onRest: () => void) {
    this.calls.push("land");
    if (!this.canLand) return false;
    this.face = face;
    this.withinMs = withinMs;
    this.onRest = onRest;
    return true;
  }
  rest() {
    const done = this.onRest;
    this.onRest = null;
    act(() => {
      done?.();
    });
  }
  topFace() {
    return this.face;
  }
  diePoint() {
    return { x: 0.5, y: 0.5 };
  }
  holdPoint() {
    return { x: 0.5, y: 0.4 };
  }
  stop() {
    this.calls.push("stop");
  }
  onFailure(listener: () => void) {
    this.failure = listener;
  }
  fail() {
    act(() => {
      this.failure?.();
    });
  }
  dispose() {
    this.calls.push("dispose");
  }
}

const dice = vi.hoisted(() => ({ stage: null as DiceStage | null, failed: false }));

vi.mock("./load-dice3d", async () => {
  const { useEffect: useReactEffect, useState: useReactState } = await import("react");
  return {
    useDice3d: () => {
      const [failed, setFailed] = useReactState(false);
      useReactEffect(() => {
        dice.stage?.onFailure(() => {
          setFailed(true);
        });
      }, []);
      return failed ? null : dice.stage;
    },
  };
});

const S = IN_STABLE;

function position(horses: readonly number[] = [], extra: Partial<LudoState> = {}): LudoState {
  const start = ludo.setup({ playerCount: 2, options: LUDO_DEFAULT_OPTIONS });
  return {
    ...start,
    horses: start.horses.map((own, seat) =>
      own.map((p, horse) => (seat === 0 ? (horses[horse] ?? p) : p)),
    ),
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
    result: null,
    lastEntry: null,
    viewer: null,
    layout: defaultBoardLayout,
    ...overrides,
  };
}

/** A board whose parent plays each move at once, rolling the faces given in turn. */
function PlayableBoard({
  start,
  faces,
  onMove,
}: {
  start: LudoState;
  faces: LudoOutcome[];
  onMove?: (move: LudoMove) => void;
}) {
  const [state, setState] = useState(start);
  return (
    <LudoBoard
      {...boardProps(state, {
        onMove: (move) => {
          onMove?.(move);
          setState(ludo.applyMove(state, move, move.type === "roll" ? faces.shift() : undefined));
        },
      })}
    />
  );
}

/**
 * A board online: a roll sent locks it until the test answers (`answer`), as the room's
 * transport does.
 */
function OnlineBoard({ start, onMove }: { start: LudoState; onMove: (move: LudoMove) => void }) {
  const [state, setState] = useState(start);
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    answer = (next) => {
      act(() => {
        setState(next);
        setWaiting(false);
      });
    };
  }, []);
  return (
    <LudoBoard
      {...boardProps(state, {
        disabled: waiting,
        onMove: (move) => {
          onMove(move);
          setWaiting(true);
        },
      })}
    />
  );
}

let answer: (next: LudoState) => void = () => undefined;

const rollButton = () => screen.getByRole("button", { name: "Gieo xúc xắc" });
const overlay = () => document.querySelector<HTMLElement>('[data-throw="3d"]');
const die = () => screen.getByRole("img", { name: /^Xúc xắc/ });

function press(button: HTMLElement) {
  fireEvent.pointerDown(button, { pointerId: 1, isPrimary: true, button: 0 });
}
function letGo(button: HTMLElement) {
  fireEvent.pointerUp(button, { pointerId: 1, isPrimary: true, button: 0 });
  // The click a browser sends after the release.
  fireEvent.click(button, { detail: 1 });
}

let stage: FakeStage;

beforeEach(() => {
  vi.useFakeTimers();
  stage = new FakeStage();
  dice.stage = stage;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Gieo bằng nhấn giữ", () => {
  it("Nhấn giữ rồi thả: the overlay while held, the die flies to the number, then the die beside the board shows it", () => {
    const onMove = vi.fn();
    renderWithIntl(<PlayableBoard start={position([10])} faces={[4]} onMove={onMove} />);

    press(rollButton());
    expect(overlay()).toHaveAttribute("data-phase", "hold");
    expect(overlay()).toHaveAttribute("aria-hidden", "true");
    expect(stage.calls).toEqual(["hold"]);
    act(() => {
      vi.advanceTimersByTime(800);
    });
    // Chưa thả thì chưa gieo.
    expect(onMove).not.toHaveBeenCalled();

    letGo(rollButton());
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(stage.face).toBe(4);
    expect(overlay()).toHaveAttribute("data-phase", "fly");
    // Shown as before the roll until the die rests.
    expect(die()).toHaveAccessibleName("Xúc xắc: Đỏ sắp gieo");
    expect(screen.queryByRole("group", { name: "Chọn ngựa" })).not.toBeInTheDocument();

    stage.rest();
    expect(overlay()).toHaveAttribute("data-phase", "rest");
    expect(overlay()).toHaveAttribute("data-top-face", "4");
    expect(within(overlay() ?? document.body).getByText("4")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(THROW_DEADLINE_MS);
    });
    expect(overlay()).toBeNull();
    expect(die()).toHaveAccessibleName("Xúc xắc: 4 (Đỏ)");
    // The 2D die does not tumble again for the same roll.
    expect(die()).not.toHaveClass("animate-dice-roll");
    expect(screen.getByRole("group", { name: "Chọn ngựa" })).toBeInTheDocument();
  });

  it("Bấm nhanh: a quick tap throws at the weakest and the overlay goes within 2.2 s of the number", () => {
    renderWithIntl(<PlayableBoard start={position([10])} faces={[5]} />);

    press(rollButton());
    letGo(rollButton());
    expect(stage.power).toBe(0);
    expect(stage.withinMs).toBeLessThanOrEqual(THROW_DEADLINE_MS);

    // The die never rests (a slow device): gone by the deadline all the same.
    act(() => {
      vi.advanceTimersByTime(THROW_DEADLINE_MS);
    });
    expect(overlay()).toBeNull();
    expect(THROW_DEADLINE_MS).toBeLessThanOrEqual(2200);
    expect(die()).toHaveAccessibleName("Xúc xắc: 5 (Đỏ)");
  });

  it("Giữ lâu tung lâu hơn: a hold of 1.5 s throws at full strength", () => {
    renderWithIntl(<PlayableBoard start={position([10])} faces={[5]} />);

    press(rollButton());
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    letGo(rollButton());

    expect(stage.power).toBe(1);
    act(() => {
      vi.advanceTimersByTime(THROW_DEADLINE_MS);
    });
    expect(overlay()).toBeNull();
  });

  it("Giữ lâu không gửi gì thêm: a hold of 3 s sends only a roll", () => {
    const onMove = vi.fn();
    renderWithIntl(<LudoBoard {...boardProps(position([10]), { onMove })} />);

    press(rollButton());
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    letGo(rollButton());

    expect(onMove.mock.calls).toEqual([[{ type: "roll" }]]);
  });

  it("Số về muộn: no number 3 s after letting go, the overlay goes; the number shows later beside the board", () => {
    const onMove = vi.fn();
    const start = position([10]);
    renderWithIntl(<OnlineBoard start={start} onMove={onMove} />);

    // Sent, not answered: the board is locked meanwhile.
    press(rollButton());
    letGo(rollButton());
    act(() => {
      vi.advanceTimersByTime(THROW_LATE_MS - 1);
    });
    expect(overlay()).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(overlay()).toBeNull();
    expect(stage.calls).toContain("stop");

    answer(ludo.applyMove(start, { type: "roll" }, 6));
    expect(overlay()).toBeNull();
    expect(screen.getByRole("img", { name: "Xúc xắc: 6 (Đỏ)" })).toBeInTheDocument();
  });

  it("closes at once when the roll is refused", () => {
    const onMove = vi.fn();
    const start = position([10]);
    renderWithIntl(<LudoBoard {...boardProps(start, { onMove })} />);

    // The parent never answers and the board stays open: refused, or never sent.
    press(rollButton());
    letGo(rollButton());

    expect(overlay()).toBeNull();
  });

  it("Giữ Space để lắc: Space held shakes, released throws, with no extra click", async () => {
    const onMove = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithIntl(<PlayableBoard start={position([10])} faces={[2]} onMove={onMove} />);

    await user.tab();
    expect(rollButton()).toHaveFocus();
    await user.keyboard("[Space>]");
    expect(overlay()).toHaveAttribute("data-phase", "hold");
    expect(onMove).not.toHaveBeenCalled();
    await user.keyboard("[/Space]");

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(overlay()).toHaveAttribute("data-phase", "fly");
  });

  it("takes every pointer on the overlay while Space is held, so nothing behind it is pressed", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithIntl(<PlayableBoard start={position([10])} faces={[2]} />);

    await user.tab();
    await user.keyboard("[Space>]");

    expect(overlay()).toHaveClass("pointer-events-auto", "touch-none");
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    overlay()?.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
  });

  it("Huỷ khi đang giữ: Esc closes the overlay, nothing is rolled, the player may still roll", () => {
    const onMove = vi.fn();
    renderWithIntl(<LudoBoard {...boardProps(position([10]), { onMove })} />);

    press(rollButton());
    fireEvent.keyDown(document, { key: "Escape" });
    expect(overlay()).toBeNull();
    // The press ends on the button: its click must not throw either.
    fireEvent.pointerUp(rollButton(), { pointerId: 1, isPrimary: true });
    fireEvent.click(rollButton(), { detail: 1 });

    expect(onMove).not.toHaveBeenCalled();
    expect(rollButton()).toHaveAttribute("aria-disabled", "false");
  });

  it.each([
    [
      "the pointer is cancelled",
      (button: HTMLElement) => fireEvent.pointerCancel(button, { pointerId: 1 }),
    ],
    [
      "the capture is lost",
      (button: HTMLElement) => fireEvent.lostPointerCapture(button, { pointerId: 1 }),
    ],
    ["the window loses the focus", () => fireEvent.blur(window)],
    [
      "the page is hidden",
      () => {
        vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
        fireEvent(document, new Event("visibilitychange"));
      },
    ],
  ])("cancels a hold when %s", (_what, end) => {
    const onMove = vi.fn();
    renderWithIntl(<LudoBoard {...boardProps(position([10]), { onMove })} />);

    press(rollButton());
    end(rollButton());
    fireEvent.pointerUp(rollButton(), { pointerId: 1, isPrimary: true });

    expect(overlay()).toBeNull();
    expect(onMove).not.toHaveBeenCalled();
  });

  it("Mất kết nối khi đang giữ: the overlay goes and no roll is sent", () => {
    const onMove = vi.fn();
    const start = position([10]);
    const { rerender } = renderWithIntl(<LudoBoard {...boardProps(start, { onMove })} />);

    press(rollButton());
    rerender(
      <LudoBoard
        {...boardProps(start, { onMove, disabled: true, lockedReason: "Đang kết nối lại…" })}
      />,
    );
    letGo(rollButton());

    expect(overlay()).toBeNull();
    expect(onMove).not.toHaveBeenCalled();
  });
});

describe("Đang tung thì không đi được", () => {
  it("Gieo 6 không đi được chỉ gieo một lần: a second press while the die flies rolls nothing", () => {
    const onMove = vi.fn();
    const blocked = position([OWN_GATE - 3, OWN_GATE + 6, OWN_GATE + 5, OWN_GATE + 4]);
    renderWithIntl(<PlayableBoard start={blocked} faces={[6, 2]} onMove={onMove} />);

    press(rollButton());
    letGo(rollButton());
    expect(onMove).toHaveBeenCalledTimes(1);
    // Pressed again, and Enter, while it flies.
    press(rollButton());
    letGo(rollButton());
    fireEvent.click(rollButton(), { detail: 0 });
    fireEvent.click(overlay() ?? document.body);
    expect(onMove).toHaveBeenCalledTimes(1);

    stage.rest();
    expect(within(overlay() ?? document.body).getByText("Được gieo thêm")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(THROW_DEADLINE_MS);
    });
    expect(overlay()).toBeNull();

    // Once the overlay is gone, the player rolls again.
    press(rollButton());
    letGo(rollButton());
    expect(onMove).toHaveBeenCalledTimes(2);
  });

  it("tells a lost turn with the number at rest", () => {
    renderWithIntl(<PlayableBoard start={position()} faces={[3]} />);

    press(rollButton());
    letGo(rollButton());
    stage.rest();

    expect(within(overlay() ?? document.body).getByText("Mất lượt")).toBeInTheDocument();
  });
});

describe("Cờ cá ngựa bằng bàn phím với xúc xắc 3D", () => {
  it("Gieo và đi bằng bàn phím: Enter throws; once the die rests, the first horse has the focus", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithIntl(<PlayableBoard start={position([10, 30])} faces={[4]} />);

    await user.tab();
    await user.keyboard("{Enter}");
    expect(overlay()).toHaveAttribute("data-phase", "fly");
    expect(stage.power).toBe(0);
    // The focus stays on the roll button while the die flies.
    expect(rollButton()).toHaveFocus();

    stage.rest();
    act(() => {
      vi.advanceTimersByTime(THROW_DEADLINE_MS);
    });

    const [first] = within(screen.getByRole("group", { name: "Chọn ngựa" })).getAllByRole("button");
    expect(first).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(rollButton()).toHaveFocus();
  });

  it("reads the roll once, when the die rests", () => {
    const { container } = renderWithIntl(<PlayableBoard start={position([10])} faces={[5]} />);
    const live = container.querySelector('[aria-live="polite"]');

    press(rollButton());
    letGo(rollButton());
    expect(live).toHaveTextContent("");

    stage.rest();
    act(() => {
      vi.advanceTimersByTime(THROW_DEADLINE_MS);
    });
    expect(live).toHaveTextContent("Đỏ gieo được 5. Chọn một ngựa được đánh dấu để đi.");
  });
});

describe("Gieo khi không có xúc xắc 3D", () => {
  it("Không có WebGL: a press rolls at once, with no overlay, the die beside the board shows it", () => {
    dice.stage = null;
    renderWithIntl(<PlayableBoard start={position([10])} faces={[5]} />);

    press(rollButton());
    expect(overlay()).toBeNull();
    letGo(rollButton());

    expect(overlay()).toBeNull();
    expect(die()).toHaveAccessibleName("Xúc xắc: 5 (Đỏ)");
  });

  it("Giảm chuyển động khi gieo: no overlay and no tumbling, the number at once", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    renderWithIntl(<PlayableBoard start={position([10])} faces={[5]} />);

    press(rollButton());
    letGo(rollButton());

    expect(overlay()).toBeNull();
    expect(die()).toHaveAccessibleName("Xúc xắc: 5 (Đỏ)");
    expect(die()).not.toHaveClass("animate-dice-roll");
  });

  it("closes the overlay and shows the number when no throw can be played", () => {
    stage.canLand = false;
    renderWithIntl(<PlayableBoard start={position([10])} faces={[5]} />);

    press(rollButton());
    letGo(rollButton());

    expect(overlay()).toBeNull();
    expect(die()).toHaveAccessibleName("Xúc xắc: 5 (Đỏ)");
  });

  it("closes the overlay at once when the stage fails mid-throw, the number shown", () => {
    renderWithIntl(<PlayableBoard start={position([10])} faces={[5]} />);

    press(rollButton());
    letGo(rollButton());
    stage.fail();

    expect(overlay()).toBeNull();
    expect(die()).toHaveAccessibleName("Xúc xắc: 5 (Đỏ)");
    // Every later roll uses the 2D die.
    expect(screen.queryByRole("group", { name: "Chọn ngựa" })).toBeInTheDocument();
  });
});

describe("Lần gieo của người khác", () => {
  const otherRolled = (seatRolled: number): LudoState => {
    const last: LudoEvent = { kind: "roll", player: seatRolled, face: 3, lost: true, again: false };
    return position([], { last, ply: 1, toMove: seatRolled === 0 ? 1 : 0 });
  };

  it("Máy gieo không làm mờ màn hình: the AI's roll tumbles the small die, no overlay", () => {
    const start = position([], { toMove: 1 });
    const { rerender } = renderWithIntl(
      <LudoBoard {...boardProps(start, { disabled: true, viewer: 0 })} />,
    );

    rerender(<LudoBoard {...boardProps(otherRolled(1), { disabled: false, viewer: 0 })} />);

    expect(overlay()).toBeNull();
    expect(die()).toHaveClass("animate-dice-roll");
  });

  it("Người ở xa gieo không làm mờ màn hình: a remote player's roll tumbles the small die, no overlay", () => {
    const start = position([], { toMove: 1 });
    const { rerender } = renderWithIntl(
      <LudoBoard
        {...boardProps(start, { disabled: true, viewer: 0, lockedReason: "Đang chờ Lan" })}
      />,
    );

    rerender(<LudoBoard {...boardProps(otherRolled(1), { viewer: 0 })} />);

    expect(overlay()).toBeNull();
    expect(die()).toHaveClass("animate-dice-roll");
  });
});

describe("Cú tung không bị cắt", () => {
  it("ends the throw at once when the game on screen is replaced (a new game)", () => {
    const onMove = vi.fn();
    const start = position([10]);
    renderWithIntl(<OnlineBoard start={start} onMove={onMove} />);

    press(rollButton());
    letGo(rollButton());
    answer(ludo.applyMove(start, { type: "roll" }, 4));
    expect(overlay()).toHaveAttribute("data-phase", "fly");

    answer(position([S]));
    expect(overlay()).toBeNull();
    expect(screen.getByRole("img", { name: "Xúc xắc: Đỏ sắp gieo" })).toBeInTheDocument();
  });

  it("Kết nối lại khi đang tung: the room after a reconnection, moves past the roll, ends the throw at once", () => {
    const onMove = vi.fn();
    const start = position([10]);
    const { container } = renderWithIntl(<OnlineBoard start={start} onMove={onMove} />);

    press(rollButton());
    letGo(rollButton());
    // A 2: the turn is lost (2 players: Yellow next).
    const rolled = ludo.applyMove(start, { type: "roll" }, 2);
    const red = ludo.legalMoves(rolled)[0];
    const moved = red === undefined ? rolled : ludo.applyMove(rolled, red);
    answer(rolled);
    expect(overlay()).toHaveAttribute("data-phase", "fly");

    // The room as it is now: Yellow has rolled too.
    const later = ludo.applyMove(moved, { type: "roll" }, 3);
    answer(later);

    expect(overlay()).toBeNull();
    expect(container.querySelector("[data-ply]")).toHaveAttribute("data-ply", String(later.ply));
  });
});

describe("the move the 3D die showed", () => {
  it("animates again once played anew (a new game): only that throw skips the 2D die", () => {
    const start = position([10]);
    renderWithIntl(<OnlineBoard start={start} onMove={vi.fn()} />);

    press(rollButton());
    letGo(rollButton());
    answer(ludo.applyMove(start, { type: "roll" }, 4));
    stage.rest();
    act(() => {
      vi.advanceTimersByTime(THROW_DEADLINE_MS);
    });
    expect(die()).not.toHaveClass("animate-dice-roll");

    // A new game, where Yellow (elsewhere) rolls first: the same move number, shown with the
    // small die tumbling.
    const fresh = position([], { toMove: 1 });
    answer(fresh);
    const yellowRolled = ludo.applyMove(fresh, { type: "roll" }, 3);
    answer(yellowRolled);

    expect(yellowRolled.ply).toBe(1);
    expect(die()).toHaveClass("animate-dice-roll");
  });
});
