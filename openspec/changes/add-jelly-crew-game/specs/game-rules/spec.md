## ADDED Requirements

### Requirement: Luật Đội gom thạch

Trang luật Đội gom thạch SHALL nêu: cả đội cùng thắng khi mọi ô khuôn có thạch đúng loại; mọi người cùng đi bất cứ lúc nào, không lượt, không giới hạn bước; cách đẩy và dính của từng loại thạch; nhân vật là vật cản; nút và cửa theo nhóm ký hiệu; "Đặt lại bản đồ"; cách điều khiển khi chơi cùng máy (W A S D, mũi tên, chọn nhân vật). Hình SHALL cho thấy một người giữ nút cho người kia đẩy thạch qua cửa, và một bước bị nhân vật khác chặn.

#### Scenario: Nêu nút và cửa

- **WHEN** người chơi mở `/rules/jelly-crew`
- **THEN** trang có mục về nút và cửa, kèm hình một nhân vật đứng trên nút ● trong khi nhân vật khác đẩy thạch qua cửa ●, có chú thích

#### Scenario: Nêu cách đi tự do

- **WHEN** người chơi mở `/rules/jelly-crew`
- **THEN** trang nêu mọi người cùng đi bất cứ lúc nào, không có lượt hay giới hạn bước, và không nhắc tới "Xong lượt" hay vòng

## MODIFIED Requirements

### Requirement: Đầu hàng và bỏ ván trên trang luật

Trang luật của mọi game SHALL có mục ngắn về chơi online: nút "Đầu hàng" (có xác nhận) và việc người đến lượt quá 5 phút không đi thì người khác xử được bỏ ván. Trang của game có máy và có phòng 3–4 người (Cờ cá ngựa, Cờ rào) SHALL nói thêm rằng ở phòng 3–4 người máy chơi thay người đầu hàng hay bỏ ván ("Máy chơi thay") tới hết ván, còn phòng 2 người thì ván kết thúc. Trang của game cùng phe đi tự do (Đội gom thạch) SHALL gọi nút là "Bỏ cuộc", nói ván dừng cho cả đội, không ai thắng, và không ai bị xử bỏ ván.

#### Scenario: Mục đầu hàng của Cờ vua

- **WHEN** người chơi mở `/rules/chess`
- **THEN** trang có mục nói về nút "Đầu hàng" và việc xử bỏ ván sau 5 phút

#### Scenario: Máy chơi thay trên trang Cờ cá ngựa

- **WHEN** người chơi mở `/rules/ludo`
- **THEN** mục đầu hàng và bỏ ván nói "Máy chơi thay" ở phòng 3–4 người và ván kết thúc ở phòng 2 người

#### Scenario: Máy chơi thay trên trang Cờ rào

- **WHEN** người chơi mở `/rules/fence-race`
- **THEN** mục đầu hàng và bỏ ván nói "Máy chơi thay" ở phòng 3–4 người và ván kết thúc ở phòng 2 người

#### Scenario: Bỏ cuộc trên trang Đội gom thạch

- **WHEN** người chơi mở `/rules/jelly-crew`
- **THEN** mục cuối "Bỏ cuộc" nói về nút "Bỏ cuộc", rằng ván dừng cho cả đội và không ai thắng, không ai bị xử bỏ ván, và không nói tới "Máy chơi thay"
