## ADDED Requirements

### Requirement: Chủ phòng

Người tạo phòng SHALL là chủ phòng trong suốt đời phòng, kể cả sau khi ghế được xoay ở ván mới. Trạng thái phòng gửi cho mọi người SHALL cho biết ghế hiện tại của chủ phòng và MUST NOT chứa `playerId` của chủ phòng.

#### Scenario: Người tạo là chủ phòng

- **WHEN** một người tạo phòng rồi một người khác vào phòng
- **THEN** cả hai nhận trạng thái phòng cho biết chủ phòng ở ghế đầu tiên

#### Scenario: Chủ phòng sau ván mới

- **WHEN** ván đầu của phòng hai ghế đã có kết quả và một người yêu cầu ván mới
- **THEN** trạng thái phòng cho biết chủ phòng nay ở ghế thứ hai

### Requirement: Ghế máy trong phòng

Trong phòng có từ ba ghế, chủ phòng SHALL đánh dấu được một ghế trống là ghế máy, và bỏ dấu một ghế máy về ghế trống, khi game hỗ trợ đấu với máy và ván hiện tại chưa có nước nào; đánh dấu lại một ghế máy SHALL để phòng không đổi. Ghế máy SHALL được tính là ghế đã có người khi xét phòng đủ người, và MUST NOT bị ai ngồi vào. Đánh dấu ghế trống cuối cùng SHALL bắt đầu ván ngay. Mọi người SHALL thấy ghế nào là ghế máy.

#### Scenario: Đánh dấu ghế máy

- **WHEN** chủ phòng của một phòng Cờ cá ngựa 4 ghế, mới có chủ phòng, đánh dấu ghế thứ ba là ghế máy
- **THEN** mọi người trong phòng thấy ghế thứ ba là máy, ghế thứ hai và thứ tư vẫn trống

#### Scenario: Ghế máy làm phòng đủ người

- **WHEN** phòng Cờ cá ngựa 4 ghế có chủ phòng ở ghế đầu, một người ở ghế thứ hai, và chủ phòng đánh dấu hai ghế còn lại là ghế máy
- **THEN** ván bắt đầu ngay khi ghế trống cuối cùng thành ghế máy, và đến lượt người ở ghế đầu

#### Scenario: Người mới không ngồi vào ghế máy

- **WHEN** phòng 3 ghế có chủ phòng, một ghế máy và một ghế trống, và một người mới yêu cầu ngồi
- **THEN** người đó ngồi vào ghế trống, ghế máy không đổi

#### Scenario: Đánh dấu lại ghế máy

- **WHEN** chủ phòng yêu cầu đánh dấu một ghế đã là ghế máy
- **THEN** server trả trạng thái phòng không đổi, không ghi gì và không báo lỗi

#### Scenario: Bỏ dấu ghế máy

- **WHEN** phòng còn ghế trống, ván chưa có nước nào và chủ phòng bỏ dấu một ghế máy
- **THEN** ghế đó trở thành ghế trống

### Requirement: Từ chối đổi ghế máy

Yêu cầu đổi ghế máy MUST bị từ chối, phòng MUST NOT đổi, với mã: `not-host` khi người gửi không phải chủ phòng; `ai-not-supported` khi game không hỗ trợ đấu với máy hoặc phòng chỉ có hai ghế; `game-started` khi ván đã có nước; `invalid-seat` khi số ghế không có trong phòng (kể cả số âm); `seat-taken` khi đánh dấu một ghế có người; `not-ai-seat` khi bỏ dấu một ghế không phải ghế máy. Lời từ chối MUST NOT làm client kết nối lại.

#### Scenario: Không phải chủ phòng

- **WHEN** người ở ghế thứ hai yêu cầu đánh dấu một ghế trống là ghế máy
- **THEN** server từ chối với mã `not-host` và phòng không đổi

#### Scenario: Ván đã bắt đầu

- **WHEN** ván Cờ cá ngựa trong phòng đã có nước đi và chủ phòng yêu cầu bỏ dấu một ghế máy
- **THEN** server từ chối với mã `game-started` và phòng không đổi

#### Scenario: Ghế đã có người

- **WHEN** chủ phòng yêu cầu đánh dấu ghế đang có người ngồi là ghế máy
- **THEN** server từ chối với mã `seat-taken` và phòng không đổi

#### Scenario: Bỏ dấu ghế không phải ghế máy

- **WHEN** chủ phòng yêu cầu bỏ dấu một ghế trống
- **THEN** server từ chối với mã `not-ai-seat` và phòng không đổi

#### Scenario: Ghế không có trong phòng

- **WHEN** chủ phòng của phòng 3 ghế yêu cầu đánh dấu ghế thứ năm
- **THEN** server từ chối với mã `invalid-seat`, phòng không đổi và kết nối của chủ phòng không bị nối lại

#### Scenario: Game không hỗ trợ máy

- **WHEN** chủ phòng của một phòng game không hỗ trợ đấu với máy yêu cầu đánh dấu ghế máy
- **THEN** server từ chối với mã `ai-not-supported` và phòng không đổi

#### Scenario: Phòng hai ghế

- **WHEN** chủ phòng của một phòng Tic-tac-toe yêu cầu đánh dấu ghế thứ hai là ghế máy
- **THEN** server từ chối với mã `ai-not-supported` và phòng không đổi

### Requirement: Server đi thay ghế máy

Khi phòng đủ người, ván chưa kết thúc và đến lượt một ghế máy, server SHALL tự chọn và ghi nước cho ghế đó bằng chính luật của game, ở mức Vừa, mọi giá trị ngẫu nhiên do server tạo, ngay trong lần thay đổi đã dẫn tới lượt đó, rồi đi tiếp tới khi đến lượt một người hoặc ván kết thúc. Việc này MUST NOT phụ thuộc người nào đang kết nối, và mọi người SHALL nhận đủ các nước đó theo đúng thứ tự.

#### Scenario: Máy đi sau nước của người

- **WHEN** trong phòng Cờ cá ngựa có người ở ghế đầu và ba ghế máy, người đó đi ngựa xong và không được gieo thêm
- **THEN** trạng thái phòng sau nước đó đã có thêm các lần gieo và nước đi của ba máy, và đến lượt người ở ghế đầu

#### Scenario: Người chơi rời đi ngay sau nước của mình

- **WHEN** người duy nhất của phòng đi một nước rồi đóng kết nối ngay
- **THEN** phòng trong kho đã có các nước của máy tới lượt người đó

#### Scenario: Ván mới với ghế máy đi đầu

- **WHEN** ván trong phòng có ghế máy đã kết thúc và một người yêu cầu ván mới, ghế máy được xoay vào ghế đầu
- **THEN** trạng thái ván mới gửi về sau yêu cầu đó đã có nước đầu của máy

#### Scenario: Phòng dừng ở lượt máy

- **WHEN** phòng trong kho đang dừng ở lượt một ghế máy và một người đã ngồi vào lại phòng
- **THEN** server đi tiếp các nước của máy và người đó nhận trạng thái có các nước ấy

### Requirement: Phòng tạo từ bản trước

Phòng đã lưu trước khi có ghế máy và chủ phòng SHALL vẫn vào được và chơi tiếp như cũ, với mọi ghế là người và không có chủ phòng.

#### Scenario: Ván dở từ bản trước

- **WHEN** kho có một phòng Tic-tac-toe đang dở lưu bằng định dạng của bản trước và người ở ghế thứ hai vào lại phòng
- **THEN** người đó nhận đúng ván đang dở ở ghế thứ hai và đi tiếp được

## MODIFIED Requirements

### Requirement: Server làm trọng tài

Server SHALL chỉ ghi một nước đi của người chơi khi người gửi có ghế, phòng đủ người (ghế máy tính là có người), nước nhắm đúng vị trí hiện tại, ván chưa kết thúc, đến lượt người gửi, và luật của game chấp nhận nước đó; nước của ghế máy do server tự ghi qua luật của game. Nước không thoả MUST bị từ chối kèm mã lý do, ván MUST NOT đổi, và người gửi SHALL nhận kèm trạng thái mới nhất. Đổi tên hay có người ngồi xen giữa MUST NOT làm nước hợp lệ bị từ chối. Giá trị ngẫu nhiên SHALL do server tạo.

#### Scenario: Nước đi hợp lệ

- **WHEN** đến lượt người ở ghế đầu tiên và người đó đặt quân vào một ô trống
- **THEN** nước đi được ghi và mọi người trong phòng nhận ván có thêm nước đó

#### Scenario: Đi khi chưa đủ người

- **WHEN** người tạo phòng gửi một nước đi trước khi có người thứ hai ngồi vào
- **THEN** server từ chối với mã `waiting-for-players` và ván vẫn chưa có nước nào

#### Scenario: Đi không đúng lượt

- **WHEN** người ở ghế thứ hai gửi nước đi lúc đang đến lượt ghế đầu tiên
- **THEN** server từ chối với mã `not-your-turn` và ván không đổi

#### Scenario: Nước đi sai luật

- **WHEN** người đang đến lượt gửi nước đặt quân vào một ô đã có quân
- **THEN** server từ chối với mã `illegal-move` và ván không đổi

#### Scenario: Gửi trùng một nước

- **WHEN** người chơi gửi hai lần cùng một nước đi cho cùng một vị trí của ván
- **THEN** chỉ lần đầu được ghi, lần sau bị từ chối với mã `stale-move` kèm trạng thái mới nhất của phòng

#### Scenario: Đổi tên xen giữa không làm hỏng nước đi

- **WHEN** đối thủ vào lại phòng với tên mới đúng lúc người chơi gửi một nước đi hợp lệ cho vị trí hiện tại của ván
- **THEN** nước đi vẫn được ghi

#### Scenario: Người chưa có ghế gửi nước đi

- **WHEN** một người đã vào phòng nhưng chưa ngồi ghế gửi nước đi
- **THEN** server từ chối với mã `not-seated` và ván không đổi

#### Scenario: Kết quả ngẫu nhiên do server tạo

- **WHEN** một nước đi của game có xúc xắc được ghi
- **THEN** kết quả xúc xắc lấy từ nguồn ngẫu nhiên của server, không từ dữ liệu client gửi

#### Scenario: Không ai đi thay ghế máy

- **WHEN** đến lượt một ghế máy và một người có ghế gửi nước đi cho lượt đó
- **THEN** server từ chối với mã `not-your-turn` và ván không đổi

### Requirement: Mọi người trong phòng thấy cùng một ván

Sau mỗi thay đổi của phòng (đổi tên, có người ngồi vào ghế, đánh dấu hay bỏ dấu ghế máy, nước đi của người hay của ghế máy, ván mới), server SHALL gửi trạng thái đầy đủ mới của phòng cho mọi người đang nối với phòng đó, kể cả người nối vào một instance server khác, mỗi người kèm ghế hiện tại của mình. Người vừa yêu cầu thay đổi SHALL nhận trạng thái mới mà không phụ thuộc vào kênh chung. Trạng thái gửi đi SHALL có số phiên bản tăng dần.

#### Scenario: Hai người ở hai instance

- **WHEN** hai người trong cùng một phòng nối vào hai instance server khác nhau và một người đi một nước
- **THEN** người kia nhận ván có nước đó

#### Scenario: Phiên bản tăng dần

- **WHEN** phòng nhận hai nước đi liên tiếp
- **THEN** trạng thái sau nước thứ hai có số phiên bản lớn hơn trạng thái sau nước thứ nhất

#### Scenario: Đổi ghế máy được gửi cho mọi người

- **WHEN** chủ phòng đánh dấu một ghế trống là ghế máy trong lúc một người khác đang ở sảnh chờ, nối qua instance khác
- **THEN** người đó nhận trạng thái phòng có ghế máy đó
