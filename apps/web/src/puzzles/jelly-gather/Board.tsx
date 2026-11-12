"use client";

import "./theme.css";

import { cn } from "@board-games/ui";
import { useLayoutEffect, useRef } from "react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

import { CELL, PieceShape, Player } from "./pieces";
import { type Board, type Direction, type Level, OFFSET } from "./rules/types";

// Gom thạch's tray (design §7): the floor, its walls, the pieces and the player, and one moment a
// move. Decorative for screen readers: the board's text description and the move announcements
// say the same.

/** A move to show: the cells that slid there, and the pieces that stuck in it. */
export interface BoardMotion {
  /** A new number each move: the same motion is shown once. */
  readonly serial: number;
  readonly direction: Direction;
  /** Where the cells that were pushed are now. */
  readonly slid: ReadonlySet<number>;
  /** The first cell of each piece that stuck or was fixed in this move. */
  readonly settled: ReadonlySet<number>;
}

const SLIDE_MS = 120;
const r1 = (value: number) => Math.round(value * 10) / 10;
const SETTLE_MS = 80;
const BUMP_MS = 140;

interface JellyBoardProps {
  readonly level: Level;
  readonly board: Board;
  /** Where the player looks: the last move's direction. */
  readonly face: Direction;
  /** The move just made, to show once; none for a board shown as it is (a level opened, restored). */
  readonly motion: BoardMotion | null;
  /** A move that could not happen, to show once as a nudge of the player. */
  readonly bump?: { readonly serial: number; readonly direction: Direction } | null;
  readonly className?: string;
}

export function JellyBoard({
  level,
  board,
  face,
  motion,
  bump = null,
  className,
}: JellyBoardProps) {
  const { width, height, walls } = level;
  const svgRef = useRef<SVGSVGElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const shown = useRef<number | null>(motion?.serial ?? null);
  const bumped = useRef<number | null>(bump?.serial ?? null);

  useLayoutEffect(() => {
    if (bump === null || bump.serial === bumped.current) return;
    bumped.current = bump.serial;
    const player = svgRef.current?.querySelector<SVGGElement>("[data-player]");
    if (reducedMotion || typeof player?.animate !== "function") return;
    const [dx, dy] = OFFSET[bump.direction];
    player.animate(
      [
        { transform: "none" },
        { transform: `translate(${dx * CELL * 0.12}px, ${dy * CELL * 0.12}px)` },
        { transform: "none" },
      ],
      { duration: BUMP_MS, easing: "ease-out" },
    );
  }, [bump, reducedMotion]);

  // One moment a move (design §7): what was pushed slides in from where it was, then whatever stuck
  // settles with a squash. A new move does not wait: its board is already the one drawn.
  useLayoutEffect(() => {
    if (motion === null || motion.serial === shown.current) return;
    shown.current = motion.serial;
    const svg = svgRef.current;
    if (svg === null || reducedMotion) return;
    const [dx, dy] = OFFSET[motion.direction];
    const from = `translate(${-dx * CELL}px, ${-dy * CELL}px)`;
    for (const element of svg.querySelectorAll<SVGGraphicsElement>("[data-slide]")) {
      if (typeof element.animate !== "function") return;
      element.animate([{ transform: from }, { transform: "none" }], {
        duration: SLIDE_MS,
        easing: "cubic-bezier(0.2, 0.8, 0.3, 1)",
      });
    }
    for (const element of svg.querySelectorAll<SVGGElement>("[data-settled]")) {
      element.animate(
        [{ transform: "scale(1)" }, { transform: "scale(1.06, 0.94)" }, { transform: "scale(1)" }],
        { duration: SETTLE_MS, delay: SLIDE_MS, easing: "ease-out" },
      );
    }
  }, [motion, reducedMotion]);

  const viewWidth = width * CELL;
  const viewHeight = height * CELL;
  const slid = motion?.slid ?? new Set<number>();
  const settled = motion?.settled ?? new Set<number>();
  const px = (board.player % width) * CELL + CELL / 2;
  const py = Math.floor(board.player / width) * CELL + CELL / 2;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      aria-hidden
      data-jelly-board=""
      style={{ maxWidth: viewWidth, maxHeight: viewHeight }}
      className={cn("block size-full select-none", className)}
    >
      <rect width={viewWidth} height={viewHeight} rx={CELL * 0.3} className="fill-game-board" />
      {Array.from({ length: height - 1 }, (_, row) => (
        <path
          key={`h${row}`}
          d={`M0 ${(row + 1) * CELL}H${viewWidth}`}
          strokeWidth={1}
          className="stroke-game-line"
        />
      ))}
      {Array.from({ length: width - 1 }, (_, col) => (
        <path
          key={`v${col}`}
          d={`M${(col + 1) * CELL} 0V${viewHeight}`}
          strokeWidth={1}
          className="stroke-game-line"
        />
      ))}
      {[...walls].map((at) => {
        const x = (at % width) * CELL;
        const y = Math.floor(at / width) * CELL;
        return (
          <g key={`w${at}`}>
            <rect x={x} y={y} width={CELL} height={CELL} className="fill-(--jelly-gather-wall)" />
            <rect
              x={r1(x + CELL * 0.12)}
              y={r1(y + CELL * 0.12)}
              width={r1(CELL * 0.76)}
              height={r1(CELL * 0.62)}
              rx={r1(CELL * 0.1)}
              className="fill-(--jelly-gather-wall-top)"
            />
          </g>
        );
      })}
      {board.pieces.map((piece) => {
        const first = piece.cells[0] ?? 0;
        return (
          <g
            key={first}
            data-piece={piece.kinds.join(" ")}
            {...(piece.fixed && { "data-fixed": "" })}
            {...(settled.has(first) && { "data-settled": "" })}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          >
            <PieceShape piece={piece} width={width} walls={walls} slid={slid} />
          </g>
        );
      })}
      <g data-slide="" data-player="">
        <Player x={px} y={py} face={face} />
      </g>
    </svg>
  );
}
