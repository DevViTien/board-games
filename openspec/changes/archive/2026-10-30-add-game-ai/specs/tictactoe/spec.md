# Spec Delta

## MODIFIED Requirements

### Requirement: Bàn và người chơi

Tic-tac-toe SHALL có đúng 2 người chơi, bàn 3×3 ô ban đầu đều trống. Người thứ nhất dùng quân X và đi trước, người thứ hai dùng quân O. Game SHALL khai báo thể loại `classic`, thời lượng ước tính 2 phút, và hỗ trợ đấu với máy.

#### Scenario: Ván mới

- **WHEN** tạo một ván Tic-tac-toe
- **THEN** cả 9 ô đều trống và người đến lượt là X

#### Scenario: Có thể đấu với máy

- **WHEN** app đọc thông tin khai báo của Tic-tac-toe
- **THEN** game được khai báo là hỗ trợ đấu với máy

## ADDED Requirements

### Requirement: Máy mức Khó không thua

Khi đấu Tic-tac-toe với máy ở mức Khó, máy MUST NOT thua, dù người chơi đi trước hay đi sau và đi theo bất kỳ cách nào.

#### Scenario: Thử mọi cách đi của người chơi

- **WHEN** người chơi lần lượt thử mọi chuỗi nước đi có thể, cả khi đi trước lẫn khi đi sau, trước máy mức Khó với vài chuỗi ngẫu nhiên (seed) khác nhau
- **THEN** không ván nào kết thúc với người chơi thắng
