# Proposal

## Why

Mọi game (caro, cá ngựa, cờ vua…) và mọi chế độ chơi (cùng máy, với máy, online) đều cần chung một cách mô tả luật, kiểm tra nước đi, lưu lịch sử và phát lại ván. `packages/engine` hiện chỉ là khung rỗng; cần dựng phần lõi này trước để game đầu tiên (Tic-tac-toe, change `add-tictactoe-game`) và mọi game sau chỉ việc cài luật mà không phải đụng tới phần dùng chung. Thuộc mốc **M1. Engine + game mẫu cùng máy** (plan.md §6.1).

## What Changes

- Thêm **hợp đồng game** trong `packages/engine`: mỗi game khai báo metadata (số người, thể loại, thời lượng, có hỗ trợ AI không), tuỳ chọn luật mặc định và cách kiểm tra tuỳ chọn nhận từ bên ngoài, cùng các hàm luật thuần: tạo ván, người đang đến lượt, nước đi hợp lệ, các kết quả ngẫu nhiên có thể của một nước (kèm trọng số), áp dụng nước đi, kết quả ván (thắng hoặc hoà, kèm mã lý do tuỳ chọn).
- Thêm **phiên chơi (session)**: chỉ nhận nước đi hợp lệ (từ chối bằng mã lỗi, không bằng chữ), lưu đúng nước hợp lệ của luật thay cho dữ liệu nhận vào, lưu lịch sử, hoàn tác, làm lại. Phiên là dữ liệu thuần, chuyển JSON được.
- Thêm **biên bản ván**: một ván được ghi thành danh sách nước đi kèm kết quả ngẫu nhiên đã chốt, chuyển JSON được; dựng lại đúng trạng thái từ biên bản và kiểm tra kỹ mọi phần của biên bản vì đó là dữ liệu không tin cậy (IndexedDB, mạng, Redis).
- **Ngẫu nhiên**: game liệt kê các kết quả có thể; engine chọn một kết quả bằng bộ sinh ngẫu nhiên do nơi gọi truyền vào ở mỗi nước đi, rồi chốt kết quả vào chính nước đi. Phiên và biên bản không lưu trạng thái bộ sinh, nên phát lại, làm lại hay client online không bao giờ gieo lại hoặc đoán trước được xúc xắc. Thêm bộ sinh có seed (mulberry32) cho test và AI.
- Thêm **bộ kiểm tra hợp đồng chung** (`describeGameContract`) mà mọi game phải vượt: tự chơi nhiều ván ngẫu nhiên, kiểm tra không mutate state, luật tất định, trạng thái là dữ liệu thuần, ván luôn kết thúc, biên bản chuyển JSON rồi dựng lại cho kết quả như cũ, cùng các kiểm tra phụ; mỗi kiểm tra có một game lỗi chứng minh nó bắt được vi phạm.

## Capabilities

### New Capabilities

- `game-engine`: hợp đồng chung của mọi game và phiên chơi — kiểm tra nước đi, lịch sử, hoàn tác/làm lại, biên bản ván và phát lại, ngẫu nhiên đi qua bộ sinh được truyền vào, bộ kiểm tra hợp đồng mà mọi game phải vượt.

### Modified Capabilities

(không có)

## Ngoài phạm vi

- Game cụ thể, giao diện chơi, menu, autosave vào IndexedDB: thuộc change `add-tictactoe-game`.
- Thuật toán AI (minimax, alpha-beta, expectimax, Web Worker): mốc M2. Hợp đồng chỉ chừa sẵn hàm `evaluate` tuỳ chọn, cờ `supportsAI` và danh sách kết quả ngẫu nhiên có trọng số (dùng được cho expectimax). Chiến lược AI theo luật ưu tiên cho cá ngựa (`policy`) thêm ở M6, là thay đổi chỉ thêm.
- Giao thức online, server trọng tài, `RoomStore`: mốc M4. Engine chỉ đảm bảo luật chạy được ở server, biên bản chuyển JSON được và không lộ bộ sinh ngẫu nhiên.
- Kết thúc ván ngoài luật (đầu hàng, xử thua khi bỏ ván, hết giờ, đồng ý hoà): M4 / v1. Biên bản sẽ thêm loại mục "kết thúc" và kiểu kết quả đã có chỗ cho mã lý do; cả hai là thay đổi chỉ thêm, biên bản cũ vẫn đọc được (design.md, Open Questions).
- Xếp hạng nhì/ba/tư (biến thể cá ngựa #8), phiên bản luật ghi trong biên bản (`rulesVersion`), cấm hoàn tác nước có ngẫu nhiên: hoãn tới khi có game cần; đều thêm được mà không đổi định dạng hiện có (design.md, Open Questions).
- Đồng hồ thời gian: v1.

## Impact

- **Code**: `packages/engine/src/` (types, constants, errors, move-key, options, session, record, rng, testing). `packages/engine/package.json` thêm điểm vào phụ `./testing` cho bộ kiểm tra hợp đồng (chỉ dùng trong test).
- **Phụ thuộc**: không thêm thư viện ngoài; engine vẫn không phụ thuộc React/Next/DOM.
- **Bất biến** (openspec/config.yaml): làm rõ cách thực hiện bất biến "ngẫu nhiên đi qua rng được truyền vào" — rng được truyền vào mỗi lần đi nước và chỉ dùng để chọn một kết quả trong danh sách game khai báo; bước áp dụng nước đi hoàn toàn tất định; phiên và biên bản không lưu trạng thái rng, nên bất biến "xúc xắc do server tạo" giữ được cả khi client nhận biên bản. Ngẫu nhiên lúc tạo ván (ví dụ chọn người đi trước) do nơi gọi quyết định và đưa vào tuỳ chọn luật. Không nới bất biến nào.
- **Tài liệu**: plan.md §3.3, §3.4 và checklist thêm game được cập nhật theo design của change này (task 7.2).
