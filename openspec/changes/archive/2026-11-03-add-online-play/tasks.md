# Tasks

## 1. Chuẩn bị

- [x] 1.1 Xác nhận change `add-online-rooms` đã archive (có `openspec/specs/online-rooms/spec.md`, `packages/protocol` có `parseServerMessage` và `playerNameSchema`, `pnpm --filter @board-games/web realtime` chạy được và `/healthz` trả 200); nếu chưa, dừng lại

## 2. Danh tính

- [x] 2.1 `features/identity/identity.ts` (`readIdentity`, `saveName`, khoá `board-games:identity` trong `config/storage-keys.ts`, design §1); test: chưa có → `null`; lưu tên lần đầu tạo `playerId`, lần sau giữ `playerId` cũ; JSON hỏng hoặc sai schema → `null` ("Danh tính đã nhớ bị hỏng"); `localStorage` ném lỗi → vẫn trả danh tính trong bộ nhớ của tab ("Trình duyệt không cho lưu" ở tầng dữ liệu); không có `crypto.randomUUID` → `playerId` từ `getRandomValues` đúng định dạng của giao thức
- [x] 2.2 `features/identity/NameField.tsx` (ô tên có nhãn, lỗi gắn bằng `aria-describedby`, kiểm bằng `playerNameSchema`, báo ra ngoài khi rời ô với tên hợp lệ) kèm bản dịch vi/en/ja; test theo scenario "Tên rỗng", tên 25 ký tự, rời ô với tên hợp lệ gọi callback lưu

## 3. Kết nối phòng

- [x] 3.1 `transport/room-connection.ts` phần cơ bản (design §3): mở, `join`, `room` đầu sau mỗi `join` luôn thay bản đang giữ, `room` sau chỉ thay khi `revision` lớn hơn, `send`, `onRejected`, sự kiện đồng bộ lại, `dispose`; test với socket giả: vào phòng → `online` với đúng `room`/`you`; `room` cũ bị bỏ; nối lại nhận `room` cùng hoặc nhỏ hơn `revision` vẫn `online`; thông điệp sai định dạng bị bỏ qua; `send` khi không `online` trả `false`
- [x] 3.2 Nối lại và lỗi (design §3, bảng mã lỗi của `add-online-rooms`); test với `vi.useFakeTimers()` và `random` giả: đóng `1006`/`4000` → `reconnecting`, thử lại theo 0/1/2/4/8/10 giây nhân hệ số trong [0,8; 1], không khoảng nào quá 10 giây; giãn cách về 0 chỉ sau 30 giây `online`; `room-not-found`, `outdated-client`, `room-full` cho `sit` → `failed`, không thử lại; `invalid-message`/`too-many-messages`/`unavailable` → nối lại có giãn cách
- [x] 3.3 Kiểm kết nối sống (design §3); test: `ping` mỗi 20 giây khi `online` và tab hiện; 45 giây không nhận được gì → tự đóng và nối lại ("Kết nối im lặng" ở tầng kết nối)
- [x] 3.4 Môi trường và rảnh (design §3, bảng thứ tự ưu tiên); test với `environment` giả: ẩn 59 giây không đóng ("Chuyển tab nhanh không bị ngắt"); ẩn 60 giây → `paused`; hiện lại sau khi ẩn ≥ 60 giây theo mốc thời gian → nối lại kể cả khi trạng thái vẫn `online` (hẹn giờ bị treo); `offline` → đóng và `reconnecting`; `online` khi tab hiện → thử ngay; `online` khi đang `paused` → không mở ("Có mạng lại khi tab đang ẩn"); 10 phút không có `room` mới và không thao tác → `idle`; đóng `4001` → `idle`; `resume()` → nối lại

## 4. Transport online

- [x] 4.1 `transport/types.ts` (design §4): `SeatView` (thêm ghế `remote`) cho `ReadySnapshot.seats`, `SeatController` giữ nguyên cho dữ liệu lưu; `waitingFor` thêm `"opponent"`; `ReadySnapshot` thêm `supportsUndo`, `canStartNewGame`, `connection`; `TransportEvent.rejected.code` thành `RejectionCode`; transport cục bộ điền `true`/`true`/`null`; `useModeLabel` bỏ qua ghế `remote`; mọi test cũ xanh, thêm assert ba trường mới ở transport cục bộ
- [x] 4.2 `transport/online-transport.ts` phần dựng ván (design §4); test với kết nối giả: biên bản 3 nước → đúng trạng thái, `lastEntry`, `lastMover`; ghế `you` là `human`, ghế khác `remote` kèm tên hoặc `null`; `viewer = you`; `canMove` theo lượt, đủ người, kết quả, kết nối; `waitingFor: "opponent"`; `inProgress` luôn sai; biên bản hỏng → trạng thái lỗi
- [x] 4.3 `online-transport.ts` phần yêu cầu (design §4); test: `submit` gửi `move` với `gameNumber`/`moveIndex` và khoá `canMove` ("Khoá bàn khi chờ server" ở tầng transport); cờ chờ gỡ khi có `room` mới, khi `rejected` ("Nước bị từ chối"), khi đồng bộ lại; 8 giây không trả lời → yêu cầu kết nối nối lại ("Nước đi không được trả lời" ở tầng transport); `rejected` mã của luật phát sự kiện, `stale-move` không phát; `requestNewGame` chỉ gửi `rematch { gameNumber }` khi đã có kết quả; `requestUndo`/`requestRedo` không gửi gì

## 5. Màn hình ván

- [x] 5.1 Lời báo trong `PlayScreen` (design §7) kèm bản dịch vi/en/ja; test component theo các scenario "Đối thủ vừa đi", "Chờ đối thủ", "Đối thủ thắng", "Ván mới nói rõ phe" (cả hai phía: người đi trước và người đi sau), mình thắng; test cũ của chơi cùng máy và đấu với máy vẫn xanh
- [x] 5.2 Nút, huy hiệu và dòng kết nối trong `PlayScreen` (design §5) kèm bản dịch vi/en/ja; test theo các scenario "Ván online được ghi rõ", "Không có hoàn tác", "Không có ván mới giữa ván", nút "Chơi lại" sau kết quả, "Nối lại nhanh không làm nhấp nháy" (fake timers: 1 giây không hiện, 1,5 giây hiện), `idle` hiện ngay với nút "Tiếp tục"; báo ngắn khi bị từ chối vì luật

## 6. Trang phòng

- [x] 6.1 `app/room/[code]/page.tsx` (+ `not-found.tsx`, `error.tsx`, title "Phòng <mã>") và địa chỉ server realtime đọc lúc chạy (design §2, §5) kèm bản dịch vi/en/ja; test: "Mã phòng viết thường trên đường dẫn" (chuyển hướng), "Mã phòng sai định dạng"; địa chỉ realtime: biến đặt → dùng biến, development → `ws://localhost:3001/api/realtime`, còn lại cùng origin `ws`/`wss`
- [x] 6.2 `features/room/RoomRoute.tsx` (design §5) kèm bản dịch vi/en/ja ("Đang vào phòng…", "Chưa kết nối được máy chủ", nút "Tiếp tục" của ô tên); test component với kết nối giả: "Lần đầu mở link mời" (hỏi tên trước), "Đang vào phòng", "Không kết nối được máy chủ" (fake timers 10 giây), `gameId` không có trong app → trang lỗi, "Thử lại" sau `failed` tạo kết nối mới
- [x] 6.3 `features/room/RoomLobby.tsx` (design §5) kèm bản dịch vi/en/ja; test theo các scenario "Mở link mời", "Sao chép link mời" (Clipboard giả; lỗi thì chọn sẵn chữ), "Mở link không chiếm ghế", "Bạn vào phòng thì bắt đầu ván" (bấm "Vào chơi" gửi `sit` với tên vừa sửa); "Chia sẻ" chỉ hiện khi có `navigator.share`; ghế của mình có "(bạn)"
- [x] 6.4 `features/room/RoomError.tsx` (design §6) kèm bản dịch vi/en/ja; test theo các scenario "Phòng không tồn tại", "Phòng đã đủ người", "App vừa cập nhật" (nút tải lại), "Dữ liệu phòng hỏng" (nút thử lại)

## 7. Màn hình bắt đầu ván và menu

- [x] 7.1 `features/room/create-room.ts` (`createRoom`: kết nối ngắn, `create` → `created`, hạn 10 giây, lỗi theo bảng mã); test với socket giả: thành công trả mã; `error` `unknown-game`/`unavailable` → lỗi; không trả lời 10 giây → lỗi; `created` đến sau hạn bị bỏ qua
- [x] 7.2 Chế độ Online ở `SetupScreen` (design §8): `SetupMode`, `readSetupChoice`/`writeSetupChoice` nhận `online` (chỉ ép `ai` về `local` khi game không có AI), nhóm chế độ luôn hiện, `NameField` điền sẵn và lưu khi rời ô, nút "Tạo phòng" khoá khi đang chờ, không hỏi xác nhận, lỗi `role="alert"`; bản dịch vi/en/ja; test theo các scenario "Chọn chơi online", "Game không hỗ trợ đấu với máy", "Nhớ chế độ online", "Tạo phòng thành công" (điều hướng tới `/room/<mã>`), "Bấm hai lần", "Không kết nối được server", "Tạo phòng không hỏi xác nhận", "Đổi tên giữ nguyên ghế" ở tầng màn hình (rời ô lưu tên); các test cũ của màn hình bắt đầu ván vẫn xanh
- [x] 7.3 Form "Vào phòng" trên menu (design §9) kèm bản dịch vi/en/ja; test theo các scenario "Nhập mã phòng", "Mã sai định dạng" (lời báo đọc được qua `aria-describedby`)

## 8. E2E

- [x] 8.1 `playwright.config.ts` thêm `webServer` của server realtime (cổng 3101, chờ `/healthz`, kho bộ nhớ) và `env.REALTIME_URL` cho `pnpm start` (design §2); `e2e/online.spec.ts` với hai `browser.newContext()`: "Tạo phòng thành công" → "Mở link mời" → "Bạn vào phòng thì bắt đầu ván" → "Đi một nước" → chơi hết ván ("Đối thủ thắng" ở bên thua) → "Chơi lại sau khi thắng" kèm "Ván mới nói rõ phe"
- [x] 8.2 E2E kết nối lại: "Mất mạng rồi có lại" (`context.setOffline`), "Tải lại trang giữa ván", "Đổi tên giữ nguyên ghế" (sửa tên ở màn hình bắt đầu ván rồi mở lại link, đối thủ thấy tên mới); E2E lỗi: "Phòng không tồn tại", "Phòng đã đủ người" (context thứ ba bấm "Vào chơi" sau khi đủ người, hoặc mở link sau khi đủ), "Nhập mã phòng" và "Mã sai định dạng" ở menu; chạy cả hai cấu hình máy (desktop, điện thoại)

## 9. Hoàn tất

- [x] 9.1 Cập nhật idea.md §6.3 (không hiển thị trước, lý do), plan.md §3.2 (`app/room/[code]`, `features/room`, `features/identity`), §3.4 (`Transport`, ảnh chụp, `SeatView`, `RoomConnection`), §5 (`pnpm dev` có online), §10 (M4 xong), README (chơi online ở máy)
- [x] 9.2 Chạy `pnpm check`, `pnpm knip`, `pnpm spec:check`, `pnpm test:e2e`

## 10. Sửa theo review

- [x] 10.1 `room-connection`: `room` đầu sau mỗi `join` chỉ tính là hoạt động khi chưa có bản nào hoặc `revision` khác (design §3 "Rảnh"); test: server cắt `1006` mỗi 300 giây và trả lại cùng `revision`, 10 phút không thao tác → `idle` ("Server cắt kết nối định kỳ khi trang để không")
- [x] 10.2 Tên đọc lại ở mỗi lần chào (`getIdentity`, trang phòng truyền `readIdentity()`); trang phòng nhớ tên chọn ở sảnh chờ và cập nhật danh tính của trang mà không tạo lại kết nối (design §3, §5); test: `sit` với tên mới → mất kết nối → `join` sau mang tên mới (tầng kết nối và trang phòng); "Thử lại" dùng tên nhớ gần nhất ("Đổi tên ở sảnh chờ còn sau khi nối lại")
- [x] 10.3 Hết ghế xử lý ở tầng giao thức: `room` có `you = null` và không còn ghế trống → `failed` `room-full`, đóng socket; bỏ các chỗ tự kiểm "chưa có ghế và hết ghế" ở trang phòng và component con `dispose` kết nối của cha; trang "Không mở được phòng" (game không có trong app, biên bản hỏng) dừng kết nối ở `RoomSession` (design §3, §4, §5, §6); test ở `room-connection` và `RoomRoute` ("Phòng đã đủ người", "Dữ liệu phòng hỏng": không tự kết nối lại)
- [x] 10.4 Cờ chờ của transport online là `{ gameNumber, moveIndex }`, chỉ gỡ khi ván đổi hoặc có thêm nước (cùng các đường `rejected`, đồng bộ lại, hạn 8 giây) (design §4); test: đối thủ đổi tên khi nước đang chờ → bàn vẫn khoá, không gửi được nước thứ hai; `rematch` chỉ gỡ khi có ván mới ("Đối thủ đổi tên khi đang chờ server")
- [x] 10.5 `SetupScreen`: bỏ qua kết quả tạo phòng sau khi rời màn hình; vùng `role="status"` "Đang tạo phòng…"; `outdated-client` → báo app vừa cập nhật kèm nút "Tải lại trang"; bản dịch vi/en/ja (design §8); test theo "Đang tạo phòng", "Rời màn hình khi đang tạo", "App cũ khi tạo phòng"
- [x] 10.6 `room-connection`: sự kiện `online` nối lại ngay cả khi lần thử còn treo (chưa vào phòng) (design §3, bảng sự kiện); test: lần thử mở lúc mất mạng không mở cũng không đóng, có mạng lại → mở socket mới ngay
- [x] 10.7 Giãn cách chỉ về 0 sau 30 giây `online` liên tục, với mọi kiểu đóng (design §3 "Nối lại"); test: server trả lời `join` rồi đóng `1006` ngay, nhiều lần → khoảng chờ tăng dần ("Server đóng ngay sau mỗi lần vào phòng")
- [x] 10.8 `identity`: khi trình duyệt đã từ chối ghi, đọc bản trong bộ nhớ trước (design §1); test: đã nhớ "Minh", ghi lỗi `QuotaExceededError`, đổi tên "Lan" → đọc ra "Lan" ("Trình duyệt hết chỗ lưu khi đổi tên")
- [x] 10.9 "Vào chơi" có hạn trả lời 8 giây ở tầng kết nối, quá hạn thì nối lại (design §3 "Ngồi ghế"); test: không trả lời 8 giây → nối lại; `room` có ghế tới trước hạn → không nối lại ("Vào chơi không được trả lời")
- [x] 10.10 Trợ năng: form vào phòng và ô tên đưa focus về ô khi bị từ chối lúc xác nhận; bước hỏi tên focus sẵn ô tên; từ sảnh chờ sang ván thì tiêu đề màn hình ván nhận focus; mục "Vào phòng bằng mã" có tiêu đề riêng khác chữ của nút; bản dịch vi/en/ja (design §1, §5, §9); test bằng truy vấn theo vai trò ("Tên rỗng", "Mã sai định dạng", "Focus khi vào ván")
- [x] 10.11 `PlayScreen` không biết mã lỗi của server: transport online là nơi duy nhất lọc, chỉ phát `rejected` với mã của luật; lời báo "Nước đi không hợp lệ." chỉ mất khi số nước đổi; tên nút "Chơi lại"/"Ván mới" theo ghế `remote` (design §4, §5); test: trạng thái kết nối đổi vẫn giữ lời báo ("Nước sai luật", "Lời từ chối đã được giải thích")
- [x] 10.12 `RoomRoute`: thay đối tượng giả `NEVER_BROKEN` bằng component con nhận transport khác `null` (`OnlineGameScreen`)
- [x] 10.13 Test component (`SetupScreen`, `RoomRoute`) dùng bản module danh tính nạp mới mỗi test (`src/test/fresh-identity.ts`); sảnh chờ không còn tự nhớ tên nên không chạm module danh tính; test: ngay sau test trình duyệt từ chối lưu, trang không còn nhớ tên
- [x] 10.14 Test "Bấm hai lần" bấm hai lần trong cùng một `act` trước khi vẽ lại, chứng minh khoá bằng `creatingRef` (đã thử bỏ khoá: test đỏ)
- [x] 10.15 Dọn: `CONNECTION_STATUS` và `ConnectionStatus` ở `transport/types.ts`, dùng hằng thay chuỗi; lề âm nằm trong `ConnectionNotice`; bỏ `retryTimer.clear()` thừa (bỏ `reconnectNow`), dùng lại `isStopped`; biên bản hỏng không phát lại mỗi lần trạng thái kết nối đổi; `create-room` khai báo socket trước `finish` (test: socket báo đóng ngay khi đang mở); test `Input` của `packages/ui`; E2E: server realtime `reuseExistingServer: false`, "catches up" chờ server ghi nước của đối thủ và dựa vào sự kiện `online` thay vì thời gian giãn cách
- [x] 10.16 Đối chiếu design.md và mọi delta spec với code sau khi sửa (tách các requirement quá dài: "Báo nước đi bị từ chối", "Giãn cách khi kết nối lại", "Tạm ngắt khi lâu không có hoạt động", "Trong lúc tạo phòng", "Đổi tên tạm"); plan.md §3.4; `pnpm exec openspec validate add-online-play --strict` hợp lệ; chạy `pnpm check`, `pnpm knip`, `pnpm test:e2e` (cả hai cấu hình máy)

## Ngoài phạm vi

- Danh sách ván online đang chờ trên menu, chấm có mặt của đối thủ, xử thua khi bỏ ván, đầu hàng: M8.
- Hiện nước đi trước khi server xác nhận: không làm (design §4).
- Chơi thử thật giữa hai thiết bị (một điện thoại) qua link mời trên Production: làm sau khi merge vào `main` (Preview có Deployment Protection chặn thiết bị chưa đăng nhập Vercel); kết quả ghi vào plan.md §10 ở commit sau.
- Các scenario "Quay lại sau khi chuyển tab lâu", "Để trang lâu không chơi", "Server cắt kết nối", "Kết nối im lặng", "Nước đi không được trả lời", "Không kết nối được máy chủ" được kiểm ở tầng `room-connection`/`online-transport`/component bằng đồng hồ và môi trường giả, không bằng E2E (phải chờ hàng phút hoặc giả lập mạng mà Playwright không làm được ổn định).
