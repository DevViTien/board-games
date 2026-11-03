# Design

## Context

- Giao thức (`packages/protocol/src/messages.ts`): thông điệp client kiểm chặt (`strictObject`); `join = { type, protocol, code, playerId, name }` với `name: playerNameSchema` bắt buộc; `sit = { type, name }`; `PROTOCOL_VERSION = 2`, lời chào khác phiên bản nhận `outdated-client`; lời chào sai schema cùng phiên bản nhận `error invalid-message` và bị đóng (`realtime/connection.ts` `greet`), client coi `invalid-message` là lỗi tạm và kết nối lại (`RECONNECT_REJECTIONS`).
- Server: `room-service.join(code, player: RoomPlayer)` nhận ra người đã ngồi theo `playerId`, đổi tên nếu khác (`renamed`), đi tiếp lượt máy nếu phòng dừng ở đó; người chưa có ghế không làm phòng đổi. `sit(code, player)` dùng `playerId` của kết nối và tên gửi kèm `sit`.
- Client: `RoomRoute` đọc danh tính sau mount; `null` → `NameStep` (trang riêng hỏi tên, nhánh sửa lỗi vừa thêm lối "Về menu"); có danh tính → `RoomSession` mở `RoomConnection` với `getIdentity` (đọc lại danh tính ở mỗi lời chào). `RoomLobby` đã có `NameField` điền sẵn tên và chỉ ngồi khi bấm "Vào chơi" (spec `online-play`), tên sửa ở sảnh chờ được nhớ khi bấm (spec `player-identity` "Đổi tên tạm").
- `features/identity`: `readIdentity()` trả `{ playerId, name }` hay `null`; `saveName(name)` giữ `playerId` cũ hoặc tạo mới, lưu `localStorage` (bộ nhớ của tab khi trình duyệt từ chối ghi).

## Goals / Non-Goals

**Goals:**

- Người lạ mở link được báo ngay phòng không tồn tại / đã đủ người / ứng dụng vừa cập nhật, không phải nhập tên trước.
- Chỉ hỏi tên khi thật sự cần (ngồi ghế), ở sảnh chờ — chỗ đã có ô tên.
- Không tab nào đang mở phải tải lại vì change này; phòng đang dở không ảnh hưởng.
- Người vừa đặt tên ở sảnh chờ, sau khi kết nối lại, vẫn được nhận đúng ghế.

**Non-Goals:**

- Người xem ván (spectator), tên mặc định, đổi luồng tạo phòng.

## Đã chốt với người dùng (03/11/2026)

- Mockup M6.5 được duyệt (`openspec/changes/add-design-foundation/mockup/`); skill `board-games-ui` (checklist "Online") ghi rõ "phòng không tồn tại (không hỏi tên trước khi báo phòng không có)". Sảnh chờ dùng component sẵn có (và token của `add-design-foundation` khi change đó đã vào); change này không thêm màn hình mới về hình ảnh.

## Decisions

### 1. Hỏi tên ở sảnh chờ thay cho trước khi vào phòng

- `RoomRoute`: bỏ `NameStep`. Danh tính dùng cho kết nối = danh tính đã nhớ, hoặc `{ playerId: guestPlayerId(), name: null }` khi chưa có. `RoomConnection.getIdentity` trả `{ playerId, name: string | null }`; lời chào `join` bỏ trường `name` khi `null`.
- `RoomLobby` khi `name` rỗng: ô tên trống, **có focus sẵn** khi sảnh chờ hiện lần đầu (spec `player-identity`), chữ gợi ý cũ của bước hỏi tên (`Room.nameHint`: "Mọi người trong phòng sẽ thấy tên này.") chuyển thành gợi ý dưới ô (`aria-describedby`, prop `hint` mới của `NameField`, đọc trước lời báo lỗi); "Vào chơi" kiểm tên như hiện nay (`parsePlayerName`, lời báo tại ô, focus lại ô). Khi người chơi đã có tên: sảnh chờ như cũ, focus như cũ.
- Phòng không vào được (`room-not-found`, `room-full` khi không có ghế, `outdated-client`, dữ liệu hỏng): đi thẳng `RoomError` như mọi người khác — không có bước hỏi tên trước.
- Phương án đã cân nhắc:
  - Giữ `NameStep` nhưng hỏi server "phòng có không" trước bằng một lời chào riêng (`peek`) — thêm thông điệp giao thức chỉ để làm điều `join` không tên làm được.
  - Gửi tên giả ("?") trong `join` khi chưa có tên — server sẽ ghi tên giả lên ghế của người có `playerId` trùng (không xảy ra với id mới, nhưng là dữ liệu bịa trong giao thức); tên giả cũng lộ trong log.
  - Hỏi tên trong hộp thoại khi bấm "Vào chơi" — thêm một bước, trong khi sảnh chờ đã có ô tên.

### 2. Giao thức: `name` tuỳ chọn, giữ `PROTOCOL_VERSION` 2

- `join.name: z.exactOptional(playerNameSchema)`. `create.name`, `sit.name` giữ bắt buộc.
- **Không tăng phiên bản**, vì:
  - Mọi client phiên bản 2 đang chạy luôn gửi `name` → vẫn khớp schema mới (trường tuỳ chọn có mặt). Server mới nhận tab cũ bình thường; không ai thấy "Ứng dụng vừa cập nhật".
  - Tăng lên 3 sẽ làm **mọi** tab đang mở nhận `outdated-client` ở lời chào kế tiếp (kể cả lần tự nối lại ~5 phút một lần trên Vercel), giữa ván, chỉ để đổi một trường mà bản cũ không bao giờ dùng.
  - Server gửi về không đổi (`RoomView` giữ nguyên), nên client cũ không đọc gì lạ.
- Rủi ro còn lại: client **mới** gặp server **cũ** — chỉ khi quay lui bản deploy (trang mới vẫn trong tab, function đã về bản trước) và chỉ với người **chưa có tên**: server cũ trả `invalid-message`, client nối lại có giãn cách và sau 10 giây hiện "chưa kết nối được máy chủ" kèm "Về menu" (spec "Mở trang phòng"). Người đã có tên không bị ảnh hưởng. Chấp nhận (nhóm nhỏ, hiếm khi quay lui); không bật Skew Protection.
- Test giao thức: `join` không `name` hợp lệ; `join` có `name` rỗng/quá dài vẫn bị từ chối; `sit` không `name` bị từ chối; `PROTOCOL_VERSION` vẫn là 2 (test hiện có).

### 3. Server

- `room-service.join(code, playerId, name: string | null)`: người đã ngồi → nhận ra ghế; `name !== null && renamed` thì ghi tên mới, `name === null` thì giữ tên (không ghi gì nếu không phải đi tiếp lượt máy). Người chưa có ghế → trả phòng như cũ, không ghi. `connection.ts` truyền `message.name ?? null`; trạng thái của kết nối chỉ giữ `playerId` (không còn `RoomPlayer`), tên lấy từ `sit` như hiện nay.
- Không đổi `STORED_ROOM_FORMAT`, không đổi `RoomView`, không thêm lệnh Redis.

### 4. Mã người chơi cố định trong phiên trang phòng

- **Ghim mã cho cả phiên**: `RoomRoute` chọn `sessionPlayerId` **một lần** khi trang phòng mở (sau mount) — mã của danh tính đã nhớ, hoặc `guestPlayerId()` khi chưa có (một mã mới mỗi tab, giữ trong state của `RoomRoute` — nên "Thử lại", vốn tạo lại `RoomSession`, vẫn dùng mã đó — không ghi `localStorage` — spec "Nhớ danh tính trên trình duyệt" vẫn đúng: danh tính được nhớ "sau lần đầu người chơi nhập tên"). Mọi lời chào `join` (kể cả tự kết nối lại) và `sit` của phiên đều đi bằng mã đó. `getIdentity` của `RoomConnection` trả `{ playerId: sessionPlayerId, name }` với `name` = tên đã nhớ nếu danh tính đã nhớ có **cùng** mã (lấy được tên vừa sửa ở màn hình bắt đầu ván — spec "Đổi tên tạm"), không thì tên tab này vừa chọn ở sảnh chờ, không thì `null`.
- **`saveName(name, sessionPlayerId)` không bao giờ thay mã của người khác** (tham số thứ hai tuỳ chọn: màn hình bắt đầu ván vẫn gọi `saveName(name)` như cũ):
  - chưa có danh tính đã nhớ → lưu `{ sessionPlayerId, name }`;
  - danh tính đã nhớ có cùng mã → chỉ đổi tên;
  - danh tính đã nhớ có **mã khác** (một tab khác của cùng trình duyệt đã đặt tên trước) → **không ghi** gì; tab này giữ tên trong state của phiên.
- **Lỗi hai tab mà cách này chặn**: hai tab chưa có tên mở cùng phòng với mã tạm A và B; A "Vào chơi" → lưu `{A, "Lan"}`; B "Vào chơi" → server cho B ngồi; nếu `saveName` của B dùng mã đã nhớ (A) thì lần nối lại kế tiếp của B chào bằng A → ghế của B mồ côi, còn tên ghế của A bị đổi thành "Minh". Với mã ghim và luật trên, B nối lại bằng B với tên "Minh", A bằng A với "Lan".
- **Ghim theo tab, qua cả lần tải lại** (sau review): mã ghim trong state chỉ sống tới khi tải lại; nhánh "mã khác → không ghi" làm tab R (khách, mã G) sau khi tải lại chào bằng mã đã nhớ của tab S → ghế của G mồ côi, ván đứng mãi ở ghế đó. Nên khi người chơi bấm "Vào chơi", trang ghi `{ playerId, name }` của mình vào `sessionStorage` (khoá `ROOM_IDENTITY_KEY_PREFIX + code`, mỗi tab một bản, còn qua tải lại, mất khi đóng tab) bằng `pinRoomIdentity`; khi mở, `RoomRoute` ưu tiên bản ghim này (`readRoomIdentity`, kiểm bằng zod, đọc/ghi trong try/catch, lỗi thì coi như không có) hơn danh tính trong `localStorage` — trừ khi danh tính đã nhớ có cùng mã thì lấy nó (tên mới sửa ở màn hình bắt đầu ván). Luật "không bao giờ thay mã đã nhớ của tab khác" của `localStorage` giữ nguyên. Khách chưa ngồi thì không ghim gì (đúng "nhớ sau lần đầu nhập tên"). Nhân bản tab (trình duyệt chép `sessionStorage`) cho hai tab cùng một ghế — như hai tab có cùng danh tính hiện nay, chấp nhận.
- Test: đơn vị (`saveName` ba nhánh trên; `guestPlayerId` khác nhau giữa hai lần mở phiên); `RoomRoute` với socket giả: chào không tên bằng mã A → "Vào chơi" "Lan" → danh tính lưu có mã A → nối lại chào mã A tên "Lan"; **hai tab** (hai `RoomRoute` cùng `localStorage` giả): tab 1 ngồi "Lan", tab 2 ngồi "Minh", cả hai nối lại → mỗi tab chào đúng mã và tên của mình, danh tính lưu vẫn là `{A, "Lan"}`.
- Trình duyệt từ chối ghi: `saveName` đã giữ danh tính trong bộ nhớ của tab (không đổi).
- Phương án đã cân nhắc: `saveName` luôn dùng mã đã nhớ (bản trước) — gây lỗi hai tab ở trên; lưu ngay mã tạm khi mở phòng — trái spec "nhớ sau lần đầu nhập tên" và vẫn để hai tab ghi đè nhau; ghi mã ghim vào `localStorage` theo mã phòng — mọi tab dùng chung, không phân biệt được hai tab cùng phòng; chấp nhận ghế mồ côi khi tải lại (bản trước của design) — bỏ, vì ván đứng mãi ở ghế đó.
- Test thêm: tải lại sau nhánh "mã khác" vẫn chào bằng mã G (component); hai tab chưa có tên, tải lại tab B vẫn chào bằng mã B (component, E2E `online-ludo.spec.ts`); "Thử lại" khi chưa có tên chào lại bằng cùng mã, không tên.

### 5. Độc lập với ba change còn lại

- Change này chỉ chạm giao thức, server, `features/identity`, `features/room` và các requirement `player-identity`/"Mở trang phòng"/"Vào phòng" — không requirement nào trùng với `add-design-foundation`, `redesign-game-boards`, `add-game-feedback`. Có thể làm và archive trước, sau hay xen giữa ba change đó; nếu làm trước `add-design-foundation`, sảnh chờ dùng component hiện có và được làm đẹp lại khi change kia tới.

### 6. Bản dịch và hình ảnh

- Bỏ khoá chỉ bước hỏi tên dùng (`Room.nameTitle`, `Room.continue` nếu không còn nơi nào dùng); `Room.nameHint` chuyển thành gợi ý dưới ô tên ở sảnh chờ (giữ khoá, vi/en/ja). Không thêm token: sảnh chờ dùng `Input`, `Button`, `Card` của `add-design-foundation` (bảng tỉ số ở design §2 của change đó); lời báo tên không hợp lệ `danger` / `bg` 4,76 (sáng) / 8,05 (tối).

## Risks / Trade-offs

- [Mất ghế nếu mã dùng để chào và mã lưu khác nhau, kể cả hai tab và sau khi tải lại tab] → §4 (mã ghim trong state + `sessionStorage` theo tab), test bắt buộc; không còn trường hợp nào được chấp nhận.
- [Quay lui bản deploy với người chưa có tên] → §2, chấp nhận, có lối về menu sau 10 giây.
- [Người chưa có tên vào phòng làm server tốn một lần đọc phòng] → như mọi người mở link hiện nay (đã có danh tính thì cũng vào phòng); không thêm lệnh nào.
- [E2E và ảnh `ui:shots` dựa vào bước hỏi tên riêng] → sửa `online.spec.ts` và ảnh `11-room-ask-name`/`12-room-not-found` trong cùng change.

## Kiểm tra

- `pnpm ui:shots`: sảnh chờ của người chưa có tên (ô tên trống có focus), trang "Không tìm thấy phòng" khi chưa có tên (không có bước hỏi tên), sảnh chờ có lời báo tên không hợp lệ; sáng/tối × 390/1280.
- Rà `web-design-guidelines` trên `RoomLobby`/`RoomRoute`; `pnpm check`, `pnpm knip`, `pnpm test:e2e`, `pnpm spec:check`.
