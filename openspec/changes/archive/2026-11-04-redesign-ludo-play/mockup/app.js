/* Mockup: Cờ cá ngựa play screen — horses, tap-to-move, hold-to-throw 3D die. */
(function () {
  "use strict";

  // ------------------------------------------------------------------ geometry (board-layout.ts)
  const GRID = 15;
  const TRACK_LENGTH = 56;
  const SEGMENT = 14;
  const HORSES = 4;
  const IN_STABLE = -1;
  const OWN_GATE = 55;
  const LAST_STEP = 61;
  const GATES = [13, 27, 41, 55];
  const COL = ["red", "blue", "yellow", "green"];
  const NAME = ["Đỏ", "Xanh dương", "Vàng", "Xanh lá"];

  const rotate = ([row, col], times) => {
    let p = [row, col];
    for (let i = 0; i < times; i += 1) p = [p[1], GRID - 1 - p[0]];
    return p;
  };
  const RED_SEGMENT = [
    [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [5, 9],
    [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], [7, 14],
  ];
  const TRACK_CELLS = Array.from({ length: TRACK_LENGTH }, (_, n) =>
    rotate(RED_SEGMENT[n % SEGMENT], Math.floor(n / SEGMENT)),
  );
  const stepCells = (c) => [1, 2, 3, 4, 5, 6].map((r) => rotate([r, 7], c));
  const CORNERS = [[0, 9], [9, 9], [9, 0], [0, 0]];
  const cellOf = (c, progress) => (c * SEGMENT + progress) % TRACK_LENGTH;
  const startCell = (c) => c * SEGMENT;
  const gateCell = (c) => (c * SEGMENT + OWN_GATE) % TRACK_LENGTH;
  const centre = ([row, col]) => ({ x: col + 0.5, y: row + 0.5 });

  function stableOutline(c, i) {
    const red = [
      { x: 9 + i, y: i }, { x: GRID - i, y: i }, { x: GRID - i, y: 6 - i },
      { x: 10 + i, y: 6 - i }, { x: 10 + i, y: 5 - i }, { x: 9 + i, y: 5 - i },
    ];
    return red.map((point) => {
      let t = point;
      for (let k = 0; k < c; k += 1) t = { x: GRID - t.y, y: t.x };
      return t;
    });
  }
  const stableArea = (c) => ({ x: CORNERS[c][1] + 1, y: CORNERS[c][0] + 1, size: 4 });
  const stableSlot = (c, h) => ({
    x: CORNERS[c][1] + 2 + 2 * (h % 2),
    y: CORNERS[c][0] + 2 + 2 * Math.floor(h / 2),
  });
  function horsePoint(c, h, progress) {
    if (progress === IN_STABLE) return stableSlot(c, h);
    if (progress > OWN_GATE) return centre(stepCells(c)[progress - OWN_GATE - 1]);
    return centre(TRACK_CELLS[cellOf(c, progress)]);
  }
  function roundedPath(points, radius) {
    const towards = (from, to) => {
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      const step = Math.min(radius, length / 2) / length;
      return { x: from.x + (to.x - from.x) * step, y: from.y + (to.y - from.y) * step };
    };
    return (
      points
        .map((point, index) => {
          const prev = points[(index + points.length - 1) % points.length];
          const next = points[(index + 1) % points.length];
          const s = towards(point, prev);
          const e = towards(point, next);
          return `${index === 0 ? "M" : "L"}${s.x} ${s.y}Q${point.x} ${point.y} ${e.x} ${e.y}`;
        })
        .join("") + "Z"
    );
  }

  // ------------------------------------------------------------------ rules (moves.ts, defaults)
  function occupancy(st) {
    const cells = Array(TRACK_LENGTH).fill(null);
    st.horses.forEach((hs, p) =>
      hs.forEach((pr, h) => {
        if (pr >= 0 && pr <= OWN_GATE) cells[cellOf(p, pr)] = { player: p, horse: h };
      }),
    );
    return cells;
  }
  function targetOf(st, p, h, face, occ = occupancy(st)) {
    const own = st.horses[p];
    const progress = own[h];
    const at = (t) => occ[cellOf(p, t)];
    const ownAt = (t) => at(t) !== null && at(t).player === p;
    const clearBetween = (a, b) => {
      for (let c = a + 1; c < b; c += 1) if (at(c) !== null) return false;
      return true;
    };
    const stepTaken = (s) => own.includes(OWN_GATE + s);
    if (progress === IN_STABLE) return face === 6 && !ownAt(0) ? 0 : null;
    if (progress < OWN_GATE) {
      if (face === 1) {
        const gate = GATES.find((g) => g > progress) ?? OWN_GATE;
        if (clearBetween(progress, gate) && !ownAt(gate)) return gate;
      }
      const t = progress + face;
      if (t > OWN_GATE) return null;
      if (!clearBetween(progress, t)) return null;
      return ownAt(t) ? null : t;
    }
    if (progress === OWN_GATE) {
      if (stepTaken(face)) return null;
      for (let s = 1; s < face; s += 1) if (stepTaken(s)) return null;
      return OWN_GATE + face;
    }
    if (progress >= LAST_STEP) return null;
    const step = progress - OWN_GATE;
    return face === step + 1 && !stepTaken(step + 1) ? progress + 1 : null;
  }
  function kickedAt(st, p, target, occ = occupancy(st)) {
    if (target < 0 || target > OWN_GATE) return null;
    const there = occ[cellOf(p, target)];
    return there !== null && there.player !== p ? there : null;
  }
  function choicesOf(st) {
    if (st.die === null) return [];
    const p = st.toMove;
    const occ = occupancy(st);
    const out = [];
    for (let h = 0; h < HORSES; h += 1) {
      const to = targetOf(st, p, h, st.die, occ);
      if (to === null) continue;
      out.push({ horse: h, from: st.horses[p][h], to, kicked: kickedAt(st, p, to, occ) });
    }
    return out;
  }
  function movableCount(st, face) {
    return choicesOf({ ...st, die: face }).length;
  }
  function applyRoll(st, face) {
    const p = st.toMove;
    if (movableCount(st, face) > 0) {
      return { ...st, die: face, ply: st.ply + 1, last: { kind: "roll", player: p, face, lost: false, again: false } };
    }
    const again = face === 6;
    return {
      ...st,
      toMove: again ? p : (p + 1) % 4,
      die: null,
      ply: st.ply + 1,
      last: { kind: "roll", player: p, face, lost: !again, again },
    };
  }
  function applyMove(st, h) {
    const p = st.toMove;
    const face = st.die;
    const occ = occupancy(st);
    const to = targetOf(st, p, h, face, occ);
    const from = st.horses[p][h];
    const kicked = kickedAt(st, p, to, occ);
    const horses = st.horses.map((own, seat) => {
      if (seat === p) return own.map((pr, i) => (i === h ? to : pr));
      if (kicked && seat === kicked.player) return own.map((pr, i) => (i === kicked.horse ? IN_STABLE : pr));
      return own;
    });
    const won = horses[p].every((pr) => pr >= OWN_GATE + 3);
    const again = !won && face === 6;
    return {
      ...st,
      horses,
      toMove: won || again ? p : (p + 1) % 4,
      die: null,
      winner: won ? p : null,
      ply: st.ply + 1,
      last: { kind: "move", player: p, horse: h, face, from, to, kicked: kicked ? { ...kicked, from: st.horses[kicked.player][kicked.horse] } : null, again },
    };
  }

  /** The scripted position: Red to move; with 5 or 6 one choice kicks. */
  function scripted() {
    return {
      horses: [
        [10, IN_STABLE, 3, 57], // Red: ô 11, chuồng, ô 4, bậc 2
        [42, 20, IN_STABLE, IN_STABLE], // Blue: one on Red's start square
        [43, 3, IN_STABLE, IN_STABLE], // Yellow: one five squares ahead of Red's horse 1
        [5, IN_STABLE, IN_STABLE, IN_STABLE], // Green: just moved
      ],
      toMove: 0,
      die: null,
      winner: null,
      ply: 12,
      last: { kind: "move", player: 3, horse: 0, face: 5, from: 0, to: 5, kicked: null, again: false },
    };
  }

  // ------------------------------------------------------------------ text
  function placeOf(pr) {
    if (pr === IN_STABLE) return "trong chuồng";
    if (pr < OWN_GATE) return `ô ${pr + 1}`;
    if (pr === OWN_GATE) return "chân chuồng";
    return `bậc ${pr - OWN_GATE}`;
  }
  function actionOf(choice) {
    const { from, to } = choice;
    let action;
    if (from === IN_STABLE) action = "ra chuồng";
    else if (to > OWN_GATE) action = `lên bậc ${to - OWN_GATE}`;
    else if (to === OWN_GATE) action = "tới chân chuồng";
    else action = `đi ${to - from} ô`;
    if (choice.kicked) action += `, đá ngựa ${NAME[choice.kicked.player]}`;
    return action;
  }
  const choiceLabel = (choice) => `Ngựa ${choice.horse + 1}: ${actionOf(choice)}`;
  function summary(hs) {
    const track = hs.filter((p) => p >= 0 && p <= OWN_GATE).length;
    const home = hs.filter((p) => p > OWN_GATE).length;
    if (track === 0 && home === 0) return "Chưa ra quân";
    if (home === 0) return `${track} trên đường`;
    if (track === 0) return `${home} lên chuồng`;
    return `${track} đường · ${home} chuồng`;
  }

  // ------------------------------------------------------------------ drawing
  function symbolSvg(c, x, y, size, cls, style = "") {
    const st = style ? ` style="${style}"` : "";
    switch (COL[c]) {
      case "red":
        return `<circle class="${cls}"${st} cx="${x}" cy="${y}" r="${size}"/>`;
      case "blue":
        return `<rect class="${cls}"${st} x="${x - size * 0.85}" y="${y - size * 0.85}" width="${size * 1.7}" height="${size * 1.7}"/>`;
      case "yellow":
        return `<polygon class="${cls}"${st} points="${x},${y - size} ${x + size},${y + size * 0.8} ${x - size},${y + size * 0.8}"/>`;
      default:
        return `<polygon class="${cls}"${st} points="${x},${y - size} ${x + size},${y} ${x},${y + size} ${x - size},${y}"/>`;
    }
  }
  const fill = (name) => `fill:var(--${name})`;

  function boardDrawing(active) {
    let s = `<defs><clipPath id="boardClip"><rect x="0" y="0" width="15" height="15" rx="0.85"/></clipPath></defs>`;
    s += `<g clip-path="url(#boardClip)"><rect x="0" y="0" width="15" height="15" style="${fill("game-tint")}"/>`;
    for (let c = 0; c < 4; c += 1) {
      const name = COL[c];
      const area = stableArea(c);
      const isActive = c === active;
      s += `<g data-stable="${name}">`;
      s += `<path d="${roundedPath(stableOutline(c, 0.2), 0.7)}" style="${fill(`piece-${name}`)}"/>`;
      if (isActive) {
        s += `<path d="${roundedPath(stableOutline(c, 0.28), 0.62)}" fill="none" stroke-width="0.16" style="stroke:var(--fg)"/>`;
        s += `<path d="${roundedPath(stableOutline(c, 0.08), 0.8)}" fill="none" stroke-width="0.07" stroke-dasharray="0.22 0.14" style="stroke:var(--piece-${name}-line)"/>`;
      }
      s += `<rect x="${area.x}" y="${area.y}" width="4" height="4" rx="0.6" style="${fill("game-board")}"/>`;
      for (let h = 0; h < 4; h += 1) {
        const slot = stableSlot(c, h);
        s += `<circle cx="${slot.x}" cy="${slot.y}" r="0.36" fill="none" stroke-width="0.04" stroke-dasharray="0.12 0.1" style="stroke:var(--game-line)"/>`;
      }
      s += symbolSvg(c, area.x + 2, area.y + 2, 0.24, "", fill(`piece-${name}`));
      s += `</g>`;
    }
    TRACK_CELLS.forEach(([r, col]) => {
      s += `<rect x="${col}" y="${r}" width="1" height="1" stroke-width="0.04" style="${fill("game-board")};stroke:var(--game-line)"/>`;
    });
    for (let c = 0; c < 4; c += 1) {
      const name = COL[c];
      const [sr, sc] = TRACK_CELLS[startCell(c)];
      const [gr, gc] = TRACK_CELLS[gateCell(c)];
      s += `<rect x="${sc}" y="${sr}" width="1" height="1" stroke-width="0.04" style="${fill(`piece-${name}`)};fill-opacity:.2;stroke:var(--game-line)"/>`;
      s += symbolSvg(c, sc + 0.5, sr + 0.5, 0.16, "", `${fill(`piece-${name}`)};opacity:.6`);
      s += `<rect x="${gc + 0.14}" y="${gr + 0.14}" width="0.72" height="0.72" fill="none" stroke-width="0.08" stroke-dasharray="0.14 0.1" style="stroke:var(--piece-${name}-line)"/>`;
      stepCells(c).forEach(([r, col], i) => {
        s += `<rect x="${col}" y="${r}" width="1" height="1" stroke-width="0.04" style="${fill(`piece-${name}`)};fill-opacity:.2;stroke:var(--game-line)"/>`;
        s += `<text x="${col + 0.5}" y="${r + 0.55}" font-size="0.42" font-weight="700" text-anchor="middle" dominant-baseline="middle" style="${fill("fg")}">${i + 1}</text>`;
      });
    }
    const edges = ["7,7 8,7", "8,7 8,8", "8,8 7,8", "7,8 7,7"];
    for (let c = 0; c < 4; c += 1) s += `<polygon points="${edges[c]} 7.5,7.5" style="${fill(`piece-${COL[c]}`)}"/>`;
    s += `</g><rect x="0.045" y="0.045" width="14.91" height="14.91" rx="0.82" fill="none" stroke-width="0.09" style="stroke:var(--ludo-frame)"/>`;
    return s;
  }

  /**
   * The horse: an original standing piece, a horse's head and neck (facing left) on a drum-shaped
   * base. Local units: 92 wide, base bottom at y = 0, ear tip at y = -126. The colour's symbol sits
   * big on the front of the base, in the colour's ink.
   */
  function horseBody(c) {
    return (
      `<path class="h-band" d="M-46 -52V-8A46 8 0 0 0 46 -8V-52Z"/>` +
      `<ellipse class="h-top" cx="0" cy="-52" rx="46" ry="8"/>` +
      `<ellipse class="h-hi" cx="-12" cy="-53" rx="22" ry="3.2"/>` +
      `<path class="h-head" d="M22 -54C27 -70 29 -88 20 -102L23 -126L7 -111C-5 -112 -19 -104 -31 -90C-39 -82 -44 -73 -39 -68C-34 -64 -24 -66 -16 -70C-10 -73 -5 -70 -8 -64C-12 -60 -18 -57 -22 -54Z"/>` +
      `<path class="h-mane" d="M12 -99C20 -86 21 -72 15 -60"/>` +
      `<circle class="h-eye" cx="-9" cy="-95" r="5.5"/>` +
      `<circle class="h-eye" cx="-35" cy="-76" r="3"/>` +
      `<ellipse class="h-collar" cx="0" cy="-55" rx="27" ry="6"/>` +
      symbolSvg(c, 0, -23, 16, "h-sym")
    );
  }
  const PIECE_SCALE = 0.0092;
  const BASE_DROP = 0.4; // base bottom below the cell centre
  function horseVars(c) {
    const n = COL[c];
    return `--hc:var(--piece-${n});--hk:var(--piece-${n}-ink);--hl:var(--piece-${n}-line)`;
  }
  function horseSvg(c, x, y, { cls = "", hop = 0, data = "" } = {}) {
    return (
      `<g class="horse ${cls}" ${data} style="${horseVars(c)}" transform="translate(${x.toFixed(3)} ${(y + BASE_DROP).toFixed(3)})">` +
      (cls.includes("ghost") ? "" : `<ellipse class="h-shadow" cx="0.04" cy="-0.03" rx="${0.46 - hop * 0.3}" ry="${0.12 - hop * 0.06}"/>`) +
      `<g class="h-lift"><g transform="translate(0 ${(-hop).toFixed(3)}) scale(${PIECE_SCALE})">${horseBody(c)}</g></g></g>`
    );
  }

  /** Pips of the small 2D die (Dice.tsx, 30 × 30). */
  const PIPS = {
    1: [[15, 15]],
    2: [[8, 8], [22, 22]],
    3: [[8, 8], [15, 15], [22, 22]],
    4: [[8, 8], [22, 8], [8, 22], [22, 22]],
    5: [[8, 8], [22, 8], [15, 15], [8, 22], [22, 22]],
    6: [[8, 8], [22, 8], [8, 15], [22, 15], [8, 22], [22, 22]],
  };
  function dieSvg(face) {
    if (face === null) {
      const all = [...PIPS[6], [15, 15]];
      return (
        `<svg viewBox="0 0 30 30" aria-hidden="true"><rect x="3" y="3" width="24" height="24" rx="4" fill="none" stroke-width="1.5" stroke-dasharray="3 2.5" style="stroke:var(--fg-muted)"/>` +
        all.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" style="fill:var(--fg-muted);opacity:.3"/>`).join("") +
        `</svg>`
      );
    }
    return `<svg viewBox="0 0 30 30" aria-hidden="true">${PIPS[face].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" style="fill:var(--fg)"/>`).join("")}</svg>`;
  }
  function chipSvg(c, px = 28) {
    return `<svg class="chip" viewBox="0 0 28 28" width="${px}" height="${px}" aria-hidden="true"><circle cx="14" cy="14" r="12.5" stroke-width="1.5" style="${fill(`piece-${COL[c]}`)};stroke:var(--piece-edge)"/>${symbolSvg(c, 14, 14, 5.5, "", fill(`piece-${COL[c]}-ink`))}</svg>`;
  }

  const ICON = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"/></svg>',
    monitor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>',
  };

  // ------------------------------------------------------------------ the screen
  const host = document.createElement("div");
  host.className = "screen-host";
  host.style.cssText = "position:absolute;inset:0";
  host.innerHTML = `
  <div class="screen" data-game="ludo" id="screen">
    <header class="topbar">
      <button class="icon-btn ghost" type="button" aria-label="Về menu">${ICON.back}<span class="only-wide">Về menu</span></button>
      <div class="title">Cờ cá ngựa</div><span class="spacer"></span>
      <button class="icon-btn" type="button" aria-label="Luật chơi">${ICON.book}<span class="only-wide">Luật chơi</span></button>
      <button class="icon-btn" type="button" aria-label="Giao diện: theo hệ thống">${ICON.monitor}</button>
      <button class="icon-btn" type="button" aria-label="Ngôn ngữ: Tiếng Việt">${ICON.globe}<span>VI</span></button>
    </header>
    <main class="play">
      <p class="turn" role="status" id="turn"></p>
      <ul class="seats" id="seats" aria-label="Người chơi"></ul>
      <div class="board-wrap">
        <div class="board-box" id="boardBox">
          <svg viewBox="0 0 15 15" aria-hidden="true" id="boardSvg"><g id="gBoard"></g><g id="gFloor"></g><g id="gPieces"></g><g id="gGhost"></g></svg>
          <div class="hits" id="hits" role="group" aria-label="Chọn ngựa để đi"></div>
        </div>
        <ul class="sr-only" id="positions" aria-label="Vị trí các ngựa"></ul>
      </div>
      <div class="controls">
        <div class="dice-row">
          <div class="die" id="die" role="img"></div>
          <button class="btn lg roll" type="button" id="roll" aria-describedby="rollHelp"><span>Gieo xúc xắc</span><span class="sub" id="rollSub" aria-hidden="true">Giữ để lấy đà</span></button>
          <p class="roll-note" id="rollNote" hidden></p>
        </div>
        <span class="sr-only" id="rollHelp">Giữ Space để lấy đà rồi thả để gieo; Enter để gieo nhanh.</span>
        <p class="hint" id="hint" aria-live="polite"></p>
        <span class="last-roll" id="lastRoll" hidden></span>
        <div class="actions">
          <button class="btn secondary" type="button" id="undo">Hoàn tác</button>
          <button class="btn secondary" type="button" id="redo">Làm lại</button>
          <button class="btn primary" type="button" id="newGame">Ván mới</button>
        </div>
      </div>
    </main>
  </div>
  <div class="roll-overlay" id="overlay" aria-hidden="true">
    <svg class="power" id="power" viewBox="0 0 150 150"><circle class="track" cx="75" cy="75" r="66"/><circle class="fill" id="powerFill" cx="75" cy="75" r="66" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg>
    <div class="overlay-tip" id="tip">Giữ để lấy đà · thả tay để gieo</div>
    <div class="result-card" id="resultCard"><div class="num" id="resultNum"></div><div class="sub" id="resultSub"></div></div>
  </div>`;

  const $ = (id) => host.querySelector(`#${id}`);
  const el = {
    screen: $("screen"), turn: $("turn"), seats: $("seats"), boardBox: $("boardBox"),
    gBoard: $("gBoard"), gFloor: $("gFloor"), gPieces: $("gPieces"), gGhost: $("gGhost"),
    hits: $("hits"), positions: $("positions"), die: $("die"), roll: $("roll"),
    rollNote: $("rollNote"), hint: $("hint"), lastRoll: $("lastRoll"), undo: $("undo"),
    redo: $("redo"), newGame: $("newGame"), overlay: $("overlay"), power: $("power"),
    powerFill: $("powerFill"), tip: $("tip"), resultCard: $("resultCard"),
    resultNum: $("resultNum"), resultSub: $("resultSub"),
  };

  // ------------------------------------------------------------------ app state
  let state = scripted();
  let history = [];
  let future = [];
  let phase = "idle"; // idle | holding | throwing | walking | ai
  let preview = null;
  let walking = null; // { player, horse, x, y, hop }
  let kickedNow = null;
  let dieRolling = null; // face shown while the 2D die tumbles
  let lastBoardKey = "";
  const sim = { noWebGL: false, reduced: false, blur: true, showHits: false };
  let force = null;
  const facesRolled = [0, 0, 0, 0, 0, 0];
  let stage = null;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduced = () => sim.reduced || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const use3D = () => !sim.noWebGL && !reduced() && Dice3D.webglAvailable() && Dice3D.ready && stage !== null;

  function canRoll() {
    return phase === "idle" && state.die === null && state.winner === null;
  }

  // ------------------------------------------------------------------ render
  function render() {
    const p = state.toMove;
    const choices = phase === "idle" ? choicesOf(state) : [];
    const previewed = choices.find((c) => c.horse === preview) ?? null;

    el.turn.textContent = state.winner !== null ? `${NAME[state.winner]} thắng` : `Đến lượt ${NAME[p]}`;
    el.seats.innerHTML = state.horses
      .map(
        (hs, c) =>
          `<li class="seat" ${c === p ? "data-active" : ""}>${chipSvg(c)}<span class="who"><b>${NAME[c]}</b><small>${summary(hs)}</small></span>${c === p ? '<span class="badge-turn">Đến lượt</span>' : ""}</li>`,
      )
      .join("");

    const boardKey = `${p}`;
    if (boardKey !== lastBoardKey) {
      el.gBoard.innerHTML = boardDrawing(p);
      lastBoardKey = boardKey;
    }
    renderPieces(choices, previewed);
    renderHits(choices);

    // the die
    // the frame: the player to move (about to roll, rolling, or choosing)
    const dieColour = p;
    el.die.style.setProperty("--dl", `var(--piece-${COL[dieColour]}-line)`);
    const face = dieRolling ?? state.die;
    el.die.innerHTML = dieSvg(face);
    el.die.setAttribute("aria-label", face === null ? `Xúc xắc: ${NAME[p]} sắp gieo` : `Xúc xắc: ${face} (${NAME[dieColour]})`);

    // the roll button, in the colour of the player to move
    const n = COL[p];
    el.roll.style.setProperty("--rb", `var(--piece-${n})`);
    el.roll.style.setProperty("--rk", `var(--piece-${n}-ink)`);
    el.roll.style.setProperty("--rh", `var(--piece-${n}-hover)`);
    el.roll.setAttribute("aria-disabled", String(!canRoll() && phase !== "holding"));

    // hint
    let hint = "";
    const last = state.last;
    if (previewed) hint = `<b>${choiceLabel(previewed)}</b>`;
    else if (phase === "idle" && state.die !== null) hint = `${NAME[p]} gieo được ${state.die}. Chạm vào ngựa có vòng tròn để đi.`;
    else if (phase === "idle" && last && last.kind === "roll" && last.lost) hint = `${NAME[last.player]} gieo được ${last.face}. Không ngựa nào đi được, mất lượt.`;
    else if (phase === "idle" && last && last.kind === "roll" && last.again) hint = `${NAME[last.player]} gieo được 6 nhưng không ngựa nào đi được, gieo thêm.`;
    else if (phase === "idle" && last && last.kind === "move" && last.again) hint = `${NAME[last.player]} được gieo thêm.`;
    else if (phase === "ai") hint = `Máy (${NAME[p]}) đang gieo…`;
    el.hint.innerHTML = hint;
    host.querySelector("#rollSub").hidden = !use3D();

    if (last && state.die === null && phase === "idle" && dieRolling === null) {
      el.lastRoll.hidden = false;
      el.lastRoll.innerHTML = `${chipSvg(last.player, 14)}Lượt trước: ${NAME[last.player]} gieo được ${last.face}`;
    } else el.lastRoll.hidden = true;

    el.undo.setAttribute("aria-disabled", String(history.length === 0 || phase !== "idle"));
    el.redo.setAttribute("aria-disabled", String(future.length === 0 || phase !== "idle"));

    el.positions.innerHTML = state.horses
      .flatMap((hs, c) => hs.map((pr, h) => `<li>${NAME[c]}, ngựa ${h + 1}: ${placeOf(pr)}</li>`))
      .join("");
    window.__mock.dbg?.();
  }

  function renderPieces(choices, previewed) {
    const p = state.toMove;
    const last = state.last;
    let floor = "";
    const pieces = [];
    state.horses.forEach((hs, c) =>
      hs.forEach((pr, h) => {
        let pt = horsePoint(c, h, pr);
        let hop = 0;
        if (walking && walking.player === c && walking.horse === h) {
          pt = { x: walking.x, y: walking.y };
          hop = walking.hop;
        }
        const movable = c === p && choices.some((ch) => ch.horse === h);
        const isPreviewed = previewed && previewed.horse === h && c === p;
        const cy = pt.y + 0.33;
        if (last && last.kind === "move" && last.player === c && last.horse === h && !walking)
          floor += `<ellipse class="mark-last" cx="${pt.x}" cy="${cy}" rx="0.56" ry="0.24"/>`;
        if (last && last.kind === "move" && last.kicked && last.kicked.player === c && last.kicked.horse === h)
          floor += `<ellipse class="mark-kicked" cx="${pt.x}" cy="${cy}" rx="0.56" ry="0.24"/>`;
        if (movable) floor += `<ellipse class="ring-glow" style="${horseVars(c)}" cx="${pt.x}" cy="${cy}" rx="0.6" ry="0.26"/>`;
        if (movable) floor += `<ellipse class="ring-movable ${isPreviewed ? "strong" : ""}" cx="${pt.x}" cy="${cy}" rx="0.58" ry="0.24"/>`;
        if (previewed && previewed.kicked && previewed.kicked.player === c && previewed.kicked.horse === h)
          floor += `<ellipse class="mark-victim" cx="${pt.x}" cy="${cy}" rx="0.62" ry="0.27"/>`;
        let cls = "";
        if (movable) cls += " is-movable";
        if (isPreviewed) cls += " is-previewed";
        if (kickedNow && kickedNow.player === c && kickedNow.horse === h) cls += " kicked-now";
        pieces.push({ y: pt.y + (walking && walking.player === c && walking.horse === h ? 0.01 : 0), svg: horseSvg(c, pt.x, pt.y, { cls, hop, data: `data-colour="${COL[c]}" data-horse="${h}"` }) });
      }),
    );
    let ghost = "";
    if (previewed) {
      const t = horsePoint(p, previewed.horse, previewed.to);
      floor += `<rect class="target-frame" data-target x="${t.x - 0.45}" y="${t.y - 0.45}" width="0.9" height="0.9"/>`;
      ghost = horseSvg(p, t.x, t.y, { cls: "ghost" });
      if (previewed.kicked) {
        // the horse that would be kicked: a small ink badge with a cross, above it
        const v = horsePoint(previewed.kicked.player, previewed.kicked.horse, state.horses[previewed.kicked.player][previewed.kicked.horse]);
        const bx = v.x + 0.42;
        const by = v.y - 0.62;
        ghost += `<g class="kick-badge"><circle cx="${bx}" cy="${by}" r="0.22"/><path d="M${bx - 0.08} ${by - 0.08}L${bx + 0.08} ${by + 0.08}M${bx + 0.08} ${by - 0.08}L${bx - 0.08} ${by + 0.08}"/></g>`;
      }
    }
    pieces.sort((a, b) => a.y - b.y);
    el.gFloor.innerHTML = floor;
    el.gPieces.innerHTML = pieces.map((x) => x.svg).join("");
    el.gGhost.innerHTML = ghost;
  }

  // ------------------------------------------------------------------ hit targets
  let rovingIndex = 0;
  function renderHits(choices) {
    const p = state.toMove;
    const focusedHorse = document.activeElement && document.activeElement.classList.contains("hit") ? Number(document.activeElement.dataset.horse) : null;
    const key = choices.map((c) => `${c.horse}:${c.to}`).join(",") + `|${p}|${state.ply}`;
    if (el.hits.dataset.key === key) return;
    el.hits.dataset.key = key;
    el.hits.innerHTML = "";
    if (rovingIndex >= choices.length) rovingIndex = 0;
    choices.forEach((choice, index) => {
      const pt = horsePoint(p, choice.horse, choice.from);
      const b = document.createElement("button");
      b.type = "button";
      b.className = "hit";
      b.dataset.horse = String(choice.horse);
      b.dataset.ludoChoice = "";
      b.setAttribute("aria-label", choiceLabel(choice));
      b.tabIndex = index === rovingIndex ? 0 : -1;
      b.style.left = `${(pt.x / GRID) * 100}%`;
      b.style.top = `${((pt.y - 0.3) / GRID) * 100}%`;
      el.hits.appendChild(b);
    });
    if (focusedHorse !== null) el.hits.querySelector(`[data-horse="${focusedHorse}"]`)?.focus({ preventScroll: true });
    sizeHits();
  }
  function sizeHits() {
    const cell = el.boardBox.clientWidth / GRID;
    el.hits.style.setProperty("--hit", `${Math.max(30, cell * 1.25)}px`);
  }
  new ResizeObserver(sizeHits).observe(el.boardBox);

  /** Nearest-centre wins where hit targets overlap. */
  function nearestAt(x, y) {
    let best = null;
    let bestD = Infinity;
    for (const b of el.hits.querySelectorAll(".hit")) {
      const r = b.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
      const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
      if (d < bestD) {
        bestD = d;
        best = Number(b.dataset.horse);
      }
    }
    return best;
  }
  function setPreview(h) {
    if (preview === h) return;
    preview = h;
    render();
  }
  el.hits.addEventListener("click", (e) => {
    const b = e.target.closest(".hit");
    if (!b) return;
    let h = Number(b.dataset.horse);
    if (e.detail > 0) h = nearestAt(e.clientX, e.clientY) ?? h;
    choose(h);
  });
  el.hits.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    setPreview(nearestAt(e.clientX, e.clientY));
  });
  el.hits.addEventListener("pointerleave", () => {
    const f = document.activeElement;
    setPreview(f && f.classList.contains("hit") && f.matches(":focus-visible") ? Number(f.dataset.horse) : null);
  });
  el.hits.addEventListener("focusin", (e) => {
    const b = e.target.closest(".hit");
    if (!b) return;
    rovingIndex = [...el.hits.children].indexOf(b);
    [...el.hits.children].forEach((x, i) => (x.tabIndex = i === rovingIndex ? 0 : -1));
    if (b.matches(":focus-visible")) setPreview(Number(b.dataset.horse));
  });
  el.hits.addEventListener("focusout", () => {
    setTimeout(() => {
      if (!el.hits.contains(document.activeElement)) setPreview(null);
    });
  });
  el.hits.addEventListener("keydown", (e) => {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (!(e.key in keys) && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const buttons = [...el.hits.children];
    let i = buttons.indexOf(document.activeElement);
    if (e.key === "Home") i = 0;
    else if (e.key === "End") i = buttons.length - 1;
    else i = (i + keys[e.key] + buttons.length) % buttons.length;
    buttons[i]?.focus();
  });

  // ------------------------------------------------------------------ moves
  function pathOf(c, h, from, to) {
    const pts = [];
    if (from === IN_STABLE) pts.push(stableSlot(c, h), horsePoint(c, h, 0));
    else if (from === OWN_GATE) {
      pts.push(horsePoint(c, h, from));
      for (let s = OWN_GATE + 1; s <= to; s += 1) pts.push(horsePoint(c, h, s));
    } else for (let pr = from; pr <= to; pr += 1) pts.push(horsePoint(c, h, pr));
    return pts;
  }

  async function choose(h) {
    if (phase !== "idle" || state.die === null) return;
    const choice = choicesOf(state).find((c) => c.horse === h);
    if (!choice) return;
    phase = "walking";
    preview = null;
    el.roll.focus({ preventScroll: true });
    const p = state.toMove;
    if (!reduced()) {
      const pts = pathOf(p, h, choice.from, choice.to);
      const STEP = 60;
      for (let i = 1; i < pts.length; i += 1) {
        const a = pts[i - 1];
        const b = pts[i];
        const t0 = performance.now();
        await new Promise((resolve) => {
          const frame = (now) => {
            const f = Math.min(1, (now - t0) / STEP);
            walking = { player: p, horse: h, x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, hop: Math.sin(Math.PI * f) * 0.28 };
            render();
            if (f < 1) requestAnimationFrame(frame);
            else resolve();
          };
          requestAnimationFrame(frame);
        });
      }
    }
    walking = null;
    history.push(state);
    future = [];
    state = applyMove(state, h);
    if (state.last.kicked) {
      kickedNow = { player: state.last.kicked.player, horse: state.last.kicked.horse };
      setTimeout(() => {
        kickedNow = null;
        render();
      }, 320);
    }
    phase = "idle";
    render();
  }

  // ------------------------------------------------------------------ number source (server)
  function requestNumber() {
    const t0 = performance.now();
    const forced = force;
    force = null;
    window.__mock.onForce?.();
    return new Promise((resolve) =>
      setTimeout(() => {
        let n = forced;
        if (n === null) {
          const a = new Uint32Array(1);
          const limit = Math.floor(0x100000000 / 6) * 6;
          do crypto.getRandomValues(a);
          while (a[0] >= limit);
          n = (a[0] % 6) + 1;
        }
        const at = performance.now();
        resolve({ n, at, latency: at - t0 });
      }, 80),
    );
  }

  function commitRoll(n) {
    facesRolled[n - 1] += 1;
    history.push(state);
    future = [];
    state = applyRoll(state, n);
    phase = "idle";
    el.die.classList.remove("landed");
    void el.die.offsetWidth;
    if (!reduced()) el.die.classList.add("landed");
    render();
    const first = el.hits.querySelector(".hit");
    if (first) first.focus({ preventScroll: true });
  }

  // ------------------------------------------------------------------ the throw
  const timings = { holdMs: null, latencyMs: null, flightMs: null, afterNumberMs: null, fpsAvg: null, fpsMin: null, planMs: null, tries: null, check: null, mode: "—" };
  let holdStart = 0;
  let ringRaf = 0;
  let justHandledAt = 0;

  function cssColours() {
    const cs = getComputedStyle(el.screen);
    const v = (n) => cs.getPropertyValue(n).trim();
    return { body: v("--game-board"), line: v(`--piece-${COL[state.toMove]}-line`), pip: v("--fg"), shadow: Number(v("--mock-die-shadow")) || 0.3 };
  }

  function startHold() {
    if (!canRoll()) return;
    if (!use3D()) return; // fallback rolls on release
    phase = "holding";
    holdStart = performance.now();
    el.roll.classList.add("held");
    el.overlay.style.setProperty("--dl", `var(--piece-${COL[state.toMove]}-line)`);
    el.overlay.classList.toggle("no-blur", !sim.blur);
    el.resultCard.classList.remove("show");
    stage.beginHold(cssColours());
    const pt = stage.holdScreenPoint();
    el.power.style.left = `${pt.x}px`;
    el.power.style.top = `${pt.y}px`;
    el.power.style.opacity = "1";
    el.tip.style.opacity = "1";
    el.overlay.classList.add("open");
    const ring = () => {
      el.powerFill.style.strokeDashoffset = String(1 - stage.power());
      if (phase === "holding") ringRaf = requestAnimationFrame(ring);
    };
    ring();
    render();
  }

  async function release() {
    if (phase === "idle" && canRoll() && !use3D()) return fallbackRoll();
    if (phase !== "holding") return;
    phase = "throwing";
    cancelAnimationFrame(ringRaf);
    el.roll.classList.remove("held");
    el.power.style.opacity = "0";
    el.tip.style.opacity = "0";
    const numberPromise = requestNumber();
    const info = await stage.release(numberPromise);
    // rest: the number, big, with what it means
    const n = info.n;
    const lost = movableCount(state, n) === 0 && n !== 6;
    el.resultNum.textContent = String(n);
    el.resultSub.textContent = n === 6 ? "Được gieo thêm" : lost ? "Mất lượt" : "";
    // the card goes above the die, or below it when the die rests high on the screen
    const d = stage.dieScreen();
    const above = d.y > el.overlay.clientHeight * 0.42;
    el.resultCard.style.setProperty("--card-y", `${above ? d.y - d.r - 16 : d.y + d.r + 16}px`);
    el.resultCard.style.setProperty("--card-shift", above ? "-100%" : "0");
    el.resultCard.classList.add("show");
    await sleep(500);
    // debug only (screenshots): keep the result card until told to go on; not counted in timings
    let paused = 0;
    if (window.__pauseResult) {
      const p0 = performance.now();
      await new Promise((r) => (window.__continue = r));
      paused = performance.now() - p0;
    }
    el.resultCard.classList.remove("show");
    el.overlay.classList.remove("open");
    await sleep(150);
    stage.hide();
    const closedAt = performance.now();
    Object.assign(timings, {
      mode: "3D",
      holdMs: info.holdMs,
      latencyMs: info.latencyMs,
      liftMs: info.liftMs,
      flightMs: info.flightMs,
      physMs: info.physMs,
      afterNumberMs: closedAt - info.numberAt - paused,
      fpsAvg: info.fpsAvg,
      fpsMin: info.fpsMin,
      planMs: info.planMs,
      tries: info.tries,
      check: { n, top: info.top, ok: info.ok },
    });
    window.__mock.throws.push({ ...timings });
    commitRoll(n);
  }

  async function quickThrow() {
    if (!canRoll()) return;
    if (!use3D()) return fallbackRoll();
    startHold();
    await sleep(16);
    release();
  }

  /** Today's behaviour: no overlay; the small die tumbles (or not, with reduced motion). */
  async function fallbackRoll(byMachine = false) {
    if (!canRoll()) return;
    phase = byMachine ? "ai" : "throwing";
    render();
    const { n, at, latency } = await requestNumber();
    if (!reduced()) {
      el.die.classList.remove("landed");
      el.die.classList.add("rolling");
      const t0 = performance.now();
      while (performance.now() - t0 < 450) {
        dieRolling = 1 + Math.floor(Math.random() * 6);
        render();
        await sleep(75);
      }
      dieRolling = null;
      el.die.classList.remove("rolling");
    }
    Object.assign(timings, { mode: byMachine ? "Máy (2D)" : reduced() ? "Giảm chuyển động" : "Không WebGL (2D)", holdMs: null, latencyMs: latency, flightMs: null, afterNumberMs: performance.now() - at, fpsAvg: null, fpsMin: null, check: { n, top: n, ok: true } });
    commitRoll(n);
  }

  async function machineTurn() {
    if (!canRoll()) return;
    await fallbackRoll(true);
    const choices = choicesOf(state);
    if (choices.length === 0) return;
    phase = "ai";
    render();
    await sleep(500);
    const pick = choices.find((c) => c.kicked) ?? choices.reduce((a, b) => (b.to > a.to ? b : a));
    phase = "idle";
    choose(pick.horse);
  }

  // roll button: pointer hold, Space hold, Enter quick throw, AT click quick throw
  function showRollNote() {
    if (state.die !== null && phase === "idle") {
      el.rollNote.textContent = "Chọn ngựa trước";
      el.rollNote.hidden = false;
      setTimeout(() => (el.rollNote.hidden = true), 1600);
    }
  }
  el.roll.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    if (!canRoll()) return showRollNote();
    e.preventDefault();
    el.roll.setPointerCapture(e.pointerId);
    justHandledAt = performance.now();
    if (use3D()) startHold();
    else el.roll.dataset.pressed = "1";
  });
  const pointerEnd = () => {
    justHandledAt = performance.now();
    if (phase === "holding") release();
    else if (el.roll.dataset.pressed) {
      delete el.roll.dataset.pressed;
      fallbackRoll();
    }
  };
  el.roll.addEventListener("pointerup", pointerEnd);
  el.roll.addEventListener("pointercancel", pointerEnd);
  el.roll.addEventListener("keydown", (e) => {
    if (e.key === " ") {
      e.preventDefault();
      if (e.repeat) return;
      justHandledAt = performance.now();
      if (!canRoll()) return showRollNote();
      if (use3D()) startHold();
    } else if (e.key === "Enter") {
      e.preventDefault();
      justHandledAt = performance.now();
      if (!canRoll()) return showRollNote();
      quickThrow();
    }
  });
  el.roll.addEventListener("keyup", (e) => {
    if (e.key !== " ") return;
    e.preventDefault();
    justHandledAt = performance.now();
    if (phase === "holding") release();
    else if (canRoll() && !use3D()) fallbackRoll();
  });
  el.roll.addEventListener("click", () => {
    if (performance.now() - justHandledAt < 500) return;
    quickThrow();
  });

  el.undo.addEventListener("click", () => {
    if (phase !== "idle" || history.length === 0) return;
    future.push(state);
    state = history.pop();
    render();
  });
  el.redo.addEventListener("click", () => {
    if (phase !== "idle" || future.length === 0) return;
    history.push(state);
    state = future.pop();
    render();
  });
  el.newGame.addEventListener("click", () => {
    if (phase !== "idle") return;
    state = scripted();
    history = [];
    future = [];
    render();
  });

  // ------------------------------------------------------------------ public (mockup chrome)
  window.__mock = {
    host,
    render,
    sim,
    timings,
    facesRolled,
    throws: [],
    get state() {
      return state;
    },
    get phase() {
      return phase;
    },
    setForce(n) {
      force = n;
    },
    get force() {
      return force;
    },
    machineTurn,
    quickThrow,
    reset() {
      state = scripted();
      history = [];
      future = [];
      phase = "idle";
      preview = null;
      render();
    },
    choose,
    setPreview,
    get stage() {
      return stage;
    },
    async init3D() {
      if (!Dice3D.webglAvailable()) return false;
      await Dice3D.load();
      stage = Dice3D.createStage(el.overlay);
      return true;
    },
    resize() {
      stage?.resize();
      sizeHits();
    },
    horseSvg,
    boardDrawing,
    COL,
  };
})();
