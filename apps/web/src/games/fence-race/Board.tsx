"use client";

import type { PlayerIndex } from "@board-games/engine";
import {
  type Fence,
  FENCE_RACE_REASON,
  type FenceRaceCell,
  fenceRaceGoalSide,
  fenceRaceIsGoal,
  type FenceRaceMove,
  type FenceRaceSide,
  type FenceRaceState,
  fenceRaceWay,
  sameFence,
} from "@board-games/games/fence-race";
import { Button, cn, RotateCwIcon, XIcon } from "@board-games/ui";
import { useFormatter, useTranslations } from "next-intl";
import {
  type CSSProperties,
  type KeyboardEvent,
  memo,
  type MouseEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

import type { BoardProps } from "../types";
import {
  boardDirection,
  type BoardGeometry,
  boardHeight,
  boardWidth,
  cellCentre,
  type Direction,
  SMALL_CELL_PX,
  stepHitArea,
} from "./board-geometry";
import { cellName, fenceFrame, fenceOnSide, SCREEN_SIDES, screenSide } from "./board-layout";
import {
  BadFence,
  ChosenFence,
  EdgeNames,
  Fields,
  Gate,
  GoalMark,
  GoneFence,
  HatsInCell,
  LeftMark,
  PreviewFence,
  ShareFrame,
  TargetMark,
  Wall,
  WayLine,
} from "./pieces";
import { useBoardNotes } from "./use-board-notes";
import { arrowDirection, INPUT_MODE, type InputMode, useFenceInput } from "./use-fence-input";
import {
  lastMover,
  useFenceWords,
  type WayChange,
  wayChanges,
  withFence,
  withoutFence,
} from "./words";

/** What the board is drawn at before it has been measured (and in tests). */
const DEFAULT_CELL_PX = 30;
const DEFAULT_GUTTER_PX = 16;

const SLIDE_MS = 180;
const FENCE_MS = 160;

/** Every pawn by its cell. */
function pawnsByCell(state: FenceRaceState): ReadonlyMap<string, readonly PlayerIndex[]> {
  const cells = new Map<string, PlayerIndex[]>();
  state.pawns.forEach((pawn, player) => {
    const key = `${pawn.row}:${pawn.col}`;
    const here = cells.get(key);
    if (here === undefined) cells.set(key, [player]);
    else here.push(player);
  });
  return cells;
}

/** The fields, unchanged for a whole game at one size. */
const StaticFields = memo(function StaticFields({
  rows,
  columns,
  cell,
  gutter,
  turned,
}: BoardGeometry) {
  return <Fields geometry={{ rows, columns, cell, gutter, turned }} />;
});

/** The gates and the names on the mat. `active`: the seat to move, or the winners. */
function Edges({
  geometry,
  state,
  active,
}: {
  geometry: BoardGeometry;
  state: FenceRaceState;
  active: readonly PlayerIndex[];
}) {
  const owners = new Map<FenceRaceSide, PlayerIndex>();
  state.pawns.forEach((_pawn, player) => {
    owners.set(screenSide(fenceRaceGoalSide(state.pawns.length, player), geometry.turned), player);
  });
  return (
    <>
      {(["bottom", "left", "top", "right"] as const).map((side) => {
        const owner = owners.get(side);
        return (
          <g key={side}>
            <EdgeNames geometry={geometry} side={side} gated={owner !== undefined} />
            {owner !== undefined && (
              <Gate
                geometry={geometry}
                player={owner}
                side={side}
                active={active.includes(owner)}
              />
            )}
          </g>
        );
      })}
    </>
  );
}

interface CellLabels {
  readonly label: (cell: FenceRaceCell, canStep: boolean) => string;
}

/** What a cell's name says: where it is, who is in it, its fences, whether a step goes there. */
function useCellLabels(
  state: FenceRaceState,
  viewer: PlayerIndex | null,
  turned: boolean,
  lastMove: FenceRaceMove | null,
): CellLabels {
  const t = useTranslations("Games.fence-race.cell");
  const format = useFormatter();
  const words = useFenceWords(viewer);
  return {
    label: (cell, canStep) => {
      const { row, col } = cell;
      const pawns = state.pawns.flatMap((pawn, player) =>
        pawn.row === row && pawn.col === col ? [player] : [],
      );
      const gates = state.pawns.flatMap((_pawn, player) =>
        fenceRaceIsGoal(state, player, row, col) ? [player] : [],
      );
      const onBoard = (side: Direction) => boardDirection({ turned }, side);
      const sides = SCREEN_SIDES.filter((side) =>
        fenceOnSide(state.fences, cell, onBoard(side)),
      ).map(({ name }) => t(`sides.${name}`));
      const parts: string[] = [t("name", { cell: cellName(cell, state.rows) })];
      if (pawns.length > 0) parts.push(t("pawns", { players: words.names(pawns) }));
      if (gates.length > 0) parts.push(t("gate", { players: words.names(gates) }));
      if (sides.length > 0) {
        parts.push(t("fences", { sides: format.list(sides, { type: "conjunction" }) }));
      }
      if (lastMove?.kind === "step" && lastMove.row === row && lastMove.col === col) {
        parts.push(t("justArrived"));
      }
      const left = state.lastFrom;
      if (left !== null && left.row === row && left.col === col) parts.push(t("justLeft"));
      if (lastMove !== null && lastMove.kind !== "step") {
        const side = SCREEN_SIDES.find((one) => {
          const fence = { row: lastMove.row, col: lastMove.col, dir: lastMove.dir };
          const found = fenceOnSide([fence], cell, onBoard(one));
          return found !== undefined;
        });
        if (side !== undefined) {
          parts.push(
            t(lastMove.kind === "fence" ? "justFenced" : "justBroken", {
              side: t(`sides.${side.name}`),
            }),
          );
        }
      }
      if (canStep) parts.push(t("canStep"));
      return format.list(parts, { type: "unit", style: "short" });
    },
  };
}

interface CellButtonProps {
  readonly name: string;
  readonly row: number;
  readonly col: number;
  readonly label: string;
  readonly canStep: boolean;
  readonly tabStop: boolean;
  readonly area: {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  } | null;
}

/** One cell: a button in a grid cell. Plain values only; events are handled by the grid. */
const CellButton = memo(function CellButton({
  name,
  row,
  col,
  label,
  canStep,
  tabStop,
  area,
}: CellButtonProps) {
  return (
    <div role="gridcell" className="relative min-h-0 min-w-0">
      <button
        type="button"
        data-cell={name}
        data-row={row}
        data-col={col}
        tabIndex={tabStop ? 0 : -1}
        aria-label={label}
        aria-disabled={!canStep}
        // Reaches outwards on a small cell: above the neighbours it stretches over.
        style={area ?? undefined}
        className={cn(
          "focus-ring absolute rounded-sm",
          area === null && "inset-0",
          canStep ? "z-[2] cursor-pointer hover:bg-game-highlight/15" : "cursor-default",
        )}
      />
    </div>
  );
});

/** A mode's button, or its row's tools: drawn here, since `RadioGroup` has no disabled choice. */
function ModeButton({
  name,
  sub,
  pressed,
  off,
  onClick,
  onKeyDown,
}: {
  name: string;
  sub: string;
  pressed: boolean;
  off: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-disabled={off}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cn(
        "focus-ring flex h-11 min-w-0 flex-col items-center justify-center rounded-control px-1 leading-[1.15] lg:h-12",
        off
          ? "cursor-not-allowed border-[1.5px] border-dashed border-border-control bg-surface-muted text-fg-muted"
          : pressed
            ? "border-2 border-fg bg-surface-raised shadow-[inset_0_-3px_0_var(--fg)]"
            : "border-[1.5px] border-border-control bg-surface hover:bg-surface-muted",
      )}
    >
      <span className="text-small leading-[1.15] font-bold whitespace-nowrap">{name}</span>
      <span className="max-w-full truncate text-caption leading-[1.15] font-normal text-fg-muted">
        {sub}
      </span>
    </button>
  );
}

/** Where the focus goes for a seat: to its pawn; from a touch, without scrolling the page to it. */
interface FocusWish {
  readonly seat: PlayerIndex;
  readonly fromKeyboard: boolean;
}

/** Enter or Space repeating because it is held down. */
function isHeldConfirmKey(event: KeyboardEvent<HTMLElement>): boolean {
  return event.repeat && (event.key === "Enter" || event.key === " ");
}

/**
 * What follows the finger on a phone: above the fence, as the hand covers the line below. Inside the
 * board's width whatever the fence's place and the length of its words, which then wrap: nothing it
 * shows may run off the screen or make the page wider.
 */
function DragTag({
  geometry,
  fence,
  bad,
  text,
}: {
  geometry: BoardGeometry;
  fence: Fence | null;
  bad: boolean;
  text: string;
}) {
  const tagRef = useRef<HTMLDivElement>(null);
  const frame = fence === null ? null : fenceFrame(geometry, fence);
  const middle = frame?.x ?? 0;
  useLayoutEffect(() => {
    const tag = tagRef.current;
    if (tag === null) return;
    const room = boardWidth(geometry);
    const left = Math.max(0, Math.min(room - tag.offsetWidth, middle - tag.offsetWidth / 2));
    tag.style.left = `${left}px`;
  });
  if (frame === null) return null;
  const top = frame.along ? frame.y : frame.y - geometry.cell;
  return (
    <div
      ref={tagRef}
      aria-hidden
      data-fence-race-tag=""
      style={{ left: middle, top: Math.max(0, top) }}
      className={cn(
        "pointer-events-none absolute z-20 inline-flex w-max max-w-full -translate-y-[calc(100%+0.625rem)] items-center gap-1.5 rounded-control px-2.5 py-1 text-small font-bold lg:hidden short-landscape:hidden",
        bad
          ? "bg-danger-soft text-danger-ink shadow-[0_0_0_2px_var(--fence-race-bad)]"
          : "bg-fg text-bg shadow-[0_0_0_2px_var(--fence-race-halo)]",
      )}
    >
      {bad && <XIcon aria-hidden className="size-4 shrink-0" />}
      {text}
    </div>
  );
}

const TOOL_CLASS =
  "focus-ring inline-flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-control border-[1.5px] border-fg bg-surface px-1.5 text-small font-semibold hover:bg-surface-muted lg:h-12";

/**
 * A Cờ rào board: the fields drawn in SVG under a grid of buttons, one for each cell, and, while a
 * fence is being placed or broken, a layer over them for the finger and the keyboard. Its height
 * comes from `theme.css`: the room left on the screen by what must stay in view.
 */
export function FenceRaceBoard({
  state,
  legalMoves,
  onMove,
  disabled,
  result,
  lastEntry,
  viewer,
  layout,
  lockedReason,
}: BoardProps<FenceRaceState, FenceRaceMove>) {
  const t = useTranslations("Games.fence-race");
  const tPlay = useTranslations("Play");
  const words = useFenceWords(viewer);
  const { rows, columns, toMove, moveCount } = state;
  const seats = state.pawns.length;

  const turned = viewer === 1 && seats === 2;
  const frameRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const reasonId = useId();

  // Measured on the board itself, which CSS sizes: the drawing is in its real pixels.
  const [size, setSize] = useState({ cell: DEFAULT_CELL_PX, gutter: DEFAULT_GUTTER_PX });
  useLayoutEffect(() => {
    const grid = gridRef.current;
    const frame = frameRef.current;
    if (grid === null || frame === null || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const box = grid.getBoundingClientRect();
      const outer = frame.getBoundingClientRect();
      if (box.width === 0) return;
      setSize({ cell: box.width / columns, gutter: box.left - outer.left });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    return () => {
      observer.disconnect();
    };
  }, [columns]);
  const geometry: BoardGeometry = useMemo(
    () => ({ rows, columns, cell: size.cell, gutter: size.gutter, turned }),
    [rows, columns, size.cell, size.gutter, turned],
  );

  const input = useFenceInput({
    state,
    geometry,
    legalMoves,
    onMove,
    disabled,
    result,
    frame: frameRef,
  });
  const { mode, preview, chosen, sending, canAct, issue } = input;
  const lastMove = lastEntry?.move ?? null;
  const over = result !== null;
  const placing = mode === INPUT_MODE.Place;
  const breaking = mode === INPUT_MODE.Break;
  const onLayer = !over && (placing || breaking);

  // ── The cells. ──
  const steps = useMemo(() => {
    const cells = new Map<string, FenceRaceMove>();
    if (disabled || over || mode !== INPUT_MODE.Move) return cells;
    for (const move of legalMoves) {
      if (move.kind === "step") cells.set(`${move.row}:${move.col}`, move);
    }
    return cells;
  }, [disabled, over, mode, legalMoves]);
  const { label: cellLabel } = useCellLabels(state, viewer, turned, lastMove);

  // The one cell in the Tab order: the last one the arrows reached, else the pawn of this player.
  const [cursor, setCursor] = useState<(FenceRaceCell & { readonly at: number }) | null>(null);
  const playerPawn = state.pawns[viewer ?? toMove] ?? { row: 0, col: 0 };
  const tabCell = cursor?.at === moveCount ? cursor : playerPawn;

  const focusCell = (cell: FenceRaceCell) => {
    gridRef.current
      ?.querySelector<HTMLElement>(`[data-row="${cell.row}"][data-col="${cell.col}"]`)
      ?.focus();
  };

  // Where the focus goes. A move: once its position is on screen, however long the answer takes;
  // the seat is the one that moved, known now. Anything else: as soon as the next render is there.
  const focusAfterMove = useRef<FocusWish | null>(null);
  const focusNow = useRef<FocusWish | "layer" | null>(null);
  const layerHadFocus = useRef(false);
  const seenMoves = useRef(moveCount);
  const wasDisabled = useRef(disabled);
  useLayoutEffect(() => {
    /** The focus is taken only from what the board itself let go, never from the rest of the page. */
    const mayTakeFocus = () => {
      const active = document.activeElement;
      return (
        active === null ||
        active === document.body ||
        frameRef.current?.contains(active) === true ||
        controlsRef.current?.contains(active) === true
      );
    };
    const focusPawn = ({ seat, fromKeyboard }: FocusWish) => {
      const pawn = state.pawns[seat];
      if (pawn === undefined || !mayTakeFocus()) return;
      gridRef.current
        ?.querySelector<HTMLElement>(`[data-row="${pawn.row}"][data-col="${pawn.col}"]`)
        ?.focus({ preventScroll: !fromKeyboard });
    };
    if (seenMoves.current !== moveCount) {
      seenMoves.current = moveCount;
      // The layer that had the focus went with the position.
      const wish =
        focusAfterMove.current ??
        (layerHadFocus.current ? { seat: viewer ?? toMove, fromKeyboard: true } : null);
      focusAfterMove.current = null;
      focusNow.current = null;
      layerHadFocus.current = false;
      if (wish !== null) focusPawn(wish);
    } else if (wasDisabled.current && !disabled) {
      // Unlocked with no new position: the move was refused, or never got there.
      focusAfterMove.current = null;
    }
    // The game ended with the move unanswered: no answer comes, and a new game must not bring it back.
    if (over) focusAfterMove.current = null;
    wasDisabled.current = disabled;
    if (!onLayer) layerHadFocus.current = false;
    const now = focusNow.current;
    if (now === null) return;
    focusNow.current = null;
    if (now === "layer") {
      if (mayTakeFocus()) overlayRef.current?.focus();
    } else {
      focusPawn(now);
    }
  });

  function handleGridClick(event: MouseEvent<HTMLDivElement>) {
    const button = (event.target as Element).closest<HTMLElement>("[data-cell]");
    if (button === null) return;
    const row = Number(button.dataset.row);
    const col = Number(button.dataset.col);
    setCursor({ row, col, at: moveCount });
    const move = steps.get(`${row}:${col}`);
    if (move === undefined) return;
    // Pressed from the keyboard: it stays with the pawn. A tap focuses nothing the next tap needs.
    if (event.detail === 0) focusAfterMove.current = { seat: viewer ?? toMove, fromKeyboard: true };
    onMove(move);
  }

  function handleGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    handleCommonKey(event);
    const direction = arrowDirection(event.key);
    if (direction === undefined || mode !== INPUT_MODE.Move) return;
    const button = (event.target as Element).closest<HTMLElement>("[data-cell]");
    if (button === null) return;
    event.preventDefault();
    const { dr, dc } = boardDirection(geometry, direction);
    const next = {
      row: Math.max(0, Math.min(rows - 1, Number(button.dataset.row) + dr)),
      col: Math.max(0, Math.min(columns - 1, Number(button.dataset.col) + dc)),
    };
    setCursor({ ...next, at: moveCount });
    focusCell(next);
  }

  /** Esc and R work from the board and from its buttons alike. */
  function handleCommonKey(event: KeyboardEvent<HTMLElement>) {
    // A key held down presses nothing twice: least of all for the next player, on a shared device.
    if (isHeldConfirmKey(event)) {
      event.preventDefault();
      return;
    }
    if (over) return;
    if (event.key === "Escape" && mode !== INPUT_MODE.Move) {
      event.preventDefault();
      if (input.chooseMode(INPUT_MODE.Move)) {
        focusNow.current = { seat: viewer ?? toMove, fromKeyboard: true };
      }
      return;
    }
    if (!canAct) return;
    const plainKey = !event.ctrlKey && !event.metaKey && !event.altKey;
    if ((event.key === "r" || event.key === "R") && placing && plainKey) {
      event.preventDefault();
      input.rotate();
    }
  }

  function handleLayerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    handleCommonKey(event);
    if (!canAct || isHeldConfirmKey(event)) return;
    const direction = arrowDirection(event.key);
    if (direction !== undefined) {
      event.preventDefault();
      input.arrow(direction);
      return;
    }
    if (breaking && (event.key === "PageDown" || event.key === "PageUp")) {
      event.preventDefault();
      input.cycleFence(event.key === "PageDown" ? 1 : -1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      // The focus stays here until the position changes: the move may yet be refused.
      focusAfterMove.current = { seat: viewer ?? toMove, fromKeyboard: true };
      if (!input.confirm()) focusAfterMove.current = null;
    }
  }

  function modeClick(event: MouseEvent<HTMLButtonElement>, wanted: InputMode) {
    const chosenOk = input.chooseMode(wanted);
    // From the keyboard the next keys are for the board.
    if (chosenOk && event.detail === 0) {
      focusNow.current =
        wanted === INPUT_MODE.Move ? { seat: viewer ?? toMove, fromKeyboard: true } : "layer";
    }
  }

  function confirmClick(event: MouseEvent<HTMLButtonElement>) {
    // The row of tools goes while the move is on its way: the focus goes to the layer, not the page.
    focusAfterMove.current = { seat: viewer ?? toMove, fromKeyboard: event.detail === 0 };
    if (input.confirm()) {
      focusNow.current = "layer";
    } else {
      focusAfterMove.current = null;
    }
  }

  // The row of tools goes: the focus does not fall to the page.
  function cancelClick() {
    input.cancel();
    focusNow.current = "layer";
  }

  // ── What is drawn. ──
  const reachedGoal = over && result.kind === "win" && result.reason === FENCE_RACE_REASON.Goal;
  const winners = result?.kind === "win" ? result.winners : [];
  const active = over ? winners : [toMove];
  const cellsWithPawns = pawnsByCell(state);
  // `useFenceInput` has dropped them once the game is over, ended outside its rules too.
  const sendingPlace = sending && placing && preview !== null;
  const sendingFence = sendingPlace ? preview : null;
  const fences: readonly Fence[] =
    sendingFence === null ? state.fences : [...state.fences, sendingFence];
  const justPlaced: Fence | null =
    sendingFence ?? (lastMove?.kind === "fence" ? { ...lastMove } : null);
  const justBroken: Fence | null = lastMove?.kind === "break" ? { ...lastMove } : null;
  const chosenNow = breaking ? chosen : null;
  const showPreview = placing && preview !== null && !sendingPlace;

  const changes: readonly WayChange[] = useMemo(() => {
    if (placing && preview !== null && issue === null) {
      return wayChanges(state, withFence(state, preview));
    }
    if (breaking && chosen !== null) return wayChanges(state, withoutFence(state, chosen));
    return [];
  }, [state, placing, breaking, preview, chosen, issue]);
  const ways =
    placing && preview !== null && issue === null && !sending
      ? changes.map(({ player }) => ({
          player,
          cells: fenceRaceWay(withFence(state, preview), player),
        }))
      : breaking && chosen !== null
        ? changes.map(({ player }) => ({
            player,
            cells: fenceRaceWay(withoutFence(state, chosen), player),
          }))
        : [];

  const width = boardWidth(geometry);
  const height = boardHeight(geometry);

  // ── One moment for one new move: the pawn slides, a fence appears. ──
  const reducedMotion = usePrefersReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const animatedMoves = useRef(moveCount);
  useEffect(() => {
    const before = animatedMoves.current;
    animatedMoves.current = moveCount;
    if (moveCount !== before + 1 || reducedMotion || lastEntry === null) return;
    const svg = svgRef.current;
    if (svg === null) return;
    const { move } = lastEntry;
    if (move.kind === "step") {
      const from = state.lastFrom;
      const pawn = svg.querySelector<SVGGElement>(`[data-pawn="${lastMover(state)}"]`);
      if (from === null || typeof pawn?.animate !== "function") return;
      const start = cellCentre(geometry, from);
      const end = cellCentre(geometry, move);
      pawn.animate(
        [
          { transform: `translate(${start.x - end.x}px, ${start.y - end.y}px)` },
          { transform: "none" },
        ],
        { duration: SLIDE_MS, easing: "cubic-bezier(0.2, 0, 0, 1)" },
      );
    } else if (move.kind === "fence") {
      const wall = svg.querySelector<SVGGElement>(
        `[data-wall="${move.dir}:${move.row}:${move.col}"]`,
      );
      if (typeof wall?.animate === "function") {
        wall.animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: FENCE_MS });
      }
    } else {
      const gone = svg.querySelector<SVGGElement>("[data-gone]");
      if (typeof gone?.animate === "function") {
        gone.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FENCE_MS });
      }
    }
    // A new position is the only reason to run; its other values come with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveCount]);

  // ── The grid. Rows in the order of the screen. ──
  const small = geometry.cell < SMALL_CELL_PX;
  const pawnNow = state.pawns[toMove] ?? { row: 0, col: 0 };
  const screenRows = Array.from({ length: rows }, (_unused, index) =>
    turned ? rows - 1 - index : index,
  );
  const screenCols = Array.from({ length: columns }, (_unused, index) =>
    turned ? columns - 1 - index : index,
  );

  const { note, live, layerLabel, modeSub } = useBoardNotes({
    state,
    viewer,
    turned,
    disabled,
    over,
    sending,
    mode,
    preview,
    chosen,
    issue,
    changes,
    refused: input.refused,
    modeBlock: input.modeBlock,
    lockedReason: lockedReason ?? null,
    lastMove,
  });

  /** The words of the tag following the finger. */
  function tagText(): string {
    if (issue !== null) return words.issue(issue, rows);
    if (changes.length > 0) return words.changes(changes);
    return t(placing ? "noLonger" : "noShorter");
  }

  const boardPart = (
    <div
      // What `theme.css` sizes the board from.
      data-fence-race-board=""
      data-seats={seats}
      data-rows={rows}
      data-fence-race-keep={viewer !== null && !over ? "" : undefined}
      data-fence-race-over={over ? result.kind : undefined}
      style={{ "--fence-race-rows": rows, "--fence-race-columns": columns } as CSSProperties}
      className="mx-auto select-none"
    >
      <div
        ref={frameRef}
        data-fence-race-frame=""
        className="relative size-full [-webkit-tap-highlight-color:transparent]"
      >
        <svg
          ref={svgRef}
          aria-hidden
          viewBox={`0 0 ${width} ${height}`}
          className="absolute inset-0 block size-full overflow-visible"
        >
          <StaticFields {...geometry} />
          <Edges geometry={geometry} state={state} active={active} />
          {state.lastFrom !== null && !over && (
            <LeftMark geometry={geometry} cell={state.lastFrom} />
          )}
          {justBroken !== null && <GoneFence geometry={geometry} fence={justBroken} />}
          {ways.map(({ player, cells }) => (
            <WayLine key={player} geometry={geometry} player={player} cells={cells} />
          ))}
          {[...steps.values()].map((move) =>
            move.kind === "step" ? (
              <TargetMark
                key={`${move.row}:${move.col}`}
                geometry={geometry}
                cell={move}
                occupied={cellsWithPawns.has(`${move.row}:${move.col}`)}
              />
            ) : null,
          )}
          {fences
            .filter((fence) => chosenNow === null || !sameFence(fence, chosenNow))
            .map((fence) => (
              <Wall
                key={`${fence.dir}:${fence.row}:${fence.col}`}
                geometry={geometry}
                fence={fence}
                just={justPlaced !== null && sameFence(fence, justPlaced)}
              />
            ))}
          {reachedGoal &&
            winners.map((winner) => {
              const pawn = state.pawns[winner];
              return pawn === undefined ? null : (
                <GoalMark key={winner} geometry={geometry} cell={pawn} />
              );
            })}
          {[...cellsWithPawns].map(([key, players]) => {
            const [row = 0, col = 0] = key.split(":").map(Number);
            const cell = { row, col };
            const turnHere = !over && players.includes(toMove) ? toMove : null;
            const winnerHere = players.find((player) => winners.includes(player));
            const ring = winnerHere ?? turnHere;
            return (
              <g key={key}>
                {players.length > 1 && ring !== null && (
                  <ShareFrame geometry={geometry} cell={cell} />
                )}
                <HatsInCell geometry={geometry} cell={cell} players={players} turn={ring} />
              </g>
            );
          })}
          {showPreview &&
            (issue === null ? (
              <PreviewFence geometry={geometry} fence={preview} />
            ) : (
              <BadFence geometry={geometry} fence={preview} />
            ))}
          {chosenNow !== null && <ChosenFence geometry={geometry} fence={chosenNow} />}
        </svg>
        <div
          ref={gridRef}
          role="grid"
          aria-label={tPlay("board")}
          data-fence-race-grid=""
          onClick={handleGridClick}
          onKeyDown={handleGridKeyDown}
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }}
          className={cn(
            "absolute inset-(--fence-race-gutter) grid touch-manipulation",
            onLayer && "pointer-events-none",
          )}
        >
          {screenRows.map((row) => (
            <div key={row} role="row" className="contents">
              {screenCols.map((col) => {
                const key = `${row}:${col}`;
                const canStep = steps.has(key);
                const area =
                  canStep && small
                    ? stepHitArea(
                        geometry.cell,
                        boardDirection(geometry, {
                          dr: row - pawnNow.row,
                          dc: col - pawnNow.col,
                        }),
                      )
                    : null;
                return (
                  <CellButton
                    key={key}
                    name={cellName({ row, col }, rows)}
                    row={row}
                    col={col}
                    label={cellLabel({ row, col }, canStep)}
                    canStep={canStep}
                    tabStop={!onLayer && tabCell.row === row && tabCell.col === col}
                    area={area}
                  />
                );
              })}
            </div>
          ))}
        </div>
        {onLayer && (
          // The finger's and the keyboard's while a fence is placed or broken. One finger never
          // scrolls here, two still zoom; a swipe beside the board still scrolls. Outside the grid:
          // it stands for the position under the cursor, which is no cell.
          <div
            ref={overlayRef}
            role="application"
            tabIndex={0}
            data-fence-race-layer={mode}
            aria-label={layerLabel}
            onKeyDown={handleLayerKeyDown}
            onFocus={() => {
              layerHadFocus.current = true;
            }}
            onBlur={() => {
              layerHadFocus.current = false;
            }}
            {...input.overlayEvents}
            className="focus-ring absolute inset-0 z-10 cursor-crosshair touch-pinch-zoom rounded-card"
          />
        )}
        {input.dragging && onLayer && (
          <DragTag
            geometry={geometry}
            fence={placing ? preview : chosen}
            bad={issue !== null}
            text={tagText()}
          />
        )}
      </div>
    </div>
  );

  const notes = (
    // The same height whatever it says: a long line takes both rows, and the second falls away.
    <div
      className={cn(
        "flex h-9 flex-col overflow-hidden text-caption leading-[1.125rem] max-lg:-mt-2.5 max-lg:-mb-0.5 lg:h-11 lg:text-small lg:leading-[1.375rem] short-landscape:mt-0 short-landscape:mb-0",
        (note === null || note.sub === "") && "justify-center",
      )}
    >
      {note !== null && (
        <>
          <p
            data-bad={note.bad ? "" : undefined}
            className={cn(
              "flex shrink-0 items-start gap-1 font-bold",
              note.bad && "text-danger-ink",
            )}
          >
            {note.bad && <XIcon aria-hidden className="mt-px size-4 shrink-0 lg:mt-1" />}
            <span className="line-clamp-2 min-w-0">{note.main}</span>
          </p>
          {note.sub !== "" && (
            <p className="shrink-0 truncate font-normal text-fg-muted">{note.sub}</p>
          )}
        </>
      )}
      <p aria-live="polite" className="sr-only">
        {live}
      </p>
    </div>
  );

  const previewing = !sending && ((placing && preview !== null) || (breaking && chosen !== null));
  const confirmReason =
    !previewing || input.canConfirm
      ? null
      : issue !== null
        ? words.issue(issue, rows)
        : (lockedReason ?? null);

  const controls = over ? null : (
    <div ref={controlsRef} className="min-w-0 max-lg:-mb-1 short-landscape:mb-0">
      <div
        role="group"
        aria-label={t("modes.label")}
        hidden={previewing}
        className={cn("grid grid-cols-3 gap-1.5", previewing && "hidden")}
      >
        {([INPUT_MODE.Move, INPUT_MODE.Place, INPUT_MODE.Break] as const).map((one) => (
          <ModeButton
            key={one}
            name={t(`modes.${one}`)}
            sub={modeSub(one)}
            pressed={mode === one}
            off={input.modeBlock(one) !== null}
            onKeyDown={handleCommonKey}
            onClick={(event) => {
              modeClick(event, one);
            }}
          />
        ))}
      </div>
      <div
        hidden={!previewing}
        className={cn(
          "grid gap-1.5",
          !previewing && "hidden",
          placing ? "grid-cols-3" : "grid-cols-[1fr_2fr]",
        )}
      >
        {placing && (
          <button
            type="button"
            className={TOOL_CLASS}
            onClick={input.rotate}
            onKeyDown={handleCommonKey}
          >
            <RotateCwIcon aria-hidden className="size-4" />
            {t("rotate")}
          </button>
        )}
        <button
          type="button"
          className={TOOL_CLASS}
          onClick={cancelClick}
          onKeyDown={handleCommonKey}
        >
          {t("cancel")}
        </button>
        {/* Always here: a press that sends the move must not lose the focus to the page. */}
        <Button
          aria-disabled={!input.canConfirm}
          aria-describedby={confirmReason === null ? undefined : reasonId}
          className="h-11 min-w-0 px-1.5 text-small lg:h-12"
          onClick={confirmClick}
          onKeyDown={handleCommonKey}
        >
          {t(placing ? "confirmPlace" : "confirmBreak")}
        </Button>
      </div>
      <span id={reasonId} className="sr-only">
        {confirmReason}
      </span>
    </div>
  );

  return layout({ board: boardPart, notes: over ? undefined : notes, controls });
}
