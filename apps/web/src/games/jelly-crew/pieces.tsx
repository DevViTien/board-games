import type { JellyCrewGroup, JellyCrewKind, JellyCrewPiece } from "@board-games/games/jelly-crew";
import type { ReactNode } from "react";

// Đội gom thạch's drawings, plain SVG with no state (the board, the artwork, the rules' figures):
// the jellies as Gom thạch draws them (one shape per kind, grass jelly across the seams, a sign on
// every cell), the characters with their numbers, plates and doors with their group's sign. Every
// colour is a token of theme.css.

/** Drawing units a cell; the SVG scales to the room it has, never above this many pixels. */
export const CELL = 56;

export const r1 = (value: number) => Math.round(value * 10) / 10;

/** Tailwind sees whole class names only: each kind's colours, written out. */
const KIND_FILL: Readonly<
  Record<
    JellyCrewKind,
    { body: string; edge: string; mark: string; stroke: string; edgeStroke: string }
  >
> = {
  strawberry: {
    body: "fill-(--jelly-crew-strawberry)",
    edge: "fill-(--jelly-crew-strawberry-edge)",
    mark: "fill-(--jelly-crew-strawberry-mark)",
    stroke: "stroke-(--jelly-crew-strawberry-mark)",
    edgeStroke: "stroke-(--jelly-crew-strawberry-edge)",
  },
  pandan: {
    body: "fill-(--jelly-crew-pandan)",
    edge: "fill-(--jelly-crew-pandan-edge)",
    mark: "fill-(--jelly-crew-pandan-mark)",
    stroke: "stroke-(--jelly-crew-pandan-mark)",
    edgeStroke: "stroke-(--jelly-crew-pandan-edge)",
  },
  mango: {
    body: "fill-(--jelly-crew-mango)",
    edge: "fill-(--jelly-crew-mango-edge)",
    mark: "fill-(--jelly-crew-mango-mark)",
    stroke: "stroke-(--jelly-crew-mango-mark)",
    edgeStroke: "stroke-(--jelly-crew-mango-edge)",
  },
  taro: {
    body: "fill-(--jelly-crew-taro)",
    edge: "fill-(--jelly-crew-taro-edge)",
    mark: "fill-(--jelly-crew-taro-mark)",
    stroke: "stroke-(--jelly-crew-taro-mark)",
    edgeStroke: "stroke-(--jelly-crew-taro-edge)",
  },
  grass: {
    body: "fill-(--jelly-crew-grass)",
    edge: "fill-(--jelly-crew-grass-edge)",
    mark: "fill-(--jelly-crew-grass-mark)",
    stroke: "stroke-(--jelly-crew-grass-mark)",
    edgeStroke: "stroke-(--jelly-crew-grass-edge)",
  },
  ice: {
    body: "fill-(--jelly-crew-ice)",
    edge: "fill-(--jelly-crew-ice-edge)",
    mark: "fill-(--jelly-crew-ice-mark)",
    stroke: "stroke-(--jelly-crew-ice-mark)",
    edgeStroke: "stroke-(--jelly-crew-ice-edge)",
  },
};

/** Each seat's colour, as a fill and a stroke. */
const SEAT_FILL = [
  "fill-(--jelly-crew-seat-1)",
  "fill-(--jelly-crew-seat-2)",
  "fill-(--jelly-crew-seat-3)",
  "fill-(--jelly-crew-seat-4)",
] as const;

/** The sign of a kind, centred on (x, y): what tells the kinds apart without colour. */
function KindSign({
  kind,
  x,
  y,
  size,
  tone = "mark",
}: {
  kind: JellyCrewKind;
  x: number;
  y: number;
  size: number;
  /** `edge`: in the kind's edge colour, for a mold's sign on the floor. */
  tone?: "mark" | "edge";
}) {
  const fills = KIND_FILL[kind];
  const mark = tone === "edge" ? fills.edge : fills.mark;
  const stroke = tone === "edge" ? fills.edgeStroke : fills.stroke;
  const r = size;
  switch (kind) {
    case "strawberry":
      return <circle cx={x} cy={y} r={r1(r * 0.8)} className={mark} />;
    case "pandan":
      return (
        <path
          d={`M${x} ${r1(y - r)}L${r1(x + r)} ${r1(y + r * 0.8)}L${r1(x - r)} ${r1(y + r * 0.8)}Z`}
          className={mark}
        />
      );
    case "mango":
      return (
        <rect
          x={r1(x - r * 0.78)}
          y={r1(y - r * 0.78)}
          width={r1(r * 1.56)}
          height={r1(r * 1.56)}
          className={mark}
        />
      );
    case "taro":
      return (
        <path
          d={`M${x} ${r1(y - r)}L${r1(x + r)} ${y}L${x} ${r1(y + r)}L${r1(x - r)} ${y}Z`}
          className={mark}
        />
      );
    case "grass":
      return (
        <path
          d={`M${r1(x - r * 0.75)} ${r1(y - r * 0.75)}L${r1(x + r * 0.75)} ${r1(y + r * 0.75)}M${r1(x + r * 0.75)} ${r1(y - r * 0.75)}L${r1(x - r * 0.75)} ${r1(y + r * 0.75)}`}
          strokeWidth={r1(r * 0.4)}
          strokeLinecap="round"
          className={stroke}
        />
      );
    case "ice":
      return (
        <>
          <path
            d={`M${r1(x - r * 0.9)} ${r1(y + r * 0.1)}L${r1(x - r * 0.1)} ${r1(y - r * 0.9)}`}
            strokeWidth={r1(r * 0.5)}
            strokeLinecap="round"
            className="stroke-(--jelly-crew-sheen)"
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

/** The sign of a group of plates and doors (● ▲ ■), centred on (x, y). */
function GroupSign({
  group,
  x,
  y,
  size,
  className,
}: {
  group: JellyCrewGroup;
  x: number;
  y: number;
  size: number;
  className: string;
}) {
  const r = size;
  if (group === "circle") {
    return <circle cx={x} cy={y} r={r1(r * 0.85)} className={className} />;
  }
  if (group === "triangle") {
    return (
      <path
        d={`M${x} ${r1(y - r)}L${r1(x + r)} ${r1(y + r * 0.8)}L${r1(x - r)} ${r1(y + r * 0.8)}Z`}
        className={className}
      />
    );
  }
  return (
    <rect
      x={r1(x - r * 0.75)}
      y={r1(y - r * 0.75)}
      width={r1(r * 1.5)}
      height={r1(r * 1.5)}
      className={className}
    />
  );
}

interface PieceShapeProps {
  readonly piece: JellyCrewPiece;
  readonly width: number;
  /** Cells that slid in the move shown: they carry `data-slide`. */
  readonly slid: ReadonlySet<number>;
  readonly cell?: number;
}

/**
 * One piece: for each kind, its cells joined into one shape (an edge, the body inset on it); a band
 * of grass jelly across each seam between two kinds; a sign and a gloss on each cell. Every element
 * of a cell that slid carries `data-slide`, so the slide moves the cell and what is drawn on it.
 */
export function PieceShape({ piece, width, slid, cell = CELL }: PieceShapeProps) {
  const kindAt = new Map(piece.cells.map((at, index) => [at, piece.kinds[index] ?? "ice"]));
  const xy = (at: number) => [(at % width) * cell, Math.floor(at / width) * cell] as const;
  const right = (at: number) => (at % width < width - 1 ? at + 1 : -1);
  const inset = cell * 0.05;
  const rim = Math.max(2, cell * 0.07);
  const slide = (at: number) => (slid.has(at) ? { "data-slide": "" } : {});

  const layer = (kind: JellyCrewKind, extra: number, className: string): ReactNode[] => {
    const radius = (kind === "ice" ? cell * 0.12 : cell * 0.26) - extra;
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
    const kind = kindAt.get(at) ?? "ice";
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
          className="fill-(--jelly-crew-grass) stroke-(--jelly-crew-grass-edge)"
        />,
      );
    }
    signs.push(
      <g key={`sign:${at}`} {...slide(at)}>
        {kind !== "ice" && (
          <path
            d={`M${r1(x + cell * 0.24)} ${r1(y + cell * 0.3)}q${r1(cell * 0.06)} ${r1(-cell * 0.1)} ${r1(cell * 0.2)} ${r1(-cell * 0.1)}`}
            strokeWidth={r1(cell * 0.07)}
            strokeLinecap="round"
            fill="none"
            className="stroke-(--jelly-crew-sheen)"
          />
        )}
        <KindSign
          kind={kind}
          x={r1(x + cell / 2)}
          y={r1(y + cell / 2 + (kind === "ice" ? 0 : cell * 0.04))}
          size={cell * 0.15}
        />
      </g>,
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
    </>
  );
}

/** A wall tile: a block with a glazed top. */
export function Wall({ x, y, cell = CELL }: { x: number; y: number; cell?: number }) {
  return (
    <>
      <rect x={x} y={y} width={cell} height={cell} className="fill-(--jelly-crew-wall)" />
      <rect
        x={r1(x + cell * 0.12)}
        y={r1(y + cell * 0.12)}
        width={r1(cell * 0.76)}
        height={r1(cell * 0.62)}
        rx={r1(cell * 0.1)}
        className="fill-(--jelly-crew-wall-top)"
      />
    </>
  );
}

/** A mold on the floor, under the pieces: its kind's body faint, a dashed edge, its sign. */
export function MoldUnder({
  x,
  y,
  kind,
  cell = CELL,
}: {
  x: number;
  y: number;
  kind: JellyCrewKind;
  cell?: number;
}) {
  const inset = cell * 0.09;
  const { body, edgeStroke } = KIND_FILL[kind];
  return (
    <g data-mold={kind}>
      <rect
        x={r1(x + inset)}
        y={r1(y + inset)}
        width={r1(cell - 2 * inset)}
        height={r1(cell - 2 * inset)}
        rx={r1(cell * 0.2)}
        strokeWidth={r1(cell * 0.05)}
        strokeDasharray={`${r1(cell * 0.12)} ${r1(cell * 0.08)}`}
        className={`${body} ${edgeStroke} [fill-opacity:var(--jelly-crew-mold-fill)]`}
      />
      <KindSign
        kind={kind}
        x={r1(x + cell / 2)}
        y={r1(y + cell / 2)}
        size={cell * 0.1}
        tone="edge"
      />
    </g>
  );
}

/** A mold seen through what lies on it: an outline over the piece, dashed until it fits, a tick. */
export function MoldOver({
  x,
  y,
  fitted,
  cell = CELL,
}: {
  x: number;
  y: number;
  fitted: boolean;
  cell?: number;
}) {
  const frame = {
    x: r1(x + cell * 0.03),
    y: r1(y + cell * 0.03),
    width: r1(cell * 0.94),
    height: r1(cell * 0.94),
    rx: r1(cell * 0.24),
    fill: "none",
    ...(!fitted && { strokeDasharray: `${r1(cell * 0.1)} ${r1(cell * 0.07)}` }),
  };
  const tick = `M${r1(x + cell * 0.66)} ${r1(y + cell * 0.8)}l${r1(cell * 0.07)} ${r1(cell * 0.07)}l${r1(cell * 0.13)} ${r1(-cell * 0.15)}`;
  return (
    <g data-mold-over="" {...(fitted && { "data-fitted": "" })}>
      <rect {...frame} strokeWidth={r1(cell * 0.045)} className="stroke-(--jelly-crew-mold-line)" />
      {fitted && (
        <path
          d={tick}
          strokeWidth={r1(cell * 0.06)}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          className="stroke-(--jelly-crew-mold-line)"
        />
      )}
    </g>
  );
}

/** A plate: a rounded tile with its group's sign, darker while something stands on it. */
export function Plate({
  x,
  y,
  group,
  held,
  cell = CELL,
}: {
  x: number;
  y: number;
  group: JellyCrewGroup;
  held: boolean;
  cell?: number;
}) {
  return (
    <g data-plate={group} {...(held && { "data-held": "" })}>
      <rect
        x={r1(x + cell * 0.1)}
        y={r1(y + cell * 0.1)}
        width={r1(cell * 0.8)}
        height={r1(cell * 0.8)}
        rx={r1(cell * 0.16)}
        strokeWidth={r1(cell * 0.06)}
        className={`${held ? "fill-(--jelly-crew-plate-on)" : "fill-(--jelly-crew-plate)"} stroke-(--jelly-crew-plate-edge)`}
      />
      <GroupSign
        group={group}
        x={r1(x + cell / 2)}
        y={r1(y + cell / 2)}
        size={cell * 0.2}
        className="fill-(--jelly-crew-sign)"
      />
    </g>
  );
}

/**
 * A door: closed, a wooden block with three bars and its group's sign on a badge; open, only two
 * posts at the edges of the cell (the bars drawn back) and the sign in the middle. Dashes are for
 * molds only.
 */
export function Door({
  x,
  y,
  group,
  open,
  cell = CELL,
}: {
  x: number;
  y: number;
  group: JellyCrewGroup;
  open: boolean;
  cell?: number;
}) {
  if (open) {
    return (
      <g data-door={group} data-open="">
        <rect
          x={x}
          y={y}
          width={r1(cell * 0.16)}
          height={cell}
          className="fill-(--jelly-crew-door)"
        />
        <rect
          x={r1(x + cell * 0.84)}
          y={y}
          width={r1(cell * 0.16)}
          height={cell}
          className="fill-(--jelly-crew-door)"
        />
        <GroupSign
          group={group}
          x={r1(x + cell / 2)}
          y={r1(y + cell / 2)}
          size={cell * 0.14}
          className="fill-(--jelly-crew-door-open)"
        />
      </g>
    );
  }
  return (
    <g data-door={group}>
      <rect x={x} y={y} width={cell} height={cell} className="fill-(--jelly-crew-door)" />
      {[0, 1, 2].map((bar) => (
        <rect
          key={bar}
          x={r1(x + cell * (0.14 + bar * 0.27))}
          y={r1(y + cell * 0.08)}
          width={r1(cell * 0.17)}
          height={r1(cell * 0.84)}
          rx={r1(cell * 0.05)}
          className="fill-(--jelly-crew-door-bar)"
        />
      ))}
      <circle
        cx={r1(x + cell / 2)}
        cy={r1(y + cell / 2)}
        r={r1(cell * 0.26)}
        className="fill-(--jelly-crew-door)"
      />
      <GroupSign
        group={group}
        x={r1(x + cell / 2)}
        y={r1(y + cell / 2)}
        size={cell * 0.17}
        className="fill-(--jelly-crew-door-sign)"
      />
    </g>
  );
}

/**
 * A character: a disc in its seat's colour with its number; the one the arrows move has a thick
 * ring around a halo (still: it marks a choice, not a turn), and one on a plate has a badge with the
 * plate's sign, as its body hides the plate.
 */
export function Character({
  cx,
  cy,
  seat,
  now,
  plate,
  cell = CELL,
}: {
  cx: number;
  cy: number;
  seat: number;
  now: boolean;
  plate?: JellyCrewGroup | undefined;
  cell?: number;
}) {
  const r = now ? cell * 0.36 : cell * 0.41;
  return (
    <>
      {now && (
        <circle
          cx={cx}
          cy={cy}
          r={r1(cell * 0.47)}
          fill="none"
          strokeWidth={r1(cell * 0.12)}
          data-turn-ring=""
          className="stroke-(--jelly-crew-turn)"
        />
      )}
      {now && (
        <circle cx={cx} cy={cy} r={r1(r + cell * 0.04)} className="fill-(--jelly-crew-turn-halo)" />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={r1(r)}
        strokeWidth={r1(cell * 0.05)}
        className={`${SEAT_FILL[seat] ?? SEAT_FILL[0]} stroke-(--jelly-crew-seat-edge)`}
      />
      <text
        x={cx}
        y={r1(cy + cell * 0.18)}
        textAnchor="middle"
        fontSize={r1(cell * 0.52)}
        fontWeight={800}
        className="fill-(--jelly-crew-seat-ink) font-sans"
      >
        {seat + 1}
      </text>
      {plate !== undefined && (
        <g data-holding={plate}>
          <circle
            cx={r1(cx + cell * 0.32)}
            cy={r1(cy - cell * 0.32)}
            r={r1(cell * 0.17)}
            strokeWidth={r1(cell * 0.04)}
            className="fill-(--jelly-crew-plate) stroke-(--jelly-crew-plate-edge)"
          />
          <GroupSign
            group={plate}
            x={r1(cx + cell * 0.32)}
            y={r1(cy - cell * 0.32)}
            size={cell * 0.09}
            className="fill-(--jelly-crew-sign)"
          />
        </g>
      )}
    </>
  );
}
