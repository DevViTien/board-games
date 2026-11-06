# Spec Delta

## Purpose

Trang Hộp công cụ: tập hợp các công cụ hỗ trợ những buổi chơi game ngoài đời, tách khỏi danh sách game của menu.

## ADDED Requirements

### Requirement: Trang Hộp công cụ

Trang `/tools` SHALL liệt kê mọi công cụ đang có, mỗi công cụ có hình minh hoạ, tên, một câu mô tả và một liên kết mở công cụ, bằng ngôn ngữ đang dùng.

#### Scenario: Mở Hộp công cụ

- **WHEN** người dùng mở `/tools` bằng tiếng Việt
- **THEN** trang có tiêu đề "Hộp công cụ" và một thẻ "Ghi điểm đánh bài" có liên kết mở `/tools/card-score`

#### Scenario: Trang bằng ngôn ngữ khác

- **WHEN** người dùng mở `/tools` bằng tiếng Nhật
- **THEN** tiêu đề, tên và mô tả công cụ hiện bằng tiếng Nhật

### Requirement: Thêm công cụ không sửa phần dùng chung

Danh sách công cụ SHALL sinh từ một danh sách đăng ký; trang Hộp công cụ MUST NOT có nhánh riêng theo từng công cụ.

#### Scenario: Công cụ mới

- **WHEN** danh sách đăng ký có thêm một công cụ thử nghiệm kèm hình và bản dịch
- **THEN** trang Hộp công cụ hiện thêm một thẻ cho công cụ đó mà không phải sửa component của trang
