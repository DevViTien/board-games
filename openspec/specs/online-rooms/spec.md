# online-rooms Specification

## Purpose

Phòng online phía server: tạo phòng có mã, vào phòng và ngồi ghế, server làm trọng tài cho mọi nước đi, mọi người trong phòng thấy cùng một ván dù nối vào instance nào, kết nối lại nhận lại toàn bộ ván, chơi ván mới trong cùng phòng, phòng tự hết hạn, và kết nối được bảo vệ.

## Requirements

### Requirement: Tạo phòng

Server SHALL tạo phòng cho một game đã đăng ký, trả về mã phòng 6 ký tự gồm chữ in hoa và chữ số dễ đọc (không có `0`, `O`, `1`, `I`, `L`), khác mọi phòng đang tồn tại, rồi đóng kết nối tạo phòng. Người tạo SHALL ngồi ghế đầu tiên; số ghế và tuỳ chọn luật không nêu thì lấy giá trị nhỏ nhất và mặc định của game. Game, số người hoặc tuỳ chọn không hợp lệ MUST bị từ chối với mã lỗi tương ứng và không tạo phòng.

#### Scenario: Tạo phòng Tic-tac-toe

- **WHEN** một người chơi yêu cầu tạo phòng Tic-tac-toe
- **THEN** server trả về một mã 6 ký tự trong bảng chữ cho phép rồi đóng kết nối
- **AND** vào phòng bằng mã đó thấy người tạo ở ghế đầu tiên, ghế thứ hai trống, chưa có nước đi nào

#### Scenario: Game không tồn tại

- **WHEN** yêu cầu tạo phòng mang mã game `khong-co-game-nay`
- **THEN** server trả lỗi `unknown-game` và không có phòng nào được tạo

#### Scenario: Số người không hợp lệ

- **WHEN** yêu cầu tạo phòng Tic-tac-toe cho 3 người
- **THEN** server trả lỗi `invalid-player-count` và không có phòng nào được tạo

#### Scenario: Mã phòng trùng

- **WHEN** mã phòng sinh ra lần đầu trùng với một phòng đang tồn tại
- **THEN** server sinh mã khác và phòng cũ không bị đổi

#### Scenario: Tạo phòng với tuỳ chọn luật

- **WHEN** một người chơi yêu cầu tạo phòng Cờ caro với bàn 19×19 và luật "tự do"
- **THEN** ván đầu tiên của phòng có bàn 19×19 trống và dùng luật "tự do"

#### Scenario: Tuỳ chọn luật không hợp lệ

- **WHEN** yêu cầu tạo phòng Cờ caro mang kích thước bàn 17
- **THEN** server trả lỗi `invalid-options` và không có phòng nào được tạo

### Requirement: Vào phòng

Server SHALL cho một kết nối vào phòng bằng mã phòng, `playerId` và tên (có thể không có tên), rồi gửi trạng thái đầy đủ của phòng kèm ghế của chính người đó. Người có `playerId` đã ngồi trong phòng SHALL được nhận ra ở đúng ghế của mình (tên gửi kèm, nếu khác, thay tên cũ; không kèm tên thì giữ tên cũ); người chưa có ghế vào phòng mà chưa ngồi ghế nào. Mã phòng không tồn tại MUST nhận lỗi `room-not-found`. Mã phòng SHALL được nhận không phân biệt chữ hoa chữ thường và bỏ qua khoảng trắng.

#### Scenario: Người mới vào phòng

- **WHEN** một người chưa có ghế vào phòng Tic-tac-toe vừa tạo
- **THEN** người đó nhận trạng thái phòng với ghế của mình là "không có", và ghế thứ hai vẫn trống

#### Scenario: Vào phòng không kèm tên

- **WHEN** một người chưa có ghế vào phòng Tic-tac-toe vừa tạo mà không gửi tên
- **THEN** người đó nhận trạng thái phòng với ghế của mình là "không có", ghế thứ hai vẫn trống và phòng không đổi

#### Scenario: Vào lại phòng với cùng playerId

- **WHEN** người chơi đang ngồi ghế thứ hai vào lại phòng với cùng `playerId`
- **THEN** người đó được nhận ra ở ghế thứ hai và không ai bị đổi ghế

#### Scenario: Vào lại với tên mới

- **WHEN** người chơi đang ngồi ghế thứ hai vào lại phòng với cùng `playerId` và tên mới
- **THEN** mọi người trong phòng thấy tên mới ở ghế thứ hai

#### Scenario: Vào lại không kèm tên

- **WHEN** người chơi "An" đang ngồi ghế thứ hai vào lại phòng với cùng `playerId` mà không gửi tên
- **THEN** người đó được nhận ra ở ghế thứ hai và mọi người trong phòng vẫn thấy "An"

#### Scenario: Mã phòng không tồn tại

- **WHEN** người chơi vào phòng bằng một mã đúng định dạng nhưng không có phòng nào
- **THEN** server trả lỗi `room-not-found` và đóng kết nối

#### Scenario: Mã phòng viết thường

- **WHEN** người chơi vào phòng `ABC234` bằng mã `abc 234`
- **THEN** người chơi vào đúng phòng `ABC234`

### Requirement: Ngồi vào ghế

Người đã vào phòng mà chưa có ghế SHALL ngồi được vào ghế trống có thứ tự nhỏ nhất khi yêu cầu, dưới tên gửi kèm yêu cầu ngồi (tên có thể đã sửa sau khi vào phòng). Phòng không còn ghế trống MUST từ chối với mã `room-full` và ghế của người khác MUST NOT đổi. Người đã có ghế yêu cầu ngồi SHALL giữ nguyên ghế, với tên gửi kèm thay tên cũ nếu khác, và SHALL nhận trạng thái phòng kèm ghế của mình. Hai người cùng yêu cầu ghế trống cuối cùng SHALL chỉ một người có ghế.

#### Scenario: Người thứ hai ngồi vào ghế

- **WHEN** người thứ hai đã vào phòng Tic-tac-toe vừa tạo yêu cầu ngồi
- **THEN** người đó ngồi ghế thứ hai và mọi người trong phòng thấy hai ghế đã có tên

#### Scenario: Tên gửi khi ngồi là tên trên ghế

- **WHEN** người thứ hai vào phòng với tên "An" rồi yêu cầu ngồi với tên "An Nguyễn"
- **THEN** mọi người trong phòng thấy "An Nguyễn" ở ghế thứ hai

#### Scenario: Người đã có ghế yêu cầu ngồi lại

- **WHEN** người đang ngồi ghế thứ hai yêu cầu ngồi thêm một lần
- **THEN** người đó nhận trạng thái phòng với ghế của mình là ghế thứ hai và không ai bị đổi ghế

#### Scenario: Phòng đã đủ người

- **WHEN** người thứ ba đã vào phòng Tic-tac-toe có hai người yêu cầu ngồi
- **THEN** server từ chối với mã `room-full` và ghế của hai người kia không đổi

#### Scenario: Hai người cùng giành ghế cuối

- **WHEN** hai người chưa có ghế cùng yêu cầu ngồi vào ghế trống cuối cùng của một phòng
- **THEN** một người có ghế, người kia bị từ chối với mã `room-full`

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

Sau mỗi thay đổi của phòng (đổi tên, có người ngồi vào ghế, đánh dấu hay bỏ dấu ghế máy, nước đi của người hay của ghế máy, ván mới, tin chat), server SHALL gửi trạng thái đầy đủ mới của phòng cho mọi người đang nối với phòng đó, kể cả người nối vào một instance server khác, mỗi người kèm ghế hiện tại của mình; tin chat chỉ gửi cho người có ghế. Người vừa yêu cầu thay đổi SHALL nhận trạng thái mới mà không phụ thuộc vào kênh chung. Trạng thái gửi đi SHALL có số phiên bản tăng dần.

#### Scenario: Hai người ở hai instance

- **WHEN** hai người trong cùng một phòng nối vào hai instance server khác nhau và một người đi một nước
- **THEN** người kia nhận ván có nước đó

#### Scenario: Phiên bản tăng dần

- **WHEN** phòng nhận hai nước đi liên tiếp
- **THEN** trạng thái sau nước thứ hai có số phiên bản lớn hơn trạng thái sau nước thứ nhất

#### Scenario: Đổi ghế máy được gửi cho mọi người

- **WHEN** chủ phòng đánh dấu một ghế trống là ghế máy trong lúc một người khác đang ở sảnh chờ, nối qua instance khác
- **THEN** người đó nhận trạng thái phòng có ghế máy đó

#### Scenario: Tin chat ở hai instance

- **WHEN** hai người có ghế nối vào hai instance server khác nhau và một người gửi một tin
- **THEN** người kia nhận trạng thái phòng có tin đó

### Requirement: Hồi phục khi kênh chung lỡ tin

Khi một instance mất rồi có lại kết nối tới kênh chung giữa các instance, server SHALL gửi lại trạng thái mới nhất của các phòng cho những người đang nối qua instance đó.

#### Scenario: Kênh chung bị lỡ tin

- **WHEN** tin của một nước đi không tới được instance của người kia qua kênh chung, rồi kênh của instance đó nối lại
- **THEN** người kia nhận trạng thái có nước đi đó

### Requirement: Kết nối lại nhận lại toàn bộ ván

Khi một người đã ngồi trong phòng vào lại phòng (sau khi kết nối bị ngắt), server SHALL gửi ngay trạng thái đầy đủ của phòng, gồm danh sách mọi nước đã đi của ván hiện tại theo đúng thứ tự, để client dựng lại ván bằng cách phát lại.

#### Scenario: Nối lại giữa ván

- **WHEN** ván đã có ba nước, kết nối của người ở ghế thứ hai bị ngắt và người đó vào lại phòng
- **THEN** người đó nhận trạng thái có đủ ba nước theo đúng thứ tự và vẫn ở ghế thứ hai

### Requirement: Không lộ danh tính người chơi

Mọi trạng thái phòng server gửi đi MUST chỉ chứa tên của người ngồi mỗi ghế và, với người nhận có ghế, tên người gửi của từng tin chat; MUST NOT chứa `playerId` của bất kỳ ai. Server SHALL cho mỗi kết nối biết ghế của chính người đó (hoặc không có ghế).

#### Scenario: Trạng thái phòng không chứa playerId

- **WHEN** hai người đã ngồi trong phòng và một người nhận trạng thái phòng
- **THEN** trạng thái đó có tên của cả hai người và ghế của người nhận, nhưng không có `playerId` nào

### Requirement: Ván mới trong phòng

Khi ván hiện tại đã có kết quả, người có ghế trong phòng SHALL bắt đầu được ván mới trong cùng phòng; ván mới SHALL giữ tuỳ chọn luật của phòng và xoay ghế của mọi người để người đi trước luân phiên giữa các ván, và mỗi người trong phòng nhận ván mới kèm ghế mới của mình. Yêu cầu ván mới khi ván chưa có kết quả MUST bị từ chối với mã `game-not-over`. Hai yêu cầu ván mới cho cùng một ván SHALL chỉ tạo một ván mới.

#### Scenario: Chơi lại sau khi thắng

- **WHEN** ván Tic-tac-toe đã có người thắng và người ở ghế thứ hai yêu cầu ván mới
- **THEN** mọi người trong phòng nhận ván mới chưa có nước nào
- **AND** người trước đó ở ghế đầu tiên nhận ghế thứ hai, người kia nhận ghế đầu tiên

#### Scenario: Ván mới khi chưa kết thúc

- **WHEN** ván đang dở và một người yêu cầu ván mới
- **THEN** server từ chối với mã `game-not-over` và ván không đổi

#### Scenario: Cả hai cùng yêu cầu ván mới

- **WHEN** ván đã kết thúc và cả hai người gửi yêu cầu ván mới cho cùng ván đó
- **THEN** chỉ một ván mới được tạo, yêu cầu còn lại bị từ chối với mã `stale-move`

#### Scenario: Ván mới giữ tuỳ chọn luật

- **WHEN** ván Cờ caro 19×19 luật "tự do" trong phòng đã có người thắng và một người yêu cầu ván mới
- **THEN** ván mới có bàn 19×19 trống và vẫn dùng luật "tự do"

### Requirement: Phòng hết hạn

Phòng SHALL tự bị xoá sau 7 ngày liên tục không có thay đổi nào; mỗi thay đổi của phòng tính lại 7 ngày từ đầu. Vào một phòng đã bị xoá SHALL nhận lỗi `room-not-found`. Người đang ở trong một phòng vừa bị xoá SHALL nhận lỗi `room-not-found` ở yêu cầu tiếp theo, rồi kết nối bị đóng. Các phòng của bản thử (Preview) và bản chính (Production) MUST NOT thấy nhau dù dùng chung một kho.

#### Scenario: Mỗi thay đổi gia hạn phòng

- **WHEN** một nước đi được ghi vào phòng
- **THEN** phòng trong kho có thời hạn 7 ngày tính từ lúc ghi

#### Scenario: Phòng bị xoá khi đang ở trong phòng

- **WHEN** phòng bị xoá trong lúc hai người đang chơi và một người gửi nước đi
- **THEN** người đó nhận lỗi `room-not-found` và kết nối bị đóng

#### Scenario: Bản thử và bản chính tách nhau

- **WHEN** một phòng được tạo trên bản thử
- **THEN** vào phòng đó bằng cùng mã trên bản chính nhận lỗi `room-not-found`

### Requirement: Kiểm lời chào và thông điệp

Server SHALL kiểm mọi thông điệp nhận được theo schema của giao thức. Thông điệp đầu tiên của một kết nối MUST là lời chào (tạo phòng hoặc vào phòng) mang phiên bản giao thức; phiên bản khác của server MUST nhận lỗi `outdated-client`. Kết nối không chào trong 10 giây MUST bị đóng. Thông điệp sai định dạng sau lời chào MUST bị từ chối với mã `invalid-message` mà không làm thay đổi phòng nào.

#### Scenario: Tab mở từ bản cũ

- **WHEN** một kết nối chào với phiên bản giao thức khác của server
- **THEN** server gửi lỗi `outdated-client` và đóng kết nối

#### Scenario: Thông điệp sai định dạng

- **WHEN** một kết nối đã vào phòng gửi một chuỗi không phải JSON hợp lệ
- **THEN** server từ chối với mã `invalid-message`, phòng không đổi và kết nối vẫn mở

#### Scenario: Không chào

- **WHEN** một kết nối mở ra mà không gửi gì trong 10 giây
- **THEN** server đóng kết nối

### Requirement: Giới hạn mỗi kết nối

Kết nối gửi quá 30 thông điệp trong 10 giây, hoặc một thông điệp lớn hơn 16 KB, MUST bị đóng. Kết nối 20 phút không gửi gì ngoài tín hiệu giữ kết nối và không nhận trạng thái mới MUST bị đóng.

#### Scenario: Gửi quá nhiều thông điệp

- **WHEN** một kết nối gửi 31 thông điệp trong vòng 10 giây
- **THEN** server gửi lỗi `too-many-messages` và đóng kết nối

#### Scenario: Kết nối rảnh quá lâu

- **WHEN** một kết nối đã vào phòng 20 phút chỉ gửi tín hiệu giữ kết nối và phòng không đổi
- **THEN** server đóng kết nối

### Requirement: Lỗi không lan sang kết nối khác

Lỗi của một kết nối hay của kho phòng MUST NOT làm hỏng các kết nối khác trên cùng server. Kho không trả lời trong 5 giây hoặc báo lỗi MUST làm yêu cầu bị từ chối với mã `unavailable`.

#### Scenario: Thông điệp quá lớn không ảnh hưởng người khác

- **WHEN** một kết nối gửi thông điệp lớn hơn 16 KB trong lúc hai người khác đang chơi trên cùng server
- **THEN** kết nối đó bị đóng và hai người kia vẫn đi tiếp được

#### Scenario: Kho không trả lời

- **WHEN** kho phòng không trả lời trong 5 giây lúc người chơi gửi nước đi
- **THEN** server từ chối với mã `unavailable` và kết nối vẫn mở

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
