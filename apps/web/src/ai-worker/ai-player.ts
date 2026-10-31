import type { AiPlayer, AiRequest } from "@/transport/types";

import { type AiWorkerRequest, type AiWorkerResponse, computeAiMove } from "./compute-ai-move";

/** How much longer than its time limit the Worker may take before it is given up on. */
const WORKER_GRACE_MS = 2000;
/**
 * The time limit on the main thread, kept short so the page does not freeze; the level's minimum
 * lookahead is finished even past it.
 */
const MAIN_THREAD_TIME_LIMIT_MS = 200;

/** A started Worker, as the AI player uses it. */
export interface AiWorkerPort {
  post(this: void, message: AiWorkerRequest): void;
  terminate(this: void): void;
}

interface AiWorkerHandlers {
  readonly onMessage: (data: unknown) => void;
  readonly onError: () => void;
}

/** Starts a Worker; throws when it cannot (no Worker support, blocked script). */
export type StartAiWorker = (handlers: AiWorkerHandlers) => AiWorkerPort;

const startAiWorker: StartAiWorker = ({ onMessage, onError }) => {
  // Written out in full here so the bundler finds the Worker and builds it as its own chunk.
  const worker = new Worker(new URL("./ai.worker.ts", import.meta.url), { type: "module" });
  worker.addEventListener("message", (event: MessageEvent<unknown>) => {
    onMessage(event.data);
  });
  worker.addEventListener("error", onError);
  worker.addEventListener("messageerror", onError);
  return {
    post: (message) => {
      worker.postMessage(message);
    },
    terminate: () => {
      worker.terminate();
    },
  };
};

function isResponse(data: unknown): data is AiWorkerResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    typeof data.id === "number" &&
    "ok" in data &&
    typeof data.ok === "boolean"
  );
}

const defaultNow = () => performance.now();

/** Chooses moves on the calling thread: for unit tests, and as the Worker's fallback. */
export function createInlineAiPlayer(now: () => number = defaultNow): AiPlayer {
  return {
    chooseMove: (request) =>
      new Promise((resolve, reject) => {
        // Computed in a later task, not right away: the request comes in as the player's move is
        // shown, and a busy main thread would only paint that move once the AI has chosen its own.
        setTimeout(() => {
          try {
            resolve(computeAiMove(request, now));
          } catch (error) {
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        }, 0);
      }),
    dispose: () => undefined,
  };
}

interface Pending {
  readonly request: AiRequest;
  readonly resolve: (move: unknown) => void;
  readonly reject: (reason: unknown) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

/**
 * Chooses moves in a Web Worker, started on the first request, so the page never freezes while the
 * AI thinks. If the Worker cannot start, reports an error or does not answer in time, it is
 * stopped and this and every later request run on the main thread with a short time limit, so the
 * AI still moves. A request fails only when the main thread fails too.
 */
export function createWorkerAiPlayer({
  startWorker = startAiWorker,
  now = defaultNow,
}: { readonly startWorker?: StartAiWorker; readonly now?: () => number } = {}): AiPlayer {
  let port: AiWorkerPort | undefined;
  let broken = false;
  let disposed = false;
  let nextId = 0;
  const pending = new Map<number, Pending>();
  const onMainThread = createInlineAiPlayer(now);

  function runOnMainThread(request: AiRequest): Promise<unknown> {
    return onMainThread.chooseMove({
      ...request,
      timeLimitMs: Math.min(request.timeLimitMs, MAIN_THREAD_TIME_LIMIT_MS),
    });
  }

  function stopWorker(): void {
    port?.terminate();
    port = undefined;
    for (const { timer } of pending.values()) clearTimeout(timer);
  }

  /** Gives up on the Worker for good and moves what it still owed to the main thread. */
  function fallBack(): void {
    if (broken) return;
    broken = true;
    const owed = [...pending.values()];
    stopWorker();
    pending.clear();
    for (const { request, resolve, reject } of owed) {
      runOnMainThread(request).then(resolve, reject);
    }
  }

  function onMessage(data: unknown): void {
    if (!isResponse(data)) {
      fallBack();
      return;
    }
    const waiting = pending.get(data.id);
    if (waiting === undefined) return;
    if (!data.ok) {
      fallBack();
      return;
    }
    pending.delete(data.id);
    clearTimeout(waiting.timer);
    waiting.resolve(data.move);
  }

  function start(): AiWorkerPort | undefined {
    try {
      port ??= startWorker({ onMessage, onError: fallBack });
      return port;
    } catch {
      broken = true;
      return undefined;
    }
  }

  return {
    chooseMove: (request) => {
      if (disposed) return Promise.reject(new Error("The AI player was disposed"));
      const worker = broken ? undefined : start();
      if (worker === undefined) return runOnMainThread(request);
      const id = (nextId += 1);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(fallBack, request.timeLimitMs + WORKER_GRACE_MS);
        pending.set(id, { request, resolve, reject, timer });
        try {
          worker.post({ id, request });
        } catch {
          fallBack();
        }
      });
    },
    dispose: () => {
      disposed = true;
      const owed = [...pending.values()];
      stopWorker();
      pending.clear();
      for (const { reject } of owed) reject(new Error("The AI player was disposed"));
    },
  };
}
