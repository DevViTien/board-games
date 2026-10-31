# Proposal

## Why

Sau change `add-game-ai`, engine đã chọn được nước đi cho máy nhưng người chơi chưa có cách nào đấu với máy: app chỉ có chế độ cùng máy, mở thẳng vào bàn cờ, và chỉ giữ một ván dở mỗi game. Change này đưa đấu với máy lên giao diện, với màn hình bắt đầu ván trước khi chơi, và lưu ván dở theo **game × chế độ** như chủ dự án đã chốt (idea.md §9, quyết định 11). Thuộc mốc **M2. AI** (plan.md §6.1); phụ thuộc `add-game-ai` (phải archive change đó trước).

## What Changes

- **Màn hình bắt đầu ván** tại `/play/<mã game>`: chọn chế độ (đấu với máy / cùng máy), mức độ (Dễ / Vừa / Khó), ai đi trước (tôi / máy / ngẫu nhiên), nhớ lựa chọn gần nhất của từng game; tiếp tục ván dở của game đó; bắt đầu ván mới khi đã có ván dở cùng chế độ thì hỏi xác nhận. Màn hình chơi chuyển sang `/play/<mã game>/<chế độ>` (`local`, `ai`).
- **Đấu với máy**: máy tự đi khi tới lượt, nghĩ trong Web Worker nên giao diện không bị đứng, có đường dự phòng để ván không bao giờ kẹt ở lượt máy; bàn khoá và báo "Máy đang nghĩ…" trong lúc chờ; báo lượt và kết quả theo "bạn" / "máy"; màn hình ghi chế độ và mức độ ("Với máy · Khó"); hoàn tác lùi về lượt trước của người chơi (bỏ cả nước đáp của máy), nước máy đã chọn mà chưa hiện ra thì bị bỏ.
- **Transport theo ghế**: transport cục bộ nhận cấu hình ai điều khiển mỗi ghế (người hoặc máy với một mức độ). Chơi cùng máy là trường hợp mọi ghế là người; đấu với máy có một ghế là máy. Cá ngựa (M6) dùng lại để trộn người và máy.
- **Ván dở theo game × chế độ**: ván cùng máy và ván với máy của cùng một game được lưu riêng; ván với máy được lưu ngay từ lúc bắt đầu, kèm cấu hình ghế (mức độ, bên của người chơi) và lựa chọn người đi trước, nhưng chỉ được coi là ván dở khi người chơi đã đi ít nhất một nước. Ván cùng máy đã lưu ở bản trước được chuyển sang cách lưu mới một lần khi app mở, và vẫn tiếp tục được.
- **Menu**: lối vào mỗi thẻ luôn là "Chơi" và mở màn hình bắt đầu ván; thêm mục **"Tiếp tục ván dở"** liệt kê từng ván dở kèm chế độ (ví dụ "Tic-tac-toe · Với máy · Khó").
- Bản dịch vi/en/ja cho mọi chữ mới; thêm nhóm lựa chọn dạng nút radio dùng chung trong `packages/ui`.

## Capabilities

### New Capabilities

- `game-setup`: màn hình bắt đầu ván — chọn chế độ, mức độ, ai đi trước; nhớ lựa chọn gần nhất; tiếp tục ván dở của game; xác nhận trước khi bỏ ván dở cùng chế độ.
- `play-vs-ai`: đấu với máy — máy tự đi, giao diện không bị đứng, báo lượt và kết quả theo bạn/máy, ghi chế độ và mức độ, hoàn tác khi đấu với máy, thế nào là ván dở khi đấu với máy, lưu và khôi phục ván với máy.

### Modified Capabilities

- `local-play`: "Mở màn hình chơi theo mã game" — màn hình chơi cùng máy chuyển sang `/play/<mã game>/local`, chế độ không tồn tại ra trang không tìm thấy; "Tự lưu và khôi phục ván dở" — mỗi game một ván cùng máy (ván với máy lưu riêng); thêm requirement "Ván cùng máy lưu ở bản trước" (tiếp tục được, hiện trong danh sách ván dở, không sống lại sau khi đã bị thay).
- `game-menu`: "Vào chơi từ menu" — thẻ mở màn hình bắt đầu ván thay vì màn hình chơi; "Lối tiếp tục ván dở" — thay nhãn "Tiếp tục" trên thẻ bằng mục "Tiếp tục ván dở" liệt kê theo game × chế độ.

## Ngoài phạm vi

- Chọn kích thước bàn trên màn hình bắt đầu ván: M5 (caro 15×15 / 19×19). Thiết lập ván truyền từ màn hình bắt đầu sang màn hình chơi là một object chung (design §1), M5 thêm phần tuỳ chọn luật vào đó chứ không làm lại cơ chế.
- Chọn số người, tuỳ chọn luật khác, trộn nhiều người và nhiều máy trong một ván (ghế trống cho máy chơi thay): M6. Transport theo ghế và định dạng lưu theo ghế đã hỗ trợ ở mức dữ liệu; giao diện chọn và cách xếp ván đó vào slot nào làm ở M6.
- Đổi mức độ giữa ván: không làm; muốn đổi thì bắt đầu ván mới.
- Gợi ý nước đi (nút "Gợi ý" ở idea.md §5): làm sau, dùng lại AI.
- Chơi online: M4.
- Khoá hoặc cảnh báo khi cùng một ván mở ở hai tab: vẫn như M1 (tab ghi sau thắng).

## Impact

- **Code**:
  - `apps/web/src/app/play/[gameId]/` (trang bắt đầu ván; giữ `not-found.tsx`, `error.tsx`), `apps/web/src/app/play/[gameId]/[mode]/` (màn hình chơi, chuyển từ route cũ).
  - `apps/web/src/features/setup/` (mới), `apps/web/src/features/play/` (PlayScreen báo bạn/máy và chế độ, GamePlay chọn cấu hình ghế, PlayRoute đọc thiết lập ván), `apps/web/src/features/menu/` (mục tiếp tục ván dở, `PlayLink` thành liên kết thường).
  - `apps/web/src/transport/` (transport theo ghế, kho lưu theo game × chế độ kèm chuyển khoá M1), `apps/web/src/ai-worker/` (mới: Worker gọi `chooseMove`, `AiPlayer` có dự phòng).
  - `packages/ui` (nhóm lựa chọn radio dùng chung), `apps/web/messages/*.json` (thêm `Setup.*`, `Modes.*`, `Levels.*`, khoá `Play.*` mới; bỏ `Menu.continue`), `apps/web/e2e/*`.
- **Dữ liệu trình duyệt**: khoá IndexedDB đổi từ `<mã game>` sang `<mã game>:<chế độ>`; vỏ lưu lên `version: 2` (thêm cấu hình chế độ theo ghế và cờ "ván dở"). Khoá cũ của ván cùng máy được chuyển sang khoá mới một lần, trước mọi lần đọc; dữ liệu của phiên bản mới hơn vẫn được giữ nguyên như M1. `localStorage` thêm một khoá cho lựa chọn gần nhất của màn hình bắt đầu ván.
- **Phụ thuộc**: không thêm thư viện.
- **Bất biến**: không chạm bất biến nào; AI chạy trong Web Worker như plan.md §3.3.
- **Tài liệu**: plan.md §3.2, §3.3, §3.4, §6.1 (dòng M2: `AITransport` → transport theo ghế) và §10 cập nhật trong task cuối.
- **E2E hiện có** đổi đường dẫn từ `/play/tictactoe` sang màn hình bắt đầu ván rồi `/play/tictactoe/local`.
