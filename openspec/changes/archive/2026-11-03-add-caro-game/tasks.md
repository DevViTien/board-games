# Tasks

## 1. Luật Cờ caro

- [x] 1.1 `packages/games/src/caro/constants.ts` và `options.ts` (`CARO_SIZES`, `CARO_RULE`, `WIN_LENGTH`, `CaroOptions`, `CARO_DEFAULT_OPTIONS`, `parseCaroOptions`: khoá thiếu → mặc định, khoá/giá trị lạ → `null`; design §1); test theo "Tuỳ chọn mặc định", "Kích thước bàn không hỗ trợ", "Khoá lạ", "Thiếu khoá dùng mặc định"; `"15"` và không phải object → `null`
- [x] 1.2 `caro/lines.ts` (`runThrough`, `wouldWin`; đi theo (hàng, cột) có kiểm biên, không cộng thẳng vào chỉ số; design §1); test đơn vị theo các scenario của "Thắng theo luật tự do", "Thắng theo luật chặn hai đầu" (kể cả "Một nước tạo hai chuỗi"), "Mép bàn không chặn" (kể cả "Chuỗi sát mép phải", "Không nối sang hàng sau", và trường hợp tương tự cho hai hướng chéo ở mép trái/phải); chuỗi trả về xếp từ đầu tới đầu
- [x] 1.3 `caro/rules.ts` (`caro` khai báo `as const satisfies GameDefinition<CaroState, CaroMove, never, CaroOptions>`, `moveKey`, `caroWinningLine`; thắng tính bằng `wouldWin` trong `applyMove`); test qua session theo "Ván mới mặc định", "Ván mới 19×19", "Có thể đấu với máy", "Lượt luân phiên", "Không đặt vào ô đã có quân", "Ô ngoài bàn 15×15", mỗi scenario thắng qua `playMove` ở cả 15×15 và 19×19, "Đầy bàn không ai thắng" (bàn dựng bằng mẫu lặp, kiểm **sau mỗi nước** chưa có kết quả), "Nước cuối tạo chuỗi thắng", "Nước cuối tạo chuỗi bị chặn hai đầu", "Hàng thắng năm quân", "Hàng thắng sáu quân" (nước nối ở giữa, thứ tự từ đầu tới đầu), "Chưa có người thắng"; trạng thái cũ không đổi
- [x] 1.4 `describeGameContract(caro, …)` cho bốn tổ hợp `size × rule` (design §6); đo thời gian chạy (mục tiêu ~1–4 giây cả file), chỉnh số seed và `timeout`; ghi số đo vào design §6
- [x] 1.5 Thêm `caro` vào `GAMES` và export của `packages/games/src/index.ts`; test registry (`isRegisteredGameId("caro")`, `findGame("caro")`)

## 2. AI

- [x] 2.1 Engine: `GameDefinition.candidateMoves?` (doc: tập con khác rỗng khi ván chưa xong, PHẢI giữ nước thắng ngay và nước chặn), `searchMoves` dùng hook, `chooseMove` lọc nước gốc theo `legalMoves` và rơi về mọi nước hợp lệ như phòng thủ (design §2.1); test với game mẫu: "Máy chỉ xét các nước được khai báo" (Dễ, Vừa, Khó), "Game không khai báo" (test Tic-tac-toe cũ vẫn xanh), "Khai báo sai vẫn ra nước hợp lệ"; test "Mức Khó" cũ vẫn xanh, thêm test thua muộn nhất chỉ xét trong tập khai báo
- [x] 2.2 Kiểm tra hợp đồng `candidate-moves` (design §2.4) và game mẫu vi phạm trong test của bộ; test theo các scenario của "Kiểm tra tập nước thu hẹp" (nước không hợp lệ, rỗng, không tất định, sửa state, trùng nước; game không khai báo vượt qua; chỉ đúng kiểm tra đó thất bại)
- [x] 2.3 `caro/ai.ts` phần `candidateMoves` (design §2.2: ô bắt buộc tính bằng chính `wouldWin` cho cả hai người, ô chặn ngoài đầu với `blocked-ends`, rồi các ô khác theo mức đe doạ); test: "Nước đầu của máy" (15×15 và 19×19), chỉ ô trong bán kính 2, "Ô thắng ngay luôn được xét" (nhiều hơn `CANDIDATE_LIMIT` ô gần quân), "Ô chặn ngoài đầu chuỗi được xét", ô bắt buộc ở mép và góc (X hàng 1 cột 2–5, O (1,6) → (1,1)), thứ tự tất định
- [x] 2.4 `caro/ai.ts` phần `evaluate` (design §2.3, cửa sổ đi theo (hàng, cột)); test: số cửa sổ 572 (15×15) và 1.020 (19×19); đối xứng dấu giữa hai người; "Chuỗi không thể thắng không phải mối đe doạ"; bốn mở chấm cao hơn bốn bị chặn; trị tuyệt đối dưới 10^8 trên bàn 19×19 nhiều quân
- [x] 2.5 Hành vi máy (`caro/ai.test.ts`): "Máy mức Vừa chặn chuỗi bốn", "Máy mức Vừa chặn chuỗi bốn có khe", "Máy chặn sát mép", "Máy chớp nước thắng ngay" (Vừa và Khó, đồng hồ giả hết giờ ngay), "Máy thắng ở góc", "Máy mức Dễ không đi xa trận đấu"; với một thế 19×19 cố định giữa ván, số lần `evaluate` của mức Vừa ≤ `r·(c+1)` (`r`, `c` đọc từ `candidateMoves` của thế đó và các thế con; design §2.5); chạy bench tay mức Khó trên 19×19, ghi độ sâu đạt được và thời gian vào design §2.5

## 3. Bàn cờ và đăng ký trong app

- [x] 3.1 `GameUI.useMoveLabel` thành `() => (move, state) => string`; `PlayScreen` truyền `snapshot.state`; hook Tic-tac-toe nhận và bỏ qua `state` (design §3 "Nhãn nước đi"); test cũ của `PlayScreen` và Tic-tac-toe xanh không đổi kỳ vọng
- [x] 3.2 `apps/web/src/games/caro/player-label.ts`, `move-label.ts`; bản dịch vi/en/ja cho các khoá mới `Games.caro.players.x`, `Games.caro.players.o`, `Games.caro.move`, `Games.caro.winningCell`, `Games.caro.boardHint`; test: hai hook, nhãn 19×19 ô 360 → "hàng 19, cột 19", 15×15 ô 224 → "hàng 15, cột 15"; component test `PlayScreen` theo "Nước ở góc bàn 19×19", "Nước ở góc bàn 15×15"
- [x] 3.3 `caro/Board.tsx` phần hiển thị (design §3: SVG dưới, lưới `role="grid"`, SVG hàng thắng, ô `memo`, tập ô chọn được dựng một lần); test component (`renderWithIntl`, `getByRole`): tên đọc được của ô, ô không chọn được không phản hồi, "Đánh dấu nước vừa đi", "Làm nổi bật hàng thắng"
- [x] 3.4 `Board.tsx` phần bàn phím (roving tabindex); test: "Vào bàn bằng Tab" (cả khi đã có nước vừa đi), "Đi quân bằng phím mũi tên", "Dừng ở mép bàn", Home/End, "Tab rời bàn", focus ở lại ô sau khi đặt
- [x] 3.5 `Board.tsx` phần chạm hai lần (design §3: `ResizeObserver`, `pointerType` của `pointerdown`, `event.detail === 0` là bàn phím, cờ xoá sau mỗi `click`); dòng gợi ý là `<p aria-live="polite">` không có `role="status"`; test với `ResizeObserver` giả: "Chạm hai lần để đặt quân", "Đổi ý trước khi đặt", "Chạm rồi nhấn Enter", "Bàn đổi thì bỏ ô chọn" (hoàn tác, nước mới, bàn bị khoá), "Chuột đặt ngay", "Ô đủ lớn đặt ngay"; `PlayScreen` với Cờ caro có đúng một `role="status"`
- [x] 3.6 `caro/index.ts` (`caroEntry`), một dòng trong `GAME_ENTRY_LOADERS`, bỏ `caro` khỏi `PLANNED_GAMES`, `durationMinutes: 10`; test menu theo "Menu khi có Tic-tac-toe và Cờ caro", "Game dự kiến đã có luật không bị lặp" và "Thẻ Cờ caro"; test registry của app (mọi game nạp đúng entry)

## 4. E2E

- [x] 4.1 `e2e/helpers.ts`: `board()` tìm bàn theo tên "Bàn cờ" với vai trò `group` hoặc `grid`; `cell()` dùng được cho cả hai game; E2E cũ của Tic-tac-toe xanh không sửa kỳ vọng
- [x] 4.2 `e2e/play-caro.spec.ts` cùng máy: X thắng bằng 5 quân trên hàng ngang, màn hình báo X thắng và các ô hàng thắng có mô tả; đi một nước bằng bàn phím; bàn 15×15 ở khung 360 px không cuộn ngang ("Bàn 15×15 trên điện thoại hẹp")
- [x] 4.3 E2E đấu với máy mức Vừa, tất định: `writeSaved` ghi vào slot `caro:ai` một ván dở (mức Vừa, người chơi cầm X, X có ba quân liền bị O chặn một đầu, đến lượt X); người chơi đặt quân thứ tư; assert máy đặt O ở đầu còn lại (ô duy nhất không thua, nên không phụ thuộc `cryptoRng`); ghi thời gian từ nước người chơi tới nước máy (lượt đầu, khởi động Worker) vào design §2.5
- [x] 4.4 E2E online hai trình duyệt: tạo phòng Cờ caro (luật mặc định), mở link mời, chơi tới khi một bên thắng, "Chơi lại"; chạy cả hai cấu hình máy (desktop, điện thoại)

## 5. Hoàn tất

- [x] 5.1 Cập nhật plan.md §3.3 (hàng AI: `candidateMoves`), §3.4 (`GameDefinition`, `GameUI.useMoveLabel`), §10 (tiến độ M5: change này xong); README nếu có danh sách game
- [x] 5.2 Đối chiếu design và delta spec với code (diff trọn thân các khối MODIFIED "Mức Khó" và "Giới hạn thời gian" với `openspec/specs/game-ai/spec.md`); chạy `pnpm exec openspec validate add-caro-game --strict`, `pnpm check`, `pnpm knip`, `pnpm test:e2e` (cả hai cấu hình máy), `pnpm spec:check`
- [x] 5.3 Archive change (`pnpm exec openspec archive add-caro-game --yes`) trong cùng PR, sau review

## Ngoài phạm vi

- Chọn kích thước bàn, luật thắng và hiện luật đang dùng trên giao diện; bàn 19×19 trên điện thoại hẹp và máy mức Khó trên bàn 19×19 ở E2E: change `add-game-options`.
- Luật "đúng 5" (chuỗi 6 trở lên không thắng): không làm, người dùng đã chốt hai luật "chặn hai đầu" và "tự do".
- Bàn vô hạn và Canvas: không cần cho 15×15/19×19 (design §3).
- Trang luật chơi `rules.{vi,en,ja}.mdx`: M8 cùng các game khác.
- Renju (cấm 3-3, 4-4), swap mở đầu, gợi ý nước đi, toạ độ quanh bàn: không làm ở MVP.
- Tìm kiếm chuỗi đe doạ (VCF/VCT) và đánh giá tăng dần cho AI: để sau khi chơi thử, nếu mức Khó quá yếu hoặc chậm.
