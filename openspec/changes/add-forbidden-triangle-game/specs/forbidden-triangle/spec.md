## Purpose

Tam giác cấm: game hai người dựng trên bài toán bữa tiệc Ramsey. Hai người lần lượt nối dây giữa các vị khách quanh bàn tiệc, mỗi người một màu, và ai khép tam giác cùng màu mình thì thua. Capability này tả luật, máy chơi và màn hình chơi của game.

## ADDED Requirements

### Requirement: Bàn và người chơi

Tam giác cấm SHALL chơi được với đúng 2 người. Tuỳ chọn `guests` SHALL là 5, 6 (mặc định) hoặc 7 vị khách, đặt quanh bàn tròn và gọi bằng chữ A, B, C…; giữa mỗi cặp khách có một chỗ nối dây, nên bàn có 10, 15 hoặc 21 sợi dây. Ván bắt đầu chưa có dây nào; người thứ nhất (Đỏ) đi trước, người thứ hai là Xanh. Tuỳ chọn khác MUST bị từ chối với `invalid-options`.

#### Scenario: Ván mặc định

- **WHEN** một ván Tam giác cấm được tạo mà không truyền tuỳ chọn
- **THEN** bàn có 6 khách, 15 chỗ nối dây còn trống, và Đỏ đến lượt

#### Scenario: Số khách lạ

- **WHEN** ván được tạo với `guests` là 8
- **THEN** hệ thống từ chối với mã lỗi `invalid-options`

### Requirement: Nối dây

Mỗi lượt, người đến lượt SHALL nối đúng một sợi dây màu mình giữa hai vị khách chưa có dây với nhau, rồi lượt sang người kia. Nước nối giữa hai khách đã có dây, hay giữa một khách với chính họ, MUST không có trong các nước hợp lệ. Dây đã nối MUST NOT đổi màu hay bị gỡ.

#### Scenario: Lượt luân phiên

- **WHEN** Đỏ nối A–B ở đầu ván
- **THEN** A–B là dây đỏ, Xanh đến lượt, và A–B không còn trong các nước hợp lệ

### Requirement: Thua khi khép tam giác

Khi một người nối dây làm thành ba khách mà cả ba cạnh giữa họ là dây màu của người đó, người ấy SHALL thua ngay và người kia thắng. Tam giác có cạnh màu khác MUST NOT làm ai thua. Nước khép tam giác của chính mình vẫn là nước hợp lệ.

#### Scenario: Đỏ khép tam giác

- **WHEN** Đỏ đã có A–B và B–C, và Đỏ nối A–C
- **THEN** ván kết thúc, Xanh thắng, và tam giác thua là A–B–C

#### Scenario: Tam giác hai màu

- **WHEN** A–B và B–C là dây đỏ, và Xanh nối A–C
- **THEN** ván tiếp tục

### Requirement: Hoà khi hết dây

Khi mọi chỗ nối đã có dây mà không ai khép tam giác của mình, ván SHALL kết thúc hoà. Với 6 khách trở lên điều này MUST không xảy ra được (định lý Ramsey R(3,3) = 6), nên chỉ bàn 5 khách có thể hoà.

#### Scenario: Hoà ở bàn 5 khách

- **WHEN** ở bàn 5 khách, Đỏ nối năm cạnh của vòng A–B–C–D–E và Xanh nối năm đường chéo
- **THEN** ván kết thúc hoà

#### Scenario: Bàn 6 khách không hoà

- **WHEN** test cho hai người chơi ngẫu nhiên 1.000 ván ở bàn 6 khách
- **THEN** ván nào cũng có người thua trước khi hết dây

### Requirement: Máy chơi Tam giác cấm

Tam giác cấm SHALL chơi được với máy ở ba mức. Máy ở mọi mức MUST NOT nối dây khép tam giác của mình khi còn dây khác. Mức Vừa SHALL thấy trước một nước của đối thủ. Mức Khó SHALL tìm sâu nhất trong thời gian cho phép, tới hết ván ở bàn 5 khách; ở bàn 6 khách, khi đi sau, máy Khó MUST thắng người chơi ngẫu nhiên không tự thua.

#### Scenario: Không tự thua

- **WHEN** máy ở mức Dễ đến lượt và có dây nối được mà không khép tam giác của nó
- **THEN** máy nối một dây như thế

#### Scenario: Máy Khó đi sau ở bàn 6 khách

- **WHEN** test cho máy Khó cầm Xanh ở bàn 6 khách đấu với người chơi ngẫu nhiên không tự thua, 50 ván
- **THEN** máy thắng cả 50 ván

### Requirement: Hiển thị bàn

Bàn SHALL vẽ các vị khách thành vòng tròn, mỗi khách là một vòng có chữ của mình. Chỗ chưa nối hiện là đường mờ; dây đỏ là nét liền, dây xanh là nét đứt, để không chỉ dựa vào màu. Sợi dây vừa nối SHALL được đánh dấu. Khi ván kết thúc vì khép tam giác, tam giác thua SHALL được tô nổi.

#### Scenario: Dây hai màu khác nét

- **WHEN** bàn có một dây đỏ và một dây xanh
- **THEN** dây đỏ vẽ nét liền, dây xanh vẽ nét đứt, và chỗ chưa nối vẽ mờ hơn cả hai

#### Scenario: Tam giác thua tô nổi

- **WHEN** Đỏ vừa khép tam giác A–B–C
- **THEN** tam giác A–B–C được tô nổi trên bàn

### Requirement: Thao tác

Người chơi SHALL nối dây bằng cách chọn vị khách thứ nhất rồi vị khách thứ hai, bằng chạm, chuột hay bàn phím. Chọn lại vị khách đang chọn, hay bấm Esc, SHALL bỏ chọn. Bàn phím: mũi tên đi vòng quanh bàn, Enter hoặc Space chọn. Vị khách đã nối dây với mọi người khác MUST không chọn làm khách thứ nhất được; khi đã chọn khách thứ nhất, khách đã có dây với khách ấy MUST không chọn được.

#### Scenario: Nối bằng hai lần chạm

- **WHEN** Đỏ đến lượt, chạm khách A rồi khách C
- **THEN** A–C thành dây đỏ

#### Scenario: Bỏ chọn

- **WHEN** người chơi chọn khách A rồi bấm Esc
- **THEN** không khách nào đang được chọn và chưa có dây nào được nối

### Requirement: Cảnh báo nước tự thua

Khi người đến lượt ở thiết bị này đã chọn một vị khách, mỗi khách mà dây nối tới sẽ khép tam giác của người đó SHALL được đánh dấu nguy hiểm, bằng ký hiệu và chữ, không chỉ bằng màu. Chọn một khách như thế SHALL hỏi xác nhận trước khi nối; huỷ thì không có dây nào được nối.

#### Scenario: Xác nhận nước tự thua

- **WHEN** Đỏ có A–B và B–C, chọn A rồi chọn C
- **THEN** hệ thống hỏi xác nhận rằng nối A–C sẽ khép tam giác và thua
- **AND** nếu người chơi huỷ thì A–C vẫn chưa nối và Đỏ vẫn đến lượt

### Requirement: Dây an toàn trong bảng người chơi

Bảng người chơi SHALL ghi, cho từng người, số chỗ nối còn trống mà người đó nối được mà không khép tam giác của mình ("Còn 5 dây an toàn"). Khi số đó là 0 ở lượt của một người, dòng của người ấy SHALL nói rằng nước nào cũng thua.

#### Scenario: Đếm dây an toàn

- **WHEN** ở bàn 6 khách Đỏ có A–B và B–C, Xanh chưa có dây nào
- **THEN** bảng ghi Đỏ còn 12 dây an toàn và Xanh còn 13

### Requirement: Dùng được bằng trình đọc màn hình

Mỗi vị khách SHALL là một nút có tên đọc được, nêu chữ của khách và các dây đã nối với khách ấy theo màu. Khi đã chọn khách thứ nhất, tên của khách khác SHALL nói nối tới đó là an toàn, sẽ khép tam giác, hay đã có dây. Lượt, nước đi và kết quả SHALL được đọc qua vùng thông báo của màn hình chơi.

#### Scenario: Tên của khách khi đã chọn khách thứ nhất

- **WHEN** Đỏ có A–B và B–C, và Đỏ đã chọn A
- **THEN** nút của khách C có tên nói nối A–C sẽ khép tam giác đỏ A–B–C

### Requirement: Dùng được trên điện thoại

Ở khung rộng 360 px, bàn 7 khách SHALL vừa màn hình, không cuộn ngang, và mỗi vị khách SHALL có vùng chạm ít nhất 44 × 44 px.

#### Scenario: Bàn 7 khách trên điện thoại

- **WHEN** người chơi mở ván 7 khách trên màn hình rộng 360 px
- **THEN** cả bàn nằm trong màn hình, trang không cuộn ngang, và mỗi vị khách có vùng chạm từ 44 × 44 px

### Requirement: Đọc nước đi và kết quả

Nước đi SHALL được đọc là "nối A–C". Khi ván kết thúc vì khép tam giác, dòng dưới kết quả SHALL nêu người thua và tam giác ("Đỏ khép tam giác A–B–C."). Khi hoà, dòng ấy SHALL nói đã nối hết dây mà không ai khép tam giác.

#### Scenario: Kết quả khi khép tam giác

- **WHEN** Xanh khép tam giác B–D–E
- **THEN** thẻ kết quả ghi Đỏ thắng và dòng dưới ghi "Xanh khép tam giác B–D–E."
