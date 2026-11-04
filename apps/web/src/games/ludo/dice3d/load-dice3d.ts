"use client";

import { useEffect, useRef, useState } from "react";

import type { Dice3dModule, DiceStage, DieColours } from "./stage-types";

// Loading the 3D die (design of redesign-ludo-play §2, §3): three.js and cannon-es come in one chunk
// of their own, fetched with `import()` only once the roll button can first be pressed by a person
// at this device, while the page is idle; never on another page, nor for a spectator. Without
// WebGL, or until the chunk and its stage are ready, or once they fail, the board rolls with its 2D
// die.

/** WebGL found once: kept for the session. A miss is not kept (a GPU busy for a moment). */
let webgl = false;

/**
 * Whether this browser can draw WebGL, the test canvas's context freed at once. Checked again by
 * every board that asks until it is found once.
 */
export function webglAvailable(): boolean {
  if (webgl) return true;
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    webgl = context !== null;
    context?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webgl = false;
  }
  return webgl;
}

let loading: Promise<Dice3dModule> | null = null;

/** The chunk of the 3D die, fetched once. A failure is not kept: a later screen may try again. */
export function loadDice3d(): Promise<Dice3dModule> {
  loading ??= import("./dice-stage").catch((error: unknown) => {
    loading = null;
    throw error;
  });
  return loading;
}

/** Runs `task` when the page is idle (soon, where `requestIdleCallback` is missing). */
function whenIdle(task: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(task, { timeout: 2000 });
    return () => {
      window.cancelIdleCallback(handle);
    };
  }
  const handle = setTimeout(task, 200);
  return () => {
    clearTimeout(handle);
  };
}

/**
 * The 3D die of a Ludo board, ready to throw: loaded the first time `wanted` (a roll button a
 * person here may press) and kept until the board goes; `null` (the 2D die rolls) until then,
 * without WebGL, or once it failed (its context lost, an error while drawing): every later roll
 * of this board uses the 2D die. `colours`: the die's colours to prepare, read when it is.
 * Safe with StrictMode's double mount: the stage made by an effect is freed by its cleanup.
 */
export function useDice3d(wanted: boolean, colours: () => DieColours): DiceStage | null {
  const readColours = useRef(colours);
  useEffect(() => {
    readColours.current = colours;
  });
  const [asked, setAsked] = useState(false);
  const [stage, setStage] = useState<DiceStage | null>(null);
  const [failed, setFailed] = useState(false);
  if (wanted && !asked) setAsked(true);

  useEffect(() => {
    if (!asked || failed || !webglAvailable()) return undefined;
    let made: DiceStage | null = null;
    let cancelled = false;
    let cancelIdle = whenIdle(() => {
      loadDice3d().then(
        (module) => {
          if (cancelled) return;
          try {
            made = module.createDiceStage();
          } catch {
            setFailed(true);
            return;
          }
          const ready = made;
          ready.onFailure(() => {
            setFailed(true);
          });
          // The shaders are compiled while idle too, so the first press never stalls.
          cancelIdle = whenIdle(() => {
            if (cancelled) return;
            ready.prepare(readColours.current());
            setStage(ready);
          });
        },
        () => {
          if (!cancelled) setFailed(true);
        },
      );
    });
    return () => {
      cancelled = true;
      cancelIdle();
      made?.dispose();
      setStage(null);
    };
  }, [asked, failed]);

  return failed ? null : stage;
}
