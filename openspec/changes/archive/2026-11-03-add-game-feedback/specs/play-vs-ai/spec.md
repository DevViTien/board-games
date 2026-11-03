## ADDED Requirements

### Requirement: Tín hiệu máy đang nghĩ

Trong lúc máy nghĩ, ngoài dòng lượt "Máy đang nghĩ…", ghế của máy trong bảng người chơi SHALL ghi "Đang nghĩ…" và bàn SHALL được báo là đang bận cho trình đọc màn hình. Dấu chuyển động đi kèm MUST dừng khi hệ thống bật giảm chuyển động. Khi máy đi xong, các tín hiệu này SHALL biến mất.

#### Scenario: Máy đang nghĩ

- **WHEN** người chơi đặt quân trong ván Cờ caro đấu với máy và máy chưa đi
- **THEN** ghế của máy ghi "Đang nghĩ…" và bàn được báo là đang bận

#### Scenario: Máy đi xong

- **WHEN** máy đặt quân và lại đến lượt người chơi
- **THEN** ghế của máy không còn ghi "Đang nghĩ…" và bàn không còn được báo là đang bận
