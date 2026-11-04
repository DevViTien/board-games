import { act, render } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DiceStage, DieColours } from "./stage-types";

const COLOURS: DieColours = { body: "paper", line: "red", pip: "ink" };

// Loading the 3D die: only with WebGL, only once asked, freed when the board goes, and never again
// once it failed. The chunk itself (`dice-stage`) is replaced: jsdom draws no WebGL.

const chunk = vi.hoisted(() => ({
  made: [] as {
    disposed: boolean;
    failure: (() => void) | null;
    prepared: DieColours | null;
  }[],
  fail: false,
}));

vi.mock("./dice-stage", () => ({
  createDiceStage: (): DiceStage => {
    if (chunk.fail) throw new Error("no context");
    const record = {
      disposed: false,
      failure: null as (() => void) | null,
      prepared: null as DieColours | null,
    };
    chunk.made.push(record);
    return {
      canvas: document.createElement("canvas"),
      prepare: (colours) => {
        record.prepared = colours;
      },
      hold: () => undefined,
      release: () => undefined,
      land: () => true,
      topFace: () => null,
      diePoint: () => ({ x: 0.5, y: 0.5 }),
      holdPoint: () => ({ x: 0.5, y: 0.5 }),
      stop: () => undefined,
      onFailure: (listener) => {
        record.failure = listener;
      },
      dispose: () => {
        record.disposed = true;
      },
    };
  },
}));

/** WebGL as this test wants it. */
function stubWebgl(available: boolean) {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    available
      ? ({
          getExtension: () => ({ loseContext: () => undefined }),
        } as unknown as WebGLRenderingContext)
      : null,
  );
}

async function loadModule() {
  vi.resetModules();
  return import("./load-dice3d");
}

function Probe({
  useDice3d,
  wanted,
  seen,
}: {
  useDice3d: (wanted: boolean, colours: () => DieColours) => DiceStage | null;
  wanted: boolean;
  seen: (stage: DiceStage | null) => void;
}) {
  seen(useDice3d(wanted, () => COLOURS));
  return null;
}

async function idle() {
  await act(() => vi.advanceTimersByTimeAsync(500));
  await act(() => vi.advanceTimersByTimeAsync(500));
}

beforeEach(() => {
  vi.useFakeTimers();
  chunk.made = [];
  chunk.fail = false;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useDice3d", () => {
  it("loads nothing until asked, then a stage while idle", async () => {
    stubWebgl(true);
    const { useDice3d } = await loadModule();
    let stage: DiceStage | null = null;
    const seen = (value: DiceStage | null) => {
      stage = value;
    };
    const { rerender } = render(<Probe useDice3d={useDice3d} wanted={false} seen={seen} />);
    await idle();
    expect(chunk.made).toHaveLength(0);

    rerender(<Probe useDice3d={useDice3d} wanted seen={seen} />);
    await idle();
    expect(chunk.made).toHaveLength(1);
    expect(stage).not.toBeNull();
    // Prepared in the colours of the board, before the first press.
    expect(chunk.made[0]?.prepared).toEqual(COLOURS);
  });

  it("checks WebGL again after a miss, and keeps it once found", async () => {
    const { webglAvailable } = await loadModule();
    stubWebgl(false);
    expect(webglAvailable()).toBe(false);
    stubWebgl(true);
    expect(webglAvailable()).toBe(true);
    stubWebgl(false);
    expect(webglAvailable()).toBe(true);
  });

  it("Không có WebGL: never loads the chunk", async () => {
    stubWebgl(false);
    const { useDice3d, webglAvailable } = await loadModule();
    let stage: DiceStage | null = null;
    render(
      <Probe
        useDice3d={useDice3d}
        wanted
        seen={(value) => {
          stage = value;
        }}
      />,
    );
    await idle();

    expect(webglAvailable()).toBe(false);
    expect(chunk.made).toHaveLength(0);
    expect(stage).toBeNull();
  });

  it("stays on the 2D die when the stage cannot be made", async () => {
    stubWebgl(true);
    chunk.fail = true;
    const { useDice3d } = await loadModule();
    let stage: DiceStage | null = null;
    render(
      <Probe
        useDice3d={useDice3d}
        wanted
        seen={(value) => {
          stage = value;
        }}
      />,
    );
    await idle();

    expect(stage).toBeNull();
  });

  it("drops the stage for good once its context is lost", async () => {
    stubWebgl(true);
    const { useDice3d } = await loadModule();
    let stage: DiceStage | null = null;
    render(
      <Probe
        useDice3d={useDice3d}
        wanted
        seen={(value) => {
          stage = value;
        }}
      />,
    );
    await idle();
    expect(stage).not.toBeNull();

    act(() => {
      chunk.made[0]?.failure?.();
    });
    await idle();

    expect(stage).toBeNull();
    expect(chunk.made[0]?.disposed).toBe(true);
    expect(chunk.made).toHaveLength(1);
  });

  it("frees the stage when the board goes, also after StrictMode's double mount", async () => {
    stubWebgl(true);
    const { useDice3d } = await loadModule();
    const { unmount } = render(
      <StrictMode>
        <Probe useDice3d={useDice3d} wanted seen={() => undefined} />
      </StrictMode>,
    );
    await idle();
    expect(chunk.made.filter((stage) => !stage.disposed)).toHaveLength(1);

    unmount();

    expect(chunk.made.every((stage) => stage.disposed)).toBe(true);
  });
});
