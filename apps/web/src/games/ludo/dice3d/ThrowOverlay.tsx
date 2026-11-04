"use client";

import type { LudoColourName } from "@board-games/games/ludo";
import { cn } from "@board-games/ui";
import { useTranslations } from "next-intl";
import { type SyntheticEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { PIECE_LINE_BORDER, PIECE_LINE_STROKE } from "../piece-style";
import type { DiceStage, StagePoint } from "./stage-types";
import type { ThrowResult } from "./use-dice-throw";
import { powerOf, THROW_PHASE, type ThrowPhase } from "./use-hold-to-roll";

interface ThrowOverlayProps {
  readonly phase: ThrowPhase;
  readonly stage: DiceStage | null;
  /** The roller's colour: the die's edge, the power ring, the number's frame. */
  readonly colour: LudoColourName;
  readonly holdStartedAt: number | null;
  readonly result: ThrowResult | null;
  readonly topFace: number | null;
  /** Where the die rests on the canvas, once at rest. */
  readonly restAt: StagePoint | null;
  readonly fading: boolean;
}

/** Swallows a pointer on the overlay once the die is thrown: nothing behind it may be pressed. */
function swallow(event: SyntheticEvent) {
  event.preventDefault();
  event.stopPropagation();
}

/** How far the number stands from the resting die's centre, as a fraction of the canvas. */
const DIE_CLEARANCE = 0.12;

/** How near a side of the canvas the number's centre may go: about half its width. */
const CARD_SIDE = 0.22;

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/** The power ring's circumference, as a fraction (`pathLength="1"`). */
const RING = 1;

/**
 * The throw of the 3D die (design of redesign-ludo-play §4): over the whole screen (a portal into
 * the body, so no ancestor's transform breaks `fixed`), the page dimmed and blurred behind it, the
 * die in the middle with its power ring while held and its number at rest. Hidden from assistive
 * technology: the board says the result, once, when the die rests. `data-throw="3d"` is the
 * end-to-end tests' contract.
 */
export function ThrowOverlay({
  phase,
  stage,
  colour,
  holdStartedAt,
  result,
  topFace,
  restAt,
  fading,
}: ThrowOverlayProps) {
  const t = useTranslations("Games.ludo.throw");
  const open = phase !== THROW_PHASE.Idle && stage !== null;
  const host = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const ring = useRef<SVGCircleElement>(null);
  const [shown, setShown] = useState(false);

  // The stage's canvas goes into the overlay while it is open, then fades in.
  useEffect(() => {
    const box = host.current;
    if (!open || box === null) return undefined;
    box.prepend(stage.canvas);
    const frame = requestAnimationFrame(() => {
      setShown(true);
    });
    return () => {
      cancelAnimationFrame(frame);
      setShown(false);
      stage.canvas.remove();
    };
  }, [open, stage]);

  // No scrolling of the page behind the overlay, by a wheel or a finger (listeners that may cancel:
  // React's own wheel and touch listeners are passive).
  useEffect(() => {
    const overlay = root.current;
    if (!open || overlay === null) return undefined;
    const stop = (event: Event) => {
      event.preventDefault();
    };
    overlay.addEventListener("wheel", stop, { passive: false });
    overlay.addEventListener("touchmove", stop, { passive: false });
    return () => {
      overlay.removeEventListener("wheel", stop);
      overlay.removeEventListener("touchmove", stop);
    };
  }, [open]);

  // The power ring fills while held, drawn by script (an SVG attribute per frame).
  useEffect(() => {
    if (holdStartedAt === null) return undefined;
    let frame = 0;
    const draw = () => {
      ring.current?.setAttribute(
        "stroke-dashoffset",
        String(RING - powerOf(performance.now() - holdStartedAt)),
      );
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [holdStartedAt]);

  if (!open) return null;
  const holding = phase === THROW_PHASE.Hold;
  // The ring is centred where the hand holds the die (fixed for the stage's square canvas).
  const holdAt = stage.holdPoint();
  // The number goes below the resting die, or above it when the die rests low.
  const dieAt = restAt;
  const above = dieAt !== null && dieAt.y > 0.42;

  return createPortal(
    <div
      data-game="ludo"
      data-throw="3d"
      data-phase={phase}
      data-top-face={topFace ?? undefined}
      aria-hidden
      className={cn(
        "fixed inset-0 z-35 flex items-center justify-center bg-overlay backdrop-blur-[6px] backdrop-saturate-[0.85] transition-opacity duration-150 motion-reduce:transition-none",
        shown && !fading ? "opacity-100" : "opacity-0",
        // It takes every pointer until it goes: a pointer holding the die is the roll button's
        // (captured), anything else lands here and does nothing, so nothing behind it is pressed
        // (a hold of Space included). Nor does the page scroll behind it.
        "pointer-events-auto touch-none overscroll-contain",
      )}
      ref={root}
      onPointerDown={swallow}
      onClick={swallow}
      onContextMenu={swallow}
    >
      <div ref={host} className="relative size-[min(96vmin,36rem)] [&>canvas]:size-full">
        <svg
          viewBox="0 0 150 150"
          // Where the hand holds the die: geometry from the stage, not a look.
          style={{ left: `${holdAt.x * 100}%`, top: `${holdAt.y * 100}%` }}
          className={cn(
            "absolute aspect-square w-[42%] -translate-1/2 transition-opacity duration-150 motion-reduce:transition-none",
            holding ? "opacity-100" : "opacity-0",
          )}
        >
          <circle
            cx="75"
            cy="75"
            r="66"
            fill="none"
            strokeWidth="7"
            className="stroke-surface/40"
          />
          <circle
            ref={ring}
            cx="75"
            cy="75"
            r="66"
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
            pathLength={RING}
            strokeDasharray={RING}
            strokeDashoffset={RING}
            transform="rotate(-90 75 75)"
            className={PIECE_LINE_STROKE[colour]}
          />
        </svg>
        {result !== null && dieAt !== null && (
          <div
            data-throw-result=""
            // Beside the die where it rests: geometry from the stage, not a look.
            // Over or under the die (about a tenth of the canvas from its centre), kept inside the
            // canvas sideways.
            style={{
              left: `${clamp(dieAt.x, CARD_SIDE, 1 - CARD_SIDE) * 100}%`,
              top: `${(dieAt.y + (above ? -DIE_CLEARANCE : DIE_CLEARANCE)) * 100}%`,
            }}
            className={cn(
              "absolute min-w-36 -translate-x-1/2 rounded-card border-3 bg-surface px-5 pt-1.5 pb-2.5 text-center text-fg shadow-raised",
              above && "-translate-y-full",
              PIECE_LINE_BORDER[colour],
            )}
          >
            <p className="text-[4rem] leading-none font-extrabold tabular-nums">{result.face}</p>
            {(result.again || result.lost) && (
              <p className="mt-1 text-small font-bold">{result.again ? t("again") : t("lost")}</p>
            )}
          </div>
        )}
      </div>
      <p
        className={cn(
          "absolute bottom-[18%] left-1/2 -translate-x-1/2 rounded-full bg-surface px-3.5 py-1.5 text-small font-semibold whitespace-nowrap text-fg shadow-raised transition-opacity duration-150 motion-reduce:transition-none",
          holding ? "opacity-100" : "opacity-0",
        )}
      >
        {t("tip")}
      </p>
    </div>,
    document.body,
  );
}
