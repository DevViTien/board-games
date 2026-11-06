# Proposal

## Why

Nhóm bạn chơi bài ngoài đời thường ghi điểm bằng giấy hay ghi chú trên điện thoại: mỗi ván phải tự cộng, dễ sai, không biết ngay ai đang hơn ai, và cuối buổi phải tính lại ai chuyển cho ai. Người dùng muốn app có một **Hộp công cụ** để phục vụ những buổi chơi như vậy, trước hết là công cụ **ghi điểm đánh bài**.

Change này nằm ngoài các mốc M0–M8 và chưa có trong `plan.md` §6.3, nên thêm một dòng v1 cho nó, và thêm quyết định 18 vào `idea.md` §9, vì app từ nay không chỉ gồm game.

## What Changes

- **Hộp công cụ** (`/tools`): trang liệt kê các công cụ, có lối vào từ menu chính. Hiện có một công cụ; thêm công cụ sau không phải sửa phần dùng chung.
- **Ghi điểm đánh bài** (`/tools/card-score`):
  - **Nhóm**: tên nhóm (không bắt buộc), 2–8 người chơi, tên không trùng nhau. Sửa được khi đang chơi: đổi tên, thêm người, cho người nghỉ rồi chơi lại mà không mất điểm đã có.
  - **Nhập ván**: mỗi ván một màn hình nhập, số nguyên, âm hoặc dương. Trên điện thoại có bàn số riêng với nút ± và nút lưu trong tầm ngón cái, vì bàn phím số của iPhone không có dấu trừ; đổi được sang bàn phím của máy bất cứ lúc nào.
  - **Tự tính người còn lại**: để trống đúng một người thì người đó được tính để tổng bằng 0; người để trống là ai cũng được, không nhất thiết người cuối danh sách. Điền đủ mà tổng lệch thì không lưu được và app nói lệch bao nhiêu.
  - **Sửa và xoá ván đã lưu**: nhập nhầm là chuyện thường, mọi con số tự tính lại.
  - **Tổng kết**: xếp hạng theo tổng điểm, số ván nhất của từng người, lịch sử từng ván, và gợi ý **cân điểm** (ai chuyển cho ai bao nhiêu điểm, số lần chuyển ít).
  - **Chia sẻ tổng kết** thành chữ qua bảng chia sẻ của máy hoặc sao chép, để gửi vào nhóm chat.
  - **Buổi mới**: tạo nhóm mới từ tên và danh sách người của nhóm cũ, nhóm cũ giữ nguyên.
- **Dữ liệu chỉ nằm trên trình duyệt của máy đang nhập** (IndexedDB). Không gửi lên server, không tốn Redis. Đã mở công cụ rồi thì mất mạng vẫn dùng đủ mọi màn hình của nó. Trang nói rõ điều này. Người dùng mô tả một người nhập điểm, nên một thiết bị là đủ; người khác xem bằng bản tổng kết được chia sẻ.
- **Thanh trên cùng** của các màn hình con có lối về màn hình cha thay cho "← Về menu".

## Ngoài phạm vi

- **Đồng bộ nhiều máy, xem trực tiếp qua link**: cần server, Redis và giao thức mới; để sau nếu dùng thật thấy cần.
- **Game có tổng mỗi ván khác 0** (kiểu cộng dồn điểm phạt, điểm thấp là thắng): yêu cầu chỉ nói tới tổng bằng 0. Thêm một cách tính thứ hai kéo theo nhánh ở tự tính, cân điểm, xếp hạng và một lựa chọn lúc tạo nhóm; thêm sau được mà không phá dữ liệu cũ.
- **Thống kê sâu hơn** (ván cao nhất, thấp nhất, biểu đồ diễn biến): chỉ giữ số ván nhất.
- **Quy đổi ra tiền**: công cụ chỉ ghi điểm, không có đơn vị tiền tệ hay chức năng thanh toán.
- **Sao lưu ra file và khôi phục**: làm sau; rủi ro mất dữ liệu ghi ở `design.md`.
- **Trạng thái "kết thúc buổi"**: nhóm luôn nhập tiếp được; hết buổi thì chia sẻ tổng kết và dùng "Buổi mới" khi chơi lại.
- **Mẫu luật tính điểm theo từng game bài**, **điểm lẻ thập phân**.
- **Nút "vắng ván này"**: người ngồi ngoài một ván được nhập 0; người nghỉ lâu thì "Cho nghỉ".
- **Chạy offline khi tải lại trang**: app chưa có PWA, nằm ở kế hoạch riêng.

## Capabilities

### New Capabilities

- `toolbox`: trang Hộp công cụ, danh sách công cụ và điều kiện để thêm một công cụ.
- `card-score`: ghi điểm đánh bài: nhóm, nhập ván, tự tính, tổng kết, cân điểm, chia sẻ, lưu trên trình duyệt.

### Modified Capabilities

- `game-menu`: thêm requirement "Lối vào Hộp công cụ".
- `accessibility`: "Thanh trên cùng luôn thấy": màn hình con của Hộp công cụ có lối về màn hình cha thay cho "← Về menu".

## Bất biến

Không đổi bất biến nào. Công cụ không phải game: không có `GameDefinition`, không đi qua transport, protocol hay server; "server là trọng tài" không áp dụng vì không có gì đi qua server. Change **thêm một bất biến** vào `openspec/config.yaml`: thêm một công cụ chỉ gồm thư mục `apps/web/src/tools/<id>/`, route, bản dịch và một dòng `TOOLS`; công cụ không sửa `engine`, `games`, `protocol`, `server`, và không dùng dịch vụ ngoài khi chưa có quyết định ghi vào `idea.md`.

## Impact

- **Mới**: `apps/web/src/tools/`, `apps/web/src/features/toolbox/`, các route `apps/web/src/app/tools/**`.
- **Sửa nhỏ**:
  - `AppTopBar`, `AppStateScreen`: thêm prop lối về.
  - `MenuPage`: thêm lối vào.
  - `packages/ui`: export `DialogFrame`, sửa nhánh trình duyệt tự đóng dialog, thêm icon.
  - `packages/config/eslint`: thêm ranh giới cho `src/tools/**`.
  - `config/storage-keys.ts`, `messages/{vi,en,ja}.json`.
- **Không đổi**: `packages/engine`, `packages/games`, `packages/protocol`, `apps/web/src/server`, `apps/web/src/transport`. Không thêm thư viện: `idb-keyval`, `zod` đã có.
- **Tài liệu**: `idea.md`, `plan.md`, `README.md`, `openspec/config.yaml`.
