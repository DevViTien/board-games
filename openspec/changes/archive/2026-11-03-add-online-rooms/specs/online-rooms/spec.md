# Spec Delta

## Purpose

Phòng online phía server: tạo phòng có mã, vào phòng và ngồi ghế, server làm trọng tài cho mọi nước đi, mọi người trong phòng thấy cùng một ván dù nối vào instance nào, kết nối lại nhận lại toàn bộ ván, chơi ván mới trong cùng phòng, phòng tự hết hạn, và kết nối được bảo vệ.

## ADDED Requirements

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

### Requirement: Vào phòng

Server SHALL cho một kết nối vào phòng bằng mã phòng, `playerId` và tên, rồi gửi trạng thái đầy đủ của phòng kèm ghế của chính người đó. Người có `playerId` đã ngồi trong phòng SHALL được nhận ra ở đúng ghế của mình (tên mới, nếu khác, thay tên cũ); người chưa có ghế vào phòng mà chưa ngồi ghế nào. Mã phòng không tồn tại MUST nhận lỗi `room-not-found`. Mã phòng SHALL được nhận không phân biệt chữ hoa chữ thường và bỏ qua khoảng trắng.

#### Scenario: Người mới vào phòng

- **WHEN** một người chưa có ghế vào phòng Tic-tac-toe vừa tạo
- **THEN** người đó nhận trạng thái phòng với ghế của mình là "không có", và ghế thứ hai vẫn trống

#### Scenario: Vào lại phòng với cùng playerId

- **WHEN** người chơi đang ngồi ghế thứ hai vào lại phòng với cùng `playerId`
- **THEN** người đó được nhận ra ở ghế thứ hai và không ai bị đổi ghế

#### Scenario: Vào lại với tên mới

- **WHEN** người chơi đang ngồi ghế thứ hai vào lại phòng với cùng `playerId` và tên mới
- **THEN** mọi người trong phòng thấy tên mới ở ghế thứ hai

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

Server SHALL chỉ ghi một nước đi khi người gửi có ghế, phòng đủ người, nước đi nhắm đúng vị trí hiện tại của ván, ván chưa kết thúc, đến lượt người gửi, và luật của game chấp nhận nước đó. Nước đi không thoả MUST bị từ chối với mã lỗi nêu lý do, ván MUST NOT đổi, và người gửi SHALL nhận kèm trạng thái mới nhất. Đổi tên hay có người ngồi xen giữa MUST NOT làm nước hợp lệ bị từ chối. Giá trị ngẫu nhiên (xúc xắc) SHALL do server tạo.

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

### Requirement: Mọi người trong phòng thấy cùng một ván

Sau mỗi thay đổi của phòng (đổi tên, có người ngồi vào ghế, nước đi, ván mới), server SHALL gửi trạng thái đầy đủ mới của phòng cho mọi người đang nối với phòng đó, kể cả người nối vào một instance server khác, mỗi người kèm ghế hiện tại của mình. Người vừa yêu cầu thay đổi SHALL nhận trạng thái mới mà không phụ thuộc vào kênh chung. Trạng thái gửi đi SHALL có số phiên bản tăng dần.

#### Scenario: Hai người ở hai instance

- **WHEN** hai người trong cùng một phòng nối vào hai instance server khác nhau và một người đi một nước
- **THEN** người kia nhận ván có nước đó

#### Scenario: Phiên bản tăng dần

- **WHEN** phòng nhận hai nước đi liên tiếp
- **THEN** trạng thái sau nước thứ hai có số phiên bản lớn hơn trạng thái sau nước thứ nhất

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

Mọi trạng thái phòng server gửi đi MUST chỉ chứa tên của người ngồi mỗi ghế, MUST NOT chứa `playerId` của bất kỳ ai. Server SHALL cho mỗi kết nối biết ghế của chính người đó (hoặc không có ghế).

#### Scenario: Trạng thái phòng không chứa playerId

- **WHEN** hai người đã ngồi trong phòng và một người nhận trạng thái phòng
- **THEN** trạng thái đó có tên của cả hai người và ghế của người nhận, nhưng không có `playerId` nào

### Requirement: Ván mới trong phòng

Khi ván hiện tại đã có kết quả, người có ghế trong phòng SHALL bắt đầu được ván mới trong cùng phòng; ván mới SHALL xoay ghế của mọi người để người đi trước luân phiên giữa các ván, và mỗi người trong phòng nhận ván mới kèm ghế mới của mình. Yêu cầu ván mới khi ván chưa có kết quả MUST bị từ chối với mã `game-not-over`. Hai yêu cầu ván mới cho cùng một ván SHALL chỉ tạo một ván mới.

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
