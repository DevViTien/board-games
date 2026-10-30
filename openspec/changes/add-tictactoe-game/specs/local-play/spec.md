# Spec Delta

## Purpose

Chơi cùng máy: hai hoặc nhiều người thay phiên trên cùng một thiết bị, với màn hình ván dùng chung cho mọi game — báo lượt, đi quân, báo kết quả, hoàn tác/làm lại, ván mới và tự lưu ván đang dở trên trình duyệt.

## ADDED Requirements

### Requirement: Mở màn hình chơi theo mã game

Hệ thống SHALL mở màn hình chơi của một game tại đường dẫn `/play/<mã game>`. Mã game không tồn tại MUST hiện trang "không tìm thấy" có lối về menu.

#### Scenario: Mở game có thật

- **WHEN** người chơi mở `/play/tictactoe`
- **THEN** màn hình chơi Tic-tac-toe hiện ra với bàn cờ

#### Scenario: Mã game không tồn tại

- **WHEN** người chơi mở `/play/khong-co-game-nay`
- **THEN** trang "không tìm thấy" hiện ra kèm lối về menu

### Requirement: Báo lượt

Khi ván chưa kết thúc, màn hình SHALL luôn cho biết người đang đến lượt bằng ký hiệu hoặc tên của người đó trong game (với Tic-tac-toe là X hoặc O).

#### Scenario: Lượt đổi sau mỗi nước

- **WHEN** X vừa đặt quân
- **THEN** màn hình báo đến lượt O

### Requirement: Chỉ chọn được nước đi hợp lệ

Trên bàn cờ, người chơi SHALL chỉ chọn được những nước đi hợp lệ của người đang đến lượt; vị trí không phải nước đi hợp lệ MUST không phản hồi khi bấm và được hiển thị là không chọn được.

#### Scenario: Ô đã có quân không chọn được

- **WHEN** người chơi bấm vào một ô Tic-tac-toe đã có quân
- **THEN** không có gì thay đổi

### Requirement: Báo kết quả

Khi ván kết thúc, màn hình SHALL báo người thắng hoặc hoà, khoá bàn cờ không cho đi tiếp, và đưa ra hai lối: "Ván mới" và "Về menu".

#### Scenario: Có người thắng

- **WHEN** X tạo được ba quân thẳng hàng
- **THEN** màn hình báo X thắng
- **AND** không ô nào trên bàn còn chọn được
- **AND** có nút "Ván mới" và lối "Về menu"

#### Scenario: Hoà

- **WHEN** ván Tic-tac-toe đầy bàn mà không ai thắng
- **THEN** màn hình báo hoà

### Requirement: Hoàn tác và làm lại khi chơi cùng máy

Màn hình SHALL có nút hoàn tác và làm lại, chỉ bấm được khi có nước để hoàn tác hoặc làm lại. Hoàn tác được cả nước đi đã kết thúc ván; khi đó ván tiếp tục từ trước nước đó.

#### Scenario: Nút ở đầu ván

- **WHEN** ván chưa có nước đi nào
- **THEN** nút hoàn tác và nút làm lại đều không bấm được

#### Scenario: Hoàn tác nước thắng

- **WHEN** X vừa thắng và người chơi bấm hoàn tác
- **THEN** quân vừa đặt biến mất, ván chưa kết thúc và lại đến lượt X

### Requirement: Ván mới

Người chơi SHALL bắt đầu ván mới bất cứ lúc nào. Nếu ván hiện tại đang dở (đã có nước đi và chưa kết thúc), hệ thống MUST hỏi xác nhận trước; huỷ thì giữ nguyên ván hiện tại.

#### Scenario: Ván mới khi đang dở cần xác nhận

- **WHEN** ván đang có 3 nước đi và người chơi chọn "Ván mới"
- **THEN** hệ thống hỏi xác nhận
- **AND** nếu người chơi huỷ thì bàn vẫn giữ 3 nước đi đó

#### Scenario: Ván mới sau khi kết thúc không cần xác nhận

- **WHEN** ván đã kết thúc và người chơi chọn "Ván mới"
- **THEN** bàn trống ngay, không hỏi xác nhận

### Requirement: Tự lưu và khôi phục ván dở

Sau mỗi thay đổi của ván (đi, hoàn tác, làm lại), ván đang dở SHALL được lưu trên trình duyệt đó, mỗi game một ván. Mở lại màn hình chơi của game đó SHALL khôi phục đúng bàn, lượt và lịch sử để hoàn tác; các nước đã hoàn tác thì không cần giữ. Ván đã kết thúc MUST NOT được giữ lại.

#### Scenario: Tải lại trang giữa ván

- **WHEN** ván Tic-tac-toe đang có 4 nước đi và người chơi tải lại trang
- **THEN** bàn hiện đúng 4 nước đó, đúng người đến lượt, và nút hoàn tác bấm được

#### Scenario: Ván đã kết thúc không được giữ

- **WHEN** ván vừa kết thúc và người chơi rời màn hình rồi mở lại game đó
- **THEN** một ván mới với bàn trống được bắt đầu

### Requirement: Dữ liệu lưu không đọc được

Nếu dữ liệu ván dở đã lưu không đọc được (hỏng, sai định dạng, của phiên bản cũ không còn hỗ trợ), hệ thống SHALL bỏ dữ liệu đó và bắt đầu ván mới, MUST NOT báo lỗi chặn người chơi.

#### Scenario: Dữ liệu lưu bị hỏng

- **WHEN** dữ liệu ván dở của Tic-tac-toe trên trình duyệt bị hỏng và người chơi mở game
- **THEN** một ván mới với bàn trống được bắt đầu và không có thông báo lỗi

### Requirement: Dùng được bằng bàn phím và trình đọc màn hình

Mọi vị trí chọn được trên bàn cờ và mọi nút SHALL dùng được bằng bàn phím, và đi một nước bằng bàn phím MUST NOT làm mất tiêu điểm khỏi bàn cờ. Mỗi vị trí trên bàn SHALL có tên đọc được gồm vị trí và nội dung (ví dụ "Hàng 1, cột 2, trống"). Thay đổi lượt và kết quả ván SHALL được trình đọc màn hình thông báo.

#### Scenario: Đi quân bằng bàn phím

- **WHEN** người chơi dùng phím Tab tới ô giữa và nhấn Enter
- **THEN** quân của người đang đến lượt được đặt vào ô giữa

#### Scenario: Tiêu điểm ở lại trên bàn sau khi đi quân

- **WHEN** người chơi đặt quân vào ô giữa bằng phím Enter
- **THEN** tiêu điểm bàn phím vẫn ở ô giữa và ô đó được đọc là có quân X
- **AND** nhấn Tab tiếp thì tiêu điểm chuyển sang ô kế tiếp trên bàn

#### Scenario: Tên đọc được của ô

- **WHEN** trình đọc màn hình đọc ô hàng 1, cột 2 đang có quân X
- **THEN** tên đọc được của ô cho biết hàng 1, cột 2 và quân X
