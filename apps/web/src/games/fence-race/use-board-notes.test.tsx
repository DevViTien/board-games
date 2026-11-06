import { FENCE_RACE_ISSUE, fenceRace, type FenceRaceState } from "@board-games/games/fence-race";
import { cleanup, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import { type BoardNotesView, useBoardNotes } from "./use-board-notes";
import { INPUT_MODE, type InputMode, type ModeBlock } from "./use-fence-input";

const NOTHING_BLOCKS = () => null;
const ALL_LOCKED = (): ModeBlock => "locked";

function start(config: Partial<FenceRaceState> = {}): FenceRaceState {
  return { ...fenceRace.setup({ playerCount: 2, options: {} }), ...config };
}

/** A position everyone has moved in, seat 0 to move, on a shared device, nothing tried. */
function view(config: Partial<BoardNotesView> = {}): BoardNotesView {
  return {
    state: start({ moveCount: 2 }),
    viewer: null,
    turned: false,
    disabled: false,
    over: false,
    sending: false,
    mode: INPUT_MODE.Move,
    preview: null,
    chosen: null,
    issue: null,
    changes: [],
    refused: null,
    modeBlock: NOTHING_BLOCKS,
    lockedReason: null,
    lastMove: null,
    ...config,
  };
}

function Notes({ config }: { config: BoardNotesView }) {
  const { note, live, layerLabel, modeSub } = useBoardNotes(config);
  const modes: readonly InputMode[] = [INPUT_MODE.Move, INPUT_MODE.Place, INPUT_MODE.Break];
  return (
    <>
      <p data-testid="main">{note?.main}</p>
      <p data-testid="sub">{note?.sub}</p>
      <p data-testid="bad">{note?.bad === true ? "bad" : ""}</p>
      <p data-testid="live">{live}</p>
      <p data-testid="layer">{layerLabel}</p>
      {modes.map((one) => (
        <p key={one} data-testid={`mode-${one}`}>
          {modeSub(one)}
        </p>
      ))}
    </>
  );
}

function show(config: Partial<BoardNotesView>) {
  cleanup();
  renderWithIntl(<Notes config={view(config)} />);
  return {
    main: screen.getByTestId("main").textContent,
    sub: screen.getByTestId("sub").textContent,
    bad: screen.getByTestId("bad").textContent === "bad",
    live: screen.getByTestId("live").textContent,
    layer: screen.getByTestId("layer").textContent,
    mode: (one: InputMode) => screen.getByTestId(`mode-${one}`).textContent,
  };
}

const FENCE = { row: 5, col: 2, dir: "h" } as const;
const STEP = { kind: "step", row: 10, col: 4 } as const;

describe("the line under the board", () => {
  it("says nothing once the game is over", () => {
    const shown = show({ over: true, disabled: true, lockedReason: "Đang chờ Minh" });

    expect(shown.main).toBe("");
    expect(shown.live).toBe("");
  });

  it("uses the reason from the play screen as it is, with no second sentence on this player's turn", () => {
    const shown = show({
      viewer: 0,
      disabled: true,
      lockedReason: "Đang gửi…",
    });

    expect(shown.main).toBe("Đang gửi…");
    expect(shown.sub).toBe("");
  });

  it("adds when this player may choose only on somebody else's turn", () => {
    const shown = show({
      viewer: 1,
      disabled: true,
      lockedReason: "Đang chờ Minh",
    });

    expect(shown.main).toBe("Đang chờ Minh");
    expect(shown.sub).toBe("Tới lượt bạn mới chọn được việc.");
  });

  it("shows the move just played on a shared device, from the first round", () => {
    const shown = show({
      state: start({ moveCount: 1, toMove: 1 }),
      lastMove: STEP,
    });

    expect(shown.main).toMatch(/^Về cổng màu xanh dương/);
    expect(shown.sub).toBe("Đỏ vừa đi tới E1.");
  });

  it("shows how to move there before any move", () => {
    const shown = show({ state: start() });

    expect(shown.main).toMatch(/^Về cổng màu đỏ/);
    expect(shown.sub).toBe("Chạm ô có chấm để đi một ô.");
  });

  it("shows the move just played on a shared device, after the first round", () => {
    const shown = show({ lastMove: STEP });

    expect(shown.main).toBe("Xanh dương vừa đi tới E1.");
    expect(shown.sub).toBe("Chạm ô có chấm để đi một ô.");
  });

  it("leaves the move to the turn line online", () => {
    const shown = show({ viewer: 0, lastMove: STEP });

    expect(shown.main).toBe("Chạm ô có chấm để đi một ô.");
    expect(shown.live).toBe("");
  });

  it("says why a mode was refused until something else is tried", () => {
    const refused = show({
      refused: INPUT_MODE.Break,
      modeBlock: (mode) => (mode === INPUT_MODE.Break ? "broke" : null),
    });

    expect(refused.main).toBe("Đã phá rào");
    expect(refused.sub).toBe("Chọn việc khác cho lượt này.");
    expect(refused.bad).toBe(true);
  });

  it("names the fence being sent", () => {
    const shown = show({ sending: true, mode: INPUT_MODE.Place, preview: FENCE });

    expect(shown.main).toBe("Đang gửi…");
    expect(shown.sub).toMatch(/^Rào giữa hàng 5 và 6, cột C–D/);
    expect(shown.live).toBe("");
  });

  it("marks a fence that may not go there", () => {
    const shown = show({
      mode: INPUT_MODE.Place,
      preview: FENCE,
      issue: { code: FENCE_RACE_ISSUE.NoFences },
    });

    expect(shown.bad).toBe(true);
    expect(shown.sub).toMatch(/^Rào giữa/);
    expect(shown.live).toContain(shown.main);
    expect(shown.layer).toContain(shown.main);
  });

  it("says whose way a fence changes, by colour on a shared device and as you for the player here", () => {
    const changes = [{ player: 1, before: 10, after: 12 }];

    expect(show({ mode: INPUT_MODE.Place, preview: FENCE, changes }).main).toBe(
      "Xanh dương: 10 → 12 bước",
    );
    expect(show({ mode: INPUT_MODE.Place, preview: FENCE, changes, viewer: 1 }).main).toBe(
      "Bạn: 10 → 12 bước",
    );
  });

  it("says a fence changes nobody's way", () => {
    expect(show({ mode: INPUT_MODE.Place, preview: FENCE }).main).toBe("Không ai phải đi xa hơn.");
    expect(show({ mode: INPUT_MODE.Break, chosen: FENCE }).main).toBe("Không ai ngắn đường hơn.");
  });
});

describe("the second line of a mode's button", () => {
  it("says the move is on its way, not whose turn it is", () => {
    const shown = show({
      viewer: 0,
      disabled: true,
      lockedReason: "Đang gửi…",
      modeBlock: ALL_LOCKED,
    });

    expect(shown.mode(INPUT_MODE.Place)).toBe("Đang gửi");
  });

  it("says it is the turn of somebody else only when it is", () => {
    const waiting = show({
      viewer: 1,
      disabled: true,
      lockedReason: "Đang chờ Minh",
      modeBlock: ALL_LOCKED,
    });

    expect(waiting.mode(INPUT_MODE.Move)).toBe("Chưa tới lượt");
  });

  it("does not say it is not this player's turn when the connection is the matter", () => {
    const paused = show({
      viewer: 0,
      disabled: true,
      lockedReason: "Chờ kết nối lại với máy chủ",
      modeBlock: ALL_LOCKED,
    });

    expect(paused.mode(INPUT_MODE.Move)).toBe("Tạm dừng");
  });

  it("counts what is left when nothing stands in the way", () => {
    const shown = show({});

    expect(shown.mode(INPUT_MODE.Move)).toBe("10 bước");
    expect(shown.mode(INPUT_MODE.Place)).toBe("Còn 9");
    expect(shown.mode(INPUT_MODE.Break)).toBe("Còn 1 lần");
  });
});

describe("the name of the layer", () => {
  it("tells the keys that reach every fence, in Phá rào", () => {
    expect(show({ mode: INPUT_MODE.Break }).layer).toMatch(/PageUp, PageDown/);
    expect(show({ mode: INPUT_MODE.Break, chosen: FENCE }).layer).toMatch(
      /^Rào giữa .*PageUp, PageDown/,
    );
  });

  it("does not tell them in Đặt rào, where the arrows reach everywhere", () => {
    expect(show({ mode: INPUT_MODE.Place }).layer).not.toMatch(/PageUp/);
  });

  it.each(["en", "ja"] as const)("is in the language of the page: %s", (locale) => {
    renderWithIntl(<Notes config={view({ mode: INPUT_MODE.Break })} />, { locale });

    expect(screen.getByTestId("layer").textContent).toMatch(/PageUp/);
  });
});
