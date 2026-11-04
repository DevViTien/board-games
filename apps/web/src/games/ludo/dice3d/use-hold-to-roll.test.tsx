import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { powerOf, THROW_PHASE, useHoldToRoll } from "./use-hold-to-roll";

// The roll button's gesture on its own: the phases, every way a hold ends without a throw, and
// the clicks a browser makes that must not throw twice.

interface Spies {
  readonly onHold: Mock<() => void>;
  readonly onThrow: Mock<(power: number, byKeyboard: boolean) => void>;
  readonly onCancel: Mock<() => void>;
  readonly onRoll: Mock<(byKeyboard: boolean) => void>;
}

function Harness({
  spies,
  canRoll = true,
  ply = 0,
  threeD = true,
}: {
  spies: Spies;
  canRoll?: boolean;
  ply?: number;
  threeD?: boolean;
}) {
  const gesture = useHoldToRoll({ canRoll, ply, threeD, ...spies });
  return (
    <button type="button" data-phase={gesture.phase} {...gesture.buttonProps}>
      Roll
    </button>
  );
}

function spies(): Spies {
  return { onHold: vi.fn(), onThrow: vi.fn(), onCancel: vi.fn(), onRoll: vi.fn() };
}

const button = () => screen.getByRole("button", { name: "Roll" });

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useHoldToRoll", () => {
  it("goes idle → hold → await on a press and a release, throwing once", () => {
    const s = spies();
    render(<Harness spies={s} />);

    fireEvent.pointerDown(button(), { pointerId: 3, isPrimary: true, button: 0 });
    expect(button()).toHaveAttribute("data-phase", THROW_PHASE.Hold);
    expect(s.onHold).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(750);
    fireEvent.pointerUp(button(), { pointerId: 3, isPrimary: true });
    // The click after the release, and the capture lost after it: nothing more.
    fireEvent.click(button(), { detail: 1 });
    fireEvent.lostPointerCapture(button(), { pointerId: 3 });

    expect(button()).toHaveAttribute("data-phase", THROW_PHASE.Await);
    expect(s.onThrow).toHaveBeenCalledTimes(1);
    expect(s.onThrow).toHaveBeenCalledWith(0.5, false);
    expect(s.onCancel).not.toHaveBeenCalled();
  });

  it("ignores a press of another button of the mouse, or another pointer", () => {
    const s = spies();
    render(<Harness spies={s} />);

    fireEvent.pointerDown(button(), { pointerId: 1, isPrimary: true, button: 2 });
    fireEvent.pointerDown(button(), { pointerId: 2, isPrimary: false, button: 0 });

    expect(s.onHold).not.toHaveBeenCalled();
  });

  it("Chưa thả thì chưa gieo: nothing is thrown while held", () => {
    const s = spies();
    render(<Harness spies={s} />);

    fireEvent.pointerDown(button(), { pointerId: 1, isPrimary: true, button: 0 });
    vi.advanceTimersByTime(5000);

    expect(s.onThrow).not.toHaveBeenCalled();
  });

  it("Huỷ khi đang giữ: Esc on the page cancels, and the click after the release does nothing", () => {
    const s = spies();
    render(<Harness spies={s} />);

    fireEvent.pointerDown(button(), { pointerId: 1, isPrimary: true, button: 0 });
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.pointerUp(button(), { pointerId: 1, isPrimary: true });
    fireEvent.click(button(), { detail: 1 });

    expect(button()).toHaveAttribute("data-phase", THROW_PHASE.Idle);
    expect(s.onCancel).toHaveBeenCalledTimes(1);
    expect(s.onThrow).not.toHaveBeenCalled();
  });

  it("Mất kết nối khi đang giữ: cancels once the player may no longer roll", () => {
    const s = spies();
    const { rerender } = render(<Harness spies={s} />);

    fireEvent.pointerDown(button(), { pointerId: 1, isPrimary: true, button: 0 });
    rerender(<Harness spies={s} canRoll={false} />);
    fireEvent.pointerUp(button(), { pointerId: 1, isPrimary: true });

    expect(s.onCancel).toHaveBeenCalledTimes(1);
    expect(s.onThrow).not.toHaveBeenCalled();
  });

  it("cancels when the game moves on while held", () => {
    const s = spies();
    const { rerender } = render(<Harness spies={s} />);

    fireEvent.pointerDown(button(), { pointerId: 1, isPrimary: true, button: 0 });
    rerender(<Harness spies={s} ply={1} />);

    expect(s.onCancel).toHaveBeenCalledTimes(1);
  });

  it("Giữ Space để lắc: Space down holds, Space up throws, with no click of the button", async () => {
    const s = spies();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Harness spies={s} />);

    await user.tab();
    await user.keyboard("[Space>]");
    expect(s.onHold).toHaveBeenCalledTimes(1);
    // Held down, the key repeats: one hold all the same.
    fireEvent.keyDown(button(), { key: " ", repeat: true });
    await user.keyboard("[/Space]");

    expect(s.onThrow).toHaveBeenCalledTimes(1);
    expect(s.onThrow).toHaveBeenCalledWith(expect.any(Number), true);
    expect(s.onRoll).not.toHaveBeenCalled();
  });

  it("ends a hold of Space without a throw when the focus leaves the button", async () => {
    const s = spies();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <>
        <Harness spies={s} />
        <button type="button">Other</button>
      </>,
    );

    await user.tab();
    await user.keyboard("[Space>]");
    expect(s.onHold).toHaveBeenCalledTimes(1);
    act(() => {
      screen.getByRole("button", { name: "Other" }).focus();
    });
    fireEvent.keyUp(document, { key: " " });

    expect(s.onCancel).toHaveBeenCalledTimes(1);
    expect(s.onThrow).not.toHaveBeenCalled();
    expect(button()).toHaveAttribute("data-phase", THROW_PHASE.Idle);
  });

  it("throws when Space comes up anywhere on the page, the button still focused", async () => {
    const s = spies();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Harness spies={s} />);

    await user.tab();
    await user.keyboard("[Space>]");
    const up = new KeyboardEvent("keyup", { key: " ", bubbles: true, cancelable: true });
    act(() => {
      document.body.dispatchEvent(up);
    });

    expect(s.onThrow).toHaveBeenCalledWith(expect.any(Number), true);
    expect(up.defaultPrevented).toBe(true);
  });

  it("throws when the pointer is let go off the button (its capture refused)", () => {
    const s = spies();
    render(<Harness spies={s} />);

    fireEvent.pointerDown(button(), { pointerId: 4, isPrimary: true, button: 0 });
    fireEvent.pointerUp(document.body, { pointerId: 4, isPrimary: true });

    expect(s.onThrow).toHaveBeenCalledTimes(1);
  });

  it("does not swallow a keyboard press after a hold the browser cancelled", () => {
    const s = spies();
    render(<Harness spies={s} />);

    // An Android long press: the pointer is cancelled, no click follows it.
    fireEvent.pointerDown(button(), { pointerId: 5, isPrimary: true, button: 0 });
    fireEvent.pointerCancel(button(), { pointerId: 5 });
    expect(s.onCancel).toHaveBeenCalledTimes(1);
    // Then Enter, or a screen reader's press.
    fireEvent.click(button(), { detail: 0 });

    expect(s.onThrow).toHaveBeenCalledTimes(1);
    expect(s.onThrow).toHaveBeenCalledWith(0, true);
  });

  it("throws at the weakest on Enter, once even when it repeats", async () => {
    const s = spies();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Harness spies={s} />);

    await user.tab();
    await user.keyboard("{Enter}");
    fireEvent.keyDown(button(), { key: "Enter", repeat: true });
    fireEvent.click(button(), { detail: 0 });

    expect(s.onThrow).toHaveBeenCalledTimes(1);
    expect(s.onThrow).toHaveBeenCalledWith(0, true);
  });

  it("rolls at once without the 3D die", async () => {
    const s = spies();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Harness spies={s} threeD={false} />);

    await user.click(button());

    expect(s.onHold).not.toHaveBeenCalled();
    expect(s.onRoll).toHaveBeenCalledTimes(1);
  });

  it("keeps a long press from opening a menu", () => {
    render(<Harness spies={spies()} />);

    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    button().dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("measures the strength by the time held, full from 1.5 s", () => {
    expect(powerOf(0)).toBe(0);
    expect(powerOf(750)).toBe(0.5);
    expect(powerOf(4000)).toBe(1);
  });
});
