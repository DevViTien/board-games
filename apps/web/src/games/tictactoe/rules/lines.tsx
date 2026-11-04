import { RulesFigure } from "@/features/rules/RulesFigure";

/** A board's 3 × 3 cells, each 30 units, as `[mark, ...]` row by row: "x", "o" or "". */
type Marks = readonly (readonly ("x" | "o" | "")[])[];

interface MiniBoard {
  readonly marks: Marks;
  /** The winning line, from the centre of its first cell to the centre of its last: [col, row]. */
  readonly line: readonly [from: readonly [number, number], to: readonly [number, number]];
}

const CELL = 30;
/** A row, a column and a diagonal (design §5). */
const BOARDS: readonly MiniBoard[] = [
  {
    marks: [
      ["x", "x", "x"],
      ["o", "", "o"],
      ["", "", ""],
    ],
    line: [
      [0, 0],
      [2, 0],
    ],
  },
  {
    marks: [
      ["x", "o", ""],
      ["x", "o", ""],
      ["", "o", "x"],
    ],
    line: [
      [1, 0],
      [1, 2],
    ],
  },
  {
    marks: [
      ["x", "o", ""],
      ["", "x", "o"],
      ["", "", "x"],
    ],
    line: [
      [0, 0],
      [2, 2],
    ],
  },
];

const centre = (index: number) => index * CELL + CELL / 2;

function Board({ board, x }: { readonly board: MiniBoard; readonly x: number }) {
  const [[fromCol, fromRow], [toCol, toRow]] = board.line;
  return (
    <g transform={`translate(${String(x)} 3)`}>
      {board.marks.map((row, rowIndex) =>
        row.map((mark, colIndex) => {
          const cx = centre(colIndex);
          const cy = centre(rowIndex);
          return (
            <g key={`${String(rowIndex)}-${String(colIndex)}`}>
              <rect
                x={colIndex * CELL + 1.5}
                y={rowIndex * CELL + 1.5}
                width={CELL - 3}
                height={CELL - 3}
                rx="5"
                strokeWidth="1.5"
                className="fill-game-board stroke-game-line"
              />
              {mark === "x" && (
                <path
                  d={`M${String(cx - 7)} ${String(cy - 7)}l14 14m0 -14l-14 14`}
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="stroke-game-mark-1"
                />
              )}
              {mark === "o" && (
                <circle
                  cx={cx}
                  cy={cy}
                  r="7.5"
                  fill="none"
                  strokeWidth="4"
                  className="stroke-game-mark-2"
                />
              )}
            </g>
          );
        }),
      )}
      <line
        x1={centre(fromCol)}
        y1={centre(fromRow)}
        x2={centre(toCol)}
        y2={centre(toRow)}
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-game-win"
      />
    </g>
  );
}

/** Three small boards: a row, a column and a diagonal that win. */
export function LinesFigure({
  label,
  caption,
}: {
  readonly label: string;
  readonly caption: string;
}) {
  return (
    <RulesFigure label={label} caption={caption} viewBox="0 0 300 96">
      {BOARDS.map((board, index) => (
        <Board key={index} board={board} x={index * 105} />
      ))}
    </RulesFigure>
  );
}
