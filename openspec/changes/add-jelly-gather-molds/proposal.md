# Proposal

## Why

Người dùng xem video của Jelly Is Sticky và thấy có màn chỉ qua khi đưa thạch vào đúng chỗ. Họ muốn Gom thạch có loại màn này. Người dùng cũng muốn tận dụng map công khai trên mạng. Kết quả tìm hiểu ở `design.md` §1; các lựa chọn dưới đây người dùng đã chốt (12/11/2026):

- **Ô đích của game gốc:** một thread trên Steam nói ô đích phải được thạch phủ kín, và phải có đủ thạch để phủ. Các chi tiết khác không nguồn nào ghi. Luật dưới đây là **luật tự thiết kế**: khuôn có màu, **vừa khít khuôn**.
- **Map của game gốc** là tài sản của Lunarch Studios. Không có bộ map công khai chính thức nào; màn người chơi tự làm chỉ được chia sẻ qua một Discord của cộng đồng, không ghi điều khoản. **Không dùng.**
- **Map Sokoban công khai có giấy phép rõ**: Boxoban của DeepMind, Apache 2.0. Người dùng chọn thêm **một chương lấy từ Boxoban**, bên cạnh chương khuôn tự thiết kế.

Change nối tiếp `add-jelly-gather-puzzle`, nằm ngoài các mốc M0–M8. Nó phải được archive **sau** `add-jelly-gather-puzzle`, vì sửa spec `jelly-gather` mà change đó tạo ra.

## What Changes

- **Khuôn** (ô đích): một ô sàn có màu của một loại khối (dâu, lá dứa, xoài, khoai môn, dừa, hay đá viên), vẽ như khuôn rau câu trên khay. Nhân vật và khối đi qua khuôn như sàn thường.
- **Màn khuôn** qua khi **vừa khít khuôn**: mỗi loại có khuôn có đúng bằng số ô khuôn (kiểm khi đọc màn), và mọi ô khuôn có một ô khối đúng loại nằm lên. Như vậy mọi ô của loại đó đều nằm trong khuôn.

  Loại không có khuôn thì không bị đòi gì. Màn khuôn không đòi gom mỗi màu thành một khối. Màn không có khuôn vẫn qua theo luật gom như cũ.

- **Chương 4 "Khuôn"**, 8 màn tự thiết kế, mỗi màn được bộ giải chứng minh số bước ít nhất. Màn 4-1 có gợi ý. Các màn sau trộn khuôn với sương sáo, đá viên, thạch dừa.
- **Chương 5 "Kho đá"**, 8 màn lấy từ bộ Boxoban "hard":
  - hộp thành đá viên, ô đích thành khuôn đá;
  - chỉ lấy màn mà luật đẩy dây chuyền của Gom thạch không làm ngắn lời giải so với luật Sokoban, và (kiểm khi chọn) không gỡ được thế bí nào của luật Sokoban;
  - ghi công và giấy phép Apache 2.0 trong `/third-party-licenses.txt` và ngay trên danh sách màn;
  - màn 5-1 có gợi ý.
- **Tiến độ khuôn:** màn hình chơi hiện số ô khuôn đã vừa trên tổng số (ví dụ "Khuôn 3/8"). Lời báo và mô tả bàn cho trình đọc màn hình nói tới khuôn.
- **Tổng số màn 24 → 40**, 5 chương. Tiến độ đã lưu của 24 màn cũ giữ nguyên.

## Ngoài phạm vi

- **Khuôn không màu** (thạch nào cũng được), **khuôn cho sương sáo**: người dùng chọn khuôn có màu.
- **Đổi luật đá viên cho chương 5** (không cho đẩy hai viên một lúc như Sokoban): sẽ đổi cả 24 màn đã có. Thay vào đó, chọn màn mà luật hiện tại không làm dễ đi.
- **Nhập cả bộ Boxoban, hay màn của người chơi**: chỉ 8 màn được chọn và kiểm.
- **Trình tạo màn, gợi ý từng bước, xem lời giải**: như change trước.
- **Màn của Jelly Is Sticky**: không dùng, vì là tài sản của Lunarch Studios.

## Capabilities

### New Capabilities

Không có.

### Modified Capabilities

- `jelly-gather`:
  - thêm requirement "Khuôn" và "Màn từ bộ Boxoban";
  - sửa "Bàn của một màn", "Qua màn", "Các màn chơi", "Gợi ý ở màn mở đầu cơ chế", "Đọc được bàn và kết quả mỗi bước", "Danh sách màn", "Đá viên", "Đường dẫn của màn", "Khi giải xong màn", để có khuôn, 5 chương và 40 màn.
- `game-menu`: "Thẻ trò giải đố trên menu" (40 màn); "Giấy phép bên thứ ba" (có ghi công Boxoban).

## Bất biến

- **Không đổi bất biến nào.** Màn và luật vẫn nằm trong `apps/web/src/puzzles/jelly-gather/`; luật vẫn là hàm thuần.
- **Nội dung bên thứ ba:** đây là lần đầu app dùng màn chơi của bên thứ ba. Theo luật của skill `board-games-ui` cho tài sản bên thứ ba, cần:
  - quyết định của người dùng: đã có, ghi ở đây và ở `idea.md` (quyết định 20);
  - kiểm giấy phép: Apache 2.0, cho phép dùng, sửa và phân phối, kể cả trong sản phẩm phi thương mại, miễn kèm giấy phép và ghi rõ đã sửa gì;
  - ghi nguồn kèm SHA (`google-deepmind/boxoban-levels@78011d8c86ad423bfb2e1005012393b4c3c24409`, file `hard/000.txt`, số thứ tự từng màn);
  - một mục trong `apps/web/public/third-party-licenses.txt`.

  Màn được **chuyển đổi** (hộp thành đá viên, ô đích thành khuôn đá), nên không giữ được "file nguyên vẹn". Bản chép nguyên văn từng màn nằm trong comment của `levels.ts`, cạnh bản đã chuyển, để thấy rõ đã đổi gì.

## Impact

- **Sửa trong `apps/web/src/puzzles/jelly-gather/`:**
  - `rules/` (khuôn trong `Level`, luật qua màn, `outcome` có tiến độ khuôn), `parse-level.ts` (lớp khuôn);
  - `levels.ts`, `levels.solutions.ts`, `levels.test.ts` (16 màn mới);
  - `solver.ts` (tuỳ chọn luật Sokoban, chỉ để test chứng minh chương 5);
  - `pieces.tsx`, `Board.tsx`, `PlayLevel.tsx`, `LevelList.tsx`, `say.ts`, `theme.css`.
- **Khác:** `messages/{vi,en,ja}.json`, `public/third-party-licenses.txt`, E2E, `ui-shots`.
- **Không đổi:** phần dùng chung, `packages/*`, server. Không thêm thư viện, không thêm dịch vụ.
- **Tài liệu:** `idea.md` (§4.5, quyết định 20), `plan.md` (§10), `README.md`.
