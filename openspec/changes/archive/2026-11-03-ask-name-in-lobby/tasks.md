## 1. Giao thức và server

- [x] 1.1 `packages/protocol/src/messages.ts`: `join.name` thành `z.exactOptional(playerNameSchema)`; test: `join` không `name` hợp lệ, `name` rỗng/quá 24 ký tự vẫn bị từ chối, `sit`/`create` không `name` bị từ chối, `PROTOCOL_VERSION` vẫn là 2
- [x] 1.2 `server/room-service.ts`: `join(code, playerId, name | null)` (giữ tên khi `null`, không ghi khi không cần); test kho bộ nhớ theo "Người mới vào phòng", "Vào phòng không kèm tên" (phòng không đổi, `revision` giữ nguyên), "Vào lại không kèm tên", "Vào lại với tên mới", "Vào lại phòng với cùng playerId", phòng dừng ở lượt máy vẫn đi tiếp khi người đã ngồi vào lại không kèm tên
- [x] 1.3 `server/realtime/connection.ts`: truyền `message.name ?? null`; test kết nối: lời chào không tên tới phòng không tồn tại nhận `room-not-found` và bị đóng; lời chào có tên từ client hiện tại vẫn chạy (tương thích tab đang mở)

## 2. Client

- [x] 2.1 `features/identity/identity.ts`: `guestPlayerId()` (mã mới, không ghi `localStorage`); `saveName(name, sessionPlayerId)` theo ba nhánh của design §4 (chưa có danh tính → lưu mã phiên; cùng mã → đổi tên; mã khác → không ghi); test đơn vị ba nhánh và trình duyệt từ chối ghi
- [x] 2.2 `transport/room-connection.ts`: `getIdentity` trả `{ playerId, name: string | null }`, lời chào bỏ `name` khi `null`; test socket giả: lời chào không có trường `name`
- [x] 2.3 `features/room/RoomRoute.tsx`: bỏ `NameStep`; `RoomSession` ghim `sessionPlayerId` một lần khi mở phòng (mã đã nhớ hoặc `guestPlayerId()`), `getIdentity` dùng mã ghim + tên theo design §4
- [x] 2.4 `RoomLobby`: ô tên trống có focus sẵn khi chưa có tên, gợi ý `Room.nameHint` dưới ô, "Vào chơi" kiểm tên rồi `saveName(name, sessionPlayerId)` + `sit`
- [x] 2.5 Test component (`renderWithIntl`, `getByRole`, socket giả) theo "Lần đầu mở link mời" (sảnh chờ, ô tên trống có focus, ghế trống còn trống), "Phòng không tồn tại khi chưa có tên" và "Phòng đã đủ người khi chưa có tên" (heading lỗi, không có ô tên), "Tên rỗng" (lời báo tại ô, focus ô, chưa gửi `sit`), "Không muốn vào phòng nữa" (lối "Về menu"), "Mở link mời khi chưa có tên"
- [x] 2.6 Test giữ ghế theo "Kết nối lại sau khi đặt tên ở sảnh chờ" (chào không tên bằng mã A → "Vào chơi" "Lan" → danh tính lưu `{A, "Lan"}` → nối lại chào mã A tên "Lan") và "Hai tab chưa có tên cùng vào một phòng" (hai `RoomRoute` dùng chung `localStorage` giả: tab 1 ngồi "Lan", tab 2 ngồi "Minh", cả hai nối lại → mỗi tab chào đúng mã và tên của mình, danh tính lưu vẫn `{A, "Lan"}`)
- [x] 2.7 Bản dịch vi/en/ja: bỏ khoá không còn dùng (`Room.nameTitle`, `Room.continue` nếu không còn nơi nào dùng), giữ `Room.nameHint`; `messages.test.ts` và `pnpm knip` xanh
- [x] 2.8 (sau review) Ghim `{ playerId, name }` của trang phòng theo tab trong `sessionStorage` (`readRoomIdentity`/`pinRoomIdentity`, khoá theo mã phòng, kiểm bằng zod, lỗi thì bỏ qua) khi ngồi ghế; `RoomRoute` ưu tiên bản ghim khi mở; test: tải lại sau nhánh "mã khác" giữ ghế, hai tab chưa có tên + tải lại tab B giữ ghế B (component + E2E), "Thử lại" khi chưa có tên chào lại cùng mã không tên; contract `RoomStore` "vào lại không kèm tên khi phòng dừng ở lượt máy"; delta "Đổi tên tạm"

## 3. E2E và kiểm tra

- [x] 3.1 `e2e/online.spec.ts`: người lạ (bộ nhớ trống) mở link phòng không tồn tại → "Không tìm thấy phòng" ngay, không có ô tên; người lạ mở link phòng còn ghế → sảnh chờ, nhập tên, "Vào chơi", ván bắt đầu, tải lại trang vẫn đúng ghế; người lạ mở phòng đã đủ người → "Phòng đã đủ người" không hỏi tên; hai trang (hai `page` cùng `context`) chưa có tên vào cùng một phòng Cờ cá ngựa 3 ghế (người tạo ở trình duyệt khác) còn hai ghế trống, ngồi "Lan" và "Minh", mất mạng rồi có lại → mỗi trang vẫn đúng ghế; E2E online hiện có xanh ở cả hai cấu hình máy
- [x] 3.2 `apps/web/ui-shots/screens.shots.ts`: thay `11-room-ask-name`/`12-room-not-found` bằng "sảnh chờ chưa có tên" và "phòng không tồn tại khi chưa có tên"; chạy `pnpm ui:shots`, xem từng ảnh sáng/tối × 390/1280
- [x] 3.3 Rà `web-design-guidelines` trên `RoomLobby`, `RoomRoute`
- [x] 3.4 Đối chiếu delta với code; diff trọn thân các khối MODIFIED ("Hỏi tên tạm khi chơi online", "Mở trang phòng", "Vào phòng") với `openspec/specs/` hiện tại (các spec này vừa được sửa trực tiếp trên nhánh `fix/ui-audit-defects`); `pnpm exec openspec validate ask-name-in-lobby --strict`, `pnpm check`, `pnpm knip`, `pnpm test:e2e`, `pnpm spec:check`
- [x] 3.5 Cập nhật plan.md §3.4 (lời chào `join` có `name` tuỳ chọn, `PROTOCOL_VERSION` giữ 2 và lý do), §6.2 (hàng M6.5: bốn change, thêm `ask-name-in-lobby`) và §10 (M6.5 xong: bốn change, việc còn lại)
- [x] 3.6 Archive change (`pnpm exec openspec archive ask-name-in-lobby --yes`) trong cùng PR với code của change này, sau review; không phụ thuộc thứ tự với ba change M6.5 còn lại (design §5)

## Ngoài phạm vi

- Người xem ván không có ghế (spectator): idea.md §4.3 v2.
- Skew Protection của Vercel cho trường hợp quay lui bản deploy: không bật (design §2).
- Tên mặc định cho khách: không làm.
