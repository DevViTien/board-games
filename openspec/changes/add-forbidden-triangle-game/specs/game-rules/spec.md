## ADDED Requirements

### Requirement: Luật Tam giác cấm

Trang luật Tam giác cấm SHALL nêu:

- hai người lần lượt nối dây giữa các vị khách, mỗi người một màu;
- ai khép tam giác cùng màu mình thì thua;
- nối hết dây mà không ai khép tam giác thì hoà, và chỉ bàn 5 khách có thể hoà;
- ba cỡ bàn 5, 6, 7 khách;
- lời cảnh báo nước tự thua;
- định lý bữa tiệc: trong 6 người luôn có 3 người cùng quen hay cùng lạ nhau.

Hình SHALL cho thấy một tam giác khép, và một bàn 5 khách nối hết dây mà không có tam giác cùng màu.

#### Scenario: Nêu luật thua và định lý

- **WHEN** người chơi mở `/rules/forbidden-triangle`
- **THEN** trang nêu người khép tam giác cùng màu mình thì thua, và nêu rằng từ 6 khách trở lên ván không bao giờ hoà

#### Scenario: Hình bàn 5 khách hoà

- **WHEN** người chơi xem mục về ván hoà
- **THEN** có hình bàn 5 khách với vòng ngoài một màu và các đường chéo màu kia, kèm chú thích
