# Tasks

## 0. Trước khi code

- [x] 0.1 Người dùng duyệt `mockup/index.html` và trả lời câu hỏi mở (04/11/2026, design "Đã chốt với người dùng" mục 3–7); sửa mockup theo review (G: "Đầu hàng" tách khỏi "Gieo xúc xắc"; K: "Máy (thay Lan) thắng!")

## 1. Engine: kết thúc ngoài luật

- [x] 1.1 `ENDING_REASON`, `GameEnding`, `Session.ending`, `concede` (design §1); `sessionResult` trả kết quả từ `ending` chỉ khi `cursor === entries.length`; export ở `index.ts`
- [x] 1.2 `playMove`, `applyEntry` trả `game-over` khi có `ending`; `canUndo`/`canRedo` sai, `undo`/`redo` trả `game-over`
- [x] 1.3 `GameRecord.ending` (tuỳ chọn) trong `toRecord`/`fromRecord`, kiểm `reason`, `player`, thế cuối chưa có kết quả → `corrupt-record`
- [x] 1.4 Test engine trên game mẫu (`test-fixtures`) theo mọi scenario của "Đầu hàng và bỏ ván" và "Không hoàn tác sau khi đầu hàng"; phiên cắt bằng `cursor` không có kết quả; `concede` sau hoàn tác bỏ nhánh đã hoàn tác
- [x] 1.5 Bộ kiểm tra hợp đồng: chỉ thêm kiểm tra "Lý do của luật không trùng" (`resigned`/`abandoned`); test của bốn game xanh không sửa

## 2. Giao thức

- [x] 2.1 `PROTOCOL_VERSION = 3`, `ABANDON_AFTER_MS`, `RoomView.turnIdleMs`, `SeatView` người có `standIn`, `gameRecordSchema.ending`; thông điệp `resign`, `claim-abandoned`; `REJECTABLE_REQUESTS`; `ROOM_ERROR.NotAbandoned`
- [x] 2.2 `leaving.ts`: `MAX_SEATS_WITHOUT_AI` (chuyển từ `room-service.ts`), `leaveOutcome`, `abandonClaim` (design §2); test mọi nhánh (Cờ cá ngựa 2 ghế → kết thúc, 3 ghế còn người tự chơi → máy chơi thay, người tự chơi cuối cùng → kết thúc, game không có máy → kết thúc; xử: quá sớm, tự xử, ghế đến lượt là máy hay máy chơi thay, người được máy chơi thay xử)
- [x] 2.3 Test schema: thông điệp mới chặt, `rejected` với `not-abandoned` đọc được, `room` có `ending` giữ nguyên tới app, lời chào bản 2 nhận `outdated-client`

## 3. Server

- [x] 3.1 `room.ts`: `STORED_ROOM_FORMAT = 3`, `turnStartedAt: number | null`, `standIn`; `parseStoredRoom` đọc định dạng 1, 2 (`turnStartedAt = updatedAt`, `standIn: false`); `toRoomView(room, now)` chỉ tính `now − turnStartedAt`; test (spy: không gọi `fromRecord`)
- [x] 3.2 `room-service.ts`: `written(room, changes, turn)` với `restart`/`stop`/`keep` theo design §4 từ phiên mà mỗi quyết định đã có; ghế `standIn` trong `playAiSeats`, `withAiMoves`, `move` (`not-your-turn`), `rematch` (đặt `standIn: false`)
- [x] 3.3 `resign` và `claimAbandoned` theo thứ tự kiểm ở design §5, dùng `leaveOutcome`/`abandonClaim`; đầu hàng đúng lượt mình ở phòng từ ba ghế gọi `playAiSeats` trong cùng lần ghi và đặt lại `turnStartedAt`
- [x] 3.4 `room-service-abandon.test.ts` (kho bộ nhớ, `now` giả, rng có seed) theo mọi scenario của "Thời điểm bắt đầu lượt", "Đầu hàng trong phòng" (kể cả "Đầu hàng đúng lượt mình ở Cờ cá ngựa", "Phòng Cờ cá ngựa hai ghế"), "Xử bỏ ván" (kể cả "Người tự chơi cuối cùng bỏ đi"), "Từ chối đầu hàng và xử bỏ ván" (kể cả "Xử hai lần" → `game-over`), "Máy chơi thay người"; test cũ của room-service xanh
- [x] 3.5 `realtime/connection.ts`: định tuyến `resign`, `claim-abandoned`; `deliver` gửi `toRoomView(room, Date.now())`; với lời từ chối của hai yêu cầu này gửi phòng bằng `force` trước `rejected`; test kết nối (lời từ chối không đóng kết nối, phòng cùng `revision` có `turnIdleMs` mới)
- [x] 3.6 `env.ts`: `REALTIME_ABANDON_AFTER_MS` tuỳ chọn, bị bỏ qua khi có `VERCEL_ENV`; không đặt thì `ABANDON_AFTER_MS`; test `env.test.ts`

## 4. Transport

- [x] 4.1 `types.ts`: `Transport.resign`, `Transport.claimAbandoned`, `ReadySnapshot.resign`, `ReadySnapshot.turn`, sự kiện `claim-refused`, ghế máy có `standInFor`
- [x] 4.2 Transport cục bộ: đầu hàng ở chế độ với máy (huỷ lượt máy, `concede`, xoá slot; xoá lỗi thì lưu biên bản có `ending`); cùng máy `resign = null`; test theo "Đầu hàng khi đấu với máy" và nhánh xoá lỗi (`restore` bỏ ván)
- [x] 4.3 `room-connection.ts`: `send` nhận `resign`, `claim-abandoned`; `acceptRoom` ghi `receivedAt` và `turnClock`, nhận phòng cùng `revision` chỉ để cập nhật `turnClock`; lời từ chối không nối lại; test
- [x] 4.4 Transport online: `turn`/`resign` từ `turnClock` + `leaveOutcome`/`abandonClaim`, `available` theo trạng thái kết nối, ghế `standIn` như ghế máy, gửi đúng `gameNumber`/`moveIndex`, phát `claim-refused` với `not-abandoned`, không xoá cờ chờ của nước đang gửi; test với đồng hồ giả, kể cả "Giờ của thiết bị sai" và "`refresh()` khi kết nối đổi không đổi `startedAt`"

## 5. Màn hình chơi

- [x] 5.1 `FlagIcon` trong `packages/ui/src/icons.ts`; nút "Đầu hàng" + `ConfirmDialog` trong `PlayScreen` (văn bản theo `resign.outcome`, `aria-disabled` + lý do khi `available` sai, đóng khi `resign` thành `null`, tiêu điểm theo design §6)
- [x] 5.2 `use-turn-thresholds.ts` (hẹn giờ ở `PlayScreen` tới ngưỡng 1/4/5 phút), `use-ticking-clock.ts`, `AbandonNotice.tsx` (dòng chờ, nút xử + xác nhận đóng khi lượt đổi, lời nhắc người đến lượt, `notYet` khi `claim-refused`); dòng lượt đổi một lần ở 5:00 và 4:00
- [x] 5.3 Dòng giải thích `Play.ending.*` trước `useResultDetail` của game; "Máy thắng!" khi người chơi đầu hàng ván với máy dù có mấy máy; "Máy (thay <tên>) thắng!" và không ăn mừng khi ghế thắng do máy chơi thay
- [x] 5.4 Ghế `standIn` trong `PlayerPanel`/`SeatBar` và lời báo nước của máy chơi thay; dòng lượt "Máy đang chơi thay bạn."
- [x] 5.5 Bản dịch vi/en/ja mọi khoá ở design §8; `messages.test.ts` xanh
- [x] 5.6 Test component (fake timers) theo các scenario của `online-play` ("Đầu hàng khi chơi online", "Chờ người lâu chưa đi", "Nhắc người đến lượt", "Ghế máy chơi thay trên màn hình"), `play-vs-ai` và `local-play` ("Ván cùng máy" không có nút)

## 6. E2E và ảnh

- [x] 6.1 `e2e/online-abandon.spec.ts` hai trình duyệt: đầu hàng Cờ caro rồi "Chơi lại"; xử bỏ ván Tic-tac-toe; Cờ cá ngựa 3 ghế cho máy chơi thay rồi "Chơi lại" trả ghế; Cờ cá ngựa 2 ghế đầu hàng → kết thúc; cả hai cấu hình Playwright. Thời gian: server realtime của E2E đặt `REALTIME_ABANDON_AFTER_MS` ngắn; trình duyệt **chỉ** dùng `page.clock.setSystemTime` (không `fastForward`/`runFor`, vì chúng chạy hẹn giờ im lặng 45 giây → nối lại)
- [x] 6.2 `e2e/play-vs-ai.spec.ts`: đầu hàng Tic-tac-toe → "Máy thắng!", menu không còn ván dở; `play-chess.spec.ts`: ván cùng máy không có "Đầu hàng"
- [x] 6.3 `ui-shots/screens.shots.ts`: các ảnh ở design §7 (`page.clock.setSystemTime` như 6.1); chạy `pnpm ui:shots`, xem từng ảnh sáng/tối × 390/1280, so với mockup
- [x] 6.4 Rà `web-design-guidelines` trên `features/play/**` đã đổi; checklist UX bàn cờ của skill `board-games-ui` (mục online)

## 7. Hoàn tất

- [x] 7.1 plan.md §3.4 (`GameRecord.ending`, `concede`, `leaveOutcome`/`abandonClaim`, thông điệp mới, `PROTOCOL_VERSION` 3, `RoomView.turnIdleMs`, `standIn`, `STORED_ROOM_FORMAT` 3, `Transport.resign`/`claimAbandoned`), §10 (M8: change này); idea.md §6.1, §6.3 (bỏ QStash cho ván bị bỏ, thay bằng thời điểm lượt lưu cùng phòng) và §9 (quyết định mới: bỏ ván 5 phút, đầu hàng, phòng 2 ghế kết thúc ván)
- [x] 7.2 Đối chiếu design và delta với code; diff trọn thân khối MODIFIED (`game-engine` "Hoàn tác và làm lại") với `openspec/specs/`; `pnpm exec openspec validate add-resign-and-abandon --strict`, `pnpm check`, `pnpm knip`, `pnpm test:e2e` (hai cấu hình), `pnpm spec:check`
- [x] 7.3 Archive change (`pnpm exec openspec archive add-resign-and-abandon --yes`) trong cùng PR, sau review

## Ngoài phạm vi

- Lấy lại ghế giữa ván sau khi máy chơi thay: người dùng chốt không làm; ghế trả về ở "Chơi lại".
- Đồng hồ mỗi bên, đề nghị hoà, hẹn giờ phía server, tự xử khi không ai bấm: proposal "Ngoài phạm vi".
- Thời hạn bỏ ván theo game: người dùng chốt 5 phút cho mọi game.
- Đo trên Vercel Preview với Upstash thật: không cần riêng (một lần ghi mỗi yêu cầu, như `move`); làm cùng lần thử trên thiết bị thật của `polish-accessibility-and-mobile`.
