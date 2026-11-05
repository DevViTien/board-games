# Tasks

## 0. Thiết kế

- [x] 0.1 Người dùng chốt nội dung (gõ tự do + câu có sẵn + emoji) và cách lưu (giữ 30 tin theo phòng), 05/11/2026
- [x] 0.2 Mockup chạy được trong `mockup/` (ảnh `mockup/png/`), người dùng duyệt ngày 05/11/2026 kèm: giữ thẻ "Chat · số", bảng chat trên điều khiển ở máy tính, ẩn chat khi một mình ở sảnh chờ; đã chốt design §8 và §10
- [x] 0.3 Hai lượt duyệt thiết kế, đã gộp vào spec và design (gộp lại khi xung đột chỉ do chat, tin hỏng không mất phòng, không vẽ lại, `seq`, bộ gõ, chống spam phía client, giữ trạng thái qua sảnh chờ)

## 1. Protocol

- [x] 1.1 `packages/protocol`: `CHAT_PRESETS`, `CHAT_REACTIONS` (id), `CHAT_TEXT_MAX_LENGTH`, `sanitizeChatText` theo thứ tự ở design §2, `ChatBody`; test NFC sau khi lọc, U+202E, U+200D giữa và ngoài emoji, ngắt dòng, 200/201 code point, vô hình, dấu chồng, surrogate lẻ, cờ emoji (scenario "Tin quá dài", "Ký tự đảo chiều chữ", "Emoji ghép giữ nguyên", "Tin vô hình", "Dấu chồng quá nhiều", "Chữ tiếng Việt có dấu")
- [x] 1.2 Thông điệp `chat`, `REJECTABLE_REQUESTS`, `ROOM_ERROR.InvalidChat`/`ChatTooFast`, `rejected.id` tuỳ chọn, `RoomView.chat` có `seq`, parse lỏng (tin lạ bị bỏ, thiếu trường là `[]`); `PROTOCOL_VERSION` không đổi, sửa chú thích của `PROTOCOL_VERSION`, `RoomView`; test `messages.test.ts`, `room.test.ts`

## 2. Server

- [x] 2.1 `room.ts`: `StoredChatMessage`, `seq` trong tin, `StoredRoom.chat` đọc lỏng từng tin ở mọi format, `STORED_ROOM_FORMAT` không đổi; cập nhật các chỗ gọi `toRoomView` và fixture; `toRoomView(room, now, viewerId)` (`mine`, `[]` khi không ghế, không `playerId`); `connection.ts` truyền `playerId`; test `room.test.ts` (scenario "Phòng từ bản trước", "Tin lưu hỏng", "Người chưa có ghế không thấy tin", "Tin không có playerId", "Tin của mình sau khi xoay ghế")
- [x] 2.2 `room-service.chat` theo design §3: chưa ghế, trùng id, nội dung sai, tốc độ, cắt 30 tin, `turn` giữ nguyên, không `withAiMoves`; `writeWithRetry` gộp lại khi xung đột chỉ do chat (không gọi lại `decide`, không tính vào `attempts`, xung đột thật vẫn quyết định lại); test `room-service-chat.test.ts` (scenario "Người chưa có ghế gửi tin", "Người vừa vào ghế", "Người đã đầu hàng", "Câu có sẵn không có trong danh sách", "Tin thứ 31", "Qua ván mới", "Tin thứ sáu", "Hai kết nối của một người", "Gửi lại sau khi không có trả lời", "Đồng hồ bỏ ván", "Lịch sử ván", "Nước đi trùng lúc với tin", "Nước đi giữa loạt tin", "Máy không gửi tin", "Đổi tên sau khi gửi", "Tin gia hạn phòng")
- [x] 2.3 `connection.ts`: xử lý `chat` qua `request`, từ chối không đóng kết nối, tin trùng trả lời bằng `force`; không log nội dung tin; thêm `chat` vào `RoomRequest`; test `connection.test.ts` (scenario "Kho không trả lời", "Kho lỗi không log nội dung", "Tin chat ở hai instance", "Trạng thái phòng không chứa playerId")

## 3. Client: kết nối và transport

- [x] 3.1 `room-connection.ts`: từ chối `request === "chat"` không nối lại, `rejected` có `id`; `online-transport`, `RoomRoute` bỏ qua từ chối đó; test
- [x] 3.2 `online-transport.ts`: cùng `gameNumber` và cùng toàn bộ `record` (so `JSON.stringify`) thì không `fromRecord`, không đổi `shown`/hàng chờ/hẹn giờ; không áp dụng khi có lời chào, tính `queued`, vẫn cập nhật `room`/`seat`, chỉ `render` khi ghế, `you`, trạng thái, đồng hồ đổi; `RoomContent` đăng ký hẹp, `RoomGame` `memo`; test đếm số lần phát lại, đếm số lần vẽ `PlayScreen` ở `RoomRoute` và "Tin tới khi đang hiện lần lượt các nước"

## 4. Tính năng chat

- [x] 4.1 `features/chat/use-room-chat.ts`: gọi phía trên nhánh sảnh chờ / màn hình chơi; đọc tin từ `connection`, một tin chờ mỗi lúc, `id` gắn với nội dung, xác nhận theo `mine && id`, chỉ xoá ô nhập khi nội dung còn đúng, quá 8 giây thì báo và `connection.reconnect()`, cửa sổ 5 tin/10 giây phía client, `crypto.randomUUID` có dự phòng; test (scenario "Server xác nhận", "Gõ tiếp khi đang gửi", "Sửa rồi gửi lại", "Gửi lại sau khi không có trả lời", "Câu có sẵn chưa gửi được", "Chạm liên tục vào emoji", "Đang mất kết nối", "Kết nối đang tạm dừng")
- [x] 4.2 Chưa đọc và tắt chat: mốc `seq` trong `sessionStorage`, lấy ở bản phòng đầu tiên có ghế, `board-games:chat-muted` trong `config/storage-keys.ts`, đọc an toàn bằng zod; test (scenario "Tin của mình", "Tải lại trang", "Mở chat", "Hơn 30 tin chưa đọc", "Người vừa vào ghế", "Tắt rồi có tin mới", "Nhớ lựa chọn", "Bật lại")
- [x] 4.3 Bản dịch vi/en/ja: `Chat.*`, mọi `Chat.preset.<id>`, `Chat.reaction.<id>` (tên đọc được), thông báo lỗi `invalid-chat`, `chat-too-fast`, đang gửi, chưa gửi được, đang kết nối lại, đang tắt; bảng id → emoji; test có đủ khoá và emoji cho mọi id trong `CHAT_PRESETS`, `CHAT_REACTIONS` (scenario "Tên đọc được của emoji")
- [x] 4.4 Icon `MessageCircle` trong `packages/ui/src/icons.ts`; `--animate-chat-bubble` trong `styles.css` (có nhánh `motion-reduce`); token mới nếu mockup cần, đủ sáng và tối
- [x] 4.5 `ChatButton` (số chưa đọc trong tên đọc được), `ChatBubble` (3–5 giây, chạm để mở, chờ khi `held`), thẻ "Chat · số" khi nút ngoài màn hình (`IntersectionObserver`; scenario "Nút chat ngoài màn hình"), `ChatPanel` (`role="log"`, gộp tin liền nhau, hàng emoji và câu có sẵn, ô nhập, đếm ký tự, các trạng thái kể cả `Idle`/`Paused` kèm "Tiếp tục", nút tin mới, không tự cuộn, Esc, `isComposing`, `enterKeyHint`, giữ bàn phím khi bấm gửi; vùng đọc tin mới ngoài các bọc `inert`); test component theo vai trò (scenario "Tin mới khi chat đóng", "Tin tới trong cú tung", "Giảm chuyển động", "Enter khi đang gõ bằng bộ gõ", "Đọc tin mới một lần", "Dấu chồng quá nhiều", "Văn bản giống HTML", "Tin dài liền nhau", "Gửi và đóng bằng bàn phím", "Đang đọc tin cũ", "Tên nút có số chưa đọc", "Câu có sẵn theo ngôn ngữ người đọc")
- [x] 4.6 Bố cục theo mockup: portal có `data-game`, `z-index` giữa thanh trên và lớp phủ cú tung, tấm trượt trên điện thoại kèm `visualViewport`, tấm bên khi xoay ngang, bảng trên máy tính; bàn không dịch chuyển; `inert` khi `held`; bảng trên điều khiển ở máy tính có dòng lượt và "Xử thắng", xuống dưới thẻ kết quả khi ván kết thúc; test với `visualViewport` giả (scenario "Bàn phím ảo mở", "Máy tính vẫn đi được khi chat mở")

## 5. Ghép vào màn hình

- [x] 5.1 `RoomContent` giữ `use-room-chat`; `PlayScreen` thêm render prop `chat` với `held`, `hasButtons` tính cả chat; `RoomLobby` có chỗ cắm; `focusTitle` bỏ qua khi tiêu điểm trong chat; quy tắc hiện theo design §6; cùng máy và đấu với máy không có chat; test (scenario "Chat trong ván online", "Chat ở sảnh chờ", "Một mình ở sảnh chờ", "Sau khi ván kết thúc", "Người đã đầu hàng", "Chơi cùng máy", "Một người với các ghế máy", "Đủ người khi đang gõ")

## 6. E2E, ảnh và kiểm tra

- [x] 6.1 `e2e/online-chat.spec.ts` hai trình duyệt (kết luận cả hai phía): gửi nhận; câu có sẵn vi ↔ en; chưa ghế không thấy; tải lại còn tin; chạm emoji liên tục không mất kết nối và vẫn chơi tiếp được; Esc; tắt chat; bàn đứng yên và không cuộn ngang ở 360 × 740, 844 × 390 (scenario "Bàn đứng yên trên điện thoại", "Điện thoại ngang", "Máy tính vẫn đi được khi chat mở", "Nối lại vẫn còn tin")
- [x] 6.2 `test:a11y` thêm trạng thái chat mở, bong bóng, tắt chat, sáng/tối, 0 vi phạm
- [x] 6.3 `ui-shots` (`screens.shots.ts`): nút có số, bong bóng, chat mở, tắt chat, sảnh chờ — sáng/tối × 360/390/1280, thêm 844 × 390; xem từng ảnh, so với `mockup/png/`
- [x] 6.4 Rà `web-design-guidelines` trên các file đã đổi
- [x] 6.5 Tài liệu: `idea.md` §9 thêm quyết định 16 (chat gõ tự do, giữ 30 tin theo phòng, không lọc từ) và sửa dòng v1 ở §4, §7; plan.md §6.3, §10; README (dữ liệu chat nằm ở đâu, bao lâu)
- [x] 6.6 `pnpm check --concurrency=1`, `KNIP_DISABLE_RAW_TRANSFER=1 pnpm knip`, `pnpm format:check`, `pnpm spec:check`, `pnpm test:e2e` (đầy đủ), `pnpm test:a11y`, `pnpm ui:shots` xanh

## Ngoài phạm vi

- Thử trên điện thoại thật (bàn phím ảo iOS Safari và Android Chrome, TalkBack, VoiceOver): cần máy thật; Playwright không có bàn phím ảo. Người dùng tự thử sau khi deploy, thêm vào danh sách ở plan.md §10.

## Workflow follow-up

- Hai lượt review code (senior, săn bug), sửa, rồi archive trong cùng PR (`pnpm exec openspec archive add-room-chat --yes`), đối chiếu delta với code trước khi archive; khói online trên Production sau khi merge (hai kết nối, gửi tin, nối lại còn tin, không có `playerId` trong gói tin).
