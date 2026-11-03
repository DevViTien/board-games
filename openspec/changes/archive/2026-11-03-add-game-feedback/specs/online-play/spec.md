## ADDED Requirements

### Requirement: Bảng người chơi khi chơi online

Trong ván online, bảng người chơi SHALL ghi ghế của người ở thiết bị này là "Bạn", ghế của người khác bằng tên họ chọn, và ghế máy là máy. Ghế "Bạn" SHALL kèm trạng thái kết nối của thiết bị này bằng chữ khác với dòng báo kết nối của màn hình: "Đã kết nối", hoặc "Mất kết nối" khi mất kết nối quá 1,5 giây hay khi đã tạm ngắt.

#### Scenario: Hai người trong phòng

- **WHEN** Lan và Minh đang chơi Tic-tac-toe online và Lan nhìn màn hình của mình
- **THEN** bảng người chơi của Lan có ghế "Bạn" kèm "Đã kết nối" và ghế "Minh"

#### Scenario: Mất kết nối

- **WHEN** kết nối của Lan bị mất quá 1,5 giây giữa ván online
- **THEN** ghế "Bạn" trong bảng người chơi của Lan ghi "Mất kết nối" và màn hình vẫn có dòng "Đang kết nối lại…"

#### Scenario: Cờ cá ngựa online vừa màn hình máy tính

- **WHEN** người chơi trong phòng Cờ cá ngựa 4 ghế ở khung 1280 × 800 vừa gieo được 6 với bốn ngựa đi được
- **THEN** bàn, chỗ dành cho dòng báo kết nối, dòng lượt, bảng người chơi, xúc xắc và cả bốn lựa chọn ngựa nằm trong màn hình mà không cần cuộn
