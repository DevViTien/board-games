# Spec Delta

## ADDED Requirements

### Requirement: Vào phòng bằng mã

Menu SHALL có ô "Vào phòng" để nhập mã phòng online. Mã đúng định dạng (6 ký tự, không phân biệt chữ hoa chữ thường, bỏ khoảng trắng hai đầu) SHALL mở trang phòng của mã đó. Mã sai định dạng MUST bị báo lỗi ngay tại ô nhập, ô nhập SHALL nhận lại focus để trình đọc màn hình đọc lời báo, và người chơi MUST ở lại menu. Ô "Vào phòng" SHALL nằm trong một mục riêng của menu có tiêu đề.

#### Scenario: Nhập mã phòng

- **WHEN** người chơi nhập `abc234` kèm khoảng trắng ở hai đầu vào ô "Vào phòng" trên menu và xác nhận
- **THEN** trang phòng `/room/ABC234` mở ra

#### Scenario: Mã sai định dạng

- **WHEN** người chơi nhập `12` vào ô "Vào phòng" và xác nhận
- **THEN** menu báo mã phòng không hợp lệ ngay tại ô, ô mã phòng có focus và người chơi vẫn ở menu
