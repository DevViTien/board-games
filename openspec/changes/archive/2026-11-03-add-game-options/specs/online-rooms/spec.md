## MODIFIED Requirements

### Requirement: Tạo phòng

Server SHALL tạo phòng cho một game đã đăng ký, trả về mã phòng 6 ký tự gồm chữ in hoa và chữ số dễ đọc (không có `0`, `O`, `1`, `I`, `L`), khác mọi phòng đang tồn tại, rồi đóng kết nối tạo phòng. Người tạo SHALL ngồi ghế đầu tiên; số ghế và tuỳ chọn luật không nêu thì lấy giá trị nhỏ nhất và mặc định của game. Game, số người hoặc tuỳ chọn không hợp lệ MUST bị từ chối với mã lỗi tương ứng và không tạo phòng.

#### Scenario: Tạo phòng Tic-tac-toe

- **WHEN** một người chơi yêu cầu tạo phòng Tic-tac-toe
- **THEN** server trả về một mã 6 ký tự trong bảng chữ cho phép rồi đóng kết nối
- **AND** vào phòng bằng mã đó thấy người tạo ở ghế đầu tiên, ghế thứ hai trống, chưa có nước đi nào

#### Scenario: Game không tồn tại

- **WHEN** yêu cầu tạo phòng mang mã game `khong-co-game-nay`
- **THEN** server trả lỗi `unknown-game` và không có phòng nào được tạo

#### Scenario: Số người không hợp lệ

- **WHEN** yêu cầu tạo phòng Tic-tac-toe cho 3 người
- **THEN** server trả lỗi `invalid-player-count` và không có phòng nào được tạo

#### Scenario: Mã phòng trùng

- **WHEN** mã phòng sinh ra lần đầu trùng với một phòng đang tồn tại
- **THEN** server sinh mã khác và phòng cũ không bị đổi

#### Scenario: Tạo phòng với tuỳ chọn luật

- **WHEN** một người chơi yêu cầu tạo phòng Cờ caro với bàn 19×19 và luật "tự do"
- **THEN** ván đầu tiên của phòng có bàn 19×19 trống và dùng luật "tự do"

#### Scenario: Tuỳ chọn luật không hợp lệ

- **WHEN** yêu cầu tạo phòng Cờ caro mang kích thước bàn 17
- **THEN** server trả lỗi `invalid-options` và không có phòng nào được tạo

### Requirement: Ván mới trong phòng

Khi ván hiện tại đã có kết quả, người có ghế trong phòng SHALL bắt đầu được ván mới trong cùng phòng; ván mới SHALL giữ tuỳ chọn luật của phòng và xoay ghế của mọi người để người đi trước luân phiên giữa các ván, và mỗi người trong phòng nhận ván mới kèm ghế mới của mình. Yêu cầu ván mới khi ván chưa có kết quả MUST bị từ chối với mã `game-not-over`. Hai yêu cầu ván mới cho cùng một ván SHALL chỉ tạo một ván mới.

#### Scenario: Chơi lại sau khi thắng

- **WHEN** ván Tic-tac-toe đã có người thắng và người ở ghế thứ hai yêu cầu ván mới
- **THEN** mọi người trong phòng nhận ván mới chưa có nước nào
- **AND** người trước đó ở ghế đầu tiên nhận ghế thứ hai, người kia nhận ghế đầu tiên

#### Scenario: Ván mới khi chưa kết thúc

- **WHEN** ván đang dở và một người yêu cầu ván mới
- **THEN** server từ chối với mã `game-not-over` và ván không đổi

#### Scenario: Cả hai cùng yêu cầu ván mới

- **WHEN** ván đã kết thúc và cả hai người gửi yêu cầu ván mới cho cùng ván đó
- **THEN** chỉ một ván mới được tạo, yêu cầu còn lại bị từ chối với mã `stale-move`

#### Scenario: Ván mới giữ tuỳ chọn luật

- **WHEN** ván Cờ caro 19×19 luật "tự do" trong phòng đã có người thắng và một người yêu cầu ván mới
- **THEN** ván mới có bàn 19×19 trống và vẫn dùng luật "tự do"
