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

  it("keeps the idle pause on its one line on a phone: words cut short, a small button", () => {
    const { container } = renderWithIntl(
      <ConnectionNotice status={CONNECTION_STATUS.Idle} onResume={vi.fn()} />,
    );

    expect(line(container)).toHaveClass("min-h-5", "max-lg:flex-nowrap");
    expect(screen.getByText("Đã tạm ngắt vì lâu không có hoạt động.")).toHaveClass("line-clamp-1");
    // 24 px high, overhanging the gaps around the 20 px line by 2 px each side.
    expect(screen.getByRole("button", { name: "Tiếp tục" })).toHaveClass(
      "max-lg:h-6",
      "max-lg:-my-0.5",
    );
  });

  it("offers to continue after the idle pause", async () => {
    const onResume = vi.fn();
    renderWithIntl(<ConnectionNotice status={CONNECTION_STATUS.Idle} onResume={onResume} />);

    await userEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));

    expect(onResume).toHaveBeenCalledOnce();
  });

  it("keeps its height while empty, so the board below never moves: one small line on a phone", () => {
    const { container } = renderWithIntl(
      <ConnectionNotice status={CONNECTION_STATUS.Online} onResume={vi.fn()} />,
    );

    expect(line(container)).toHaveClass("min-h-5", "lg:min-h-10");
    expect(screen.getByText("", { selector: "p[aria-live]" })).toHaveClass("text-small");
  });

  it("tells a lost connection on one line on a phone, its words whole for screen readers", () => {
    vi.useFakeTimers();
    renderWithIntl(<ConnectionNotice status={CONNECTION_STATUS.Reconnecting} onResume={vi.fn()} />);
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByText("Đang kết nối lại…")).toHaveClass("line-clamp-1", "lg:line-clamp-none");
  });

  it("takes no room while empty where nothing below needs to stay put", () => {
    const { container } = renderWithIntl(
      <ConnectionNotice
        status={CONNECTION_STATUS.Online}
        onResume={vi.fn()}
        reserveSpace={false}
      />,
    );

    expect(line(container)).not.toHaveClass("min-h-5");
  });
});
