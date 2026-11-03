## ADDED Requirements

### Requirement: Đấu với nhiều máy

Ván đấu với máy N người SHALL gồm một người chơi và máy ở mọi ghế còn lại, cùng mức đã chọn; các máy SHALL tự đi lần lượt tới khi đến lượt người chơi. Ai đi trước "Tôi" SHALL cho người chơi đi đầu, "Máy" SHALL cho một máy đi đầu và người chơi đi thứ hai. "Ván mới" SHALL giữ số người, mức độ và cách chọn người đi trước.

#### Scenario: Một người và ba máy

- **WHEN** người chơi bắt đầu một ván 4 người đấu với máy mức Dễ, người chơi đi trước, và đi một nước
- **THEN** ba máy lần lượt tự đi, mỗi máy một lượt, rồi lại đến lượt người chơi

#### Scenario: Máy đi trước trong ván 3 người

- **WHEN** người chơi bắt đầu một ván 3 người đấu với máy, người đi trước "Máy"
- **THEN** một máy tự đi nước đầu tiên, rồi đến lượt người chơi

#### Scenario: Ván mới giữ số người và mức độ

- **WHEN** ván 4 người đấu với máy mức Khó vừa kết thúc và người chơi chọn "Ván mới"
- **THEN** một ván mới 4 người với ba máy mức Khó bắt đầu

#### Scenario: Tải lại giữa ván nhiều máy

- **WHEN** người chơi đang đấu ván 3 người với máy và tải lại trang
- **THEN** ván hiện lại với người chơi ở đúng ghế cũ và hai ghế máy

### Requirement: Báo lượt và kết quả khi có nhiều máy

Khi ván có từ hai ghế máy trở lên, mọi lời báo về máy (máy đang nghĩ, máy vừa đi, máy thắng) SHALL nêu thêm tên ghế của máy đó theo cách gọi của game. Mỗi nước của máy SHALL được nêu trong lời báo, kể cả khi lượt kế tiếp vẫn là máy, để người không nhìn bàn biết mọi nước (nhất là khi quân của mình bị bắt). Ván chỉ có một ghế máy, máy và người đi luân phiên, MUST giữ nguyên các lời báo hiện có.

#### Scenario: Báo máy nào đang nghĩ

- **WHEN** trong ván có ba máy, đến lượt máy ở ghế tên "Xanh dương"
- **THEN** màn hình báo "Máy (Xanh dương) đang nghĩ…"

#### Scenario: Báo từng nước của máy

- **WHEN** trong ván có ba máy, máy "Xanh dương" vừa đi một nước và tới lượt máy "Vàng"
- **THEN** lời báo nêu nước máy "Xanh dương" vừa đi và máy "Vàng" đang nghĩ

#### Scenario: Báo máy nào thắng

- **WHEN** trong ván có ba máy, máy ở ghế tên "Vàng" thắng
- **THEN** màn hình báo "Máy (Vàng) thắng!"

#### Scenario: Một máy giữ lời báo cũ

- **WHEN** trong ván Tic-tac-toe đấu với máy, đến lượt máy
- **THEN** màn hình báo "Máy đang nghĩ…"

### Requirement: Nhịp máy sau kết quả ngẫu nhiên

Trong game có yếu tố ngẫu nhiên, nước của máy MUST NOT hiện ra trước khi hiệu ứng của nước trước đó trên bàn kết thúc; ngay sau một nước có kết quả ngẫu nhiên (một lần gieo, của người hay của máy), nước của máy SHALL hiện ra muộn hơn nữa để người chơi kịp thấy kết quả, và vẫn trong vòng 2 giây kể từ khi tới lượt máy. Game không có yếu tố ngẫu nhiên MUST giữ nhịp cũ.

#### Scenario: Máy không đi ngay sau khi gieo

- **WHEN** máy vừa gieo xúc xắc và vẫn đến lượt máy chọn nước
- **THEN** nước tiếp theo của máy không hiện ra trước khi hết thời gian chờ dành cho kết quả ngẫu nhiên, và hiện ra trong vòng 2 giây

#### Scenario: Máy không cắt hiệu ứng đi quân

- **WHEN** trong ván có xúc xắc, người chơi vừa đi một quân và tới lượt máy gieo
- **THEN** lần gieo của máy không hiện ra trước khi hiệu ứng đi quân của người chơi kết thúc

#### Scenario: Nhịp cũ cho game không ngẫu nhiên

- **WHEN** người chơi đặt quân trong ván Tic-tac-toe đấu với máy
- **THEN** quân của máy có thể hiện ra ngay sau 0,3 giây như trước

## MODIFIED Requirements

### Requirement: Báo lượt và kết quả theo bạn và máy

Trong ván đấu với máy, màn hình SHALL nói lượt và kết quả theo người chơi và máy, kèm ký hiệu của người chơi: "Đến lượt bạn (X)", "Máy đang nghĩ…", "Bạn thắng!", "Máy thắng!", "Hoà!". Khi tới lượt người chơi sau nước của máy, màn hình SHALL nói cả nước máy vừa đi theo cách gọi của game (ô vừa đánh, lần gieo…), và nước đó SHALL được đánh dấu là nước vừa đi cho cả mắt nhìn lẫn trình đọc màn hình. Những thay đổi này SHALL được trình đọc màn hình thông báo như trong chế độ cùng máy.

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

### Requirement: Hoàn tác và làm lại khi đấu với máy

Hoàn tác trong ván đấu với máy SHALL lùi về lượt trước đó của người chơi: bỏ nước đáp của máy (nếu có) và nước gần nhất của người chơi. Nút hoàn tác MUST không bấm được khi chưa có nước nào của người chơi, hoặc khi việc lùi phải qua một nước có kết quả ngẫu nhiên. Làm lại SHALL đi lại cả nước của người chơi và nước đáp của máy đã bị hoàn tác. Hoàn tác trong lúc máy đang nghĩ SHALL bỏ nước máy đang nghĩ và lùi nước vừa đi của người chơi.

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

#### Scenario: Máy đã gieo thì không hoàn tác được

- **WHEN** trong ván có xúc xắc, máy đã gieo sau nước của người chơi
- **THEN** nút hoàn tác không bấm được

#### Scenario: Chọn lại trước khi máy gieo

- **WHEN** trong ván có xúc xắc, người chơi gieo ra 5, đi một quân, rồi bấm hoàn tác trước khi máy gieo
- **THEN** quân trở về chỗ cũ, xúc xắc vẫn là 5, máy không đi và người chơi chọn lại được quân
