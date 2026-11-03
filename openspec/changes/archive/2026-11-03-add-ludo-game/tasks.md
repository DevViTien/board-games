# Tasks

## 1. Luật Cờ cá ngựa

- [x] 1.1 `packages/games/src/ludo/constants.ts` (`TRACK_LENGTH = 56`, `SEGMENT = 14`, `HORSES = 4`, `HOME_STEPS = 6`, `GATE_PROGRESS = [13, 27, 41, 55]`, `SEAT_COLOURS` theo số người, `LUDO_COLOUR`) và `options.ts` (`LudoOptions`, `LUDO_DEFAULT_OPTIONS`, `parseLudoOptions` **chỉ nhận mặc định**, `parseAnyLudoOptions` cho test; design §3); test theo "Tuỳ chọn mặc định", "Thiếu khoá dùng mặc định", "Biến thể bị từ chối", "Giá trị lạ bị từ chối", khoá lạ và không phải object → `null`; `parseAnyLudoOptions` nhận mọi biến thể
- [x] 1.2 `track.ts` (tiến độ ↔ ô tuyệt đối, chân chuồng kế tiếp, ô xuất phát; design §1) và `test-positions.ts` (dựng thế theo tiến độ từng ngựa, lượt, số vừa gieo); test: bốn ô xuất phát cách nhau 14, chân chuồng là ô ngay trước ô xuất phát, chân chuồng kế tiếp của mọi tiến độ 0…54 (kể cả đứng trên một chân chuồng, G4), ván 2 người vẫn có 4 chân chuồng (G6)
- [x] 1.3 `moves.ts` (`targetOf`, đá; design §4); test đơn vị theo các scenario của "Ra quân", "Đi trên đường chung", "Gieo 1 nhảy tới chân chuồng kế tiếp" (cả G1, G2, G3, G5, G7), "Lên chuồng đích" (cả G8), "Đường đi"
- [x] 1.4 `rules.ts` (`ludo` khai báo `as const satisfies GameDefinition<LudoState, LudoMove, LudoOutcome, LudoOptions>`, `moveKey`, `state.last` với `lost`/`again`; design §2); test qua session theo "Ván 4 người mới", "Ván 2 người ngồi đối diện" (G10), "Thứ tự lượt", "Lượt bắt đầu bằng gieo" (sáu kết quả trọng số đều), "Sau khi gieo chỉ chọn ngựa", "Mọi ngựa còn trong chuồng", ba scenario "Gieo 6 được gieo thêm" (G9: `lost = false`, `again = true`), "Đủ bốn bậc cao", "Bốn ngựa trong chuồng đích nhưng chưa đủ bậc cao" (G12: không còn nước sau khi thắng); trạng thái cũ không đổi
- [x] 1.5 `test-variants.ts` (`ludoVariantRules`, không export từ `packages/games/src/index.ts`); test từng biến thể (design §3): ra quân "1 hoặc 6" (gieo 1 chọn được ra quân hoặc nhảy), không gieo thêm, được vượt ngựa (đường chung và chuồng đích; vẫn không dừng ở ô/bậc có ngựa mình; luật nhảy vẫn đòi đường trống), tắt nhảy khi gieo 1
- [x] 1.6 `describeGameContract(ludo, …)` với tuỳ chọn mặc định và `describeGameContract(ludoVariantRules, { options: <bốn tuỳ chọn đổi> })`, `playerCounts` 2/3/4; đo thời gian (mục tiêu vài giây cả file), chỉnh `seeds`/`maxPlies`/`timeout`
- [x] 1.7 `self-play.ts` (vòng lặp chỉ trên state, chỉ cho test) và `termination.test.ts` riêng với `timeout` rõ (design §5): "Mọi ván tự chơi đều kết thúc" với 1000 ván seed cố định chia 2/3/4 người, 100 ván mỗi biến thể qua `ludoVariantRules`; thuộc tính "Không ai bị kẹt" ở mọi thế chờ gieo; "Chuồng đích luôn lên được"; ghi thời gian cả file (ngân sách 15 s), số nước trung bình/lớn nhất theo số người, kích thước biên bản lớn nhất và thời gian `fromRecord` của nó vào design §5 và §7
- [x] 1.8 Thêm `ludo` vào `GAMES`, `GAME_IDS` và export của `packages/games/src/index.ts`; test registry (`isRegisteredGameId("ludo")`, `findGame("ludo")`, `GAME_IDS` khớp `GAMES`); `pnpm knip` sạch (file chỉ cho test được test dùng)

## 2. Máy chơi Cờ cá ngựa

- [x] 2.1 `ai.ts` `evaluate` = điểm mình − trung bình điểm người khác (design §6, hằng số đặt tên trong file); test: số nguyên, |giá trị| < 10^6 ở mọi thế của vài ván tự chơi, đối xứng dấu ở thế đối xứng hai người, đá ngựa của người không dẫn đầu làm điểm tăng (4 người), ngựa bị đe doạ (sau 1–6 ô; trên chân chuồng với ngựa đối thủ sau tới 14 ô, đường trống; trên ô xuất phát của màu còn ngựa trong chuồng) chấm thấp hơn cùng ngựa an toàn, bậc 1–2 kém xa bậc 3
- [x] 2.2 Hành vi máy (`ai.test.ts`, rng cố định, đồng hồ giả): "Máy chọn nước thắng", "Máy đá ngựa đối thủ", "Máy đá ngựa của người không dẫn đầu", "Máy ưu tiên lên chuồng hơn ra quân" (mức Vừa và Khó); một thế có nguy cơ bị đá lượt sau mà Dễ (không ngẫu nhiên) và Vừa chọn khác nhau; mức Dễ có lúc không đi nước tốt nhất; "Máy mức Khó với bốn người" với đồng hồ thật trong `AI_TIME_LIMIT_MS.hard` + 200 ms; ghi độ sâu đạt được của mức Khó ở 2 và 4 người vào design §6

## 3. Giao diện Cờ cá ngựa

- [x] 3.1 `packages/ui/src/styles.css`: token `piece-red`, `piece-blue`, `piece-yellow`, `piece-green` (sáng, tối; tương phản tối thiểu 3:1 với `surface`, ghi số vào design §8) và `--animate-dice-roll`, `--animate-piece-kicked` trong `@theme` (design §8)
- [x] 3.2 `apps/web/src/games/ludo/player-label.ts`, `move-label.ts`; bản dịch vi/en/ja cho `Games.ludo.colours.*`, `Games.ludo.move` (ICU `select`), `Games.ludo.roll`, `die`, `rolled`, `lostTurn`, `again`, `noMoveAgain`, `chooseHorse`, `option`, `positions` và các vị trí (design §9); test: mọi loại nước (gieo, gieo mất lượt, gieo 6 không đi được theo "Máy gieo 6 không đi được", ra chuồng, tới ô, tới chân chuồng, lên bậc, kèm đá) ở ba ngôn ngữ; tên ghế ván 2 người là Đỏ và Vàng
- [x] 3.3 `board-layout.ts` (toạ độ 56 ô, 4 × 6 bậc, chuồng, ô xuất phát, chân chuồng; design §1) và `Board.tsx` phần hiển thị (SVG chữ thập, ngựa có màu + ký hiệu, chân chuồng có dấu, bậc đánh số, xúc xắc có màu người gieo, đánh dấu ngựa vừa đi); test: 56 ô liền kề theo thứ tự, mỗi màu 14 ô; component test (`renderWithIntl`, `getByRole`) theo "Phân biệt không chỉ bằng màu", "Đánh dấu nước vừa đi"
- [x] 3.4 `Board.tsx` phần đi quân: nút "Gieo xúc xắc" (`aria-disabled`), nhóm "Chọn ngựa" từ `legalMoves`, tên lựa chọn, ô đích nổi bật khi trỏ/tiêu điểm, bấm ngựa trên SVG; gợi ý `aria-live` chỉ cho lần gieo của người ở thiết bị này; danh sách `sr-only` "Vị trí các ngựa"; test theo "Gieo xúc xắc", "Chọn ngựa", "Báo mất lượt", "Gieo 6 không đi được", "Ô đích khi đưa tiêu điểm", "Gieo và đi bằng bàn phím", "Đọc vị trí ngựa", ngựa không đi được không có lựa chọn; `PlayScreen` với Cờ cá ngựa: đúng một `role="status"`, lần gieo của máy chỉ được đọc ở `role="status"`, lần gieo của người chơi chỉ ở gợi ý của bàn
- [x] 3.5 Hiệu ứng (`use-ludo-animation.ts`, class `animate-* motion-reduce:animate-none`, không CSS Module; design §8): xúc xắc lăn, ngựa đi từng ô, ngựa bị đá về chuồng, cắt khi có cập nhật mới, tắt khi `prefers-reduced-motion`; test với `matchMedia` giả và đồng hồ giả theo "Giảm chuyển động", "Cập nhật mới giữa hiệu ứng", bàn không bị khoá vì hiệu ứng; test `LUDO_DICE_MS` không quá `AI_RESULT_DELAY_MS` và `LUDO_WALK_MAX_MS` không quá `AI_SETTLE_DELAY_MS`
- [x] 3.6 `ludo/index.ts` (`ludoEntry`), một dòng trong `GAME_ENTRY_LOADERS`, bỏ `ludo` khỏi `PLANNED_GAMES`; test menu theo "Menu khi có Tic-tac-toe và Cờ caro" (nay Cờ cá ngựa cũng chơi được), "Game dự kiến đã có luật không bị lặp", "Thẻ Cờ cá ngựa", "Thẻ của game có số người thay đổi"; test registry của app; màn hình bắt đầu ván Cờ cá ngựa theo "Không có nhóm tuỳ chọn luật" (có nhóm "Số người chơi")

## 4. Kiểm tra online

- [x] 4.1 `room-service` với `ludo` (kho bộ nhớ, rng của server có seed): phòng 3 ghế khi tạo với `playerCount: 3`; nước gieo được ghi với kết quả của rng server; "Số chấm gửi kèm không có tác dụng"; "Biến thể bị từ chối"; ván 2 người chơi tới khi có người thắng bằng các nước gửi qua service (rng cố định) rồi "Chơi lại" xoay ghế

## 5. E2E

- [x] 5.1 `e2e/helpers.ts`: dựng biên bản Cờ cá ngựa có kết quả đã chốt (dùng `applyEntry` của engine) để `writeSaved` một thế cụ thể; helper "chơi một lượt bằng bàn phím" (gieo, chọn lựa chọn đầu nếu có)
- [x] 5.2 `e2e/play-ludo.spec.ts` smoke tham số hoá n ∈ {2, 3, 4} × {cùng máy, đấu với máy mức Dễ}: bắt đầu từ màn hình bắt đầu ván; chơi vài lượt bằng bàn phím; assert số màu trên bàn = n, xúc xắc luôn hiện 1–6, lượt chuyển đúng thứ tự trừ khi gieo 6 (cùng máy), các máy tự đi và lời báo nêu "Máy (…)" khi n ≥ 3 rồi lại tới lượt người chơi (đấu với máy); tải lại giữ n người và đúng lượt; ghi thời gian một vòng ba máy vào design §6
- [x] 5.3 E2E luật nhảy, tất định: `writeSaved` một ván cùng máy 2 người ở lượt Đỏ vừa gieo 1, ngựa Đỏ cách chân chuồng kế tiếp 9 ô, đường trống; assert chỉ có lựa chọn "Ngựa 1: tới ô 14" (chân chuồng của Xanh dương; chân chuồng của màu khác đọc như một ô, design §8) cho ngựa đó, chọn thì danh sách vị trí đọc đúng ô mới
- [x] 5.4 E2E khung 360 px: "Bàn 4 người trên điện thoại hẹp" (không cuộn ngang, chạm nút gieo và lựa chọn ngựa); chạy với `reducedMotion: "reduce"` một lần
- [x] 5.5 E2E online hai người: tạo phòng Cờ cá ngựa "2 người", mở link mời ở trình duyệt thứ hai, "Vào chơi"; mỗi bên gieo vài lượt; assert "Hai người cùng thấy một lần gieo" (cùng số, cùng vị trí ngựa); tải lại một bên vẫn đúng lượt; chạy cả hai cấu hình máy

## 6. Hoàn tất

- [x] 6.1 Cập nhật plan.md §10 (M6: change này xong, số đo §5–§7), README nếu có danh sách game
- [x] 6.2 Đối chiếu design (giả định G1, G3–G7, G10–G12 giữ như bảng; G2, G8, G9 đã chốt) và delta spec với code; diff trọn thân khối MODIFIED "Game chơi được và game sắp có trên menu" với `openspec/specs/game-menu/spec.md`; chạy `pnpm exec openspec validate add-ludo-game --strict`, `pnpm check`, `pnpm knip`, `pnpm test:e2e` (cả hai cấu hình máy), `pnpm spec:check`
- [x] 6.3 Archive change (`pnpm exec openspec archive add-ludo-game --yes`) trong cùng PR, sau review, sau `add-multiplayer-setup`

## Ngoài phạm vi

- Ghế máy online, phòng có máy, hiện lần lượt nhiều nước nhận cùng lúc: change `add-room-ai-seats`.
- Chọn biến thể trên giao diện, nhận biến thể từ bên ngoài, nhãn luật: v1 (người dùng chốt không hiện ở M6).
- Hai xúc xắc, "rào", ô xuất phát an toàn, lên chuồng không chia bậc, thắng không tính bậc, mất lượt khi ra 6 ba lần, xếp hạng: không làm ở M6 (design §3).
- Tự đi khi chỉ có một ngựa đi được, tranh lượt đi đầu, xoay bàn theo màu người chơi, âm thanh: để sau khi chơi thử.
- Gửi phần nước mới thay vì cả phòng (giảm băng thông): xem lại nếu Usage cho thấy cần (design §7).
- Max-n cho máy 3–4 người: chỉ làm nếu mức Khó chơi dở khi chơi thử (design §6).
- Trang luật `rules.{vi,en,ja}.mdx`: M8.
