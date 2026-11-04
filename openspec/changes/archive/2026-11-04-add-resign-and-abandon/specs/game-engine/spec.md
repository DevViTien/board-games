## ADDED Requirements

### Requirement: Đầu hàng và bỏ ván

Phiên SHALL kết thúc được một ván chưa có kết quả khi một người đầu hàng (`resigned`) hoặc bị xử bỏ ván (`abandoned`): mọi người còn lại thắng, kèm mã lý do đó; luật của game không đổi. Ván đã có kết quả MUST trả `game-over`, người không có trong ván MUST trả `illegal-move`. Sau đó mọi nước đi MUST trả `game-over`. Biên bản SHALL giữ việc kết thúc này; biên bản có kết thúc sai MUST bị từ chối với `corrupt-record`.

#### Scenario: Đầu hàng ván hai người

- **WHEN** trong ván Tic-tac-toe đang dở, người thứ nhất đầu hàng
- **THEN** phiên báo kết quả thắng cho người thứ hai với lý do `resigned`

#### Scenario: Bỏ ván trong ván bốn người

- **WHEN** trong ván Cờ cá ngựa 4 người đang dở, người thứ hai bị xử bỏ ván
- **THEN** phiên báo kết quả thắng cho người thứ nhất, thứ ba và thứ tư với lý do `abandoned`

#### Scenario: Không đi được sau khi đầu hàng

- **WHEN** một người vừa đầu hàng và phiên nhận một nước đi hợp lệ trước đó
- **THEN** phiên trả về `game-over` và trạng thái không thay đổi

#### Scenario: Đầu hàng ván đã kết thúc

- **WHEN** ván Tic-tac-toe đã có người thắng và một người đầu hàng
- **THEN** phiên trả về `game-over` và kết quả không đổi

#### Scenario: Người không có trong ván

- **WHEN** ván Tic-tac-toe đang dở và người thứ ba đầu hàng
- **THEN** phiên trả về `illegal-move` và ván không đổi

#### Scenario: Biên bản giữ việc đầu hàng

- **WHEN** biên bản của một ván vừa có người đầu hàng được chuyển sang JSON, đọc lại rồi dùng để dựng ván
- **THEN** ván dựng lại có cùng các nước đi và cùng kết quả thắng với lý do `resigned`

#### Scenario: Biên bản có kết thúc sai

- **WHEN** dựng ván từ biên bản Tic-tac-toe ghi người thứ năm đầu hàng, hoặc ghi một lý do kết thúc lạ
- **THEN** hệ thống từ chối với mã lỗi `corrupt-record` và không dựng ván

#### Scenario: Lý do của luật không trùng

- **WHEN** bộ kiểm tra hợp đồng chạy với một game bất kỳ
- **THEN** nó kiểm rằng lý do kết thúc do luật của game đặt trong các ván tự chơi không bao giờ là `resigned` hay `abandoned`

## MODIFIED Requirements

### Requirement: Hoàn tác và làm lại

Phiên SHALL cho hoàn tác nước đi gần nhất và làm lại nước vừa hoàn tác, theo thứ tự. Thực hiện một nước đi mới sau khi hoàn tác SHALL bỏ các nước đã hoàn tác. Hoàn tác khi chưa có nước đi MUST trả về `nothing-to-undo`; làm lại khi không còn gì để làm lại MUST trả về `nothing-to-redo`; cả hai không đổi trạng thái. Ván đã kết thúc vì đầu hàng hay bỏ ván MUST NOT hoàn tác hay làm lại được: cả hai trả về `game-over`.

#### Scenario: Hoàn tác rồi làm lại

- **WHEN** sau hai nước đi, người chơi hoàn tác một lần rồi làm lại một lần
- **THEN** sau khi hoàn tác, trạng thái giống hệt trạng thái sau nước đi thứ nhất
- **AND** sau khi làm lại, trạng thái giống hệt trạng thái sau nước đi thứ hai

#### Scenario: Nước đi mới bỏ nhánh đã hoàn tác

- **WHEN** người chơi hoàn tác một nước rồi thực hiện một nước đi khác
- **THEN** không còn gì để làm lại và lịch sử chỉ chứa nước đi mới

#### Scenario: Hoàn tác khi chưa có nước đi

- **WHEN** người chơi hoàn tác ở ván chưa có nước đi nào
- **THEN** phiên trả về `nothing-to-undo` và trạng thái không thay đổi

#### Scenario: Làm lại khi không còn gì để làm lại

- **WHEN** người chơi làm lại ở ván chưa hoàn tác nước nào
- **THEN** phiên trả về `nothing-to-redo` và trạng thái không thay đổi

#### Scenario: Không hoàn tác sau khi đầu hàng

- **WHEN** sau hai nước đi, một người đầu hàng rồi người chơi hoàn tác
- **THEN** phiên trả về `game-over` và ván vẫn kết thúc với lý do `resigned`
