import { type AiWorkerRequest, type AiWorkerResponse, computeAiMove } from "./compute-ai-move";

/** The part of the Worker's global scope used here (the app's TypeScript lib is DOM, not WebWorker). */
interface WorkerScope {
  addEventListener(type: "message", listener: (event: MessageEvent<AiWorkerRequest>) => void): void;
  postMessage(message: AiWorkerResponse): void;
}

const scope = globalThis as unknown as WorkerScope;

// Thinks off the main thread, so the page stays responsive. Loaded only through
// `new URL("./ai.worker.ts", import.meta.url)` in ai-player.ts.
scope.addEventListener("message", ({ data: { id, request } }) => {
  let response: AiWorkerResponse;
  try {
    response = { id, ok: true, move: computeAiMove(request, () => performance.now()) };
  } catch {
    response = { id, ok: false };
  }
  scope.postMessage(response);
});
