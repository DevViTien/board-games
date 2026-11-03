# Proposal

## Why

idea.md §4.3 hứa "Phòng 2–4 người cho cờ cá ngựa; ghế trống có thể cho AI chơi thay", và người dùng đã chốt cách làm: **chủ phòng đánh dấu một ghế trống là "Máy", server chơi thay ghế đó** bằng máy rẻ theo luật ưu tiên, dùng rng của server, không phụ thuộc client nào đang mở; server vẫn là trọng tài duy nhất và gieo mọi lần gieo. Sau `add-ludo-game`, phòng Cờ cá ngựa 2–4 người chơi được khi đủ người thật; thiếu người thì ván không bao giờ bắt đầu. Change này thêm ghế máy cho phòng online, khái niệm chủ phòng (chưa có: hiện chỉ có "người tạo ngồi ghế đầu") và cách hiện lần lượt nhiều nước máy đi liền nhau. Thuộc mốc **M6. Cờ cá ngựa** (plan.md §6.2: "ghế trống cho AI chơi thay"); là change cuối của M6.

## What Changes

- **Chủ phòng**: người tạo phòng; server lưu `hostId` (không bao giờ gửi đi), trạng thái phòng cho biết ghế của chủ phòng (`host`), giữ qua mọi lần xoay ghế.
- **Ghế máy**: thông điệp mới `ai-seat { seat, on }` — chủ phòng đánh dấu một ghế trống là "Máy" hoặc bỏ dấu, khi ván hiện tại chưa có nước nào, game hỗ trợ đấu với máy và phòng có từ ba ghế (phòng hai ghế — Tic-tac-toe, Cờ caro, Cờ cá ngựa 2 người — không có ghế máy; server từ chối bằng `ai-not-supported`). Đánh dấu lại một ghế đã là máy không đổi gì. Ghế máy được tính là ghế đã có người (phòng "đủ người" → ván bắt đầu), không ai ngồi vào được. Đánh dấu ghế trống cuối cùng là bắt đầu ván ngay (không hoàn tác). Mã lỗi mới `not-host`, `seat-taken`, `not-ai-seat`, `game-started`, `invalid-seat` — cả năm mã này đều không làm client nối lại; dùng lại `ai-not-supported` của engine (cũng không nối lại). Riêng `unavailable` (game không còn trong app, hết lượt thử khi ghi xung đột, kho lỗi) vẫn làm client nối lại như mọi yêu cầu khác.
- **Server đi thay**: sau mọi thay đổi để lại lượt cho một ghế máy (nước của người, ngồi ghế, đánh dấu ghế máy, ván mới, vào lại phòng), server chọn nước bằng `chooseMove` của engine **mức Vừa** (với Cờ cá ngựa: `evaluate` theo thứ tự ưu tiên đá > lên chuồng > ra quân), mọi lần gieo bằng rng của server, đi liên tiếp tới khi tới lượt một người hoặc ván kết thúc, **ghi trong cùng một lần ghi** (không hẹn giờ, không phụ thuộc kết nối nào).
- **Hiện lần lượt**: transport online hiện từng nước khi một lần cập nhật mang nhiều nước mới (máy đi liền nhau, kể cả ván mới mà máy đi đầu sau "Chơi lại"), mỗi bước không ngắn hơn hiệu ứng của nước trước (cùng hằng số nhịp với đấu với máy), khoá bàn tới khi hiện xong; mỗi nước được lời báo đọc ra; vào phòng, tải lại hay nối lại thì hiện ngay trạng thái mới nhất.
- **Sảnh chờ**: ghế máy ghi "Máy"; chủ phòng có nút "Cho máy chơi" / "Bỏ máy" ở từng ghế (tên đọc được nêu số ghế), chỉ khi game hỗ trợ đấu với máy và ván chưa bắt đầu.
- **Màn hình ván online**: ghế máy hiện như máy khi đấu với máy (lời báo "Máy (Xanh dương) đang nghĩ…" khi nhiều máy, của `add-multiplayer-setup`); nhãn "Online" và nút "Chơi lại" dựa vào việc ván là online, không còn dựa vào việc có ghế người ở xa (phòng một người + ba máy vẫn là online). Mọi nước không đi từ thiết bị này (của người ở xa hay của máy) được nêu trong lời báo kèm lượt kế tiếp ("Minh vừa gieo được 6. Đang chờ Minh…"), để không ai lỡ nước trung gian hay việc bị đá khi đang chờ; ván mới mà máy đi trước báo "Ván mới: bạn cầm O, máy đi trước".
- **Giao thức và dữ liệu**: `PROTOCOL_VERSION` 1 → 2 (`RoomView.seats` thành `{ kind: "human", name } | { kind: "ai" } | null`, thêm `host`); tab cũ nhận `outdated-client` và được mời tải lại như hiện nay. Phòng lưu `STORED_ROOM_FORMAT` 1 → 2; phòng định dạng 1 trong Redis vẫn đọc được (mọi ghế là người, không có chủ phòng) nên ván đang dở không mất.
- Test: room-service (kho bộ nhớ, rng có seed), giao thức, kết nối, transport online (đồng hồ giả), sảnh chờ và màn hình ván (component), E2E hai trình duyệt trong phòng Cờ cá ngựa 3 ghế có một ghế máy, và một người với ba máy.

## Capabilities

### New Capabilities

(không có)

### Modified Capabilities

- `online-rooms`: thêm "Chủ phòng", "Ghế máy trong phòng", "Từ chối đổi ghế máy", "Server đi thay ghế máy", "Phòng tạo từ bản trước"; sửa "Server làm trọng tài" (nước của ghế máy do server ghi, không có người gửi; ghế máy tính là có người) và "Mọi người trong phòng thấy cùng một ván" (đổi ghế máy và nước máy cũng là thay đổi được gửi đi).
- `online-play`: thêm "Ghế máy ở sảnh chờ", "Hiện lần lượt các nước nhận cùng lúc", "Ván online có ghế máy", "Báo nước đi từ nơi khác".

## Ngoài phạm vi

- Nhường ghế máy cho người đến muộn giữa ván, máy chơi thay người bỏ ván quá lâu, xử thua khi bỏ ván: M8 (plan.md §6.2, idea.md §4.3).
- Chọn mức của ghế máy, chuyển quyền chủ phòng, đuổi người khỏi ghế: không làm ở M6.
- Ghế máy trong phòng hai ghế (Tic-tac-toe, Cờ caro, Cờ cá ngựa 2 người): không làm — người muốn đấu với máy dùng chế độ "Đấu với máy".
- Ghế máy cho game không hỗ trợ đấu với máy (Cờ vua): không có.
- Đổi số ghế sau khi tạo phòng: không làm (chọn khi tạo, `add-multiplayer-setup`).

## Impact

- **Code**:
  - `packages/protocol/src/` (`room.ts`: `PROTOCOL_VERSION = 2`, `RoomView.seats`, `host`, schema; `messages.ts`: `ai-seat`, `REJECTABLE_REQUESTS`; `errors.ts`: `not-host`, `seat-taken`, `not-ai-seat`, `game-started`, `invalid-seat`).
  - `apps/web/src/server/` (`room.ts`: `STORED_ROOM_FORMAT = 2`, `hostId`, ghế `{ kind: "ai" }`, đọc định dạng 1, `toRoomView`; `room-service.ts`: `setAiSeat`, `playAiSeats` sau mỗi quyết định, `join` đi tiếp lượt máy; `realtime/connection.ts`: định tuyến `ai-seat`).
  - `apps/web/src/transport/` (`online-transport.ts`: hiện lần lượt theo `AI_SETTLE_DELAY_MS`/`AI_RESULT_DELAY_MS`, ghế máy trong ảnh chụp, bỏ qua lời từ chối `ai-seat` như `sit`; `room-connection.ts`: `send(ai-seat)`).
  - `apps/web/src/features/room/` (`RoomLobby.tsx`, `RoomRoute.tsx`, `use-game-option-choices.ts` trả thêm `supportsAI`), `features/play/PlayScreen.tsx` ("Online"/"Chơi lại" theo `connection`), `apps/web/messages/{vi,en,ja}.json` (`Room.aiSeat`, `Room.host`, `Room.addAi`, `Room.addAiLabel`, `Room.addAiAndStartLabel`, `Room.removeAi`, `Room.removeAiLabel`; `Play.opponentMovedWaitingFor`, `Play.opponentMovedAiThinking`, `Play.opponentMovedAiSeatThinking`, `Play.aiMovedWaitingFor`, `Play.aiSeatMovedWaitingFor`, `Play.newGameAiFirst`, `Play.newGameAiSeatFirst`), `apps/web/e2e/online-ludo.spec.ts` (mới).
- **Engine, games**: không đổi (server dùng `chooseMove` có sẵn).
- **Phụ thuộc**: không thêm thư viện, không thêm dịch vụ (không QStash, không hẹn giờ).
- **Bất biến**: "Online: server là trọng tài… xúc xắc do server tạo" — giữ: nước của máy cũng đi qua `playMove` của luật, kết quả từ rng server. "Function không giữ state" — giữ: máy đi trong cùng lần ghi, không có tiến trình nền. Không chạm bất biến nào khác.
- **Chi phí**: nước của máy không tốn thêm lệnh Redis, băng thông hay GB-giờ (nằm trong lần ghi của người, không có tiến trình nền); phòng có máy tốn ít hơn phòng toàn người (design §6 có ước tính lệnh, băng thông, GB-giờ).
- **Tài liệu**: plan.md §3.4 (giao thức, `RoomView`), §10 (M6 xong) trong task cuối.
