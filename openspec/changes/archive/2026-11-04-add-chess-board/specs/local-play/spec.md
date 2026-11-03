## MODIFIED Requirements

### Requirement: Bảng người chơi

Màn hình chơi SHALL có bảng người chơi liệt kê mọi ghế theo thứ tự lượt; mỗi ghế ghi tên hoặc ký hiệu của người đó trong game, quân hoặc màu kèm ký hiệu, và loại người chơi (ở thiết bị này, máy kèm mức độ, hoặc người ở xa). Khi ván chưa kết thúc, ghế đang đến lượt SHALL được đánh dấu bằng chữ "Đến lượt", không chỉ bằng màu. Bảng MUST NOT là vùng thông báo cho trình đọc màn hình. Game hai người đặt ghế quanh bàn (Cờ vua) SHALL thay bảng bằng hai thanh ghế trên và dưới bàn theo hướng bàn.

#### Scenario: Ván cùng máy

- **WHEN** người chơi mở ván Tic-tac-toe cùng máy chưa có nước nào
- **THEN** bảng người chơi có hai ghế "X" và "O", ghế "X" ghi "Đến lượt"

#### Scenario: Lượt đổi trong bảng

- **WHEN** X vừa đặt quân trong ván cùng máy
- **THEN** ghế "O" ghi "Đến lượt" và ghế "X" không còn ghi

#### Scenario: Ván với nhiều máy

- **WHEN** người chơi mở ván Cờ cá ngựa 4 người đấu với máy mức Vừa, người chơi cầm Đỏ
- **THEN** bảng người chơi có bốn ghế theo thứ tự lượt, ghế Đỏ ghi là của bạn và ba ghế còn lại ghi là máy mức Vừa kèm màu và ký hiệu

#### Scenario: Bảng không đọc lại lượt

- **WHEN** lượt đổi trong ván cùng máy
- **THEN** chỉ dòng lượt của màn hình được trình đọc màn hình tự đọc, bảng người chơi không phải vùng thông báo

#### Scenario: Cờ cá ngựa 4 người vừa màn hình máy tính

- **WHEN** người chơi mở ván Cờ cá ngựa 4 người cùng máy ở khung 1280 × 800 và vừa gieo được 6 với bốn ngựa đi được
- **THEN** bàn, dòng lượt, bảng người chơi, xúc xắc, cả bốn lựa chọn ngựa và các nút của ván nằm trong màn hình mà không cần cuộn

#### Scenario: Thanh người chơi quanh bàn Cờ vua

- **WHEN** người chơi mở một ván Cờ vua cùng máy mới
- **THEN** thanh của Đen ở ngay trên bàn, thanh của Trắng ở ngay dưới bàn ghi "Đến lượt", và cột bên không có bảng người chơi
