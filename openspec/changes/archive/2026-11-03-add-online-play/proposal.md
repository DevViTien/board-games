# Proposal

## Why

Change `add-online-rooms` dựng xong phía server của phòng online, nhưng người chơi chưa có cách nào dùng: chưa có tên tạm, chưa tạo phòng hay mở link mời được, màn hình chơi chưa biết đối thủ ở xa. Change này đưa chơi online lên giao diện: tạo phòng từ màn hình bắt đầu ván, gửi link mời hoặc mã phòng, bạn mở link là vào ván, và ván không mất khi rớt mạng hay khi Vercel cắt kết nối mỗi ~5 phút (M3). Thuộc mốc **M4. Phòng online** (plan.md §6.1); phụ thuộc `add-online-rooms` (phải archive change đó trước). Xong change này là xong M4.

## What Changes

- **Tên tạm và `playerId`**: lần đầu chơi online, người chơi nhập tên tạm; trình duyệt tạo `playerId` ngẫu nhiên và nhớ cả hai trong `localStorage` để lần sau không phải nhập lại và vào lại đúng ghế.
- **Màn hình bắt đầu ván** có thêm chế độ **"Online"**: nhập (hoặc sửa) tên tạm, bấm **"Tạo phòng"** để tạo phòng và vào trang phòng. Chế độ "Online" cũng được nhớ như hai chế độ kia.
- **Trang phòng `/room/<mã phòng>`**: hỏi tên tạm nếu chưa có; khi phòng còn ghế trống hiện **sảnh chờ** với link mời (sao chép, chia sẻ trên điện thoại), mã phòng và danh sách ghế; người mở link bấm **"Vào chơi"** mới ngồi ghế (mở nhầm link, ví dụ trong trình duyệt của ứng dụng chat, không chiếm ghế của bạn); đủ người thì vào màn hình ván dùng chung. Phòng không tồn tại, đã đủ người, app vừa cập nhật, hay chưa kết nối được máy chủ đều có lời báo đã dịch.
- **Chơi online**: lượt và kết quả nói theo "bạn" và tên đối thủ ("Đang chờ Minh…", "Minh thắng"), báo nước đối thủ vừa đi và phe mới khi bắt đầu ván mới; chỉ đi được khi đến lượt mình, nước đi hiện ra khi server đã nhận; không có hoàn tác; ván kết thúc thì "Chơi lại" tạo ván mới trong cùng phòng (đổi người đi trước).
- **Transport online**: lớp kết nối phòng (tự nối lại có giãn cách tối đa 10 giây; ping phát hiện kết nối "nửa sống"; đóng kết nối khi tab ẩn từ 60 giây, khi mất mạng, hoặc sau 10 phút không hoạt động để giữ hạn mức miễn phí, với nút "Tiếp tục") và transport online theo ghế (ghế `remote`) dựng ván từ trạng thái server gửi, dùng chung `PlayScreen`. Màn hình chỉ báo đang nối lại khi việc nối lại kéo dài quá 1,5 giây.
- **Menu** có ô **"Vào phòng"** nhập mã phòng.
- Màn hình ván dùng chung đọc thêm từ ảnh chụp: chế độ có hoàn tác hay không, lúc nào được bắt đầu ván mới, trạng thái kết nối.
- E2E bằng hai trình duyệt: tạo phòng, mở link mời, chơi hết ván, mất mạng rồi có lại vẫn đúng lượt, chơi lại; server realtime chạy ở máy cho E2E.
- Bản dịch vi/en/ja cho mọi chữ mới.

## Capabilities

### New Capabilities

- `player-identity`: tên tạm và `playerId` của người chơi trên trình duyệt — hỏi tên khi cần, nhớ lại, đổi tên.
- `online-play`: chơi online trên giao diện — tạo phòng, trang phòng và sảnh chờ, link mời và mã phòng, chơi theo lượt với đối thủ ở xa, kết nối lại tự động, phòng không vào được, chơi lại trong phòng.

### Modified Capabilities

- `game-setup`: "Chọn cách chơi trước khi vào ván" — thêm chế độ "Online" với nút "Tạo phòng"; "Nhớ lựa chọn gần nhất" — nhớ cả chế độ "Online" khi tạo phòng.
- `game-menu`: thêm requirement "Vào phòng bằng mã".

## Ngoài phạm vi

- Danh sách "Ván online đang chờ bạn" trên menu, chấm có mặt của đối thủ, xử thua khi bỏ ván, đầu hàng: M8. Muốn quay lại phòng thì mở lại link mời.
- Hiện nước đi trước khi server xác nhận (idea.md §6.3 "client hiển thị trước"): không làm ở M4 vì độ trễ đo được ở `sin1` ~70 ms (M3); xem design §4. Cập nhật idea.md §6.3 cho khớp.
- Hoàn tác, đề nghị hoà, đồng hồ, chat, mã QR: v1.
- Xem người khác chơi, "Đây là tôi" để nhận lại ghế khi mất `playerId`: làm sau; người thứ ba thấy trang "Phòng đã đủ người".
- Ô tên ở góc màn hình ("Xin chào, Khôi ✎", idea.md §5): làm cùng phần cài đặt (M8); ở M4 tên sửa được trong màn hình bắt đầu ván chế độ Online và ở trang phòng trước khi vào.
- Chọn số người và tuỳ chọn luật khi tạo phòng: M5/M6.

## Impact

- **Code**:
  - `apps/web/src/features/identity/` (mới), `features/room/` (mới: `RoomRoute`, sảnh chờ, trang lỗi phòng, tạo phòng), `features/setup/` (chế độ Online), `features/menu/` (ô vào phòng), `features/play/PlayScreen.tsx` (đối thủ ở xa, ẩn hoàn tác, trạng thái kết nối).
  - `apps/web/src/transport/` (mới: `room-connection.ts`, `online-transport.ts`; `socket.ts`; `types.ts` thêm ghế `remote`, `waitingFor: "opponent"`, `supportsUndo`, `canStartNewGame`, `connection`; transport cục bộ điền các trường mới).
  - `apps/web/src/lib/realtime-url.ts` (mới: địa chỉ server realtime); `packages/ui` thêm `Input` và token màu `danger` (ô tên, ô mã phòng, lời báo lỗi).
  - `apps/web/src/app/room/[code]/` (mới), `apps/web/src/config/` (khoá `localStorage` của danh tính), `apps/web/messages/*.json`, `apps/web/e2e/` (mới `online.spec.ts`), `apps/web/playwright.config.ts` (thêm server realtime).
- **Dữ liệu trình duyệt**: thêm khoá `localStorage` `board-games:identity`; lựa chọn gần nhất của màn hình bắt đầu nhận thêm giá trị chế độ `online`. Ván online không lưu ở IndexedDB (server giữ ván).
- **Phụ thuộc**: không thêm thư viện.
- **Bất biến**: "Kết nối WebSocket bị ngắt định kỳ là bình thường; client tự nối lại, người chơi không mất ván" và "một ván = danh sách nước đi" được thực hiện ở đây (dựng ván bằng phát lại biên bản từ server). Không chạm bất biến nào khác.
- **Tài liệu**: idea.md §6.3 (hiển thị trước), plan.md §3.2, §3.4 (`Transport`, ảnh chụp), §6.1 nếu cần, §10 (M4 xong) cập nhật trong task cuối.
