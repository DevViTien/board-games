## MODIFIED Requirements

### Requirement: Máy tự đi khi tới lượt

Khi tới lượt của máy, máy SHALL tự chọn và đi một nước hợp lệ theo mức độ của ván mà người chơi không phải làm gì. Trong lúc chờ, bàn cờ MUST không cho chọn nước nào và màn hình SHALL báo máy đang nghĩ. Nước của máy SHALL hiện ra sau ít nhất 0,3 giây để người chơi kịp thấy, và trong vòng 2 giây kể từ khi tới lượt máy, trừ sau cú tung xúc xắc của người chơi (requirement "Nhịp máy sau kết quả ngẫu nhiên").

#### Scenario: Máy đáp lại sau nước của người chơi

- **WHEN** người chơi đặt quân trong ván đấu với máy
- **THEN** màn hình báo máy đang nghĩ và bàn không cho chọn ô nào
- **AND** trong vòng 2 giây máy đặt một quân vào ô trống và lại đến lượt người chơi

#### Scenario: Máy đi trước

- **WHEN** ván đấu với máy bắt đầu với máy đi trước
- **THEN** máy tự đặt quân đầu tiên mà người chơi không phải làm gì

### Requirement: Nhịp máy sau kết quả ngẫu nhiên

Trong game có yếu tố ngẫu nhiên, nước của máy MUST NOT hiện ra trước khi hiệu ứng của nước trước đó trên bàn kết thúc; ngay sau lần gieo của máy, nước của máy SHALL hiện ra muộn hơn nữa để người chơi kịp thấy kết quả, và vẫn trong vòng 2 giây kể từ khi tới lượt máy; sau lần gieo của người chơi, nước của máy SHALL chờ cú tung xúc xắc kết thúc và hiện ra trong vòng 3 giây kể từ khi có số. Game không có yếu tố ngẫu nhiên MUST giữ nhịp cũ.

#### Scenario: Máy không đi ngay sau khi gieo

- **WHEN** máy vừa gieo xúc xắc và vẫn đến lượt máy chọn nước
- **THEN** nước tiếp theo của máy không hiện ra trước khi hết thời gian chờ dành cho kết quả ngẫu nhiên, và hiện ra trong vòng 2 giây

#### Scenario: Máy không cắt hiệu ứng đi quân

- **WHEN** trong ván có xúc xắc, người chơi vừa đi một quân và tới lượt máy gieo
- **THEN** lần gieo của máy không hiện ra trước khi hiệu ứng đi quân của người chơi kết thúc

#### Scenario: Máy chờ cú tung của người chơi

- **WHEN** trong ván Cờ cá ngựa đấu với máy, người chơi gieo, mất lượt và tới lượt máy
- **THEN** lần gieo của máy không hiện ra trước khi cú tung của người chơi kết thúc, và hiện ra trong vòng 3 giây kể từ khi có số của người chơi

#### Scenario: Nhịp cũ cho game không ngẫu nhiên

- **WHEN** người chơi đặt quân trong ván Tic-tac-toe đấu với máy
- **THEN** quân của máy có thể hiện ra ngay sau 0,3 giây như trước
