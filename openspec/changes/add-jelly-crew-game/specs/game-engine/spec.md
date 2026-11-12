## MODIFIED Requirements

### Requirement: Khai báo game

Mỗi game SHALL khai báo: mã định danh kebab-case duy nhất, số người chơi tối thiểu và tối đa, thể loại (`vn-folk`, `classic` hoặc `original`), thời lượng một ván ước tính tính bằng phút, game có hỗ trợ đấu với máy hay không, và tuỳ chọn luật mặc định. Game SHALL khai báo được mình là game **cùng phe** (mọi người cùng thắng hay cùng không thắng); không khai báo thì là game đối kháng. Thông tin khai báo SHALL đọc được mà không cần tạo ván.

#### Scenario: Đọc thông tin game mà không tạo ván

- **WHEN** app cần hiển thị một game trong menu
- **THEN** app đọc được mã, số người chơi, thể loại, thời lượng và cờ hỗ trợ AI của game đó mà không tạo ván nào

#### Scenario: Đọc cờ cùng phe

- **WHEN** app đọc khai báo của Đội gom thạch và của Cờ vua
- **THEN** Đội gom thạch là game cùng phe, Cờ vua không phải

#### Scenario: Thắng trong game cùng phe

- **WHEN** bộ kiểm tra hợp đồng tự chơi ván của một game cùng phe và ván kết thúc có người thắng
- **THEN** nó kiểm rằng mọi người trong ván đều là người thắng

### Requirement: Đầu hàng và bỏ ván

Phiên SHALL kết thúc được một ván chưa có kết quả khi một người đầu hàng (`resigned`) hoặc bị xử bỏ ván (`abandoned`): mọi người còn lại thắng, kèm mã lý do đó; luật của game không đổi. Ở game cùng phe, ván SHALL kết thúc không ai thắng, kèm mã lý do đó. Ván đã có kết quả MUST trả `game-over`, người không có trong ván MUST trả `illegal-move`. Sau đó mọi nước đi MUST trả `game-over`. Biên bản SHALL giữ việc kết thúc này; biên bản có kết thúc sai MUST bị từ chối với `corrupt-record`.

#### Scenario: Đầu hàng ván hai người

- **WHEN** trong ván Tic-tac-toe đang dở, người thứ nhất đầu hàng
- **THEN** phiên báo kết quả thắng cho người thứ hai với lý do `resigned`

#### Scenario: Bỏ ván trong ván bốn người

- **WHEN** trong ván Cờ cá ngựa 4 người đang dở, người thứ hai bị xử bỏ ván
- **THEN** phiên báo kết quả thắng cho người thứ nhất, thứ ba và thứ tư với lý do `abandoned`

#### Scenario: Bỏ cuộc trong game cùng phe

- **WHEN** trong ván Đội gom thạch 3 người đang dở, người thứ hai đầu hàng
- **THEN** phiên báo ván kết thúc không ai thắng với lý do `resigned`

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
