# Proposal

## Why

idea.md §4.3 hứa "Đầu hàng; xử thua (hoặc cho AI chơi thay, với cá ngựa) khi bỏ ván quá lâu", và §8 ghi rủi ro "Bỏ ván giữa chừng: cần luật rõ … để người còn lại không bị treo". Hiện nay một người tắt điện thoại giữa ván online là người kia kẹt mãi ở "Đang chờ Minh…" (phòng chỉ hết hạn sau 7 ngày), còn ván đấu với máy thì chỉ bỏ được bằng "Ván mới". Người dùng đã chốt luật bỏ ván và đầu hàng ngày 04/11/2026 (design, "Đã chốt với người dùng"). Thuộc mốc **M8. Hoàn thiện MVP** (plan.md §6.2: "xử lý bỏ ván"); là change đầu của M8.

## What Changes

- **Kết thúc ván ngoài luật ở engine**: phiên chơi có thêm "kết thúc" chung cho mọi game — một người đầu hàng (`resigned`) hoặc bị xử bỏ ván (`abandoned`), mọi người còn lại thắng với mã lý do đó. Kết thúc được ghi vào biên bản (`GameRecord.ending`, trường tuỳ chọn, `RECORD_VERSION` giữ 1), kiểm như dữ liệu không tin cậy khi dựng lại, và sau đó không đi, không hoàn tác được. Luật của từng game (`packages/games`) không đổi; bộ kiểm tra hợp đồng thêm một kiểm tra chung.
- **Đầu hàng online** (thông điệp `resign { gameNumber }`): phòng hai ghế (Tic-tac-toe, Cờ caro, Cờ vua, Cờ cá ngựa 2 người) → đối thủ thắng (`resigned`); phòng từ ba ghế của game có máy (Cờ cá ngựa 3–4 người) → ghế đó **do máy chơi thay** tới hết ván (máy đi ngay nếu đang tới lượt ghế đó), người đó vẫn ở ghế, xem tiếp và chơi lại được ván sau; nếu không còn ai khác tự chơi thì ván kết thúc như phòng hai ghế.
- **Xử bỏ ván online** (thông điệp `claim-abandoned { gameNumber, moveIndex }`): khi người đến lượt chưa đi **5 phút** theo đồng hồ server, người khác có ghế (kể cả người đã được máy chơi thay) bấm được, cùng quy tắc với đầu hàng: phòng hai ghế → mình thắng (`abandoned`); phòng từ ba ghế → máy chơi thay ghế đó và đi ngay; người tự chơi cuối cùng bỏ đi → ván kết thúc, phòng không bao giờ treo. Quy tắc "đầu hàng / xử bỏ ván làm gì" là một hàm thuần ở `packages/protocol` (`leaveOutcome`, `abandonClaim`), server và client dùng chung. Không hẹn giờ, không dịch vụ mới: server lưu thời điểm bắt đầu lượt cùng phòng (`turnStartedAt`) và kiểm khi nhận yêu cầu; trạng thái phòng gửi kèm lượt đã kéo dài bao lâu (`turnIdleMs`) để client đếm, không dựa vào giờ của máy người chơi.
- **Ghế máy chơi thay**: ghế người có cờ `standIn`; server đi ghế đó như ghế máy (mức Vừa, rng server, trong cùng lần ghi), không ai đi thay; máy chơi thay về đích trước thì ghế đó thắng ("Máy (thay Lan) thắng!", không ăn mừng trên màn hình của Lan); "Chơi lại" trả ghế cho người đó.
- Mã từ chối mới `not-abandoned`; dùng lại `not-seated`, `waiting-for-players`, `stale-move`, `game-over`. Không mã nào làm client nối lại.
- `PROTOCOL_VERSION` 2 → 3, `STORED_ROOM_FORMAT` 2 → 3; phòng định dạng 1 và 2 vẫn đọc được (ván đang dở không mất khi deploy).
- **Đầu hàng khi đấu với máy**: nút "Đầu hàng" + hộp thoại xác nhận; máy thắng, ván kết thúc (không còn là ván dở). Chế độ cùng máy không có đầu hàng ("Ván mới" đã có).
- **Giao diện**: nút "Đầu hàng" trong hàng nút của màn hình chơi (online, với máy), hộp thoại `ConfirmDialog` nói rõ hậu quả; dòng "Minh chưa đi · 2:13" khi chờ quá 1 phút, nút "Xử thắng" / "Cho máy chơi thay" từ 5 phút (có xác nhận); lời nhắc cho người đến lượt từ phút thứ 4; bảng người chơi ghi "Máy chơi thay"; dòng giải thích kết quả "Minh đã đầu hàng." / "Minh bỏ ván: quá 5 phút không đi.". Mockup: `mockup/index.html`.
- Bản dịch vi/en/ja; test engine, room-service, giao thức, transport, component, E2E hai trình duyệt.

## Capabilities

### New Capabilities

(không có)

### Modified Capabilities

- `game-engine`: thêm "Đầu hàng và bỏ ván"; sửa "Hoàn tác và làm lại" (ván kết thúc vì đầu hàng hay bỏ ván không hoàn tác được).
- `online-rooms`: thêm "Thời điểm bắt đầu lượt", "Đầu hàng trong phòng", "Xử bỏ ván", "Từ chối đầu hàng và xử bỏ ván", "Máy chơi thay người".
- `online-play`: thêm "Đầu hàng khi chơi online", "Chờ người lâu chưa đi", "Nhắc người đến lượt", "Ghế máy chơi thay trên màn hình".
- `play-vs-ai`: thêm "Đầu hàng khi đấu với máy".
- `local-play`: thêm "Không đầu hàng khi chơi cùng máy".

## Ngoài phạm vi

- Lấy lại ghế giữa ván sau khi máy đã chơi thay ("Chơi tiếp"): người dùng chốt không làm; ghế trả về ở "Chơi lại".
- Đồng hồ cho mỗi bên, xử thua khi hết giờ, đề nghị hoà cần đối phương đồng ý: v1 (idea.md §4.3).
- Thời hạn bỏ ván khác nhau theo game hay chủ phòng chọn: người dùng chốt 5 phút cho mọi game.
- Hẹn giờ phía server (QStash, Vercel Cron), tự xử khi không ai bấm: người dùng chốt không dùng; người còn lại bấm nút.
- Đầu hàng khi chơi cùng máy: dùng "Ván mới".
- Chuyển quyền chủ phòng khi chủ phòng bỏ đi: không đổi (rủi ro đã ghi ở `add-room-ai-seats`).
- Xem ván của phòng đã đủ người khi chưa từng có ghế (spectator): v2.

## Impact

- **Code**:
  - `packages/engine/src/` (`types.ts`/`session.ts`: `ENDING_REASON`, `GameEnding`, `Session.ending`, `concede`, `sessionResult`, `playMove`/`applyEntry`/`undo`/`redo`/`canUndo`/`canRedo` xét kết thúc; `record.ts`: `GameRecord.ending`, kiểm khi dựng lại; `testing/`: kiểm tra hợp đồng `concede`; `index.ts`).
  - `packages/protocol/src/` (`leaving.ts` mới: `leaveOutcome`, `abandonClaim`, `MAX_SEATS_WITHOUT_AI` chuyển từ server; `room.ts`: `PROTOCOL_VERSION = 3`, `ABANDON_AFTER_MS`, `RoomView.turnIdleMs`, `SeatView` người có `standIn`, `gameRecordSchema.ending`; `messages.ts`: `resign`, `claim-abandoned`, `REJECTABLE_REQUESTS`; `errors.ts`: `not-abandoned`).
  - `apps/web/src/server/` (`room.ts`: `STORED_ROOM_FORMAT = 3`, `turnStartedAt: number | null`, `standIn`, đọc định dạng 1–2, `toRoomView(room, now)`; `room-service.ts`: `resign`, `claimAbandoned`, ghế `standIn` trong `playAiSeats`/`move`/`rematch`, `turnStartedAt` trong `written`; `realtime/connection.ts`: định tuyến hai thông điệp mới, `deliver` truyền giờ server, gửi phòng `force` trước lời từ chối; `env.ts`: `REALTIME_ABANDON_AFTER_MS` chỉ cho server realtime ở máy).
  - `apps/web/src/transport/` (`types.ts`: `Transport.resign`, `Transport.claimAbandoned`, `ReadySnapshot.resign`, `ReadySnapshot.turn`, sự kiện `claim-refused`; `local-transport.ts`, `online-transport.ts`, `room-connection.ts`: `turnClock` tính lúc nhận phòng, nhận phòng cùng `revision`).
  - `apps/web/src/features/play/` (`PlayScreen.tsx`, `ResultCard.tsx`, `PlayerPanel.tsx`, mới `AbandonNotice.tsx`, `use-ticking-clock.ts`, `use-turn-thresholds.ts`), `packages/ui/src/icons.ts` (`FlagIcon`), `apps/web/messages/{vi,en,ja}.json`, `apps/web/e2e/` (`online-abandon.spec.ts` mới, `play-vs-ai.spec.ts`), `apps/web/ui-shots/screens.shots.ts`.
- **Games**: không đổi.
- **Phụ thuộc, dịch vụ**: không thêm thư viện, không hẹn giờ, không dịch vụ mới; không thêm lệnh Redis ngoài một lần ghi cho mỗi lần đầu hàng hay xử bỏ ván.
- **Bất biến**:
  - "Một ván = danh sách nước đi": giữ — biên bản vẫn là danh sách nước đi, thêm một dấu kết thúc ở cuối; nối lại, phát lại, tự lưu vẫn dựng bằng phát lại.
  - "Server là trọng tài": giữ — server quyết định đầu hàng và bỏ ván bằng đồng hồ của mình; giờ của client chỉ để hiển thị.
  - "Function không giữ state": giữ — thời điểm bắt đầu lượt nằm trong phòng ở Redis, không có tiến trình nền.
  - "Không thêm dịch vụ trả phí hoặc dịch vụ ngoài mới": giữ — bỏ ý dùng QStash cho ván bị bỏ (idea.md §6.1, §6.3 ghi như vậy); task cập nhật idea.md §6.3 và §9.
- **Tài liệu**: plan.md §3.4 (giao thức, `RoomView`, `GameRecord`, `Transport`), §10; idea.md §6.1, §6.3, §9.
