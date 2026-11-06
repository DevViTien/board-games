/*
 * The positions the frames open on. Each is a real position of the rules: `scene()` checks every
 * fence against the others when it is built and throws if one is illegal.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(typeof FenceRules !== "undefined" ? FenceRules : root.FenceRules);
  else root.FenceScenes = factory(root.FenceRules);
})(typeof self !== "undefined" ? self : this, function (R) {
  "use strict";

  const h = (x, y, by = 0) => ({ o: "h", x, y, by });
  const v = (x, y, by = 0) => ({ o: "v", x, y, by });

  function position(n, { pieces, walls = [], left, breaks, turn = 0, ply, last = null, result = null }) {
    const g = R.newGame(n);
    if (pieces) g.pieces = pieces.map(([x, y]) => ({ x, y }));
    // Laid one by one, so an overlap, a crossing or a sealed way among them fails here.
    for (const w of walls) {
      const seat = 0;
      const probe = { ...g, left: g.left.map(() => 9) };
      const why = R.fenceProblem(probe, w, seat);
      if (why) throw new Error(`scene fence ${w.o}${R.fenceName(w)}: ${why.code}`);
      g.walls.push(w);
    }
    if (left) g.left = left;
    else g.left = g.left.map((l, seat) => l - walls.filter((w) => w.by === seat).length);
    if (breaks) g.breaks = breaks;
    g.turn = turn;
    g.ply = ply === undefined ? walls.length * 2 + 3 : ply;
    g.last = last;
    g.result = result;
    return g;
  }

  /* The middle of a two-player game: Lan to move, Minh walks straight down. */
  const MIDDLE = () => position(2, {
    pieces: [[4, 3], [2, 6]],
    walls: [h(1, 8, 0), h(3, 4, 1), h(3, 2, 1), h(5, 6, 0), h(6, 4, 1), v(0, 8, 1), v(7, 0, 0), h(0, 4, 0)],
    last: { kind: "step", seat: 1, from: { x: 2, y: 7 }, to: { x: 2, y: 6 } },
    ply: 19,
  });

  /* Minh in a pocket at the right edge, one way out left. */
  const POCKET = () => position(2, {
    pieces: [[3, 4], [8, 4]],
    walls: [h(7, 5, 0), h(7, 3, 0), h(2, 7, 1), h(4, 1, 1), v(1, 2, 1)],
    last: { kind: "step", seat: 1, from: { x: 8, y: 5 }, to: { x: 8, y: 4 } },
    ply: 13,
  });

  const LATE_WALLS = [
    h(0, 8, 0), h(2, 8, 1), v(3, 7, 0), h(5, 6, 1), h(7, 6, 0), v(4, 5, 1), h(1, 5, 1),
    h(3, 3, 0), v(5, 2, 1), h(6, 2, 0), v(1, 2, 0), h(0, 1, 1), v(7, 8, 1),
  ];

  /* Late in a two-player game: many fences, the last just placed by Minh. */
  const LATE = () => position(2, {
    pieces: [[6, 7], [2, 4]],
    walls: LATE_WALLS,
    left: [2, 3],
    breaks: [1, 0],
    turn: 0,
    ply: 41,
    last: { kind: "fence", seat: 1, fence: LATE_WALLS[8] },
  });

  /* The same game a move later: Minh broke a fence instead. */
  const BROKE = () => {
    const gone = LATE_WALLS[3];
    return position(2, {
      pieces: [[6, 7], [2, 4]],
      walls: LATE_WALLS.filter((w) => w !== gone),
      left: [2, 3],
      breaks: [1, 0],
      turn: 0,
      ply: 41,
      last: { kind: "break", seat: 1, fence: gone },
    });
  };

  const FOUR_WALLS = [h(3, 4, 0), v(5, 4, 1), h(1, 6, 1), v(2, 2, 2), h(5, 1, 3), h(6, 6, 2), v(1, 4, 3), h(3, 6, 0)];

  /* The middle of a four-player game. */
  const FOUR = (turn, last) => position(4, {
    pieces: [[4, 3], [2, 5], [5, 6], [6, 3]],
    walls: FOUR_WALLS,
    left: [2, 2, 2, 2],
    breaks: [1, 1, 0, 1],
    turn,
    ply: 22,
    last,
  });

  const ONLINE = (turn, last) => position(2, {
    pieces: [[4, 7], [3, 4]],
    walls: [h(3, 6, 1), h(1, 2, 0), v(5, 4, 1), h(5, 3, 0), v(2, 7, 1), h(0, 5, 0)],
    turn,
    ply: 16,
    last,
  });

  const SCENES = [
    { id: "start2", group: "Ván 2 người, 11 × 9", label: "Đầu ván", names: ["Lan", "Minh"], g: () => R.newGame(2),
      note: "Đầu ván có câu mục tiêu ở dòng dưới bàn, theo màu và hướng của người đến lượt; hết vòng đầu thì thôi." },
    { id: "move2", group: "Ván 2 người, 11 × 9", label: "Đi quân", names: ["Lan", "Minh"],
      g: () => position(2, {
        pieces: [[4, 2], [4, 8]],
        walls: [h(3, 6, 0), v(5, 3, 1)],
        last: { kind: "step", seat: 1, from: { x: 4, y: 9 }, to: { x: 4, y: 8 } },
        ply: 7,
      }),
      note: "Ô đi được có chấm, một chạm là đi. Hình vuông nét đứt là ô Minh vừa rời. Cổng của người đến lượt có màu đặc, cổng kia nhạt." },
    { id: "place2", group: "Ván 2 người, 11 × 9", label: "Đặt rào, hợp lệ", names: ["Lan", "Minh"], g: MIDDLE, mode: "place", preview: { o: "h", x: 1, y: 2 },
      note: "Rào xem trước màu nhấn, có hai đầu tròn để nhận ra đang cầm. Chạm gần đường kẻ nào thì rào nằm trên đường đó; chạm lại đúng rào để xoay; kéo ở đâu rào cũng đi theo, giữ nguyên hướng. Hàng nút đổi thành Xoay, Huỷ, Đặt rào. Chấm là đường mới của người bị dài ra." },
    { id: "bad-sealed", group: "Ván 2 người, 11 × 9", label: "Rào không hợp lệ: bịt kín", names: ["Lan", "Minh"], g: POCKET, mode: "place", preview: { o: "v", x: 6, y: 4 },
      note: "Không hợp lệ thì khác hình: rỗng, gãy đôi, có dấu ✕ ở giữa, không chỉ khác màu. Nút Đặt rào nét đứt và không bấm được." },
    { id: "bad-overlap", group: "Ván 2 người, 11 × 9", label: "Rào không hợp lệ: đè", names: ["Lan", "Minh"], g: MIDDLE, mode: "place", preview: { o: "h", x: 4, y: 4 } , note: "Đè lên một đoạn của rào đã có." },
    { id: "bad-cross", group: "Ván 2 người, 11 × 9", label: "Rào không hợp lệ: cắt", names: ["Lan", "Minh"], g: MIDDLE, mode: "place", preview: { o: "v", x: 3, y: 4 }, note: "Cùng trung điểm với một rào nằm khác hướng." },
    { id: "bad-none", group: "Ván 2 người, 11 × 9", label: "Hết rào", names: ["Lan", "Minh"],
      g: () => { const g = MIDDLE(); g.left = [0, 3]; g.breaks = [0, 1]; return g; }, tried: "place",
      note: "Hết rào, đã phá: hai thẻ vẫn thấy, nét đứt, có lý do. Chạm vào thẻ thì lý do hiện ở dòng đọc." },
    { id: "break2", group: "Ván 2 người, 11 × 9", label: "Phá rào", names: ["Lan", "Minh"], g: MIDDLE, mode: "break", sel: { o: "h", x: 3, y: 4 },
      note: "Chạm đâu cũng chọn rào gần nhất. Rào được chọn có viền và vết nứt. Dòng đọc cho biết đường ngắn đi bao nhiêu." },
    { id: "share2", group: "Ván 2 người, 11 × 9", label: "Hai quân chung ô", names: ["Lan", "Minh"],
      g: () => position(2, {
        pieces: [[4, 5], [4, 5]],
        walls: [h(3, 7, 0), v(5, 5, 1), h(1, 3, 1)],
        last: { kind: "step", seat: 1, from: { x: 4, y: 6 }, to: { x: 4, y: 5 } },
        ply: 11,
      }),
      note: "Hai nón nhỏ lại, chéo nhau trong ô, vẫn thấy ● và ■. Vòng đen là người đến lượt." },
    { id: "mid2", group: "Ván 2 người, 11 × 9", label: "Giữa ván, nhiều rào", names: ["Lan", "Minh"], g: LATE,
      note: "13 rào. Viền nét đứt là rào Minh vừa đặt." },
    { id: "broke2", group: "Ván 2 người, 11 × 9", label: "Vừa bị phá rào", names: ["Lan", "Minh"], g: BROKE,
      note: "Chỗ rào vừa bị phá còn lại một đường viền nét đứt tới nước sau. Dòng đọc nói Minh vừa phá ở đâu." },
    { id: "mid4", group: "Ván 4 người, 9 × 9", label: "Giữa ván", names: ["Lan", "Minh", "An", "Hà"], g: () => FOUR(0, { kind: "fence", seat: 3, fence: FOUR_WALLS[4] }),
      note: "Bốn cổng, mỗi cổng 5 ô giữa một cạnh, là đích của một người. Cùng máy nên không quay bàn." },
    { id: "rot4", group: "Ván 4 người, 9 × 9", label: "Đã loại: quay 90° cho ghế thứ hai", names: ["Lan", "Bạn", "An", "Hà"], viewer: 1, online: true, rot90: true,
      g: () => FOUR(1, { kind: "step", seat: 0, from: { x: 4, y: 2 }, to: { x: 4, y: 3 } }),
      note: "Ghế thứ hai xuất phát ở cạnh trái, bàn quay 90° để quân của bạn ở phía dưới. Tên hàng cột đi theo bàn: cạnh dưới là số, cạnh trái là chữ. Đã loại, so với trạng thái kế." },
    { id: "norot4", group: "Ván 4 người, 9 × 9", label: "Ghế thứ hai online, không quay (đã chốt)", names: ["Lan", "Bạn", "An", "Hà"], viewer: 1, online: true,
      g: () => FOUR(1, { kind: "step", seat: 0, from: { x: 4, y: 2 }, to: { x: 4, y: 3 } }),
      note: "Phương án như Cờ cá ngựa: bàn giữ nguyên cho mọi người. Quân của bạn ở cạnh trái, cổng của bạn là cổng màu xanh dương ■ ở cạnh phải." },
    { id: "share4", group: "Ván 4 người, 9 × 9", label: "Bốn quân chung một ô", names: ["Lan", "Minh", "An", "Hà"],
      g: () => position(4, { pieces: [[4, 4], [4, 4], [4, 4], [4, 4]], walls: [h(3, 5, 0), v(5, 3, 1), h(1, 2, 2)], left: [3, 3, 3, 4], ply: 18, last: { kind: "step", seat: 3, from: { x: 5, y: 4 }, to: { x: 4, y: 4 } } }),
      note: "Bốn nón nhỏ, bỏ đường khâu, ký hiệu lớn hơn. Khung vuông quanh ô là người đến lượt có mặt ở đó, vì vòng tròn sẽ che quân bên cạnh." },
    { id: "wait2", group: "Online", label: "Đợi đối thủ", names: ["Minh", "Bạn"], viewer: 1, online: true, waitForever: true,
      g: () => ONLINE(0, { kind: "fence", seat: 1, fence: v(5, 4, 1) }),
      note: "Bàn đã quay 180° cho ghế thứ hai. Thẻ chế độ nét đứt, lý do là chưa tới lượt. Chat và Đầu hàng ở hàng nút như các game online." },
    { id: "online2", group: "Online", label: "Đến lượt, đã quay bàn", names: ["Minh", "Bạn"], viewer: 1, online: true,
      g: () => ONLINE(1, { kind: "fence", seat: 0, fence: h(5, 3, 0) }),
      note: "Dòng lượt nói nước vừa đi. Bàn phím: mũi tên theo hướng trên màn hình dù bàn đã quay." },
    { id: "sending2", group: "Online", label: "Rào đang gửi", names: ["Minh", "Bạn"], viewer: 1, online: true, waitForever: true, slow: true,
      g: () => ONLINE(1, { kind: "fence", seat: 0, fence: h(5, 3, 0) }), mode: "place", preview: { o: "h", x: 3, y: 2 },
      note: "Bấm Đặt rào: rào hiện ngay như rào đã đặt, không nháy trong lúc chờ máy chủ; dòng dưới bàn nói Đang gửi…, bàn khoá. Mô phỏng chậm 1,5 giây." },
    { id: "win2", group: "Kết thúc", label: "Thắng vì về đích", names: ["Lan", "Minh"],
      g: () => position(2, {
        pieces: [[5, 10], [3, 3]],
        walls: [h(3, 6, 0), v(5, 3, 1), h(5, 8, 1), h(1, 4, 0), v(2, 7, 1), h(6, 4, 1), h(3, 1, 0)],
        ply: 47,
        turn: 1,
        last: { kind: "step", seat: 0, from: { x: 5, y: 9 }, to: { x: 5, y: 10 } },
        result: { kind: "win", winners: [0], reason: "goal", at: "F11", ply: 47 },
      }),
      note: "Thẻ kết quả thay dòng lượt. Ô về đích có khung và bốn ngôi sao, quân thắng có vòng, cổng của người thắng đặc. Thanh chế độ biến mất, hàng nút vẫn còn." },
    { id: "draw2", group: "Kết thúc", label: "Hoà vì hết lượt", names: ["Lan", "Minh"],
      g: () => { const g = position(2, {
        pieces: [[4, 7], [6, 3]],
        walls: LATE_WALLS.slice(0, 8),
        left: [0, 0],
        breaks: [0, 0],
        ply: 200,
      }); const steps = R.stepsOf(g); g.result = { kind: "draw", tied: [0, 1], reason: "turn-limit", steps }; return g; },
      note: "Nước thứ 200 vừa xong. Số bước lấy từ tìm đường thật." },
    { id: "limit2", group: "Kết thúc", label: "Thắng vì hết lượt", names: ["Lan", "Minh"],
      g: () => { const g = position(2, {
        pieces: [[4, 8], [6, 7]],
        walls: LATE_WALLS.slice(0, 8),
        left: [0, 0],
        breaks: [0, 0],
        ply: 200,
      }); const steps = R.stepsOf(g); g.result = { kind: "win", winners: [0], reason: "turn-limit", steps }; return g; },
      note: "Spec: \"Lan thắng vì gần đích hơn khi hết lượt\"." },
    { id: "start3", group: "Khác", label: "Ván 3 người", names: ["Lan", "Minh", "An"], g: () => R.newGame(3),
      note: "Thứ tự ghế: dưới, trên, trái. Cạnh trái không có cổng của ai. Hết lượt ở nước 198." },
    { id: "menu", group: "Khác", label: "Thẻ trên menu", kind: "menu", note: "Artwork 120 × 120 như các game khác: một góc đồng với dải cổng, một rào, hai nón." },
    { id: "rules", group: "Khác", label: "Trang luật", kind: "rules", note: "Ba hình theo spec game-rules: đặt rào, rào bị cấm vì bịt kín đường, phá rào. Số bước trong hình tính bằng luật thật." },
  ];

  return { SCENES, position, h, v };
});
