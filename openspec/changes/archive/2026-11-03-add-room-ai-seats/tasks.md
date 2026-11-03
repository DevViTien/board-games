# Tasks

## 1. Giao thức

- [x] 1.1 `packages/protocol`: `PROTOCOL_VERSION = 2`; `RoomView.seats` (`{ kind: "human", name } | { kind: "ai" } | null`), `RoomView.host`; thông điệp `ai-seat { seat, on }`, `REJECTABLE_REQUESTS` thêm `ai-seat`; `ROOM_ERROR` thêm `not-host`, `seat-taken`, `not-ai-seat`, `game-started`, `invalid-seat` (design §2); test: `ai-seat` hợp lệ và sai (ghế âm, không phải số nguyên, thiếu `on`, trường lạ), `RoomView` có ghế máy và `host`, `rejected` với mã mới, lời chào phiên bản 1 đọc ra phiên bản 1 (`readGreetingVersion`)

## 2. Server

- [x] 2.1 `server/room.ts`: `STORED_ROOM_FORMAT = 2`, `hostId`, ghế `{ kind: "human" | "ai" }`, `parseStoredRoom` đọc cả định dạng 1 (chuyển sang 2), `toRoomView` (ghế máy, `host` theo `seatOf`, không `playerId`), `seatOf` bỏ qua ghế máy; test: định dạng 1 → 2, JSON qua lại, "Người tạo là chủ phòng" (phần `toRoomView`), không `playerId`
- [x] 2.2 `room-service.create` đặt `hostId`; `setAiSeat` (design §2, thứ tự kiểm); `sit` bỏ qua ghế máy; test (kho bộ nhớ) theo "Người tạo là chủ phòng", "Chủ phòng sau ván mới", "Đánh dấu ghế máy", "Ghế máy làm phòng đủ người", "Người mới không ngồi vào ghế máy", "Bỏ dấu ghế máy", "Không phải chủ phòng", "Ván đã bắt đầu", "Ghế đã có người", "Bỏ dấu ghế không phải ghế máy", "Ghế không có trong phòng", "Game không hỗ trợ máy" (game mẫu không hỗ trợ máy, định nghĩa trong test), yêu cầu lặp lại không ghi
- [x] 2.3 `playAiSeats` (design §3: `chooseMove` mức Vừa, `timeLimitMs: 0`, rng server, nước ngẫu nhiên khi máy lỗi, `MAX_AI_MOVES_PER_WRITE`) gọi sau `move`, `sit`, `ai-seat`, `rematch` và trong `join` khi phòng dừng ở lượt máy; test với `ludo`, `createRng(seed)`, đồng hồ giả: "Máy đi sau nước của người", "Người chơi rời đi ngay sau nước của mình" (đọc thẳng kho), "Ván mới với ghế máy đi đầu", "Phòng dừng ở lượt máy", "Không ai đi thay ghế máy", và test cũ của "Server làm trọng tài" xanh; xung đột ghi → chuỗi máy được quyết lại trên phòng mới; chốt an toàn với game mẫu máy đi mãi; mọi lần gieo của máy lấy từ rng server
- [x] 2.4 "Ván dở từ bản trước": phòng Tic-tac-toe định dạng 1 trong kho bộ nhớ và trong `fake-redis` (bộ hợp đồng `RoomStore`) vào lại và đi tiếp được
- [x] 2.5 `realtime/connection.ts`: định tuyến `ai-seat`, trả `rejected { request: "ai-seat", code }` kèm phòng mới nhất; test kết nối với service giả; "Đổi ghế máy được gửi cho mọi người" (hai instance qua kho bộ nhớ dùng chung)

## 3. Client

- [x] 3.1 `room-connection.ts`: `send({ type: "ai-seat", … })`; test rằng `rejected` với `invalid-seat`, `not-ai-seat`, `seat-taken`, `not-host`, `game-started` không làm nối lại (không thuộc `RECONNECT_REJECTIONS`); `outdated-client` vẫn dừng hẳn, không tự tải lại (design, Risks)
- [x] 3.2 `online-transport.ts`: ghế máy trong ảnh chụp là `{ kind: "ai", level: "medium" }`, ghế người khác `remote` theo `kind: "human"`; `onRejected` bỏ qua `request === "ai-seat"` như `sit`; test ảnh chụp với ghế máy và "Lời từ chối không làm mất nước đang gửi"
- [x] 3.3 Hiện lần lượt (design §4): `shown`, khoảng cách theo `AI_SETTLE_DELAY_MS`/`AI_RESULT_DELAY_MS` (game có `outcomes`) và `AI_MIN_DELAY_MS` (game khác), `canMove` sai tới khi hiện xong, `onSynced` hiện ngay, ván mới (`gameNumber` đổi khi đang kết nối) hiện lần lượt từ đầu, `pending` theo biên bản thật; test với đồng hồ giả theo "Ba máy đi liền nhau", "Chơi lại với máy đi đầu", "Tải lại không phát lại", một nước mới vẫn hiện ngay (Tic-tac-toe không đổi), nước của mình được trả lời trong lúc đang hiện
- [x] 3.4 `use-game-option-choices.ts` trả thêm `supportsAI`; `RoomLobby`: ghế "Máy", nhãn "Chủ phòng", nút "Cho máy chơi"/"Bỏ máy" có tên đọc được nêu số ghế (`addAiAndStartLabel` ở ghế trống cuối cùng), `aria-disabled` khi chờ trả lời; bản dịch vi/en/ja `Room.aiSeat`, `Room.host`, `Room.addAi`, `Room.addAiLabel`, `Room.addAiAndStartLabel`, `Room.removeAi`, `Room.removeAiLabel`; component test (`renderWithIntl`, `getByRole`) theo "Ghế trống cuối cùng báo bắt đầu ván", "Người khác không thấy nút", "Bỏ máy ở sảnh chờ", "Game không hỗ trợ máy", chủ phòng thấy nút ở ghế trống và ghế máy, ván đã có nước thì không có nút
- [x] 3.5 `PlayScreen`: "Online", tên nút "Chơi lại" và việc ẩn nhãn mức máy dựa vào `snapshot.connection !== null`; component test theo "Chờ máy", "Báo nước máy đá ngựa" (lời báo từng nước khi máy đi liền nhau), "Một người với ba máy" (ảnh chụp có kết quả); test online cũ (hai người) xanh không đổi kỳ vọng
- [x] 3.6 Báo nước đi từ nơi khác (design §5, chốt Open Question): `PlayScreen` nêu mọi nước của người ở xa hay của ghế máy kèm lượt kế tiếp (`Play.opponentMovedWaitingFor`, `Play.opponentMovedAiThinking`, `Play.opponentMovedAiSeatThinking`, `Play.aiMovedWaitingFor`, `Play.aiSeatMovedWaitingFor`), ván mới máy đi trước (`Play.newGameAiFirst`, `Play.newGameAiSeatFirst`); bản dịch vi/en/ja; component test theo các scenario của "Báo nước đi từ nơi khác"
- [x] 3.7 Sửa sau review: ghế máy chỉ ở phòng từ ba ghế (server trả `ai-not-supported` cho phòng hai ghế, sảnh chờ không có nút); `ai-seat` nhận mọi số nguyên, số âm là `invalid-seat`; đánh dấu lại ghế máy không đổi gì (scenario "Đánh dấu lại ghế máy"); nút sảnh chờ chỉ hết chờ khi ghế đổi như yêu cầu hay có lời từ chối; tên đọc được bắt đầu bằng chữ trên nút (vi/en/ja); ván mới tới khi đang hiện thì xếp hàng sau các nước và kết quả của ván cũ; lời báo giống hệt nước trước được đánh dấu để đọc lại (test `PlayScreen` + transport online + socket giả + đồng hồ giả); log lỗi máy một lần mỗi chuỗi; E2E tab cũ dùng đồng hồ giả thay `waitForTimeout`; sửa E2E Cờ caro tải lại trước khi lưu xong

## 4. Bản dịch và tài liệu

- [x] 4.1 Mã lỗi mới không có lời báo riêng (design §5): test `RoomRoute` rằng `rejected` với `not-host`, `seat-taken`, `not-ai-seat`, `game-started`, `invalid-seat` không đóng kết nối, không hiện trang lỗi, và sảnh chờ hiện theo phòng mới nhất; `messages.test.ts` xanh
- [x] 4.2 Cập nhật plan.md §3.4 (thông điệp `ai-seat`, `RoomView.seats`/`host`, `PROTOCOL_VERSION = 2`, máy chơi thay trong `room-service`, hiện lần lượt trong transport online), §10 (M6 xong: ba change, số đo hiện lần lượt nếu chỉnh)

## 5. E2E

- [x] 5.1 `e2e/online-ludo.spec.ts` phòng 3 ghế, 2 trình duyệt + 1 máy: chủ phòng tạo phòng Cờ cá ngựa "3 người", người bạn mở link mời ở trình duyệt thứ hai và "Vào chơi"; người bạn không thấy nút máy; chủ phòng bấm "Cho máy chơi" ở ghế 3 ("Chủ phòng cho máy chơi ghế còn lại"); cả hai thấy màn hình ván; hai người gieo/đi vài lượt; assert máy tự đi (lời báo "Máy …") rồi tới lượt người, hai trình duyệt cùng vị trí ngựa sau khi hiện xong; tải lại một bên hiện ngay trạng thái mới nhất; chạy cả hai cấu hình máy
- [x] 5.2 E2E một người với ba máy: chủ phòng tạo phòng "4 người", cho máy chơi ba ghế, gieo vài lượt; assert ván chạy, nhãn "Online", không có hoàn tác
- [x] 5.3 E2E tab cũ: trang phòng nhận `outdated-client` (server realtime E2E với phiên bản khác, hoặc `page.routeWebSocket` sửa lời chào) → trang báo "App vừa được cập nhật" và **không** tự tải lại (đã có test tương tự thì chỉ chạy lại và thêm assert không tải lại)

## 6. Hoàn tất

- [x] 6.1 Đối chiếu design và delta spec với code; diff trọn thân khối MODIFIED "Server làm trọng tài" và "Mọi người trong phòng thấy cùng một ván" với `openspec/specs/online-rooms/spec.md`; chạy `pnpm exec openspec validate add-room-ai-seats --strict`, `pnpm check`, `pnpm knip`, `pnpm test:e2e` (cả hai cấu hình máy), `pnpm spec:check`
- [x] 6.2 Archive change (`pnpm exec openspec archive add-room-ai-seats --yes`) trong cùng PR, sau review, sau `add-ludo-game`

## Ngoài phạm vi

- Chạy thử trên Vercel Preview (trước là task 6.2; task archive nay mang số 6.2) (Upstash thật) và ghi số đo (thời gian từ nước của người tới khi có nước máy, số lệnh Redis, dung lượng một ván 1 người + 3 máy) vào design §6: cần deploy và chơi tay trên Preview, không làm được trong lần apply này; design §6 giữ số ước tính. Đo khi deploy M6, ghi vào plan.md §10.

- Nhường ghế máy cho người đến muộn giữa ván, máy chơi thay người bỏ ván, xử thua: M8.
- Chọn mức ghế máy, chuyển chủ phòng, đuổi khỏi ghế, đổi số ghế sau khi tạo, hoàn tác việc đánh dấu ghế trống cuối cùng: không làm ở M6.
- Gửi phần nước mới thay vì cả phòng: xem lại nếu Usage cho thấy cần (`add-ludo-game` design §7).
- Hiện trước nước đi, đồng hồ, chat: không thuộc M6.
