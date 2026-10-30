# Proposal

## Why

Sau change `add-game-engine`, engine đã có hợp đồng game và phiên chơi nhưng chưa có game nào chơi được, và menu vẫn là danh sách tạm viết cứng. Cần một game đơn giản nhất (Tic-tac-toe) đi trọn đường từ luật → menu → màn hình chơi → lưu ván, để kiểm chứng kiến trúc "thêm game chỉ cần luật + bàn cờ + bản dịch + một dòng đăng ký" trước khi làm caro, cá ngựa, cờ vua. Thuộc mốc **M1. Engine + game mẫu cùng máy** (plan.md §6.1); phụ thuộc `add-game-engine` (phải archive change đó trước).

## What Changes

- Thêm luật **Tic-tac-toe** (bàn 3×3, X đi trước, ba quân thẳng hàng thắng, đầy bàn là hoà) trong `packages/games`, vượt bộ kiểm tra hợp đồng chung.
- Thêm **danh sách game đăng ký** dùng chung: `packages/games` liệt kê các game có luật và suy ra kiểu mã game đã đăng ký; `apps/web` ghép mỗi game với bàn cờ của nó qua một hàm kiểm tra cặp kiểu lúc đăng ký, phần giao diện của từng game được nạp lười. Thêm game sau này chỉ thêm một dòng.
- **Menu** sinh từ danh sách đăng ký thay cho danh sách viết cứng: game đã có luật vào chơi được, game dự kiến (caro, cá ngựa, cờ vua) vẫn hiện "Sắp có"; game có ván đang dở hiện lối "Tiếp tục".
- Thêm **màn hình chơi cùng máy** `/play/<mã game>`: hai người thay phiên trên cùng thiết bị, báo lượt, hoàn tác/làm lại, báo kết quả, ván mới (hỏi xác nhận khi đang dở), về menu; điều khiển được bằng bàn phím mà không mất tiêu điểm sau mỗi nước.
- Thêm **`Transport`** làm nơi duy nhất giữ phiên chơi: màn hình chơi chỉ đọc ảnh chụp và gửi yêu cầu (đi nước, hoàn tác, làm lại, ván mới), nên M2 (đấu với máy) và M4 (online) chỉ thêm transport mới. M1 có `LocalTransport`.
- **Tự lưu ván đang dở** trên trình duyệt (IndexedDB), do `LocalTransport` đảm nhận: tải lại trang hoặc quay lại sau vẫn tiếp tục đúng ván; ván đã kết thúc không giữ lại.
- Bản dịch vi/en/ja cho mọi chữ mới.

## Capabilities

### New Capabilities

- `tictactoe`: luật Tic-tac-toe — bàn, lượt, điều kiện thắng, hoà.
- `game-menu`: menu chọn game — game nào hiện, chơi được hay "Sắp có", thông tin trên mỗi thẻ, lối tiếp tục ván dở.
- `local-play`: chơi cùng máy — màn hình ván, báo lượt và kết quả, hoàn tác/làm lại, ván mới, tự lưu và khôi phục ván, truy cập bằng bàn phím.

### Modified Capabilities

(không có — `localization` đã yêu cầu mọi chữ hiển thị có đủ ba bản dịch; change này chỉ tuân theo.)

## Ngoài phạm vi

- Đấu với máy cho Tic-tac-toe: M2 (AI). Lựa chọn "Đấu với máy" trên màn hình chọn chế độ chưa có.
- Chơi online: M4.
- Trang luật chơi riêng cho từng game (`rules.{vi,en,ja}.mdx`): M8.
- Bộ lọc menu theo thể loại/số người/thời lượng, ô tìm kiếm: làm khi có đủ game để cần lọc (sau MVP).
- Nhãn độ khó và hình minh hoạ trên thẻ menu (idea.md §4.1): hoãn, chờ chủ dự án quyết định có giữ cho MVP không; thẻ hiện chỉ có tên, số người, thời lượng.
- Mục "Tiếp tục ván dở" riêng dưới lưới thẻ như phác thảo idea.md §5: M1 đặt lối "Tiếp tục" ngay trên thẻ; xem lại ở M2 khi có ván đấu với máy.
- Chọn ai đi trước, đổi ký hiệu quân: chưa cần cho game mẫu.
- Nhiều ván dở cùng lúc cho một game: mỗi game chỉ giữ một ván dở. Có giữ riêng ván cùng máy và ván với máy hay không quyết định ở M2 (định dạng lưu đã có chỗ ghi chế độ).
- Khoá hoặc cảnh báo khi cùng một game mở ở hai tab: không làm; tab ghi sau thắng.
- Điều hướng bàn cờ lớn bằng phím mũi tên (lưới `role="grid"`, roving tabindex): M5 (caro 15×15). Bàn 3×3 dùng Tab là đủ.

## Impact

- **Code**:
  - `packages/games/src/tictactoe/`, `packages/games/src/index.ts` (danh sách game, `RegisteredGameId`). `packages/games` thêm phụ thuộc `@board-games/engine`.
  - `apps/web/src/games/` (registry nạp lười, `define-game-entry.tsx`, `tictactoe/Board.tsx`), `apps/web/src/features/play/`, `apps/web/src/features/menu/` (thay `upcoming-games.ts`), `apps/web/src/transport/` (`Transport`, `LocalTransport`), `apps/web/src/lib/crypto-rng.ts`, `apps/web/src/app/play/[gameId]/`, `apps/web/messages/*.json`, `apps/web/e2e/menu.spec.ts` (menu thêm một thẻ).
  - `packages/ui`: thêm component hộp thoại xác nhận dùng chung.
- **Thư viện mới** (`apps/web`): `idb-keyval` 6.3 (IndexedDB), `zod` 4.6 (kiểm tra dữ liệu đọc từ IndexedDB). Cả hai đã phát hành đủ lâu theo chính sách của pnpm.
- **Dữ liệu trình duyệt**: database IndexedDB mới `board-games-saved-games` (idb-keyval chỉ dùng được một store mỗi database, nên đặt tên theo mục đích để thống kê ở v1 dùng database riêng).
- **Hành vi trang**: menu chuyển một phần sang client để đọc ván dở từ IndexedDB.
- **Tài liệu**: plan.md §3.4 phần `Transport` cập nhật theo design (task 8.3).
