import { tictactoe } from "@board-games/games";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AiRequest } from "@/transport/types";

import {
  type AiWorkerPort,
  createInlineAiPlayer,
  createWorkerAiPlayer,
  type StartAiWorker,
} from "./ai-player";
import type * as ComputeAiMoveModule from "./compute-ai-move";
import { type AiWorkerRequest, computeAiMove } from "./compute-ai-move";

vi.mock("./compute-ai-move", async (importOriginal) => {
  const actual = await importOriginal<typeof ComputeAiMoveModule>();
  return { ...actual, computeAiMove: vi.fn(actual.computeAiMove) };
});

const REQUEST: AiRequest = {
  gameId: "tictactoe",
  state: tictactoe.setup(),
  level: "hard",
  timeLimitMs: 1500,
  seed: 1,
};

/** A Worker stand-in: records what it is sent and lets the test answer or fail. */
function fakeWorker() {
  const posted: AiWorkerRequest[] = [];
  const port: AiWorkerPort & { terminated: boolean } = {
    terminated: false,
    post: (message) => {
      posted.push(message);
    },
    terminate: () => {
      port.terminated = true;
    },
  };
  let handlers: Parameters<StartAiWorker>[0] | undefined;
  const startWorker = vi.fn<StartAiWorker>((given) => {
    handlers = given;
    return port;
  });
  return {
    port,
    posted,
    startWorker,
    answer: (data: unknown) => {
      handlers?.onMessage(data);
    },
    fail: () => {
      handlers?.onError();
    },
  };
}

/** Settles a promise into a value that can be checked without awaiting it. */
function track(promise: Promise<unknown>) {
  const outcome: { status: "pending" | "resolved" | "rejected"; value?: unknown } = {
    status: "pending",
  };
  promise.then(
    (value) => {
      outcome.status = "resolved";
      outcome.value = value;
    },
    (reason: unknown) => {
      outcome.status = "rejected";
      outcome.value = reason;
    },
  );
  return outcome;
}

/** Lets the main thread compute what was moved to it, then gives its outcome. */
async function settled<T>(promise: Promise<T>): Promise<T> {
  await vi.runOnlyPendingTimersAsync();
  return promise;
}

function ranOnMainThread(): void {
  expect(computeAiMove).toHaveBeenCalledWith(
    expect.objectContaining({ timeLimitMs: 200 }),
    expect.any(Function),
  );
}

describe("createWorkerAiPlayer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(computeAiMove).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts the Worker on the first request and pairs answers with requests by id", async () => {
    const worker = fakeWorker();
    const player = createWorkerAiPlayer({ startWorker: worker.startWorker });
    expect(worker.startWorker).not.toHaveBeenCalled();

    const first = player.chooseMove(REQUEST);
    const second = player.chooseMove({ ...REQUEST, seed: 2 });
    const [one, two] = worker.posted;
    worker.answer({ id: two?.id, ok: true, move: { cell: 2 } });
    worker.answer({ id: one?.id, ok: true, move: { cell: 1 } });

    expect(worker.startWorker).toHaveBeenCalledTimes(1);
    expect(worker.posted.map(({ request }) => request.seed)).toEqual([1, 2]);
    await expect(first).resolves.toEqual({ cell: 1 });
    await expect(second).resolves.toEqual({ cell: 2 });
    expect(computeAiMove).not.toHaveBeenCalled();
  });

  it("runs on the main thread when the Worker reports an error, and never uses it again", async () => {
    const worker = fakeWorker();
    const player = createWorkerAiPlayer({ startWorker: worker.startWorker });

    const move = player.chooseMove(REQUEST);
    worker.fail();

    expect(tictactoe.legalMoves(tictactoe.setup())).toContainEqual(await settled(move));
    ranOnMainThread();
    expect(worker.port.terminated).toBe(true);

    await settled(player.chooseMove(REQUEST));
    expect(worker.posted).toHaveLength(1);
    expect(worker.startWorker).toHaveBeenCalledTimes(1);
    expect(computeAiMove).toHaveBeenCalledTimes(2);
  });

  it("runs on the main thread when the Worker cannot choose a move", async () => {
    const worker = fakeWorker();
    const player = createWorkerAiPlayer({ startWorker: worker.startWorker });

    const move = player.chooseMove(REQUEST);
    worker.answer({ id: worker.posted[0]?.id, ok: false });

    await expect(settled(move)).resolves.toBeDefined();
    ranOnMainThread();
  });

  it("gives up on a Worker that does not answer within its time limit plus 2 s", async () => {
    const worker = fakeWorker();
    const player = createWorkerAiPlayer({ startWorker: worker.startWorker });

    const chosen = player.chooseMove(REQUEST);
    const move = track(chosen);
    await vi.advanceTimersByTimeAsync(REQUEST.timeLimitMs + 1999);
    expect(move.status).toBe("pending");
    expect(computeAiMove).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await settled(chosen);

    expect(move.status).toBe("resolved");
    ranOnMainThread();
    expect(worker.port.terminated).toBe(true);
    // A late answer from the stopped Worker changes nothing.
    const first = move.value;
    worker.answer({ id: worker.posted[0]?.id, ok: true, move: { cell: -1 } });
    await vi.advanceTimersByTimeAsync(0);
    expect(move.value).toBe(first);
  });

  it("runs on the main thread when the Worker cannot be started", async () => {
    const startWorker = vi.fn<StartAiWorker>(() => {
      throw new Error("Worker is not defined");
    });
    const player = createWorkerAiPlayer({ startWorker });

    await expect(settled(player.chooseMove(REQUEST))).resolves.toBeDefined();
    await expect(settled(player.chooseMove(REQUEST))).resolves.toBeDefined();

    expect(startWorker).toHaveBeenCalledTimes(1);
    ranOnMainThread();
  });

  it("rejects when the main thread fails too", async () => {
    const worker = fakeWorker();
    const player = createWorkerAiPlayer({ startWorker: worker.startWorker });
    vi.mocked(computeAiMove).mockImplementationOnce(() => {
      throw new Error("no move");
    });

    const move = track(player.chooseMove(REQUEST));
    worker.fail();
    await vi.runOnlyPendingTimersAsync();

    expect(move.status).toBe("rejected");
    expect(move.value).toEqual(new Error("no move"));
  });

  it("stops the Worker on dispose and rejects what is still pending", async () => {
    const worker = fakeWorker();
    const player = createWorkerAiPlayer({ startWorker: worker.startWorker });
    const move = player.chooseMove(REQUEST);

    player.dispose();

    expect(worker.port.terminated).toBe(true);
    await expect(move).rejects.toThrow("disposed");
    await expect(player.chooseMove(REQUEST)).rejects.toThrow("disposed");
    await vi.advanceTimersByTimeAsync(REQUEST.timeLimitMs + 2000);
    expect(computeAiMove).not.toHaveBeenCalled();
  });
});

describe("createInlineAiPlayer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(computeAiMove).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("chooses in a later task, so the player's move can be shown first", async () => {
    const player = createInlineAiPlayer();

    const move = track(player.chooseMove(REQUEST));
    await Promise.resolve();
    expect(computeAiMove).not.toHaveBeenCalled();
    expect(move.status).toBe("pending");

    await vi.advanceTimersByTimeAsync(0);

    expect(computeAiMove).toHaveBeenCalledOnce();
    expect(move.status).toBe("resolved");
    expect(tictactoe.legalMoves(tictactoe.setup())).toContainEqual(move.value);
  });

  it("rejects when no move can be chosen", async () => {
    const player = createInlineAiPlayer();

    const move = player.chooseMove({ ...REQUEST, gameId: "khong-co-game-nay" });
    const outcome = track(move);
    await vi.advanceTimersByTimeAsync(0);

    expect(outcome.status).toBe("rejected");
    await expect(move).rejects.toThrow("Unknown game");
  });
});
