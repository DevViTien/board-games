## MODIFIED Requirements

### Requirement: Tuỳ chọn luật của ván

Ván SHALL chơi theo tuỳ chọn luật chọn lúc bắt đầu. "Ván mới" SHALL giữ tuỳ chọn của ván đang chơi, trừ khi người chơi đổi (capability `new-game-options`); tải lại SHALL khôi phục cả tuỳ chọn. Mở thẳng màn hình chơi khi chưa có ván SHALL dùng tuỳ chọn nhớ gần nhất của game (capability `game-setup`). Đường dẫn bắt đầu ván mang tuỳ chọn không hợp lệ SHALL bị bỏ qua như đường dẫn có giá trị sai khác. Với game có tuỳ chọn, màn hình chơi SHALL ghi tuỳ chọn ở đầu phần nội dung, ngoài thanh trên cùng.

#### Scenario: Màn hình chơi ghi luật

- **WHEN** người chơi bắt đầu một ván Cờ caro cùng máy 19×19 luật "tự do"
- **THEN** màn hình chơi ghi "19×19 · Tự do" ở đầu phần nội dung, không nằm trên thanh trên cùng

#### Scenario: Ván mới giữ tuỳ chọn

- **WHEN** ván Cờ caro cùng máy 19×19 vừa kết thúc và người chơi chọn "Ván mới"
- **THEN** ván mới có bàn 19×19 trống và vẫn dùng luật của ván trước

#### Scenario: Tải lại giữ tuỳ chọn

- **WHEN** ván Cờ caro cùng máy 19×19 luật "tự do" đang có 5 nước và người chơi tải lại trang
- **THEN** bàn 19×19 hiện đúng 5 nước đó và màn hình vẫn ghi "19×19 · Tự do"

#### Scenario: Tải lại ngay sau Ván mới

- **WHEN** người chơi chọn "Ván mới" trong ván Cờ caro cùng máy 19×19 luật "tự do" rồi tải lại trang khi bàn còn trống, trong khi lựa chọn nhớ gần nhất là bàn 15×15
- **THEN** bàn 19×19 trống hiện lại, màn hình vẫn ghi "19×19 · Tự do", và "Tiếp tục ván dở" không liệt kê ván trống đó

#### Scenario: Mở thẳng đường dẫn dùng tuỳ chọn gần nhất

- **WHEN** lần gần nhất người chơi bắt đầu Cờ caro với bàn 19×19, không có ván cùng máy nào đang dở, và người chơi mở `/play/caro/local`
- **THEN** một ván cùng máy mới bắt đầu với bàn 19×19

#### Scenario: Tuỳ chọn sai trên đường dẫn

- **WHEN** người chơi có một ván Cờ caro cùng máy đang dở và mở đường dẫn bắt đầu ván mới với kích thước bàn 17
- **THEN** ván dở được tiếp tục, không có ván mới nào ghi đè lên nó
