# Design

## Context

Cờ tướng là game hai người theo lượt, không ngẫu nhiên, như Cờ vua. Khung sẵn có đã đủ:

- engine với `GameDefinition` và máy tìm kiếm alpha-beta chung (`chooseMove`: đào sâu dần trong thời gian cho phép, dựa trên `evaluate` và `candidateMoves`);
- transport cùng máy, đấu với máy, online;
- màn hình chơi chung, có thanh người chơi trên và dưới bàn (`BoardParts.seatOrder`, như Cờ vua).

Khác Cờ vua:

- quân đứng trên giao điểm, không trong ô;
- có sông và cung;
- luật riêng: cản chân Mã, cản mắt Tượng, ngòi Pháo, lộ mặt Tướng, hết nước là thua, chiếu dai;
- **luật tự viết** (Cờ vua dùng `chess.js`); không có thư viện cờ tướng nào được thêm.

Thư mục bị ảnh hưởng, theo chiều phụ thuộc của plan.md §3.2:

- `packages/games/src/xiangqi/`: luật thuần, chỉ phụ thuộc `engine`;
- `apps/web/src/games/xiangqi/`;
- mỗi registry một dòng;
- `apps/web/messages`.

## Goals / Non-Goals

**Goals:**

- Luật đúng và được kiểm bằng **perft** (đếm số nước ở độ sâu cố định từ các thế chuẩn, so với số đã công bố).
- Ván luôn kết thúc.
- Màn hình đi cùng khuôn với Cờ vua: chọn quân, đánh dấu, thanh người chơi, sổ nước, lật bàn.
- Đọc được bằng trình đọc màn hình, đi được bằng bàn phím.

**Non-Goals:** đuổi dai, biến thể, đề nghị hoà, đồng hồ, máy mạnh có sách khai cuộc (proposal, Ngoài phạm vi).

## Decisions

### 1. State và nước đi

```ts
type Piece = "K" | "A" | "E" | "H" | "R" | "C" | "P" | "k" | "a" | "e" | "h" | "r" | "c" | "p"; // uppercase: Đỏ
interface XiangqiState {
  board: readonly (Piece | null)[]; // 90 points, index = y * 9 + x, y 0 = Đen's back rank
  toMove: PlayerIndex; // 0 Đỏ, 1 Đen
  quiet: number; // moves in a row without a capture
  history: readonly HistoryStep[]; // since the last capture: position key, and whether the move gave check
  ending: {
    reason: "checkmate" | "stalemate" | "perpetual-check" | "repetition" | "quiet";
    loser: PlayerIndex | null;
  } | null;
}
type XiangqiMove = { from: number; to: number };
```

- **Bàn là mảng 90 điểm.** Sinh nước dùng hướng đi theo `(x, y)`.
- **`history`** chỉ giữ các thế từ lần ăn quân cuối: sau một nước ăn quân, không thế nào trước đó lặp lại được nữa. Dài nhất 120 bước, vì luật 120 nước không ăn quân.
- **Khoá thế cờ** là chuỗi 90 ký tự cộng bên đến lượt.
- **`ending`** được tính trong `applyMove`, nên `result` chỉ đọc lại.
- **Chiếu dai.** Tại lần lặp thứ ba, xét các bước từ lần đầu thế đó xuất hiện:
  - đúng một bên có mọi nước là nước chiếu thì bên đó thua;
  - còn lại thì hoà.
- **Nước của máy và của người** đều là `{from, to}`. `moveKey` là `"from-to"`.

### 2. Luật và kiểm tra

- **Sinh nước giả hợp lệ theo quân**, rồi lọc bỏ các nước để Tướng mình bị chiếu hoặc làm hai Tướng đối mặt.
- **Chiếu** được xét bằng cách nhìn ngược từ Tướng: Xe/Tướng trên cột và hàng, Pháo với đúng một ngòi, Mã với chân Mã tính từ phía Mã, Tốt phía trước và hai bên.
- **Perft** từ thế mở đầu:

  | Độ sâu | Số nước                           |
  | ------ | --------------------------------- |
  | 1      | 44                                |
  | 2      | 1.920                             |
  | 3      | 79.666                            |
  | 4      | 3.290.240 (test chậm, chạy riêng) |

  Kèm vài thế có đủ cản chân, cản mắt, ngòi Pháo và lộ mặt Tướng, đối chiếu số đã công bố.

- **`describeGameContract`** với ván ngẫu nhiên: luật 120 nước không ăn quân bảo đảm ván kết thúc. Đặt `maxPlies` theo số tối đa thật (khoảng 32 lần ăn × 120).
- **Test theo từng scenario** của spec, kể cả chiếu dai và lặp lại không chiếu.

### 3. Ký hiệu Việt Nam

Nước được ghi bằng chữ của quân, cột theo bên đi, dấu và đích:

- chữ của quân: Tg, S, T, M, X, P, B;
- cột đếm từ phải sang trái theo hướng nhìn của bên đi;
- dấu: "." tiến, "/" thoái, "-" bình;
- đích:
  - Tướng, Xe, Pháo, Tốt đi thẳng: số bước;
  - bình, và nước chéo của Sĩ, Tượng, Mã: cột tới.

Khi hai quân cùng loại đứng trên một cột, quân phía trước thêm "t" và quân phía sau thêm "s" sau chữ quân ("Pt-5"). Ba quân cùng loại trên một cột ghi "t", "g", "s". Khi vậy vẫn chưa đủ phân biệt thì sau dấu ghi thêm cột: Tốt hai cột cùng có từ hai Tốt ("Bt7.1"), hoặc bốn Tốt trở lên trên một cột, ghi thứ tự từ trước ra sau ("B27.1"). Có test riêng; trình đọc màn hình đọc "Tốt trước cột 7 tiến 1".

**Đọc to** (`useMoveLabel`) dùng tên đầy đủ: "Pháo cột 2 bình sang cột 5", "Mã cột 8 tiến lên cột 7", "Xe cột 1 thoái 1".

### 4. Máy

`evaluate` (số nguyên, nhìn từ một bên) gồm:

- **giá trị quân**: Xe 900, Pháo 450, Mã 400, Tượng 200, Sĩ 200, Tốt 100; Tốt qua sông 200 và tăng dần khi tới gần cung;
- **bảng vị trí nhỏ** cho Mã và Pháo (Mã ở giữa bàn tốt hơn ở góc; Pháo đầu);
- **cộng nhẹ cho số nước đi được** của Xe.

`candidateMoves` là mọi nước hợp lệ, xếp theo thứ tự: ăn quân giá trị cao bằng quân giá trị thấp trước, rồi nước chiếu, rồi các nước khác. Hợp đồng đòi giữ mọi nước thắng ngay và mọi nước chặn đối thủ thắng ngay; vì giữ đủ mọi nước nên luôn đúng. Thứ tự tốt giúp alpha-beta cắt nhiều hơn.

Các mức dùng `LEVEL_PROFILES` chung:

- Dễ: độ sâu 1 và 40% nước ngẫu nhiên;
- Vừa: độ sâu 2, nên thấy chiếu bí ngay và ăn quân treo;
- Khó: đào sâu tới hết 1,5 giây.

Đo ngày 13/11/2026 ở một thế sau 14 nước: mức Vừa 5 ms; mức Khó dùng đủ 1,5 giây và xét khoảng 66 nghìn thế. Máy chạy trong Web Worker nên không làm đứng màn hình.

### 5. Chữ Hán trên quân

Quân vẽ bằng SVG, chữ là `<text>`. Phông là phông chữ Nhật đang có của app (Noto Sans JP, `next/font`), vì Google Fonts chia phông CJK theo `unicode-range`, nên chỉ phần chứa các chữ cần dùng được tải.

**Đã kiểm ngày 13/11/2026** trên dải ký tự các lát phông của bản build: Noto Sans JP có 13 chữ nhưng **thiếu 傌** (U+508C). Vì vậy mặt quân dùng **Noto Serif TC** (đậm 900, `next/font/google`, `preload: false`, khai báo ở layout gốc `app/layout.tsx` thành biến `--font-xiangqi`: `next/font` chỉ chạy khi Next biên dịch, gọi trong module của game làm hỏng Vitest. Phông chia lát theo `unicode-range` nên chỉ tải khi trang có các chữ này: bàn hoặc luật Cờ tướng), đúng phông của mockup đã duyệt. Không thêm thư viện: phông đến từ Google Fonts qua `next/font` sẵn có.

**Kiểm khi code** (ban đầu): Noto Sans JP phải có đủ 14 chữ 帥 仕 相 傌 俥 炮 兵 將 士 象 馬 車 砲 卒. 俥 (U+4FE5) và 傌 (U+508C) là hai chữ hiếm.

Nếu thiếu, thêm **Noto Serif TC** chỉ cho mặt quân, đậm 900, kèm:

- **Khai báo trong design**: phông này không có subset `vietnamese`, nhưng không dùng cho chữ Việt nào. Skill `board-games-ui` đòi subset `vietnamese` cho phông mới; mặt quân là ngoại lệ, ghi lý do tại đây.
- **Ảnh chụp**: mọi chữ hiện đúng ở cả sáng lẫn tối.

Chữ Hán là hình của quân, không phải chữ cần dịch. Tên đọc được của mỗi quân luôn bằng ngôn ngữ đang dùng: "Pháo đỏ", "Red cannon", 「赤の炮」.

### 6. Màn hình chơi

**Bàn SVG**:

- **Khung**: viewBox 9 × 10 giao điểm, lề đủ chỗ cho số cột trên và dưới (mockup).
- **Giao điểm**: mỗi giao điểm là một `<button>` trong lưới `role="grid"`. Ô bấm là hình vuông quanh giao điểm, bằng 1/9 chiều rộng bàn: khoảng 36 px ở màn 360 px, trên 24 px tối thiểu.
- **Lật bàn**: khi lật, vẽ theo thứ tự ngược, như Cờ vua.

**Chọn và đi quân**: dùng lại cách của Cờ vua (`use-selection`, `use-roving-focus` viết lại cho 9 × 10):

- chấm ở điểm trống đi được, góc ngoặc quanh quân ăn được;
- quân đang chọn có vòng `--game-highlight`;
- nước vừa đi là vòng đứt ở điểm đi và quanh quân vừa đi;
- Tướng bị chiếu tô sáng `--xiangqi-check`.

**Thanh người chơi** (`seatOrder`): hình Tướng của bên, và số điểm hơn quân theo giá trị Xe 9, Pháo 5, Mã 4, Tượng 2, Sĩ 2, Tốt 1.

**Sổ ghi nước**: như `MoveSheet` của Cờ vua, với ký hiệu Việt Nam.

**Lật bàn**: một nút cạnh sổ, ở mọi chế độ như Cờ vua.

**Tên giao điểm** (trình đọc màn hình): "Pháo đỏ ở cột 2, hàng 3".

- Cột đếm theo bên Đỏ, 1–9 từ phải sang trái, khớp số in ở mép dưới khi Đỏ ở dưới.
- Hàng 1–10 tính từ phía Đỏ.
- Khi lật bàn, tên giữ nguyên theo bên Đỏ để không đổi nghĩa giữa chừng. Số in ở mép bàn thì đổi theo bên ở dưới.

### 7. Token (sáng / tối)

Giá trị nằm trong `apps/web/src/games/xiangqi/theme.css`. Tỉ số tương phản do `theme-css.test.ts` kiểm, ghi vào bảng sau khi đo.

| Biến                  | Vai trò                | Sáng    | Tối     |
| --------------------- | ---------------------- | ------- | ------- |
| `--game-board`        | gỗ                     | #e8c992 | #3a2c1c |
| `--game-line`         | đường kẻ, sông, số cột | #5b3a1a | #e2c391 |
| `--game-mark-1`       | chữ Đỏ                 | #b3261e | #ff7b6e |
| `--game-mark-2`       | chữ Đen                | #1d1b1a | #f1e6d2 |
| `--xiangqi-disc`      | mặt quân               | #f7ebd0 | #2c241a |
| `--xiangqi-disc-edge` | viền quân              | #7b5530 | #d9b27a |
| `--game-highlight`    | quân đang chọn         |         |         |
| `--xiangqi-target`    | chấm và góc ngoặc      | #1f6f43 | #7fe0a8 |
| `--game-last-move`    | nước vừa đi            | #2c5d8f | #8cc0ff |
| `--xiangqi-check`     | Tướng bị chiếu         | #d62d20 | #ff6b5e |

Chữ của hai bên trên mặt quân phải đạt 4,5:1.

### 8. Kiểm tra

- **Luật**:
  - perft;
  - các scenario của spec;
  - `describeGameContract`;
  - ký hiệu (kể cả "t"/"s" và ba Tốt cùng cột);
  - chiếu dai và lặp lại;
  - ván 120 nước.
- **Máy**:
  - luôn đi nước hợp lệ;
  - mức Vừa thấy chiếu bí trong một nước và ăn Xe treo;
  - đo thời gian một nước Khó.
- **Component**: chọn và đi quân, bàn phím, tên đọc được, chiếu, sổ ghi, lật bàn, thanh người chơi.
- **E2E**:
  - cùng máy chơi một ván ngắn tới chiếu bí;
  - đấu với máy;
  - online hai trình duyệt;
  - điện thoại 360 px.
- **Ảnh**: `pnpm ui:shots` sáng/tối × 390/1280 và 360 px, so với mockup.

## Mockup

`mockup/index.html`, ảnh trong `mockup/png/`, gồm sáu cảnh:

- màn bắt đầu ván;
- đầu ván;
- chọn Pháo đầu (4 điểm đi được, ăn Tốt qua ngòi);
- Đen bị chiếu;
- chiếu bí và thẻ kết quả;
- đấu với máy, máy đang nghĩ.

Mockup có bộ sinh nước nhỏ, nên chấm và góc ngoặc là tính thật. Chữ Hán trong mockup dùng Noto Serif TC để xem hình. Code dùng phông theo §5.

Cảnh `play` chơi được (hai người cùng máy, đủ luật kết thúc ván của spec). Bộ sinh nước của mockup ra đúng perft 44 / 1.920 / 79.666; chơi thử bằng Playwright: P2-5 rồi hoàn tác, Mã đi qua đi lại ba lần ra "Hoà! Lặp lại ba lần.", Xe chiếu qua chiếu lại ra "Đen thắng! Đỏ chiếu dai."; không lỗi console. Lỗi tìm được khi chơi thử và đã sửa: hình quân ở màn bắt đầu ván thành chấm đen (thiếu biến màu của game), dòng hơn quân ghi sai (nay tính từ quân còn lại), icon sách và lật bàn là ký tự font không có (nay vẽ bằng SVG).

Người dùng duyệt ngày 13/11/2026 ("duyệt thực hiện, hãy implement đi"), không điều chỉnh.

## Khác thiết kế

Những chỗ code đi khác mockup hoặc bản nháp đầu, đã sửa theo trong spec:

- Nhãn "Chiếu!" nằm **dưới bàn**, cùng chỗ với lời gợi ý, như Cờ vua; không đè lên thanh người chơi.
- Nút "Lật bàn" có ở **mọi chế độ** (cả online), như Cờ vua.
- Pháo ở cột giữa sau "P2-5 M8.7 M2.3 X9-8" đi được **4 điểm** (mockup ghi 3).
- Khi chiếu bí, Tướng bị chiếu **vẫn được tô sáng** như Cờ vua; nhãn "Chiếu!" chỉ hiện khi ván còn tiếp.
- Hình Pháo trong trang luật nằm ngang (6 cột × 3 hàng): hình dọc cao gần gấp đôi cột chữ.
- Phông mặt quân dùng `display: "swap"` thay cho `block`: lần đầu mở bàn, chữ hiện ngay bằng phông dự phòng rồi đổi sang Noto Serif TC, không để quân trống tới 3 giây.
- Tên giao điểm trống là "Điểm trống ở cột …, hàng …" (spec đòi chữ "trống"); cột luôn đếm theo bên Đỏ như spec, kể cả với người cầm Đen.
- Hai bên phân biệt bằng màu mực **và** bằng chữ: mỗi quân của Đỏ và Đen viết bằng chữ khác nhau (帥/將, 仕/士, 相/象, 傌/馬, 俥/車, 炮/砲, 兵/卒), đúng bộ quân truyền thống người dùng chọn; tên giao điểm nêu màu bằng chữ. Không thêm vòng đôi hay dấu khác lên quân để giữ mặt quân đã duyệt.
- Hình ở menu và màn bắt đầu ván vẽ chữ bằng `--font-cjk` (Noto Sans JP, đã tải sẵn) để menu không tải thêm Noto Serif TC; 帥 將 炮 đều có trong phông đó.
- Vòng trong của quân chỉ có nét: lớp `fill-*` thắng thuộc tính `fill="none"` của SVG, từng tô kín vòng và che chữ (thấy được nhờ `ui:shots`).

## Risks / Trade-offs

- [Luật tự viết có thể sai ở trường hợp hiếm] → perft ở nhiều thế, đối chiếu số đã công bố; test riêng từng luật cản.
- [Máy dùng bộ tìm kiếm chung không có bảng ghi nhớ: Khó chỉ ở mức chơi giải trí] → đủ cho mục tiêu của app. Sách khai cuộc và bảng ghi nhớ thế cờ là change khác.
- [Giao điểm 36 px trên điện thoại 360 px nhỏ hơn 44 px khuyến nghị] → vẫn trên 24 px tối thiểu. Cờ vua 8 cột đã gần 44 px; Cờ tướng 9 cột là giới hạn của bàn.
- [Phông chữ Hán] → §5.
