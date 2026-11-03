## ADDED Requirements

### Requirement: Chọn giao diện sáng hoặc tối

Thanh trên của menu SHALL có nhóm lựa chọn "Giao diện" gồm "Sáng", "Tối" và "Theo hệ thống" (mặc định), chọn được bằng bàn phím và cho biết lựa chọn đang chọn. Chọn "Sáng" hoặc "Tối" SHALL đổi giao diện ngay, không tải lại trang; "Theo hệ thống" SHALL theo cài đặt sáng/tối của hệ điều hành, kể cả khi cài đặt đó đổi lúc trang đang mở.

#### Scenario: Chọn giao diện tối

- **WHEN** hệ điều hành đang ở chế độ sáng và người chơi chọn "Tối" ở menu
- **THEN** trang hiện giao diện tối ngay, không tải lại trang

#### Scenario: Theo hệ thống

- **WHEN** người chơi chọn "Theo hệ thống" và hệ điều hành chuyển sang chế độ tối
- **THEN** trang hiện giao diện tối

#### Scenario: Chọn bằng bàn phím

- **WHEN** người chơi dùng Tab tới nhóm "Giao diện" và nhấn phím mũi tên
- **THEN** lựa chọn kế tiếp được chọn, giao diện đổi theo và trình đọc màn hình đọc được lựa chọn đang chọn

### Requirement: Nhớ giao diện đã chọn

Lựa chọn "Sáng" hoặc "Tối" SHALL được nhớ trên trình duyệt ít nhất một năm và áp dụng cho mọi trang của app ngay từ lần hiển thị đầu tiên, không thoáng hiện giao diện kia trước. Chọn "Theo hệ thống" SHALL xoá lựa chọn đã nhớ. Lựa chọn đã nhớ không đọc được MUST được coi như "Theo hệ thống", không báo lỗi.

#### Scenario: Giữ giao diện sau khi tải lại

- **WHEN** hệ điều hành ở chế độ sáng, người chơi đã chọn "Tối" rồi mở trang chơi Tic-tac-toe trong một lượt truy cập mới
- **THEN** trang hiện giao diện tối ngay từ lần hiển thị đầu tiên

#### Scenario: Lựa chọn đã nhớ hỏng

- **WHEN** giá trị giao diện đã nhớ trên trình duyệt không phải "Sáng" hay "Tối" và hệ điều hành ở chế độ tối
- **THEN** trang hiện giao diện tối theo hệ thống, không có thông báo lỗi
