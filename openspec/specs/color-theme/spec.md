# color-theme Specification

## Purpose

Giao diện sáng, tối hoặc theo hệ thống của toàn ứng dụng: người chơi chọn ở thanh trên cùng, lựa chọn được nhớ trên trình duyệt và áp dụng ngay từ lần tải trang đầu, không nháy màu.

## Requirements

### Requirement: Chọn giao diện sáng hoặc tối

Thanh trên cùng của mọi trang SHALL có nút "Giao diện" (icon theo lựa chọn hiện tại, tên đọc được nêu lựa chọn đó) mở menu thả xuống gồm "Sáng", "Tối" và "Theo hệ thống" (mặc định), đánh dấu lựa chọn đang chọn, dùng được bằng bàn phím, chuột và chạm, và nằm trong màn hình ở khung 360 px. Chọn "Sáng" hoặc "Tối" SHALL đổi giao diện ngay, không tải lại trang; "Theo hệ thống" SHALL theo cài đặt sáng/tối của hệ điều hành, kể cả khi cài đặt đó đổi lúc trang đang mở.

#### Scenario: Chọn giao diện tối

- **WHEN** hệ điều hành đang ở chế độ sáng và người chơi chọn "Tối" ở menu
- **THEN** trang hiện giao diện tối ngay, không tải lại trang

#### Scenario: Theo hệ thống

- **WHEN** người chơi chọn "Theo hệ thống" và hệ điều hành chuyển sang chế độ tối
- **THEN** trang hiện giao diện tối

#### Scenario: Chọn bằng bàn phím

- **WHEN** người chơi dùng Tab tới nút "Giao diện", nhấn Enter, nhấn mũi tên xuống rồi Enter
- **THEN** menu mở với tiêu điểm ở lựa chọn đang chọn, lựa chọn kế tiếp được chọn, giao diện đổi theo, menu đóng và tiêu điểm về nút
- **AND** trình đọc màn hình đọc được lựa chọn đang chọn trong tên của nút

#### Scenario: Tên của nút

- **WHEN** người chơi chưa từng chọn giao diện và trình đọc màn hình tới nút "Giao diện"
- **THEN** nút có tên "Giao diện: Theo hệ thống" và cho biết nó mở một menu

#### Scenario: Đóng bằng Escape

- **WHEN** menu "Giao diện" đang mở và người chơi nhấn Escape
- **THEN** menu đóng, giao diện không đổi và tiêu điểm về nút "Giao diện"

#### Scenario: Bấm ra ngoài

- **WHEN** menu "Giao diện" đang mở và người chơi bấm vào chỗ khác của trang
- **THEN** menu đóng và giao diện không đổi

#### Scenario: Chạm trên điện thoại nhỏ

- **WHEN** người chơi chạm nút "Giao diện" ở khung 360 × 740 rồi chạm "Tối"
- **THEN** menu nằm trọn trong màn hình, mỗi lựa chọn cao ít nhất 44 px, và trang hiện giao diện tối

#### Scenario: Đổi giao diện khi đang chơi online

- **WHEN** người chơi đang chơi Cờ caro online, chọn "Tối" bằng nút "Giao diện" trên thanh của màn hình chơi, rồi đối thủ đi một nước
- **THEN** trang hiện giao diện tối ngay, ván vẫn như trước, người chơi vẫn ở đúng ghế và nước của đối thủ hiện trên bàn

#### Scenario: Có trên mọi trang

- **WHEN** người chơi mở lần lượt màn hình bắt đầu ván, màn hình chơi, sảnh chờ của một phòng, trang luật và một trang không tìm thấy
- **THEN** thanh trên cùng của mỗi trang có nút "Giao diện"

### Requirement: Nhớ giao diện đã chọn

Lựa chọn "Sáng" hoặc "Tối" SHALL được nhớ trên trình duyệt ít nhất một năm và áp dụng cho mọi trang của app ngay từ lần hiển thị đầu tiên, không thoáng hiện giao diện kia trước. Chọn "Theo hệ thống" SHALL xoá lựa chọn đã nhớ. Lựa chọn đã nhớ không đọc được MUST được coi như "Theo hệ thống", không báo lỗi.

#### Scenario: Giữ giao diện sau khi tải lại

- **WHEN** hệ điều hành ở chế độ sáng, người chơi đã chọn "Tối" rồi mở trang chơi Tic-tac-toe trong một lượt truy cập mới
- **THEN** trang hiện giao diện tối ngay từ lần hiển thị đầu tiên

#### Scenario: Lựa chọn đã nhớ hỏng

- **WHEN** giá trị giao diện đã nhớ trên trình duyệt không phải "Sáng" hay "Tối" và hệ điều hành ở chế độ tối
- **THEN** trang hiện giao diện tối theo hệ thống, không có thông báo lỗi
