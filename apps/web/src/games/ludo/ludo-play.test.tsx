import {
  IN_STABLE,
  ludo,
  LUDO_DEFAULT_OPTIONS,
  type LudoEvent,
  type LudoMove,
  type LudoOutcome,
  type LudoState,
} from "@board-games/games/ludo";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PlayScreen } from "@/features/play/PlayScreen";
import { renderWithIntl } from "@/test/render-with-intl";
import type { ReadySnapshot, SeatView, Transport, TransportEvent } from "@/transport/types";

import { LudoBoard } from "./Board";
import { useLudoMoveLabel } from "./move-label";
import { useLudoPlayerLabel } from "./player-label";

// The play screen with Cờ cá ngựa: what it says, and that each roll is read out once — by the
// status line for the AI or an opponent, by the board's hint for a person at this device.

const ui = { Board: LudoBoard, usePlayerLabel: useLudoPlayerLabel, useMoveLabel: useLudoMoveLabel };

type LudoSnapshot = ReadySnapshot<LudoState, LudoMove, LudoOutcome>;

const HUMAN = { kind: "human" } as const;
const AI = { kind: "ai", level: "easy" } as const;

function fakeTransport(snapshot: LudoSnapshot): Transport<LudoState, LudoMove, LudoOutcome> {
  return {
    getSnapshot: () => snapshot,
    subscribe: () => () => undefined,
    submit: vi.fn(),
    requestUndo: vi.fn(),
    requestRedo: vi.fn(),
    requestNewGame: vi.fn(),
    resign: vi.fn(),
    claimAbandoned: vi.fn(),
    dispose: vi.fn(),
  };
}

/** A snapshot after `mover` played the move that did `last`, `toMove` to play next. */
function snapshotAfter(
  players: 2 | 3 | 4,
  last: LudoEvent,
  toMove: number,
  seats: readonly SeatView[],
  extra: Partial<LudoState> = {},
): LudoSnapshot {
  const state: LudoState = {
    ...ludo.setup({ playerCount: players, options: LUDO_DEFAULT_OPTIONS }),
    toMove,
    last,
    ...extra,
  };
  const move: LudoMove =
    last.kind === "roll" ? { type: "roll" } : { type: "move", horse: last.horse };
  const viewer = seats.filter((seat) => seat.kind === "human").length === 1 ? 0 : null;
  const humanToMove = seats[toMove]?.kind === "human";
  return {
    status: "ready",
    state,
    legalMoves: ludo.legalMoves(state),
    currentPlayer: toMove,
    result: null,
    lastEntry: last.kind === "roll" ? { move, outcome: last.face } : { move },
    lastMover: last.player,
    moveCount: 10,
    canUndo: false,
    canRedo: false,
    canMove: humanToMove,
    viewer,
    seats,
    waitingFor: humanToMove ? null : seats[toMove]?.kind === "ai" ? "ai" : "opponent",
    inProgress: true,
    supportsUndo: !seats.some((seat) => seat.kind === "remote"),
    canStartNewGame: true,
    resign: null,
    turn: null,
    connection: seats.some((seat) => seat.kind === "remote") ? "online" : null,
    options: LUDO_DEFAULT_OPTIONS,
  };
}

function renderLudo(snapshot: LudoSnapshot) {
  return renderWithIntl(<PlayScreen gameId="ludo" transport={fakeTransport(snapshot)} ui={ui} />);
}

const liveHint = (container: HTMLElement) =>
  container.querySelector('[data-ludo-hint] p[aria-live="polite"]');

describe("PlayScreen with Cờ cá ngựa", () => {
  it("Máy gieo rồi mất lượt: the AI's roll is read by the status line only", () => {
    const greenLost: LudoEvent = { kind: "roll", player: 3, face: 3, lost: true, again: false };
    const { container } = renderLudo(snapshotAfter(4, greenLost, 0, [HUMAN, AI, AI, AI]));

    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Máy (Xanh lá) gieo được 3, mất lượt. Đến lượt bạn (Đỏ)",
    );
    expect(liveHint(container)).toHaveTextContent("");
  });

  it("Máy gieo 6 không đi được", () => {
    const blueAgain: LudoEvent = { kind: "roll", player: 1, face: 6, lost: false, again: true };
    renderLudo(snapshotAfter(4, blueAgain, 1, [HUMAN, AI, AI, AI]));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Máy (Xanh dương) gieo được 6, không đi được, được gieo thêm. Máy (Xanh dương) đang nghĩ…",
    );
  });

  it("reads the player's own roll by the board's hint, not by the status line", () => {
    const redRolled: LudoEvent = { kind: "roll", player: 0, face: 5, lost: false, again: false };
    const { container } = renderLudo(
      snapshotAfter(4, redRolled, 0, [HUMAN, AI, AI, AI], {
        die: 5,
        horses: [[10, IN_STABLE, IN_STABLE, IN_STABLE], [], [], []].map((own) =>
          Array.from({ length: 4 }, (_unused, horse) => own[horse] ?? IN_STABLE),
        ),
      }),
    );

    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("Đến lượt bạn (Đỏ)");
    expect(screen.getByRole("status")).not.toHaveTextContent("gieo được");
    expect(liveHint(container)).toHaveTextContent("Đỏ gieo được 5. Chọn ngựa để đi.");
  });

  it("Đối thủ đá ngựa: an online opponent's kick, by name", () => {
    const minhKicked: LudoEvent = {
      kind: "move",
      player: 1,
      horse: 1,
      face: 4,
      from: 12,
      to: 16,
      kicked: { player: 0, horse: 0, from: 44 },
      again: false,
    };
    renderLudo(snapshotAfter(2, minhKicked, 0, [HUMAN, { kind: "remote", name: "Minh" }]));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Minh vừa đi ngựa 2 tới ô 17, đá ngựa Đỏ. Đến lượt bạn (Đỏ)",
    );
  });

  it("shows no rule label next to the game's name", () => {
    const redLost: LudoEvent = { kind: "roll", player: 0, face: 2, lost: true, again: false };
    renderLudo(snapshotAfter(2, redLost, 1, [HUMAN, HUMAN]));

    expect(screen.getByRole("heading", { name: "Cờ cá ngựa" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Đến lượt Vàng");
  });
});

describe("PlayScreen with Cờ cá ngựa online", () => {
  const AI_SEAT = { kind: "ai", level: "medium" } as const;
  const MINH = { kind: "remote", name: "Minh" } as const;
  const LAN = { kind: "remote", name: "Lan" } as const;

  /** The snapshot of an online room: no undo, the connection shown, whoever the other seats are. */
  function online(snapshot: LudoSnapshot): LudoSnapshot {
    return { ...snapshot, viewer: 0, supportsUndo: false, inProgress: false, connection: "online" };
  }

  const lostRoll = (player: number, face: LudoOutcome = 3): LudoEvent => ({
    kind: "roll",
    player,
    face,
    lost: true,
    again: false,
  });

  it("Chờ máy: names the AI seat that is thinking when the room has two", () => {
    renderLudo(online(snapshotAfter(4, lostRoll(0), 1, [HUMAN, AI_SEAT, AI_SEAT, LAN])));

    expect(screen.getByRole("status").textContent).toBe("Máy (Xanh dương) đang nghĩ…");
  });

  it("Báo nước máy đá ngựa: tells the AI's kick while the next AI thinks", () => {
    const blueKicked: LudoEvent = {
      kind: "move",
      player: 1,
      horse: 1,
      face: 4,
      from: 12,
      to: 16,
      kicked: { player: 0, horse: 0, from: 44 },
      again: false,
    };
    renderLudo(online(snapshotAfter(4, blueKicked, 2, [HUMAN, AI_SEAT, AI_SEAT, AI_SEAT])));

    expect(screen.getByRole("status").textContent).toBe(
      "Máy (Xanh dương) đi ngựa 2 tới ô 17, đá ngựa Đỏ. Máy (Vàng) đang nghĩ…",
    );
  });

  it("Một người với ba máy: is online, without undo, and offers to play again once over", () => {
    renderLudo(
      online({
        ...snapshotAfter(4, lostRoll(3), 0, [HUMAN, AI_SEAT, AI_SEAT, AI_SEAT]),
        result: { kind: "win", winners: [2] },
        legalMoves: [],
        canMove: false,
        waitingFor: null,
      }),
    );

    expect(screen.getByText("Online")).toBeInTheDocument();
    expect(screen.queryByText(/Với máy/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hoàn tác" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chơi lại" })).toBeInTheDocument();
    expect(screen.getByRole("status").textContent).toBe("Máy (Vàng) thắng!");
  });

  it("names the AI seat that starts a new game, and the player's colour", () => {
    // After "Play again" the seats moved on: the AI in the first seat starts.
    renderLudo({
      ...online(snapshotAfter(4, lostRoll(3), 0, [AI_SEAT, AI_SEAT, AI_SEAT, HUMAN])),
      viewer: 3,
      moveCount: 0,
      lastEntry: null,
      lastMover: null,
    });

    expect(screen.getByRole("status").textContent).toBe(
      "Ván mới: bạn cầm Xanh lá, máy (Đỏ) đi trước",
    );
  });

  it("Ván mới máy đi trước: says the player's colour and that the computer starts", () => {
    renderLudo({
      ...online(snapshotAfter(3, lostRoll(2), 0, [AI_SEAT, HUMAN, MINH])),
      viewer: 1,
      moveCount: 0,
      lastEntry: null,
      lastMover: null,
    });

    expect(screen.getByRole("status").textContent).toBe(
      "Ván mới: bạn cầm Xanh dương, máy đi trước",
    );
  });

  it("Người khác đi rồi chờ người khác: tells a player's move while waiting for the next", () => {
    renderLudo(online(snapshotAfter(3, lostRoll(1), 2, [HUMAN, MINH, LAN])));

    expect(screen.getByRole("status").textContent).toBe(
      "Minh vừa gieo được 3, mất lượt. Đang chờ Lan…",
    );
  });

  it("tells every move of an opponent's turn, a 6 rolled before the horse moves", () => {
    const minhSix: LudoEvent = { kind: "roll", player: 1, face: 6, lost: false, again: false };
    renderLudo(online(snapshotAfter(2, minhSix, 1, [HUMAN, MINH])));

    expect(screen.getByRole("status").textContent).toBe("Minh vừa gieo được 6. Đang chờ Minh…");
  });

  it("tells the AI's move while waiting for a person elsewhere", () => {
    renderLudo(online(snapshotAfter(3, lostRoll(1), 2, [HUMAN, AI_SEAT, LAN])));

    expect(screen.getByRole("status").textContent).toBe("Máy gieo được 3, mất lượt. Đang chờ Lan…");
  });

  it("tells a person's move while the AI thinks", () => {
    renderLudo(online(snapshotAfter(3, lostRoll(1), 2, [HUMAN, MINH, AI_SEAT])));

    expect(screen.getByRole("status").textContent).toBe(
      "Minh vừa gieo được 3, mất lượt. Máy đang nghĩ…",
    );
  });
});

/**
 * A same-device game for two that plays each move submitted, rolling the faces given in turn: the
 * board placed by the play screen's own layout.
 */
function playableTransport(
  start: LudoState,
  faces: LudoOutcome[],
): Transport<LudoState, LudoMove, LudoOutcome> {
  const listeners = new Set<(event: TransportEvent) => void>();
  const build = (state: LudoState, moveCount: number): LudoSnapshot => ({
    status: "ready",
    state,
    legalMoves: ludo.legalMoves(state),
    currentPlayer: state.toMove,
    result: null,
    lastEntry: null,
    lastMover: null,
    moveCount,
    canUndo: false,
    canRedo: false,
    canMove: true,
    viewer: null,
    seats: [HUMAN, HUMAN],
    waitingFor: null,
    inProgress: moveCount > 0,
    supportsUndo: true,
    canStartNewGame: true,
    resign: null,
    turn: null,
    connection: null,
    options: LUDO_DEFAULT_OPTIONS,
  });
  let snapshot = build(start, 0);
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    submit: (move) => {
      const state = ludo.applyMove(
        snapshot.state,
        move,
        move.type === "roll" ? faces.shift() : undefined,
      );
      snapshot = build(state, snapshot.moveCount + 1);
      for (const listener of listeners) listener({ type: "changed" });
    },
    requestUndo: vi.fn(),
    requestRedo: vi.fn(),
    requestNewGame: vi.fn(),
    resign: vi.fn(),
    claimAbandoned: vi.fn(),
    dispose: vi.fn(),
  };
}

describe("PlayScreen's layout with Cờ cá ngựa", () => {
  const start = (): LudoState => {
    const setup = ludo.setup({ playerCount: 2, options: LUDO_DEFAULT_OPTIONS });
    return { ...setup, horses: [[10, 30, IN_STABLE, IN_STABLE], setup.horses[1] ?? []] };
  };

  it("Gieo và đi bằng bàn phím: roll, choose and back to the roll button, wherever the controls sit", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <PlayScreen gameId="ludo" transport={playableTransport(start(), [4])} ui={ui} />,
    );
    const rollButton = screen.getByRole("button", { name: "Gieo xúc xắc" });

    // "Back to menu", the rules, the theme and the language in the top bar, then the game's
    // controls: the board itself takes no focus.
    await user.tab();
    expect(screen.getByRole("link", { name: "Về menu" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Luật chơi" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: /^Giao diện/ })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: /^Ngôn ngữ/ })).toHaveFocus();
    await user.tab();
    expect(rollButton).toHaveFocus();
    await user.keyboard("{Enter}");

    const [first] = within(screen.getByRole("group", { name: "Chọn ngựa" })).getAllByRole("button");
    expect(first).toHaveFocus();
    expect(first).toHaveAccessibleName("Ngựa 1: tới ô 15");
    await user.keyboard("{Enter}");

    expect(rollButton).toHaveFocus();
    expect(
      within(screen.getByRole("list", { name: "Vị trí các ngựa" })).getByText(
        "Đỏ, ngựa 1: ô 15 (vừa đi)",
      ),
    ).toBeInTheDocument();
  });

  it("puts the turn, the board, the game's controls and the game's buttons in that order", () => {
    renderWithIntl(<PlayScreen gameId="ludo" transport={playableTransport(start(), [])} ui={ui} />);

    const order = [
      screen.getByRole("status"),
      screen.getByRole("list", { name: "Vị trí các ngựa" }),
      screen.getByRole("button", { name: "Gieo xúc xắc" }),
      screen.getByRole("button", { name: "Hoàn tác" }),
    ];
    for (const [index, element] of order.slice(1).entries()) {
      expect(order[index]?.compareDocumentPosition(element)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    }
    expect(document.querySelector("main")?.closest("[data-game]")).toHaveAttribute(
      "data-game",
      "ludo",
    );
  });
});
