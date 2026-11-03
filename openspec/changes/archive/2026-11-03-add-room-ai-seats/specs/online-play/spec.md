## ADDED Requirements

### Requirement: Ghế máy ở sảnh chờ

Sảnh chờ SHALL ghi "Máy" ở ghế máy và đánh dấu chủ phòng. Với game hỗ trợ đấu với máy, trong phòng có từ ba ghế, khi ván chưa có nước nào, chủ phòng SHALL thấy ở mỗi ghế trống nút "Cho máy chơi" và ở mỗi ghế máy nút "Bỏ máy", tên đọc được nêu số ghế (và việc ván bắt đầu ngay, ở ghế trống cuối cùng); người khác MUST NOT thấy các nút đó. Khi mọi ghế đã có người hoặc máy, mọi người có ghế SHALL được chuyển sang màn hình ván.

#### Scenario: Chủ phòng cho máy chơi ghế còn lại

- **WHEN** chủ phòng Cờ cá ngựa 3 ghế và một người bạn đã ngồi, chủ phòng bấm "Cho máy chơi" ở ghế 3
- **THEN** cả hai người thấy màn hình ván Cờ cá ngựa 3 người với một ghế máy

#### Scenario: Ghế trống cuối cùng báo bắt đầu ván

- **WHEN** chủ phòng xem sảnh chờ của phòng chỉ còn một ghế trống
- **THEN** nút "Cho máy chơi" ở ghế đó có tên đọc được nói rằng ván sẽ bắt đầu

#### Scenario: Người khác không thấy nút

- **WHEN** người bạn đã ngồi trong phòng Cờ cá ngựa còn ghế trống xem sảnh chờ
- **THEN** sảnh chờ không có nút "Cho máy chơi" hay "Bỏ máy"

#### Scenario: Bỏ máy ở sảnh chờ

- **WHEN** phòng còn ghế trống và chủ phòng bấm "Bỏ máy" ở ghế 3
- **THEN** ghế 3 trở lại "Đang chờ…" và nút ở ghế đó thành "Cho máy chơi"

#### Scenario: Game không hỗ trợ máy

- **WHEN** chủ phòng của một phòng game không hỗ trợ đấu với máy xem sảnh chờ
- **THEN** sảnh chờ không có nút "Cho máy chơi"

#### Scenario: Phòng hai ghế không có ghế máy

- **WHEN** chủ phòng của một phòng Tic-tac-toe xem sảnh chờ khi ghế thứ hai còn trống
- **THEN** sảnh chờ không có nút "Cho máy chơi"

#### Scenario: Lời từ chối không làm mất nước đang gửi

- **WHEN** server từ chối một yêu cầu đổi ghế máy trong lúc một nước đi của người chơi đang chờ trả lời
- **THEN** bàn vẫn khoá cho tới khi server trả lời nước đi đó

### Requirement: Hiện lần lượt các nước nhận cùng lúc

Khi một lần cập nhật của phòng mang nhiều nước mới cùng lúc (máy đi liền nhau, kể cả ván mới mà máy đi đầu), màn hình ván SHALL hiện từng nước một theo đúng thứ tự, mỗi nước không sớm hơn lúc hiệu ứng của nước trước kết thúc và dừng lâu hơn sau mỗi kết quả ngẫu nhiên, và MUST NOT cho người chơi đi trước khi hiện xong. Lần vào phòng, tải lại hay kết nối lại SHALL hiện ngay trạng thái mới nhất.

#### Scenario: Ba máy đi liền nhau

- **WHEN** người chơi đi một nước và trạng thái phòng trả về có thêm sáu nước của ba máy
- **THEN** màn hình hiện lần lượt từng nước của các máy rồi mới tới lượt người chơi
- **AND** bàn không cho người chơi đi trong lúc đang hiện

#### Scenario: Chơi lại với máy đi đầu

- **WHEN** một người bấm "Chơi lại" và ghế máy được xoay vào ghế đầu nên ván mới đến nơi đã có các nước của máy
- **THEN** màn hình hiện bàn mới rồi hiện lần lượt các nước của máy

#### Scenario: Ván mới tới khi đang hiện ván cũ

- **WHEN** màn hình đang hiện lần lượt các nước cuối của một ván, nước cuối kết thúc ván, và ván mới tới trong lúc đó
- **THEN** màn hình hiện hết các nước và kết quả của ván cũ rồi mới hiện ván mới

#### Scenario: Tải lại không phát lại

- **WHEN** người chơi tải lại trang phòng giữa ván có ghế máy
- **THEN** màn hình hiện ngay trạng thái mới nhất của ván

### Requirement: Ván online có ghế máy

Trên màn hình ván online, ghế máy SHALL được gọi là máy như khi đấu với máy (kèm tên ghế khi có từ hai ghế máy), và mỗi nước của máy SHALL được nêu trong lời báo khi hiện, kể cả khi lượt kế tiếp vẫn là máy. Màn hình SHALL vẫn ghi "Online", không có hoàn tác, và có nút "Chơi lại" khi ván có kết quả, kể cả khi người chơi là người duy nhất trong phòng.

#### Scenario: Chờ máy

- **WHEN** trong ván online có hai ghế máy, đang hiện lượt của máy ở ghế tên "Xanh dương"
- **THEN** lời báo là "Máy (Xanh dương) đang nghĩ…"

#### Scenario: Báo nước máy đá ngựa

- **WHEN** trong lúc hiện lần lượt, máy "Xanh dương" đá ngựa của người chơi rồi tới lượt máy "Vàng"
- **THEN** lời báo nêu nước máy "Xanh dương" vừa đi kèm việc đá ngựa, và máy "Vàng" đang nghĩ

#### Scenario: Một người với ba máy

- **WHEN** chủ phòng Cờ cá ngựa 4 ghế cho máy chơi ba ghế còn lại và ván đã có kết quả
- **THEN** màn hình ghi "Online" và có nút "Chơi lại"

### Requirement: Báo nước đi từ nơi khác

Trong ván online, mỗi nước không do người chơi trên thiết bị này đi (của người ở xa hay của ghế máy) SHALL được nêu trong lời báo khi hiện, theo cách gọi của game, kèm ai vừa đi và lượt kế tiếp: đến lượt mình, đang chờ người nào, hay máy nào đang nghĩ. Ván mới mà ghế máy đi trước SHALL được báo kèm phe của người chơi và việc máy đi trước.

#### Scenario: Người ở xa đi rồi chờ người khác

- **WHEN** trong ván Cờ cá ngựa online 3 người, Minh gieo được 3, mất lượt, và tới lượt Lan
- **THEN** lời báo trên màn hình người chơi là "Minh vừa gieo được 3, mất lượt. Đang chờ Lan…"

#### Scenario: Nước giữa lượt của người ở xa

- **WHEN** Minh gieo được 6 và vẫn tới lượt Minh
- **THEN** lời báo là "Minh vừa gieo được 6. Đang chờ Minh…"

#### Scenario: Máy đi rồi chờ người ở xa

- **WHEN** ghế máy duy nhất của phòng gieo được 3, mất lượt, và tới lượt Lan
- **THEN** lời báo là "Máy gieo được 3, mất lượt. Đang chờ Lan…"

#### Scenario: Người ở xa đi rồi tới máy

- **WHEN** Minh gieo được 3, mất lượt, và tới lượt ghế máy duy nhất
- **THEN** lời báo là "Minh vừa gieo được 3, mất lượt. Máy đang nghĩ…"

#### Scenario: Ván mới máy đi trước

- **WHEN** ván Cờ cá ngựa online 3 người có một ghế máy đã kết thúc, một người bấm "Chơi lại", ghế máy được xoay vào ghế đầu và người chơi nay ở ghế "Xanh dương"
- **THEN** lời báo trên màn hình người chơi là "Ván mới: bạn cầm Xanh dương, máy đi trước"
