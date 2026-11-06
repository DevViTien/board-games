# Spec Delta

## ADDED Requirements

### Requirement: Lối vào Hộp công cụ

Menu SHALL có một liên kết tới Hộp công cụ, nằm trong phần đầu trang, phía trên danh sách game, để người dùng trên điện thoại thấy mà không phải cuộn qua các thẻ game.

#### Scenario: Mở từ menu

- **WHEN** người dùng chọn "Hộp công cụ" trên menu
- **THEN** trang `/tools` mở ra

#### Scenario: Thấy ngay trên điện thoại

- **WHEN** người dùng mở menu ở khung 390 × 844
- **THEN** liên kết "Hộp công cụ" nằm trong màn hình mà không cần cuộn
