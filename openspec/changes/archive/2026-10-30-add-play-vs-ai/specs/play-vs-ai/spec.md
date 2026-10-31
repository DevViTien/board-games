# Spec Delta

## Purpose

Đấu với máy trên màn hình chơi dùng chung: máy tự đi khi tới lượt mà giao diện không bị đứng, lượt và kết quả nói theo "bạn" và "máy", hoàn tác lùi về lượt của người chơi, và ván với máy được lưu riêng để tiếp tục sau.

## ADDED Requirements

### Requirement: Mở màn hình đấu với máy

Hệ thống SHALL mở màn hình đấu với máy của một game tại `/play/<mã game>/ai`: bắt đầu ván mới theo lựa chọn khi đến từ nút "Bắt đầu" của màn hình bắt đầu ván, còn không thì tiếp tục ván đấu với máy đã lưu của game đó. Mở đường dẫn này khi chưa có ván đã lưu SHALL bắt đầu ván với lựa chọn gần nhất của game (capability `game-setup`), chưa có thì mức Vừa, người chơi đi trước. Game không hỗ trợ đấu với máy MUST hiện trang "không tìm thấy".

#### Scenario: Mở thẳng đường dẫn khi chưa có ván

- **WHEN** người chơi chưa có ván Tic-tac-toe đấu với máy nào, chưa từng bấm "Bắt đầu" ở màn hình bắt đầu ván Tic-tac-toe, và mở `/play/tictactoe/ai`
- **THEN** một ván đấu với máy mức Vừa bắt đầu và đến lượt người chơi

#### Scenario: Mở thẳng đường dẫn dùng lựa chọn gần nhất

- **WHEN** lần gần nhất người chơi bắt đầu ván Tic-tac-toe đấu với máy ở mức Khó, ván đó đã kết thúc, và người chơi mở `/play/tictactoe/ai`
- **THEN** một ván đấu với máy mức Khó bắt đầu

### Requirement: Máy tự đi khi tới lượt

Khi tới lượt của máy, máy SHALL tự chọn và đi một nước hợp lệ theo mức độ của ván mà người chơi không phải làm gì. Trong lúc chờ, bàn cờ MUST không cho chọn nước nào và màn hình SHALL báo máy đang nghĩ. Nước của máy SHALL hiện ra sau ít nhất 0,3 giây để người chơi kịp thấy, và trong vòng 2 giây kể từ khi tới lượt máy.

#### Scenario: Máy đáp lại sau nước của người chơi

- **WHEN** người chơi đặt quân trong ván đấu với máy
- **THEN** màn hình báo máy đang nghĩ và bàn không cho chọn ô nào
- **AND** trong vòng 2 giây máy đặt một quân vào ô trống và lại đến lượt người chơi

#### Scenario: Máy đi trước

- **WHEN** ván đấu với máy bắt đầu với máy đi trước
- **THEN** máy tự đặt quân đầu tiên mà người chơi không phải làm gì

### Requirement: Giao diện không bị đứng khi máy nghĩ

Máy SHALL nghĩ ngoài luồng giao diện, nên trong lúc máy nghĩ người chơi vẫn dùng được các nút và liên kết khác trên trang. Nếu không chạy được phần nghĩ riêng đó hoặc phần nghĩ gặp lỗi, máy MUST vẫn đi một nước hợp lệ, và ván MUST NOT bị kẹt ở lượt máy.

#### Scenario: Về menu trong lúc máy nghĩ

- **WHEN** máy đang nghĩ và người chơi chọn "Về menu"
- **THEN** menu mở ra ngay, không chờ máy nghĩ xong

#### Scenario: Phần nghĩ của máy gặp lỗi

- **WHEN** tới lượt máy và phần nghĩ của máy báo lỗi
- **THEN** máy vẫn đặt một quân vào ô trống và lại đến lượt người chơi

### Requirement: Báo lượt và kết quả theo bạn và máy

Trong ván đấu với máy, màn hình SHALL nói lượt và kết quả theo người chơi và máy, kèm ký hiệu của người chơi: "Đến lượt bạn (X)", "Máy đang nghĩ…", "Bạn thắng!", "Máy thắng!", "Hoà!". Khi tới lượt người chơi sau nước của máy, màn hình SHALL nói cả ô máy vừa đánh, và ô đó SHALL được đánh dấu là nước vừa đi cho cả mắt nhìn lẫn trình đọc màn hình. Những thay đổi này SHALL được trình đọc màn hình thông báo như trong chế độ cùng máy.

#### Scenario: Người chơi thắng

- **WHEN** người chơi tạo được ba quân thẳng hàng trước máy mức Dễ
- **THEN** màn hình báo "Bạn thắng!"

#### Scenario: Máy thắng

- **WHEN** máy tạo được ba quân thẳng hàng
- **THEN** màn hình báo "Máy thắng!"

#### Scenario: Báo nước máy vừa đi

- **WHEN** người chơi cầm X đặt quân và máy đáp vào ô hàng 2, cột 3
- **THEN** màn hình báo "Máy đánh hàng 2, cột 3. Đến lượt bạn (X)"
- **AND** ô hàng 2, cột 3 được đánh dấu là nước vừa đi

### Requirement: Hiện chế độ và mức độ của ván

Màn hình đấu với máy SHALL ghi chế độ và mức độ của ván cạnh tên game, cùng cách ghi với menu (ví dụ "Với máy · Khó").

#### Scenario: Mức độ hiện trên màn hình chơi

- **WHEN** người chơi bắt đầu một ván Tic-tac-toe đấu với máy mức Khó
- **THEN** màn hình chơi ghi "Với máy · Khó"

### Requirement: Hoàn tác và làm lại khi đấu với máy

Hoàn tác trong ván đấu với máy SHALL lùi về lượt trước đó của người chơi: bỏ nước đáp của máy (nếu có) và nước gần nhất của người chơi. Nút hoàn tác MUST không bấm được khi chưa có nước nào của người chơi. Làm lại SHALL đi lại cả nước của người chơi và nước đáp của máy đã bị hoàn tác. Hoàn tác trong lúc máy đang nghĩ SHALL bỏ nước máy đang nghĩ và lùi nước vừa đi của người chơi.

#### Scenario: Hoàn tác bỏ cả nước của máy

- **WHEN** người chơi đã đi 2 nước và máy đã đáp 2 nước, rồi người chơi bấm hoàn tác
- **THEN** bàn còn 1 nước của người chơi và 1 nước của máy, và đến lượt người chơi

#### Scenario: Máy đi trước thì chưa hoàn tác được

- **WHEN** máy vừa đi nước đầu tiên và người chơi chưa đi nước nào
- **THEN** nút hoàn tác không bấm được

#### Scenario: Hoàn tác trong lúc máy nghĩ

- **WHEN** người chơi vừa đặt quân và bấm hoàn tác trong lúc màn hình còn báo máy đang nghĩ
- **THEN** quân vừa đặt biến mất, máy không đi nước đó nữa và lại đến lượt người chơi

#### Scenario: Làm lại cả nước của máy

- **WHEN** người chơi vừa hoàn tác một lượt gồm nước của mình và nước đáp của máy, rồi bấm làm lại
- **THEN** cả hai nước đó hiện lại và đến lượt người chơi

### Requirement: Ván dở khi đấu với máy

Một ván đấu với máy SHALL chỉ được coi là ván dở (được liệt kê ở "Tiếp tục ván dở", cần xác nhận trước khi bỏ) khi chưa kết thúc và người chơi đã đi ít nhất một nước còn hiệu lực. Ván mà chỉ máy đã đi MUST NOT được liệt kê như ván dở hay làm hệ thống hỏi xác nhận.

#### Scenario: Chỉ máy đã đi thì chưa phải ván dở

- **WHEN** máy vừa đi nước đầu tiên, người chơi chưa đi nước nào và quay về menu
- **THEN** menu không liệt kê ván đó trong "Tiếp tục ván dở"

#### Scenario: Ván mới khi chỉ máy đã đi

- **WHEN** máy vừa đi nước đầu tiên, người chơi chưa đi nước nào và chọn "Ván mới"
- **THEN** ván mới bắt đầu ngay, không hỏi xác nhận

### Requirement: Ván mới khi đấu với máy

"Ván mới" trong ván đấu với máy SHALL bắt đầu ván mới với cùng mức độ và cùng người đi trước (với "Ngẫu nhiên" thì quyết định lại, kể cả sau khi tải lại trang), và hỏi xác nhận khi ván đang dở như chế độ cùng máy. Nước máy đang nghĩ cho ván cũ MUST NOT được đi vào ván mới.

#### Scenario: Ván mới giữ mức độ

- **WHEN** ván đấu với máy mức Khó vừa kết thúc và người chơi chọn "Ván mới"
- **THEN** một ván mới mức Khó bắt đầu, không hỏi xác nhận

#### Scenario: Ván mới quyết định lại người đi trước ngẫu nhiên

- **WHEN** ván được bắt đầu với người đi trước "Ngẫu nhiên", người chơi tải lại trang rồi chọn "Ván mới" nhiều lần
- **THEN** có ván mới người chơi đi trước và có ván mới máy đi trước

#### Scenario: Ván mới trong lúc máy nghĩ

- **WHEN** máy đang nghĩ và người chơi chọn "Ván mới" rồi đồng ý
- **THEN** ván mới bắt đầu với bàn trống, không có quân nào của nước máy đang nghĩ

#### Scenario: Máy kết thúc ván trong lúc đang hỏi xác nhận

- **WHEN** người chơi chọn "Ván mới" trong lúc máy nghĩ, và nước của máy kết thúc ván trước khi người chơi trả lời
- **THEN** câu hỏi xác nhận đóng lại, vì không còn ván dở nào để bỏ

### Requirement: Lưu và khôi phục ván với máy

Ván đấu với máy SHALL được lưu trên trình duyệt ngay từ khi bắt đầu và sau mỗi thay đổi, riêng với ván cùng máy của cùng game, kèm mức độ, bên của người chơi và lựa chọn người đi trước. Mở lại SHALL khôi phục đúng bàn, lượt, mức độ và bên của người chơi; nếu tới lượt máy thì máy đi tiếp. Ván đã kết thúc MUST NOT được giữ lại. Các quy tắc về dữ liệu không đọc được của chế độ cùng máy SHALL áp dụng như nhau.

#### Scenario: Tải lại giữa ván với máy

- **WHEN** người chơi đang đấu với máy mức Khó ở bên O, đã có 3 nước, và tải lại trang
- **THEN** bàn hiện đúng 3 nước đó, người chơi vẫn là O và màn hình vẫn ghi "Với máy · Khó"

#### Scenario: Tải lại trước nước đầu

- **WHEN** người chơi bắt đầu ván đấu với máy mức Khó, người chơi đi trước, và tải lại trang trước khi đi nước nào
- **THEN** ván vẫn ở mức Khó và đến lượt người chơi

#### Scenario: Ván với máy và ván cùng máy tồn tại cùng lúc

- **WHEN** người chơi có một ván cùng máy đang dở rồi bắt đầu và chơi dở một ván đấu với máy của cùng game
- **THEN** cả hai ván đều còn và mỗi ván mở lại đúng chế độ của nó
