## ADDED Requirements

### Requirement: Đầu hàng khi chơi online

Màn hình ván online SHALL có nút "Đầu hàng" khi phòng đủ người, ván chưa kết thúc và người ở thiết bị này tự chơi ghế của mình; khi chưa kết nối, nút MUST NOT bấm được và SHALL nêu lý do. Bấm SHALL hỏi xác nhận, nói rõ hậu quả: đối thủ thắng, hay máy chơi thay tới hết ván và người chơi vẫn xem được; huỷ MUST NOT đổi gì. Thẻ kết quả SHALL có dòng giải thích ai đã đầu hàng. Đã để máy chơi thay thì bàn MUST NOT cho người đó đi.

#### Scenario: Hỏi trước khi đầu hàng

- **WHEN** Lan đang chơi Cờ vua online với Minh và bấm "Đầu hàng"
- **THEN** hộp thoại hỏi xác nhận nói Minh sẽ thắng ván này, nút "Chơi tiếp" có tiêu điểm
- **AND** bấm "Chơi tiếp" thì hộp thoại đóng, ván vẫn tiếp tục và tiêu điểm về nút "Đầu hàng"

#### Scenario: Đầu hàng Cờ vua

- **WHEN** Lan xác nhận đầu hàng trong ván Cờ vua online với Minh
- **THEN** màn hình của Lan báo "Minh thắng!" kèm dòng "Bạn đã đầu hàng." và nút "Chơi lại", tiêu điểm ở tiêu đề màn hình
- **AND** màn hình của Minh báo "Bạn thắng!" kèm dòng "Lan đã đầu hàng." và nút "Chơi lại"

#### Scenario: Đầu hàng Cờ cá ngựa

- **WHEN** Lan xác nhận đầu hàng trong ván Cờ cá ngựa online 3 người
- **THEN** ghế của Lan ghi "Bạn" kèm "Máy chơi thay", bàn của Lan không cho gieo hay chọn ngựa và ván tiếp tục

#### Scenario: Hỏi đầu hàng Cờ cá ngựa hai người

- **WHEN** Lan bấm "Đầu hàng" trong ván Cờ cá ngựa online 2 người với Minh
- **THEN** hộp thoại nói Minh sẽ thắng ván này, không nói tới máy chơi thay

#### Scenario: Đang kết nối lại

- **WHEN** người chơi đang mất kết nối giữa ván online
- **THEN** nút "Đầu hàng" không bấm được và nêu lý do đang kết nối lại

#### Scenario: Không có nút khi ván đã kết thúc

- **WHEN** ván online đã có kết quả
- **THEN** màn hình không có nút "Đầu hàng"

### Requirement: Chờ người lâu chưa đi

Khi chờ một người ở xa tự chơi ghế của họ, từ 1 phút màn hình SHALL hiện thời gian đã chờ và sau bao lâu thì xử được bỏ ván; từ 5 phút SHALL có nút xử ("Xử thắng", "Cho máy chơi thay" hay "Kết thúc ván" theo hậu quả), bấm hỏi xác nhận. Thời gian SHALL tính từ thời lượng server cho biết, không theo giờ thiết bị. Dòng lượt SHALL đọc một lần khi nút xuất hiện, MUST NOT đọc từng giây. Server từ chối thì SHALL báo chưa xử được.

#### Scenario: Chưa tới 1 phút

- **WHEN** đang chờ Minh đi được 40 giây
- **THEN** màn hình không có thời gian chờ và không có nút xử bỏ ván

#### Scenario: Đang chờ

- **WHEN** đang chờ Minh đi được 2 phút 13 giây trong ván Cờ caro online
- **THEN** màn hình ghi "Minh chưa đi · 2:13" và cho biết sau 5 phút người chơi có thể xử thắng

#### Scenario: Đủ 5 phút

- **WHEN** đang chờ Minh đi được 5 phút mà người chơi không chạm vào màn hình
- **THEN** có nút "Xử thắng" và lời báo của dòng lượt đọc một lần rằng Minh đã 5 phút chưa đi

#### Scenario: Xử thắng

- **WHEN** người chơi bấm "Xử thắng" và xác nhận
- **THEN** màn hình báo "Bạn thắng!" kèm dòng "Minh bỏ ván: quá 5 phút không đi." và nút "Chơi lại"

#### Scenario: Người vắng đi trong lúc hỏi

- **WHEN** hộp thoại xác nhận xử bỏ ván đang mở và Minh đi một nước
- **THEN** hộp thoại đóng, ván không kết thúc và tiêu điểm về tiêu đề màn hình

#### Scenario: Server chưa cho xử

- **WHEN** người chơi xác nhận xử bỏ ván nhưng server từ chối vì lượt của Minh chưa đủ 5 phút
- **THEN** màn hình báo chưa thể xử, thời gian chờ được tính lại theo server và nút xử biến mất tới khi đủ 5 phút

#### Scenario: Cho máy chơi thay

- **WHEN** trong ván Cờ cá ngựa online 3 người đang chờ Minh 5 phút, người chơi bấm "Cho máy chơi thay" và xác nhận
- **THEN** ghế của Minh ghi "Máy chơi thay", nước của máy cho ghế đó được báo và ván tiếp tục

#### Scenario: Giờ của thiết bị sai

- **WHEN** đồng hồ của thiết bị chạy nhanh hơn server 10 phút và đang chờ Minh đi được 1 phút theo server
- **THEN** màn hình không có nút xử bỏ ván

### Requirement: Nhắc người đến lượt

Trong ván online, khi lượt của người ở thiết bị này đã kéo dài từ 4 phút, màn hình SHALL nhắc còn bao lâu trước khi người khác xử được bỏ ván (thua, hay máy chơi thay với phòng Cờ cá ngựa từ ba ghế). Lời nhắc SHALL được đọc một lần khi xuất hiện. Đi một nước SHALL làm lời nhắc biến mất.

#### Scenario: Còn dưới một phút

- **WHEN** lượt của người chơi trong ván Cờ vua online đã kéo dài 4 phút 18 giây
- **THEN** màn hình ghi còn 0:42 và quá 5 phút người khác có thể xử thắng

#### Scenario: Đi xong thì hết nhắc

- **WHEN** lời nhắc đang hiện và người chơi đi một nước
- **THEN** lời nhắc không còn

### Requirement: Ghế máy chơi thay trên màn hình

Ghế do máy chơi thay SHALL hiện tên người kèm "Máy chơi thay" trong bảng người chơi và thanh ghế; ghế của người ở thiết bị này ghi "Bạn" kèm "Máy chơi thay". Mỗi nước của ghế đó SHALL được báo như nước của máy kèm tên người, và khi ghế đó thắng, kết quả là "Máy (thay <tên>) thắng!" trên mọi màn hình, không ăn mừng trên màn hình của chính người đó.

#### Scenario: Báo nước của máy chơi thay

- **WHEN** máy chơi thay Minh gieo được 3, mất lượt, và tới lượt người chơi cầm Đỏ
- **THEN** lời báo là "Máy (thay Minh) gieo được 3, mất lượt. Đến lượt bạn (Đỏ)"

#### Scenario: Máy chơi thay mình

- **WHEN** máy đang chơi thay ghế của người chơi và tới lượt ghế đó
- **THEN** dòng lượt nói máy đang chơi thay bạn

#### Scenario: Máy chơi thay thắng

- **WHEN** máy chơi thay Lan về đích trước trong ván Cờ cá ngựa online
- **THEN** màn hình của Lan báo "Máy (thay Lan) thắng!" và không có hiệu ứng ăn mừng
- **AND** màn hình của những người khác cũng báo "Máy (thay Lan) thắng!"
