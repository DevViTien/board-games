/*
 * Cờ rào's drawings, as SVG strings: the fields, the village gates of the goal edges, the conical
 * hats that are the pieces (seen from above), the inked fences. Every colour is a token. Nothing here
 * decides a rule; a board is told what to show.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(typeof FenceRules !== "undefined" ? FenceRules : root.FenceRules);
  else root.FenceDraw = factory(root.FenceRules);
})(typeof self !== "undefined" ? self : this, function (R) {
  "use strict";

  const SEATS = [
    { key: "red", label: "Đỏ", sym: "●" },
    { key: "blue", label: "Xanh dương", sym: "■" },
    { key: "yellow", label: "Vàng", sym: "▲" },
    { key: "green", label: "Xanh lá", sym: "◆" },
  ];
  const n1 = (v) => Math.round(v * 10) / 10;

  /* ── Where things are on screen: the board turned for a seat, the names staying with the board. ── */
  const ROT_FOR_EDGE = { bottom: 0, left: 90, top: 180, right: 270 };

  function geom({ rows, cols, rot = 0, c, gx, gy }) {
    const sr = rot % 180 === 0 ? rows : cols;
    const sc = rot % 180 === 0 ? cols : rows;
    const W = gx * 2 + sc * c, H = gy * 2 + sr * c;
    // Board lines (a from the left, b from the bottom, as the first seat sees it) to the screen's.
    const toUV = (a, b) => {
      if (rot === 0) return [a, b];
      if (rot === 180) return [cols - a, rows - b];
      if (rot === 90) return [rows - b, a];
      return [b, cols - a];
    };
    const fromUV = (u, v) => {
      if (rot === 0) return [u, v];
      if (rot === 180) return [cols - u, rows - v];
      if (rot === 90) return [v, rows - u];
      return [cols - v, u];
    };
    const px = (a, b) => { const [u, v] = toUV(a, b); return [gx + u * c, gy + (sr - v) * c]; };
    const fromPx = (x, y) => fromUV((x - gx) / c, sr - (y - gy) / c);
    const center = (x, y) => px(x + 0.5, y + 0.5);
    // The board's direction for a direction on screen.
    const dirFromScreen = (dx, dy) => {
      const [a0, b0] = fromUV(0, 0), [a1, b1] = fromUV(dx, dy);
      return [Math.round(a1 - a0), Math.round(b1 - b0)];
    };
    const edge = (e) => ["bottom", "right", "top", "left"][(["bottom", "right", "top", "left"].indexOf(e) + rot / 90) % 4];
    return { rows, cols, rot, c, gx, gy, sr, sc, W, H, px, fromPx, center, dirFromScreen, edge, horiz: (o) => (o === "h") === (rot % 180 === 0) };
  }

  /* ── The goal: one village gate over the 5 middle cells of an edge. Two posts, which carry the
     seat's symbol, and a long roof between them with its eaves turned up and a peak in the middle. In
     local units: `a` along the edge, `b` across it, 0 at the outside, t against the fields. ── */
  function gatePath(a0, a1, t, post, c) {
    const e = t * 0.34, mid = (a0 + a1) / 2, s = Math.min(c * 0.5, t);
    const l = a0 + post, r = a1 - post;
    return `M${n1(a0)} ${n1(t)}L${n1(a0)} ${n1(t * 0.1)}Q${n1(a0)} 0 ${n1(a0 + post * 0.25)} 0L${n1(l - post * 0.25)} 0Q${n1(l)} 0 ${n1(l)} ${n1(t * 0.1)}` +
      `L${n1(l)} ${n1(e * 0.3)}Q${n1(l + s * 0.3)} ${n1(e)} ${n1(l + s)} ${n1(e)}L${n1(mid - s)} ${n1(e)}L${n1(mid)} ${n1(e * 0.15)}L${n1(mid + s)} ${n1(e)}L${n1(r - s)} ${n1(e)}Q${n1(r - s * 0.3)} ${n1(e)} ${n1(r)} ${n1(e * 0.3)}` +
      `L${n1(r)} ${n1(t * 0.1)}Q${n1(r)} 0 ${n1(r + post * 0.25)} 0L${n1(a1 - post * 0.25)} 0Q${n1(a1)} 0 ${n1(a1)} ${n1(t * 0.1)}L${n1(a1)} ${n1(t)}Z`;
  }

  /* The width of a post, and how far a neighbouring name has to step aside for it on a small cell. */
  const gatePost = (G, t) => Math.max(11, Math.min(t * 0.8, G.c * 0.42));
  const labelFont = (t) => Math.max(10, Math.min(15, t * 0.62));

  /* A gate along a screen edge. `active`: the seat to move or the winner, a full colour, else a tint. */
  function gate(G, seat, screenEdge, { active, labels = true, first = 2, count = 5 }) {
    const k = SEATS[seat].key;
    const horizontal = screenEdge === "top" || screenEdge === "bottom";
    const t = horizontal ? G.gy : G.gx;
    const gut = horizontal ? G.gx : G.gy;
    const post = gatePost(G, t);
    const a0 = gut + first * G.c - post, a1 = gut + (first + count) * G.c + post;
    const m = {
      top: "matrix(1 0 0 1 0 0)", bottom: `matrix(1 0 0 -1 0 ${n1(G.H)})`,
      left: "matrix(0 1 1 0 0 0)", right: `matrix(0 1 -1 0 ${n1(G.W)} 0)`,
    }[screenEdge];
    const fill = active ? `var(--piece-${k})` : `color-mix(in srgb, var(--piece-${k}) 24%, var(--game-tint))`;
    let s = `<g transform="${m}" data-gate="${seat}"><path d="${gatePath(a0, a1, t, post, G.c)}" fill="${fill}" stroke="var(--piece-${k}-line)" stroke-width="1.25" stroke-linejoin="round"/>`;
    const ink = active ? `var(--piece-${k}-ink)` : `var(--piece-${k}-line)`;
    for (let i = 0; i <= count; i++) {
      const x = gut + (first + i) * G.c;
      s += `<line x1="${n1(x)}" y1="${n1(t * 0.55)}" x2="${n1(x)}" y2="${n1(t)}" stroke="${ink}" stroke-opacity="0.45" stroke-width="1"/>`;
    }
    s += "</g>";
    const textFill = active ? `var(--piece-${k}-ink)` : "var(--fg)";
    const across = { top: t * 0.64, bottom: G.H - t * 0.64, left: t * 0.64, right: G.W - t * 0.64 }[screenEdge];
    const at = (along, acrossAt) => (horizontal ? [along, acrossAt] : [acrossAt, along]);
    if (labels) {
      for (let i = first; i < first + count; i++) {
        const [x, y] = at(gut + (i + 0.5) * G.c, across);
        s += `<text x="${n1(x)}" y="${n1(y)}" font-size="${n1(labelFont(t))}" fill="${textFill}" text-anchor="middle" dominant-baseline="central" font-weight="700">${cellLabel(G, screenEdge, i)}</text>`;
      }
    }
    // The symbol stands on each post, at the same height whichever edge the gate is on.
    const symAcross = { top: t * 0.5, bottom: G.H - t * 0.5, left: t * 0.5, right: G.W - t * 0.5 }[screenEdge];
    for (const along of [a0 + post / 2, a1 - post / 2]) {
      const [x, y] = at(along, symAcross);
      s += symbolShape(seat, x, y, Math.max(7.5, Math.min(t * 0.52, post * 0.72)), textFill);
    }
    return s;
  }

  function symbolShape(seat, cx, cy, s, fill) {
    const k = SEATS[seat].key;
    const f = `fill="${fill}"`;
    if (k === "red") return `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(s * 0.5)}" ${f}/>`;
    if (k === "blue") { const a = s * 0.86; return `<rect x="${n1(cx - a / 2)}" y="${n1(cy - a / 2)}" width="${n1(a)}" height="${n1(a)}" ${f}/>`; }
    if (k === "yellow") { const a = s * 0.62; return `<path d="M${n1(cx)} ${n1(cy - a)}L${n1(cx + a * 1.05)} ${n1(cy + a * 0.8)}L${n1(cx - a * 1.05)} ${n1(cy + a * 0.8)}Z" ${f}/>`; }
    const a = s * 0.66;
    return `<path d="M${n1(cx)} ${n1(cy - a)}L${n1(cx + a)} ${n1(cy)}L${n1(cx)} ${n1(cy + a)}L${n1(cx - a)} ${n1(cy)}Z" ${f}/>`;
  }

  /* The name along an edge: follows the board, not the screen. */
  function cellLabel(G, screenEdge, i) {
    const horizontal = screenEdge === "top" || screenEdge === "bottom";
    // The screen's cell i along that edge, as a point on the board.
    const [a, b] = horizontal
      ? G.fromPx(G.gx + (i + 0.5) * G.c, G.gy + 0.5 * G.c)
      : G.fromPx(G.gx + 0.5 * G.c, G.gy + (i + 0.5) * G.c);
    const alongColumns = G.rot % 180 === 0 ? horizontal : !horizontal;
    return alongColumns ? R.LETTERS[Math.floor(a)] : String(Math.floor(b) + 1);
  }

  /* The names along an edge outside any gate: on the paper, like a margin. `gated`: the 5 middle
     cells are the gate's, whose neighbours step aside from its posts where a cell is small. */
  function plainLabels(G, screenEdge, gated) {
    const horizontal = screenEdge === "top" || screenEdge === "bottom";
    const t = horizontal ? G.gy : G.gx;
    const count = horizontal ? G.sc : G.sr;
    const fs = labelFont(t);
    let s = "";
    for (let i = 0; i < count; i++) {
      if (gated && i >= 2 && i <= 6) continue;
      let along = (horizontal ? G.gx : G.gy) + (i + 0.5) * G.c;
      if (gated && (i === 1 || i === 7)) {
        const room = gatePost(G, t) + fs * 0.35 + 1 - G.c / 2;
        if (room > 0) along += i === 1 ? -room : room;
      }
      const across = { top: t * 0.5, bottom: G.H - t * 0.5, left: t * 0.5, right: G.W - t * 0.5 }[screenEdge];
      const [x, y] = horizontal ? [along, across] : [across, along];
      s += `<text x="${n1(x)}" y="${n1(y)}" font-size="${n1(fs)}" fill="var(--fg-muted)" text-anchor="middle" dominant-baseline="central" font-weight="700">${cellLabel(G, screenEdge, i)}</text>`;
    }
    return s;
  }

  /* ── The fields. The kind of each field goes with the cell, so both players see the same map. ── */
  function plotKind(x, y) {
    return ((x * 5 + y * 3 + (x * y) % 4 + (x >> 1)) % 3 + 3) % 3;
  }

  function patterns(id, c) {
    const u = c / 4;
    const row = `stroke="var(--fence-row)" stroke-linecap="round"`;
    const w = Math.max(0.8, c * 0.028);
    return `<defs>
      <pattern id="${id}-a" width="${n1(u)}" height="${n1(u)}" patternUnits="userSpaceOnUse"><line x1="${n1(u / 2)}" y1="${n1(u * 0.28)}" x2="${n1(u / 2)}" y2="${n1(u * 0.72)}" ${row} stroke-width="${n1(w)}"/></pattern>
      <pattern id="${id}-a2" width="${n1(u)}" height="${n1(u)}" patternUnits="userSpaceOnUse"><line y1="${n1(u / 2)}" x1="${n1(u * 0.28)}" y2="${n1(u / 2)}" x2="${n1(u * 0.72)}" ${row} stroke-width="${n1(w)}"/></pattern>
      <pattern id="${id}-b" width="${n1(u)}" height="${n1(u)}" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="${n1(u * 0.2)}" y1="${n1(u / 2)}" x2="${n1(u * 0.8)}" y2="${n1(u / 2)}" ${row} stroke-width="${n1(w)}"/></pattern>
      <pattern id="${id}-b2" width="${n1(u)}" height="${n1(u)}" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><line x1="${n1(u * 0.2)}" y1="${n1(u / 2)}" x2="${n1(u * 0.8)}" y2="${n1(u / 2)}" ${row} stroke-width="${n1(w)}"/></pattern>
      <pattern id="${id}-c" width="${n1(u * 0.8)}" height="${n1(u * 0.8)}" patternUnits="userSpaceOnUse"><line x1="0" y1="${n1(u * 0.4)}" x2="${n1(u * 0.8)}" y2="${n1(u * 0.4)}" ${row} stroke-width="${n1(w)}"/></pattern>
      <pattern id="${id}-c2" width="${n1(u * 0.8)}" height="${n1(u * 0.8)}" patternUnits="userSpaceOnUse"><line y1="0" x1="${n1(u * 0.4)}" y2="${n1(u * 0.8)}" x2="${n1(u * 0.4)}" ${row} stroke-width="${n1(w)}"/></pattern>
    </defs>`;
  }

  function fields(G, id, { mat = true } = {}) {
    const { gx, gy, sc, sr, c, W, H } = G;
    let s = patterns(id, c);
    if (mat) {
      s += `<rect x="0.75" y="0.75" width="${n1(W - 1.5)}" height="${n1(H - 1.5)}" rx="${n1(Math.min(14, c * 0.34))}" fill="var(--game-tint)" stroke="var(--fence-frame)" stroke-width="1.5"/>`;
    }
    s += `<rect x="${gx}" y="${gy}" width="${n1(sc * c)}" height="${n1(sr * c)}" fill="var(--game-line)"/>`;
    const lw = Math.max(1.25, c * 0.045);
    const rx = n1(Math.max(1.5, c * 0.07));
    for (let y = 0; y < G.rows; y++) {
      for (let x = 0; x < G.cols; x++) {
        const [cx, cy] = G.center(x, y);
        const kind = plotKind(x, y);
        const fill = ["var(--game-board)", "var(--fence-plot-2)", "var(--fence-plot-3)"][kind];
        const pat = "abc"[kind] + ((x * 3 + y * 5) % 2 ? "2" : "");
        const r = `x="${n1(cx - c / 2 + lw / 2)}" y="${n1(cy - c / 2 + lw / 2)}" width="${n1(c - lw)}" height="${n1(c - lw)}" rx="${rx}"`;
        s += `<rect ${r} fill="${fill}"/><rect ${r} fill="url(#${id}-${pat})"/>`;
      }
    }
    return s;
  }

  /* ── A piece: a conical hat seen from above, the seat's symbol at its peak. ── */
  function hat(seat, cx, cy, r, { turn = false, small = false, attrs = "" } = {}) {
    const k = SEATS[seat].key;
    const ink = `var(--piece-${k}-ink)`;
    let s = `<g ${attrs}>`;
    if (turn) {
      s += `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(r + 3.5)}" fill="none" stroke="var(--fence-halo)" stroke-width="5"/>`;
      s += `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(r + 3.5)}" fill="none" stroke="var(--game-highlight)" stroke-width="2.25"/>`;
    }
    s += `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(r)}" fill="var(--piece-${k})" stroke="var(--piece-edge)" stroke-width="${n1(Math.max(1.5, r * 0.12))}"/>`;
    // The hat's ribs: rings around the peak.
    if (!small) {
      const rib = n1(Math.max(0.7, r * 0.055));
      for (const k of [0.83, 0.62]) s += `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(r * k)}" fill="none" stroke="${ink}" stroke-opacity="0.55" stroke-width="${rib}"/>`;
    }
    s += symbolShape(seat, cx, cy, small ? r * 1.12 : r * 0.72, ink);
    return s + `</g>`;
  }

  /* Up to four hats in one cell, each still showing its symbol. */
  function hatsInCell(G, seats, x, y, turnSeat, attrs = () => "") {
    const [cx, cy] = G.center(x, y);
    const c = G.c;
    if (seats.length === 1) {
      return hat(seats[0], cx, cy, c * 0.36, { turn: seats[0] === turnSeat, attrs: attrs(seats[0]) });
    }
    const r = seats.length === 2 ? c * 0.27 : c * 0.242;
    const o = seats.length === 2 ? c * 0.2 : c * 0.238;
    const places = seats.length === 2 ? [[-o, -o], [o, o]] : [[-o, -o], [o, -o], [-o, o], [o, o]];
    // Small hats drop the stitching and draw the symbol larger; the seat to move is framed by the
    // cell-wide square in the board's marks, as a ring would hide its neighbours.
    return seats.map((seat, i) => hat(seat, cx + places[i][0], cy + places[i][1], r, { turn: false, small: true, attrs: attrs(seat) })).join("");
  }

  /* ── The fences. ── */
  function fenceFrame(G, f) {
    const [x1, y1] = G.px(f.x + 1 + (f.o === "h" ? -1 : 0), f.y + 1 + (f.o === "v" ? -1 : 0));
    const [x2, y2] = G.px(f.x + 1 + (f.o === "h" ? 1 : 0), f.y + 1 + (f.o === "v" ? 1 : 0));
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const horiz = Math.abs(x2 - x1) > Math.abs(y2 - y1);
    const w = Math.max(G.c < 22 ? 4.5 : 5.5, G.c * 0.17);
    const L = G.c * 2 - w * 0.55;
    return { mx, my, horiz, w, L, t: `translate(${n1(mx)} ${n1(my)})${horiz ? "" : " rotate(90)"}` };
  }

  function wallBody(w, L, fill, halo) {
    const knots = [-L * 0.25, 0, L * 0.25];
    let s = "";
    if (halo) s += `<rect x="${n1(-L / 2 - 1.5)}" y="${n1(-w / 2 - 1.5)}" width="${n1(L + 3)}" height="${n1(w + 3)}" rx="${n1(w / 2 + 1.5)}" fill="${halo}"/>`;
    s += `<rect x="${n1(-L / 2)}" y="${n1(-w / 2)}" width="${n1(L)}" height="${n1(w)}" rx="${n1(w / 2)}" fill="${fill}"/>`;
    for (const k of knots) {
      s += `<rect x="${n1(k - w * 0.36)}" y="${n1(-w / 2 - w * 0.17)}" width="${n1(w * 0.72)}" height="${n1(w * 1.34)}" rx="${n1(w * 0.26)}" fill="${fill}"/>`;
      s += `<line x1="${n1(k)}" y1="${n1(-w * 0.42)}" x2="${n1(k)}" y2="${n1(w * 0.42)}" stroke="${halo || "var(--fence-halo)"}" stroke-width="${n1(Math.max(1, w * 0.16))}"/>`;
    }
    return s;
  }

  function wall(G, f, { just = false } = {}) {
    const { w, L, t } = fenceFrame(G, f);
    let s = `<g transform="${t}" data-wall="${f.o}${R.fenceName(f)}">`;
    s += wallBody(w, L, "var(--fence-wall)", "var(--fence-halo)");
    if (just) {
      const p = w * 0.95;
      const r = `x="${n1(-L / 2 - p)}" y="${n1(-w / 2 - p)}" width="${n1(L + 2 * p)}" height="${n1(w + 2 * p)}" rx="${n1(w / 2 + p)}"`;
      s += `<rect ${r} fill="none" stroke="var(--fence-halo)" stroke-width="3.5"/><rect ${r} fill="none" stroke="var(--game-last-move)" stroke-width="1.75" stroke-dasharray="5 3.5"/>`;
    }
    return s + `</g>`;
  }

  /* The fence being tried: the accent, whole, with a round handle at each end. */
  function previewOk(G, f) {
    const { w, L, t } = fenceFrame(G, f);
    const c = "var(--fence-preview)";
    const r = w * 0.82;
    let s = `<g transform="${t}" data-preview="ok">`;
    s += `<rect x="${n1(-L / 2 - 2)}" y="${n1(-w / 2 - 2)}" width="${n1(L + 4)}" height="${n1(w + 4)}" rx="${n1(w / 2 + 2)}" fill="var(--fence-halo)"/>`;
    s += `<rect x="${n1(-L / 2)}" y="${n1(-w / 2)}" width="${n1(L)}" height="${n1(w)}" rx="${n1(w / 2)}" fill="${c}"/>`;
    for (const e of [-L / 2, L / 2]) s += `<circle cx="${n1(e)}" cy="0" r="${n1(r)}" fill="var(--fence-halo)" stroke="${c}" stroke-width="${n1(Math.max(2, w * 0.36))}"/>`;
    return s + `</g>`;
  }

  /* A fence that may not go there: another shape. Hollow, broken in two, crossed out in the middle. */
  function previewBad(G, f) {
    const { w, L, t } = fenceFrame(G, f);
    const c = "var(--fence-bad)";
    const gap = w * 1.5;
    const seg = L / 2 - gap;
    const box = (x) => `<rect x="${n1(x)}" y="${n1(-w / 2)}" width="${n1(seg)}" height="${n1(w)}" rx="${n1(w / 2)}" fill="var(--fence-halo)" stroke="${c}" stroke-width="2" stroke-dasharray="3.5 2.5"/>`;
    const r = w * 1.05;
    const a = r * 0.46;
    let s = `<g transform="${t}" data-preview="bad">`;
    s += box(-L / 2) + box(gap);
    s += `<circle r="${n1(r + 1.5)}" fill="var(--fence-halo)"/><circle r="${n1(r)}" fill="${c}"/>`;
    s += `<g transform="${t.includes("rotate") ? "rotate(-90)" : ""}"><path d="M${n1(-a)} ${n1(-a)}L${n1(a)} ${n1(a)}M${n1(a)} ${n1(-a)}L${n1(-a)} ${n1(a)}" stroke="var(--fence-bad-ink)" stroke-width="${n1(Math.max(1.75, w * 0.32))}" stroke-linecap="round"/></g>`;
    return s + `</g>`;
  }

  /* The fence chosen to break: still inked, ringed in the accent, a crack across its middle. */
  function wallChosen(G, f) {
    const { w, L, t } = fenceFrame(G, f);
    const c = "var(--fence-preview)";
    const p = w * 0.8;
    const r = `x="${n1(-L / 2 - p)}" y="${n1(-w / 2 - p)}" width="${n1(L + 2 * p)}" height="${n1(w + 2 * p)}" rx="${n1(w / 2 + p)}"`;
    let s = `<g transform="${t}" data-chosen="1">`;
    s += `<rect ${r} fill="var(--fence-halo)"/>`;
    s += wallBody(w, L, "var(--fence-wall)", null);
    const h = w * 0.95;
    s += `<path d="M${n1(-w * 0.2)} ${n1(-h)}L${n1(w * 0.26)} ${n1(-h * 0.3)}L${n1(-w * 0.26)} ${n1(h * 0.3)}L${n1(w * 0.2)} ${n1(h)}" fill="none" stroke="var(--fence-halo)" stroke-width="${n1(w * 0.55)}" stroke-linejoin="round"/>`;
    s += `<rect ${r} fill="none" stroke="${c}" stroke-width="2.5"/>`;
    return s + `</g>`;
  }

  /* Where a fence was just broken: its outline, dashed, and nothing inside. */
  function wallGone(G, f) {
    const { w, L, t } = fenceFrame(G, f);
    const r = `x="${n1(-L / 2)}" y="${n1(-w / 2)}" width="${n1(L)}" height="${n1(w)}" rx="${n1(w / 2)}"`;
    let s = `<g transform="${t}" data-gone="1"><rect ${r} fill="var(--fence-halo)" stroke="var(--fence-halo)" stroke-width="3"/><rect ${r} fill="none" stroke="var(--game-last-move)" stroke-width="1.75" stroke-dasharray="4 3"/>`;
    return s + `</g>`;
  }

  /* ── Marks in the cells. ── */
  function targetMark(G, x, y, occupied) {
    const [cx, cy] = G.center(x, y);
    const c = G.c;
    if (occupied) {
      const a = c * 0.43;
      return `<rect x="${n1(cx - a)}" y="${n1(cy - a)}" width="${n1(a * 2)}" height="${n1(a * 2)}" rx="${n1(c * 0.12)}" fill="none" stroke="var(--fence-halo)" stroke-width="4"/><rect x="${n1(cx - a)}" y="${n1(cy - a)}" width="${n1(a * 2)}" height="${n1(a * 2)}" rx="${n1(c * 0.12)}" fill="none" stroke="var(--game-highlight)" stroke-width="2"/>`;
    }
    const r = Math.max(4, c * 0.155);
    return `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(r + 2)}" fill="var(--fence-halo)"/><circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(r)}" fill="var(--game-highlight)"/>`;
  }

  function leftMark(G, x, y) {
    const [cx, cy] = G.center(x, y);
    const a = G.c * 0.34;
    const r = `x="${n1(cx - a)}" y="${n1(cy - a)}" width="${n1(a * 2)}" height="${n1(a * 2)}" rx="${n1(G.c * 0.1)}"`;
    return `<g data-left="1"><rect ${r} fill="none" stroke="var(--fence-halo)" stroke-width="3.5"/><rect ${r} fill="none" stroke="var(--game-last-move)" stroke-width="1.75" stroke-dasharray="4 3"/></g>`;
  }

  /* The shortest way, as a dotted line of the seat's colour on a paper edge. */
  function pathLine(G, seat, cells) {
    if (cells.length < 2) return "";
    const pts = cells.map((p) => G.center(p.x, p.y).map(n1).join(" ")).join("L");
    const k = SEATS[seat].key;
    const w = Math.max(2.5, G.c * 0.09);
    const dot = `stroke-linecap="round" stroke-linejoin="round" fill="none"`;
    return `<g data-path="${seat}"><path d="M${pts}" ${dot} stroke="var(--fence-halo)" stroke-width="${n1(w + 2.5)}" stroke-dasharray="0.1 ${n1(w * 2.4)}"/><path d="M${pts}" ${dot} stroke="var(--piece-${k}-line)" stroke-width="${n1(w)}" stroke-dasharray="0.1 ${n1(w * 2.4)}"/></g>`;
  }

  /* The cell a winner reached: a thick frame in the win colour on a paper edge. */
  function goalMark(G, x, y) {
    const [cx, cy] = G.center(x, y);
    const a = G.c * 0.47;
    const r = `x="${n1(cx - a)}" y="${n1(cy - a)}" width="${n1(a * 2)}" height="${n1(a * 2)}" rx="${n1(G.c * 0.1)}"`;
    const k = G.c * 0.2;
    const star = (x, y) => `<path d="M${n1(x)} ${n1(y - k)}L${n1(x + k * 0.3)} ${n1(y - k * 0.3)}L${n1(x + k)} ${n1(y)}L${n1(x + k * 0.3)} ${n1(y + k * 0.3)}L${n1(x)} ${n1(y + k)}L${n1(x - k * 0.3)} ${n1(y + k * 0.3)}L${n1(x - k)} ${n1(y)}L${n1(x - k * 0.3)} ${n1(y - k * 0.3)}Z" fill="var(--game-win)" stroke="var(--fence-halo)" stroke-width="1"/>`;
    return `<g data-goal="1"><rect ${r} fill="var(--celebration-soft)" stroke="var(--fence-halo)" stroke-width="6"/><rect ${r} fill="none" stroke="var(--game-win)" stroke-width="3"/>${star(cx - a, cy - a)}${star(cx + a, cy - a)}${star(cx - a, cy + a)}${star(cx + a, cy + a)}</g>`;
  }

  /* The seat to move among pieces sharing a cell: a square frame, as a ring would cover a neighbour. */
  function shareFrame(G, x, y) {
    const [cx, cy] = G.center(x, y);
    const a = G.c * 0.485;
    const r = `x="${n1(cx - a)}" y="${n1(cy - a)}" width="${n1(a * 2)}" height="${n1(a * 2)}" rx="${n1(G.c * 0.1)}"`;
    return `<rect ${r} fill="none" stroke="var(--fence-halo)" stroke-width="4"/><rect ${r} fill="none" stroke="var(--game-highlight)" stroke-width="2"/>`;
  }

  /* A gate along the top of a small picture, in a seat's colour (the artwork, the figures). */
  function artGate(G, seat, first, count, active = true) {
    return gate(G, seat, "top", { active, labels: false, first, count });
  }

  /* The seat's mark in the players' panel. */
  function seatMark(seat) {
    return `<svg class="mark-round" viewBox="0 0 28 28" aria-hidden="true">${hat(seat, 14, 14, 12.25)}</svg>`;
  }

  /* The gates and names of a whole board. `active` is the seat to move or the winner, or null. */
  function edges(g, G, { active, labels = true }) {
    const owner = {};
    g.goals.forEach((e, seat) => { owner[G.edge(e)] = seat; });
    let s = "";
    for (const se of ["bottom", "left", "top", "right"]) {
      const seat = owner[se];
      if (labels) s += plainLabels(G, se, seat !== undefined);
      if (seat !== undefined) s += gate(G, seat, se, { active: seat === active, labels });
    }
    return s;
  }

  return { SEATS, ROT_FOR_EDGE, geom, fields, gate, plainLabels, fieldsFor: (G, _size, id, opts) => fields(G, id, opts || { mat: false }), goalMark, shareFrame, artGate, edges, hat, hatsInCell, wall, previewOk, previewBad, wallChosen, wallGone, targetMark, leftMark, pathLine, seatMark, plotKind, fenceFrame, symbolShape };
});
