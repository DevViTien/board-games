## 1. Bảng người chơi

- [x] 1.1 `games/types.ts`: hook tuỳ chọn `useSeatSummary` và `useResultDetail` (chú thích: game không có thì bỏ qua); Cờ cá ngựa `seat-summary.ts` (`Games.ludo.summary.*`, ICU plural)
- [x] 1.2 `features/play/PlayerPanel.tsx` trong vùng `players` của lưới: danh sách `aria-label="Người chơi"`, hàng gọn ≤ 40 px theo design §1 (tên/dòng phụ theo chế độ, vòng quân + ký hiệu từ token của game, chip "Đến lượt", chip "Thắng"), lưới ô trên điện thoại, không `aria-live`
- [x] 1.3 Test component (`renderWithIntl`, `getByRole("list", { name: "Người chơi" })`, `within`) theo "Ván cùng máy", "Lượt đổi trong bảng", "Ván với nhiều máy", "Bảng không đọc lại lượt" (chỉ một `status` trên màn hình, bảng không có `aria-live`)
- [x] 1.4 Online (design §4): chip "Đã kết nối"/"Mất kết nối" theo `snapshot.connection` và ngưỡng 1,5 giây của `ConnectionNotice`, tên người ở xa, ghế máy; test với transport online giả và đồng hồ giả theo "Hai người trong phòng", "Mất kết nối" (cả chip lẫn "Đang kết nối lại…", mỗi câu một lần)

## 2. Dòng lượt và khoảnh khắc kết thúc

- [x] 2.1 `ResultCard.tsx`: khung luôn bọc **một** phần tử `role="status"` cố định; biến thể "dòng lượt" / "thẻ" theo `result` (chỉ đổi class và anh em, không gắn lại phần tử `status`); chip "Kết thúc", dòng `useResultDetail`, nút chính "Ván mới"/"Chơi lại" (cùng luồng xác nhận hiện có); hàng nút của ván ẩn nút đó khi thẻ hiện; không có "Về menu" trong thẻ
- [x] 2.2 `useResultDetail` cho Tic-tac-toe (hàng/cột/đường chéo), Cờ caro (hướng của hàng thắng), Cờ cá ngựa (màu thắng); test đơn vị từng hook
- [x] 2.3 Chuyển `usePrefersReducedMotion` sang `apps/web/src/lib/use-prefers-reduced-motion.ts` (Cờ cá ngựa dùng lại, test hiện có xanh); keyframes `confetti`, `thinking-dots`, `draw-line` trong `packages/ui/src/styles.css`
- [x] 2.4 `Confetti.tsx`: kích hoạt khi `result` chuyển từ `null` sang có người ở thiết bị này thắng (ref giữ kết quả trước), không gắn khi giảm chuyển động, 24 mảnh hằng `aria-hidden` `pointer-events-none`, gỡ sau khi chạy xong
- [x] 2.5 Test component theo MODIFIED "Báo kết quả": "Có người thắng" (đúng một nút "Ván mới", nằm trong thẻ; "Về menu" một lần; có phần tử ăn mừng), "Hoà", "Nhiều người cùng thắng", "Máy thắng", "Câu kết quả được đọc từ dòng lượt" (cùng một nút DOM `status` trước và sau khi thắng), "Hoàn tác nước thắng trả lại dòng lượt", "Giảm chuyển động" (`matchMedia` giả: không có phần tử ăn mừng nào trong DOM); tải lại ván đã thắng không có confetti

## 3. Hàng thắng Tic-tac-toe

- [x] 3.1 `games/tictactoe/Board.tsx`: tính hàng thắng từ `WINNING_LINES`, mọi hàng thắng (kể cả hai hàng cùng lúc), ô thắng viền mực `border-fg` (quân khác không mờ), `aria-describedby` "thuộc hàng thắng", nét `--game-win` (mực) mảnh dưới quân và trên mặt ô, vẽ dần `animate-draw-line motion-reduce:animate-none`
- [x] 3.2 Test theo "Thắng theo hàng ngang" (ba ô có mô tả `Games.tictactoe.winningCell`, phần tử nét có mặt, thẻ ghi "Ba X thẳng hàng ở hàng 1"), "Thắng theo đường chéo"; bản dịch `Games.tictactoe.winningCell`, `Games.tictactoe.result.*`

## 4. Máy đang nghĩ và lý do nút không bấm được

- [x] 4.1 `PlayScreen`: tính `thinking` (design §3), hàng máy ghi "Đang nghĩ…" + ba chấm `motion-reduce`, ô `board` của lưới `aria-busy`; test theo "Máy đang nghĩ", "Máy đi xong" với transport cục bộ và đồng hồ giả
- [x] 4.2 `unavailable-reason.ts` (chỉ dữ liệu; không phải hook nên tên không có `use-`): hàm thuần từ snapshot ra mã lý do theo thứ tự ở design §7 (`thinking`, `noMoves`, `roll` khi `!canUndo && lastEntry?.outcome !== undefined`, `noOwnMoves`, `noRedo`), không đổi snapshot của transport; test đơn vị đủ năm nhánh
- [x] 4.3 Nút "Hoàn tác"/"Làm lại": `aria-describedby` tới phần tử lý do (bản dịch `Play.unavailable.*`), chữ hiện khi nút có tiêu điểm hoặc vừa bị bấm, `sr-only` lúc khác
- [x] 4.4 Test component theo "Đầu ván", "Máy đi trước", "Ngay sau lần gieo" (`toHaveAccessibleDescription`, chữ hiện sau khi bấm); test "Tiêu điểm ở lại trên nút hoàn tác khi hết nước" hiện có xanh
- [x] 4.5 Cờ cá ngựa: `BoardProps.lockedReason` (lý do khoá đã dịch: đang chờ ai, chờ kết nối lại, đang gửi) do `PlayScreen` truyền; nút "Gieo xúc xắc" khoá có mô tả lý do (`Games.ludo.unavailable.choose`, `Play.locked.*`); test theo "Cần chọn ngựa trước", "Đang chờ người ở xa"
- [x] 4.6 Bản dịch vi/en/ja mọi khoá ở design §9; `messages.test.ts` xanh

## 5. E2E và kiểm tra

- [x] 5.1 Rà và sửa E2E hiện có theo nút "Ván mới"/"Chơi lại" nằm trong thẻ khi ván xong và chip kết nối: `play-tictactoe.spec.ts` dòng 89, 103, 114, 143–144, 268, 289, 301, 311; `play-vs-ai.spec.ts` dòng 115, 191, 201, 220, 225; `play-caro.spec.ts` dòng 193–194, 211–214, 275–276; `online.spec.ts` dòng 59–60, 79–82, 93, 103, 149, 158, 212, 231; `online-ludo.spec.ts` dòng 80–81, 126; `play-ludo.spec.ts` dòng 212–213; `saved-games.spec.ts` dòng 93 (mọi chỗ vẫn phải khớp đúng một nút/liên kết; dòng theo nhánh `fix/ui-audit-defects` ngày 03/11/2026, dò lại khi apply). Khi apply: mọi dòng đó vẫn khớp đúng một nút "Ván mới"/"Chơi lại" (cùng tên, nay trong thẻ) nên không phải sửa; chỉ thêm kiểm tra bảng người chơi và "Mất kết nối" vào `online.spec.ts`
- [x] 5.2 E2E mới: `play-tictactoe.spec.ts` (thắng → thẻ kết quả, hàng thắng, "Ván mới" từ thẻ, hoàn tác nước thắng), `play-vs-ai.spec.ts` (hàng máy "Đang nghĩ…" rồi hết), `online.spec.ts` (bảng người chơi có tên đối thủ, "Mất kết nối" khi mất mạng), một E2E thắng với `reducedMotion: "reduce"`; khung 1280 × 800: ván Cờ cá ngựa 4 người cùng máy lưu sẵn với bốn lựa chọn ngựa (scenario "Cờ cá ngựa 4 người vừa màn hình máy tính") và phòng Cờ cá ngựa 4 ghế online với bốn lựa chọn (scenario "Cờ cá ngựa online vừa màn hình máy tính"; dựng phòng bằng biên bản có sẵn như E2E online hiện làm, hoặc thêm hook gieo cố định cho server realtime E2E nếu chưa có) — `toBeInViewport` cho mọi phần
- [x] 5.3 E2E hiện có xanh ở cả hai cấu hình máy, vẫn đọc `getByRole("status")`, `data-ply`, `data-ludo-choice`
- [x] 5.4 `apps/web/ui-shots/screens.shots.ts`: ảnh ở design "Kiểm tra" (vừa thắng, hoà, máy thắng, máy đang nghĩ, Cờ cá ngựa có bảng người chơi trên máy tính và dải trên điện thoại, online "Mất kết nối", vừa thắng khi giảm chuyển động); chạy `pnpm ui:shots`, xem từng ảnh sáng/tối × 390/1280, so với mockup khung 3–7
- [x] 5.5 Rà `web-design-guidelines` trên các file đã đổi; đi lại checklist UX bàn cờ của skill `board-games-ui` ở ba chế độ
- [x] 5.6 Đối chiếu delta với code; diff trọn thân khối MODIFIED "Báo kết quả" với `openspec/specs/local-play/spec.md`; `pnpm exec openspec validate add-game-feedback --strict`, `pnpm check`, `pnpm knip`, `pnpm test:e2e`, `pnpm spec:check`; cập nhật plan.md §10 (M6.5)
- [x] 5.7 Archive change (`pnpm exec openspec archive add-game-feedback --yes`) trong cùng PR, sau review, sau `redesign-game-boards`

## Ngoài phạm vi

- Đếm thắng/hoà trong phiên (mockup "Thắng 3 · Hoà 1"): cần quyết định lưu trữ (theo tab, theo game × chế độ, theo phòng online mà server chưa giữ kết quả), là một phần của thống kê cá nhân (idea.md §4.2, v1); change riêng sau M6.5.
- Trạng thái kết nối của người khác trong phòng: cần server theo dõi kết nối từng ghế (đổi giao thức), để M8.
- Âm thanh, thư viện `motion`: không làm ở M6.5.
