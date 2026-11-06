/* The mockup: plain script, no build. Rules in rules.js, drawings in draw.js, positions in scenes.js. */
(function () {
  "use strict";
  const R = window.FenceRules, D = window.FenceDraw;
  const { SCENES } = window.FenceScenes;
  const { SEATS } = D;

  const ICON = {
    back: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    book: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
    monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    rotate: '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
    trophy: '<path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"/><path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"/><path d="M18 9h1.5a1 1 0 0 0 0-5H18"/><path d="M18 9a6 6 0 0 1-12 0V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1z"/><path d="M6 9H4.5a1 1 0 0 1 0-5H6"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  };
  const icon = (name) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;

  const VPS = {
    "360x740": { w: 360, h: 740, layout: "phone", label: "360 × 740" },
    "360x640": { w: 360, h: 640, layout: "phone", label: "360 × 640" },
    "390x844": { w: 390, h: 844, layout: "phone", label: "390 × 844" },
    "844x390": { w: 844, h: 390, layout: "land", label: "844 × 390 ngang" },
    "740x360": { w: 740, h: 360, layout: "land", label: "740 × 360 ngang" },
    "844x300": { w: 844, h: 300, layout: "land", label: "844 × 300 ngang, có thanh trình duyệt" },
    "1280x800": { w: 1280, h: 800, layout: "desk", label: "1280 × 800" },
  };

  const S = {
    scene: "move2", vp: "360x740", theme: "light", reduced: false, finger: false, colourNames: false,
    dragMode: "keep", // keep | nearest | nodrag
    g: null, hist: [], redo: [], mode: "move", preview: null, sel: null, cursor: null, tried: null,
    showPath: false, sending: false, geo: null, scrollTopAtOpen: 0,
  };
  const $ = (sel, root) => (root || document).querySelector(sel);
  const screen = $("#screen"), device = $("#device"), wrap = $("#deviceWrap");
  const qs = new URLSearchParams(location.search);
  const bare = qs.has("bare");
  if (bare) document.documentElement.setAttribute("data-bare", "");

  const scene = () => SCENES.find((s) => s.id === S.scene);
  const vp = () => VPS[S.vp];
  const viewer = () => { const s = scene(); return s.viewer === undefined ? null : s.viewer; };
  const online = () => Boolean(scene().online);

  const colourWord = (seat) => SEATS[seat].label;
  const nameOf = (seat) => {
    const s = scene();
    if (viewer() === seat) return "Bạn";
    if (S.colourNames && !online()) return colourWord(seat);
    return s.names ? s.names[seat] : colourWord(seat);
  };
  const seatTitle = (seat) => {
    if (viewer() === seat) return `Bạn · ${colourWord(seat)}`;
    if (S.colourNames && !online()) return colourWord(seat);
    return `${scene().names[seat]} · ${colourWord(seat)}`;
  };

  /* What players read about a fence: the cells it stands between, never "ngang" or "dọc". */
  function fenceWords(f, cap) {
    const L = R.LETTERS;
    const text = f.o === "h"
      ? `rào giữa hàng ${f.y + 1} và ${f.y + 2}, cột ${L[f.x]}–${L[f.x + 1]}`
      : `rào giữa cột ${L[f.x]} và ${L[f.x + 1]}, hàng ${f.y + 1}–${f.y + 2}`;
    return cap ? text[0].toUpperCase() + text.slice(1) : text;
  }
  function moveWords(last) {
    if (last.kind === "step") return `đi tới ${R.cellName(last.to.x, last.to.y)}`;
    if (last.kind === "fence") return `đặt ${fenceWords(last.fence)}`;
    return `phá ${fenceWords(last.fence)}`;
  }

  const canAct = () => {
    const g = S.g, v = viewer();
    return !g.result && !S.sending && (v === null || g.turn === v);
  };
  const actor = () => S.g.turn;

  function modeOff(mode) {
    const g = S.g, seat = actor();
    if (g.result) return "Ván đã kết thúc";
    if (!canAct() && !S.sending) return `Đang chờ ${nameOf(g.turn)}`;
    if (S.sending) return "Đang gửi…";
    if (mode === "place" && g.left[seat] <= 0) return "Đã hết rào";
    if (mode === "break" && g.breaks[seat] <= 0) return "Đã phá rào";
    if (mode === "break" && g.walls.length === 0) return "Chưa có rào";
    return null;
  }

  /* ── Sizing: the board's height from what the screen must also show, as the real board will do it
     with `dvh` and the known heights around it. ── */
  function reservedHeights() {
    const v = vp(), seats = S.g.n, on = online();
    const over = S.g.result;
    // The result card replaces the turn line: its words decide its height (a draw has one more line).
    const statusH = over ? (over.kind === "draw" ? 224 : 188) : viewer() === null ? 20 : 40;
    const panelH = seats * 42 + (seats - 1) * 8 + (on ? 18 : 0);
    const above = 57 + 16 + (on ? 26 + 8 + 20 + 8 : 0) + statusH + 16 + panelH + 16;
    // Under the board: the line, the row of buttons, and what must show besides: "Ván mới" on this
    // device (spec accessibility). Online, Chat and Đầu hàng are a scroll away at 360 px.
    const below = over ? 16 + 44 + 16 : 6 + 36 + 6 + 44 + (on ? 0 : 12 + 44) + 8;
    return { above, below, status: statusH, panel: panelH, avail: v.h - above - below };
  }

  function boardMetrics() {
    const v = vp(), g = S.g;
    const rows = g.rows, cols = g.cols;
    if (v.layout === "desk") {
      const room = Math.min(v.w - 544, v.h - 64 - 96);
      const c = Math.round((room / (rows + 0.92)) * 10) / 10;
      return { c, gx: Math.round(c * 0.46), gy: Math.round(c * 0.46) };
    }
    if (v.layout === "land") {
      const room = Math.min(v.w - 352, v.h - 48 - 16);
      const gut = 14;
      const c = Math.floor(((room - 2 * gut) / rows) * 10) / 10;
      return { c, gx: gut, gy: gut };
    }
    const gut = 16, room = v.w - 32;
    const widthC = (room - 2 * gut) / cols;
    const hC = (reservedHeights().avail - 2 * gut) / rows;
    // Short screens may scroll (the spec's 360 × 640), so the cells stay a size; at 360 × 740 and up
    // everything must fit, and the board takes what is left, small cells reaching out for a touch.
    const floor = v.h < 700 ? (rows === 11 ? 26 : 25) : 21;
    const c = Math.floor(Math.max(Math.min(widthC, hC), floor) * 10) / 10;
    return { c, gx: gut, gy: gut };
  }

  /* ── The parts around the board, as in the real app. ── */
  function topBar(title, withRules) {
    const f = vp();
    return `<header class="topbar"><div class="topbar-in">
      <button type="button" class="tb-back" aria-label="Về menu">${icon("back")}<span class="${f.layout === "phone" ? "sr-only" : ""}">Về menu</span></button>
      <div class="topbar-title"><h1>${title}</h1></div>
      <div class="topbar-end">
        ${withRules ? `<button type="button" class="tb-btn ink tb-rules" aria-label="Luật chơi" data-open-rules>${icon("book")}<span>Luật chơi</span></button>` : ""}
        <button type="button" class="tb-btn" aria-label="Giao diện">${icon("monitor")}</button>
        <button type="button" class="tb-btn loc" aria-label="Ngôn ngữ">${icon("globe")}VI</button>
      </div></div></header>`;
  }

  function statusHtml() {
    const g = S.g, v = viewer();
    if (g.result) {
      const r = g.result;
      let title, detail;
      if (r.kind === "draw") {
        title = "Hoà";
        detail = `Hết ${R.turnLimit(g.n)} nước, ${r.tied.map(nameOf).join(" và ")} cùng còn ${r.steps[r.tied[0]]} bước về đích.`;
      } else {
        const w = r.winners[0];
        title = v === w ? "Bạn thắng!" : `${nameOf(w)} thắng!`;
        detail = r.reason === "goal"
          ? `${nameOf(w)} về đích ở ô ${r.at} sau ${r.ply} nước.`
          : `${nameOf(w)} gần đích hơn khi hết ${R.turnLimit(g.n)} nước: còn ${r.steps[w]} bước, ${g.pieces.map((_, s) => s).filter((s) => s !== w).map((s) => `${nameOf(s)} còn ${r.steps[s]}`).join(", ")}.`;
      }
      return `<div class="a-status result"><span class="badge badge-celebration">${icon("trophy")}Kết thúc</span><p class="result-title" role="status">${title}</p><p class="result-detail">${detail}</p><button type="button" class="btn btn-primary" data-newgame>${online() ? "Chơi lại" : "Ván mới"}</button></div>`;
    }
    return `<div class="a-status ${v === null ? "" : "two"}" data-status-box><p role="status" id="statusText"></p></div>`;
  }

  function statusText() {
    const g = S.g, v = viewer();
    if (g.result) return "";
    if (v === null) return `Đến lượt ${nameOf(g.turn)}`;
    const by = g.last && g.last.seat !== v ? `${nameOf(g.last.seat)} vừa ${moveWords(g.last)}. ` : "";
    if (g.turn === v) return `${by}Đến lượt bạn (${colourWord(v)})`;
    return `${by}Đang chờ ${nameOf(g.turn)}…`;
  }

  /* A seat's line: 5 rào · phá · 7 bước. Short enough for a phone's tile; the same at every width. */
  const summary = (seat) => {
    const g = S.g;
    const steps = R.shortestPath(g, seat).steps;
    return `${g.left[seat]} rào · ${g.breaks[seat] > 0 ? "phá" : "đã phá"} · ${steps} bước`;
  };
  function seatsHtml() {
    const g = S.g, v = viewer();
    const rows = g.pieces.map((_, seat) => {
      const turn = !g.result && g.turn === seat;
      const won = g.result && g.result.kind === "win" && g.result.winners.includes(seat);
      const conn = online() && seat === v ? `<span class="badge badge-success"><span class="dot"></span>Đã kết nối</span>` : "";
      const kind = online() && seat !== v ? "Chơi từ xa · " : "";
      const here = vp().layout === "desk" && !online() ? "Ở máy này · " : "";
      return `<li class="seat ${turn ? "turn" : ""}" data-player="${seat}"><span class="seat-mark">${D.seatMark(seat)}</span><span class="seat-body"><span class="seat-name">${seatTitle(seat)}</span><span class="seat-line">${turn ? '<span class="badge badge-ink turn-chip">Đến lượt</span>' : ""}${won ? '<span class="badge badge-celebration turn-chip">Thắng</span>' : ""}${conn}<span class="seat-words">${here}${kind}${summary(seat)}</span></span></span></li>`;
    }).join("");
    return `<ul class="a-players seats" ${g.n > 2 ? "data-many" : ""} ${online() ? "data-online" : ""} style="--seats:${g.n}" aria-label="Người chơi" id="seats">${rows}</ul>`;
  }

  function actionsHtml() {
    const over = S.g.result;
    if (online()) {
      return `<div class="a-actions"><div class="actions"><button type="button" class="btn btn-secondary" id="chatBtn">${icon("chat")}Chat</button>${over ? "" : `<button type="button" class="btn btn-secondary" data-resign>${icon("flag")}Đầu hàng</button>`}</div></div>`;
    }
    return `<div class="a-actions"><div class="actions">
      <button type="button" class="btn btn-secondary" id="undoBtn" aria-disabled="${S.hist.length === 0}">Hoàn tác</button>
      <button type="button" class="btn btn-secondary" id="redoBtn" aria-disabled="${S.redo.length === 0}">Làm lại</button>
      ${over ? "" : '<button type="button" class="btn btn-primary" data-newgame>Ván mới</button>'}
    </div></div>`;
  }

  function controlsHtml() {
    return `<div class="a-notes" id="notesLine" aria-live="polite"></div>
    <div class="ctl" id="ctl">
      <div class="ctl-row" id="modeRow" role="group" aria-label="Chế độ">
        ${[["move", "Đi quân"], ["place", "Đặt rào"], ["break", "Phá rào"]].map(([m, name]) => `<button type="button" class="mode" data-mode-btn="${m}" aria-pressed="false"><span class="mode-name">${name}</span><span class="mode-sub"></span></button>`).join("")}
      </div>
      <div class="ctl-row" id="actRow" hidden>
        <button type="button" class="tool" id="rotBtn">${icon("rotate")}Xoay</button>
        <button type="button" class="tool" id="cancelBtn">Huỷ</button>
        <button type="button" class="btn btn-primary confirm" id="confirmBtn">Đặt rào</button>
      </div>
    </div>`;
  }

  function playHtml() {
    const on = online(), over = S.g.result;
    return `<div class="${on ? "a-chips" : "a-none"}">${on ? '<span class="badge badge-accent">Online</span>' : ""}</div>
      ${on ? '<div class="a-notice" id="notice"></div>' : ""}
      ${statusHtml()}
      ${seatsHtml()}
      <div class="board-slot" id="boardSlot"><div class="board" id="board" data-mode="move" tabindex="-1" aria-label="Bàn Cờ rào"></div></div>
      ${over ? "" : controlsHtml()}
      ${actionsHtml()}`;
  }

  /* ── The board. Static layer, then what the game shows, then what is being tried. ── */
  function drawBoard() {
    const g = S.g;
    const m = boardMetrics();
    const s = scene();
    const v = viewer();
    // Two players: the second seat turns the board 180°. Three or four: it stays (spec "Bàn quay").
    const rot = v === null ? 0 : g.n === 2 || s.rot90 ? D.ROT_FOR_EDGE[g.edges[v]] : 0;
    const G = D.geom({ rows: g.rows, cols: g.cols, rot, c: m.c, gx: m.gx, gy: m.gy });
    S.geo = G;
    const el = $("#board");
    el.style.width = G.W + "px";
    el.style.height = G.H + "px";
    el.innerHTML = `<svg class="field" width="${G.W}" height="${G.H}" viewBox="0 0 ${G.W} ${G.H}" aria-hidden="true">${D.fields(G, "f")}<g id="edges"></g><g id="dyn"></g><g id="ovl"></g></svg><div class="cells" id="cells"></div>`;
    // Every cell a button, as big as the cell. Where that is under 24 px, a cell the piece can step
    // to reaches outwards past its own edge (away from the piece, so targets do not cover each other).
    let cells = "";
    for (let y = 0; y < g.rows; y++) {
      for (let x = 0; x < g.cols; x++) {
        const [cx, cy] = G.center(x, y);
        cells += `<button type="button" class="cell" data-x="${x}" data-y="${y}" tabindex="-1" style="left:${cx - G.c / 2}px;top:${cy - G.c / 2}px;width:${G.c}px;height:${G.c}px"></button>`;
      }
    }
    $("#cells").innerHTML = cells;
  }

  function currentPaths() {
    const g = S.g;
    const out = [];
    const extra = S.mode === "place" && S.preview && !R.fenceProblem(g, S.preview, actor()) ? S.preview : null;
    const without = S.mode === "break" && S.sel ? S.sel : null;
    const walls = extra ? g.walls.concat([extra]) : without ? g.walls.filter((w) => !(w.o === without.o && w.x === without.x && w.y === without.y)) : g.walls;
    const before = R.stepsOf(g);
    g.pieces.forEach((_, seat) => {
      const p = R.shortestPath(g, seat, walls);
      if (S.showPath || (p.steps !== before[seat] && (extra || without))) out.push([seat, p.path]);
    });
    return out;
  }

  function drawDyn() {
    const g = S.g, G = S.geo;
    const active = g.result ? (g.result.kind === "win" ? g.result.winners[0] : null) : g.turn;
    $("#edges").innerHTML = D.edges(g, G, { active });
    let s = "";
    const last = g.last;
    if (last && last.kind === "step" && !g.result) s += D.leftMark(G, last.from.x, last.from.y);
    if (last && last.kind === "break") s += D.wallGone(G, last.fence);
    for (const [seat, path] of currentPaths()) s += D.pathLine(G, seat, path);
    const showTargets = S.mode === "move" && canAct();
    const steps = showTargets ? R.legalSteps(g, actor()) : [];
    const byCell = new Map();
    g.pieces.forEach((p, seat) => { const k = `${p.x},${p.y}`; (byCell.get(k) || byCell.set(k, []).get(k)).push(seat); });
    for (const c of steps) s += D.targetMark(G, c.x, c.y, byCell.has(`${c.x},${c.y}`));
    for (const w of g.walls) {
      if (S.mode === "break" && S.sel && w.o === S.sel.o && w.x === S.sel.x && w.y === S.sel.y) continue;
      const just = last && last.kind === "fence" && last.fence.o === w.o && last.fence.x === w.x && last.fence.y === w.y;
      s += D.wall(G, w, { just });
    }
    // The end of the game on the board: the cell reached, framed, and the winner.
    if (g.result && g.result.kind === "win") {
      const w = g.result.winners[0];
      const p = g.pieces[w];
      if (g.result.reason === "goal") s += D.goalMark(G, p.x, p.y);
    }
    for (const [k, seats] of byCell) {
      const [x, y] = k.split(",").map(Number);
      const turnSeat = !g.result && seats.includes(g.turn) ? g.turn : null;
      if (seats.length > 1 && turnSeat !== null) s += D.shareFrame(G, x, y);
      const winner = g.result && g.result.kind === "win" ? g.result.winners[0] : null;
      s += D.hatsInCell(G, seats, x, y, winner !== null && seats.includes(winner) ? winner : turnSeat, (seat) => `data-piece="${seat}"`);
    }
    $("#dyn").innerHTML = s;
    drawOvl();
    syncCells(steps, byCell);
  }

  function drawOvl() {
    const g = S.g, G = S.geo;
    let s = "";
    if (S.mode === "place" && S.preview) {
      s += R.fenceProblem(g, S.preview, actor()) ? D.previewBad(G, S.preview) : D.previewOk(G, S.preview);
    }
    if (S.mode === "break" && S.sel) s += D.wallChosen(G, S.sel);
    $("#ovl").innerHTML = s;
  }

  function syncCells(steps, byCell) {
    const g = S.g, G = S.geo;
    const board = $("#board");
    board.dataset.mode = g.result || !canAct() ? "locked" : S.mode;
    board.dataset.drag = S.dragMode;
    const moveOn = S.mode === "move" && canAct();
    if (!S.cursor) S.cursor = { ...g.pieces[viewer() === null ? g.turn : viewer()] };
    const tiny = G.c < 26;
    const closed = R.closedSteps(g.walls);
    const piece = g.pieces[actor()];
    document.querySelectorAll("#cells .cell").forEach((b) => {
      const x = +b.dataset.x, y = +b.dataset.y;
      const can = steps.some((c) => c.x === x && c.y === y);
      b.classList.toggle("can", can);
      const here = byCell.get(`${x},${y}`);
      const who = here ? `, có quân ${here.map(nameOf).join(", ")}` : "";
      const gateOf = g.pieces.map((_, seat) => seat).filter((seat) => R.onGoal(g, seat, x, y));
      const gateWords = gateOf.length ? `, cổng đích của ${gateOf.map(nameOf).join(", ")}` : "";
      const sides = [[0, 1, "phía trên"], [0, -1, "phía dưới"], [-1, 0, "bên trái"], [1, 0, "bên phải"]]
        .filter(([dx, dy]) => closed.has(`${x},${y},${x + dx},${y + dy}`)).map(([, , w]) => w);
      const fenced = sides.length ? `, rào ${sides.join(", ")}` : "";
      b.setAttribute("aria-label", `Ô ${R.cellName(x, y)}${who}${gateWords}${fenced}${can ? ", đi tới đây" : ""}`);
      b.setAttribute("aria-disabled", String(!can));
      b.tabIndex = moveOn && S.cursor.x === x && S.cursor.y === y ? 0 : -1;
      // A small cell the piece can step to reaches outwards: at least 24 × 28 px, away from the piece.
      const [cx, cy] = G.center(x, y);
      let [w, h, ox, oy] = [G.c, G.c, 0, 0];
      if (can && tiny) {
        const [px, py] = G.center(piece.x, piece.y);
        const dx = Math.sign(Math.round(cx - px)), dy = Math.sign(Math.round(cy - py));
        const long = 28, wide = 24;
        w = dx !== 0 ? long : wide;
        h = dy !== 0 ? long : wide;
        ox = (dx * (long - G.c)) / 2;
        oy = (dy * (long - G.c)) / 2;
      }
      b.style.left = cx - w / 2 + ox + "px";
      b.style.top = cy - h / 2 + oy + "px";
      b.style.width = w + "px";
      b.style.height = h + "px";
      b.style.zIndex = can ? 2 : "";
    });
    board.tabIndex = (S.mode === "place" || S.mode === "break") && canAct() ? 0 : -1;
  }

  /* ── The line under the board and the row of buttons. ── */
  function effectLine(walls, verbNone) {
    const g = S.g;
    const before = R.stepsOf(g), after = R.stepsOf(g, walls);
    const changed = g.pieces.map((_, s) => s).filter((s) => before[s] !== after[s]);
    if (changed.length === 0) return verbNone;
    return changed.map((s) => `${nameOf(s)}: ${before[s]} → ${after[s]} bước`).join(", ");
  }
  function problemWords(why) {
    if (why.code === "overlap") return `Đè lên ${fenceWords(why.wall)}`;
    if (why.code === "cross") return `Cắt ngang ${fenceWords(why.wall)}`;
    if (why.code === "sealed") return `Bịt kín đường của ${why.seats.map(nameOf).join(", ")}`;
    if (why.code === "none-left") return "Đã hết rào";
    return "Không đặt được";
  }
  function goalSentence(seat) {
    const seen = S.geo.edge(S.g.goals[seat]);
    const side = { top: "trên", bottom: "dưới", left: "trái", right: "phải" }[seen];
    return `Về cổng màu ${colourWord(seat).toLowerCase()} ${SEATS[seat].sym} ở cạnh ${side} trước mọi người.`;
  }
  function notesContent() {
    const g = S.g;
    const seat = actor();
    if (g.result) return null;
    if (S.sending) return { main: "Đang gửi…", sub: S.last2 ? `${fenceWords(S.last2, true)}.` : "" };
    if (!canAct()) {
      return { main: `Đang chờ ${nameOf(g.turn)}.`, sub: "Tới lượt bạn mới chọn được việc." };
    }
    if (S.tried) return { main: S.tried, bad: true, sub: "Chọn việc khác cho lượt này." };
    if (S.mode === "place") {
      if (!S.preview) return { main: "Chạm lên bàn, gần đường kẻ muốn chặn.", sub: S.dragMode === "nodrag" ? "Chạm nơi khác để dời, nút Xoay để đổi hướng." : "Kéo để dời, chạm lại đúng rào để xoay." };
      const why = R.fenceProblem(g, S.preview, seat);
      if (why) return { main: problemWords(why), bad: true, sub: `${fenceWords(S.preview, true)}.` };
      return { main: effectLine(g.walls.concat([S.preview]), "Không ai phải đi xa hơn."), sub: `${fenceWords(S.preview, true)}.` };
    }
    if (S.mode === "break") {
      if (!S.sel) return { main: "Chạm gần rào muốn phá.", sub: "Mỗi người phá một lần, rào của ai cũng được." };
      const f = S.sel;
      const walls = g.walls.filter((w) => !(w.o === f.o && w.x === f.x && w.y === f.y));
      return { main: effectLine(walls, "Không ai ngắn đường hơn."), sub: `${fenceWords(f, true)}.` };
    }
    // Đi quân.
    const v = viewer();
    const hint = "Chạm ô có chấm để đi một ô.";
    if (g.ply < g.n) return { main: goalSentence(seat), sub: hint };
    if (g.last && v === null) {
      const said = `${nameOf(g.last.seat)} vừa ${moveWords(g.last)}.`;
      // Long words (a seat named by its colour) take both lines, the hint then gives way.
      return said.length > 44 ? { main: said, sub: "", wrap: true } : { main: said, sub: hint };
    }
    return { main: hint, sub: "" };
  }

  function syncNotes() {
    const host = $("#notesLine");
    if (!host) return;
    const n = notesContent();
    if (!n) { host.innerHTML = ""; return; }
        host.innerHTML = `<p class="ro-text"><span class="ro-main" ${n.bad ? "data-bad" : ""} ${n.wrap ? "data-wrap" : ""}>${n.bad ? icon("x") : ""}<span>${n.main}</span></span>${n.sub ? `<span class="ro-sub">${n.sub}</span>` : ""}</p>`;
  }

  function syncCtl() {
    if (!$("#ctl")) return;
    const g = S.g, seat = actor();
    const previewing = canAct() && ((S.mode === "place" && S.preview) || (S.mode === "break" && S.sel));
    $("#modeRow").hidden = Boolean(previewing);
    $("#actRow").hidden = !previewing;
    document.querySelectorAll("[data-mode-btn]").forEach((b) => {
      const m = b.dataset.modeBtn;
      const off = modeOff(m);
      b.setAttribute("aria-pressed", String(S.mode === m));
      b.setAttribute("aria-disabled", String(Boolean(off)));
      if (off) b.dataset.off = ""; else delete b.dataset.off;
      const sub = b.querySelector(".mode-sub");
      if (off && m !== "move") sub.textContent = off === "Đang gửi…" ? "Đang gửi" : off.startsWith("Đang chờ") ? "Chưa tới lượt" : off;
      else if (off) sub.textContent = "Chưa tới lượt";
      else if (m === "move") sub.textContent = `${R.shortestPath(g, seat).steps} bước`;
      else if (m === "place") sub.textContent = `Còn ${g.left[seat]}`;
      else sub.textContent = "Còn 1 lần";
    });
    const conf = $("#confirmBtn"), rot = $("#rotBtn");
    if (S.mode === "place") {
      conf.textContent = "Đặt rào";
      rot.hidden = false;
      const bad = S.preview && R.fenceProblem(g, S.preview, seat);
      conf.setAttribute("aria-disabled", String(Boolean(bad)));
      if (bad) conf.setAttribute("aria-describedby", "notesLine"); else conf.removeAttribute("aria-describedby");
    } else if (S.mode === "break") {
      conf.textContent = "Phá rào";
      rot.hidden = true;
      conf.setAttribute("aria-disabled", "false");
      conf.removeAttribute("aria-describedby");
    }
    $("#actRow").dataset.count = rot.hidden ? "2" : "3";
    const had = document.activeElement;
    if (had && had !== document.body && had.closest("#ctl") && had.offsetParent === null) $("#board").focus();
  }

  function refresh() {
    drawDyn();
    syncNotes();
    syncCtl();
    const st = $("#statusText");
    if (st) st.textContent = statusText();
    const seats = $("#seats");
    if (seats) seats.outerHTML = seatsHtml();
    const undo = $("#undoBtn"), redo = $("#redoBtn");
    if (undo) { undo.setAttribute("aria-disabled", String(S.hist.length === 0)); redo.setAttribute("aria-disabled", String(S.redo.length === 0)); }
  }

  /* ── Playing. ── */
  function played(next) {
    S.hist.push(S.g);
    S.redo = [];
    const was = S.g;
    S.g = next;
    S.mode = "move"; S.preview = null; S.sel = null; S.tried = null; S.cursor = null;
    if (next.result) { render(); return; }
    refresh();
    animate(was, next);
    afterMove();
  }
  function afterMove() {
    const s = scene();
    if (online() && !s.waitForever && viewer() !== null && S.g.turn !== viewer() && !S.g.result) {
      clearTimeout(S.botTimer);
      S.botTimer = setTimeout(botMove, 900);
    }
  }
  function botMove() {
    const g = S.g;
    if (g.result || (viewer() !== null && g.turn === viewer())) return;
    const path = R.shortestPath(g, g.turn).path;
    if (path.length < 2) return;
    const was = g;
    S.g = R.step(g, path[1]);
    S.hist.push(was);
    S.cursor = null;
    if (S.g.result) { render(); return; }
    refresh();
    animate(was, S.g);
    afterMove();
  }

  function animate(was, now) {
    if (S.reduced || !Element.prototype.animate) return;
    const last = now.last;
    if (!last) return;
    if (last.kind === "step") {
      const el = $(`#dyn [data-piece="${last.seat}"]`);
      if (!el) return;
      const [x0, y0] = S.geo.center(last.from.x, last.from.y), [x1, y1] = S.geo.center(last.to.x, last.to.y);
      el.animate([{ transform: `translate(${x0 - x1}px, ${y0 - y1}px)` }, { transform: "none" }], { duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" });
    } else if (last.kind === "fence") {
      const el = $(`#dyn [data-wall="${last.fence.o}${R.fenceName(last.fence)}"]`);
      if (el) el.animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: 160 });
    }
  }

  function setMode(mode) {
    const off = modeOff(mode);
    if (off) { S.tried = off; syncNotes(); return false; }
    S.tried = null; S.mode = mode; S.preview = null; S.sel = null;
    refresh();
    return true;
  }
  function confirmNow() {
    const g = S.g, seat = actor();
    if (!canAct()) return;
    if (S.mode === "place" && S.preview) {
      if (R.fenceProblem(g, S.preview, seat)) return;
      const f = { ...S.preview, by: seat };
      const next = R.placeFence(g, f);
      if (scene().slow) {
        // Online: the fence stays where it is while the server answers, drawn as what it will be.
        S.sending = true;
        S.last2 = f;
        S.hist.push(g);
        S.g = next;
        S.mode = "move"; S.preview = null; S.cursor = null;
        refresh();
        setTimeout(() => { S.sending = false; S.last2 = null; refresh(); }, 1500);
        return;
      }
      played(next);
    } else if (S.mode === "break" && S.sel) {
      played(R.breakFence(g, S.sel));
    }
  }
  function focusBoardCell() {
    const c = S.cursor;
    if (!c) return;
    const b = $(`#cells .cell[data-x="${c.x}"][data-y="${c.y}"]`);
    if (b) b.focus();
  }

  /* ── Touch and mouse on the board. ── */
  const P = { id: null, down: null, moved: false, grabbed: null, fenceAtDown: null };

  function localPoint(e) {
    const r = $("#board").getBoundingClientRect();
    const scale = r.width / S.geo.W;
    return [(e.clientX - r.left) / scale, (e.clientY - r.top) / scale];
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* The nearest line to a point on the board: its direction, and the crossing nearest along it. */
  function nearestFence(a, b, lockO, cur) {
    const g = S.g;
    const da = Math.abs(a - Math.round(a)), db = Math.abs(b - Math.round(b));
    const o = lockO || (db < da ? "h" : "v");
    let ma = clamp(Math.round(a), 1, g.cols - 1), mb = clamp(Math.round(b), 1, g.rows - 1);
    // A little stickiness, so a fence does not tremble between two places under a still finger.
    if (cur && cur.o === o) {
      if (Math.abs(a - (cur.x + 1)) < 0.62) ma = cur.x + 1;
      if (Math.abs(b - (cur.y + 1)) < 0.62) mb = cur.y + 1;
    }
    return { o, x: ma - 1, y: mb - 1 };
  }

  function nearestWall(a, b) {
    let best = null, bestD = Infinity;
    for (const w of S.g.walls) {
      const ma = w.x + 1, mb = w.y + 1;
      const [a0, b0, a1, b1] = w.o === "h" ? [ma - 1, mb, ma + 1, mb] : [ma, mb - 1, ma, mb + 1];
      const t = clamp(((a - a0) * (a1 - a0) + (b - b0) * (b1 - b0)) / 4, 0, 1);
      const d = Math.hypot(a - (a0 + t * (a1 - a0)), b - (b0 + t * (b1 - b0)));
      if (d < bestD) { bestD = d; best = w; }
    }
    return best;
  }

  const sameFence = (f, h) => f && h && f.o === h.o && f.x === h.x && f.y === h.y;

  function onDown(e) {
    if (!canAct() || (S.mode !== "place" && S.mode !== "break")) return;
    if (!e.isPrimary) return; // A second finger is the browser's: pinch to zoom.
    P.id = e.pointerId; P.moved = false;
    const [x, y] = localPoint(e);
    const [a, b] = S.geo.fromPx(x, y);
    P.down = { x, y, a, b };
    showFinger(x, y);
    if (S.dragMode === "nodrag") return; // Decided when the finger lifts: the page may scroll instead.
    try { $("#board").setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
    if (S.mode === "place") {
      const cur = S.preview;
      const far = !cur || Math.hypot(a - (cur.x + 1), b - (cur.y + 1)) > 2.5;
      P.grabbed = !far;
      P.fenceAtDown = cur ? { ...cur } : null;
      P.firstHere = far;
      if (far) {
        // Nothing near: the fence appears here, on the nearest line (or keeps its direction).
        S.preview = nearestFence(a, b, S.dragMode === "keep" && cur ? cur.o : null);
      }
    } else {
      S.sel = nearestWall(a, b);
    }
    refreshPreview();
  }

  function onMove(e) {
    if (P.id !== e.pointerId || !P.down) return;
    const [x, y] = localPoint(e);
    showFinger(x, y);
    if (S.dragMode === "nodrag") { if (Math.hypot(x - P.down.x, y - P.down.y) > 8) P.moved = true; return; }
    if (!P.moved && Math.hypot(x - P.down.x, y - P.down.y) < 6) return;
    P.moved = true;
    const [a, b] = S.geo.fromPx(x, y);
    if (S.mode === "place") {
      const base = P.grabbed ? [P.fenceAtDown.x + 1 + (a - P.down.a), P.fenceAtDown.y + 1 + (b - P.down.b)] : [a, b];
      const lock = S.dragMode === "keep" ? S.preview.o : null;
      const next = nearestFence(base[0], base[1], lock, S.preview);
      if (!sameFence(next, S.preview)) { S.preview = next; refreshPreview(); }
    } else {
      const w = nearestWall(a, b);
      if (!sameFence(w, S.sel)) { S.sel = w; refreshPreview(); }
    }
    showTag(x, y);
  }

  function onUp(e) {
    if (P.id !== e.pointerId || !P.down) return;
    const [x, y] = localPoint(e);
    const [a, b] = S.geo.fromPx(x, y);
    P.id = null;
    hideFinger(); hideTag();
    if (e.type === "pointercancel") {
      // The browser took over (two fingers): the fence stays where it was.
      if (S.dragMode !== "nodrag" && S.mode === "place") { S.preview = P.fenceAtDown; refreshPreview(); }
      P.down = null;
      return;
    }
    if (S.mode === "place") {
      if (S.dragMode === "nodrag") {
        if (!P.moved) {
          const cur = S.preview;
          const here = nearestFence(a, b, cur ? cur.o : null);
          S.preview = here;
        }
      } else if (!P.moved && !P.firstHere && P.fenceAtDown) {
        const cur = P.fenceAtDown;
        const here = nearestFence(a, b, cur.o);
        // The same crossing: turn it. Another: move there, keeping the direction.
        if (here.x === cur.x && here.y === cur.y) S.preview = { ...cur, o: cur.o === "h" ? "v" : "h" };
        else S.preview = S.dragMode === "keep" ? here : nearestFence(a, b, null);
      }
    } else if (S.mode === "break" && S.dragMode === "nodrag" && !P.moved) {
      S.sel = nearestWall(a, b);
    }
    P.down = null;
    refreshPreview();
  }

  function refreshPreview() {
    drawDyn();
    syncNotes();
    syncCtl();
  }

  /* What follows the finger on a phone: above it and over the page, since the line under the board is
     where the hand is. Beside the board (sideways, on a laptop) the column is in plain view. */
  function showTag(x, y) {
    if (vp().layout !== "phone") return;
    const n = notesContent();
    if (!n) return;
    let tag = $("#dragTag");
    if (!tag) { tag = document.createElement("div"); tag.id = "dragTag"; tag.className = "dragtag"; $("#boardSlot").appendChild(tag); }
    tag.innerHTML = (n.bad ? icon("x") : "") + `<span>${n.main}</span>`;
    if (n.bad) tag.dataset.bad = ""; else delete tag.dataset.bad;
    const board = $("#board"), slot = $("#boardSlot");
    const ox = board.offsetLeft, oy = board.offsetTop;
    const w = tag.offsetWidth, h = tag.offsetHeight;
    const left = clamp(ox + x - w / 2, 0, slot.clientWidth - w);
    const f = S.mode === "place" ? S.preview : S.sel;
    const fr = f ? D.fenceFrame(S.geo, f) : null;
    const fenceTop = fr ? fr.my - (fr.horiz ? fr.w : S.geo.c) : y;
    const top = Math.max(oy - h - 6, oy + Math.min(fenceTop, y - 34) - h - 10);
    tag.style.left = left + "px";
    tag.style.top = top + "px";
  }
  const hideTag = () => { const t = $("#dragTag"); if (t) t.remove(); };

  function showFinger(x, y) {
    if (!S.finger) return;
    let f = $("#fingerSim");
    if (!f) { f = document.createElement("div"); f.id = "fingerSim"; f.className = "finger"; $("#boardSlot").appendChild(f); }
    const board = $("#board");
    f.style.left = board.offsetLeft + x + "px";
    f.style.top = board.offsetTop + y + "px";
  }
  const hideFinger = () => { const f = $("#fingerSim"); if (f) f.remove(); };

  /* ── The keyboard: arrows follow the screen, whichever way the board is turned. ── */
  const KEY_DIR = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
  function onKey(e) {
    const g = S.g;
    if (g.result || !$("#board")) return;
    const inBoard = e.target.closest && e.target.closest("#board");
    const inPlay = e.target.closest && e.target.closest("#ctl, #board, #notesLine");
    if (e.key === "Escape" && inPlay && (S.mode !== "move" || S.preview)) {
      e.preventDefault();
      setMode("move"); S.cursor = null; refresh(); focusBoardCell();
      return;
    }
    if (!canAct()) return;
    if ((e.key === "r" || e.key === "R") && inPlay && S.mode === "place") {
      e.preventDefault();
      if (!S.preview) S.preview = keyboardStart();
      S.preview = { ...S.preview, o: S.preview.o === "h" ? "v" : "h" };
      refreshPreview();
      return;
    }
    if (!inBoard) return;
    const dir = KEY_DIR[e.key];
    if (S.mode === "move") {
      if (dir) {
        e.preventDefault();
        const [da, db] = S.geo.dirFromScreen(dir[0], dir[1]);
        S.cursor = { x: clamp(S.cursor.x + da, 0, g.cols - 1), y: clamp(S.cursor.y + db, 0, g.rows - 1) };
        syncCells(R.legalSteps(g, actor()), cellMap());
        focusBoardCell();
      }
      return;
    }
    if (S.mode === "place") {
      if (dir) {
        e.preventDefault();
        if (!S.preview) S.preview = keyboardStart();
        else {
          const [da, db] = S.geo.dirFromScreen(dir[0], dir[1]);
          S.preview = { ...S.preview, x: clamp(S.preview.x + da, 0, g.cols - 2), y: clamp(S.preview.y + db, 0, g.rows - 2) };
        }
        refreshPreview();
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        confirmNow();
        if (S.mode === "move") focusBoardCell();
      }
      return;
    }
    if (S.mode === "break") {
      if (dir) {
        e.preventDefault();
        S.sel = S.sel ? wallInDirection(S.sel, dir) || S.sel : nearestWall(g.pieces[actor()].x + 0.5, g.pieces[actor()].y + 0.5);
        refreshPreview();
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        confirmNow();
        if (S.mode === "move") focusBoardCell();
      }
    }
  }
  function keyboardStart() {
    const p = S.g.pieces[actor()];
    return { o: "h", x: clamp(p.x, 0, S.g.cols - 2), y: clamp(p.y, 0, S.g.rows - 2) };
  }
  function wallInDirection(from, dir) {
    const [da, db] = S.geo.dirFromScreen(dir[0], dir[1]);
    let best = null, bestScore = Infinity;
    for (const w of S.g.walls) {
      if (sameFence(w, from)) continue;
      const a = w.x - from.x, b = w.y - from.y;
      const along = a * da + b * db;
      if (along <= 0) continue;
      const score = along + Math.abs(a * db) * 2 + Math.abs(b * da) * 2;
      if (score < bestScore) { bestScore = score; best = w; }
    }
    return best;
  }
  function cellMap() {
    const m = new Map();
    S.g.pieces.forEach((p, seat) => { const k = `${p.x},${p.y}`; (m.get(k) || m.set(k, []).get(k)).push(seat); });
    return m;
  }

  /* ── The menu's card and the rules page. ── */
  function artwork() {
    // A corner of the fields: the gate over the 3 middle of 5 columns, one fence, two hats.
    const G = D.geom({ rows: 4, cols: 5, c: 22, gx: 5, gy: 16 });
    const f = D.fieldsFor(G, { rows: 4, cols: 5 }, "art");
    return `<svg viewBox="0 0 120 120" aria-hidden="true">${f}${D.artGate(G, 0, 1, 3)}${D.wall(G, { o: "h", x: 1, y: 1 })}${D.wall(G, { o: "v", x: 3, y: 0 })}${D.hat(0, ...G.center(2, 0), 8.5)}${D.hat(1, ...G.center(0, 3), 8.5)}</svg>`;
  }
  function menuHtml() {
    return `<main class="menu-page"><ul class="menu-grid"><li class="menu-card"><div class="menu-art">${artwork()}</div><div class="menu-body"><div class="menu-head"><h2>Cờ rào</h2><p class="menu-facts">2–4 người · ~15 phút</p></div><p class="menu-tag">Đua về cổng làng phía đối diện, đặt rào chặn đường bạn</p><div class="menu-links"><button type="button" class="btn btn-primary">Chơi</button><button type="button" class="btn btn-secondary">Online</button><a class="menu-rules" href="#">Luật chơi</a></div></div></li></ul></main>`;
  }

  /* A little board for a figure: fields, the fences given, the pieces given. */
  function miniBoard({ rows, cols, c = 34, pieces = [], walls = [], bad = [], ok = [], chosen = [], gone = [], paths = [], goalTop = null, ox = 0, oy = 0, id }) {
    const G = D.geom({ rows, cols, c, gx: 0, gy: goalTop === null ? 0 : c * 0.46 });
    let s = `<g transform="translate(${ox} ${oy})">${D.fieldsFor(G, { rows, cols }, id, { mat: false })}`;
    if (goalTop !== null) s += D.artGate(G, goalTop, 0, cols);
    for (const [seat, cells] of paths) s += D.pathLine(G, seat, cells);
    for (const f of walls) s += D.wall(G, f);
    for (const f of gone) s += D.wallGone(G, f);
    for (const f of chosen) s += D.wallChosen(G, f);
    for (const f of ok) s += D.previewOk(G, f);
    for (const f of bad) s += D.previewBad(G, f);
    for (const [seat, x, y] of pieces) s += D.hat(seat, ...G.center(x, y), c * 0.36);
    return s + "</g>";
  }
  function miniGame(rows, cols, pieces, goals, walls) {
    const g = R.newGame(2);
    g.rows = rows; g.cols = cols; g.n = pieces.length; g.goals = goals; g.edges = goals.map((e) => R.OPPOSITE[e]);
    g.pieces = pieces; g.walls = walls; g.left = pieces.map(() => 9);
    return g;
  }
  function rulesHtml() {
    const { h, v } = window.FenceScenes;
    // 1. Placing: one good fence, and the two ways to go wrong.
    const c1 = 30, w1 = c1 * 3;
    const fig1 = `<svg viewBox="-6 -2 ${w1 * 3 + 44} ${w1 + 30}" role="img" aria-label="Ba hình nhỏ: rào đặt đúng trên đường kẻ, rào đè lên rào khác, rào cắt ngang rào khác">
      ${miniBoard({ rows: 3, cols: 3, c: c1, ok: [h(0, 1)], pieces: [[0, 1, 0]], id: "r1a" })}
      ${miniBoard({ rows: 3, cols: 3, c: c1, walls: [h(0, 1)], bad: [h(1, 1)], ox: w1 + 16, id: "r1b" })}
      ${miniBoard({ rows: 3, cols: 3, c: c1, walls: [h(0, 1)], bad: [v(0, 1)], ox: 2 * (w1 + 16), id: "r1c" })}
      <g font-size="14" font-weight="600" fill="currentColor" text-anchor="middle"><text x="${w1 / 2}" y="${w1 + 20}">Được</text><text x="${w1 * 1.5 + 16}" y="${w1 + 20}">Đè</text><text x="${w1 * 2.5 + 32}" y="${w1 + 20}">Cắt</text></g></svg>`;
    // 2. Forbidden: really sealed, checked by the rules.
    const mg = miniGame(4, 5, [{ x: 4, y: 2 }], ["bottom"], [h(3, 2), h(3, 0)]);
    const forbid = v(2, 1);
    const sealedProbe = R.fenceProblem({ ...mg, left: [9] }, forbid, 0);
    if (!sealedProbe || sealedProbe.code !== "sealed") throw new Error("figure 2 is not really sealed");
    const before = R.shortestPath(mg, 0);
    const fig2 = `<svg viewBox="-4 -4 178 144" role="img" aria-label="Quân ở góc phải chỉ còn một lối ra bên trái; rào đặt vào lối đó bị cấm vì bịt kín đường">
      ${miniBoard({ rows: 4, cols: 5, c: 34, walls: mg.walls, bad: [forbid], pieces: [[1, 4, 2]], paths: [[1, before.path]], goalTop: null, id: "r2" })}</svg>`;
    // 3. Breaking: before and after, the steps counted by the rules.
    const bw = [h(1, 2), h(3, 2), v(0, 0)];
    const gb = miniGame(5, 5, [{ x: 2, y: 0 }], ["top"], bw);
    const p0 = R.shortestPath(gb, 0);
    const gone = bw[0];
    const after = bw.filter((w) => w !== gone);
    const p1 = R.shortestPath(gb, 0, after);
    const c3 = 28, w3 = c3 * 5;
    const fig3 = `<svg viewBox="0 0 ${w3 * 2 + 44} ${w3 + 28}" role="img" aria-label="Trước khi phá rào, đường dài ${p0.steps} bước; sau khi phá còn ${p1.steps} bước">
      ${miniBoard({ rows: 5, cols: 5, c: c3, walls: bw.filter((w) => w !== gone), chosen: [gone], pieces: [[0, 2, 0]], paths: [[0, p0.path]], id: "r3a" })}
      <g transform="translate(${w3 + 8} ${w3 / 2 - 12})"><path d="M2 12H24M18 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g>
      ${miniBoard({ rows: 5, cols: 5, c: c3, walls: after, gone: [gone], pieces: [[0, 2, 0]], paths: [[0, p1.path]], ox: w3 + 44, id: "r3b" })}
      <g font-size="14" font-weight="600" fill="currentColor" text-anchor="middle"><text x="${w3 / 2}" y="${w3 + 20}">${p0.steps} bước</text><text x="${w3 * 1.5 + 44}" y="${w3 + 20}">${p1.steps} bước</text></g></svg>`;

    // 0. The gate: its 5 cells, and a piece at the edge outside it that still has to walk in.
    const gg = (() => { const x = R.newGame(2); x.rows = 3; x.pieces = [{ x: 1, y: 2 }, { x: 4, y: 0 }]; x.goals = ["top", "bottom"]; return x; })();
    if (R.onGoal(gg, 0, 1, 2) || !R.onGoal(gg, 0, 2, 2) || !R.onGoal(gg, 0, 6, 2) || R.onGoal(gg, 0, 7, 2)) throw new Error("figure 0 is not the gate");
    const Gg = D.geom({ rows: 3, cols: 9, c: 36, gx: 0, gy: 18 });
    const pg = R.shortestPath(gg, 0).path;
    const figGate = `<svg viewBox="0 0 ${Gg.W} ${Gg.H - 18}" role="img" aria-label="Cạnh trên có cổng ở năm ô giữa, từ cột C tới G. Quân ở cột B, ngoài cổng, đi dọc cạnh một bước vào cổng">
      ${D.fieldsFor(Gg, { rows: 3, cols: 9 }, "r0", { mat: false })}${D.plainLabels(Gg, "top", true)}${D.gate(Gg, 0, "top", { active: true })}${D.pathLine(Gg, 0, pg)}${D.hat(0, ...Gg.center(1, 2), 13)}</svg>`;
    const sec = (title, words, fig) => `<section class="rules-section ${fig ? "has-fig" : ""}"><div class="rules-words"><h2>${title}</h2>${words}</div>${fig || ""}</section>`;
    const figure = (svg, caption) => `<figure class="rules-fig">${svg}<figcaption>${caption}</figcaption></figure>`;
    const play = `<button type="button" class="btn btn-primary" style="align-self:flex-start">Chơi Cờ rào</button>`;
    return `<main class="rules-page">
      <div class="rules-head"><div class="rules-id"><div class="rules-thumb">${artwork()}</div><div><h1 class="rules-title">Luật chơi Cờ rào</h1><p class="rules-facts">2–4 người · ~15 phút</p></div></div>${play}</div>
      <div class="rules-sections">
        ${sec("Mục tiêu", "<p>Đưa quân của bạn vào <strong>cổng đích</strong> trước mọi người. Cổng là <strong>5 ô giữa</strong> của cạnh đối diện, cột hay hàng thứ 3 tới thứ 7, vẽ như một cổng làng mang màu và ký hiệu của bạn.</p><p>Các ô còn lại của cạnh đó không tính: quân tới đó phải đi tiếp dọc cạnh vào cổng.</p>", figure(figGate, "Quân ● đang ở cột B, ngoài cổng, nên <b>chưa thắng</b>. Đi dọc cạnh một bước vào cột C là về đích."))}
        ${sec("Bàn và số rào", "<ul><li>Hai người: bàn <strong>11 hàng × 9 cột</strong>, mỗi người <strong>9 rào</strong>.</li><li>Ba người: bàn <strong>9 × 9</strong>, mỗi người <strong>6 rào</strong>.</li><li>Bốn người: bàn <strong>9 × 9</strong>, mỗi người <strong>4 rào</strong>.</li></ul><p>Ai cũng có đúng một lần phá rào. Ghế đầu đi trước.</p>")}
        ${sec("Mỗi lượt một việc", "<p>Trong lượt của mình, bạn làm một trong ba việc: <strong>đi quân</strong> một ô, <strong>đặt</strong> một rào, hoặc <strong>phá</strong> một rào.</p><p>Quân đi ngang hoặc dọc, không đi xuyên rào. Quân được <strong>đứng chung ô</strong> và không nhảy qua nhau.</p>")}
        ${sec("Đặt rào", "<p>Rào dài <strong>hai ô</strong>, nằm trên đường kẻ giữa các ô. Rào không được đè lên rào khác, dù chỉ một đoạn, và không được cắt ngang rào khác ở trung điểm.</p>", figure(fig1, "Rào liền, hai đầu tròn: đặt được. Rào gãy đôi có dấu ✕: <b>không đặt được</b>."))}
        ${sec("Luôn còn đường về đích", "<p>Không được đặt rào làm <strong>bất kỳ ai</strong> hết đường về đích, kể cả chính bạn. Quân khác không tính là vật cản.</p>", figure(fig2, "Quân ■ chỉ còn một lối ra (chấm). Rào ✕ sẽ <b>bịt kín đường</b> của nó nên bị cấm."))}
        ${sec("Phá rào", "<p>Mỗi người phá được <strong>một lần</strong> trong cả ván, thay cho việc đi quân hay đặt rào. Phá được rào của <strong>bất kỳ ai</strong>; rào bị phá không trả lại cho ai.</p>", figure(fig3, `Phá rào có viền: đường từ <b>${p0.steps}</b> còn <b>${p1.steps}</b> bước.`))}
        ${sec("Kết thúc ván", "<p>Ai vào một ô của cổng đích trước thì thắng ngay, kể cả ván nhiều người. Cổng của người khác không tính. Sau <strong>200 nước</strong> cả ván (<strong>198 nước</strong> khi ba người) mà chưa ai về đích, người có đường ngắn nhất thắng; bằng nhau thì hoà.</p>")}
      </div>
      ${play}
    </main>`;
  }

  /* ── Render a frame. ── */
  function render() {
    const f = vp(), s = scene();
    screen.dataset.layout = f.layout;
    screen.style.setProperty("--h", f.h + "px");
    device.style.width = f.w + "px";
    device.style.height = f.h + "px";
    if (s.kind === "menu" || s.kind === "rules") {
      S.geo = null;
      const bar = s.kind === "menu" ? menuTopBar() : topBar("Luật chơi Cờ rào", false);
      screen.innerHTML = `<div class="scroller" id="scroller">${bar}${s.kind === "menu" ? menuHtml() : rulesHtml()}</div>`;
      fit(); writeNotes(); measureLater();
      return;
    }
    let html = `<div class="scroller" id="scroller">${topBar("Cờ rào", true)}<div class="page" id="page"><div class="play" id="play">${playHtml()}</div></div></div>`;
    screen.innerHTML = html;
    drawBoard();
    refresh();
    wire();
    fit();
    writeNotes();
    measureLater();
  }
  function menuTopBar() {
    return `<header class="topbar"><div class="topbar-in"><div class="brand"><svg class="brand-mark" viewBox="0 0 28 28" aria-hidden="true"><rect x="2" y="2" width="11" height="11" rx="3" fill="var(--accent)"/><rect x="15" y="2" width="11" height="11" rx="5.5" fill="var(--celebration)"/><rect x="2" y="15" width="11" height="11" rx="5.5" fill="var(--piece-yellow)"/><rect x="15" y="15" width="11" height="11" rx="3" fill="var(--fg)"/></svg>Board Games Hub</div><div class="topbar-end"><button type="button" class="tb-btn" aria-label="Giao diện">${icon("monitor")}</button><button type="button" class="tb-btn loc" aria-label="Ngôn ngữ">${icon("globe")}VI</button></div></div></header>`;
  }

  function wire() {
    const board = $("#board");
    board.addEventListener("pointerdown", onDown);
    board.addEventListener("pointermove", onMove);
    board.addEventListener("pointerup", onUp);
    board.addEventListener("pointercancel", onUp);
    $("#cells").addEventListener("click", (e) => {
      const b = e.target.closest(".cell");
      if (!b || S.mode !== "move" || !canAct()) return;
      const to = { x: +b.dataset.x, y: +b.dataset.y };
      if (!R.legalSteps(S.g, actor()).some((c) => c.x === to.x && c.y === to.y)) { S.cursor = to; return; }
      played(R.step(S.g, to));
    });
    screen.addEventListener("keydown", onKey);
    screen.onclick = (e) => {
      const t = e.target.closest ? e.target : null;
      if (!t) return;
      const mb = t.closest("[data-mode-btn]");
      if (mb) {
        const ok = setMode(mb.dataset.modeBtn);
        // From the keyboard the next keys are for the board.
        if (ok && e.detail === 0 && S.mode !== "move") $("#board").focus();
        return;
      }
      if (t.closest("#rotBtn")) { if (S.preview) { S.preview = { ...S.preview, o: S.preview.o === "h" ? "v" : "h" }; refreshPreview(); } return; }
      if (t.closest("#cancelBtn")) { S.preview = null; S.sel = null; refreshPreview(); $("#board").focus(); return; }
      if (t.closest("#confirmBtn")) {
        const kb = e.detail === 0;
        confirmNow();
        if (kb && S.mode === "move") focusBoardCell();
        return;
      }
      if (t.closest("#undoBtn")) { if (S.hist.length) { S.redo.push(S.g); S.g = S.hist.pop(); S.mode = "move"; S.preview = null; S.sel = null; S.cursor = null; render(); } return; }
      if (t.closest("#redoBtn")) { if (S.redo.length) { S.hist.push(S.g); S.g = S.redo.pop(); S.cursor = null; render(); } return; }
      if (t.closest("[data-newgame]")) { const n = S.g.n; S.g = R.newGame(n); S.hist = []; S.redo = []; S.mode = "move"; S.preview = null; S.sel = null; S.cursor = null; render(); return; }
      if (t.closest("[data-resign]")) { $("#resignDialog").showModal(); return; }
    };
  }

  function fit() {
    const f = vp();
    if (bare) { device.style.transform = "none"; wrap.style.width = f.w + "px"; wrap.style.height = f.h + "px"; return; }
    const stage = $("#stage");
    const cs = getComputedStyle(stage);
    const w = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const scale = Math.min(1, w / f.w, innerWidth > 900 ? h / f.h : 1);
    device.style.transform = scale === 1 ? "none" : `scale(${scale})`;
    wrap.style.width = f.w * scale + "px";
    wrap.style.height = f.h * scale + "px";
  }
  addEventListener("resize", () => { fit(); });

  /* ── Measuring (also read by the Playwright check). ── */
  function rectOf(el) {
    if (!el) return null;
    const sr = screen.getBoundingClientRect(), r = el.getBoundingClientRect();
    const scale = sr.width / vp().w || 1;
    return { x: round((r.left - sr.left) / scale), y: round((r.top - sr.top) / scale), w: round(r.width / scale), h: round(r.height / scale) };
  }
  const round = (n) => Math.round(n * 10) / 10;
  function measure() {
    const sc = $("#scroller");
    const out = {
      vp: S.vp, scene: S.scene, mode: S.mode,
      cell: S.geo ? S.geo.c : null,
      board: rectOf($("#board")),
      status: rectOf($("[data-status-box]") || $(".a-status")),
      statusText: rectOf($("#statusText")),
      seats: rectOf($("#seats")),
      notes: rectOf($("#notesLine")),
      modeRow: $("#modeRow") && !$("#modeRow").hidden ? rectOf($("#modeRow")) : null,
      actRow: $("#actRow") && !$("#actRow").hidden ? rectOf($("#actRow")) : null,
      confirm: $("#confirmBtn") && !$("#actRow").hidden ? rectOf($("#confirmBtn")) : null,
      newGame: rectOf($("[data-newgame]")),
      chat: rectOf($("#chatBtn")),
      scrollH: sc.scrollHeight, clientH: sc.clientHeight,
      scrollW: sc.scrollWidth, clientW: sc.clientWidth,
      hScroll: sc.scrollWidth > sc.clientWidth,
      targets: [...document.querySelectorAll("#cells .cell.can")].map((b) => rectOf(b)),
      buttons: [...screen.querySelectorAll("button:not(.cell), a")].filter((b) => b.offsetParent !== null).map((b) => ({ t: (b.getAttribute("aria-label") || b.textContent).trim().slice(0, 18), ...rectOf(b) })),
    };
    return out;
  }
  function measureLater() {
    requestAnimationFrame(() => {
      const host = $("#measure");
      if (!host || bare) return;
      const m = measure();
      const rows = [["Khung", m.vp.replace("x", " × ")]];
      if (m.board) {
        rows.push(["Bàn", `${m.board.w} × ${m.board.h}`], ["Ô", `${m.cell} px`], ["Cuộn dọc", m.scrollH > m.clientH ? `${m.scrollH - m.clientH} px` : "không"]);
        if (m.targets.length) rows.push(["Vùng chạm ô", `${Math.min(...m.targets.map((t) => t.w))} × ${Math.min(...m.targets.map((t) => t.h))}`]);
      }
      rows.push(["Cuộn ngang", m.hScroll ? "có" : "không"]);
      host.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
    });
  }
  function writeNotes() {
    const n = $("#notes");
    if (n) n.innerHTML = `<p>${scene().note || ""}</p>`;
  }

  /* ── The mockup's own panel. ── */
  function setScene(id) {
    S.scene = id;
    const s = scene();
    clearTimeout(S.botTimer);
    S.sending = false;
    S.hist = []; S.redo = [];
    S.preview = s.preview ? { ...s.preview } : null;
    S.sel = s.sel ? { ...s.sel } : null;
    S.mode = s.mode || "move";
    S.tried = null; S.cursor = null;
    if (s.g) S.g = s.g();
    if (s.tried && S.g) S.tried = modeOff(s.tried);
    const r = document.querySelector(`input[name=scene][value="${id}"]`);
    if (r) r.checked = true;
    render();
  }
  function setVp(id) {
    S.vp = id;
    const r = document.querySelector(`input[name=vp][value="${id}"]`);
    if (r) r.checked = true;
    render();
  }
  function setTheme(t) {
    S.theme = t;
    document.documentElement.setAttribute("data-theme", t);
    const r = document.querySelector(`input[name=theme][value=${t}]`);
    if (r) r.checked = true;
  }
  function setReduced(v) {
    S.reduced = v;
    $("#reduced").checked = v;
  }

  $("#vps").innerHTML = Object.entries(VPS).map(([id, f]) => `<label><input type="radio" name="vp" value="${id}"> ${f.label}</label>`).join("");
  $("#vps").addEventListener("change", (e) => setVp(e.target.value));
  let lastGroup = null;
  $("#scenes").innerHTML = SCENES.map((s) => {
    const head = s.group !== lastGroup ? `<p class="scene-group">${s.group}</p>` : "";
    lastGroup = s.group;
    return `${head}<label><input type="radio" name="scene" value="${s.id}"> ${s.label}</label>`;
  }).join("");
  $("#scenes").addEventListener("change", (e) => setScene(e.target.value));
  document.querySelectorAll("input[name=theme]").forEach((r) => r.addEventListener("change", () => setTheme(r.value)));
  $("#reduced").addEventListener("change", (e) => setReduced(e.target.checked));
  $("#finger").addEventListener("change", (e) => { S.finger = e.target.checked; });
  $("#colourNames").addEventListener("change", (e) => { S.colourNames = e.target.checked; render(); });
  document.querySelectorAll("input[name=drag]").forEach((r) => r.addEventListener("change", () => { S.dragMode = r.value; S.preview = null; S.sel = null; refresh(); }));
  $("#botMove").onclick = botMove;
  $("#showPath").addEventListener("change", (e) => { S.showPath = e.target.checked; refresh(); });

  window.__mock = {
    S, R, measure, setScene, setVp, setTheme, setReduced, botMove,
    setDrag(v) { S.dragMode = v; const r = document.querySelector(`input[name=drag][value=${v}]`); if (r) r.checked = true; S.preview = null; refresh(); },
    setFinger(v) { S.finger = v; },
    setPath(v) { S.showPath = v; refresh(); },
    setColourNames(v) { S.colourNames = v; render(); },
    setPreview(f) { S.mode = "place"; S.preview = f; refresh(); },
    setSel(f) { S.mode = "break"; S.sel = f; refresh(); },
    showFingerAt(x, y) { showFinger(x, y); showTag(x, y); },
    scroll(v) { $("#scroller").scrollTop = v; },
  };

  setReduced(qs.has("reduced") || matchMedia("(prefers-reduced-motion: reduce)").matches);
  setTheme(qs.get("theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  S.vp = VPS[qs.get("vp")] ? qs.get("vp") : "360x740";
  const vr = document.querySelector(`input[name=vp][value="${S.vp}"]`);
  if (vr) vr.checked = true;
  if (qs.get("drag")) {
    S.dragMode = qs.get("drag");
    const dr = document.querySelector(`input[name=drag][value="${S.dragMode}"]`);
    if (dr) dr.checked = true;
  }
  setScene(SCENES.some((s) => s.id === qs.get("scene")) ? qs.get("scene") : "move2");
})();
