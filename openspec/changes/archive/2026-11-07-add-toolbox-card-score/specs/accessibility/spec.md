# Spec Delta

## MODIFIED Requirements

### Requirement: Thanh trên cùng luôn thấy

Mọi trang (menu, Hộp công cụ, bắt đầu ván, màn hình chơi mọi game kể cả online, sảnh chờ và lỗi phòng, trang luật, các trang không tìm thấy, lỗi, đang tải) SHALL có thanh trên cùng luôn nằm ở mép trên màn hình khi cuộn, nền không trong suốt, nằm trong vùng an toàn, có lối "← Về menu" (trừ menu; màn hình con của Hộp công cụ về màn hình cha) và hai nút chọn giao diện, ngôn ngữ. Phần tử nhận tiêu điểm MUST NOT bị thanh che. Bố cục không cuộn của màn hình chơi SHALL vẫn đúng với thanh này.

#### Scenario: Cuộn trang luật

- **WHEN** người chơi cuộn trang luật Cờ vua xuống cuối ở khung 390 × 844
- **THEN** thanh trên cùng vẫn ở mép trên màn hình với lối "← Về menu", nút "Giao diện" và nút "Ngôn ngữ"

#### Scenario: Cuộn menu bằng Tab

- **WHEN** người chơi dùng Tab tới liên kết cuối của menu ở khung 360 × 740
- **THEN** liên kết đó nằm trọn trong màn hình, không bị thanh trên che

#### Scenario: Màn hình chơi vẫn không cần cuộn

- **WHEN** người chơi mở ván Cờ cá ngựa 4 người cùng máy ở khung 1280 × 800
- **THEN** thanh trên, bàn, dòng lượt, bảng người chơi và các nút nằm trong màn hình mà không cần cuộn

#### Scenario: Trang không tìm thấy

- **WHEN** người chơi mở một đường dẫn không có
- **THEN** trang có thanh trên cùng với lối "← Về menu"

#### Scenario: Trang con của Hộp công cụ

- **WHEN** người dùng mở bảng điểm của một nhóm ở trang `/tools/card-score/<id>`
- **THEN** thanh trên cùng có lối về danh sách nhóm, nút "Giao diện" và nút "Ngôn ngữ"
