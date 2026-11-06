## ADDED Requirements

### Requirement: Luật Cờ rào

Trang luật Cờ rào SHALL nêu: mục tiêu về cổng đích là 5 ô giữa của cạnh đối diện; cỡ bàn và số rào theo số người; ba việc trong một lượt; quân được đứng chung ô và không nhảy qua nhau; rào dài hai ô, không đè, không cắt nhau; không được bịt kín đường về đích của ai; một lần phá rào; và giới hạn 200 nước (198 nước khi ba người). Hình SHALL cho thấy cổng đích, cách đặt rào, rào bị cấm vì bịt kín đường, và phá rào.

#### Scenario: Nêu đủ cỡ bàn và số rào

- **WHEN** người chơi mở `/rules/fence-race`
- **THEN** trang nêu bàn 11 × 9 với 9 rào mỗi người khi hai người, bàn 9 × 9 với 6 rào khi ba người và 4 rào khi bốn người

#### Scenario: Hình rào bị cấm

- **WHEN** người chơi xem mục về đường về đích
- **THEN** có hình một rào bị cấm vì bịt kín đường của một quân, kèm chú thích

#### Scenario: Luật phá rào

- **WHEN** người chơi xem mục phá rào
- **THEN** trang nêu mỗi người phá được một lần, phá được rào của bất kỳ ai, rào bị phá không trả lại ai, và có hình minh hoạ

## MODIFIED Requirements

### Requirement: Đầu hàng và bỏ ván trên trang luật

Trang luật của mọi game SHALL có mục ngắn về chơi online: nút "Đầu hàng" (có xác nhận) và việc người đến lượt quá 5 phút không đi thì người khác xử được bỏ ván. Trang của game có máy và có phòng 3–4 người (Cờ cá ngựa, Cờ rào) SHALL nói thêm rằng ở phòng 3–4 người máy chơi thay người đầu hàng hay bỏ ván ("Máy chơi thay") tới hết ván, còn phòng 2 người thì ván kết thúc.

#### Scenario: Mục đầu hàng của Cờ vua

- **WHEN** người chơi mở `/rules/chess`
- **THEN** trang có mục nói về nút "Đầu hàng" và việc xử bỏ ván sau 5 phút

#### Scenario: Máy chơi thay trên trang Cờ cá ngựa

- **WHEN** người chơi mở `/rules/ludo`
- **THEN** mục đầu hàng và bỏ ván nói "Máy chơi thay" ở phòng 3–4 người và ván kết thúc ở phòng 2 người

#### Scenario: Máy chơi thay trên trang Cờ rào

- **WHEN** người chơi mở `/rules/fence-race`
- **THEN** mục đầu hàng và bỏ ván nói "Máy chơi thay" ở phòng 3–4 người và ván kết thúc ở phòng 2 người
