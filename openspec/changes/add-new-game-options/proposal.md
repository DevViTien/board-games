# Proposal

## Why

Chơi thử Đội gom thạch ngày 13/11/2026: chơi xong một bản đồ, cả nhóm không đổi được sang bản đồ khác. "Ván mới" và "Chơi lại" luôn giữ tuỳ chọn của ván trước. Muốn đổi thì phải về màn bắt đầu ván; chơi online còn phải tạo phòng mới và gửi lại link cho bạn. Cờ caro (cỡ bàn, luật thắng) cũng bị như vậy. Thêm bản đồ cho Đội gom thạch (làm trong `add-jelly-crew-game` §11) chỉ có ích khi đổi được bản đồ ngay trong lúc chơi.

Change nằm ngoài các mốc M0–M8 của plan.md §6, đi cùng nhóm "game tự thiết kế" (§6.3) như `add-jelly-crew-game`, làm theo yêu cầu của người dùng sau buổi chơi thử.

## What Changes

- **Đổi tuỳ chọn khi ván kết thúc**: với game có tuỳ chọn luật, khi ván có kết quả, thẻ kết quả có thêm nút đổi tuỳ chọn. Tên nút do game đặt: "Đổi bản đồ" cho Đội gom thạch, "Đổi bàn, luật" cho Cờ caro. Nút có ở cùng máy, đấu với máy và online.
  - Bấm nút mở hộp chọn có đúng các nhóm như màn bắt đầu ván, chọn sẵn tuỳ chọn của ván vừa xong.
  - "Bắt đầu ván mới" bắt đầu ngay ván mới với lựa chọn đó; online là cho cả phòng.
  - Lựa chọn mới thành lựa chọn nhớ gần nhất của game trên máy người đổi.
- **Ván tiếp theo do game gợi ý**: game được gợi ý tuỳ chọn cho ván sau, tuỳ theo kết quả. Khi có gợi ý, thẻ kết quả có nút chính mang tên gợi ý, ví dụ "Bản đồ tiếp: Tiệm chè"; bấm là vào ván mới ngay. Đội gom thạch dùng gợi ý này: thắng thì sang bản đồ kế tiếp.
- **Online**:
  - Yêu cầu ván mới trong phòng được gửi kèm tuỳ chọn; server kiểm như lúc tạo phòng và từ chối tuỳ chọn sai với `invalid-options`.
  - Ai đang có ghế cũng đổi được, giống "Chơi lại" hiện nay. Các lần "Chơi lại" sau giữ tuỳ chọn mới.
  - Khi ván mới có tuỳ chọn khác ván trước, màn hình mọi người báo "Ván mới: Tiệm chè".
- **Nhóm lựa chọn có ghi chú**: game được ghi chú cho từng giá trị tuỳ chọn, ví dụ độ khó "Dễ", "Vừa", "Khó" của bản đồ. Nhóm có ghi chú hiện thành lưới ô, mỗi ô có tên và ghi chú, ở cả màn bắt đầu ván lẫn hộp đổi tuỳ chọn. Nhóm không có ghi chú giữ dạng thanh như cũ.

## Capabilities

### New Capabilities

- `new-game-options`: đổi tuỳ chọn luật khi bắt đầu ván mới ngay từ màn hình chơi, và nút ván tiếp theo do game gợi ý, ở mọi chế độ.

### Modified Capabilities

- `online-rooms`: "Ván mới trong phòng" nhận tuỳ chọn gửi kèm, từ chối tuỳ chọn sai với `invalid-options`.
- `online-play`: "Luật của phòng online" giữ tuỳ chọn cho tới khi có người đổi lúc bắt đầu ván mới.
- `local-play`: "Tuỳ chọn luật của ván": "Ván mới" giữ tuỳ chọn trừ khi người chơi đổi.
- `game-setup`: "Chọn tuỳ chọn luật" hiện ghi chú của từng giá trị khi game có.

## Ngoài phạm vi

- Đổi tuỳ chọn giữa ván. Người chơi vẫn về màn bắt đầu ván như hiện nay.
- Đổi số người chơi hay số ghế của phòng: phòng giữ số ghế lúc tạo.
- Bỏ phiếu hay hỏi ý cả phòng trước khi đổi: người bấm trước quyết, như "Chơi lại".
- Tin hệ thống trong khung chat ("Minh đổi sang Chợ đêm"): chat chưa có loại tin này. Thay vào đó, dòng trạng thái và chip luật báo cho cả phòng.
- Nút "Chơi lại" trong khung chat vẫn giữ tuỳ chọn cũ.

## Impact

- `packages/protocol`: thông điệp `rematch` có thêm `options` tuỳ chọn; client cũ không gửi thì như trước.
- `apps/web/src/server/room-service.ts`: `rematch` nhận tuỳ chọn và kiểm bằng `parseGameOptions`.
- `apps/web/src/transport`: `requestNewGame(options?)` ở cả transport cùng máy và online.
- `packages/ui`: `RadioGroup` có thêm dạng lưới và dòng ghi chú cho từng lựa chọn.
- `apps/web/src/features`:
  - tách nhóm tuỳ chọn khỏi `SetupScreen` thành `OptionFields`, dùng chung với hộp đổi tuỳ chọn mới;
  - thẻ kết quả của `PlayScreen` có hai nút mới;
  - `use-option-labels` có thêm ghi chú và tên nút.
- `apps/web/src/games/types.ts`: `GameUI` có thêm hook gợi ý tuỳ chọn ván sau, không bắt buộc.
- `apps/web/messages/{vi,en,ja}.json`: thêm chữ chung và khoá `options.change` / `options.next` / `options.hints` của Cờ caro và Đội gom thạch.
- Không thêm thư viện. Không chạm bất biến nào: tên nút, gợi ý và ghi chú do từng game khai báo trong thư mục của game và bản dịch, phần dùng chung không biết mã game nào.
