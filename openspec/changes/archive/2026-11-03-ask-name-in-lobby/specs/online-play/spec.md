## MODIFIED Requirements

### Requirement: Mở trang phòng

Hệ thống SHALL mở trang phòng tại `/room/<mã phòng>`. Mã phòng viết thường SHALL được chuyển sang dạng chuẩn viết hoa; mã sai định dạng MUST hiện trang "không tìm thấy". Trang phòng SHALL vào phòng với danh tính đã nhớ (capability `player-identity`), hoặc chưa kèm tên khi trình duyệt chưa nhớ tên nào, và hiện "Đang vào phòng…" cho tới khi nhận được trạng thái phòng. Quá 10 giây chưa vào được, trang SHALL báo chưa kết nối được máy chủ và có lối về menu, trong khi vẫn tiếp tục thử.

#### Scenario: Mở link mời

- **WHEN** người chơi đã có tên tạm mở link mời của một phòng Tic-tac-toe chỉ có người tạo
- **THEN** trang phòng hiện sảnh chờ có tên người tạo ở ghế đầu tiên và nút "Vào chơi"

#### Scenario: Mở link mời khi chưa có tên

- **WHEN** người chơi chưa từng nhập tên tạm mở link mời của một phòng Tic-tac-toe chỉ có người tạo
- **THEN** trang phòng hiện sảnh chờ có tên người tạo ở ghế đầu tiên, ô tên tạm trống và nút "Vào chơi"

#### Scenario: Mã phòng viết thường trên đường dẫn

- **WHEN** người chơi mở `/room/abc234`
- **THEN** đường dẫn chuyển thành `/room/ABC234` và trang phòng `ABC234` mở ra

#### Scenario: Mã phòng sai định dạng

- **WHEN** người chơi mở `/room/khong-phai-ma`
- **THEN** trang "không tìm thấy" hiện ra kèm lối về menu

#### Scenario: Đang vào phòng

- **WHEN** người chơi mở link phòng và server chưa trả lời
- **THEN** trang hiện "Đang vào phòng…"

#### Scenario: Không kết nối được máy chủ

- **WHEN** người chơi mở link phòng và sau 10 giây vẫn chưa kết nối được máy chủ
- **THEN** trang báo chưa kết nối được máy chủ và có lối về menu
