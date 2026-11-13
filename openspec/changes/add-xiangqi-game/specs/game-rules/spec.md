## ADDED Requirements

### Requirement: Luật Cờ tướng

Trang luật Cờ tướng SHALL nêu: bàn, sông và cung; cách đi của bảy loại quân kèm tên và chữ Hán của từng quân ở cả hai bên; Tướng không đối mặt; thắng khi chiếu bí hoặc đối phương hết nước; chiếu dai thì thua; lặp lại ba lần thì hoà; 120 nước không ăn quân thì hoà; và cách đọc ký hiệu nước đi ("P2-5", "M8.7", "X1/1"). Hình SHALL cho thấy cách đi của Mã kèm điểm cản chân, và Pháo ăn qua ngòi.

#### Scenario: Nêu chiếu dai

- **WHEN** người chơi mở `/rules/xiangqi`
- **THEN** trang nêu bên chiếu liên tục làm thế cờ lặp lại lần thứ ba thì thua, và lặp lại không phải chiếu dai thì hoà

#### Scenario: Hình Mã cản chân

- **WHEN** người chơi xem mục cách đi của Mã
- **THEN** có hình một Mã với các điểm đi được và một quân cản chân chặn hai điểm, kèm chú thích
