/* The mockup: plain script, no build. Chat code is one set of functions for every game and screen. */
(function () {
  "use strict";

  const ICON = {
    back: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    book: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
    monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    chatOff: '<path d="M20.5 14.9A9 9 0 0 0 9.1 3.5"/><path d="m2 2 20 20"/><path d="M5.6 5.6C3 8.3 2.2 12.5 4 16l-2 6 6-2c3.4 1.8 7.6 1.1 10.3-1.7"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    send: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
    retry: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    wifiOff: '<path d="M12 20h.01"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/><path d="M5 12.859a10 10 0 0 1 5.17-2.69"/><path d="M19 12.859a10 10 0 0 0-2.007-1.523"/><path d="M2 8.82a15 15 0 0 1 4.177-2.643"/><path d="M22 8.82a15 15 0 0 0-11.288-3.764"/><path d="m2 2 20 20"/>',
    updown: '<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>',
    alert: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    trophy: '<path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"/><path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"/><path d="M18 9h1.5a1 1 0 0 0 0-5H18"/><path d="M18 9a6 6 0 0 1-12 0V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1z"/><path d="M6 9H4.5a1 1 0 0 1 0-5H6"/>',
    zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  };
  const icon = (name) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  const FRAMES = {
    "chess-360": { w: 360, h: 740, game: "chess", layout: "phone", label: "360×740 cờ vua" },
    "ludo-360": { w: 360, h: 740, game: "ludo", layout: "phone", label: "360×740 cá ngựa 4 ghế" },
    "chess-390": { w: 390, h: 844, game: "chess", layout: "phone", label: "390×844 cờ vua" },
    "chess-land": { w: 844, h: 390, game: "chess", layout: "land", label: "844×390 ngang, cờ vua" },
    "ludo-land": { w: 844, h: 390, game: "ludo", layout: "land", label: "844×390 ngang, cá ngựa" },
    "chess-desk": { w: 1280, h: 800, game: "chess", layout: "desk", label: "1280×800 cờ vua" },
    "ludo-desk": { w: 1280, h: 800, game: "ludo", layout: "desk", label: "1280×800 cá ngựa 4 ghế" },
    "over-360": { w: 360, h: 740, game: "chess", layout: "phone", phase: "over", label: "360×740 ván đã kết thúc" },
    "standin-360": { w: 360, h: 740, game: "ludo", layout: "phone", phase: "standin", label: "360×740 đã đầu hàng, máy chơi thay" },
    "over-land": { w: 844, h: 390, game: "chess", layout: "land", phase: "over", label: "844×390 ván đã kết thúc" },
    "over-desk": { w: 1280, h: 800, game: "chess", layout: "desk", phase: "over", label: "1280×800 ván đã kết thúc, cờ vua" },
    "over-ludo-desk": { w: 1280, h: 800, game: "ludo", layout: "desk", phase: "over", label: "1280×800 ván đã kết thúc, cá ngựa" },
    "standin-desk": { w: 1280, h: 800, game: "ludo", layout: "desk", phase: "standin", label: "1280×800 đã đầu hàng, máy chơi thay" },
    "lobby-phone": { w: 360, h: 740, game: "ludo", layout: "phone", lobby: true, label: "Phòng chờ, điện thoại" },
    "lobby-desk": { w: 1280, h: 800, game: "ludo", layout: "desk", lobby: true, label: "Phòng chờ, máy tính" },
  };

  const PEOPLE = {
    ludo: { me: { name: "Bạn", seat: "red" }, minh: { name: "Minh", seat: "blue" }, lan: { name: "Lan", seat: "yellow" }, hung: { name: "Hùng", seat: "green" } },
    chess: { me: { name: "Bạn", seat: "bK" }, minh: { name: "Minh", seat: "wK" } },
    lobby: { me: { name: "Minh" }, lan: { name: "Lan" }, hung: { name: "Hùng" } },
  };
  const EMOJI = [["👍", "Thích"], ["😂", "Cười"], ["😮", "Ngạc nhiên"], ["😢", "Buồn"], ["🔥", "Tuyệt"], ["👏", "Vỗ tay"]];
  const EMOJI_NAME = Object.fromEntries(EMOJI);
  const PRESETS = ["Chào cả nhà", "Chơi hay đấy", "Nhanh lên nào", "Chờ mình chút", "Cảm ơn", "Xin lỗi", "Ván nữa nhé?"];
  const MAX = 200, COUNT_FROM = 160;
  const LONG = "Haaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

  const SEED = {
    ludo: [
      ["minh", "preset", "Chào cả nhà"], ["hung", "text", LONG], ["lan", "text", "Chào Minh, ván này phải thắng nhé"], ["hung", "emoji", "👍"],
      ["minh", "text", "Xem luật ở https://example.com/luat-co-ca-ngua nè"], ["me", "text", "Mình vừa ra được một con ngựa"], ["minh", "emoji", "😂"], ["minh", "text", "Đừng đá ngựa mình nha"],
      ["me", "preset", "Xin lỗi"], ["lan", "preset", "Chơi hay đấy"], ["me", "emoji", "🔥"],
    ],
    chess: [
      ["minh", "preset", "Chào cả nhà"], ["minh", "text", LONG], ["me", "text", "Chào Minh, mình cầm Đen nhé"], ["minh", "emoji", "👍"], ["minh", "text", "Khai cuộc này mình mới học"],
      ["minh", "text", "Xem ở https://example.com/khai-cuoc-italia nè"], ["me", "preset", "Chơi hay đấy"], ["me", "emoji", "🔥"],
    ],
    lobby: [
      ["lan", "preset", "Chào cả nhà"], ["me", "text", "Chờ thêm một bạn nữa là đủ"], ["hung", "text", "Mình gọi Tuấn vào rồi, đợi xíu"], ["lan", "emoji", "👍"], ["me", "preset", "Cảm ơn"],
    ],
  };
  const INCOMING = [
    ["preset", "Chơi hay đấy"], ["text", "Bạn ơi đi nhanh lên, mình sắp phải đi đón con rồi nên ván này cố xong sớm nha, nhờ bạn đó, cảm ơn nhiều lắm"],
    ["preset", "Nhanh lên nào"], ["text", "Ngựa mình sắp về đích rồi"], ["text", LONG],
  ];

  const S = {
    frame: "chess-360", theme: "light", reduced: false, open: false, kb: false, dock: "over",
    sending: false, failed: false, tooFast: false, disconnected: false, idle: false, claim: false, throwing: false, muted: false, empty: false, thirty: false,
    unread: 0, messages: [], draft: "", pending: null, failedItem: null, sentAt: [], inPool: 0,
  };
  const $ = (sel, root) => (root || document).querySelector(sel);
  const screen = $("#screen"), device = $("#device"), wrap = $("#deviceWrap");
  const bare = new URLSearchParams(location.search).has("bare");
  if (bare) document.documentElement.setAttribute("data-bare", "");

  const frame = () => FRAMES[S.frame];
  const peopleKey = () => (frame().lobby ? "lobby" : frame().game);
  const people = () => PEOPLE[peopleKey()];
  const others = () => Object.keys(people()).filter((k) => k !== "me");

  /* ── Seat marks (each game's own; the shared chat code only asks for one) ── */
  function roundMark(seat) {
    const shape = {
      red: '<circle cx="14" cy="14" r="5.5" fill="var(--piece-red-ink)"/>',
      blue: '<rect x="9" y="9" width="10" height="10" fill="var(--piece-blue-ink)"/>',
      yellow: '<path d="M14 7.5 21 20H7Z" fill="var(--piece-yellow-ink)"/>',
      green: '<path d="M14 7 21 14 14 21 7 14Z" fill="var(--piece-green-ink)"/>',
    }[seat];
    return `<svg class="mark-round" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="12.5" fill="var(--piece-${seat})" stroke="var(--piece-edge)" stroke-width="2"/>${shape}</svg>`;
  }
  const tile = (p) => `<span class="mark-tile" aria-hidden="true"><img src="assets/pieces/${p}.svg" alt=""></span>`;
  function markOf(key) {
    const seat = people()[key] && people()[key].seat;
    if (!seat) return "";
    return seat.length === 2 ? tile(seat) : roundMark(seat);
  }

  /* ── The screen's parts, as in the real app ── */
  function topBar(title, withRules) {
    return `<header class="topbar" data-top-bar data-lm="Thanh trên"><div class="topbar-in">
      <button type="button" class="tb-back" aria-label="Về menu">${icon("back")}<span class="${frame().layout === "phone" ? "sr-only" : ""}">Về menu</span></button>
      <div class="topbar-title">${title || ""}</div>
      <div class="topbar-end">
        ${withRules ? `<button type="button" class="tb-btn ink tb-rules" aria-label="Luật chơi">${icon("book")}<span>Luật chơi</span></button>` : ""}
        <button type="button" class="tb-btn" aria-label="Giao diện">${icon("monitor")}</button>
        <button type="button" class="tb-btn loc" aria-label="Ngôn ngữ">${icon("globe")}VI</button>
      </div></div></header>`;
  }
  const connChip = () => S.disconnected
    ? '<span class="badge badge-warning conn"><span class="dot"></span>Mất kết nối</span>'
    : '<span class="badge badge-success conn"><span class="dot"></span>Đã kết nối</span>';
  const chatButton = () => `<button type="button" class="btn btn-secondary chat-btn" id="chatBtn" aria-controls="chat" aria-expanded="false"></button>`;
  // PlayScreen's `hasButtons` is false online once the game has a result or the player resigned to a
  // stand-in: the row stays, with chat alone.
  const actionRow = () => `<div class="a-actions"><div class="actions" data-lm="Hàng nút">${chatButton()}${frame().phase ? "" : `<button type="button" class="btn btn-secondary" data-resign>${icon("flag")}Đầu hàng</button>`}</div></div>`;
  function statusBlock(playing) {
    if (frame().phase === "over") {
      return `<div class="a-status result" data-lm="Thẻ kết quả"><span class="badge badge-celebration">${icon("trophy")}Kết thúc</span><p class="result-title" role="status">Bạn thắng!</p><p class="result-detail">Minh đã đầu hàng.</p><button type="button" class="btn btn-primary" data-rematch>Chơi lại</button></div>`;
    }
    if (frame().phase === "standin") return `<p class="a-status" role="status" data-lm="Dòng lượt">Máy đang chơi thay bạn. Đến lượt Minh.</p>`;
    return `<div class="a-status" data-lm="Dòng lượt"><p role="status" id="statusText">${playing}</p><div id="claimSlot"></div></div>`;
  }

  function ludoPlay() {
    const seat = (seatKey, name, line, turn) => `<li class="seat ${turn ? "turn" : ""}"><span class="seat-mark">${roundMark(seatKey)}</span><span class="seat-body"><span class="seat-name">${name}</span><span class="seat-line">${line}</span></span></li>`;
    const land = frame().layout === "land";
    const ph = frame().phase;
    return `<div class="a-chips" data-lm="Thẻ Online"><span class="badge badge-accent">Online</span></div>
      <div class="a-notice" id="notice"></div>
      ${statusBlock("Đến lượt bạn (Đỏ)")}
      <ul class="a-players seats" aria-label="Người chơi" data-lm="Thẻ người chơi">
        ${seat("red", "Bạn · Đỏ", `${ph === "over" ? '<span class="badge badge-celebration turn-chip">Thắng</span>' : ph ? "" : '<span class="badge badge-ink turn-chip">Đến lượt</span>'}<span class="conn-slot">${connChip()}</span><span>${ph === "standin" ? "Máy chơi thay" : "3 trên đường"}</span>`, !ph)}
        ${seat("blue", "Minh · Xanh dương", ph === "standin" ? '<span class="badge badge-ink turn-chip">Đến lượt</span><span>Chơi từ xa</span>' : land ? "Chơi từ xa" : "Chơi từ xa · Chưa ra quân", ph === "standin")}
        ${seat("yellow", "Lan · Vàng", land ? "Chơi từ xa" : "Chơi từ xa · Chưa ra quân")}
        ${seat("green", "Hùng · Xanh lá", land ? "Chơi từ xa" : "Chơi từ xa · Chưa ra quân")}
      </ul>
      <div class="boardstack"><div class="board-slot"><div class="board-ludo" data-board data-lm="Bàn cờ" role="img" aria-label="Bàn cờ cá ngựa">
        <img class="only-light" src="assets/board/ludo-light.png" alt=""><img class="only-dark" src="assets/board/ludo-dark.png" alt=""></div></div></div>
      <div class="a-controls" data-lm="Xúc xắc"><div class="ludo-roll">
        <span class="die" aria-hidden="true"><svg viewBox="0 0 40 40" fill="currentColor"><circle cx="11" cy="9" r="4.2"/><circle cx="29" cy="9" r="4.2"/><circle cx="11" cy="20" r="4.2"/><circle cx="29" cy="20" r="4.2"/><circle cx="11" cy="31" r="4.2"/><circle cx="29" cy="31" r="4.2"/></svg></span>
        <button type="button" class="roll" aria-disabled="true" data-roll>Gieo xúc xắc</button></div>
        ${ph === "over" ? "" : `<p class="ludo-hint">${ph === "standin" ? "Máy đang chơi cho Đỏ. Bạn chơi lại từ ván sau." : "Đỏ gieo được 6. Chọn một ngựa được đánh dấu để đi."}</p>`}</div>
      ${actionRow()}`;
  }

  function chessBoard() {
    const pos = { a1: "wR", b1: "wN", c1: "wB", d1: "wQ", e1: "wK", f1: "wB", h1: "wR", f3: "wN", e4: "wP", a2: "wP", b2: "wP", c2: "wP", d2: "wP", f2: "wP", g2: "wP", h2: "wP", e5: "bP", a7: "bP", b7: "bP", c7: "bP", d7: "bP", f7: "bP", g7: "bP", h7: "bP", a8: "bR", b8: "bN", c8: "bB", d8: "bQ", e8: "bK", f8: "bB", g8: "bN", h8: "bR" };
    let cells = "";
    for (let rank = 1; rank <= 8; rank++) {
      for (let col = 0; col < 8; col++) {
        const f = "hgfedcba"[col], name = f + rank;
        const dark = ("abcdefgh".indexOf(f) + rank) % 2 === 1;
        const last = name === "g1" || name === "f3";
        cells += `<button type="button" class="sq ${dark ? "dark" : ""} ${last ? "last" : ""}" aria-label="Ô ${name}" tabindex="${name === "h1" ? 0 : -1}">${col === 0 ? `<span class="coord r">${rank}</span>` : ""}${rank === 8 ? `<span class="coord f">${f}</span>` : ""}${pos[name] ? `<img src="assets/pieces/${pos[name]}.svg" alt="">` : ""}</button>`;
      }
    }
    return `<div class="board-chess" data-board data-lm="Bàn cờ" role="group" aria-label="Bàn cờ vua">${cells}</div>`;
  }
  function chessPlay() {
    return `<div class="a-chips" data-lm="Thẻ Online"><span class="badge badge-accent">Online</span></div>
      <div class="a-notice" id="notice"></div>
      ${statusBlock("Minh vừa đi Mã g1 tới f3. Đến lượt bạn (Đen)")}
      <div class="boardstack">
        <div class="seatbar seat-top" data-lm="Thẻ đối thủ"><span class="seat-mark">${tile("wK")}</span><span class="seat-body"><span class="seat-name">Minh · Trắng</span><span class="seat-line">Chơi từ xa</span></span></div>
        <div class="board-slot">${chessBoard()}</div>
        <div class="seatbar seat-bottom ${frame().phase ? "" : "turn"}" data-lm="Thẻ của bạn"><span class="seat-mark">${tile("bK")}</span><span class="seat-body"><span class="seat-name">Bạn · Đen</span></span><span class="seatbar-chips">${frame().phase === "over" ? '<span class="badge badge-celebration">Thắng</span>' : '<span class="badge badge-ink">Đến lượt</span>'}<span class="conn-slot">${connChip()}</span></span></div>
      </div>
      <div class="a-controls" data-lm="Sổ ghi">
        <div class="strip-row"><div class="strip"><b>1.</b> e4 &nbsp;e5 <b>2.</b> <span class="ply-now">♞ f3</span></div><button type="button" class="flip-icon" aria-label="Lật bàn">${icon("updown")}</button></div>
        <div class="sheet-table"><h3>Sổ ghi</h3><div class="sheet-row"><b>1.</b><span>e4</span><span>e5</span></div><div class="sheet-row"><b>2.</b><span><span class="ply-now">♞ f3</span></span><span></span></div></div>
        <button type="button" class="btn btn-secondary flip-text">Lật bàn</button>
      </div>
      ${actionRow()}`;
  }

  function lobby() {
    const empty = '<li class="lobby-seat"><span class="muted">Đang chờ…</span><button type="button" class="btn btn-secondary btn-sm">Cho máy chơi</button></li>';
    return `<main class="lobby">
      <div class="lobby-head" data-lm="Tiêu đề phòng"><h2>Cờ cá ngựa</h2><span class="badge badge-neutral">Online</span>${chatButton()}</div>
      <div class="a-notice" id="notice" style="margin:0;min-height:0"></div>
      <div class="card" data-lm="Mã phòng và link"><dl><dt class="field-label">Mã phòng</dt><dd class="code">SKBKWQ</dd></dl>
        <div><label class="field-label" for="invite">Link mời</label><input class="link-input" id="invite" readonly value="https://boardgames.example/room/SKBKWQ"><button type="button" class="btn btn-secondary">Sao chép link</button></div></div>
      <section data-lm="Người chơi"><h3>Người chơi</h3><ol class="lobby-seats">
        <li class="lobby-seat"><span style="display:flex;align-items:center;gap:8px"><strong style="font-weight:600">Minh (bạn)</strong><span class="badge badge-neutral">Chủ phòng</span></span></li>
        <li class="lobby-seat"><span>Lan</span></li><li class="lobby-seat"><span>Hùng</span></li>${empty}</ol></section>
      <p class="muted">Gửi link mời cho bạn bè. Ván bắt đầu khi đủ người.</p></main>`;
  }

  /* ── Chat ── */
  function chatMarkup() {
    const emoji = EMOJI.map(([e, n]) => `<button type="button" class="q-emoji" data-quick="emoji" data-value="${e}" aria-label="Gửi ${n}">${e}</button>`).join("");
    const presets = PRESETS.map((p) => `<button type="button" class="q-preset" data-quick="preset" data-value="${esc(p)}">${esc(p)}</button>`).join("");
    return `<section class="chat" id="chat" aria-labelledby="chatTitle">
      <div class="chat-head"><span class="chat-handle" aria-hidden="true"></span>
        <div class="chat-title-wrap"><h2 class="chat-title" id="chatTitle" tabindex="-1">Chat</h2><p class="chat-turn" id="chatTurn"></p></div>
        <button type="button" class="switch" role="switch" id="muteSwitch" aria-checked="false"><span>Tắt chat</span><span class="switch-track" aria-hidden="true"></span></button>
        <button type="button" class="chat-close" id="chatClose" aria-label="Đóng chat">${icon("x")}</button>
      </div>
      <div id="chatLines"></div>
      <div class="log-wrap">
        <div class="log" id="log" role="log" aria-label="Tin nhắn trong phòng" aria-live="polite" tabindex="0"></div>
        <button type="button" class="new-pill" id="newPill" hidden>Tin mới ↓</button>
      </div>
      <div class="quick" id="quick" role="group" aria-label="Gửi nhanh">${emoji}<span class="q-sep" aria-hidden="true"></span>${presets}</div>
      <form class="composer" id="composer" novalidate>
        <div class="composer-field"><input id="chatInput" type="text" maxlength="${MAX}" enterkeyhint="send" autocomplete="off" aria-label="Viết tin nhắn" placeholder="Viết tin nhắn"><span class="counter" id="counter" hidden></span></div>
        <button type="submit" class="send" id="send" aria-label="Gửi">${icon("send")}</button>
      </form>
      <p class="sr-only" id="chatSr" role="status"></p>
    </section>`;
  }

  function buttonName() {
    if (S.muted) return "Chat, đã tắt thông báo";
    return S.unread > 0 ? `Chat, ${S.unread} tin chưa đọc` : "Chat";
  }
  function syncButton() {
    const b = $("#chatBtn");
    if (!b) return;
    b.setAttribute("aria-label", buttonName());
    b.setAttribute("aria-expanded", S.open ? "true" : "false");
    const count = !S.muted && S.unread > 0 ? `<span class="chat-count" aria-hidden="true">${S.unread > 9 ? "9+" : S.unread}</span>` : "";
    b.innerHTML = S.muted ? `${icon("chatOff")}Chat <span class="chat-off-word">đã tắt</span>` : `${icon("chat")}Chat${count}`;
  }

  function renderLog() {
    const log = $("#log");
    if (!log) return;
    const list = S.empty ? [] : S.messages;
    if (list.length === 0) {
      log.innerHTML = `<div class="empty">${icon("chat")}Chưa có tin nào. Gửi một lời chào nhé!</div>`;
      return;
    }
    const frag = document.createDocumentFragment();
    if (list.length >= 30) {
      const keep = document.createElement("p");
      keep.className = "m-keep"; keep.textContent = "Chỉ giữ 30 tin gần nhất";
      frag.appendChild(keep);
    }
    list.forEach((m, i) => {
      const same = i > 0 && list[i - 1].from === m.from;
      const mine = m.from === "me";
      const person = people()[m.from] || { name: m.from };
      const el = document.createElement("div");
      el.className = `m${mine ? " mine" : ""}${same ? " same" : ""}`;
      const sr = document.createElement("span");
      sr.className = "sr-only"; sr.textContent = (mine ? "Bạn" : person.name) + ": ";
      el.appendChild(sr);
      if (!mine && !same) {
        const from = document.createElement("span");
        from.className = "m-from"; from.setAttribute("aria-hidden", "true");
        const mark = markOf(m.from);
        from.innerHTML = (mark ? `<span class="m-mark">${mark}</span>` : "") + esc(person.name);
        el.appendChild(from);
      }
      const body = document.createElement("span");
      if (m.kind === "emoji") {
        body.className = "m-emoji"; body.setAttribute("role", "img"); body.setAttribute("aria-label", EMOJI_NAME[m.text] || m.text); body.textContent = m.text;
      } else if (m.kind === "preset") {
        body.className = "m-preset"; body.innerHTML = icon("zap"); body.appendChild(document.createTextNode(m.text));
      } else {
        // textContent: a link stays plain text.
        body.className = "m-text"; body.textContent = m.text;
      }
      el.appendChild(body);
      frag.appendChild(el);
    });
    log.replaceChildren(frag);
  }
  function nearBottom() {
    const log = $("#log");
    return !log || log.scrollHeight - log.scrollTop - log.clientHeight < 24;
  }
  function toBottom() { const log = $("#log"); if (log) log.scrollTop = log.scrollHeight; const p = $("#newPill"); if (p) p.hidden = true; }

  const offline = () => S.disconnected || S.idle;
  function renderLines() {
    const host = $("#chatLines");
    if (!host) return;
    let html = "";
    const f = frame();
    // What the panel covers and is needed now comes with it, in one line.
    const covers = !f.lobby && (f.layout === "land" || (f.layout === "desk" && S.dock === "over"));
    if (f.phase === "over" && f.layout === "land") html += `<div class="chat-line info"><span>Bạn thắng!</span><button type="button" class="line-btn" data-rematch>Chơi lại</button></div>`;
    if (S.claim && covers && !f.phase) html += `<div class="chat-line info"><span>Minh đã 5 phút chưa đi.</span><button type="button" class="line-btn" data-claim>Xử thắng</button></div>`;
    if (S.muted) html += `<div class="chat-line muted-line">${icon("chatOff")}<span><strong>Chat đang tắt:</strong> không bong bóng, không đếm tin mới.</span></div>`;
    if (S.idle) html += `<div class="chat-line warn" id="whyOff">${icon("clock")}<span>Đã tạm ngắt vì lâu không có hoạt động.</span><button type="button" class="line-btn" data-resume>Tiếp tục</button></div>`;
    else if (S.disconnected) html += `<div class="chat-line warn" id="whyOff">${icon("wifiOff")}<span>Mất kết nối, chưa gửi được. Đang kết nối lại…</span></div>`;
    else if (S.tooFast) html += `<div class="chat-line warn" role="alert">${icon("clock")}<span>Gửi chậm lại một chút</span></div>`;
    if (S.failed && !offline()) {
      const item = S.failedItem;
      const quick = item && item.kind !== "text";
      html += `<div class="chat-line err" role="alert">${icon("alert")}<span>Chưa gửi được${quick ? ": " + esc(item.text) : ""}</span><button type="button" class="line-btn" id="retry">${icon("retry")}Gửi lại</button></div>`;
    }
    if (host.innerHTML !== html) host.innerHTML = html;
    const retry = $("#retry");
    if (retry) retry.onclick = retrySend;
  }
  function syncComposer() {
    const input = $("#chatInput");
    if (!input) return;
    if (input.value !== S.draft) input.value = S.draft;
    const off = offline();
    const busy = S.pending !== null;
    const len = S.draft.length;
    const showCount = len >= COUNT_FROM;
    const counter = $("#counter");
    counter.hidden = !showCount;
    counter.textContent = `${len}/${MAX}`;
    counter.classList.toggle("at-limit", len >= MAX);
    $("#composer").classList.toggle("has-count", showCount);
    input.toggleAttribute("readonly", off);
    input.setAttribute("aria-disabled", off ? "true" : "false");
    input.placeholder = S.idle ? "Bấm “Tiếp tục” để gửi" : off ? "Chờ kết nối lại để gửi" : "Viết tin nhắn";
    if (off) input.setAttribute("aria-describedby", "whyOff"); else input.removeAttribute("aria-describedby");
    input.setAttribute("aria-busy", busy ? "true" : "false");
    const send = $("#send");
    const canSend = !off && !busy && !S.tooFast && S.draft.trim().length > 0;
    send.setAttribute("aria-disabled", canSend ? "false" : "true");
    send.setAttribute("aria-label", busy ? "Đang gửi" : "Gửi");
    if (off) send.setAttribute("aria-describedby", "whyOff"); else send.removeAttribute("aria-describedby");
    send.innerHTML = busy ? '<span class="spinner" aria-hidden="true"></span>' : icon("send");
    $("#quick").querySelectorAll("button").forEach((b) => {
      b.setAttribute("aria-disabled", off || busy || S.tooFast ? "true" : "false");
      if (off) b.setAttribute("aria-describedby", "whyOff"); else b.removeAttribute("aria-describedby");
      b.classList.toggle("q-busy", busy && S.pending.kind === "preset" && b.dataset.value === S.pending.text);
    });
    $("#muteSwitch").setAttribute("aria-checked", S.muted ? "true" : "false");
    const sr = $("#chatSr");
    const say = busy ? "Đang gửi…" : "";
    if (sr.textContent !== say) sr.textContent = say;
  }
  function syncChat() {
    const pinned = nearBottom();
    renderLines(); syncButton(); syncComposer(); syncPanel();
    if (pinned) toBottom();
  }

  const kbHeight = () => {
    const f = frame();
    return S.kb && f.layout !== "desk" ? (f.layout === "phone" ? 270 : 170) : 0;
  };
  /* 48% of what the keyboard leaves. Without a keyboard, lower when the board starts low on the screen,
     so at least 96 px of it stay in view (it never moves), but never under 240 px. */
  let sheetH = 0;
  function computeSheet() {
    const f = frame(), base = Math.round((f.h - kbHeight()) * 0.48);
    const b = $("[data-board]");
    if (kbHeight() > 0 || !b) return base;
    return Math.min(base, Math.max(240, Math.round(f.h - rectOf(b).y - 96)));
  }
  function layoutSheet() {
    const f = frame();
    const kbH = kbHeight();
    sheetH = computeSheet();
    screen.style.setProperty("--kb", kbH + "px");
    screen.toggleAttribute("data-kb", kbH > 0);
    if (f.layout === "phone") screen.style.setProperty("--sheet-h", sheetH + "px");
    if (f.layout === "land") {
      const col = $(".a-chips");
      if (col) screen.style.setProperty("--col-left", Math.round((col.getBoundingClientRect().left - screen.getBoundingClientRect().left) / scaleNow()) + "px");
    }
    syncSpacer();
  }
  function scaleNow() { return Number(device.dataset.scale || 1); }

  /* Room to scroll the whole board above the sheet. It lengthens the page below, so nothing above moves. */
  let spacerH = 0;
  function syncSpacer() {
    const spacer = $("#spacer"), sc = $("#scroller");
    if (!spacer) return;
    const f = frame();
    const want = S.open && f.layout === "phone" ? sheetH + kbHeight() : 0;
    if (want < spacerH) {
      // Closing: kept while the page is scrolled into it, so the browser does not pull the board.
      const maxWithout = sc.scrollHeight - spacerH + want - sc.clientHeight;
      if (sc.scrollTop > maxWithout) return;
    }
    spacerH = want;
    spacer.style.height = want + "px";
  }

  function placeSpot() {
    const f = frame(), scale = scaleNow(), sr = screen.getBoundingClientRect();
    let left, width, top;
    if (f.layout === "phone") { left = 12; width = f.w - 24; top = 56 + 6; }
    else if (f.lobby) { left = f.w - 344; width = 320; top = 64 + 32; }
    else {
      const anchor = $(".a-chips").getBoundingClientRect();
      left = (anchor.left - sr.left) / scale;
      width = f.layout === "land" ? f.w - left - 16 : 384;
      top = f.layout === "land" ? 48 + 4 : 64 + 8;
    }
    screen.style.setProperty("--spot-left", left + "px");
    screen.style.setProperty("--spot-width", width + "px");
    screen.style.setProperty("--spot-top", top + "px");
    screen.style.setProperty("--spot-right", f.w - (left + width) + 8 + "px");
  }

  /* ── Bubble and reaction ── */
  let bubbleTimer = null;
  function clearBubble() {
    clearTimeout(bubbleTimer);
    const old = $("#bubble");
    if (old) old.remove();
    syncPeek();
  }
  /* Where the chat button is out of view (below the fold on a phone), the bubble leaves a small tab with
     the count once it goes: the player learns about new messages without scrolling. */
  function chatButtonInView() {
    const b = $("#chatBtn");
    if (!b) return true;
    const r = rectOf(b), top = parseFloat(getComputedStyle(screen).getPropertyValue("--top")) + 1;
    return r.y >= top && r.y + r.h <= frame().h;
  }
  function syncPeek() {
    const p = $("#peek");
    if (!p) return;
    const show = !S.open && !S.muted && S.unread > 0 && !$("#bubble") && !$("#float") && !chatButtonInView();
    if (show) {
      placeSpot();
      p.setAttribute("aria-label", `Mở chat, ${S.unread} tin chưa đọc`);
      p.innerHTML = `${icon("chat")}Chat<span class="peek-count" aria-hidden="true">${S.unread > 9 ? "9+" : S.unread}</span>`;
    }
    p.hidden = !show;
  }
  function hideBubbleSoon() {
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => {
      const b = $("#bubble");
      if (!b) return;
      b.classList.add("leaving");
      setTimeout(() => { b.remove(); syncPeek(); }, 200);
    }, 4000);
  }
  function showBubble(from, text) {
    clearBubble();
    placeSpot();
    const b = document.createElement("button");
    b.type = "button"; b.id = "bubble"; b.className = "bubble";
    const name = people()[from].name;
    b.setAttribute("aria-label", `Mở chat, ${S.unread} tin chưa đọc. ${name}: ${text}`);
    const mark = markOf(from);
    b.innerHTML = `${mark ? `<span class="m-mark" aria-hidden="true">${mark}</span>` : ""}<span class="bubble-body"><span class="bubble-from"><span>${esc(name)}</span><span class="bubble-count">${S.unread} tin chưa đọc</span></span><span class="bubble-text"></span></span>`;
    $(".bubble-text", b).textContent = text;
    b.onclick = () => openChat();
    b.onmouseenter = () => clearTimeout(bubbleTimer);
    b.onmouseleave = hideBubbleSoon;
    b.onfocus = () => clearTimeout(bubbleTimer);
    b.onblur = hideBubbleSoon;
    screen.appendChild(b);
    syncPeek();
    hideBubbleSoon();
  }
  function showFloat(from, emoji) {
    placeSpot();
    const old = $("#float");
    if (old) old.remove();
    const el = document.createElement("div");
    el.id = "float"; el.className = "float"; el.setAttribute("aria-hidden", "true");
    const shown = $("#bubble");
    if (shown) { el.classList.add("below"); el.style.top = rectOf(shown).y + rectOf(shown).h + 2 + "px"; }
    el.innerHTML = `<span class="float-emoji">${emoji}</span><span class="float-name">${esc(people()[from].name)}</span>`;
    screen.appendChild(el);
    syncPeek();
    el.addEventListener("animationend", () => { el.remove(); syncPeek(); });
  }
  function announce(text) {
    const live = $("#bubbleLive");
    if (live) live.textContent = text;
  }

  /* ── Actions ── */
  function appendMessage(m) {
    const pinned = nearBottom() || m.from === "me";
    S.messages.push(m);
    if (S.messages.length > 30) S.messages.shift();
    renderLog();
    if (pinned) toBottom();
    else { const p = $("#newPill"); if (p) p.hidden = false; }
  }
  function leaveEmpty() {
    if (!S.empty) return;
    S.empty = false;
    S.messages = [];
  }
  function incoming(kind, text) {
    leaveEmpty();
    const who = others()[S.inPool % others().length];
    S.inPool++;
    appendMessage({ from: who, kind, text });
    if (!S.open && !S.muted) {
      S.unread++;
      const name = people()[who].name;
      const count = $(".bubble-count");
      if (count) count.textContent = `${S.unread} tin chưa đọc`;
      if (kind === "emoji") { showFloat(who, text); announce(`${name}: ${EMOJI_NAME[text] || text}`); }
      else { showBubble(who, text); announce(`${name}: ${text}`); }
    }
    syncChat();
    measureLater();
  }
  function simulateMessage() {
    const [kind, text] = INCOMING[S.inPool % INCOMING.length];
    incoming(kind, text);
  }
  function simulateEmoji() {
    incoming("emoji", EMOJI[S.inPool % EMOJI.length][0]);
  }

  let pendingTimer = null;
  function trySend(kind, text) {
    if (offline() || S.pending || S.tooFast) return;
    const now = Date.now();
    S.sentAt = S.sentAt.filter((t) => now - t < 4000);
    if (S.sentAt.length >= 4) {
      S.tooFast = true; syncChat();
      setTimeout(() => { S.tooFast = false; syncChat(); }, 2500);
      return;
    }
    S.sentAt.push(now);
    S.pending = { kind, text };
    syncChat();
    if (S.failed) { settlePending(false); return; }
    if (S.sending) return; // Waits until the "Đang gửi" toggle goes off, as for a slow server.
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => settlePending(!S.failed), 550);
  }
  function settlePending(ok) {
    const p = S.pending;
    if (!p) return;
    S.pending = null;
    if (ok) {
      leaveEmpty();
      S.failed = false;
      S.failedItem = null;
      if (p.kind === "text") S.draft = "";
      appendMessage({ from: "me", kind: p.kind, text: p.text });
    } else {
      S.failedItem = p;
      S.failed = true;
    }
    syncChat();
    measureLater();
  }
  function retrySend() {
    const item = S.failedItem || { kind: "text", text: S.draft.trim() || "Ván này hay thật" };
    S.failed = false;
    S.failedItem = null;
    if (item.kind === "text") S.draft = item.text;
    syncChat();
    trySend(item.kind, item.text);
  }

  function openChat() {
    if (S.open) return;
    S.open = true;
    S.unread = 0;
    clearBubble();
    $("#chat").classList.add("is-open");
    layoutSheet();
    renderLog();
    toBottom();
    syncChat();
    // On a touch screen the input would pop the keyboard up over the board: the title takes the focus.
    const target = frame().layout === "desk" ? $("#chatInput") : $("#chatTitle");
    target.focus({ preventScroll: true });
    writeNotes();
    measureLater();
  }
  function closeChat() {
    if (!S.open) return;
    S.open = false;
    S.kb = false;
    $("#chat").classList.remove("is-open");
    layoutSheet();
    syncChat();
    const b = $("#chatBtn");
    if (b) b.focus({ preventScroll: true });
    writeNotes();
    measureLater();
  }

  /* ── Render a frame ── */
  function render() {
    const f = frame();
    screen.dataset.layout = f.layout;
    screen.dataset.dock = S.dock;
    screen.dataset.themeImg = S.theme;
    if (f.phase) screen.dataset.phase = f.phase; else delete screen.dataset.phase;
    screen.style.setProperty("--h", f.h + "px");
    if (f.lobby) { screen.setAttribute("data-lobby", ""); screen.removeAttribute("data-game"); }
    else { screen.removeAttribute("data-lobby"); screen.setAttribute("data-game", f.game); }
    device.style.width = f.w + "px";
    device.style.height = f.h + "px";
    const title = f.lobby ? "" : `<h1 style="margin:0;font:inherit;display:inline">${f.game === "chess" ? "Cờ vua" : "Cờ cá ngựa"}</h1>`;
    let html = `<div class="scroller" id="scroller">${topBar(title, !f.lobby)}`;
    html += f.lobby ? lobby() : `<main class="page"><div class="play" id="play">${f.game === "chess" ? chessPlay() : ludoPlay()}</div></main>`;
    html += `<div id="spacer"></div></div>`;
    html += `<div class="kb" aria-hidden="true">Bàn phím ảo (mô phỏng)</div><p class="sr-only" id="bubbleLive" role="status"></p><button type="button" class="peek" id="peek" hidden></button><div class="throw-layer" aria-hidden="true"><span>Đang tung xúc xắc</span></div>`;
    screen.innerHTML = html;
    // The panel sits in the grid beside the board on a desktop, over the screen elsewhere.
    const host = f.layout === "desk" && !f.lobby ? $("#play") : screen;
    host.insertAdjacentHTML("beforeend", chatMarkup());
    $("#chatTurn").textContent = f.lobby ? "" : $("#play [role=status]").textContent;
    S.messages = S.thirty ? thirtyMessages() : seedMessages();
    spacerH = 0;
    wire();
    fit();
    renderLog();
    if (S.open) { $("#chat").classList.add("is-open"); S.unread = 0; }
    layoutSheet();
    syncConn();
    syncChat();
    toBottom();
    syncThrow();
    syncPeek();
    measureLater();
    writeNotes();
  }
  const seedMessages = () => SEED[peopleKey()].map(([from, kind, text]) => ({ from, kind, text }));
  function thirtyMessages() {
    const out = [];
    const keys = others();
    const lines = SEED[peopleKey()];
    for (let i = 0; i < 30; i++) {
      const [, kind, text] = lines[i % lines.length];
      const from = i % 4 === 3 ? "me" : keys[(i >> 1) % keys.length];
      out.push({ from, kind, text: text === LONG ? `Tin số ${i + 1}` : text });
    }
    return out;
  }
  function syncConn() {
    const n = $("#notice");
    if (n) n.innerHTML = S.idle ? '<span class="notice-text">Đã tạm ngắt vì lâu không có hoạt động.</span><button type="button" class="btn btn-secondary btn-xs" data-resume>Tiếp tục</button>' : S.disconnected ? "Đang kết nối lại…" : "";
    document.querySelectorAll(".conn-slot").forEach((s) => { s.innerHTML = connChip(); });
    const slot = $("#claimSlot");
    if (slot) {
      slot.innerHTML = S.claim ? '<span class="claim-sub">Minh chưa đi · 5:04</span><button type="button" class="btn btn-primary btn-sm" data-claim>Xử thắng</button>' : "";
      $("#statusText").textContent = S.claim ? "Minh đã 5 phút chưa đi. Bạn có thể xử thắng." : (frame().game === "chess" ? "Minh vừa đi Mã g1 tới f3. Đến lượt bạn (Đen)" : "Đến lượt bạn (Đỏ)");
      $("#chatTurn").textContent = $("#statusText").textContent;
    }
  }
  function syncThrow() {
    const on = S.throwing && frame().game === "ludo" && !frame().lobby;
    screen.toggleAttribute("data-throwing", on);
    // As PlayScreen's `inert` while a board holds the screen.
    $("#chat").toggleAttribute("inert", on);
  }

  function wire() {
    $("#chatBtn").onclick = () => (S.open ? closeChat() : openChat());
    $("#chatClose").onclick = closeChat;
    $("#muteSwitch").onclick = () => { S.muted = !S.muted; if (S.muted) { S.unread = 0; clearBubble(); } syncChat(); };
    const input = $("#chatInput");
    input.oninput = () => {
      if (offline()) { input.value = S.draft; return; }
      S.draft = input.value.slice(0, MAX);
      syncComposer();
    };
    input.addEventListener("pointerdown", () => {
      if (frame().layout !== "desk" && !S.kb && !offline()) { S.kb = true; layoutSheet(); toBottom(); syncPanel(); writeNotes(); measureLater(); }
    });
    // Tapping send never takes the focus from the input, so the keyboard stays up.
    $("#send").addEventListener("mousedown", (e) => e.preventDefault());
    $("#send").addEventListener("touchend", (e) => {
      if (document.activeElement === input) { e.preventDefault(); $("#send").click(); }
    }, { passive: false });
    $("#composer").onsubmit = (e) => {
      e.preventDefault();
      const text = S.draft.trim();
      if (text) trySend("text", text);
    };
    $("#quick").addEventListener("click", (e) => {
      const b = e.target.closest("[data-quick]");
      if (b) trySend(b.dataset.quick, b.dataset.value);
    });
    $("#quick").addEventListener("wheel", (e) => {
      const q = e.currentTarget;
      if (q.scrollWidth > q.clientWidth && e.deltaY !== 0) { q.scrollLeft += e.deltaY; e.preventDefault(); }
    }, { passive: false });
    $("#log").addEventListener("scroll", () => { if (nearBottom()) { const p = $("#newPill"); if (p) p.hidden = true; } });
    // The pill goes as it is pressed: the focus moves to the list it scrolled, never to the page.
    $("#newPill").onclick = () => { toBottom(); $("#log").focus({ preventScroll: true }); };
    $("#scroller").addEventListener("scroll", () => { syncSpacer(); syncPeek(); measureLater(); });
    $("#peek").onclick = () => openChat();
    screen.querySelectorAll(".sq").forEach((sq) => {
      sq.onclick = () => { const was = sq.classList.contains("picked"); screen.querySelectorAll(".picked").forEach((x) => x.classList.remove("picked")); if (!was) sq.classList.add("picked"); };
    });
  }
  screen.addEventListener("click", (e) => {
    const t = e.target.closest("[data-resign], [data-resume]");
    if (!t) return;
    if (t.hasAttribute("data-resume")) setState("idle", false);
    else $("#resignDialog").showModal();
  });
  // Not modal, so anywhere on the page; an open dialog takes its own Esc first.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !S.open || $("#resignDialog").open) return;
    e.preventDefault();
    closeChat();
  });

  function fit() {
    const f = frame();
    if (bare) { device.dataset.scale = 1; device.style.transform = "none"; wrap.style.width = f.w + "px"; wrap.style.height = f.h + "px"; return; }
    const stage = $("#stage");
    const cs = getComputedStyle(stage);
    const w = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const scale = Math.min(1, w / f.w, innerWidth > 800 ? h / f.h : 1);
    device.dataset.scale = scale;
    device.style.transform = scale === 1 ? "none" : `scale(${scale})`;
    wrap.style.width = f.w * scale + "px";
    wrap.style.height = f.h * scale + "px";
  }
  addEventListener("resize", () => { fit(); layoutSheet(); measureLater(); });

  /* ── Measuring (also read by the Playwright check) ── */
  function rectOf(el) {
    const scale = scaleNow(), sr = screen.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: (r.left - sr.left) / scale, y: (r.top - sr.top) / scale, w: r.width / scale, h: r.height / scale };
  }
  const round = (n) => Math.round(n * 10) / 10;
  function measure() {
    const f = frame();
    const sc = $("#scroller");
    const out = {
      frame: S.frame, open: S.open, kb: S.kb, scrollTop: sc.scrollTop,
      pageScrollHeight: sc.scrollHeight, pageClientHeight: sc.clientHeight,
      chatBtn: (() => { const r = rectOf($("#chatBtn")); return { y: round(r.y), bottom: round(r.y + r.h), inView: chatButtonInView() }; })(),
      docScrollWidth: document.documentElement.scrollWidth, docClientWidth: document.documentElement.clientWidth,
      scrollerScrollWidth: sc.scrollWidth, scrollerClientWidth: sc.clientWidth,
    };
    const board = $("[data-board]");
    if (board) { const r = rectOf(board); out.board = { x: round(r.x), y: round(r.y), w: round(r.w), h: round(r.h) }; }
    const chat = $("#chat");
    const panel = S.open ? rectOf(chat) : null;
    if (panel) { out.chat = { x: round(panel.x), y: round(panel.y), w: round(panel.w), h: round(panel.h) }; out.logH = round(rectOf($("#log")).h); }
    const kbTop = f.h - kbHeight();
    const topBarH = parseFloat(getComputedStyle(screen).getPropertyValue("--top")) + 1;
    out.visible = [...screen.querySelectorAll("[data-lm]")].map((el) => {
      const r = rectOf(el);
      const isBar = el.matches(".topbar");
      let top = isBar ? 0 : topBarH;
      let bottom = Math.min(f.h, kbTop);
      if (panel && r.x + r.w > panel.x + 1 && r.x < panel.x + panel.w - 1) {
        if (f.layout === "phone") bottom = Math.min(bottom, panel.y);
        else if (!isBar) {
          // Beside the board: what the panel covers is taken off the top or the bottom of the item.
          if (panel.y <= r.y && panel.y + panel.h >= r.y + r.h) bottom = top;
          else if (panel.y <= r.y) top = Math.max(top, panel.y + panel.h);
          else bottom = Math.min(bottom, panel.y);
        }
      }
      const v = Math.max(0, Math.min(r.y + r.h, bottom) - Math.max(r.y, top));
      return { name: el.dataset.lm, visible: round(v), total: round(r.h) };
    });
    return out;
  }
  let measureQueued = false;
  function measureLater() {
    if (measureQueued) return;
    measureQueued = true;
    setTimeout(() => { measureQueued = false; writeMeasure(); }, 260);
  }
  function writeMeasure() {
    if (bare) return;
    const m = measure(), host = $("#measure");
    const rows = [["Rộng trang", `${m.scrollerScrollWidth} / ${m.scrollerClientWidth} px`]];
    if (m.board) rows.push(["Bàn cờ", `x ${m.board.x}, y ${m.board.y}, ${m.board.w}×${m.board.h}`]);
    if (m.chat) rows.push(["Panel chat", `${m.chat.w}×${m.chat.h} px, danh sách ${m.logH} px`]);
    host.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
    const vis = $("#visible");
    if (vis) vis.innerHTML = m.visible.map((v) => `<li><strong>${v.name}</strong>: ${v.visible >= v.total - 0.5 ? "thấy hết" : v.visible < 1 ? "bị che hoặc ngoài màn hình" : `thấy ${Math.round(v.visible)}/${Math.round(v.total)} px`}</li>`).join("");
  }

  const NOTES = {
    phone: "<p><strong>Điện thoại:</strong> nút Chat ở hàng nút của ván, vì thanh trên đã kín. Tấm chat cao 48% màn hình, thấp hơn nếu bàn cờ nằm thấp để luôn thấy ít nhất 96 px bàn (tối thiểu 240 px). Không có lớp mờ, trang phía trên vẫn bấm được. Khi mở, trang dài thêm ở phía dưới, nên tự cuộn được cả bàn cờ lên trên tấm chat mà bàn không bị đẩy.</p><p><strong>Bong bóng</strong> nằm ngay dưới thanh trên, ghi số tin chưa đọc, che thẻ Online, dòng lượt hoặc thẻ người chơi trong 4 giây, không bao giờ tới ô cờ hay nút gieo. Khi nút Chat đang ngoài màn hình, bong bóng để lại một thẻ nhỏ “Chat” kèm số.</p><p>Mở chat không tự bật bàn phím: focus vào tiêu đề, chạm ô nhập mới bật.</p>",
    land: "<p><strong>Ngang:</strong> tấm bên phải đè lên cột điều khiển, không bao giờ đè bàn cờ. Dòng lượt chép vào đầu tấm vì cột đang bị che. Khi có bàn phím, tấm phủ cả phần phải của thanh trên để đủ chỗ.</p>",
    desk: "<p><strong>Máy tính:</strong> panel nằm trong ô lưới, chiếm phần chữ phía trên điều khiển (Online, dòng lượt, thẻ người chơi), giữ nguyên xúc xắc, sổ ghi và hàng nút. Không thêm chiều cao nên không gì xê dịch. Dòng lượt chép vào đầu panel; nút cần ngay (Xử thắng) chép thành một dòng. Khi ván đã kết thúc, panel chuyển xuống dưới thẻ kết quả để giữ “Chơi lại”. Chọn “Dưới điều khiển” để so sánh.</p>",
    lobby: "<p><strong>Phòng chờ:</strong> nút Chat ở hàng tiêu đề, vì phòng chờ không có hàng nút. Điện thoại dùng cùng tấm chat; máy tính mở panel ở khoảng trống bên phải cột.</p>",
    kb: "<p><strong>Bàn phím bật:</strong> hàng gửi nhanh ẩn để nhường chỗ cho tin nhắn; các tin cuối và ô nhập luôn thấy. Danh sách dưới đây tính theo vị trí cuộn hiện tại.</p>",
  };
  function writeNotes() {
    const f = frame();
    let html = "";
    if (f.lobby) html += NOTES.lobby;
    if (!(f.lobby && f.layout === "desk")) html += NOTES[f.layout];
    if (S.kb) html += NOTES.kb;
    $("#notes").innerHTML = html + '<ul id="visible"></ul>';
    $("#dockSet").style.display = f.layout === "desk" && !f.lobby ? "" : "none";
    $("#scrollBtns").style.display = f.layout === "desk" ? "none" : "";
    $("#kb").disabled = f.layout === "desk";
    measureLater();
  }

  /* ── The control panel ── */
  function syncPanel() {
    $("#pToggle").textContent = S.open ? "Đóng chat" : "Mở chat";
    $("#kb").checked = S.kb;
    const quickFail = S.failed && S.failedItem !== null && S.failedItem.kind !== "text";
    document.querySelectorAll("[data-state]").forEach((c) => {
      const n = c.dataset.state;
      c.checked = n === "failedQuick" ? quickFail : n === "failed" ? S.failed && !quickFail : S[n];
    });
  }
  function setTheme(t) { S.theme = t; document.documentElement.setAttribute("data-theme", t); screen.dataset.themeImg = t; const r = document.querySelector(`input[name=theme][value=${t}]`); if (r) r.checked = true; }
  function setReduced(v) { S.reduced = v; document.documentElement.toggleAttribute("data-reduced", v); $("#reduced").checked = v; }
  function setState(name, value) {
    if (name === "failedQuick") {
      S.failed = value;
      S.failedItem = value ? { kind: "preset", text: "Chơi hay đấy" } : null;
      S.pending = null;
      syncChat(); measureLater();
      return;
    }
    const was = S[name];
    S[name] = value;
    if (name === "throwing") syncThrow();
    if (name === "idle" || name === "claim") syncConn();
    if (name === "muted" && value) { S.unread = 0; clearBubble(); }
    if (name === "disconnected") syncConn();
    if (name === "empty") renderLog();
    if (name === "thirty") {
      S.messages = value ? thirtyMessages() : seedMessages();
      S.empty = false;
      renderLog(); toBottom();
    }
    if (name === "sending") {
      if (value) {
        if (!S.draft.trim()) S.draft = "Ván này hay thật";
        if (!S.pending) S.pending = { kind: "text", text: S.draft.trim() };
        clearTimeout(pendingTimer);
      } else if (was && S.pending) settlePending(true);
    }
    if (name === "failed") {
      if (value) { if (!S.draft.trim()) S.draft = "Ván này hay thật"; S.pending = null; S.failedItem = { kind: "text", text: S.draft.trim() }; }
      else S.failedItem = null;
    }
    syncChat();
    measureLater();
  }

  const framesHost = $("#frames");
  framesHost.innerHTML = Object.entries(FRAMES).map(([id, f]) => `<label><input type="radio" name="frame" value="${id}"> ${f.label}</label>`).join("");
  framesHost.addEventListener("change", (e) => { setFrame(e.target.value); });
  function setFrame(id) {
    S.frame = id;
    const r = document.querySelector(`input[name=frame][value="${id}"]`);
    if (r) r.checked = true;
    S.kb = false;
    S.pending = null;
    if (!S.sending && !S.failed) S.draft = "";
    clearBubble();
    render();
  }
  document.querySelectorAll("input[name=theme]").forEach((r) => r.addEventListener("change", () => setTheme(r.value)));
  $("#reduced").addEventListener("change", (e) => setReduced(e.target.checked));
  $("#pToggle").onclick = () => (S.open ? closeChat() : openChat());
  $("#pIncoming").onclick = simulateMessage;
  $("#pEmoji").onclick = simulateEmoji;
  $("#pTop").onclick = () => { $("#scroller").scrollTop = 0; };
  $("#pBottom").onclick = () => { $("#scroller").scrollTop = 1e5; };
  $("#kb").addEventListener("change", (e) => {
    S.kb = e.target.checked;
    if (S.kb && !S.open) openChat();
    layoutSheet(); toBottom(); writeNotes();
  });
  document.querySelectorAll("[data-state]").forEach((c) => c.addEventListener("change", () => setState(c.dataset.state, c.checked)));
  document.querySelectorAll("input[name=dock]").forEach((r) => r.addEventListener("change", () => { S.dock = r.value; screen.dataset.dock = S.dock; renderLines(); measureLater(); }));

  // For the check script: the same actions as the panel.
  window.__mock = {
    S, measure, setFrame, setTheme, setReduced, setState, openChat, closeChat, simulateMessage, simulateEmoji,
    setDock(v) { S.dock = v; screen.dataset.dock = v; renderLines(); const r = document.querySelector(`input[name=dock][value=${v}]`); if (r) r.checked = true; },
    setKb(v) { S.kb = v; if (v && !S.open) openChat(); layoutSheet(); toBottom(); syncPanel(); writeNotes(); },
    scroll(v) { $("#scroller").scrollTop = v; },
  };

  const q = new URLSearchParams(location.search);
  setReduced(q.has("reduced") || matchMedia("(prefers-reduced-motion: reduce)").matches);
  setTheme(q.get("theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  setFrame(q.get("frame") && FRAMES[q.get("frame")] ? q.get("frame") : "chess-360");
})();
