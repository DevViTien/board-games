# Tasks

## 1. Duyệt thiết kế

- [x] 1.1 Người dùng duyệt mockup `mockup/index.html` (ảnh trong `mockup/png/`). Ghi ngày duyệt và chỗ cần sửa vào design.md §5, sửa mockup nếu có.

## 2. Giao thức và server

- [x] 2.1 `packages/protocol`: thông điệp `rematch` có thêm `options?: unknown`. Test schema nhận cả hai dạng, và giá trị lạ trong `options` vẫn qua được schema.
- [x] 2.2 `room-service.rematch` nhận `options`, kiểm bằng `parseGameOptions` sau các bước kiểm cũ, và tạo ván mới với tuỳ chọn đó. Test các scenario "Ván mới với tuỳ chọn khác", "Tuỳ chọn gửi kèm không hợp lệ", "Ván mới giữ tuỳ chọn luật" và "Cả hai cùng yêu cầu ván mới" (một yêu cầu có tuỳ chọn).
- [x] 2.3 Kết nối realtime chuyển `options` của `rematch` tới `room-service`. Test trong `connection.test.ts`.

## 3. Transport

- [x] 3.1 `requestNewGame(options?)` trong `transport/types.ts` và `local-transport`: kiểm tuỳ chọn, tạo ván mới và lưu cùng tuỳ chọn. Test: ván mới với tuỳ chọn khác; tải lại giữ tuỳ chọn; tuỳ chọn sai bị bỏ qua.
- [x] 3.2 `online-transport`: `requestNewGame(options?)` gửi kèm `options`; lời từ chối `invalid-options` mở lại nút như mọi lời từ chối `rematch`. Test với `fake-realtime`.

## 4. Nhóm lựa chọn có ghi chú

- [x] 4.1 `RadioGroup`: thêm `hint` cho từng lựa chọn và `layout: "bar" | "grid"`. Test component: radio gốc, ghi chú nằm trong tên đọc được, phím mũi tên vẫn đổi lựa chọn.
- [x] 4.2 `useOptionLabels`: thêm `hint`, `change` và `next`. Test `use-option-labels.test` kiểm khoá `change` bắt buộc với game có tuỳ chọn, ghi chú đủ cho mọi giá trị khi có ở một giá trị, và khoá `next` khi game có gợi ý, ở vi, en, ja.
- [x] 4.3 Tách `OptionFields` khỏi `SetupScreen`; nhóm có ghi chú dùng lưới. Test giữ nguyên các test của `SetupScreen`, thêm scenario "Nhóm không có ghi chú giữ như cũ".

## 5. Màn hình chơi

- [x] 5.1 `NewGameOptionsDialog`: dùng `OptionFields`, chọn sẵn tuỳ chọn đang chơi; "Bắt đầu ván mới" ghi lựa chọn nhớ gần nhất rồi gọi `requestNewGame(options)`. Test: scenario "Huỷ đổi tuỳ chọn", "Hộp chọn sẵn tuỳ chọn đang chơi" và "Màn bắt đầu ván nhớ bàn vừa đổi".
- [x] 5.2 Thẻ kết quả của `PlayScreen`: nút đổi tuỳ chọn và nút gợi ý (`GameUI.useNextOptions`), thứ tự và kiểu nút theo design §3, focus sau khi bắt đầu ván mới. Test: scenario "Đổi bàn Cờ caro cùng máy", "Không đổi được giữa ván", "Game không có tuỳ chọn" và "Game không gợi ý"; gợi ý thử bằng một game giả trong test.
- [x] 5.3 Lời báo "Ván mới: {rules}" khi ván online mới có tuỳ chọn khác ván trước. Test component: scenario "Bạn đổi bản đồ" (dùng Cờ caro) và "Chơi lại giữ tuỳ chọn".
- [x] 5.4 Bản dịch vi, en, ja: `Play.newGameOptions`, `Play.optionsDialog.*` và `Games.caro.options.change`. Khoá của Đội gom thạch nằm ở `add-jelly-crew-game` §11.

## 6. E2E và ảnh

- [x] 6.1 E2E Cờ caro cùng máy: thắng một ván rồi đổi sang 19×19 từ thẻ kết quả, tải lại vẫn là 19×19.
- [x] 6.2 E2E Cờ caro online hai trình duyệt: một người đổi sang 19×19, người kia thấy bàn 19×19 và lời báo "Ván mới: 19×19 · Chặn hai đầu".
- [x] 6.3 `ui-shots`: thêm cảnh hộp "Đổi bàn, luật" và thẻ kết quả Cờ caro có nút đổi. Xem sáng/tối × 390/1280, so với mockup.

## 7. Kiểm tra

- [x] 7.1 Rà `web-design-guidelines` trên các file giao diện đã đổi, sửa phát hiện.
- [x] 7.2 Hai lượt review code (senior dev, săn bug), sửa phát hiện.
- [x] 7.3 `pnpm check`, `pnpm knip`, `pnpm spec:check`, `pnpm test:e2e` xanh.
- [ ] 7.4 Người dùng chơi thử đổi bản đồ, cả cùng máy lẫn online. Ghi kết quả vào design.md.

## Workflow follow-up

- Archive sau `add-jelly-gather-puzzle`, `add-jelly-gather-molds` và `add-jelly-crew-game` (thứ tự tạo change). Scenario "Sang bản đồ tiếp sau khi thắng" cần bản đồ "Tiệm chè" của `add-jelly-crew-game` §11.
