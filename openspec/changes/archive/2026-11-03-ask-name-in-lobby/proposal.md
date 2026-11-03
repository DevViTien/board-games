# Proposal

## Why

Người mở link mời lần đầu (chưa nhớ tên tạm) bị hỏi tên **trước khi** trang biết phòng có tồn tại hay không: nhập tên xong mới thấy "Không tìm thấy phòng" hay "Phòng đã đủ người" (khảo sát M6.5, plan.md §10; ảnh `11-room-ask-name` → `12-room-not-found` trong `pnpm ui:shots`; checklist của skill `board-games-ui`: "phòng không tồn tại (không hỏi tên trước khi báo phòng không có)"). Nguyên nhân là lời chào `join` của giao thức bắt buộc có `name` (`packages/protocol/src/messages.ts`), nên client không vào được phòng khi chưa có tên. Trong khi đó sảnh chờ đã có ô tên (`NameField`) và chỉ ngồi ghế khi bấm "Vào chơi" — chỗ hỏi tên tự nhiên.

Thuộc mốc **M6.5. Thiết kế lại giao diện** (plan.md §6.2). Change này chạm giao thức và server, nên tách riêng theo luật phạm vi của skill `board-games-ui`, và **độc lập** với `add-design-foundation`, `redesign-game-boards`, `add-game-feedback` (không chung requirement): làm và archive được trước, sau hay xen giữa ba change đó (design §5).

## What Changes

- **Giao thức**: trường `name` của lời chào `join` thành tuỳ chọn (`z.exactOptional(playerNameSchema)`); `create` và `sit` vẫn bắt buộc có tên. **`PROTOCOL_VERSION` giữ 2** (design §2): client đang mở luôn gửi tên, server mới vẫn nhận; tăng phiên bản sẽ bắt mọi tab đang mở (cả ván dở) tải lại mà không được gì.
- **Server** (`room-service.join`, `realtime/connection.ts`): vào phòng không kèm tên → người chưa có ghế vào như hiện nay (chưa ngồi); người đã có ghế được nhận ra và **giữ tên cũ**; có tên thì như cũ (tên mới thay tên cũ).
- **Client**: trang phòng bỏ bước "Nhập tên" riêng (`NameStep`); khi trình duyệt chưa nhớ tên, trang vào phòng ngay với một `playerId` tạm của tab (chưa lưu) và không gửi tên — phòng không tồn tại, đã đủ người, ứng dụng vừa cập nhật được báo ngay; nếu vào được, sảnh chờ hỏi tên bằng ô tên đã có (trống, có focus sẵn) và chỉ khi bấm "Vào chơi" với tên hợp lệ thì tên **cùng `playerId` tạm đó** mới được nhớ và gửi `sit`.
- `features/identity` + `features/room`: mỗi phiên trang phòng **ghim một mã người chơi** (mã đã nhớ, hoặc mã tạm khi chưa có) cho mọi lần chào, ngồi ghế, nối lại và thử lại, và khi ngồi ghế thì ghim mã cùng tên đó cho phòng đó trong `sessionStorage` của tab (còn qua tải lại); lưu tên lần đầu chỉ ghi mã đó vào `localStorage` khi trình duyệt chưa nhớ danh tính nào, **không bao giờ** thay mã đã nhớ bởi tab khác — chặn lỗi hai tab chưa có tên cùng vào một phòng làm mồ côi ghế khi nối lại hay tải lại.
- Xoá chữ của bước hỏi tên riêng không còn dùng (`Room.nameTitle`, `Room.continue`) ở vi/en/ja; `Room.nameHint` được giữ làm gợi ý dưới ô tên ở sảnh chờ (design §6).
- Test: giao thức, room-service (kho bộ nhớ), kết nối, `RoomRoute`/`RoomLobby` (component), E2E người lạ mở link phòng không tồn tại, phòng đủ người, phòng còn ghế; ảnh `ui:shots` sảnh chờ chưa có tên.

## Capabilities

### New Capabilities

(không có)

### Modified Capabilities

- `player-identity`: sửa "Hỏi tên tạm khi chơi online" (hỏi khi tạo phòng hoặc ngồi ghế; trang phòng hỏi ở sảnh chờ) và "Đổi tên tạm" (trang phòng vào lại bằng mã của chính nó); thêm "Báo phòng không vào được trước khi hỏi tên" và "Giữ mã người chơi trong lúc trang phòng mở".
- `online-play`: sửa "Mở trang phòng" (vào phòng không kèm tên khi chưa nhớ tên).
- `online-rooms`: sửa "Vào phòng" (tên tuỳ chọn; người đã ngồi vào lại không kèm tên thì giữ tên cũ).

## Ngoài phạm vi

- Người xem (spectator) có danh sách riêng, thấy ván đang chơi khi không có ghế: idea.md §4.3 v2. Người không có ghế vẫn chỉ thấy sảnh chờ hoặc trang "Phòng đã đủ người" như hiện nay.
- Hỏi tên khi tạo phòng: màn hình bắt đầu ván đã có ô tên (spec `game-setup` "Chế độ Online"), không đổi.
- Tự đặt tên mặc định ("Khách 1"): không làm — người chơi đặt tên khi ngồi ghế, như hiện nay.
- Skew Protection của Vercel cho trường hợp quay lui bản deploy (design §2): không bật, chấp nhận rủi ro.

## Impact

- **Code**: `packages/protocol/src/messages.ts` (+ test), `apps/web/src/server/room-service.ts` (`join(code, playerId, name | null)`), `apps/web/src/server/realtime/connection.ts`, `apps/web/src/transport/room-connection.ts` (`getIdentity` trả `name: string | null`, bỏ `name` khỏi lời chào khi `null`), `apps/web/src/features/identity/identity.ts` (`playerId` tạm của tab, `saveName` dùng lại), `apps/web/src/features/room/{RoomRoute,RoomLobby}.tsx`, `apps/web/messages/{vi,en,ja}.json`, `apps/web/e2e/online.spec.ts`, `apps/web/ui-shots/screens.shots.ts`.
- **Engine, games, `packages/ui`**: không đổi. Định dạng phòng lưu (`STORED_ROOM_FORMAT` 2) không đổi.
- **Phụ thuộc**: không thêm thư viện.
- **Bất biến**: "Online: server là trọng tài" — giữ, server vẫn kiểm mọi lời chào bằng schema. "Không tài khoản: danh tính = playerId ngẫu nhiên + tên tạm trong localStorage" — giữ: `playerId` tạm chỉ sống trong tab cho tới khi người chơi đặt tên, rồi được lưu cùng tên như hiện nay (`localStorage` khi chưa có danh tính nào; luôn trong `sessionStorage` của tab cho phòng đó). Không chạm bất biến khác.
- **Tài liệu**: plan.md §3.4 (lời chào `join` có `name` tuỳ chọn) và §10 (M6.5 xong) ở task cuối.
