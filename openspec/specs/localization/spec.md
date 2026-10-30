# localization Specification

## Purpose

Hiển thị toàn bộ giao diện bằng ngôn ngữ của người chơi (tiếng Việt, tiếng Anh, tiếng Nhật), tự chọn theo trình duyệt, cho phép đổi và ghi nhớ lựa chọn, để một link chia sẻ mở ra đúng ngôn ngữ của từng người nhận.

## Requirements

### Requirement: Ngôn ngữ được hỗ trợ

Hệ thống SHALL hiển thị giao diện bằng một trong ba ngôn ngữ: tiếng Việt (`vi`), tiếng Anh (`en`), tiếng Nhật (`ja`). Tiếng Việt SHALL là ngôn ngữ mặc định. Thuộc tính `lang` của trang SHALL khớp với ngôn ngữ đang hiển thị.

#### Scenario: Trang hiển thị bằng ngôn ngữ đang dùng

- **WHEN** người chơi mở trang chủ với ngôn ngữ đang dùng là tiếng Nhật
- **THEN** mọi chữ trên trang hiển thị bằng tiếng Nhật
- **AND** thuộc tính `lang` của trang là `ja`

### Requirement: Chọn ngôn ngữ cho mỗi lượt truy cập

Hệ thống SHALL chọn ngôn ngữ theo thứ tự ưu tiên: (1) ngôn ngữ người chơi đã chọn trước đó trên trình duyệt này; (2) ngôn ngữ ưa thích của trình duyệt, xét theo mức ưu tiên mà trình duyệt khai báo, bỏ qua ngôn ngữ không hỗ trợ và chỉ so phần ngôn ngữ chính (`ja-JP` khớp `ja`); (3) tiếng Việt.

#### Scenario: Lựa chọn đã lưu thắng ngôn ngữ trình duyệt

- **WHEN** người chơi đã chọn tiếng Nhật và trình duyệt ưu tiên tiếng Anh
- **THEN** trang hiển thị bằng tiếng Nhật

#### Scenario: Theo ngôn ngữ trình duyệt khi chưa chọn

- **WHEN** người chơi chưa từng chọn ngôn ngữ và trình duyệt khai báo `ja-JP`
- **THEN** trang hiển thị bằng tiếng Nhật

#### Scenario: Theo mức ưu tiên của trình duyệt chứ không theo thứ tự liệt kê

- **WHEN** trình duyệt khai báo tiếng Anh với mức ưu tiên 0.5 và tiếng Nhật với mức ưu tiên 0.8
- **THEN** trang hiển thị bằng tiếng Nhật

#### Scenario: Bỏ qua ngôn ngữ không hỗ trợ

- **WHEN** trình duyệt khai báo lần lượt tiếng Pháp, tiếng Đức rồi tiếng Anh
- **THEN** trang hiển thị bằng tiếng Anh

#### Scenario: Không có ngôn ngữ nào phù hợp

- **WHEN** người chơi chưa từng chọn ngôn ngữ và trình duyệt chỉ khai báo ngôn ngữ không hỗ trợ
- **THEN** trang hiển thị bằng tiếng Việt

### Requirement: Đổi ngôn ngữ

Hệ thống SHALL cho người chơi đổi ngôn ngữ ngay trên giao diện. Danh sách lựa chọn SHALL ghi tên mỗi ngôn ngữ bằng chính ngôn ngữ đó ("Tiếng Việt", "English", "日本語"). Sau khi chọn, trang SHALL hiển thị lại bằng ngôn ngữ mới mà không cần tải lại thủ công, và lựa chọn SHALL được ghi nhớ trên trình duyệt đó ít nhất một năm.

#### Scenario: Đổi ngôn ngữ có hiệu lực ngay

- **WHEN** người chơi đang xem trang bằng tiếng Việt và chọn "English"
- **THEN** trang hiển thị bằng tiếng Anh
- **AND** thuộc tính `lang` của trang là `en`

#### Scenario: Lựa chọn được giữ sau khi tải lại

- **WHEN** người chơi đã chọn "English" rồi tải lại trang
- **THEN** trang vẫn hiển thị bằng tiếng Anh

#### Scenario: Từ chối ngôn ngữ không hỗ trợ

- **WHEN** có yêu cầu lưu một ngôn ngữ ngoài `vi`, `en`, `ja`
- **THEN** hệ thống từ chối yêu cầu và không thay đổi ngôn ngữ đã lưu

### Requirement: Đường dẫn không chứa ngôn ngữ

Đường dẫn (URL) của ứng dụng MUST NOT chứa mã ngôn ngữ. Cùng một đường dẫn SHALL hiển thị theo ngôn ngữ riêng của từng người mở, để link mời gửi cho bạn bè không ép ngôn ngữ của người gửi lên người nhận.

#### Scenario: Cùng một link, mỗi người một ngôn ngữ

- **WHEN** một người chơi dùng tiếng Việt gửi link trang cho người chơi có trình duyệt tiếng Nhật
- **THEN** người nhận mở link và thấy trang bằng tiếng Nhật

### Requirement: Bản dịch đầy đủ

Mọi chữ hiển thị cho người chơi SHALL có bản dịch ở cả ba ngôn ngữ, với cùng các tham số (số người, số phút, …). Thiếu bản dịch hoặc lệch tham số MUST làm kiểm tra tự động thất bại trước khi phát hành, thay vì để người chơi thấy chữ trống hoặc mã khoá. Số nhiều SHALL theo quy tắc của từng ngôn ngữ.

#### Scenario: Thiếu bản dịch bị chặn

- **WHEN** một câu có trong bản tiếng Việt nhưng thiếu trong bản tiếng Anh
- **THEN** kiểm tra tự động thất bại

#### Scenario: Số nhiều theo ngôn ngữ

- **WHEN** giao diện tiếng Anh hiển thị số người chơi là 1 và là 2
- **THEN** lần lượt hiển thị "1 player" và "2 players"
