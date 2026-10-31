# Proposal

## Why

Đấu với máy là một trong ba cách chơi cốt lõi (idea.md §1) nhưng engine chưa có AI, và Tic-tac-toe đang khai báo không hỗ trợ đấu với máy. Cần một AI dùng chung cho mọi game hai người có hàm đánh giá, chạy được trong Web Worker và có nhiều mức độ, để change `add-play-vs-ai` chỉ việc nối nó vào giao diện, và caro (M5) chủ yếu chỉ cần thêm hàm đánh giá (nếu đo thấy chậm trên bàn lớn thì thêm một hook tuỳ chọn để chọn nước ứng viên, xem design "Risks"). Thuộc mốc **M2. AI** (plan.md §6.1).

## What Changes

- Thêm **AI dùng chung** trong `packages/engine`: chọn một nước đi hợp lệ cho người đang đến lượt bằng tìm kiếm minimax có cắt tỉa alpha-beta, đào sâu dần trong một **giới hạn thời gian** do nơi gọi đặt; tính kỳ vọng theo trọng số ở các nước có yếu tố ngẫu nhiên (expectimax), để game xúc xắc dùng lại được.
- **Ba mức độ** Dễ / Vừa / Khó, định nghĩa chung cho mọi game: Khó tìm sâu nhất có thể trong thời gian cho phép; Vừa luôn chớp nước thắng ngay và chặn nước thua ngay; Dễ đôi khi đi nước ngẫu nhiên nên người chơi thắng được. Phần nhìn trước tối thiểu của mỗi mức (Vừa và Khó: hai nước) luôn được làm xong kể cả khi hết giờ, nên mức độ không phụ thuộc máy nhanh hay chậm.
- AI **tái lập được**: mọi lựa chọn ngẫu nhiên (chọn giữa các nước ngang điểm, nước ngẫu nhiên của mức Dễ) đi qua rng được truyền vào; đồng hồ cũng được truyền vào, nên test không phụ thuộc thời gian thật. Các nước ngang điểm được xác định chính xác dù có cắt tỉa, nên nước thua không bao giờ lẫn vào nhóm được chọn ngẫu nhiên.
- Ghi rõ **thang điểm của `evaluate`** trong hợp đồng game (số hữu hạn, nên là số nguyên, trị tuyệt đối dưới 10^8; mọi chênh lệch đều được coi là thật), để hàm đánh giá của caro không bị kẹp phẳng.
- **Tic-tac-toe hỗ trợ đấu với máy**: thêm hàm đánh giá thế cờ, khai báo `supportsAI: true`; máy mức Khó không bao giờ thua.
- Thêm mã lỗi `ai-not-supported` khi gọi AI cho game không hỗ trợ.

## Capabilities

### New Capabilities

- `game-ai`: chọn nước đi cho máy — nước đi hợp lệ, ba mức độ, giới hạn thời gian kèm phần nhìn trước tối thiểu, tái lập được theo rng, kỳ vọng theo trọng số ở nước ngẫu nhiên, từ chối game không hỗ trợ.

### Modified Capabilities

- `tictactoe`: requirement "Bàn và người chơi" đổi từ "không hỗ trợ đấu với máy ở thời điểm này" sang hỗ trợ đấu với máy; thêm requirement máy mức Khó không thua.

## Ngoài phạm vi

- Web Worker, ghế do máy điều khiển, màn hình bắt đầu ván, lưu ván với máy: change `add-play-vs-ai`.
- AI cho game nhiều hơn hai người và AI theo luật ưu tiên (`policy`) cho cá ngựa: M6.
- Bảng băm vị trí (transposition table), sắp xếp nước đi theo lịch sử, sách khai cuộc, hook chọn nước ứng viên trong `GameDefinition`: thêm khi caro (M5) đo thấy cần tốc độ.
- AI cờ vua: sau MVP (idea.md §9, quyết định 7).

## Impact

- **Code**: `packages/engine/src/ai/` (mới), `packages/engine/src/errors.ts` (thêm một mã), `packages/engine/src/types.ts` (chỉ chú thích hợp đồng thang điểm của `evaluate`), `packages/engine/src/index.ts` (xuất API AI), `packages/engine/src/outcome-weights.ts` (kiểm trọng số `outcomes`, dùng chung cho `session` và AI), `packages/engine/src/test-fixtures/` (game giả cho AI), `packages/engine/src/testing/clocks.ts` (đồng hồ giả, xuất qua `@board-games/engine/testing`); `packages/games/src/tictactoe/rules.ts` (thêm `evaluate`, `supportsAI: true`) và test.
- **Phụ thuộc**: không thêm thư viện.
- **Bất biến**: AI là hàm thuần như luật — không gọi `Math.random`, `Date.now` hay `performance.now` trực tiếp; rng và đồng hồ do nơi gọi truyền vào (Worker truyền `() => performance.now()`). Không nới bất biến nào.
- **Tài liệu**: plan.md §3.3 dòng AI cập nhật trong task cuối.
