## ADDED Requirements

### Requirement: Số ghế của phòng

Phòng tạo từ màn hình bắt đầu ván SHALL có số ghế bằng số người chơi đang chọn ở đó; game có số người cố định SHALL tạo phòng như trước. Sảnh chờ SHALL hiện đủ mọi ghế của phòng, và ván SHALL bắt đầu khi mọi ghế đã có người.

#### Scenario: Tạo phòng 3 người

- **WHEN** người chơi chọn "Online" và "3 người" ở màn hình bắt đầu ván của một game 2–4 người rồi bấm "Tạo phòng"
- **THEN** sảnh chờ của phòng mới có ba ghế, người tạo ở ghế đầu tiên và hai ghế đang chờ

#### Scenario: Tic-tac-toe vẫn tạo phòng hai ghế

- **WHEN** người chơi tạo phòng Tic-tac-toe online
- **THEN** yêu cầu tạo phòng không nêu số người và phòng có hai ghế như trước

## MODIFIED Requirements

### Requirement: Báo lượt và kết quả theo bạn và tên đối thủ

Trong ván online, màn hình SHALL nói lượt và kết quả theo "bạn" và tên tạm của đối thủ: đến lượt mình, đang chờ đối thủ (kèm tên), mình thắng, đối thủ thắng (kèm tên), hoà. Khi đối thủ vừa đi và đến lượt mình, lời báo SHALL nêu nước đối thủ vừa đi theo cách gọi của game (ô vừa đánh, lần gieo…). Khi một ván mới bắt đầu, lời báo SHALL nêu phe của người chơi và ai đi trước. Lời báo SHALL nằm trong vùng trình đọc màn hình tự đọc khi thay đổi. Màn hình SHALL ghi rõ đây là ván online.

#### Scenario: Ván online được ghi rõ

- **WHEN** người chơi đang ở màn hình ván online
- **THEN** màn hình có nhãn "Online"

#### Scenario: Đối thủ vừa đi

- **WHEN** đối thủ tên "Minh" vừa đặt quân ở hàng 2, cột 3 và đến lượt người chơi
- **THEN** lời báo cho biết Minh vừa đánh hàng 2, cột 3 và đến lượt người chơi

#### Scenario: Chờ đối thủ

- **WHEN** đang đến lượt đối thủ tên "Minh"
- **THEN** lời báo cho biết đang chờ Minh

#### Scenario: Đối thủ thắng

- **WHEN** đối thủ tên "Minh" hoàn thành một hàng ba quân
- **THEN** lời báo trên màn hình người chơi cho biết Minh thắng

#### Scenario: Ván mới nói rõ phe

- **WHEN** đối thủ tên "Minh" bấm "Chơi lại" và người chơi nay cầm O
- **THEN** lời báo trên màn hình người chơi cho biết ván mới, người chơi cầm O và Minh đi trước
