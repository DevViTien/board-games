# Design

## Context

Xem proposal.md (Why). Hiện trạng liên quan:

- Phòng là một JSON duy nhất (`StoredRoom`) trong HASH Redis; mỗi lần ghi là một script kiểm phiên bản (`rev`), ghi, gia hạn 7 ngày và `PUBLISH` cả phòng; `room-service.writeWithRetry` đọc lại và quyết định lại khi xung đột. `connection.ts` gửi từng kết nối một bản `RoomView` qua `toRoomView`, kèm `you`.
- Kết nối trên Vercel bị cắt khoảng 5 phút một lần; lời chào lại mang cả phòng. Giới hạn hiện có (30 thông điệp trong 10 giây) đóng kết nối. Mã từ chối `invalid-message`, `too-many-messages`, `unavailable` làm client nối lại (`RECONNECT_REJECTIONS`).
- `room-connection.ts` do `RoomRoute` sở hữu, sống lâu hơn cả sảnh chờ và màn hình chơi. `online-transport.ts` đọc phòng từ đó, phát lại `record` bằng `fromRecord` mỗi khi `revision` đổi và hiện nước đi lần lượt (`revealDelay`). `RoomContent` đăng ký cả snapshot của kết nối và vẽ lại chuỗi `RoomGame` → `PlayScreen` không `memo`.
- Client bỏ qua thông điệp server không hiểu; `RoomView` parse lỏng, trường lạ bị bỏ.
- Chưa có người xem: phòng đầy thì người không có ghế bị đóng kết nối; `you === null` chỉ xảy ra trước khi "Vào chơi".
- Người dùng đã chốt ngày 05/11/2026: gõ tự do + câu có sẵn + emoji; giữ 30 tin theo phòng. Mockup đã duyệt, kèm ba lựa chọn: giữ thẻ "Chat · số", bảng chat trên điều khiển ở máy tính, ẩn chat khi chỉ có một người ở sảnh chờ (mục 8). Hai lượt duyệt thiết kế đã chạy; các mục dưới đã gộp kết quả.

## Goals / Non-Goals

**Goals:**

- Mọi game có chat bằng một chỗ code duy nhất; thêm game không phải sửa gì cho chat (bất biến).
- Không mất tin qua lần cắt kết nối định kỳ, không tin đôi, không mất chữ đang gõ.
- Chat không làm hại ván: không đổi đồng hồ, không vào `GameRecord`, không gây nối lại, không làm nước đi bị từ chối, không làm chậm hay vẽ lại màn hình chơi.
- Phòng đang chơi và tab đang mở sống qua lần deploy.

**Non-Goals:**

- Lọc từ, báo cáo, chặn, âm báo, thông báo đẩy, giờ gửi, sửa/xoá tin (proposal, Ngoài phạm vi).

## Decisions

### 1. Tin nằm trong `StoredRoom`, không phải key riêng

`StoredRoom.chat` (tối đa 30). Mỗi tin là một lần ghi phòng bình thường.

|                  | Trong phòng (chọn)                                                                  | LIST Redis riêng                                                                               | Chỉ `PUBLISH`               |
| ---------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------- |
| Nối lại, tải lại | còn                                                                                 | còn                                                                                            | mất                         |
| Lệnh Redis       | 6 mỗi tin (đọc + script 5), cộng 1 cho mỗi instance đang nghe; vào phòng không thêm | 5 mỗi tin, thêm 1 `LRANGE` mỗi lần nối lại của mỗi người, kể cả không ai chat                  | 1                           |
| Code             | dùng lại ghi có kiểm phiên bản, kênh, nối lại, TTL                                  | API kho mới (redis, memory, fake, bộ hợp đồng), kênh thứ hai, kiểm trùng và giới hạn trong Lua | ít, nhưng cần xử lý mất tin |
| Nhược            | mỗi bản phòng nặng thêm; xung đột với nước đi (mục 3)                               | hai nguồn dữ liệu, TTL lệch nhau                                                               | không đáng tin              |

Dung lượng: trung bình khoảng 5 KB thêm cho 30 tin; tệ nhất khoảng 33 KB mỗi bản phòng. Chấp nhận được cho nhóm nhỏ. Hạn mức 500 nghìn lệnh mỗi tháng đủ cho khoảng 70 nghìn tin; kẻ phá cố tình có thể đốt khoảng 55 lệnh mỗi 10 giây, không tệ hơn việc spam đổi tên `sit` đang có (design `add-online-rooms` đã chấp nhận).

Hệ quả phải xử lý: mục 3 (xung đột), mục 5 (phát lại và vẽ lại), mục 2 (lưu bền, không lộ).

**Đã cân nhắc lại sau duyệt**: lượt duyệt chỉ ra nước đi Cờ vua phát lại ván trong cửa sổ đọc → ghi nên dễ thua chat. Trường `chat` riêng trong HASH không tăng `rev` tránh được hẳn, nhưng phải đưa kiểm trùng và giới hạn vào Lua, thêm API kho và đường đồng bộ thứ hai. Cách gộp lại ở mục 3 đạt cùng kết quả với một hàm.

### 2. Hình dạng dữ liệu và protocol

`packages/protocol`:

- `CHAT_PRESETS` (id `as const`: `hello`, `nice-move`, `hurry-up`, `one-moment`, `thanks`, `sorry`, `good-game`, `rematch`) và `CHAT_REACTIONS` (id: `like`, `laugh`, `wow`, `sad`, `fire`, `clap`). Chỉ id đi qua mạng. App giữ `Chat.preset.<id>`, `Chat.reaction.<id>` (tên đọc được) trong bản dịch và bảng id → emoji trong `features/chat/`; test bảo đảm mọi id có đủ khoá vi/en/ja và có emoji.
- `ChatBody` = `{ kind: "text", text }` | `{ kind: "preset", preset }` | `{ kind: "reaction", reaction }`.
- `sanitizeChatText(raw): string | null` (thuần, dùng ở cả hai phía), thứ tự: bỏ ký tự thay thế không hợp lệ và surrogate lẻ → ngắt dòng thành khoảng trắng → bỏ `\p{Cc}\p{Cf}\p{Co}\p{Cs}\p{Zl}\p{Zp}`, giữ U+200D chỉ khi nằm giữa hai ký tự `\p{Extended_Pictographic}`, giữ tag character chỉ trong chuỗi cờ emoji 🏴 → NFC → gộp khoảng trắng → trim → giữ tối đa 4 `\p{M}` liền nhau trên một chữ → `null` nếu không còn ký tự nhìn thấy (ngoài khoảng trắng, U+3164, U+2800, U+FFA0, U+115F, U+1160) hoặc quá `CHAT_TEXT_MAX_LENGTH` (200 code point). Không bỏ `\p{Cn}`: emoji mới có thể chưa được server cũ biết. Quy tắc tên người chơi chặn cả U+200D nên không dùng lại được.
- Thông điệp client `{ type: "chat", id, body }`; `id` khớp `/^[\w-]{8,64}$/`. `text`, `preset`, `reaction` ở schema là chuỗi không giới hạn thêm (khung đã bị chặn 16 KB): giá trị sai đi tới service và bị từ chối `invalid-chat`, không phải `invalid-message` (mã đó làm client nối lại), giống `ai-seat`. Client kiểm bằng cùng `sanitizeChatText` trước khi gửi, nên dán 20 KB không rời trình duyệt.
- `rejected` thêm trường tuỳ chọn `id` (chỉ cho `chat`), schema lỏng nên tương thích. `REJECTABLE_REQUESTS` thêm `chat`; `ROOM_ERROR` thêm `InvalidChat`, `ChatTooFast`. `perform`/`RoomRequest` trong `connection.ts` mở rộng theo.
- `RoomView.chat: readonly ChatMessageView[]` với `{ seq, id, name, mine, body }`, parse lỏng từng tin (tin lạ bị bỏ, thiếu trường là `[]`). Sửa chú thích "as every client sees it" của `RoomView`: tin chat là phần theo người nhận.
- **`PROTOCOL_VERSION` giữ 3**: client cũ bỏ trường lạ và không gửi `chat`; sửa chú thích "raised on every change" cho đúng. Lúc rollback, tab mới gửi `chat` tới server cũ sẽ nhận `invalid-message` rồi nối lại: chấp nhận, hiếm và tự hết khi tải lại.

`apps/web/src/server/room.ts`:

- `StoredChatMessage` = `{ seq, id, playerId, name, at, body }`. `seq` = `revision` của lần ghi tin đó: tăng dần trong phòng, dùng làm key React và mốc đã đọc (`id` chỉ riêng theo người nên không dùng được). `playerId` chỉ để kiểm giới hạn, chống trùng và tính `mine`.
- **`STORED_ROOM_FORMAT` giữ 3**: tăng lên là rollback mất mọi phòng (format lạ đọc thành không có phòng). `chat` ở schema hiện tại đọc **lỏng từng tin** (mảng `unknown`, `flatMap` qua schema tin, tin hỏng bị bỏ; không phải mảng thì `[]`): một tin hỏng hay loại tin của bản sau MUST NOT làm `parseStoredRoom` trả `null`, vì khi đó phòng thành `room-not-found`. Bản format 1, 2 thêm `chat: []` tường minh trong `transform`; `create` cũng vậy.
- `toRoomView(room, now, viewerId)`: `chat` là `[]` khi `viewerId` không có ghế; `mine = playerId === viewerId`; không bao giờ có `playerId`. `connection.ts` đã gửi theo từng kết nối nên chỉ truyền thêm `playerId`. Khoảng 15 chỗ gọi và fixture test phải cập nhật.

Tên lưu theo tin (tên lúc gửi), không tra theo ghế, vì ghế xoay sau mỗi "Chơi lại" và tên đổi được.

### 3. `room-service.chat` và xung đột

```
chat(code, playerId, { id, body }) → writeWithRetry(code, CHAT_ATTEMPTS = 3, room => …)
```

Theo thứ tự trong `decide`: chưa có ghế → `not-seated`; đã có tin cùng `playerId` + `id` → trả chính `room` (không ghi, `connection` gửi lại phòng bằng `force`, client được xác nhận); nội dung sai → `invalid-chat`; đã có ≥ 5 tin của `playerId` trong 10 giây → `chat-too-fast`; còn lại ghi `written(room, { chat: [...room.chat, entry].slice(-30) }, "keep")`. Không gọi `withAiMoves`, không đụng `turnStartedAt`.

Giới hạn tính từ `room.chat` nên đúng trên mọi instance và mọi tab. 30 tin đủ dài cho cửa sổ 10 giây: phòng tối đa 4 người, tối đa 20 tin trong cửa sổ.

**Gộp lại khi xung đột chỉ do chat** (trong `writeWithRetry`, dùng cho mọi yêu cầu): khi `update` trả `conflict`, đọc lại phòng. Nếu phòng mới chỉ khác phòng đã đọc ở `chat`, `revision`, `updatedAt` (so `JSON.stringify` các trường còn lại), thì giữ nguyên quyết định đã có, chỉ đổi `chat` và `revision` theo phòng mới rồi ghi lại, **không gọi lại `decide`** và **không tính vào `attempts`**, tối đa 10 lần (bị chặn sẵn bởi `storeTimeoutMs`). Với nước đi tốn thời gian (phát lại Cờ vua, chuỗi nước máy), toàn bộ phần đắt chỉ chạy một lần, và cửa sổ gộp chỉ còn một vòng đọc → ghi (khoảng 30 ms). Tin chat tự nó không gộp: `decide` của nó rẻ và cần đọc lại danh sách để cắt 30 tin. Nước đi ở `MOVE_ATTEMPTS` 2 vẫn như cũ cho xung đột thật.

**Đã cân nhắc**: chỉ tăng `MOVE_ATTEMPTS` (mỗi lần thử lại phát lại ván, vẫn thua được chat); nước đi không retry; giới hạn trong bộ nhớ từng kết nối (sai khi có hai tab, mất khi nối lại).

### 4. Từ chối tin không được làm nối lại

`room-connection.receive`: `RECONNECT_REJECTIONS` chỉ áp dụng khi `message.request !== "chat"`. Kho lỗi lúc ghi tin là chuyện của tin đó. `online-transport` và `RoomRoute` bỏ qua từ chối có `request === "chat"`. Ghi chú: `rejected` với `request: null` vẫn nối lại, nên client phải kiểm trước khi gửi (mục 2).

### 5. Chat không làm phát lại ván, không vẽ lại màn hình

Phòng đổi `revision` khi có tin, và ván Cờ vua dài phát lại mất hàng trăm ms trên điện thoại.

- `online-transport.refresh()`: nếu **không phải** lời chào và `JSON.stringify(latest.record) === JSON.stringify((queued?.room ?? room).record)` thì không `fromRecord`, không đụng `shown`, hàng chờ, hẹn giờ. So cả `record` (không chỉ số nước và `ending`) để bản ghi hỏng cùng độ dài vẫn bị phát hiện, và `ending` không so tham chiếu; lời chào luôn tính lại vì bản đầu tiên sau khi nối lại phải thắng khi kho mất dữ liệu. Vẫn cập nhật `room`/`queued.room` và `seat`. Chỉ `render()` khi ghế, `you`, trạng thái kết nối hoặc `turnClock` đổi (ghế máy thay người giữ nguyên số nước nhưng phải vẽ); nếu không thì không phát `changed`.
- `RoomContent` đăng ký snapshot kết nối hẹp lại (không phụ thuộc `room.chat`); `RoomGame` `memo`; phần tử chat ổn định, tự đăng ký `connection` bên trong, nên không truyền `ReactNode` mới mỗi lần vẽ.
- Test đếm số lần vẽ `PlayScreen` ở mức `RoomRoute`, không chỉ đếm số lần phát lại.
- `room-connection` vẫn `markActivity`: phòng đang chat không tự vào trạng thái rảnh, khớp câu chữ "nhận trạng thái mới" của `online-rooms`.

### 6. Trạng thái chat phía client

`features/chat/use-room-chat.ts`, gọi **ở `RoomContent`, phía trên nhánh sảnh chờ / màn hình chơi**, nên chữ đang gõ, đóng mở và tin đang chờ không mất khi đủ người. `focusTitle` bỏ qua khi tiêu điểm đang trong chat. Đọc `connection.getSnapshot().room?.chat` qua selector ổn định (mảng đổi danh tính ở mọi phòng, so theo `seq` cuối), không qua hàng chờ của transport.

- **Gửi**: một tin chờ mỗi lúc; `id` từ `crypto.randomUUID()` (dự phòng `getRandomValues`), gắn với đúng nội dung. Ô nhập vẫn gõ được. Thấy `mine && id` trong `room.chat` thì xác nhận, kể cả sau khi đã báo lỗi; xoá ô nhập **chỉ nếu nội dung vẫn đúng tin vừa gửi**. Bị từ chối (`rejected.id` khớp) thì báo lỗi. Quá 8 giây không có gì thì báo chưa gửi được và `connection.reconnect()`, như nước đi. Gửi lại giữ `id` nếu nội dung không đổi, sửa thì `id` mới. Câu có sẵn và emoji không có ô nhập nên lỗi hiện thành một dòng trong khung chat có nút gửi lại; chạm trong lúc đang chờ bị khoá kiểu `aria-disabled`, trong khoảng thời gian rất ngắn (một vòng khoảng 80 ms).
- **Chống spam phía client**: cửa sổ trượt 5 tin/10 giây tính từ tin `mine` trong `room.chat` và tin đang chờ; tới giới hạn hoặc sau `chat-too-fast` thì không gửi gì qua mạng, hiện "Gửi chậm lại" tới hết cửa sổ. Bỏ `event.repeat`. Nhờ vậy chat không chạm tới giới hạn 30 thông điệp/10 giây đóng kết nối.
- **Chưa đọc**: mốc là `seq`. Lấy mốc lần đầu ở **bản phòng đầu tiên có ghế** (người mới vào ghế không thấy cả lịch sử là chưa đọc), lưu `sessionStorage` theo mã phòng (zod, try/catch). Chưa đọc = tin `!mine` có `seq` > mốc, vì vậy tin rơi khỏi 30 không làm hỏng phép đếm. Mở chat đưa mốc tới tin cuối. Trong lúc tắt chat, mốc đi theo tin mới. Bong bóng chỉ cho tin thấy tới lúc trang đang mở, không cho bản phòng đầu tiên sau khi mở; sau khi nối lại chỉ tin mới nhất có bong bóng.
- **Tắt chat**: khoá `board-games:chat-muted` trong `config/storage-keys.ts`, cùng cách đọc an toàn; `useSyncExternalStore` để hai tab cùng biết.
- **Khi nào hiện**: ở sảnh chờ và màn hình chơi, khi `you !== null` và có ít nhất một ghế khác là người (kể cả ghế người đang có máy thay). Tính từ `room.seats`, không phụ thuộc game. Phòng `Failed`/`broken` thì chat bị gỡ cùng màn hình; `send` sau `dispose` an toàn.

### 7. Ghép vào màn hình

`RoomRoute` sở hữu `connection`. `PlayScreen` thêm prop tuỳ chọn `chat` dạng render prop `(ctx: { held: boolean }) => ReactNode`, ổn định qua `useCallback`, gọi ở chỗ hàng nút; `RoomLobby` nhận phần tử tương tự. Chơi cùng máy và đấu với máy không truyền. Render prop là cách cho chat biết `held` (giữ màn hình trong cú tung), vốn là state cục bộ của `PlayScreen`.

- `hasButtons` thêm `chat !== undefined`: hiện nay hàng nút trở thành `null` khi online đã có kết quả hoặc người chơi đã đầu hàng, đúng lúc người ta muốn nói "gg".
- Tấm chat render qua portal vào `body`, tự đặt `data-game` (như `ThrowOverlay`), `z-index` cao hơn thanh trên (30), thấp hơn lớp phủ cú tung (35); `<dialog>` và popover ở top layer vẫn trên cùng. Trong lúc `held`, tấm chat `inert`. Vùng đọc tin mới nằm **ngoài** các bọc `inert`.
- Esc chỉ xử lý trong khung chat, và bỏ qua khi có `<dialog>` mở; hook giữ để gieo tự nghe Esc của nó trong lúc giữ, hai bên không chồng nhau vì lớp phủ chặn tiêu điểm.
- `packages/ui` chỉ thêm icon `MessageCircle` qua `icons.ts`.

### 8. Bố cục (mockup đã duyệt ngày 05/11/2026)

Theo `mockup/index.html` (15 khung, sáng/tối, đủ trạng thái; ảnh chính trong `mockup/png/`). Đo trên mockup bằng Playwright: bàn không đổi vị trí khi mở, đóng, có tin đến; không cuộn ngang; tương phản chữ thấp nhất 5,12:1. Bàn phím trong mockup chỉ là mô phỏng.

- **Nút Chat** ở **hàng nút của ván** (thanh trên cùng hết chỗ ở 360 px); khi hàng rỗng (ván đã kết thúc, đã đầu hàng) hàng vẫn còn với riêng nút Chat. Sảnh chờ: ở hàng tiêu đề, chỉ hiện từ hai người có ghế.
- **Bong bóng** ngay dưới thanh trên cùng (vùng chỉ có chữ, không chạm bàn, xúc xắc, nút gieo, hàng nút), kèm số chưa đọc. Emoji nổi ở cùng vùng. Ngoại lệ đã biết: ván đã kết thúc và đã cuộn tới cuối thì bong bóng che "Chơi lại" tối đa 4 giây.
- **Thẻ "Chat · số"** dưới thanh trên, chỉ hiện khi còn tin chưa đọc, không có bong bóng và nút Chat ngoài màn hình (đo ở 360 × 740: Cờ vua nút ở y 712–756, hụt 16 px; Cờ cá ngựa y 866–910, ngoài hẳn). Dò bằng `IntersectionObserver`.
- **Điện thoại dọc**: tấm trượt cao 48%, thấp hơn khi bàn nằm thấp để luôn thấy ≥ 96 px bàn (tấm tối thiểu 240 px). Tấm chiếm thêm khoảng trống cuối trang nên người chơi tự cuộn được cả bàn lên. Khi mở, nút gieo Cờ cá ngựa có thể bị che: đóng chat hoặc cuộn.
- **Bàn phím ảo** (360 × 740): tấm khoảng 226 px, danh sách khoảng 112 px (khoảng 3 tin), ẩn hàng gửi nhanh; vẫn thấy thanh trên, dòng lượt, thẻ đối thủ, ô nhập; **bàn không thấy**, tự cuộn thấy được một phần. Dùng `visualViewport` (`resize` và `scroll`), vì `interactive-widget` không có trên iOS Safari; không làm `body` cuộn, không đổi `--board-room`.
- **Điện thoại ngang**: tấm bên phải, đè cột điều khiển, không che ô bàn nào; phải đóng chat mới gieo được.
- **Máy tính**: bảng **trên điều khiển** trong ô lưới của cột phải, không thêm chiều cao trang (800/800, không cuộn): cao 322 px ở Cờ vua, 378 px ở Cờ cá ngựa; đè thẻ người chơi và dòng lượt. Dòng lượt và nút "Xử thắng" được chép vào đầu bảng; xúc xắc, nút gieo, lật bàn, "Đầu hàng" không bị che. Ván đã kết thúc: bảng xuống dưới thẻ kết quả để giữ "Chơi lại". Phương án "dưới điều khiển" bị loại: chỉ còn 103 px ở Cờ cá ngựa.
- **Thứ tự lớp**: thanh trên 30 < tấm chat 32 < bong bóng 33 < emoji 34 < lớp phủ cú tung 35 < `<dialog>`.
- **Ô nhập**: `font-size` 1rem (không zoom trên iOS), `enterKeyHint="send"`, `autoComplete="off"`; nút gửi `pointerdown` `preventDefault` để giữ bàn phím mở.
- **Tin dài**: `overflow-wrap: anywhere`, `overflow-clip` chặn dấu chồng, `dir="auto"`, không tự tạo link.

### 9. Tiếp cận

`role="log"` có `aria-label` (mức polite, `aria-relevant="additions"`), chỉ có trong DOM khi chat mở; khi đóng, một vùng `aria-live="polite"` riêng đọc tin mới dạng "Lan: Chào" một lần, trừ khi đã tắt chat. Không `assertive`, không dùng `role="status"` của dòng lượt. Mở chat: tiêu điểm vào ô nhập trên máy tính; trên màn hình cảm ứng vào nút đóng, để không bật bàn phím khi người chơi chỉ muốn đọc. Esc đóng, trả tiêu điểm về nút chat. Bộ gõ: bỏ qua Enter và Esc khi `isComposing || keyCode === 229` (thứ tự sự kiện của Safari); xoá ô nhập sau `compositionend` nếu đang soạn. Nút gửi dùng mẫu `aria-disabled` kèm lý do. Trạng thái kết nối `Idle`, `Paused` hiện trong khung chat kèm nút "Tiếp tục" (`connection.resume`), vì tấm chat có thể che dòng báo kết nối. Tin đang đọc cũ: không tự cuộn, nút "Tin mới". Vùng chạm nút ≥ 44 px, chip câu có sẵn ≥ 40 px.

### 10. Token

Mockup xác nhận không cần màu mới (tương phản chữ thấp nhất đo được 5,12:1, sáng và tối): tin của mình dùng `--accent`, tin người khác `--surface` + `--border`, bong bóng `--surface` + bóng sẵn có. Thêm `--animate-chat-bubble` trong `@theme` (≤ 200 ms, có nhánh `motion-reduce`).

## Risks / Trade-offs

- [Bàn phím ảo che ô nhập, bàn nhảy trên iOS] → `visualViewport` + test giả lập; Playwright không có bàn phím ảo thật nên nằm trong danh sách thử thiết bị của người dùng, cùng bộ gõ tiếng Việt và tiếng Nhật trên điện thoại.
- [Lọc ký tự vô hình không bao giờ đủ] → danh sách chặn có test, thêm khi gặp; bị sót chỉ là một tin trống trong nhóm bạn.
- [Phòng nặng thêm tới 33 KB khi chat toàn ký tự 4 byte] → giới hạn 30 tin × 200 ký tự; chấp nhận với nhóm nhỏ.
- [Nội dung người dùng gõ nằm trên Upstash tới 7 ngày sau lần ghi cuối] → không log, không tài khoản, xoá cùng phòng; ghi vào README.
- [Không lọc từ] → nhóm bạn qua link riêng, có "Tắt chat".
- [Mạo danh bằng cách đặt tên giống người khác] → tên tạm vốn không xác thực; chấp nhận như quyết định danh tính ở idea.md.
- [Lúc deploy, kết nối còn trên bản cũ ghi phòng thiếu `chat` trong khoảng 5 phút] → tin có thể mất một lần duy nhất; client chịu được danh sách co lại; mốc `seq` không hỏng.
- [Chạm nhầm câu có sẵn gửi ngay] → người dùng muốn một chạm; không có xoá tin.

## Migration Plan

Không có bước chuyển: phòng cũ đọc được với `chat: []`, bản ghi lại kèm `chat`. Tab đang mở dùng bản cũ không thấy chat tới khi tải lại, vẫn chơi bình thường. Rollback: bản cũ đọc phòng có `chat` vẫn được vì schema zod bỏ trường lạ; chat mất ở lần ghi kế tiếp, ván không ảnh hưởng.

## Kiểm tra

- Unit protocol: `sanitizeChatText` (NFC sau khi lọc, U+202E, U+200D giữa và ngoài emoji, ngắt dòng, 200/201 code point, vô hình, dấu chồng, surrogate lẻ, cờ emoji), schema tin, parse lỏng của `RoomView.chat`.
- Unit server: `room-service` theo từng scenario (không ghế, trùng id, sai nội dung, tốc độ, cắt 30 tin, không đổi `turnStartedAt`, gộp lại khi xung đột chỉ do chat với số `decide` đúng một, xung đột thật vẫn quyết định lại, phòng cũ); `parseStoredRoom` với tin hỏng; `toRoomView` không có `playerId`, `mine`, `[]` khi không ghế; `connection.test` (từ chối không đóng kết nối, trả lời bằng `force`, log không chứa nội dung).
- Unit client: `room-connection` (từ chối chat không nối lại); `online-transport` (tin không gọi `fromRecord`, không đổi `shown`; có lời chào thì tính lại; `queued`; ghế máy thay người vẫn vẽ); `use-room-chat`; đếm số lần vẽ `PlayScreen` ở `RoomRoute`; component `ChatPanel`, `ChatBubble` (kể cả `isComposing`, `visualViewport` giả).
- E2E: `online-chat.spec.ts` hai trình duyệt theo scenario; đợi hết cửa sổ 10 giây thật hoặc dùng `page.clock` cho giới hạn tốc độ. `test:a11y` có chat mở, sáng/tối.
- Ảnh `pnpm ui:shots`: nút có số chưa đọc, bong bóng, chat mở, tắt chat, sảnh chờ — sáng/tối × 360/390/1280, thêm 844 × 390; so với `mockup/png/`.
- Khói trên Production: hai kết nối, gửi tin, nối lại còn tin, `playerId` không có trong gói tin.
