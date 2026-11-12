import type { ReactNode } from "react";

import { type Direction, JELLY_KIND, type JellyKind, OFFSET, type Piece } from "./rules/types";

// Gom thạch's drawings, plain SVG with no state (the tray, the menu's artwork): every piece as one
// shape per kind with grass jelly across the seams between kinds, a sign on every cell, the pin of a
// coconut piece stuck to a wall, and the player. Every colour is a token of theme.css.

/** Drawing units a cell; the SVG scales to the room it has, never above this many pixels. */
export const CELL = 56;

/** Tailwind sees whole class names only: each kind's three colours, written out. */
const KIND_FILL: Readonly<
  Record<JellyKind, { body: string; edge: string; mark: string; stroke: string }>
> = {
  [JELLY_KIND.Strawberry]: {
    body: "fill-(--jelly-gather-strawberry)",
    edge: "fill-(--jelly-gather-strawberry-edge)",
    mark: "fill-(--jelly-gather-strawberry-mark)",
    stroke: "stroke-(--jelly-gather-strawberry-mark)",
  },
  [JELLY_KIND.Pandan]: {
    body: "fill-(--jelly-gather-pandan)",
    edge: "fill-(--jelly-gather-pandan-edge)",
    mark: "fill-(--jelly-gather-pandan-mark)",
    stroke: "stroke-(--jelly-gather-pandan-mark)",
  },
  [JELLY_KIND.Mango]: {
    body: "fill-(--jelly-gather-mango)",
    edge: "fill-(--jelly-gather-mango-edge)",
    mark: "fill-(--jelly-gather-mango-mark)",
    stroke: "stroke-(--jelly-gather-mango-mark)",
  },
  [JELLY_KIND.Taro]: {
    body: "fill-(--jelly-gather-taro)",
    edge: "fill-(--jelly-gather-taro-edge)",
    mark: "fill-(--jelly-gather-taro-mark)",
    stroke: "stroke-(--jelly-gather-taro-mark)",
  },
  [JELLY_KIND.Coconut]: {
    body: "fill-(--jelly-gather-coconut)",
    edge: "fill-(--jelly-gather-coconut-edge)",
    mark: "fill-(--jelly-gather-coconut-mark)",
    stroke: "stroke-(--jelly-gather-coconut-mark)",
  },
  [JELLY_KIND.Grass]: {
    body: "fill-(--jelly-gather-grass)",
    edge: "fill-(--jelly-gather-grass-edge)",
    mark: "fill-(--jelly-gather-grass-mark)",
    stroke: "stroke-(--jelly-gather-grass-mark)",
  },
  [JELLY_KIND.Ice]: {
    body: "fill-(--jelly-gather-ice)",
    edge: "fill-(--jelly-gather-ice-edge)",
    mark: "fill-(--jelly-gather-ice-mark)",
    stroke: "stroke-(--jelly-gather-ice-mark)",
  },
};

const r1 = (value: number) => Math.round(value * 10) / 10;

/** The sign of a kind, centred on (x, y): what tells the kinds apart without colour. */
function KindSign({ kind, x, y, size }: { kind: JellyKind; x: number; y: number; size: number }) {
  const { mark, stroke } = KIND_FILL[kind];
  const r = size;
  switch (kind) {
    case JELLY_KIND.Strawberry:
      return <circle cx={x} cy={y} r={r1(r * 0.8)} className={mark} />;
    case JELLY_KIND.Pandan:
      return (
        <path
          d={`M${x} ${r1(y - r)}L${r1(x + r)} ${r1(y + r * 0.8)}L${r1(x - r)} ${r1(y + r * 0.8)}Z`}
          className={mark}
        />
      );
    case JELLY_KIND.Mango:
      return (
        <rect
          x={r1(x - r * 0.78)}
          y={r1(y - r * 0.78)}
          width={r1(r * 1.56)}
          height={r1(r * 1.56)}
          className={mark}
        />
      );
    case JELLY_KIND.Taro:
      return (
        <path
          d={`M${x} ${r1(y - r)}L${r1(x + r)} ${y}L${x} ${r1(y + r)}L${r1(x - r)} ${y}Z`}
          className={mark}
        />
      );
    case JELLY_KIND.Coconut:
      return (
        <circle
          cx={x}
          cy={y}
          r={r1(r * 0.78)}
          fill="none"
          strokeWidth={r1(r * 0.38)}
          className={stroke}
        />
      );
    case JELLY_KIND.Grass:
      return (
        <path
          d={`M${r1(x - r * 0.75)} ${r1(y - r * 0.75)}L${r1(x + r * 0.75)} ${r1(y + r * 0.75)}M${r1(x + r * 0.75)} ${r1(y - r * 0.75)}L${r1(x - r * 0.75)} ${r1(y + r * 0.75)}`}
          strokeWidth={r1(r * 0.4)}
          strokeLinecap="round"
          className={stroke}
        />
      );
    case JELLY_KIND.Ice:
      return (
        <>
          <path
            d={`M${r1(x - r * 0.9)} ${r1(y + r * 0.1)}L${r1(x - r * 0.1)} ${r1(y - r * 0.9)}`}
            strokeWidth={r1(r * 0.5)}
            strokeLinecap="round"
            className="stroke-(--jelly-gather-sheen)"
          />
          <path
            d={`M${r1(x - r * 0.2)} ${r1(y + r * 0.6)}L${r1(x + r * 0.6)} ${r1(y - r * 0.2)}`}
            strokeWidth={r1(r * 0.18)}
            strokeLinecap="round"
            className={stroke}
          />
        </>
      );
  }
}

interface PieceShapeProps {
  readonly piece: Piece;
  readonly width: number;
  readonly walls: ReadonlySet<number>;
  readonly slid: ReadonlySet<number>;
  readonly cell?: number;
}

/**
 * One piece: for each kind, its cells joined into one shape (an edge, the body inset on it); a band
 * of grass jelly across each seam between two kinds; a sign and a gloss on each cell; the pin. Every
 * element of a cell that slid carries `data-slide`, so the slide moves the cell and what is drawn
 * on it.
 */
export function PieceShape({ piece, width, walls, slid, cell = CELL }: PieceShapeProps) {
  const kindAt = new Map(
    piece.cells.map((at, index) => [at, piece.kinds[index] ?? JELLY_KIND.Ice]),
  );
  const xy = (at: number) => [(at % width) * cell, Math.floor(at / width) * cell] as const;
  const right = (at: number) => (at % width < width - 1 ? at + 1 : -1);
  const inset = cell * 0.05;
  const rim = Math.max(2, cell * 0.07);
  const slide = (at: number) => (slid.has(at) ? { "data-slide": "" } : {});

  const layer = (kind: JellyKind, extra: number, className: string): ReactNode[] => {
    const radius = (kind === JELLY_KIND.Ice ? cell * 0.12 : cell * 0.26) - extra;
    const pad = inset + extra;
    const same = (at: number) => kindAt.get(at) === kind;
    return piece.cells.flatMap((at) => {
      if (!same(at)) return [];
      const [x, y] = xy(at);
      const down = at + width;
      return [
        <g key={`${kind}${extra}:${at}`} {...slide(at)}>
          <rect
            x={r1(x + pad)}
            y={r1(y + pad)}
            width={r1(cell - 2 * pad)}
            height={r1(cell - 2 * pad)}
            rx={r1(Math.max(1, radius))}
            className={className}
          />
          {same(right(at)) && (
            <rect
              x={r1(x + cell / 2)}
              y={r1(y + pad)}
              width={cell}
              height={r1(cell - 2 * pad)}
              className={className}
            />
          )}
          {same(down) && (
            <rect
              x={r1(x + pad)}
              y={r1(y + cell / 2)}
              width={r1(cell - 2 * pad)}
              height={cell}
              className={className}
            />
          )}
          {same(right(at)) && same(down) && same(down + 1) && (
            <rect
              x={r1(x + cell / 2)}
              y={r1(y + cell / 2)}
              width={cell}
              height={cell}
              className={className}
            />
          )}
        </g>,
      ];
    });
  };

  const kinds = [...new Set(piece.kinds)];
  const seams: ReactNode[] = [];
  const signs: ReactNode[] = [];
  for (const at of piece.cells) {
    const [x, y] = xy(at);
    const kind = kindAt.get(at) ?? JELLY_KIND.Ice;
    for (const [next, across] of [
      [right(at), true],
      [at + width, false],
    ] as const) {
      const other = kindAt.get(next);
      if (other === undefined || other === kind) continue;
      seams.push(
        <rect
          key={`seam:${at}:${next}`}
          {...slide(at)}
          x={r1(across ? x + cell * 0.84 : x + cell * 0.28)}
          y={r1(across ? y + cell * 0.28 : y + cell * 0.84)}
          width={r1(across ? cell * 0.32 : cell * 0.44)}
          height={r1(across ? cell * 0.44 : cell * 0.32)}
          rx={r1(cell * 0.08)}
          strokeWidth={r1(cell * 0.04)}
          className="fill-(--jelly-gather-grass) stroke-(--jelly-gather-grass-edge)"
        />,
      );
    }
    signs.push(
      <g key={`sign:${at}`} {...slide(at)}>
        {kind !== JELLY_KIND.Ice && (
          <path
            d={`M${r1(x + cell * 0.24)} ${r1(y + cell * 0.3)}q${r1(cell * 0.06)} ${r1(-cell * 0.1)} ${r1(cell * 0.2)} ${r1(-cell * 0.1)}`}
            strokeWidth={r1(cell * 0.07)}
            strokeLinecap="round"
            fill="none"
            className="stroke-(--jelly-gather-sheen)"
          />
        )}
        <KindSign
          kind={kind}
          x={r1(x + cell / 2)}
          y={r1(y + cell / 2 + (kind === JELLY_KIND.Ice ? 0 : cell * 0.04))}
          size={cell * 0.15}
        />
      </g>,
    );
  }

  let pin: ReactNode = null;
  if (piece.fixed) {
    const touches = (at: number) =>
      [at - 1, at + 1, at - width, at + width].some((next) => walls.has(next));
    const at =
      piece.cells.find((c) => kindAt.get(c) === JELLY_KIND.Coconut && touches(c)) ??
      piece.cells[0] ??
      0;
    const [x, y] = xy(at);
    pin = (
      <g data-pin="">
        <circle
          cx={r1(x + cell * 0.76)}
          cy={r1(y + cell * 0.24)}
          r={r1(cell * 0.15)}
          strokeWidth={r1(cell * 0.04)}
          className="fill-(--jelly-gather-pin) stroke-(--jelly-gather-coconut)"
        />
        <circle
          cx={r1(x + cell * 0.76)}
          cy={r1(y + cell * 0.24)}
          r={r1(cell * 0.05)}
          className="fill-(--jelly-gather-coconut)"
        />
      </g>
    );
  }

  return (
    <>
      {kinds.map((kind) => (
        <g key={kind}>
          {layer(kind, 0, KIND_FILL[kind].edge)}
          {layer(kind, rim, KIND_FILL[kind].body)}
        </g>
      ))}
      {seams}
      {signs}
      {pin}
    </>
  );
}

/** The player: round and inked, eyes towards the last move. */
export function Player({
  x,
  y,
  face,
  cell = CELL,
}: {
  x: number;
  y: number;
  face: Direction;
  cell?: number;
}) {
  const [fx, fy] = OFFSET[face];
  const eye = (side: number) => (
    <circle
      cx={r1(x + side * cell * 0.12 + fx * cell * 0.07)}
      cy={r1(y - cell * 0.04 + fy * cell * 0.08)}
      r={r1(cell * 0.075)}
      className="fill-(--jelly-gather-player-eye)"
    />
  );
  return (
    <>
      <circle cx={x} cy={y} r={r1(cell * 0.36)} className="fill-(--jelly-gather-player)" />
      {eye(-1)}
      {eye(1)}
    </>
  );
}
