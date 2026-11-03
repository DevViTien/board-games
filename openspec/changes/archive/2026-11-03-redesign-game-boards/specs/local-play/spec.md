## ADDED Requirements

### Requirement: Bố cục màn hình chơi

Ở khung từ 1024 px trở lên, màn hình chơi SHALL đặt bàn cờ bên trái và một cột bên phải gồm dòng lượt hoặc kết quả, các điều khiển riêng của game (như xúc xắc) và các nút của ván; ở khung 1280 × 800, bàn, dòng lượt và mọi nút SHALL nằm trọn trong màn hình mà không cần cuộn. Ở khung hẹp hơn, các phần SHALL xếp thành một cột, và ở khung rộng 360 px trang MUST NOT cuộn ngang.

#### Scenario: Cờ caro 19×19 trên máy tính

- **WHEN** người chơi mở ván Cờ caro 19×19 cùng máy ở khung 1280 × 800
- **THEN** cả bàn, dòng lượt và các nút "Hoàn tác", "Làm lại", "Ván mới" nằm trong màn hình mà không cần cuộn

#### Scenario: Cờ cá ngựa trên máy tính

- **WHEN** người chơi mở ván Cờ cá ngựa 4 người cùng máy ở khung 1280 × 800 và vừa gieo được 6 với hai ngựa đi được
- **THEN** bàn, xúc xắc và cả hai lựa chọn ngựa nằm trong màn hình mà không cần cuộn

#### Scenario: Điện thoại hẹp

- **WHEN** người chơi mở ván Tic-tac-toe ở khung rộng 360 px
- **THEN** trang không cuộn ngang và dòng lượt, bàn, các nút xếp thành một cột
