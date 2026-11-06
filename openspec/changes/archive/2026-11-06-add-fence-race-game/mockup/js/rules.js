/*
 * Cờ rào: the rules, written for real (BFS, overlap, crossing, sealing), as pure functions. The same
 * file runs in the page and in Node (the checks and the play-outs). Coordinates: x = column from the
 * left (0 = A), y = row from the bottom (0 = row 1), as the first seat sees the board.
 *
 * A fence { o: "h" | "v", x, y } has its middle at the top right corner of cell (x, y):
 *   "h" runs along the top of (x, y) and (x + 1, y);
 *   "v" runs along the right of (x, y) and (x, y + 1).
 * Its name is the name of that cell ("C5").
 *
 * A seat's goal is a gate: the 5 middle cells of the opposite edge (the columns or rows 3 to 7 of a
 * 9-cell edge), not the whole edge.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FenceRules = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const SETUP = {
    2: { rows: 11, cols: 9, fences: 9, edges: ["bottom", "top"] },
    3: { rows: 9, cols: 9, fences: 6, edges: ["bottom", "top", "left"] },
    4: { rows: 9, cols: 9, fences: 4, edges: ["bottom", "left", "top", "right"] },
  };
  const GATE_CELLS = 5;
  // Three players stop at 198, so everyone has had as many turns.
  const turnLimit = (n) => (n === 3 ? 198 : 200);
  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const OPPOSITE = { bottom: "top", top: "bottom", left: "right", right: "left" };

  const cellName = (x, y) => LETTERS[x] + (y + 1);
  const fenceName = (f) => cellName(f.x, f.y);

  function startCell(edge, rows, cols) {
    const mx = (cols - 1) / 2, my = (rows - 1) / 2;
    if (edge === "bottom") return { x: mx, y: 0 };
    if (edge === "top") return { x: mx, y: rows - 1 };
    if (edge === "left") return { x: 0, y: my };
    return { x: cols - 1, y: my };
  }

  function newGame(n) {
    const s = SETUP[n];
    return {
      n, rows: s.rows, cols: s.cols, edges: s.edges, goals: s.edges.map((e) => OPPOSITE[e]),
      pieces: s.edges.map((e) => startCell(e, s.rows, s.cols)),
      walls: [], left: s.edges.map(() => s.fences), breaks: s.edges.map(() => 1),
      turn: 0, ply: 0, last: null, result: null,
    };
  }

  /* Whether position i of an edge of `len` cells is in the gate, the 5 cells around its middle. */
  const inGate = (i, len) => Math.abs(i - (len - 1) / 2) <= (GATE_CELLS - 1) / 2;

  function onGoal(g, seat, x, y) {
    const e = g.goals[seat];
    if (e === "top") return y === g.rows - 1 && inGate(x, g.cols);
    if (e === "bottom") return y === 0 && inGate(x, g.cols);
    if (e === "left") return x === 0 && inGate(y, g.rows);
    return x === g.cols - 1 && inGate(y, g.rows);
  }

  /* The steps a set of fences closes, both ways. */
  function closedSteps(walls) {
    const closed = new Set();
    const shut = (x, y, x2, y2) => { closed.add(`${x},${y},${x2},${y2}`); closed.add(`${x2},${y2},${x},${y}`); };
    for (const w of walls) {
      if (w.o === "h") { shut(w.x, w.y, w.x, w.y + 1); shut(w.x + 1, w.y, w.x + 1, w.y + 1); }
      else { shut(w.x, w.y, w.x + 1, w.y); shut(w.x, w.y + 1, w.x + 1, w.y + 1); }
    }
    return closed;
  }

  const DIRS = [[0, 1], [1, 0], [-1, 0], [0, -1]];

  /* The shortest way to the seat's goal: steps and cells; other pieces never block. */
  function shortestPath(g, seat, walls) {
    const closed = closedSteps(walls || g.walls);
    const from = g.pieces[seat];
    const prev = new Map([[`${from.x},${from.y}`, null]]);
    const queue = [from];
    // Towards the goal first, so the path shown is a straight one when there are several.
    const goalDir = { top: [0, 1], bottom: [0, -1], left: [-1, 0], right: [1, 0] }[g.goals[seat]];
    const dirs = [goalDir, ...DIRS.filter((d) => d[0] !== goalDir[0] || d[1] !== goalDir[1])];
    for (let i = 0; i < queue.length; i++) {
      const c = queue[i];
      if (onGoal(g, seat, c.x, c.y)) {
        const path = [];
        for (let at = c; at; at = prev.get(`${at.x},${at.y}`)) path.unshift(at);
        return { steps: path.length - 1, path };
      }
      for (const [dx, dy] of dirs) {
        const x = c.x + dx, y = c.y + dy;
        if (x < 0 || y < 0 || x >= g.cols || y >= g.rows) continue;
        if (closed.has(`${c.x},${c.y},${x},${y}`)) continue;
        const key = `${x},${y}`;
        if (prev.has(key)) continue;
        prev.set(key, c);
        queue.push({ x, y });
      }
    }
    return { steps: Infinity, path: [] };
  }

  const stepsOf = (g, walls) => g.pieces.map((_, seat) => shortestPath(g, seat, walls).steps);

  function legalSteps(g, seat) {
    if (g.result) return [];
    const closed = closedSteps(g.walls);
    const p = g.pieces[seat];
    return DIRS.map(([dx, dy]) => ({ x: p.x + dx, y: p.y + dy }))
      .filter((c) => c.x >= 0 && c.y >= 0 && c.x < g.cols && c.y < g.rows && !closed.has(`${p.x},${p.y},${c.x},${c.y}`));
  }

  /*
   * Why a fence may not go there, or null. Checked in the order a player would read it:
   * out of fences, overlap, crossing, then a sealed way (with whose).
   */
  function fenceProblem(g, f, seat) {
    if (g.result) return { code: "over" };
    if (g.left[seat] <= 0) return { code: "none-left" };
    if (f.x < 0 || f.y < 0 || f.x > g.cols - 2 || f.y > g.rows - 2) return { code: "outside" };
    for (const w of g.walls) {
      if (w.o === f.o) {
        const same = w.x === f.x && w.y === f.y;
        const along = f.o === "h" ? w.y === f.y && Math.abs(w.x - f.x) === 1 : w.x === f.x && Math.abs(w.y - f.y) === 1;
        if (same || along) return { code: "overlap", wall: w };
      } else if (w.x === f.x && w.y === f.y) {
        return { code: "cross", wall: w };
      }
    }
    const walls = g.walls.concat([f]);
    const sealed = g.pieces.map((_, s) => s).filter((s) => shortestPath(g, s, walls).steps === Infinity);
    if (sealed.length) return { code: "sealed", seats: sealed };
    return null;
  }

  function finish(g) {
    if (g.result || g.ply < turnLimit(g.n)) return g;
    const steps = stepsOf(g);
    const best = Math.min(...steps);
    const tied = steps.flatMap((s, i) => (s === best ? [i] : []));
    g.result = tied.length === 1
      ? { kind: "win", winners: tied, reason: "turn-limit", steps }
      : { kind: "draw", tied, reason: "turn-limit", steps };
    return g;
  }

  const copy = (g) => ({ ...g, pieces: g.pieces.map((p) => ({ ...p })), walls: g.walls.slice(), left: g.left.slice(), breaks: g.breaks.slice() });
  const next = (g, seat) => { g.ply++; g.turn = (seat + 1) % g.n; return g; };

  function step(g0, to) {
    const seat = g0.turn;
    if (!legalSteps(g0, seat).some((c) => c.x === to.x && c.y === to.y)) throw new Error("illegal step " + cellName(to.x, to.y));
    const g = copy(g0);
    const from = g.pieces[seat];
    g.pieces[seat] = { x: to.x, y: to.y };
    g.last = { kind: "step", seat, from, to };
    next(g, seat);
    if (onGoal(g, seat, to.x, to.y)) g.result = { kind: "win", winners: [seat], reason: "goal", at: cellName(to.x, to.y), ply: g.ply };
    return finish(g);
  }

  function placeFence(g0, f) {
    const seat = g0.turn;
    const why = fenceProblem(g0, f, seat);
    if (why) throw new Error("illegal fence " + fenceName(f) + " " + why.code);
    const g = copy(g0);
    const wall = { o: f.o, x: f.x, y: f.y, by: seat };
    g.walls.push(wall);
    g.left[seat]--;
    g.last = { kind: "fence", seat, fence: wall };
    return finish(next(g, seat));
  }

  function breakFence(g0, wall) {
    const seat = g0.turn;
    if (g0.result || g0.breaks[seat] <= 0) throw new Error("no break left");
    const g = copy(g0);
    const at = g.walls.findIndex((w) => w.o === wall.o && w.x === wall.x && w.y === wall.y);
    if (at < 0) throw new Error("no such fence");
    const [gone] = g.walls.splice(at, 1);
    g.breaks[seat]--;
    g.last = { kind: "break", seat, fence: gone };
    return finish(next(g, seat));
  }

  return { SETUP, GATE_CELLS, turnLimit, inGate, LETTERS, OPPOSITE, cellName, fenceName, newGame, onGoal, closedSteps, shortestPath, stepsOf, legalSteps, fenceProblem, step, placeFence, breakFence };
});
