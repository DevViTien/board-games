## ADDED Requirements

### Requirement: Kết quả của game cùng phe

Ở game cùng phe, khi ván có người thắng, thẻ kết quả SHALL báo "Cả đội thắng!" thay cho danh sách người thắng, có hiệu ứng ăn mừng, và bảng người chơi không gắn nhãn thắng cho từng ghế. Khi ván kết thúc theo luật mà không ai thắng, thẻ SHALL báo "Ván kết thúc" kèm dòng chi tiết của game; khi ván dừng vì có người bỏ cuộc hay bỏ ván, thẻ SHALL báo "Ván dừng" kèm dòng nêu ai. Hai trường hợp sau không ăn mừng.

#### Scenario: Cả đội thắng khi chơi cùng máy

- **WHEN** ván Đội gom thạch 3 người chơi cùng máy kết thúc vì đầy khuôn
- **THEN** thẻ kết quả báo "Cả đội thắng!", không liệt kê tên ghế, và có hiệu ứng ăn mừng

#### Scenario: Hết vòng khi chơi cùng máy

- **WHEN** ván Đội gom thạch chơi cùng máy kết thúc vì hết vòng
- **THEN** thẻ kết quả báo "Ván kết thúc" kèm dòng nêu hết vòng, không có hiệu ứng ăn mừng, và có nút "Ván mới"

## MODIFIED Requirements

### Requirement: Báo kết quả

Khi ván kết thúc, màn hình SHALL báo người thắng hoặc hoà trong thẻ kết quả, khoá bàn cờ không cho đi tiếp, và đưa ra hai lối: "Ván mới" (online: "Chơi lại") trong thẻ và "Về menu" ở thanh trên, mỗi lối chỉ một lần. Ở game cùng phe, câu kết quả theo "Kết quả của game cùng phe". Câu kết quả SHALL được đọc bởi chính vùng thông báo của dòng lượt. Khi người ở thiết bị này thắng, SHALL có hiệu ứng ăn mừng ngắn không chặn nút; hoà, máy hay người ở xa thắng thì không; khi bật giảm chuyển động hiệu ứng MUST NOT chạy.

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
