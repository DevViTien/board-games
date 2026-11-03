## ADDED Requirements

### Requirement: Số người chơi của ván

Ván trên thiết bị này (cùng máy và đấu với máy) SHALL có số người chọn lúc bắt đầu. "Ván mới" SHALL giữ số người của ván đang chơi; tải lại trang SHALL khôi phục đúng số người. Mở thẳng màn hình chơi khi chưa có ván SHALL dùng số người nhớ gần nhất của game (capability `game-setup`). Đường dẫn bắt đầu ván mang số người game không cho phép SHALL bị bỏ qua như đường dẫn có giá trị sai khác.

#### Scenario: Ván cùng máy 3 người

- **WHEN** người chơi bắt đầu một ván cùng máy 3 người của một game 2–4 người
- **THEN** ván có 3 người thay phiên nhau, mỗi người một lượt theo thứ tự

#### Scenario: Ván mới giữ số người

- **WHEN** ván cùng máy 4 người vừa kết thúc và người chơi chọn "Ván mới"
- **THEN** ván mới vẫn có 4 người

#### Scenario: Tải lại giữ số người

- **WHEN** ván cùng máy 3 người đang có vài nước và người chơi tải lại trang
- **THEN** ván hiện lại với 3 người, đúng các nước đã đi và đúng người đến lượt

#### Scenario: Số người sai trên đường dẫn

- **WHEN** người chơi có một ván cùng máy đang dở của một game 2–4 người và mở đường dẫn bắt đầu ván mới với 5 người
- **THEN** ván dở được tiếp tục, không có ván mới nào ghi đè lên nó

## MODIFIED Requirements

### Requirement: Hoàn tác và làm lại khi chơi cùng máy

Màn hình SHALL có nút hoàn tác và làm lại, chỉ bấm được khi có nước để hoàn tác hoặc làm lại. Hoàn tác được cả nước đi đã kết thúc ván; khi đó ván tiếp tục từ trước nước đó. Hoàn tác MUST NOT lùi qua một nước có kết quả ngẫu nhiên (ví dụ một lần gieo xúc xắc): xa nhất là ngay sau lần gieo gần nhất, nên người chơi chọn lại được nước cho cùng kết quả nhưng không bao giờ gieo lại.

#### Scenario: Nút ở đầu ván

- **WHEN** ván chưa có nước đi nào
- **THEN** nút hoàn tác và nút làm lại đều không bấm được

#### Scenario: Hoàn tác nước thắng

- **WHEN** X vừa thắng và người chơi bấm hoàn tác
- **THEN** quân vừa đặt biến mất, ván chưa kết thúc và lại đến lượt X

#### Scenario: Chọn lại sau khi gieo

- **WHEN** người chơi gieo xúc xắc ra 4, đi một quân theo số đó rồi bấm hoàn tác
- **THEN** quân trở về chỗ cũ, xúc xắc vẫn là 4 và người chơi chọn lại được quân để đi
- **AND** nút hoàn tác không bấm được nữa

#### Scenario: Không hoàn tác lần gieo

- **WHEN** người chơi vừa gieo xúc xắc và chưa đi quân nào
- **THEN** nút hoàn tác không bấm được

#### Scenario: Tải lại sau khi hoàn tác

- **WHEN** người chơi gieo ra 4, đi một quân, bấm hoàn tác rồi tải lại trang
- **THEN** ván hiện lại với xúc xắc vẫn là 4 và người chơi chọn quân để đi
