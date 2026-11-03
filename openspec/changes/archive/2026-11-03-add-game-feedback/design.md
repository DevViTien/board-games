# Design

## Context

- `PlayScreen` (sau `redesign-game-boards`): vùng chơi `data-game`, một lưới với thứ tự DOM cố định `ConnectionNotice` → dòng `role="status"` → vùng `players` (đang trống) → bàn → điều khiển của game (`BoardProps.layout`) → hàng nút "Hoàn tác"/"Làm lại"/"Ván mới"/"Chơi lại" (`aria-disabled`); `grid-template-areas` đặt bàn bên trái từ 1024 px. Dòng `role="status"` mang câu do `describeStatus` dựng từ snapshot ("Đến lượt bạn (X)", "Máy đang nghĩ…", "Minh vừa … Đang chờ Minh…", "Bạn thắng!"…). "Về menu" ở thanh trên.
- Snapshot của transport (`transport/types.ts`): `seats: SeatView[]` (`human` | `ai` có `level` | `remote` có `name`), `viewer`, `currentPlayer`, `result`, `canMove`, `canUndo`, `canRedo`, `supportsUndo`, `moveCount`, `connection` (online), `lastEntry` (nước gần nhất kèm `outcome` khi là kết quả ngẫu nhiên), `lastMover`. Máy đang nghĩ = `result === null && seats[currentPlayer].kind === "ai"`. `GameUI.usePlayerLabel(player, state)` cho tên/ký hiệu ghế. `ConnectionNotice` hiện "Đang kết nối lại…" khi mất kết nối quá 1,5 giây và "Đã tạm ngắt vì lâu không có hoạt động." + "Tiếp tục".
- Tic-tac-toe: `WINNING_LINES` export từ `@board-games/games/tictactoe`; bàn chưa vẽ hàng thắng. Cờ caro đã có hàng thắng (spec `caro`). Cờ cá ngựa: nút gieo luôn được vẽ, khoá bằng `aria-disabled`.
- `usePrefersReducedMotion` hiện là hàm riêng trong `games/ludo/use-ludo-animation.ts`.
- Tiếp cận: `aria-disabled` cho nút (giữ tiêu điểm), `motion-reduce` cho mọi hiệu ứng, một thông báo `role="status"` mỗi màn hình (test và E2E đọc nó).

## Goals / Non-Goals

**Goals:**

- Người chơi nhìn là biết: ai cầm quân nào, ai là máy/người ở xa, ai đang đến lượt (không chỉ bằng màu), mình còn kết nối không.
- Kết thúc ván là một khoảnh khắc: chữ, hình (hàng thắng, confetti), hành động tiếp — không chặn nút, không lặp nút, tôn trọng giảm chuyển động.
- Máy nghĩ có tín hiệu gần bàn; nút bị khoá nói vì sao.
- Trình đọc màn hình không bị đọc hai lần và không lỡ câu kết quả: chỉ một vùng `role="status"`, không bao giờ bị gỡ ra gắn lại.
- Cờ cá ngựa 4 người vẫn vừa 1280 × 800 không cuộn khi có bảng người chơi.

**Non-Goals:**

- Đếm thắng/hoà, trạng thái kết nối của người khác, âm thanh (proposal "Ngoài phạm vi").

## Đã chốt với người dùng (03/11/2026)

- Mockup M6.5 duyệt nguyên trạng (`openspec/changes/archive/2026-11-03-add-design-foundation/mockup/`, ảnh `png/m3–m7.png`): khung 3 (thẻ "Kết thúc · Bạn thắng!", nút, hàng người chơi, nét bút dạ qua hàng thắng, confetti), khung 4 ("Máy đang nghĩ…", hàng "Máy · Bút đỏ · mức Vừa" có chip "Đến lượt", nút "Làm lại" viền đứt), khung 5–6 (danh sách người chơi Cờ cá ngựa có "Lượt", dải người chơi trên điện thoại), khung 7 (thẻ kết thúc ở chế độ tối).
- **Chỗ lệch mockup**:
  - Thẻ kết quả chỉ có nút chính "Ván mới"/"Chơi lại"; **không** lặp "Về menu" như khung 3 — "Về menu" đã ở thanh trên, hai lối giống nhau trên một màn hình là thừa.
  - Hàng nút "Hoàn tác/Làm lại" vẫn có ở mọi màn hình chơi cùng máy/với máy (khung 3, 5 bỏ để gọn) — spec `local-play`; khi thẻ kết quả hiện, nút "Ván mới" của hàng này ẩn (nằm trong thẻ).
  - Nét hàng thắng Tic-tac-toe màu mực thay cho cam (khung 3 vẽ nét cam trùng màu X, 1,00:1), mảnh và nằm dưới quân để không cắt quân; ô thắng có viền mực.
  - Bảng người chơi ở cột bên máy tính là danh sách gọn (hàng ≤ 40 px như dải trên điện thoại), không phải thẻ 64 px như khung 3–5, để Cờ cá ngựa 4 người vừa 1280 × 800.
  - Dòng phụ "Thắng 3 · Hoà 1" (khung 3) là minh hoạ; không làm ở M6.5 (proposal).

## Decisions

### 1. Bảng người chơi (`features/play/PlayerPanel.tsx`)

- Nằm ở vùng `players` của lưới (sau dòng lượt, trước bàn trong DOM). Dữ liệu chỉ từ snapshot + `GameUI`: mỗi ghế `i` → hình quân (ký hiệu từ `usePlayerLabel` trong vòng màu `--game-mark-*` hoặc `--piece-*` + ký hiệu ●■▲◆), tên và dòng phụ:

| Chế độ / ghế         | Tên                                       | Dòng phụ                                 |
| -------------------- | ----------------------------------------- | ---------------------------------------- |
| Cùng máy             | ký hiệu của game ("X", "Đỏ")              | `useSeatSummary` nếu có, không thì trống |
| Với máy, ghế người   | "Bạn · X"                                 | tóm tắt nếu có                           |
| Với máy, ghế máy     | "Máy · O" (nhiều máy: "Máy · Xanh dương") | "Mức Vừa" hoặc "Đang nghĩ…" (§3)         |
| Online, ghế của mình | "Bạn · X"                                 | chip kết nối (§4)                        |
| Online, người ở xa   | tên họ chọn ("Minh · O")                  | "Chơi từ xa"                             |
| Online, ghế máy      | "Máy · Vàng"                              | —                                        |

- Ghế đang đến lượt (khi ván chưa xong): viền 1,5 px `fg` + quầng 3 px `accent-soft` (trang trí) **và** chip chữ "Đến lượt" (`Play.turnBadge`) — không chỉ màu. Ván xong: không ghế nào "Đến lượt"; ghế thắng có chip "Thắng" (`celebration`).
- **Gọn**: tên `text-small` 600 dòng trên, dòng dưới gồm chip (lượt, thắng, kết nối — không bao giờ bị cắt, `shrink-0`) rồi chữ (loại ghế, tóm tắt) bị cắt `…` trước; vòng quân 28 px. Từ 1024 px mỗi hàng ≤ 40 px, chip lượt/thắng ở cuối hàng; dưới 1024 px chữ dùng dạng ngắn của tóm tắt (`SeatSummary.short`, "1 trên đường") và xuống dòng dưới chip khi ô hẹp (hiếm, ở 360 px với chữ dài). Hàng không có dòng dưới thì tên canh giữa vòng quân. Dưới 1024 px: 1 cột; từ 640 px và có hơn 2 ghế thì 2 cột. Ô 2×2 ở 360–390 px (bản trước) quá hẹp: hai chip của hàng "Bạn" chồng thành bốn dòng và tên, tóm tắt bị cắt; `repeat(auto-fit, minmax(5.5rem, 1fr))` cho 3 cột ở 360 px nên cũng không dùng. Mockup khung 6 có dải ô ngang; lệch có chủ ý vì chữ "Đến lượt" và trạng thái kết nối phải đọc được đủ. Không cuộn ngang; chữ dài bị cắt bằng `…` (tên đầy đủ vẫn trong cây truy cập).
- Danh sách `<ul aria-label="Người chơi">`, mỗi hàng `<li>`; **không** `aria-live` — dòng `role="status"` đã đọc lượt.
- `useSeatSummary?: () => (player, state) => SeatSummary | null` (`{ full, short }`) tuỳ chọn trong `GameUI`; Cờ cá ngựa: "Chưa ra quân", "1 ngựa trên đường", "1 ngựa đã lên chuồng", "2 ngựa trên đường · 1 đã lên chuồng"; dạng ngắn "1 trên đường", "2 đường · 1 chuồng" (`Games.ludo.summary.{none,track,home,both}` và `summary.short.*`; tiếng Anh ICU plural cho cả hai số).
- **Hình quân của ghế**: `GameUI.SeatMark?` (component tuỳ chọn, `aria-hidden`); Cờ cá ngựa vẽ đĩa màu quân + ký hiệu ●■▲◆ (`games/ludo/SeatMark.tsx`, dùng lại `ColourSymbol` của bàn). Game không có thì bảng vẽ ký hiệu `usePlayerLabel` ("X", "O") màu `--game-mark-1/2` trên nền `--game-board` — đủ cho game hai ghế; bảng không biết mã game nào (bất biến).
- **Loại ghế cùng máy**: "Ở máy này" (`Play.here`), đứng trước tóm tắt; dưới 1024 px ẩn khi có tóm tắt (mọi ghế cùng máy đều thế, tóm tắt mới đáng đọc trên ô hẹp). Người ở xa: "Chơi từ xa" (`Play.remote`) — không dùng "Online" vì trùng chữ của chip "Online" ở thanh trên mà E2E tìm bằng `getByText("Online", { exact: true })`.
- **Ngân sách 1280 × 800** (vùng ~688 px): `ConnectionNotice` 40 + dòng lượt ≤ 98 + bảng 4 × 40 + 3 × 4 = 172 + điều khiển Cờ cá ngựa 204 + hàng nút 48 + khoảng 60 = 622 (chi tiết ở `redesign-game-boards` §1). E2E kiểm (task 5.2).
- Phương án đã cân nhắc: đưa tên vào dòng `role="status"` (đang làm) — không cho thấy cả bàn người chơi cùng lúc; panel `aria-live` — đọc trùng với dòng lượt; hàng thẻ 64 px như mockup — Cờ cá ngựa 4 người online vượt 800 px.

### 2. Dòng lượt và thẻ kết quả (`ResultCard.tsx`)

- **Một phần tử `role="status"` cố định**: phần tử đó không bao giờ đổi cha hay bị gắn lại. Khung thẻ kết quả **luôn** bọc nó (cùng vùng `status` của lưới); khi `result === null` khung ở biến thể "dòng lượt" (trong suốt, không viền, chữ `text-status`), khi `result !== null` khung đổi biến thể sang "thẻ" (`Card`, chip "Kết thúc", chữ `text-display`, dòng giải thích, nút chính) — chỉ đổi class và thêm anh em quanh phần tử `status`, nên trình đọc màn hình đọc câu mới ("Bạn thắng!") như mọi lần đổi chữ. Hoàn tác nước thắng: khung về biến thể "dòng lượt", chính phần tử đó đọc "Đến lượt X".
- Thẻ kết quả: chip "Kết thúc" (`celebration` khi có người ở đây thắng, `neutral` khi thua/hoà; icon cúp `aria-hidden`), câu kết quả (giữ nguyên câu: `youWin`, `aiWins`, `winner`, `draw`, `opponentWins`…), dòng giải thích `useResultDetail` (nếu game có; không nằm trong `status` để câu được đọc ngắn), **một** nút chính: "Ván mới" (online "Chơi lại"), cùng `transport.requestNewGame` và quy tắc xác nhận hiện có. Trong lúc thẻ hiện, hàng nút của ván **ẩn** nút "Ván mới"/"Chơi lại" (không lặp); "Hoàn tác"/"Làm lại" vẫn ở hàng nút (hoàn tác được nước thắng — spec). Thẻ không có "Về menu" (thanh trên đã có). Tiêu điểm không tự chuyển vào thẻ; nếu tiêu điểm đang ở nút "Ván mới" của hàng nút lúc ván kết thúc (không xảy ra: ván kết thúc bằng một nước trên bàn hay của người khác), không cần xử lý.
- `useResultDetail?: () => (result, state) => string | null`: Tic-tac-toe "Ba {mark} thẳng hàng ở {where}" (`where`: "hàng {n}", "cột {n}", "đường chéo chính", "đường chéo phụ"), Cờ caro "Năm {mark} liền nhau theo {direction}", Cờ cá ngựa "{colour} đã lên đủ chuồng đích". Hoà: không có dòng.

### 3. Máy đang nghĩ

- `thinking = result === null && seats[currentPlayer]?.kind === "ai"` (online, trong lúc transport hiện lần lượt nước của máy cũng đúng điều kiện này, không thêm logic).
- Hàng của máy: dòng phụ ba chấm nhịp `animate-thinking-dots motion-reduce:animate-none` (chấm `aria-hidden`, đứng trước chữ) + "Đang nghĩ…" (`Play.thinking`), thay cho "Mức Vừa"; ô `board` của lưới có `aria-busy={thinking}`; con trỏ trên bàn `cursor-progress` (`aria-busy:[&_*]:cursor-progress`, thắng `cursor-default` của ô). Dòng `role="status"` vẫn "Máy đang nghĩ…" như spec `play-vs-ai`.

### 4. Kết nối trong bảng người chơi (online)

- Ngưỡng 1,5 giây là hook chung `useLostForAWhile(status)` (`features/play/use-lost-for-a-while.ts`), tách từ `ConnectionNotice`, nên chip và dòng báo đổi cùng lúc.
- Hàng "Bạn" có chip với lời **khác** lời của `ConnectionNotice` (để `getByText` và trình đọc màn hình không gặp hai câu giống nhau): `connected` → "Đã kết nối" (`success`, chấm ngọc); mất kết nối quá 1,5 giây (cùng ngưỡng với `ConnectionNotice`) hoặc tạm ngắt → "Mất kết nối" (`warning`). Hành động ("Tiếp tục") và lời giải thích vẫn ở `ConnectionNotice`. Chip không `aria-live`.

### 5. Hàng thắng Tic-tac-toe

- `Board` tính **mọi** hàng thắng từ `WINNING_LINES` và `state.board` khi `result?.kind === "win"` (không đổi luật; một nước có thể tạo hai hàng, ví dụ X ở bốn góc rồi ô giữa — vẽ cả hai, dòng giải thích nêu cả hai). Ô thắng có viền mực 2 px (`border-fg`) — thắng đọc được bằng hình, không chỉ màu; quân khác **không** bị làm mờ (mờ 55% làm X sáng còn 2,16:1, dưới 3:1 của WCAG 1.4.11; mockup cũng không mờ). Mỗi ô thắng `aria-describedby` "thuộc hàng thắng" (`Games.tictactoe.winningCell`, cùng cách Cờ caro).
- Nét: SVG trong lưới (`aria-hidden`, `pointer-events-none`), **dưới quân, trên mặt ô** (SVG `z-[1]`, quân `relative z-[2]`; nút ô không tạo ngữ cảnh xếp lớp), `path` hơi cong như bút dạ, màu `--game-win` (Tic-tac-toe = `fg`, mực) dày 2,4% cạnh bàn, đầu bo, không viền giấy — quân luôn nằm trên nên không bị cắt (bản trước: nét ~21 px có viền giấy ~28 px vẽ đè, cắt quân X thành mảnh). Vẽ dần bằng `stroke-dashoffset` (`animate-draw-line` 300 ms ≤ `AI_MIN_DELAY_MS`), `motion-reduce:animate-none` → nét hiện đủ ngay.
- Tỉ số: nét/ô 17,47 (sáng) / 12,65 (tối); nét/nền 14,51 / 14,92; viền ô thắng `fg` trên nền trang như nét; quân giữ nguyên tỉ số của `redesign-game-boards` §2 (không mờ).

### 6. Confetti (`Confetti.tsx`)

- `usePrefersReducedMotion` chuyển từ `games/ludo/use-ludo-animation.ts` sang `apps/web/src/lib/use-prefers-reduced-motion.ts`, dùng chung cho Cờ cá ngựa và confetti.
- Kích hoạt khi **kết quả chuyển từ `null` sang khác `null`** trong cùng một ván (so `result` của lần render trước, giữ bằng ref; ván mới hay tải lại trang ván đã xong không phải chuyển đổi → không chạy), và một ghế thắng là người ở thiết bị này (cùng máy: mọi ghế người; với máy/online: `viewer` thuộc `winners`). Không chạy khi hoà, máy thắng, người ở xa thắng. Hoàn tác nước thắng rồi đi lại nước thắng là một lần chuyển mới → chạy lại.
- Khi giảm chuyển động: **không gắn** `Confetti` vào cây (không chỉ ẩn bằng CSS). Còn lại: 24 mảnh `aria-hidden` trong lớp `pointer-events-none fixed inset-0`, vị trí và độ trễ là mảng hằng (không `Math.random` trong render), màu `celebration`, `accent`, `success`, `piece-yellow`; keyframes `confetti` (rơi + xoay, 1 200 ms, một lần) rồi gỡ khỏi cây (`onAnimationEnd` của mảnh cuối).
- Test bằng `matchMedia` giả (cách `use-ludo-animation.test.tsx` đang làm).
- Phương án đã cân nhắc: khoá theo `moveCount` (bản trước) — chạy lại sai khi tải lại hay khi snapshot đổi mà kết quả không đổi; thư viện `canvas-confetti`/`motion` — thêm phụ thuộc cho một hiệu ứng 1 giây.

### 7. Lý do nút không bấm được

- Hàm thuần `unavailableReasons(snapshot)` (`features/play/unavailable-reason.ts` — không phải hook nên tên file không có `use-`) cho "Hoàn tác" và "Làm lại", lấy từ dữ liệu sẵn có, **không đổi snapshot của transport**:
  - `thinking` → "Máy đang nghĩ" (`Play.unavailable.thinking`);
  - `!canUndo && moveCount === 0` → "Chưa có nước nào để hoàn tác" (`noMoves`);
  - `!canUndo && (lastEntry?.outcome !== undefined || inProgress || result !== null)` → "Không hoàn tác được lần gieo xúc xắc" (`roll`): nước gần nhất là kết quả ngẫu nhiên, hoặc người ở đây đã có nước còn hiệu lực (hay ván đã xong) mà vẫn không hoàn tác được — chỉ một lần gieo ở giữa giải thích được (máy gieo rồi đi sau nước của bạn trong Cờ cá ngựa);
  - `!canUndo && moveCount > 0` (còn lại, ví dụ máy đi trước và người chơi chưa đi nước nào) → "Chưa có nước nào của bạn để hoàn tác" (`noOwnMoves`);
  - `!canRedo` → máy đang nghĩ thì `thinking`, còn lại "Không có nước nào để làm lại" (`noRedo`).
    Nút có `aria-describedby` trỏ phần tử lý do; phần tử hiện thành chữ nhỏ dưới hàng nút khi nút đó có tiêu điểm hay vừa bị bấm (`text-small fg-muted`), lúc khác `sr-only` (vẫn đọc được).
- Cờ cá ngựa: nút "Gieo xúc xắc" khoá (luôn được vẽ, kiểu khoá của `redesign-game-boards` §4) có mô tả: đang chọn ngựa → "Chọn ngựa trước" (`Games.ludo.unavailable.choose`); không đến lượt thiết bị này → "Đang chờ {player}" (tên người ở xa hay "Máy (Vàng)"); mất kết nối → "Chờ kết nối lại với máy chủ" (khác lời "Đang kết nối lại…" của dòng báo); đang chờ server → "Đang gửi…". Bàn không đoán: khi bàn bị khoá, `PlayScreen` truyền lý do đã dịch qua `BoardProps.lockedReason` (`Play.locked.{waiting,reconnecting,sending}`, theo thứ tự kết nối → đang chờ ai → đang gửi); chỉ "Chọn ngựa trước" là của bàn. Lý do hiện thành ghi chú nổi dưới nút (`absolute`), không đẩy gì; ghi chú của "Hoàn tác"/"Làm lại" cũng thế (cột bên canh giữa không nhảy) và mất khi có nước mới (chạm trên iOS không focus nút nên có thể không có `blur`).
- Phương án đã cân nhắc: cờ `undoBlockedByRoll` trong snapshot (bản trước) — dữ liệu đã có trong `lastEntry`; tooltip khi trỏ — không có trên cảm ứng, chưa có component tooltip; ẩn nút không bấm được — mất chỗ quen tay và tiêu điểm.

### 8. Token và hướng hình ảnh

- Không thêm token màu: dùng `celebration*`, `success*`, `warning*`, `accent-soft`, `fg`, `--game-win`, `--piece-*` của `add-design-foundation` (bảng tỉ số ở design §2 của change đó) và `redesign-game-boards` §2–§4. Cặp dùng ở change này: chip "Kết thúc" `celebration-ink`/`celebration-soft` 5,23 / 8,22; "Đã kết nối" `success-ink`/`success-soft` 5,71 / 8,09; "Mất kết nối" `warning-ink`/`warning-soft` 5,12 / 9,25; chip "Đến lượt" chữ `bg` trên nền `fg` 16,02 / 16,24; viền ghế đang đến lượt `fg`/`surface` 17,47 / 14,77; lý do nút `fg-muted`/`bg` 5,67 / 7,77; nét hàng thắng Tic-tac-toe (§5).
- `packages/ui`: `Badge` thêm biến thể `ink` (`bg-fg text-bg`, chip "Đến lượt"), icon `TrophyIcon` (chip "Kết thúc"). `styles.test.ts` thêm cặp `fg`/`surface` và `bg`/`fg`.
- Thêm keyframes trong `@theme` của `packages/ui/src/styles.css`: `--animate-confetti` (1 200 ms), `--animate-thinking-dots` (1 200 ms lặp), `--animate-draw-line` (300 ms); mỗi chỗ dùng có `motion-reduce:` tương ứng (confetti: không gắn).
- Hướng hình ảnh theo mockup: thẻ kết quả trắng bo 20 px, câu kết quả `text-display` sát chữ, ăn mừng nhẹ (confetti rải ở mép, không phủ bàn); hàng người chơi kiểu "thẻ tên" gọn với vòng quân bên trái.

### 9. Bản dịch

- Khoá mới vi/en/ja (cùng tham số ICU): `Play.players` ("Người chơi"), `Play.turnBadge`, `Play.winnerBadge`, `Play.thinking`, `Play.finished`, `Play.you` ("Bạn · {player}"), `Play.ai` ("Máy · {player}"), `Play.named` ("{name} · {player}"), `Play.aiLevel` ("Mức {level}"), `Play.here`, `Play.remote`, `Play.aiName`/`Play.aiSeatName` ("máy", "máy ({player})" cho "Đang chờ …"), `Play.connectionBadge.{connected,lost}`, `Play.unavailable.{noMoves,noOwnMoves,roll,thinking,noRedo}`, `Games.tictactoe.winningCell`, `Games.tictactoe.result.{row,col,diagonal,antiDiagonal}`, `Games.tictactoe.result.line`, `Games.caro.result.{line,direction.*}` ("{count} quân {mark} liền nhau theo {direction}" — đếm thật: luật tự do cho hàng dài hơn 5), `Games.ludo.result`, `Games.ludo.summary.*` (cả `summary.short.*`), `Games.ludo.unavailable.choose`, `Play.locked.{waiting,reconnecting,sending}`.

## Risks / Trade-offs

- [Thêm chữ trên màn hình chơi làm E2E `getByText` mơ hồ] → E2E đọc `getByRole("status")`; bảng người chơi là `list` có tên, test dùng `within`; chip kết nối khác lời `ConnectionNotice`.
- [Nút "Ván mới" đổi chỗ khi ván kết thúc] → tên nút giữ nguyên và chỉ có một nút cùng tên trên màn hình, nên `getByRole("button", { name: "Ván mới" })` vẫn khớp đúng một nút; E2E rà lại (task 5.1).
- [Confetti trên máy yếu] → 24 phần tử `transform`/`opacity`, một lần, 1,2 s; không gắn khi giảm chuyển động.
- [Hai lời cho cùng một trạng thái máy nghĩ (dòng lượt + hàng máy)] → hàng máy không phải vùng thông báo, nên chỉ đọc một lần.
- [Ngân sách chiều cao] → hàng người chơi gọn, lựa chọn ngựa 2 cột; E2E 4 lựa chọn + bảng + `ConnectionNotice` (task 5.2).

## Kiểm tra

- `pnpm ui:shots`: Tic-tac-toe vừa thắng (so với khung 3), hoà, máy thắng; Cờ caro máy đang nghĩ (khung 4) và vừa thắng tối (khung 7); Cờ cá ngựa 4 người đến lượt Đỏ (khung 5) và điện thoại (khung 6); online "Mất kết nối"; mỗi ảnh sáng/tối × 390/1280; thêm một ảnh với `reducedMotion: "reduce"` cho màn hình vừa thắng.
- Rà `web-design-guidelines` (chuyển động, `aria-*`, focus); `pnpm check`, `pnpm knip`, `pnpm test:e2e`, `pnpm spec:check`.

## Ghi chú khi apply (03/11/2026)

- **Tiêu điểm sau "Ván mới" trong thẻ**: nút trong thẻ mất cùng thẻ khi ván mới bắt đầu; tiêu điểm chuyển sang nút "Ván mới" của hàng nút (cùng tên, cùng việc) thay vì rơi về `body`. Online ("Chơi lại") không có nút thay thế trong ván, như trước change này.
- **Confetti** gỡ khi đủ 24 sự kiện `animationend` (nghe bằng `addEventListener` trên phần tử: React đổi tên sự kiện này theo tiền tố trình duyệt); độ trễ tới 300 ms nên tổng ≤ 1,5 s.
- **`BoardProps.lockedReason?`** (thay `waitingFor?` sau review) do `PlayScreen` tính khi `!canMove` và ván chưa xong: chờ kết nối lại, đang chờ tên người ở xa / "máy" / "máy (Vàng)", hoặc đang gửi.
- **Đọc lần gieo một lần**: nước của người ở đây (một lần gieo, gợi ý của bàn đã đọc) không bật dấu vô hình của dòng lượt, nên dòng lượt không đọc lại cùng câu "Đến lượt Đỏ"; nước của máy hay người ở xa vẫn bật như trước.
- **"Chơi lại" online**: tiêu điểm chuyển tới tiêu đề game (h1 `tabIndex=-1` khi online) khi ván mới tới.
- **Confetti**: dựng ngoài `layout` như dòng báo/dòng lượt, `onDone` ổn định (`useCallback`), gốc `motion-reduce:hidden` làm dự phòng CSS, và hẹn giờ 2 s gỡ nếu `animationend` không tới (tab ẩn). Hoàn tác rồi làm lại nước thắng vẫn ăn mừng lại (đúng §6).
- `ColourSymbol` tách ra `games/ludo/ColourSymbol.tsx`; `ResultCard` nhận `variant: "turn" | "over" | "won"`.
- **E2E phòng online giả**: `openFakeRoom` (`e2e/helpers.ts`) dùng `page.routeWebSocket` làm server (trả `room`, `pong`; `loseConnection` đóng socket và không trả lời lần nối lại) để dựng phòng Cờ cá ngựa 4 ghế đúng lúc có bốn lựa chọn mà không đổi server. `LUDO_FOUR_CHOICES` là biên bản (kiểm bằng `applyEntry`) dùng cho cả ván cùng máy lẫn phòng.

## Kiểm tra (đã chạy 03/11/2026)

- `pnpm check`: lint, typecheck, test (web 75 file, 1 085 test), build — xanh. `KNIP_DISABLE_RAW_TRANSFER=1 pnpm knip` sạch. `pnpm spec:check` và `pnpm exec openspec validate add-game-feedback --strict` xanh.
- `pnpm test:e2e`: 162 passed, 6 skipped (bài chỉ cho máy tính bỏ qua ở cấu hình điện thoại). Bài mới: thẻ kết quả + hàng thắng + "Ván mới" từ thẻ + hoàn tác nước thắng; giảm chuyển động; hàng máy "Đang nghĩ…" + `aria-busy`; bảng người chơi online + "Mất kết nối"; Cờ cá ngựa 4 người bốn lựa chọn ở 1280 × 800 cùng máy và online (cả khi dòng "Đang kết nối lại…" hiện).
- Sau review: thêm ảnh 05b (ghi chú lý do cạnh bàn), 06e–06h (hàng thắng theo cột, hai đường chéo, hai hàng cùng lúc), 19c/19d (Cờ cá ngựa online ở 360/390 px, vi/en/ja, và khi mất kết nối); đã xem sáng/tối × điện thoại/máy tính. Kết quả lệnh sau review ở báo cáo apply.
- `pnpm ui:shots` (90 ảnh, trước review): đã xem 06 vừa thắng, 06b hoà, 06c máy thắng, 06d vừa thắng khi giảm chuyển động, 07e máy đang nghĩ, 08 Cờ caro thắng, 09/09c/09d Cờ cá ngựa có bảng, 19/19b online và "Mất kết nối" — sáng/tối × 390/1280, so với mockup khung 3–7.
- Rà `web-design-guidelines`: chấm nhịp và confetti dừng/không gắn khi giảm chuyển động; icon trang trí `aria-hidden`; "…" thay "..."; chữ dài cắt bằng `truncate` trong ô `minmax(0,1fr)`; confetti `pointer-events-none`; không `transition: all`; một vùng thông báo `role="status"`.
