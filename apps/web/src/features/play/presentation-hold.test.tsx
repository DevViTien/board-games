import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useHeldPresentation, usePresentationHold } from "./presentation-hold";

// What the play screen shows while a board holds it: the value of when it asked, until released.

function Screen({ live }: { live: number }) {
  const { shown, control, held } = useHeldPresentation(live, () => live);
  return (
    <>
      <p>
        {shown} {held ? "held" : "live"}
      </p>
      <button type="button" onClick={control.hold}>
        Hold
      </button>
      <button type="button" onClick={control.release}>
        Release
      </button>
    </>
  );
}

describe("useHeldPresentation", () => {
  it("shows what was live when held, until released", () => {
    const { rerender } = render(<Screen live={1} />);

    fireEvent.click(screen.getByRole("button", { name: "Hold" }));
    rerender(<Screen live={2} />);
    expect(screen.getByText("1 held")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Release" }));
    expect(screen.getByText("2 live")).toBeInTheDocument();
  });

  it("does nothing outside a play screen", () => {
    function Board() {
      const hold = usePresentationHold();
      hold.hold();
      hold.release();
      return <p>board</p>;
    }
    render(<Board />);
    expect(screen.getByText("board")).toBeInTheDocument();
  });
});
