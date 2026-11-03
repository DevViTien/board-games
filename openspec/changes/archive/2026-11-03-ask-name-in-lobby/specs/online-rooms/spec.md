## MODIFIED Requirements

### Requirement: Vào phòng

Server SHALL cho một kết nối vào phòng bằng mã phòng, `playerId` và tên (có thể không có tên), rồi gửi trạng thái đầy đủ của phòng kèm ghế của chính người đó. Người có `playerId` đã ngồi trong phòng SHALL được nhận ra ở đúng ghế của mình (tên gửi kèm, nếu khác, thay tên cũ; không kèm tên thì giữ tên cũ); người chưa có ghế vào phòng mà chưa ngồi ghế nào. Mã phòng không tồn tại MUST nhận lỗi `room-not-found`. Mã phòng SHALL được nhận không phân biệt chữ hoa chữ thường và bỏ qua khoảng trắng.

#### Scenario: Người mới vào phòng

- **WHEN** một người chưa có ghế vào phòng Tic-tac-toe vừa tạo
- **THEN** người đó nhận trạng thái phòng với ghế của mình là "không có", và ghế thứ hai vẫn trống

#### Scenario: Vào phòng không kèm tên

- **WHEN** một người chưa có ghế vào phòng Tic-tac-toe vừa tạo mà không gửi tên
- **THEN** người đó nhận trạng thái phòng với ghế của mình là "không có", ghế thứ hai vẫn trống và phòng không đổi

#### Scenario: Vào lại phòng với cùng playerId

- **WHEN** người chơi đang ngồi ghế thứ hai vào lại phòng với cùng `playerId`
- **THEN** người đó được nhận ra ở ghế thứ hai và không ai bị đổi ghế

#### Scenario: Vào lại với tên mới

- **WHEN** người chơi đang ngồi ghế thứ hai vào lại phòng với cùng `playerId` và tên mới
- **THEN** mọi người trong phòng thấy tên mới ở ghế thứ hai

#### Scenario: Vào lại không kèm tên

- **WHEN** người chơi "An" đang ngồi ghế thứ hai vào lại phòng với cùng `playerId` mà không gửi tên
- **THEN** người đó được nhận ra ở ghế thứ hai và mọi người trong phòng vẫn thấy "An"

#### Scenario: Mã phòng không tồn tại

- **WHEN** người chơi vào phòng bằng một mã đúng định dạng nhưng không có phòng nào
- **THEN** server trả lỗi `room-not-found` và đóng kết nối

#### Scenario: Mã phòng viết thường

- **WHEN** người chơi vào phòng `ABC234` bằng mã `abc 234`
- **THEN** người chơi vào đúng phòng `ABC234`
