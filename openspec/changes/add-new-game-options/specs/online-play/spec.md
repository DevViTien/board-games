## MODIFIED Requirements

### Requirement: Luật của phòng online

Phòng online SHALL dùng tuỳ chọn luật đang chọn ở màn hình bắt đầu ván khi tạo phòng, cho mọi ván trong phòng kể cả sau "Chơi lại", tới khi có người đổi tuỳ chọn lúc bắt đầu ván mới (capability `new-game-options`). Với game có tuỳ chọn, sảnh chờ SHALL ghi luật của phòng để người mở link mời thấy trước khi bấm "Vào chơi", và màn hình ván online SHALL ghi luật như mọi chế độ. Server từ chối tuỳ chọn thì màn hình bắt đầu ván SHALL báo không tạo được phòng.

#### Scenario: Tạo phòng Cờ caro 19×19

- **WHEN** người chơi chọn "Online", "19×19", "Tự do" ở màn hình bắt đầu ván Cờ caro và bấm "Tạo phòng"
- **THEN** sảnh chờ của phòng mới ghi "Luật: 19×19 · Tự do"

#### Scenario: Người được mời thấy luật trước khi vào

- **WHEN** người thứ hai mở link mời của phòng Cờ caro 19×19 luật "tự do"
- **THEN** sảnh chờ ghi "Luật: 19×19 · Tự do" trước khi người đó bấm "Vào chơi"
- **AND** sau khi vào, cả hai người thấy bàn 19×19 và màn hình ván ghi "19×19 · Tự do"

#### Scenario: Chơi lại giữ luật

- **WHEN** ván Cờ caro online 19×19 đã có người thắng và một người bấm "Chơi lại"
- **THEN** cả hai người thấy bàn 19×19 trống và luật vẫn là "tự do"

#### Scenario: Server từ chối tuỳ chọn

- **WHEN** server từ chối tạo phòng vì tuỳ chọn luật không hợp lệ
- **THEN** màn hình bắt đầu ván báo không tạo được phòng và nút "Tạo phòng" bấm lại được
