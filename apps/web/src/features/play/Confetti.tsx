"use client";

import { cn } from "@board-games/ui";
import { useEffect, useRef } from "react";

/**
 * The pieces: where each starts (along the left and right edges, so the board stays clear), when it
 * starts, its colour and shape. Fixed values, never `Math.random` in a render, written out in full
 * so Tailwind finds them.
 */
const PIECES = [
  "left-[7%] top-[11%] [animation-delay:180ms] bg-celebration h-2.5 w-1.5 rounded-[1px]",
  "left-[94%] top-[5%] [animation-delay:30ms] bg-accent size-2 rounded-full",
  "left-[15%] top-[8%] [animation-delay:150ms] bg-success h-1.5 w-3 rounded-[1px]",
  "left-[93%] top-[9%] [animation-delay:240ms] bg-piece-yellow h-2.5 w-1.5 rounded-[1px]",
  "left-[5%] top-[4%] [animation-delay:30ms] bg-celebration size-2 rounded-full",
  "left-[90%] top-[28%] [animation-delay:30ms] bg-accent h-1.5 w-3 rounded-[1px]",
  "left-[5%] top-[24%] [animation-delay:240ms] bg-success h-2.5 w-1.5 rounded-[1px]",
  "left-[90%] top-[3%] [animation-delay:270ms] bg-piece-yellow size-2 rounded-full",
  "left-[3%] top-[16%] [animation-delay:300ms] bg-celebration h-1.5 w-3 rounded-[1px]",
  "left-[96%] top-[19%] [animation-delay:270ms] bg-accent h-2.5 w-1.5 rounded-[1px]",
  "left-[11%] top-[27%] [animation-delay:0ms] bg-success size-2 rounded-full",
  "left-[87%] top-[4%] [animation-delay:240ms] bg-piece-yellow h-1.5 w-3 rounded-[1px]",
  "left-[15%] top-[20%] [animation-delay:120ms] bg-celebration h-2.5 w-1.5 rounded-[1px]",
  "left-[90%] top-[11%] [animation-delay:240ms] bg-accent size-2 rounded-full",
  "left-[3%] top-[30%] [animation-delay:240ms] bg-success h-1.5 w-3 rounded-[1px]",
  "left-[97%] top-[13%] [animation-delay:30ms] bg-piece-yellow h-2.5 w-1.5 rounded-[1px]",
  "left-[11%] top-[14%] [animation-delay:150ms] bg-celebration size-2 rounded-full",
  "left-[85%] top-[16%] [animation-delay:270ms] bg-accent h-1.5 w-3 rounded-[1px]",
  "left-[2%] top-[9%] [animation-delay:210ms] bg-success h-2.5 w-1.5 rounded-[1px]",
  "left-[94%] top-[33%] [animation-delay:150ms] bg-piece-yellow size-2 rounded-full",
  "left-[9%] top-[33%] [animation-delay:150ms] bg-celebration h-1.5 w-3 rounded-[1px]",
  "left-[88%] top-[22%] [animation-delay:60ms] bg-accent h-2.5 w-1.5 rounded-[1px]",
  "left-[13%] top-[3%] [animation-delay:30ms] bg-success size-2 rounded-full",
  "left-[93%] top-[25%] [animation-delay:240ms] bg-piece-yellow h-1.5 w-3 rounded-[1px]",
] as const;

/** Past the longest piece (1.2 s + 0.3 s of delay): gone even if no `animationend` ever came. */
const CONFETTI_MAX_MS = 2000;

interface ConfettiProps {
  /** Every piece has fallen: the caller removes the confetti. */
  readonly onDone: () => void;
}

/**
 * A short shower of confetti (1.2 s, once) for a person here who just won: decorative, under no
 * pointer, so every button stays usable. The caller never mounts it with reduced motion; CSS hides
 * it too, should the preference be read late.
 */
export function Confetti({ onDone }: ConfettiProps) {
  const shower = useRef<HTMLDivElement>(null);
  // Pieces fallen so far, kept across renders of the caller (which may pass a new `onDone`).
  const ended = useRef(0);
  // Listened to on the element itself: the end of a CSS animation is a plain DOM event.
  useEffect(() => {
    const node = shower.current;
    if (node === null) return;
    const onEnd = () => {
      ended.current += 1;
      if (ended.current === PIECES.length) onDone();
    };
    node.addEventListener("animationend", onEnd);
    // A hidden tab or a browser that skips the animation never tells its end.
    const timer = setTimeout(onDone, CONFETTI_MAX_MS);
    return () => {
      node.removeEventListener("animationend", onEnd);
      clearTimeout(timer);
    };
  }, [onDone]);
  return (
    <div
      ref={shower}
      aria-hidden
      data-confetti=""
      className="pointer-events-none fixed inset-0 z-20 overflow-hidden motion-reduce:hidden"
    >
      {PIECES.map((piece) => (
        <span key={piece} className={cn("absolute animate-confetti", piece)} />
      ))}
    </div>
  );
}
