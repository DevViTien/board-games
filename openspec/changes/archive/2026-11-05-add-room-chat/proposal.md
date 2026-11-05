# Proposal

## Why

Bạn bè chơi online qua link mời hiện không có cách nói chuyện ngay trong phòng, phải mở ứng dụng khác giữa ván. Người dùng muốn có chat trong game cho mọi game. `idea.md` mới chỉ dự kiến "chat nhanh bằng emoji/câu có sẵn" cho v1; người dùng đã quyết định làm cả gõ tự do.

Change thuộc **Sau MVP (v1)** trong plan.md §6.3 (mục "chat nhanh", mở rộng thành chat đầy đủ).

## What Changes

- **Chat trong phòng online** cho mọi game, cả sảnh chờ lẫn màn hình chơi, bằng code dùng chung: thêm game không phải sửa gì cho chat. Chat hiện khi phòng có từ hai người có ghế; chơi cùng máy, đấu với máy, ngồi một mình ở sảnh chờ hay chơi một mình với các ghế máy thì không có.
- **Ba loại tin**: gõ tự do (một dòng, tối đa 200 ký tự), câu có sẵn (hiện theo ngôn ngữ của người đọc) và emoji cảm xúc (một chạm là gửi).
- **Chỉ người có ghế** đọc và gửi được; người vừa mở link chưa vào ghế không thấy nội dung. Người đã đầu hàng vẫn chat được vì ghế còn là của họ.
- **Giữ 30 tin gần nhất của phòng**, qua nối lại, tải lại trang và các ván "Chơi lại". Tin nằm trong dữ liệu phòng trên Redis và bị xoá cùng phòng.
- **Giới hạn riêng** 5 tin trong 10 giây mỗi người: quá giới hạn chỉ bị từ chối tin, không mất kết nối.
- **Gửi không mất chữ, không trùng**: ô nhập giữ nội dung tới khi server xác nhận; gửi lại không tạo tin đôi.
- **Tin đến khi chat đóng**: bong bóng ngắn và số tin chưa đọc, thêm thẻ "Chat · số" dưới thanh trên khi nút Chat ngoài màn hình; không làm bàn dịch chuyển.
- **Nút "Tắt chat"** lưu theo trình duyệt: không bong bóng, không số chưa đọc.
- **Chat không đụng tới ván**: không đổi đồng hồ bỏ ván, không vào lịch sử nước đi, không làm chậm việc hiện nước đi, không làm nước đi bị từ chối (ghi trùng lúc thì gộp lại, không tính lại ván).

## Capabilities

### New Capabilities

- `room-chat`: chat giữa những người có ghế trong một phòng online: ai đọc và gửi được, loại tin và cách làm sạch, lưu trữ, giới hạn tốc độ, cách hiện và cách tắt.

### Modified Capabilities

- `online-rooms`: "Mọi người trong phòng thấy cùng một ván" (tin chat là một thay đổi của phòng, chỉ gửi cho người có ghế) và "Không lộ danh tính người chơi" (trạng thái phòng có tên người gửi tin, không có `playerId`).

## Impact

- **Protocol** (`packages/protocol`): thông điệp `chat`, trường `chat` trong `RoomView`, mã lỗi `invalid-chat`, `chat-too-fast`, danh sách id câu có sẵn và emoji, `id` tuỳ chọn trong `rejected`. `PROTOCOL_VERSION` giữ nguyên vì client cũ bỏ qua trường lạ.
- **Server** (`apps/web/src/server`): `StoredRoom.chat` (đọc phòng cũ là danh sách rỗng, `STORED_ROOM_FORMAT` giữ nguyên, nên phòng đang chơi vẫn chạy), `room-service.chat`, gộp lại khi xung đột chỉ do chat trong `writeWithRetry`, `toRoomView` theo người nhận, `connection.ts`.
- **Client**: `room-connection` (gửi và nhận tin, từ chối tin không làm nối lại), `online-transport` (không phát lại ván và không vẽ lại khi chỉ có chat đổi), `features/chat/` mới, `RoomRoute` (giữ trạng thái chat qua sảnh chờ và ván, `memo`), `RoomLobby`, `PlayScreen` (một chỗ cắm chat), `config/storage-keys.ts`, bản dịch vi/en/ja.
- **Tài liệu**: `idea.md` §9 thêm quyết định chat gõ tự do; plan.md §6.3 và §10.
- **Thư viện và dịch vụ**: không thêm gì. Mỗi tin tốn khoảng 6 lệnh Redis (hạn mức miễn phí 500 nghìn lệnh mỗi tháng).
- **Bất biến**: không vi phạm. Chat không vào `GameRecord` (một ván vẫn là danh sách nước đi); dữ liệu nằm trong Redis như mọi thứ của phòng; chữ người dùng gõ là dữ liệu như tên tạm, còn chữ của app vẫn ở `messages/`, câu có sẵn đi qua mạng bằng id.

## Ngoài phạm vi

- Lọc từ xấu: với tiếng Việt dễ lọc sai mà vẫn lọt; nhóm bạn dùng nút "Tắt chat".
- Báo cáo, chặn từng người, chủ phòng xoá tin.
- Âm báo, rung, thông báo đẩy.
- Chat khi chơi cùng máy hay đấu với máy; máy trả lời chat.
- Gửi ảnh, nhắc tên, trả lời một tin, sửa hay xoá tin, link bấm được.
- Hiện giờ gửi tin.
- Giữ tin lâu hơn đời của phòng, xem lại chat sau khi phòng hết hạn.
