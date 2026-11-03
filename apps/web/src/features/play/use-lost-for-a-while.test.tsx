import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";
import type { ConnectionStatus } from "@/transport/types";

import { useLostForAWhile } from "./use-lost-for-a-while";

function Probe({ status }: { status: ConnectionStatus | null }) {
  return <p>{useLostForAWhile(status) ? "lost" : "fine"}</p>;
}

const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

describe("useLostForAWhile", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("tells a connection lost only after 1.5 s, and forgets it once back", async () => {
    const view = renderWithIntl(<Probe status="online" />);
    view.rerender(<Probe status="reconnecting" />);
    await wait(1499);
    expect(screen.getByText("fine")).toBeInTheDocument();
    await wait(1);
    expect(screen.getByText("lost")).toBeInTheDocument();

    view.rerender(<Probe status="online" />);
    expect(screen.getByText("fine")).toBeInTheDocument();
    // The next loss waits its own 1.5 s.
    view.rerender(<Probe status="reconnecting" />);
    expect(screen.getByText("fine")).toBeInTheDocument();
  });

  it("never counts the idle pause (told at once elsewhere) nor a game on this device", async () => {
    const view = renderWithIntl(<Probe status="idle" />);
    await wait(5000);
    expect(screen.getByText("fine")).toBeInTheDocument();

    view.rerender(<Probe status={null} />);
    await wait(5000);
    expect(screen.getByText("fine")).toBeInTheDocument();
  });
});
