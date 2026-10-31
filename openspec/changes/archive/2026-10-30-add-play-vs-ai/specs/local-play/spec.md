# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
