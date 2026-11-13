## ADDED Requirements

### Requirement: Game cùng phe khi chơi online

Ở game cùng phe chơi online, mọi màn hình trong phòng SHALL báo "Cả đội thắng!" khi ván có người thắng, "Ván kết thúc" khi ván kết thúc theo luật mà không ai thắng, và "Ván dừng" kèm dòng nêu ai khi có người bỏ cuộc hay bỏ ván. Nút đầu hàng SHALL ghi "Bỏ cuộc", hộp thoại nói ván dừng cho cả đội. Ở game cùng phe có lượt, người chờ quá 5 phút SHALL chỉ có nút "Kết thúc ván", MUST NOT có "Xử thắng"; lời nhắc người đến lượt nói ván sẽ dừng.

#### Scenario: Bỏ cuộc trong ván cùng phe

- **WHEN** Lan bấm "Bỏ cuộc" trong ván Đội gom thạch online 3 người với Minh và Hoa, rồi xác nhận
- **THEN** màn hình của cả ba báo "Ván dừng"
- **AND** màn hình của Minh kèm dòng "Lan đã bỏ cuộc.", màn hình của Lan kèm dòng "Bạn đã bỏ cuộc."

#### Scenario: Hỏi trước khi bỏ cuộc

- **WHEN** Lan bấm "Bỏ cuộc" trong ván Đội gom thạch online
- **THEN** hộp thoại nói ván sẽ dừng cho cả đội, không nói ai thắng, và nút "Chơi tiếp" có tiêu điểm

#### Scenario: Chờ quá 5 phút trong ván cùng phe

- **WHEN** trong ván online 2 người của một game cùng phe có lượt, Lan đã chờ Minh đi được 5 phút kể từ nước gần nhất
- **THEN** màn hình của Lan có nút "Kết thúc ván" và không có nút "Xử thắng"
- **AND** hộp thoại xác nhận nói ván sẽ dừng cho cả đội

#### Scenario: Nhắc người đến lượt trong ván cùng phe

- **WHEN** Minh đến lượt trong ván online của một game cùng phe có lượt và đã 4 phút 18 giây chưa đi nước nào
- **THEN** màn hình của Minh ghi còn 0:42 và quá 5 phút người khác có thể kết thúc ván

#### Scenario: Cả đội thắng khi chơi online

- **WHEN** ván Đội gom thạch online 4 người kết thúc vì đầy khuôn
- **THEN** màn hình của mỗi người báo "Cả đội thắng!" và có hiệu ứng ăn mừng

#### Scenario: Chơi lại sau khi ván dừng

- **WHEN** ván Đội gom thạch online dừng vì Lan bỏ cuộc
- **THEN** mọi người trong phòng bắt đầu được ván mới bằng "Chơi lại"

### Requirement: Chơi game đi tự do online

Ở game đi tự do chơi online, người chơi SHALL đi được bất cứ lúc nào khi phòng đủ người, đang kết nối và ván chưa xong, chỉ chờ server nhận nước trước của chính mình. Màn hình MUST NOT có câu "Đang chờ", đồng hồ lượt, lời nhắc 4 phút hay nút xử bỏ ván. Nước bị từ chối vì người khác vừa đổi bàn MUST NOT kèm lời báo.

#### Scenario: Hai người cùng đi

- **WHEN** Minh và Lan chơi Đội gom thạch online, Minh vừa đi một bước và Lan bấm một hướng ngay sau đó
- **THEN** bước của Lan được nhận mà không phải chờ Minh, và cả hai màn hình hiện cả hai bước

#### Scenario: Bàn đổi trước khi nước tới server

- **WHEN** Lan đi vào một ô đúng lúc nước của Minh vừa tới server đẩy thạch vào ô đó
- **THEN** server từ chối nước của Lan, bàn của Lan hiện nước của Minh và không có lời báo nước đi không hợp lệ

#### Scenario: Không có đồng hồ lượt

- **WHEN** Minh không đi bước nào trong 6 phút của ván Đội gom thạch online
- **THEN** không màn hình nào có lời nhắc còn bao lâu hay nút "Kết thúc ván"; Lan vẫn bấm được "Bỏ cuộc"

### Requirement: Thời gian ván online

Server SHALL ghi giờ một ván online bắt đầu (lúc đủ người, hay lúc "Chơi lại") và giờ ván có kết quả, bằng đồng hồ của server, và gửi cả hai cho mọi người trong phòng. Phòng không có hai giờ này SHALL vẫn mở được, không có thời gian ván.

#### Scenario: Thời gian của ván thắng

- **WHEN** ván Đội gom thạch online bắt đầu lúc đủ hai người và đầy khuôn 7 phút 12 giây sau
- **THEN** thẻ kết quả của cả hai người ghi 7 phút 12 giây

## MODIFIED Requirements

### Requirement: Đầu hàng khi chơi online

Màn hình ván online SHALL có nút "Đầu hàng" khi phòng đủ người, ván chưa kết thúc và người ở thiết bị này tự chơi ghế của mình; khi chưa kết nối, nút MUST NOT bấm được và SHALL nêu lý do. Bấm SHALL hỏi xác nhận, nói rõ hậu quả: đối thủ thắng, hay máy chơi thay tới hết ván và người chơi vẫn xem được; huỷ MUST NOT đổi gì. Thẻ kết quả SHALL có dòng giải thích ai đã đầu hàng. Đã để máy chơi thay thì bàn MUST NOT cho người đó đi. Ở game cùng phe, nút, hộp thoại và dòng giải thích theo "Game cùng phe khi chơi online".

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

### Requirement: Nhắc người đến lượt

Trong ván online, khi lượt của người ở thiết bị này đã kéo dài từ 4 phút, màn hình SHALL nhắc còn bao lâu trước khi người khác xử được bỏ ván (thua, hay máy chơi thay với phòng từ ba ghế của game có máy; ở game cùng phe, ván dừng cho cả đội). Lời nhắc SHALL được đọc một lần khi xuất hiện. Đi một nước SHALL làm lời nhắc biến mất.

#### Scenario: Còn dưới một phút

- **WHEN** lượt của người chơi trong ván Cờ vua online đã kéo dài 4 phút 18 giây
- **THEN** màn hình ghi còn 0:42 và quá 5 phút người khác có thể xử thắng

#### Scenario: Đi xong thì hết nhắc

- **WHEN** lời nhắc đang hiện và người chơi đi một nước
- **THEN** lời nhắc không còn
