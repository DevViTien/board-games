import {
  BLOCKED,
  type Board,
  type Colour,
  COLOURS,
  type Direction,
  DIRECTIONS,
  JELLY_KIND,
  type JellyKind,
  KINDS,
  type MoldKind,
  type MoldProgress,
  OFFSET,
  type Piece,
  type StepResult,
} from "./types";

/** The cells and walls a board lives on: what sticking needs. */
interface Area {
  readonly width: number;
  readonly height: number;
  readonly walls: ReadonlySet<number>;
}

/** What `step` needs of a level: its area and its molds, which decide when it is solved. */
export interface Grid extends Area {
  readonly molds: ReadonlyMap<number, MoldKind>;
}

/** The cell next to `cell` towards `direction`, or -1 off the grid. */
function nextCell(grid: Area, cell: number, direction: Direction): number {
  const [dx, dy] = OFFSET[direction];
  const x = (cell % grid.width) + dx;
  const y = Math.floor(cell / grid.width) + dy;
  return x < 0 || y < 0 || x >= grid.width || y >= grid.height ? -1 : y * grid.width + x;
}

function neighbours(grid: Area, cell: number): number[] {
  const out: number[] = [];
  for (const direction of DIRECTIONS) {
    const next = nextCell(grid, cell, direction);
    if (next !== -1) out.push(next);
  }
  return out;
}

/** Whether two touching cells of these kinds stick: same jelly, or grass jelly with any jelly. */
function sticks(a: JellyKind, b: JellyKind): boolean {
  if (a === JELLY_KIND.Ice || b === JELLY_KIND.Ice) return false;
  return a === b || a === JELLY_KIND.Grass || b === JELLY_KIND.Grass;
}

const touchesWall = (grid: Area, cell: number) =>
  neighbours(grid, cell).some((next) => grid.walls.has(next));

interface Settled {
  readonly board: Board;
  /** For each piece of the board, the indexes of the pieces it was made of. */
  readonly sources: readonly (readonly number[])[];
  readonly fixedNow: boolean;
}

/**
 * Sticks together whatever touches and sticks, until nothing more does, then fixes the pieces with
 * a coconut cell next to a wall. Fixing moves nothing, so it never makes a new piece stick.
 */
export function settle(grid: Area, player: number, pieces: readonly Piece[]): Settled {
  const parent = pieces.map((_, index) => index);
  const find = (index: number): number => {
    let root = index;
    while (parent[root] !== root) root = parent[root] ?? root;
    return root;
  };
  const owner = new Map<number, readonly [number, JellyKind]>();
  pieces.forEach((piece, index) => {
    piece.cells.forEach((cell, at) => owner.set(cell, [index, piece.kinds[at] ?? JELLY_KIND.Ice]));
  });
  for (const [cell, [index, kind]] of owner) {
    for (const next of neighbours(grid, cell)) {
      const other = owner.get(next);
      if (other !== undefined && other[0] !== index && sticks(kind, other[1])) {
        parent[find(index)] = find(other[0]);
      }
    }
  }

  const groups = new Map<number, number[]>();
  pieces.forEach((_, index) => {
    const root = find(index);
    groups.set(root, [...(groups.get(root) ?? []), index]);
  });

  let fixedNow = false;
  const settled = [...groups.values()].map((members) => {
    const cells = members
      .flatMap((index) => {
        const piece = pieces[index];
        return piece === undefined
          ? []
          : piece.cells.map((cell, at) => [cell, piece.kinds[at] ?? JELLY_KIND.Ice] as const);
      })
      .sort((a, b) => a[0] - b[0]);
    let fixed = members.some((index) => pieces[index]?.fixed === true);
    // Stuck for good in this settle: a moving piece joined to one that already was, or a coconut
    // cell now touching a wall.
    if (fixed && members.some((index) => pieces[index]?.fixed === false)) fixedNow = true;
    if (
      !fixed &&
      cells.some(([cell, kind]) => kind === JELLY_KIND.Coconut && touchesWall(grid, cell))
    ) {
      fixed = true;
      fixedNow = true;
    }
    const piece: Piece = {
      cells: cells.map(([cell]) => cell),
      kinds: cells.map(([, kind]) => kind),
      fixed,
    };
    return { piece, members };
  });
  settled.sort((a, b) => (a.piece.cells[0] ?? 0) - (b.piece.cells[0] ?? 0));
  return {
    board: { player, pieces: settled.map(({ piece }) => piece) },
    sources: settled.map(({ members }) => members),
    fixedNow,
  };
}

/** How many pieces hold at least one cell of `colour`. */
function colourPieces(board: Board, colour: Colour): number {
  return board.pieces.filter((piece) => piece.kinds.includes(colour)).length;
}

/** The mold cells holding the kind they ask for, or `null` in a level without molds. */
export function moldProgress(grid: Grid, board: Board): MoldProgress | null {
  if (grid.molds.size === 0) return null;
  const kindAt = new Map<number, JellyKind>();
  for (const piece of board.pieces) {
    piece.cells.forEach((cell, index) => {
      const kind = piece.kinds[index];
      if (kind !== undefined) kindAt.set(cell, kind);
    });
  }
  let fitted = 0;
  for (const [cell, kind] of grid.molds) if (kindAt.get(cell) === kind) fitted += 1;
  return { fitted, total: grid.molds.size };
}

/**
 * Solved. A level with molds: every mold cell holds its kind; as each moulded kind has as many
 * cells as molds (`parseLevel` checks), they then all lie in the molds. A level without molds:
 * every colour on the board has all its cells in one piece.
 */
export function isSolved(grid: Grid, board: Board): boolean {
  const molds = moldProgress(grid, board);
  if (molds !== null) return molds.fitted === molds.total;
  return COLOURS.every((colour) => colourPieces(board, colour) <= 1);
}

const inKindOrder = (kinds: Iterable<JellyKind>) => {
  const set = new Set(kinds);
  return KINDS.filter((kind) => set.has(kind));
};

/**
 * One move of the player (spec "Đi và đẩy"): walk, or push the piece ahead and every piece it
 * pushes in turn, then let what touches stick. A piece may wrap round the player: the cell the
 * player leaves is no obstacle, as the player moves too.
 */
export function step(grid: Grid, board: Board, direction: Direction): StepResult {
  if (isSolved(grid, board)) return { ok: false, blocked: BLOCKED.Solved };
  const target = nextCell(grid, board.player, direction);
  if (target === -1 || grid.walls.has(target)) return { ok: false, blocked: BLOCKED.Wall };

  const owner = new Map<number, number>();
  board.pieces.forEach((piece, index) => {
    for (const cell of piece.cells) owner.set(cell, index);
  });
  const first = owner.get(target);
  if (first === undefined) {
    const walked = { player: target, pieces: board.pieces };
    return {
      ok: true,
      board: walked,
      moved: walked,
      pushedPieces: [],
      outcome: {
        player: target,
        pushed: [],
        stuck: [],
        glued: [],
        fixed: false,
        molds: moldProgress(grid, walked),
        moldsChanged: false,
        solved: false,
      },
    };
  }

  const pushed = new Set([first]);
  const queue = [first];
  for (let index = queue.shift(); index !== undefined; index = queue.shift()) {
    const piece = board.pieces[index];
    if (piece === undefined) continue;
    if (piece.fixed) return { ok: false, blocked: BLOCKED.Fixed };
    for (const cell of piece.cells) {
      const next = nextCell(grid, cell, direction);
      if (next === -1 || grid.walls.has(next)) return { ok: false, blocked: BLOCKED.Jam };
      const other = owner.get(next);
      if (other !== undefined && !pushed.has(other)) {
        pushed.add(other);
        queue.push(other);
      }
    }
  }

  const movedPieces = board.pieces.map((piece, index) =>
    pushed.has(index)
      ? { ...piece, cells: piece.cells.map((cell) => nextCell(grid, cell, direction)) }
      : piece,
  );
  const moved: Board = { player: target, pieces: movedPieces };
  const settled = settle(grid, target, movedPieces);

  const after = moldProgress(grid, settled.board);
  const stuck = COLOURS.flatMap((colour) => {
    const before = colourPieces(board, colour);
    const after = colourPieces(settled.board, colour);
    return after < before ? [{ colour, pieces: after }] : [];
  });
  // Kinds that a piece holding grass jelly did not hold before this move.
  const glued = inKindOrder(
    settled.board.pieces.flatMap((piece, index) => {
      const sources = settled.sources[index] ?? [];
      const grassy = sources.filter((source) =>
        movedPieces[source]?.kinds.includes(JELLY_KIND.Grass),
      );
      if (sources.length < 2 || grassy.length === 0) return [];
      const held = new Set(grassy.flatMap((source) => movedPieces[source]?.kinds ?? []));
      return piece.kinds.filter((kind) => kind !== JELLY_KIND.Grass && !held.has(kind));
    }),
  );

  return {
    ok: true,
    board: settled.board,
    moved,
    pushedPieces: [...pushed].sort((a, b) => a - b),
    outcome: {
      player: target,
      pushed: inKindOrder([...pushed].flatMap((index) => board.pieces[index]?.kinds ?? [])),
      stuck,
      glued,
      fixed: settled.fixedNow,
      molds: after,
      moldsChanged: after?.fitted !== moldProgress(grid, board)?.fitted,
      solved: isSolved(grid, settled.board),
    },
  };
}
