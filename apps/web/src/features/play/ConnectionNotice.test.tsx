import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";
import { CONNECTION_STATUS } from "@/transport/types";

import { ConnectionNotice } from "./ConnectionNotice";

afterEach(() => {
  vi.useRealTimers();
});

/** The notice's line: the box around its live message. */
const line = (container: HTMLElement) => container.firstElementChild;

describe("ConnectionNotice", () => {
  it("says it is reconnecting only once the connection has been lost for a while", () => {
    vi.useFakeTimers();
    renderWithIntl(<ConnectionNotice status={CONNECTION_STATUS.Reconnecting} onResume={vi.fn()} />);

    expect(screen.queryByText("Đang kết nối lại…")).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByText("Đang kết nối lại…")).toBeInTheDocument();
  });

  it("offers to continue after the idle pause", async () => {
    const onResume = vi.fn();
    renderWithIntl(<ConnectionNotice status={CONNECTION_STATUS.Idle} onResume={onResume} />);

    await userEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));

    expect(onResume).toHaveBeenCalledOnce();
  });

  it("keeps its height while empty, so the board below never moves", () => {
    const { container } = renderWithIntl(
      <ConnectionNotice status={CONNECTION_STATUS.Online} onResume={vi.fn()} />,
    );

    expect(line(container)).toHaveClass("min-h-10");
  });

  it("takes no room while empty where nothing below needs to stay put", () => {
    const { container } = renderWithIntl(
      <ConnectionNotice
        status={CONNECTION_STATUS.Online}
        onResume={vi.fn()}
        reserveSpace={false}
      />,
    );

    expect(line(container)).not.toHaveClass("min-h-10");
  });
});
