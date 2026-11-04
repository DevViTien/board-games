## ADDED Requirements

### Requirement: Thời điểm bắt đầu lượt

Server SHALL ghi, theo đồng hồ của server, lúc lượt hiện tại bắt đầu: khi phòng vừa đủ người, mỗi lần ván có thêm nước, và khi ván mới bắt đầu. Đổi tên, vào lại phòng hay kết nối lại MUST NOT tính lại. Trạng thái phòng gửi đi SHALL cho biết lượt đã kéo dài bao lâu tính tới lúc gửi, trừ khi phòng chưa đủ người hay ván đã kết thúc. Phòng lưu trước khi có thời điểm này SHALL lấy lần ghi gần nhất làm lúc bắt đầu lượt, kể cả khi ván đã xong; client MUST bỏ qua giá trị đó khi ván có kết quả.

#### Scenario: Thời gian của lượt

- **WHEN** người ở ghế đầu đi một nước và 2 phút sau người ở ghế thứ hai vào lại phòng
- **THEN** trạng thái phòng người đó nhận cho biết lượt đã kéo dài 2 phút

#### Scenario: Đổi tên không tính lại lượt

- **WHEN** đang tới lượt người ở ghế thứ hai từ 3 phút trước và người đó vào lại phòng với tên mới
- **THEN** trạng thái phòng sau đó vẫn cho biết lượt đã kéo dài 3 phút

#### Scenario: Phòng vừa đủ người

- **WHEN** người thứ hai ngồi vào phòng Tic-tac-toe tạo từ 10 phút trước
- **THEN** trạng thái phòng cho biết lượt của người ở ghế đầu vừa bắt đầu

#### Scenario: Chưa có lượt

- **WHEN** phòng Tic-tac-toe mới có người tạo phòng
- **THEN** trạng thái phòng không cho biết thời gian của lượt

#### Scenario: Ván đã kết thúc

- **WHEN** ván trong phòng vừa có người thắng
- **THEN** trạng thái phòng không cho biết thời gian của lượt

#### Scenario: Phòng lưu ở bản trước

- **WHEN** kho có một phòng đang dở lưu bằng định dạng của bản trước, ghi lần cuối 6 phút trước
- **THEN** server coi lượt hiện tại đã kéo dài 6 phút

#### Scenario: Phòng bản trước đã xong ván

- **WHEN** client nhận một phòng có ván đã kết thúc mà trạng thái phòng vẫn cho biết thời gian của lượt
- **THEN** màn hình không có thời gian chờ và không có nút xử bỏ ván

### Requirement: Đầu hàng trong phòng

Người có ghế SHALL đầu hàng được khi phòng đủ người và ván chưa kết thúc, ở bất kỳ lượt nào. Phòng hai ghế, hay game không có máy: ván SHALL kết thúc, mọi ghế khác thắng với lý do `resigned`. Phòng từ ba ghế của game có máy: ghế đó SHALL do máy chơi thay tới hết ván (máy đi ngay nếu đang tới lượt ghế đó), người đó vẫn ở ghế; nếu không còn ghế nào khác do người tự chơi thì ván kết thúc như phòng hai ghế.

#### Scenario: Đầu hàng Cờ vua

- **WHEN** trong phòng Cờ vua đang dở, người cầm Đen đầu hàng lúc đang tới lượt Trắng
- **THEN** mọi người trong phòng nhận ván đã kết thúc, Trắng thắng với lý do `resigned`
- **AND** người ở ghế thứ hai yêu cầu ván mới được

#### Scenario: Đầu hàng Cờ cá ngựa

- **WHEN** trong phòng Cờ cá ngựa 3 ghế có ba người, người ở ghế thứ hai đầu hàng lúc đang tới lượt ghế đầu
- **THEN** mọi người thấy ghế thứ hai do máy chơi thay, vẫn mang tên người đó, và ván chưa kết thúc
- **AND** người đó vẫn nhận trạng thái phòng với ghế của mình là ghế thứ hai

#### Scenario: Đầu hàng đúng lượt mình ở Cờ cá ngựa

- **WHEN** trong phòng Cờ cá ngựa 3 ghế có ba người, người ở ghế thứ hai đầu hàng lúc đang tới lượt mình
- **THEN** trạng thái phòng sau yêu cầu đó đã có nước của máy cho ghế thứ hai, tới lượt một người tự chơi
- **AND** lượt của người đó vừa bắt đầu

#### Scenario: Phòng Cờ cá ngựa hai ghế

- **WHEN** trong phòng Cờ cá ngựa 2 ghế đang dở, người ở ghế thứ hai đầu hàng
- **THEN** ván kết thúc, ghế đầu thắng với lý do `resigned`, không ghế nào do máy chơi thay

#### Scenario: Người cuối cùng đầu hàng

- **WHEN** trong phòng Cờ cá ngựa 4 ghế có một người và ba ghế máy, người đó đầu hàng
- **THEN** ván kết thúc, ba ghế máy thắng với lý do `resigned`

#### Scenario: Đầu hàng lần nữa

- **WHEN** ghế thứ hai của phòng Cờ cá ngựa đã do máy chơi thay và người ngồi ghế đó đầu hàng lần nữa
- **THEN** server trả trạng thái phòng không đổi, không ghi gì và không báo lỗi

### Requirement: Xử bỏ ván

Khi người đang tới lượt tự chơi ghế của mình và lượt đã kéo dài từ 5 phút theo đồng hồ server, người khác có ghế, kể cả người đã được máy chơi thay, SHALL xử được bỏ ván cho đúng lượt đó (yêu cầu nêu ván và vị trí như nước đi). Kết quả theo cùng quy tắc với đầu hàng, lý do `abandoned`: kết thúc ván, hoặc ghế vắng do máy chơi thay và máy đi ngay; không còn ghế nào khác do người tự chơi thì ván kết thúc.

#### Scenario: Xử thắng Cờ caro

- **WHEN** trong phòng Cờ caro đang tới lượt ghế thứ hai từ 5 phút 10 giây và người ở ghế đầu xử bỏ ván
- **THEN** ván kết thúc, ghế đầu thắng với lý do `abandoned`, và mọi người trong phòng nhận kết quả đó

#### Scenario: Cho máy chơi thay ở Cờ cá ngựa

- **WHEN** trong phòng Cờ cá ngựa 3 ghế có ba người, đang tới lượt ghế thứ hai từ 6 phút và người ở ghế thứ ba xử bỏ ván
- **THEN** ghế thứ hai do máy chơi thay, trạng thái phòng sau yêu cầu đó đã có nước của máy cho ghế thứ hai, và ván chưa kết thúc

#### Scenario: Phòng Cờ cá ngựa hai ghế bị bỏ

- **WHEN** trong phòng Cờ cá ngựa 2 ghế đang tới lượt ghế thứ hai từ 6 phút và người ở ghế đầu xử bỏ ván
- **THEN** ván kết thúc, ghế đầu thắng với lý do `abandoned`

#### Scenario: Người tự chơi cuối cùng bỏ đi

- **WHEN** trong phòng Cờ cá ngựa 3 ghế, ghế đầu và ghế thứ ba đã do máy chơi thay, đang tới lượt ghế thứ hai (người tự chơi) từ 6 phút, và người ngồi ghế đầu xử bỏ ván
- **THEN** ván kết thúc với lý do `abandoned`, ghế đầu và ghế thứ ba thắng

#### Scenario: Người vắng vừa kịp đi

- **WHEN** người ở ghế thứ hai đi một nước ngay trước khi yêu cầu xử bỏ ván cho lượt cũ của người đó tới server
- **THEN** server từ chối yêu cầu với mã `stale-move`, ván có nước vừa đi và chưa kết thúc

### Requirement: Từ chối đầu hàng và xử bỏ ván

Yêu cầu đầu hàng hay xử bỏ ván không thoả MUST bị từ chối, phòng MUST NOT đổi, với mã: `not-seated` khi người gửi không có ghế; `waiting-for-players` khi phòng chưa đủ người; `stale-move` khi nhắm ván hay vị trí cũ; `game-over` khi ván đã kết thúc; với xử bỏ ván, `not-abandoned` khi chưa đủ 5 phút, người gửi đang tới lượt, hoặc ghế tới lượt không do người tự chơi. Lời từ chối SHALL kèm trạng thái phòng mới nhất và MUST NOT làm client kết nối lại.

#### Scenario: Chưa đủ 5 phút

- **WHEN** đang tới lượt ghế thứ hai từ 4 phút 50 giây và người ở ghế đầu xử bỏ ván
- **THEN** server từ chối với mã `not-abandoned` kèm trạng thái phòng cho biết lượt đã kéo dài 4 phút 50 giây, ván không đổi và kết nối không bị nối lại

#### Scenario: Tự xử mình

- **WHEN** đang tới lượt ghế đầu từ 6 phút và chính người ở ghế đầu xử bỏ ván
- **THEN** server từ chối với mã `not-abandoned` và ván không đổi

#### Scenario: Xử hai lần

- **WHEN** trong phòng Tic-tac-toe, người ở ghế đầu gửi hai yêu cầu xử bỏ ván cho cùng lượt của ghế thứ hai đã quá 5 phút
- **THEN** yêu cầu đầu kết thúc ván, yêu cầu sau bị từ chối với mã `game-over`

#### Scenario: Người chưa có ghế

- **WHEN** một người đã vào phòng nhưng chưa ngồi ghế yêu cầu đầu hàng
- **THEN** server từ chối với mã `not-seated` và phòng không đổi

#### Scenario: Đầu hàng khi chưa đủ người

- **WHEN** người tạo phòng Tic-tac-toe đầu hàng trước khi có người thứ hai
- **THEN** server từ chối với mã `waiting-for-players` và phòng không đổi

#### Scenario: Đầu hàng ván đã kết thúc

- **WHEN** ván trong phòng đã có người thắng và một người đầu hàng
- **THEN** server từ chối với mã `game-over` và kết quả không đổi

### Requirement: Máy chơi thay người

Ghế do máy chơi thay SHALL được server đi như ghế máy: mức Vừa, mọi giá trị ngẫu nhiên do server tạo, ngay trong lần thay đổi dẫn tới lượt đó, và thắng được như mọi ghế. Người có ghế, kể cả người ngồi ghế đó, MUST NOT đi thay máy. Mọi người SHALL thấy ghế nào do máy chơi thay kèm tên người. Ván mới trong phòng SHALL trả mọi ghế cho chính người ngồi ghế đó tự chơi.

#### Scenario: Người được máy chơi thay gửi nước đi

- **WHEN** ghế thứ hai do máy chơi thay và người ngồi ghế đó gửi một nước đi
- **THEN** server từ chối với mã `not-your-turn` và ván không đổi

#### Scenario: Máy đi tiếp cho ghế vắng

- **WHEN** ghế thứ hai do máy chơi thay và người ở ghế đầu đi một nước trao lượt cho ghế thứ hai
- **THEN** trạng thái phòng sau nước đó đã có các nước của máy cho ghế thứ hai, tới khi tới lượt một người tự chơi

#### Scenario: Máy chơi thay về đích trước

- **WHEN** máy chơi thay ghế thứ hai đưa đủ bốn ngựa của ghế đó lên bậc 3–6 trước mọi người
- **THEN** ván kết thúc, ghế thứ hai thắng

#### Scenario: Ván mới trả ghế

- **WHEN** ván Cờ cá ngựa có ghế do máy chơi thay đã kết thúc và một người yêu cầu ván mới
- **THEN** trong ván mới mọi ghế người đều do chính người đó tự chơi, ghế đã xoay như mọi ván mới
