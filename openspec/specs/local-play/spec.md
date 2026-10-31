# local-play Specification

## Purpose

Chơi cùng máy: hai hoặc nhiều người thay phiên trên cùng một thiết bị, với màn hình ván dùng chung cho mọi game — báo lượt, đi quân, báo kết quả, hoàn tác/làm lại, ván mới và tự lưu ván đang dở trên trình duyệt.

## Requirements

### Requirement: Mở màn hình chơi theo mã game

Hệ thống SHALL mở màn hình chơi cùng máy của một game tại `/play/<mã game>/local`; `/play/<mã game>` là màn hình bắt đầu ván (capability `game-setup`). Mã game hay chế độ chơi không tồn tại, và mọi đường dẫn không có trang (ví dụ `/play`), MUST hiện trang "không tìm thấy" bằng ngôn ngữ đang dùng, có lối về menu. Nếu không tải được phần chơi của game (mất mạng, tab cũ sau khi app cập nhật), hệ thống MUST hiện trang báo lỗi đã dịch có nút thử lại và lối về menu.

#### Scenario: Mở game có thật

- **WHEN** người chơi mở `/play/tictactoe/local`
- **THEN** màn hình chơi cùng máy Tic-tac-toe hiện ra với bàn cờ

#### Scenario: Mã game không tồn tại

- **WHEN** người chơi mở `/play/khong-co-game-nay` hoặc `/play/khong-co-game-nay/local`
- **THEN** trang "không tìm thấy" hiện ra kèm lối về menu

#### Scenario: Chế độ chơi không tồn tại

- **WHEN** người chơi mở `/play/tictactoe/khong-co-che-do-nay`
- **THEN** trang "không tìm thấy" hiện ra kèm lối về menu

#### Scenario: Đường dẫn không có trang

- **WHEN** người chơi mở `/play`
- **THEN** trang "không tìm thấy" bằng tiếng Việt hiện ra kèm lối về menu

#### Scenario: Không tải được game rồi thử lại

- **WHEN** phần chơi của game không tải được và người chơi chọn "Thử lại" khi đã có mạng
- **THEN** game được tải lại và màn hình chơi hiện ra, không cần tải lại cả trang

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

#### Scenario: Ô trống không chọn được trông khác ô chọn được

- **WHEN** ván Tic-tac-toe đã kết thúc mà bàn còn ô trống
- **THEN** các ô trống đó hiển thị khác ô trống chọn được (viền đứt, nền nhạt), không cần di chuột tới, nên trên màn hình cảm ứng cũng nhận ra

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

#### Scenario: Nhiều người cùng thắng

- **WHEN** ván kết thúc với hai người thắng là X và O
- **THEN** màn hình nêu cả hai theo cách liệt kê của ngôn ngữ đang dùng: "X và O thắng!" (tiếng Việt), "X and O win!" (tiếng Anh)

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

Sau mỗi thay đổi của ván (đi, hoàn tác, làm lại), ván cùng máy đang dở SHALL được lưu trên trình duyệt đó, mỗi game một ván cùng máy, riêng với ván đấu với máy của cùng game. Mở lại màn hình chơi cùng máy của game đó SHALL khôi phục đúng bàn, lượt và lịch sử để hoàn tác; các nước đã hoàn tác thì không cần giữ. Ván đã kết thúc MUST NOT được giữ lại hay khôi phục. Khi không đọc được ván đã lưu (bộ nhớ trình duyệt tạm lỗi hoặc không trả lời), ván mới MUST NOT ghi đè lên ván đó.

#### Scenario: Tải lại trang giữa ván

- **WHEN** ván Tic-tac-toe đang có 4 nước đi và người chơi tải lại trang
- **THEN** bàn hiện đúng 4 nước đó, đúng người đến lượt, và nút hoàn tác bấm được

#### Scenario: Ván đã kết thúc không được giữ

- **WHEN** ván vừa kết thúc và người chơi rời màn hình rồi mở lại game đó
- **THEN** một ván mới với bàn trống được bắt đầu

#### Scenario: Ván đã kết thúc còn sót trên trình duyệt

- **WHEN** trình duyệt vẫn giữ một ván đã kết thúc (lần xoá trước bị lỗi) và người chơi mở game đó
- **THEN** một ván mới với bàn trống được bắt đầu và ván đã kết thúc bị xoá, nên menu không còn liệt kê nó trong "Tiếp tục ván dở"

#### Scenario: Không đọc được ván đã lưu

- **WHEN** trình duyệt báo lỗi khi đọc ván dở của Tic-tac-toe và người chơi đi vài nước trong ván mới
- **THEN** ván dở đã lưu vẫn còn nguyên, không bị ván mới ghi đè

#### Scenario: Bộ nhớ trình duyệt không trả lời

- **WHEN** bộ nhớ trình duyệt không trả lời khi mở màn hình chơi cùng máy của Tic-tac-toe, và người chơi đi vài nước
- **THEN** sau 3 giây một ván mới bắt đầu, và ván dở đã lưu không bị ván mới ghi đè

### Requirement: Dữ liệu lưu không đọc được

Nếu dữ liệu ván dở đã lưu không đọc được (hỏng, sai định dạng, của phiên bản cũ không còn hỗ trợ), hệ thống SHALL bỏ dữ liệu đó và bắt đầu ván mới, MUST NOT báo lỗi chặn người chơi. Dữ liệu do một phiên bản mới hơn của app ghi (tab cũ còn mở, hoặc app bị quay về bản trước) MUST được giữ nguyên: không xoá, không ghi đè; người chơi vẫn chơi được ván mới nhưng ván đó không được lưu.

#### Scenario: Dữ liệu lưu bị hỏng

- **WHEN** dữ liệu ván dở của Tic-tac-toe trên trình duyệt bị hỏng và người chơi mở game
- **THEN** một ván mới với bàn trống được bắt đầu và không có thông báo lỗi
- **AND** dữ liệu hỏng bị xoá khỏi trình duyệt

#### Scenario: Dữ liệu của phiên bản mới hơn

- **WHEN** ván dở của Tic-tac-toe được lưu bằng định dạng của một phiên bản mới hơn và người chơi mở game ở bản cũ rồi đi một nước
- **THEN** một ván mới được bắt đầu và dữ liệu đã lưu vẫn còn nguyên

### Requirement: Dùng được bằng bàn phím và trình đọc màn hình

Mọi vị trí chọn được trên bàn cờ và mọi nút SHALL dùng được bằng bàn phím. Đi một nước bằng bàn phím MUST NOT làm mất tiêu điểm khỏi bàn cờ, và bấm một nút bằng bàn phím MUST NOT làm mất tiêu điểm khỏi nút đó, kể cả khi nút vừa trở thành không bấm được. Mỗi vị trí trên bàn SHALL có tên đọc được gồm vị trí và nội dung (ví dụ "Hàng 1, cột 2, trống"). Thay đổi lượt và kết quả ván SHALL được trình đọc màn hình thông báo.

#### Scenario: Đi quân bằng bàn phím

- **WHEN** người chơi dùng phím Tab tới ô giữa và nhấn Enter
- **THEN** quân của người đang đến lượt được đặt vào ô giữa

#### Scenario: Tiêu điểm ở lại trên bàn sau khi đi quân

- **WHEN** người chơi đặt quân vào ô giữa bằng phím Enter
- **THEN** tiêu điểm bàn phím vẫn ở ô giữa và ô đó được đọc là có quân X
- **AND** nhấn Tab tiếp thì tiêu điểm chuyển sang ô kế tiếp trên bàn

#### Scenario: Tiêu điểm ở lại trên nút hoàn tác khi hết nước

- **WHEN** người chơi dùng phím Enter trên nút "Hoàn tác" cho tới khi không còn nước nào để hoàn tác
- **THEN** nút "Hoàn tác" không bấm được nữa nhưng tiêu điểm bàn phím vẫn ở trên nút đó

#### Scenario: Tên đọc được của ô

- **WHEN** trình đọc màn hình đọc ô hàng 1, cột 2 đang có quân X
- **THEN** tên đọc được của ô cho biết hàng 1, cột 2 và quân X

### Requirement: Ván cùng máy lưu ở bản trước

Ván cùng máy đang dở do bản trước của app lưu SHALL tiếp tục được tại `/play/<mã game>/local` và SHALL hiện trong mọi danh sách ván dở (menu, màn hình bắt đầu ván) ngay lần đầu mở app sau khi cập nhật. Sau khi ván đó đã bị thay bằng ván mới hoặc đã kết thúc, nó MUST NOT hiện lại; riêng khi không chuyển được ván đó (bộ nhớ trình duyệt tạm lỗi), nó MUST NOT bị xoá mà chờ lần mở sau. Dữ liệu do phiên bản mới hơn của app ghi MUST được giữ nguyên như requirement "Dữ liệu lưu không đọc được".

#### Scenario: Ván cùng máy lưu ở bản trước

- **WHEN** trình duyệt giữ một ván Tic-tac-toe cùng máy đang dở do bản trước của app lưu, và người chơi mở `/play/tictactoe/local`
- **THEN** ván đó được khôi phục đúng bàn và lượt

#### Scenario: Ván lưu ở bản trước hiện trên menu

- **WHEN** trình duyệt giữ một ván Tic-tac-toe cùng máy đang dở do bản trước của app lưu, và người chơi mở menu
- **THEN** mục "Tiếp tục ván dở" có "Tic-tac-toe · Cùng máy"

#### Scenario: Ván lưu ở bản trước không sống lại

- **WHEN** trình duyệt giữ một ván Tic-tac-toe cùng máy do bản trước của app lưu, người chơi bắt đầu một ván cùng máy mới, chơi tới khi kết thúc rồi quay về menu
- **THEN** menu không có mục "Tic-tac-toe · Cùng máy" trong "Tiếp tục ván dở"

#### Scenario: Không chuyển được ván lưu ở bản trước

- **WHEN** trình duyệt giữ một ván Tic-tac-toe cùng máy do bản trước của app lưu, bộ nhớ trình duyệt báo lỗi khi ghi lúc mở app, và người chơi bắt đầu một ván cùng máy mới
- **THEN** ván lưu ở bản trước vẫn còn trên trình duyệt, để lần mở sau chuyển và liệt kê nó
