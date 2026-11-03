# Proposal

## Why

Khảo sát M6.5 (plan.md §10) và checklist UX bàn cờ của skill `board-games-ui` cho thấy màn hình chơi chỉ có một dòng chữ để nói mọi thứ: không có bảng người chơi (ai cầm quân nào, ai là máy, ai ở xa, mình đang kết nối không), lượt chỉ thấy qua chữ, máy nghĩ thì bàn khoá im lặng, kết thúc ván phẳng (Tic-tac-toe không vẽ hàng thắng, không có khoảnh khắc ăn mừng, "Ván mới" lẫn giữa các nút), và nút "Hoàn tác"/"Gieo xúc xắc" bị khoá mà không nói vì sao. Mockup đã duyệt (03/11/2026, khung 3, 4, 5, 6, 7 ở `openspec/changes/archive/2026-11-03-add-design-foundation/mockup/`) chốt cách hiện các phản hồi này.

Thuộc mốc **M6.5. Thiết kế lại giao diện** (plan.md §6.2), change thứ ba sau `add-design-foundation` và `redesign-game-boards`.

## What Changes

- **Bảng người chơi** gọn (hàng ≤ 40 px) ở cột bên (máy tính) hoặc dải ô trên bàn (điện thoại), cùng một vị trí trong DOM: mỗi ghế một hàng theo thứ tự lượt — hình quân/màu kèm ký hiệu, tên theo chế độ ("X", "Bạn · X", "Máy · O", "Minh"), loại (cùng máy, máy kèm mức, người ở xa), ghế đang đến lượt có viền mực và chữ "Đến lượt"; online, hàng "Bạn" có trạng thái kết nối của thiết bị này ("Đã kết nối"/"Mất kết nối", khác lời của dòng "Đang kết nối lại…"). Không phải vùng thông báo (dòng `role="status"` vẫn là thông báo duy nhất).
- **Dòng lượt có cấp bậc**: một phần tử `role="status"` cố định cỡ `text-status`, luôn nằm trong khung của thẻ kết quả; khi ván kết thúc khung chỉ đổi biến thể thành **thẻ kết quả** (không gỡ ra gắn lại), nên câu kết quả được đọc từ chính vùng đó; hoàn tác nước thắng thì khung trở lại dòng lượt.
- **Khoảnh khắc kết thúc ván** (sửa requirement "Báo kết quả"): thẻ kết quả gồm chip "Kết thúc", câu kết quả lớn ("Bạn thắng!", "Hoà!"), dòng giải thích khi game có ("Ba X thẳng hàng ở hàng 1"), **một** nút chính "Ván mới" (online: "Chơi lại") — nút này ẩn khỏi hàng nút trong lúc thẻ hiện, "Về menu" giữ ở thanh trên, không lặp trong thẻ; **confetti** ngắn khi kết quả vừa chuyển sang có người ở thiết bị này thắng, không chặn nút, không gắn vào trang khi bật giảm chuyển động.
- **Hàng thắng Tic-tac-toe**: ba ô thắng có viền mực, nét bút dạ màu mực (khác màu X và O) vẽ qua hàng, nằm dưới quân và trên mặt ô (vẽ dần ≤ 300 ms, hiện ngay khi giảm chuyển động), mỗi ô được mô tả là thuộc hàng thắng; nước đi tạo hai hàng cùng lúc thì vẽ cả hai.
- **Tín hiệu máy đang nghĩ**: hàng của máy trong bảng người chơi ghi "Đang nghĩ…" với ba chấm nhịp (dừng khi giảm chuyển động), bàn mang `aria-busy` trong lúc máy nghĩ.
- **Lý do nút không bấm được**: "Hoàn tác"/"Làm lại" (chưa có nước nào, máy đi trước nên chưa có nước của bạn, không hoàn tác lần gieo, máy đang nghĩ — lấy từ dữ liệu snapshot sẵn có) và "Gieo xúc xắc" (đang chờ người khác, chọn ngựa trước, đang chờ server) có mô tả lý do gắn với nút, hiện thành chữ khi nút có tiêu điểm hay bị bấm.
- `GameUI` thêm hai hook tuỳ chọn: `useResultDetail` (dòng giải thích kết quả) và `useSeatSummary` (dòng phụ của ghế, ví dụ "2 ngựa trên đường" ở Cờ cá ngựa), và component tuỳ chọn `SeatMark` (hình quân của ghế trong bảng; game không có thì bảng vẽ ký hiệu của ghế bằng `--game-mark-*`). `BoardProps` thêm `lockedReason?` (vì sao bàn bị khoá, đã dịch: đang chờ ai, chờ kết nối lại, đang gửi) để nút gieo nói lý do mà không phải đoán.
- Giữ `role="status"`, `data-ply`, `data-ludo-choice`, `data-ludo-roll` và mọi tên đọc được E2E dùng; bản dịch vi/en/ja cho chữ mới; keyframes mới trong `packages/ui/src/styles.css` (`confetti`, `thinking-dots`, `draw-line`) có nhánh giảm chuyển động.

## Capabilities

### New Capabilities

(không có)

### Modified Capabilities

- `local-play`: thêm "Bảng người chơi", "Lý do nút không bấm được"; sửa "Báo kết quả" (thẻ kết quả, một vùng thông báo, nút không lặp, ăn mừng).
- `play-vs-ai`: thêm "Tín hiệu máy đang nghĩ".
- `online-play`: thêm "Bảng người chơi khi chơi online".
- `tictactoe`: thêm "Bàn Tic-tac-toe hiển thị hàng thắng".
- `ludo`: thêm "Lý do không gieo được".

## Ngoài phạm vi

- **Đếm thắng/hoà trong phiên** ("Thắng 3 · Hoà 1" trên mockup khung 3, chỉ để minh hoạ): cần quyết định lưu ở đâu và sống bao lâu (theo tab, theo game × chế độ trong IndexedDB cùng ván dở, hay theo phòng online — server chưa giữ kết quả các ván trước), có bị xoá khi "Ván mới" từ menu, có tính ván bỏ dở; đó là một phần của "Thống kê cá nhân" (idea.md §4.2, v1). Để change riêng sau M6.5.
- Trạng thái kết nối của **người khác** trong phòng (đối thủ đang mất mạng): server chưa theo dõi kết nối từng ghế; cần đổi giao thức và server, để M8 (xử thua khi bỏ ván).
- Âm thanh khi thắng/đặt quân (idea.md §4.2), thư viện `motion`: không làm ở M6.5.
- Đổi `GameUI` để mọi game bắt buộc có dòng giải thích kết quả: hook tuỳ chọn, game không có thì thẻ kết quả không có dòng đó.

## Impact

- **Code**: `apps/web/src/features/play/` (`PlayScreen.tsx`, `PlayerPanel.tsx` mới, `ResultCard.tsx` mới, `Confetti.tsx` mới, `unavailable-reason.ts` mới, `use-lost-for-a-while.ts` mới tách từ `ConnectionNotice.tsx`), `apps/web/src/lib/use-prefers-reduced-motion.ts` (chuyển từ `games/ludo/use-ludo-animation.ts`), `apps/web/src/games/types.ts` (`useResultDetail?`, `useSeatSummary?`, `SeatMark?`, `BoardProps.lockedReason?`), `apps/web/src/games/tictactoe/{Board.tsx,result-detail.ts,winning-line.ts}`, `apps/web/src/games/caro/result-detail.ts`, `apps/web/src/games/ludo/{Board.tsx,ColourSymbol.tsx,SeatMark.tsx,result-detail.ts,seat-summary.ts}`, `packages/ui/src/styles.css` (keyframes), `packages/ui` (`Badge` biến thể `ink`, icon `TrophyIcon`), `apps/web/messages/{vi,en,ja}.json`, `apps/web/e2e/*`, `apps/web/ui-shots/screens.shots.ts`.
- **Engine, games, protocol, server**: không đổi (`WINNING_LINES` của Tic-tac-toe, `SeatView`, `ConnectionStatus` của transport đã đủ dữ liệu).
- **Phụ thuộc**: không thêm thư viện (CSS keyframes, không `motion`).
- **Bất biến**: "Thêm một game chỉ gồm…" — giữ: hook và `SeatMark` mới đều tuỳ chọn, nằm trong thư mục game. "Không có chữ hiển thị nào ngoài messages" — giữ. Không chạm bất biến khác.
- **Tài liệu**: plan.md §10 (M6.5) ở task cuối.
