## ADDED Requirements

### Requirement: Bảng người chơi

Màn hình chơi SHALL có bảng người chơi liệt kê mọi ghế theo thứ tự lượt; mỗi ghế ghi tên hoặc ký hiệu của người đó trong game, quân hoặc màu kèm ký hiệu, và loại người chơi (ở thiết bị này, máy kèm mức độ, hoặc người ở xa). Khi ván chưa kết thúc, ghế đang đến lượt SHALL được đánh dấu bằng chữ "Đến lượt", không chỉ bằng màu. Bảng MUST NOT là vùng thông báo cho trình đọc màn hình.

#### Scenario: Ván cùng máy

- **WHEN** người chơi mở ván Tic-tac-toe cùng máy chưa có nước nào
- **THEN** bảng người chơi có hai ghế "X" và "O", ghế "X" ghi "Đến lượt"

#### Scenario: Lượt đổi trong bảng

- **WHEN** X vừa đặt quân trong ván cùng máy
- **THEN** ghế "O" ghi "Đến lượt" và ghế "X" không còn ghi

#### Scenario: Ván với nhiều máy

- **WHEN** người chơi mở ván Cờ cá ngựa 4 người đấu với máy mức Vừa, người chơi cầm Đỏ
- **THEN** bảng người chơi có bốn ghế theo thứ tự lượt, ghế Đỏ ghi là của bạn và ba ghế còn lại ghi là máy mức Vừa kèm màu và ký hiệu

#### Scenario: Bảng không đọc lại lượt

- **WHEN** lượt đổi trong ván cùng máy
- **THEN** chỉ dòng lượt của màn hình được trình đọc màn hình tự đọc, bảng người chơi không phải vùng thông báo

#### Scenario: Cờ cá ngựa 4 người vừa màn hình máy tính

- **WHEN** người chơi mở ván Cờ cá ngựa 4 người cùng máy ở khung 1280 × 800 và vừa gieo được 6 với bốn ngựa đi được
- **THEN** bàn, dòng lượt, bảng người chơi, xúc xắc, cả bốn lựa chọn ngựa và các nút của ván nằm trong màn hình mà không cần cuộn

### Requirement: Lý do nút không bấm được

Khi nút "Hoàn tác" hoặc "Làm lại" hiện mà không bấm được, nút SHALL có mô tả đọc được nêu lý do (chưa có nước nào, chưa có nước nào của người chơi khi máy đi trước, không hoàn tác được lần gieo xúc xắc, không có nước để làm lại, hoặc máy đang nghĩ), và lý do SHALL hiện thành chữ khi nút có tiêu điểm hoặc bị bấm.

#### Scenario: Đầu ván

- **WHEN** ván chưa có nước đi nào và người chơi đưa tiêu điểm tới nút "Hoàn tác"
- **THEN** nút được mô tả là chưa có nước nào để hoàn tác và lời đó hiện trên màn hình

#### Scenario: Máy đi trước

- **WHEN** trong ván Tic-tac-toe đấu với máy, máy vừa đi nước đầu tiên và người chơi bấm "Hoàn tác"
- **THEN** không có gì được hoàn tác và màn hình nói chưa có nước nào của bạn để hoàn tác

#### Scenario: Ngay sau lần gieo

- **WHEN** người chơi vừa gieo xúc xắc trong ván Cờ cá ngựa cùng máy và bấm "Hoàn tác"
- **THEN** không có gì được hoàn tác và màn hình nói không hoàn tác được lần gieo xúc xắc

## MODIFIED Requirements

### Requirement: Báo kết quả

Khi ván kết thúc, màn hình SHALL báo người thắng hoặc hoà trong thẻ kết quả, khoá bàn cờ không cho đi tiếp, và đưa ra hai lối: "Ván mới" (online: "Chơi lại") trong thẻ và "Về menu" ở thanh trên, mỗi lối chỉ một lần. Câu kết quả SHALL được đọc bởi chính vùng thông báo của dòng lượt. Khi người ở thiết bị này thắng, SHALL có hiệu ứng ăn mừng ngắn không chặn nút; hoà, máy hay người ở xa thắng thì không; khi bật giảm chuyển động hiệu ứng MUST NOT chạy.

#### Scenario: Có người thắng

- **WHEN** X tạo được ba quân thẳng hàng
- **THEN** thẻ kết quả báo X thắng
- **AND** không ô nào trên bàn còn chọn được
- **AND** có đúng một nút "Ván mới", nằm trong thẻ, và lối "Về menu" ở thanh trên
- **AND** có hiệu ứng ăn mừng và nút "Ván mới" bấm được ngay

#### Scenario: Hoà

- **WHEN** ván Tic-tac-toe đầy bàn mà không ai thắng
- **THEN** màn hình báo hoà và không có hiệu ứng ăn mừng

#### Scenario: Nhiều người cùng thắng

- **WHEN** ván kết thúc với hai người thắng là X và O
- **THEN** màn hình nêu cả hai theo cách liệt kê của ngôn ngữ đang dùng: "X và O thắng!" (tiếng Việt), "X and O win!" (tiếng Anh)

#### Scenario: Máy thắng

- **WHEN** máy thắng trong ván đấu với máy
- **THEN** thẻ kết quả báo "Máy thắng!" và không có hiệu ứng ăn mừng

#### Scenario: Câu kết quả được đọc từ dòng lượt

- **WHEN** trình đọc màn hình đang theo dõi dòng lượt và người chơi thắng ván đấu với máy
- **THEN** cùng vùng thông báo đó đọc "Bạn thắng!", không có vùng thông báo thứ hai

#### Scenario: Hoàn tác nước thắng trả lại dòng lượt

- **WHEN** X vừa thắng trong ván cùng máy và người chơi bấm "Hoàn tác"
- **THEN** thẻ kết quả không còn, cùng vùng thông báo đọc "Đến lượt X" và hàng nút lại có "Ván mới"

#### Scenario: Giảm chuyển động

- **WHEN** hệ thống bật giảm chuyển động và người chơi thắng ván đấu với máy
- **THEN** thẻ kết quả báo "Bạn thắng!" với nút "Ván mới", và không có hiệu ứng nào chạy
