# online-play Specification

## Purpose

Chơi online với bạn bè trên giao diện: tạo phòng, mời bằng link hoặc mã phòng, chờ đủ người, chơi theo lượt với đối thủ ở xa trên màn hình ván dùng chung, tự kết nối lại khi mạng chập chờn hay kết nối bị cắt, tạm ngắt khi không dùng, và chơi lại trong cùng phòng.

## Requirements

### Requirement: Mở trang phòng

Hệ thống SHALL mở trang phòng tại `/room/<mã phòng>`. Mã phòng viết thường SHALL được chuyển sang dạng chuẩn viết hoa; mã sai định dạng MUST hiện trang "không tìm thấy". Trang phòng SHALL vào phòng với danh tính đã nhớ (capability `player-identity`), hoặc chưa kèm tên khi trình duyệt chưa nhớ tên nào, và hiện "Đang vào phòng…" cho tới khi nhận được trạng thái phòng. Quá 10 giây chưa vào được, trang SHALL báo chưa kết nối được máy chủ và có lối về menu, trong khi vẫn tiếp tục thử.

#### Scenario: Mở link mời

- **WHEN** người chơi đã có tên tạm mở link mời của một phòng Tic-tac-toe chỉ có người tạo
- **THEN** trang phòng hiện sảnh chờ có tên người tạo ở ghế đầu tiên và nút "Vào chơi"

#### Scenario: Mở link mời khi chưa có tên

- **WHEN** người chơi chưa từng nhập tên tạm mở link mời của một phòng Tic-tac-toe chỉ có người tạo
- **THEN** trang phòng hiện sảnh chờ có tên người tạo ở ghế đầu tiên, ô tên tạm trống và nút "Vào chơi"

#### Scenario: Mã phòng viết thường trên đường dẫn

- **WHEN** người chơi mở `/room/abc234`
- **THEN** đường dẫn chuyển thành `/room/ABC234` và trang phòng `ABC234` mở ra

#### Scenario: Mã phòng sai định dạng

- **WHEN** người chơi mở `/room/khong-phai-ma`
- **THEN** trang "không tìm thấy" hiện ra kèm lối về menu

#### Scenario: Đang vào phòng

- **WHEN** người chơi mở link phòng và server chưa trả lời
- **THEN** trang hiện "Đang vào phòng…"

#### Scenario: Không kết nối được máy chủ

- **WHEN** người chơi mở link phòng và sau 10 giây vẫn chưa kết nối được máy chủ
- **THEN** trang báo chưa kết nối được máy chủ và có lối về menu

### Requirement: Sảnh chờ và link mời

Khi phòng còn ghế trống, hoặc khi người chơi chưa có ghế, trang phòng SHALL hiện sảnh chờ gồm tên game, mã phòng, link mời của phòng với nút sao chép, và danh sách ghế với tên người đã ngồi (đánh dấu ghế của chính mình) hoặc trạng thái đang chờ. Trên trình duyệt hỗ trợ chia sẻ, sảnh chờ SHALL có thêm nút chia sẻ link.

#### Scenario: Sao chép link mời

- **WHEN** người tạo phòng ở sảnh chờ bấm "Sao chép link"
- **THEN** link `<địa chỉ app>/room/<mã phòng>` được chép vào bộ nhớ tạm và sảnh chờ báo đã sao chép

### Requirement: Vào chơi bằng nút

Người chưa có ghế SHALL chỉ ngồi vào ghế khi bấm "Vào chơi", với tên tạm sửa được ngay trước khi bấm; mở link MUST NOT tự chiếm ghế. "Vào chơi" không được trả lời trong 8 giây thì trang phòng SHALL tự kết nối lại và cho bấm lại nếu vẫn chưa có ghế. Khi đủ người, mọi người có ghế SHALL được chuyển sang màn hình ván mà không phải tải lại trang; người vừa ở sảnh chờ SHALL có focus ở tiêu đề màn hình ván.

#### Scenario: Bạn vào phòng thì bắt đầu ván

- **WHEN** người tạo phòng đang ở sảnh chờ, người thứ hai mở link mời và bấm "Vào chơi"
- **THEN** cả hai người thấy màn hình ván Tic-tac-toe, đến lượt người ở ghế đầu tiên

#### Scenario: Focus khi vào ván

- **WHEN** người chơi bấm "Vào chơi" ở sảnh chờ và ván bắt đầu
- **THEN** tiêu đề màn hình ván có focus

#### Scenario: Vào chơi không được trả lời

- **WHEN** người chơi bấm "Vào chơi" và server không trả lời trong 8 giây
- **THEN** trang phòng kết nối lại và hiện đúng việc người chơi đã có ghế hay chưa

#### Scenario: Mở link không chiếm ghế

- **WHEN** một người mở link mời của phòng còn ghế trống nhưng không bấm "Vào chơi"
- **THEN** ghế trống vẫn trống và người tạo phòng vẫn thấy sảnh chờ

### Requirement: Chơi theo lượt với đối thủ ở xa

Trong ván online, người chơi SHALL chỉ chọn được nước đi khi đến lượt mình và đang kết nối. Nước đi SHALL hiện trên bàn của mọi người sau khi server nhận nước đó; trong lúc chờ server trả lời, bàn MUST không cho chọn thêm nước nào, kể cả khi phòng đổi vì việc khác (đối thủ đổi tên). Nước bị server từ chối MUST NOT xuất hiện trên bàn; bàn SHALL hiện đúng trạng thái của server và cho chọn lại nếu vẫn đến lượt. Chế độ online MUST NOT có hoàn tác hay làm lại.

#### Scenario: Đi một nước

- **WHEN** đến lượt người chơi và người đó đặt quân vào một ô trống
- **THEN** quân hiện trên bàn của cả hai người và đến lượt đối thủ

#### Scenario: Khoá bàn khi chờ server

- **WHEN** người chơi vừa đặt quân và server chưa trả lời
- **THEN** bàn không cho chọn ô nào khác

#### Scenario: Đối thủ đổi tên khi đang chờ server

- **WHEN** người chơi vừa đặt quân và, trước khi server trả lời nước đó, đối thủ vào lại phòng với tên mới
- **THEN** bàn vẫn không cho chọn ô nào khác cho tới khi server trả lời nước đi

#### Scenario: Nước bị từ chối

- **WHEN** server từ chối nước người chơi vừa gửi và vẫn đến lượt người đó
- **THEN** quân đó không có trên bàn và người chơi chọn lại được

#### Scenario: Không đi được khi chưa đến lượt

- **WHEN** đang đến lượt đối thủ
- **THEN** bàn của người chơi không cho chọn ô nào

#### Scenario: Không có hoàn tác

- **WHEN** người chơi đang ở màn hình ván online
- **THEN** màn hình không có nút hoàn tác và làm lại

### Requirement: Báo nước đi bị từ chối

Khi luật của game từ chối nước đi của người chơi trong ván online, màn hình SHALL báo ngắn nước đi không hợp lệ cho tới khi ván có nước mới hoặc ván mới; trạng thái kết nối đổi MUST NOT xoá lời báo đó. Lời từ chối mà trạng thái mới của ván đã giải thích (đối thủ vừa đi trước, ván đã xong, chưa đến lượt) MUST NOT kèm lời báo.

#### Scenario: Nước sai luật

- **WHEN** luật của game từ chối nước người chơi vừa gửi, rồi kết nối bị ngắt và nối lại
- **THEN** màn hình vẫn báo nước đi không hợp lệ cho tới khi có nước đi mới

#### Scenario: Lời từ chối đã được giải thích

- **WHEN** server từ chối nước người chơi vừa gửi vì đối thủ đã đi trước
- **THEN** bàn hiện nước của đối thủ và màn hình không báo nước đi không hợp lệ

### Requirement: Báo lượt và kết quả theo bạn và tên đối thủ

Trong ván online, màn hình SHALL nói lượt và kết quả theo "bạn" và tên tạm của đối thủ: đến lượt mình, đang chờ đối thủ (kèm tên), mình thắng, đối thủ thắng (kèm tên), hoà. Khi đối thủ vừa đi và đến lượt mình, lời báo SHALL nêu nước đối thủ vừa đi theo cách gọi của game (ô vừa đánh, lần gieo…). Khi một ván mới bắt đầu, lời báo SHALL nêu phe của người chơi và ai đi trước. Lời báo SHALL nằm trong vùng trình đọc màn hình tự đọc khi thay đổi. Màn hình SHALL ghi rõ đây là ván online.

#### Scenario: Ván online được ghi rõ

- **WHEN** người chơi đang ở màn hình ván online
- **THEN** màn hình có nhãn "Online"

#### Scenario: Đối thủ vừa đi

- **WHEN** đối thủ tên "Minh" vừa đặt quân ở hàng 2, cột 3 và đến lượt người chơi
- **THEN** lời báo cho biết Minh vừa đánh hàng 2, cột 3 và đến lượt người chơi

#### Scenario: Chờ đối thủ

- **WHEN** đang đến lượt đối thủ tên "Minh"
- **THEN** lời báo cho biết đang chờ Minh

#### Scenario: Đối thủ thắng

- **WHEN** đối thủ tên "Minh" hoàn thành một hàng ba quân
- **THEN** lời báo trên màn hình người chơi cho biết Minh thắng

#### Scenario: Ván mới nói rõ phe

- **WHEN** đối thủ tên "Minh" bấm "Chơi lại" và người chơi nay cầm O
- **THEN** lời báo trên màn hình người chơi cho biết ván mới, người chơi cầm O và Minh đi trước

### Requirement: Tự kết nối lại

Khi kết nối bị ngắt, im lặng quá 45 giây, hoặc nước đi hay "Vào chơi" vừa gửi không được trả lời trong 8 giây, trang phòng SHALL tự kết nối lại, với khoảng chờ giãn dần không quá 10 giây, và thử ngay khi có mạng trở lại lúc trang đang hiện, kể cả khi lần thử trước còn treo. Chưa nối lại được sau 1,5 giây thì màn hình SHALL báo đang kết nối lại; khi đó bàn MUST không cho chọn nước đi. Nối lại xong, ván SHALL hiện đúng trạng thái mới nhất của server và người chơi vẫn ngồi đúng ghế.

#### Scenario: Mất mạng rồi có lại

- **WHEN** người chơi mất mạng giữa ván, đối thủ đi một nước, rồi người chơi có mạng trở lại
- **THEN** màn hình người chơi báo đang kết nối lại trong lúc mất mạng
- **AND** sau khi có mạng, bàn hiện nước đối thủ vừa đi và đến lượt người chơi

#### Scenario: Tải lại trang giữa ván

- **WHEN** người chơi tải lại trang phòng giữa ván
- **THEN** ván hiện lại đúng các nước đã đi và người chơi vẫn ở đúng bên của mình

#### Scenario: Server cắt kết nối

- **WHEN** server đóng kết nối của người chơi giữa ván
- **THEN** trang phòng tự kết nối lại và ván tiếp tục đúng lượt

#### Scenario: Kết nối im lặng

- **WHEN** kết nối vẫn mở nhưng không nhận được gì từ server trong 45 giây
- **THEN** trang phòng tự đóng kết nối đó và kết nối lại

#### Scenario: Nước đi không được trả lời

- **WHEN** người chơi gửi một nước đi và server không trả lời trong 8 giây
- **THEN** trang phòng kết nối lại và bàn hiện đúng việc nước đó đã được ghi hay chưa

#### Scenario: Nối lại nhanh không làm nhấp nháy

- **WHEN** kết nối bị cắt và nối lại xong trong vòng 1 giây
- **THEN** màn hình không hiện lời báo đang kết nối lại

### Requirement: Giãn cách khi kết nối lại

Khoảng chờ giữa các lần tự kết nối lại SHALL chỉ ngắn lại sau khi kết nối giữ được ít nhất 30 giây, nên server đóng kết nối ngay sau mỗi lần vào phòng MUST NOT làm trang thử lại liên tục. Lần kết nối bị cắt sau khi đã giữ được 30 giây SHALL được thử lại ngay.

#### Scenario: Server đóng ngay sau mỗi lần vào phòng

- **WHEN** server cho người chơi vào phòng rồi đóng kết nối ngay, nhiều lần liên tiếp
- **THEN** mỗi lần thử lại cách lần trước lâu hơn, tới tối đa 10 giây

### Requirement: Tạm ngắt khi không dùng

Khi trang phòng bị ẩn (chuyển tab, khoá màn hình) từ 60 giây trở lên, hệ thống SHALL đóng kết nối tới server và MUST NOT mở lại kết nối khi trang vẫn ẩn, kể cả khi mạng có lại; khi trang hiện lại, hệ thống SHALL kết nối lại ngay và hiện trạng thái mới nhất của ván. Trang bị ẩn dưới 60 giây MUST NOT bị ngắt.

#### Scenario: Quay lại sau khi chuyển tab lâu

- **WHEN** người chơi chuyển sang tab khác 2 phút, trong lúc đó đối thủ đi một nước, rồi quay lại
- **THEN** trang phòng kết nối lại và bàn hiện nước đối thủ vừa đi

#### Scenario: Chuyển tab nhanh không bị ngắt

- **WHEN** người chơi chuyển sang tab khác 30 giây rồi quay lại
- **THEN** kết nối không bị đóng

#### Scenario: Có mạng lại khi tab đang ẩn

- **WHEN** trang phòng đã bị ẩn quá 60 giây và trình duyệt báo có mạng trở lại
- **THEN** hệ thống không mở kết nối cho tới khi trang hiện lại

### Requirement: Tạm ngắt khi lâu không có hoạt động

Khi 10 phút không có thay đổi nào của phòng và người chơi không thao tác gì trên trang, hệ thống SHALL đóng kết nối và hiện nút "Tiếp tục"; bấm nút SHALL kết nối lại. Việc tự kết nối lại sau khi server cắt kết nối, mà phòng không đổi, MUST NOT được tính là thay đổi của phòng.

#### Scenario: Để trang lâu không chơi

- **WHEN** người chơi để trang phòng mở 10 phút mà phòng không đổi và không thao tác gì
- **THEN** trang báo đã tạm ngắt và có nút "Tiếp tục"
- **AND** bấm "Tiếp tục" thì trang kết nối lại và hiện trạng thái mới nhất

#### Scenario: Server cắt kết nối định kỳ khi trang để không

- **WHEN** người chơi để trang phòng mở 10 phút mà không thao tác gì, phòng không đổi, và server cắt kết nối mỗi 5 phút
- **THEN** trang vẫn báo đã tạm ngắt sau 10 phút và có nút "Tiếp tục"

### Requirement: Phòng không vào được

Trang phòng SHALL hiện trang báo lỗi đã dịch, có lối về menu, khi phòng không tồn tại hoặc đã hết hạn, khi phòng đã đủ người mà người chơi chưa có ghế, hoặc khi không dựng được ván từ dữ liệu của phòng (khi đó có thêm nút thử lại). Khi phiên bản app đang mở đã cũ hơn server, trang SHALL báo ứng dụng vừa được cập nhật và có nút tải lại trang. Các trường hợp này SHALL đóng kết nối tới server và MUST NOT tự kết nối lại; nút thử lại mở phòng từ đầu.

#### Scenario: Phòng không tồn tại

- **WHEN** người chơi mở link của một phòng không tồn tại
- **THEN** trang báo không tìm thấy phòng kèm lối về menu

#### Scenario: Phòng đã đủ người

- **WHEN** người thứ ba mở link của một phòng Tic-tac-toe đã có hai người
- **THEN** trang báo phòng đã đủ người kèm lối về menu
- **AND** trang không kết nối lại tới server

#### Scenario: Ứng dụng vừa cập nhật

- **WHEN** server từ chối kết nối vì phiên bản app đang mở đã cũ
- **THEN** trang báo ứng dụng vừa được cập nhật và có nút tải lại trang

#### Scenario: Dữ liệu phòng hỏng

- **WHEN** trạng thái phòng nhận được không dựng lại được thành ván
- **THEN** trang báo không mở được phòng, có nút thử lại và lối về menu
- **AND** trang không kết nối lại tới server cho tới khi người chơi bấm thử lại

#### Scenario: Trang báo lỗi thay cho màn hình đang mở

- **WHEN** phòng trở nên không vào được trong lúc trang đang hiện "đang vào phòng", sảnh chờ hoặc ván
- **THEN** trang báo lỗi thay cho màn hình đó và tiêu đề của trang báo lỗi nhận focus

### Requirement: Chơi lại trong phòng

Khi ván online đã có kết quả, màn hình SHALL có nút "Chơi lại"; bấm SHALL bắt đầu ván mới trong cùng phòng cho mọi người, với người đi trước đổi so với ván trước. Khi ván chưa có kết quả, nút bắt đầu ván mới MUST không hiện.

#### Scenario: Chơi lại sau khi thắng

- **WHEN** ván Tic-tac-toe online đã có người thắng và một người bấm "Chơi lại"
- **THEN** cả hai người thấy bàn trống, và người đi sau ở ván trước nay đi trước

#### Scenario: Không có ván mới giữa ván

- **WHEN** ván online đang dở
- **THEN** màn hình không có nút bắt đầu ván mới

### Requirement: Tạo phòng

Hệ thống SHALL tạo phòng online cho một game từ màn hình bắt đầu ván (capability `game-setup`) và mở trang phòng của phòng vừa tạo, với người tạo ngồi ghế đầu tiên. Không tạo được phòng (mất mạng, server không trả lời trong 10 giây, server báo lỗi) MUST báo lỗi ngay trên màn hình bắt đầu ván và cho bấm lại; khi server báo phiên bản app đang mở đã cũ, lời báo SHALL nói ứng dụng vừa được cập nhật và có nút tải lại trang.

#### Scenario: Tạo phòng thành công

- **WHEN** người chơi có tên tạm chọn chế độ "Online" ở màn hình bắt đầu ván Tic-tac-toe và bấm "Tạo phòng"
- **THEN** trang phòng mới mở ra với sảnh chờ và người chơi ở ghế đầu tiên

#### Scenario: App cũ khi tạo phòng

- **WHEN** server từ chối tạo phòng vì phiên bản app đang mở đã cũ
- **THEN** màn hình bắt đầu ván báo ứng dụng vừa được cập nhật và có nút tải lại trang

#### Scenario: Không kết nối được server

- **WHEN** server không trả lời khi người chơi bấm "Tạo phòng"
- **THEN** sau tối đa 10 giây màn hình bắt đầu ván báo không tạo được phòng và nút "Tạo phòng" bấm lại được

### Requirement: Trong lúc tạo phòng

Trong lúc đang tạo phòng, nút tạo phòng MUST không bấm lại được và màn hình SHALL báo đang tạo phòng trong vùng trình đọc màn hình tự đọc. Người chơi đã rời màn hình bắt đầu ván trước khi phòng tạo xong MUST NOT bị đưa tới trang phòng.

#### Scenario: Bấm hai lần

- **WHEN** người chơi bấm "Tạo phòng" hai lần liên tiếp
- **THEN** chỉ một phòng được tạo

#### Scenario: Đang tạo phòng

- **WHEN** người chơi bấm "Tạo phòng" và server chưa trả lời
- **THEN** màn hình báo "Đang tạo phòng…"

#### Scenario: Rời màn hình khi đang tạo

- **WHEN** người chơi bấm "Tạo phòng" rồi về menu trước khi server trả lời, và sau đó phòng được tạo
- **THEN** người chơi vẫn ở menu

### Requirement: Luật của phòng online

Phòng online SHALL dùng tuỳ chọn luật đang chọn ở màn hình bắt đầu ván khi tạo phòng, cho mọi ván trong phòng kể cả sau "Chơi lại". Với game có tuỳ chọn, sảnh chờ SHALL ghi luật của phòng để người mở link mời thấy trước khi bấm "Vào chơi", và màn hình ván online SHALL ghi luật như mọi chế độ. Server từ chối tuỳ chọn thì màn hình bắt đầu ván SHALL báo không tạo được phòng.

#### Scenario: Tạo phòng Cờ caro 19×19

- **WHEN** người chơi chọn "Online", "19×19", "Tự do" ở màn hình bắt đầu ván Cờ caro và bấm "Tạo phòng"
- **THEN** sảnh chờ của phòng mới ghi "Luật: 19×19 · Tự do"

#### Scenario: Người được mời thấy luật trước khi vào

- **WHEN** người thứ hai mở link mời của phòng Cờ caro 19×19 luật "tự do"
- **THEN** sảnh chờ ghi "Luật: 19×19 · Tự do" trước khi người đó bấm "Vào chơi"
- **AND** sau khi vào, cả hai người thấy bàn 19×19 và màn hình ván ghi "19×19 · Tự do"

#### Scenario: Chơi lại giữ luật

- **WHEN** ván Cờ caro online 19×19 đã có người thắng và một người bấm "Chơi lại"
- **THEN** cả hai người thấy bàn 19×19 trống và luật vẫn là "tự do"

#### Scenario: Server từ chối tuỳ chọn

- **WHEN** server từ chối tạo phòng vì tuỳ chọn luật không hợp lệ
- **THEN** màn hình bắt đầu ván báo không tạo được phòng và nút "Tạo phòng" bấm lại được

### Requirement: Số ghế của phòng

Phòng tạo từ màn hình bắt đầu ván SHALL có số ghế bằng số người chơi đang chọn ở đó; game có số người cố định SHALL tạo phòng như trước. Sảnh chờ SHALL hiện đủ mọi ghế của phòng, và ván SHALL bắt đầu khi mọi ghế đã có người.

#### Scenario: Tạo phòng 3 người

- **WHEN** người chơi chọn "Online" và "3 người" ở màn hình bắt đầu ván của một game 2–4 người rồi bấm "Tạo phòng"
- **THEN** sảnh chờ của phòng mới có ba ghế, người tạo ở ghế đầu tiên và hai ghế đang chờ

#### Scenario: Tic-tac-toe vẫn tạo phòng hai ghế

- **WHEN** người chơi tạo phòng Tic-tac-toe online
- **THEN** yêu cầu tạo phòng không nêu số người và phòng có hai ghế như trước

### Requirement: Ghế máy ở sảnh chờ

Sảnh chờ SHALL ghi "Máy" ở ghế máy và đánh dấu chủ phòng. Với game hỗ trợ đấu với máy, trong phòng có từ ba ghế, khi ván chưa có nước nào, chủ phòng SHALL thấy ở mỗi ghế trống nút "Cho máy chơi" và ở mỗi ghế máy nút "Bỏ máy", tên đọc được nêu số ghế (và việc ván bắt đầu ngay, ở ghế trống cuối cùng); người khác MUST NOT thấy các nút đó. Khi mọi ghế đã có người hoặc máy, mọi người có ghế SHALL được chuyển sang màn hình ván.

#### Scenario: Chủ phòng cho máy chơi ghế còn lại

- **WHEN** chủ phòng Cờ cá ngựa 3 ghế và một người bạn đã ngồi, chủ phòng bấm "Cho máy chơi" ở ghế 3
- **THEN** cả hai người thấy màn hình ván Cờ cá ngựa 3 người với một ghế máy

#### Scenario: Ghế trống cuối cùng báo bắt đầu ván

- **WHEN** chủ phòng xem sảnh chờ của phòng chỉ còn một ghế trống
- **THEN** nút "Cho máy chơi" ở ghế đó có tên đọc được nói rằng ván sẽ bắt đầu

#### Scenario: Người khác không thấy nút

- **WHEN** người bạn đã ngồi trong phòng Cờ cá ngựa còn ghế trống xem sảnh chờ
- **THEN** sảnh chờ không có nút "Cho máy chơi" hay "Bỏ máy"

#### Scenario: Bỏ máy ở sảnh chờ

- **WHEN** phòng còn ghế trống và chủ phòng bấm "Bỏ máy" ở ghế 3
- **THEN** ghế 3 trở lại "Đang chờ…" và nút ở ghế đó thành "Cho máy chơi"

#### Scenario: Game không hỗ trợ máy

- **WHEN** chủ phòng của một phòng game không hỗ trợ đấu với máy xem sảnh chờ
- **THEN** sảnh chờ không có nút "Cho máy chơi"

#### Scenario: Phòng hai ghế không có ghế máy

- **WHEN** chủ phòng của một phòng Tic-tac-toe xem sảnh chờ khi ghế thứ hai còn trống
- **THEN** sảnh chờ không có nút "Cho máy chơi"

#### Scenario: Lời từ chối không làm mất nước đang gửi

- **WHEN** server từ chối một yêu cầu đổi ghế máy trong lúc một nước đi của người chơi đang chờ trả lời
- **THEN** bàn vẫn khoá cho tới khi server trả lời nước đi đó

### Requirement: Hiện lần lượt các nước nhận cùng lúc

Khi một lần cập nhật của phòng mang nhiều nước mới cùng lúc (máy đi liền nhau, kể cả ván mới mà máy đi đầu), màn hình ván SHALL hiện từng nước một theo đúng thứ tự, mỗi nước không sớm hơn lúc hiệu ứng của nước trước kết thúc và dừng lâu hơn sau mỗi kết quả ngẫu nhiên, và MUST NOT cho người chơi đi trước khi hiện xong. Lần vào phòng, tải lại hay kết nối lại SHALL hiện ngay trạng thái mới nhất.

#### Scenario: Ba máy đi liền nhau

- **WHEN** người chơi đi một nước và trạng thái phòng trả về có thêm sáu nước của ba máy
- **THEN** màn hình hiện lần lượt từng nước của các máy rồi mới tới lượt người chơi
- **AND** bàn không cho người chơi đi trong lúc đang hiện

#### Scenario: Chơi lại với máy đi đầu

- **WHEN** một người bấm "Chơi lại" và ghế máy được xoay vào ghế đầu nên ván mới đến nơi đã có các nước của máy
- **THEN** màn hình hiện bàn mới rồi hiện lần lượt các nước của máy

#### Scenario: Ván mới tới khi đang hiện ván cũ

- **WHEN** màn hình đang hiện lần lượt các nước cuối của một ván, nước cuối kết thúc ván, và ván mới tới trong lúc đó
- **THEN** màn hình hiện hết các nước và kết quả của ván cũ rồi mới hiện ván mới

#### Scenario: Tải lại không phát lại

- **WHEN** người chơi tải lại trang phòng giữa ván có ghế máy
- **THEN** màn hình hiện ngay trạng thái mới nhất của ván

### Requirement: Ván online có ghế máy

Trên màn hình ván online, ghế máy SHALL được gọi là máy như khi đấu với máy (kèm tên ghế khi có từ hai ghế máy), và mỗi nước của máy SHALL được nêu trong lời báo khi hiện, kể cả khi lượt kế tiếp vẫn là máy. Màn hình SHALL vẫn ghi "Online", không có hoàn tác, và có nút "Chơi lại" khi ván có kết quả, kể cả khi người chơi là người duy nhất trong phòng.

#### Scenario: Chờ máy

- **WHEN** trong ván online có hai ghế máy, đang hiện lượt của máy ở ghế tên "Xanh dương"
- **THEN** lời báo là "Máy (Xanh dương) đang nghĩ…"

#### Scenario: Báo nước máy đá ngựa

- **WHEN** trong lúc hiện lần lượt, máy "Xanh dương" đá ngựa của người chơi rồi tới lượt máy "Vàng"
- **THEN** lời báo nêu nước máy "Xanh dương" vừa đi kèm việc đá ngựa, và máy "Vàng" đang nghĩ

#### Scenario: Một người với ba máy

- **WHEN** chủ phòng Cờ cá ngựa 4 ghế cho máy chơi ba ghế còn lại và ván đã có kết quả
- **THEN** màn hình ghi "Online" và có nút "Chơi lại"

### Requirement: Báo nước đi từ nơi khác

Trong ván online, mỗi nước không do người chơi trên thiết bị này đi (của người ở xa hay của ghế máy) SHALL được nêu trong lời báo khi hiện, theo cách gọi của game, kèm ai vừa đi và lượt kế tiếp: đến lượt mình, đang chờ người nào, hay máy nào đang nghĩ. Ván mới mà ghế máy đi trước SHALL được báo kèm phe của người chơi và việc máy đi trước.

#### Scenario: Người ở xa đi rồi chờ người khác

- **WHEN** trong ván Cờ cá ngựa online 3 người, Minh gieo được 3, mất lượt, và tới lượt Lan
- **THEN** lời báo trên màn hình người chơi là "Minh vừa gieo được 3, mất lượt. Đang chờ Lan…"

#### Scenario: Nước giữa lượt của người ở xa

- **WHEN** Minh gieo được 6 và vẫn tới lượt Minh
- **THEN** lời báo là "Minh vừa gieo được 6. Đang chờ Minh…"

#### Scenario: Máy đi rồi chờ người ở xa

- **WHEN** ghế máy duy nhất của phòng gieo được 3, mất lượt, và tới lượt Lan
- **THEN** lời báo là "Máy gieo được 3, mất lượt. Đang chờ Lan…"

#### Scenario: Người ở xa đi rồi tới máy

- **WHEN** Minh gieo được 3, mất lượt, và tới lượt ghế máy duy nhất
- **THEN** lời báo là "Minh vừa gieo được 3, mất lượt. Máy đang nghĩ…"

#### Scenario: Ván mới máy đi trước

- **WHEN** ván Cờ cá ngựa online 3 người có một ghế máy đã kết thúc, một người bấm "Chơi lại", ghế máy được xoay vào ghế đầu và người chơi nay ở ghế "Xanh dương"
- **THEN** lời báo trên màn hình người chơi là "Ván mới: bạn cầm Xanh dương, máy đi trước"

### Requirement: Bảng người chơi khi chơi online

Trong ván online, bảng người chơi SHALL ghi ghế của người ở thiết bị này là "Bạn", ghế của người khác bằng tên họ chọn, và ghế máy là máy. Ghế "Bạn" SHALL kèm trạng thái kết nối của thiết bị này bằng chữ khác với dòng báo kết nối của màn hình: "Đã kết nối", hoặc "Mất kết nối" khi mất kết nối quá 1,5 giây hay khi đã tạm ngắt.

#### Scenario: Hai người trong phòng

- **WHEN** Lan và Minh đang chơi Tic-tac-toe online và Lan nhìn màn hình của mình
- **THEN** bảng người chơi của Lan có ghế "Bạn" kèm "Đã kết nối" và ghế "Minh"

#### Scenario: Mất kết nối

- **WHEN** kết nối của Lan bị mất quá 1,5 giây giữa ván online
- **THEN** ghế "Bạn" trong bảng người chơi của Lan ghi "Mất kết nối" và màn hình vẫn có dòng "Đang kết nối lại…"

#### Scenario: Cờ cá ngựa online vừa màn hình máy tính

- **WHEN** người chơi trong phòng Cờ cá ngựa 4 ghế ở khung 1280 × 800 vừa gieo được 6 với bốn ngựa đi được
- **THEN** bàn, chỗ dành cho dòng báo kết nối, dòng lượt, bảng người chơi, xúc xắc và cả bốn lựa chọn ngựa nằm trong màn hình mà không cần cuộn

### Requirement: Đầu hàng khi chơi online

Màn hình ván online SHALL có nút "Đầu hàng" khi phòng đủ người, ván chưa kết thúc và người ở thiết bị này tự chơi ghế của mình; khi chưa kết nối, nút MUST NOT bấm được và SHALL nêu lý do. Bấm SHALL hỏi xác nhận, nói rõ hậu quả: đối thủ thắng, hay máy chơi thay tới hết ván và người chơi vẫn xem được; huỷ MUST NOT đổi gì. Thẻ kết quả SHALL có dòng giải thích ai đã đầu hàng. Đã để máy chơi thay thì bàn MUST NOT cho người đó đi.

#### Scenario: Hỏi trước khi đầu hàng

- **WHEN** Lan đang chơi Cờ vua online với Minh và bấm "Đầu hàng"
- **THEN** hộp thoại hỏi xác nhận nói Minh sẽ thắng ván này, nút "Chơi tiếp" có tiêu điểm
- **AND** bấm "Chơi tiếp" thì hộp thoại đóng, ván vẫn tiếp tục và tiêu điểm về nút "Đầu hàng"

#### Scenario: Đầu hàng Cờ vua

- **WHEN** Lan xác nhận đầu hàng trong ván Cờ vua online với Minh
- **THEN** màn hình của Lan báo "Minh thắng!" kèm dòng "Bạn đã đầu hàng." và nút "Chơi lại", tiêu điểm ở tiêu đề màn hình
- **AND** màn hình của Minh báo "Bạn thắng!" kèm dòng "Lan đã đầu hàng." và nút "Chơi lại"

#### Scenario: Đầu hàng Cờ cá ngựa

- **WHEN** Lan xác nhận đầu hàng trong ván Cờ cá ngựa online 3 người
- **THEN** ghế của Lan ghi "Bạn" kèm "Máy chơi thay", bàn của Lan không cho gieo hay chọn ngựa và ván tiếp tục

#### Scenario: Hỏi đầu hàng Cờ cá ngựa hai người

- **WHEN** Lan bấm "Đầu hàng" trong ván Cờ cá ngựa online 2 người với Minh
- **THEN** hộp thoại nói Minh sẽ thắng ván này, không nói tới máy chơi thay

#### Scenario: Đang kết nối lại

- **WHEN** người chơi đang mất kết nối giữa ván online
- **THEN** nút "Đầu hàng" không bấm được và nêu lý do đang kết nối lại

#### Scenario: Không có nút khi ván đã kết thúc

- **WHEN** ván online đã có kết quả
- **THEN** màn hình không có nút "Đầu hàng"

### Requirement: Chờ người lâu chưa đi

Khi chờ một người ở xa tự chơi ghế của họ, từ 1 phút màn hình SHALL hiện thời gian đã chờ và sau bao lâu thì xử được bỏ ván; từ 5 phút SHALL có nút xử ("Xử thắng", "Cho máy chơi thay" hay "Kết thúc ván" theo hậu quả), bấm hỏi xác nhận. Thời gian SHALL tính từ thời lượng server cho biết, không theo giờ thiết bị. Dòng lượt SHALL đọc một lần khi nút xuất hiện, MUST NOT đọc từng giây. Server từ chối thì SHALL báo chưa xử được.

#### Scenario: Chưa tới 1 phút

- **WHEN** đang chờ Minh đi được 40 giây
- **THEN** màn hình không có thời gian chờ và không có nút xử bỏ ván

#### Scenario: Đang chờ

- **WHEN** đang chờ Minh đi được 2 phút 13 giây trong ván Cờ caro online
- **THEN** màn hình ghi "Minh chưa đi · 2:13" và cho biết sau 5 phút người chơi có thể xử thắng

#### Scenario: Đủ 5 phút

- **WHEN** đang chờ Minh đi được 5 phút mà người chơi không chạm vào màn hình
- **THEN** có nút "Xử thắng" và lời báo của dòng lượt đọc một lần rằng Minh đã 5 phút chưa đi

#### Scenario: Xử thắng

- **WHEN** người chơi bấm "Xử thắng" và xác nhận
- **THEN** màn hình báo "Bạn thắng!" kèm dòng "Minh bỏ ván: quá 5 phút không đi." và nút "Chơi lại"

#### Scenario: Người vắng đi trong lúc hỏi

- **WHEN** hộp thoại xác nhận xử bỏ ván đang mở và Minh đi một nước
- **THEN** hộp thoại đóng, ván không kết thúc và tiêu điểm về tiêu đề màn hình

#### Scenario: Server chưa cho xử

- **WHEN** người chơi xác nhận xử bỏ ván nhưng server từ chối vì lượt của Minh chưa đủ 5 phút
- **THEN** màn hình báo chưa thể xử, thời gian chờ được tính lại theo server và nút xử biến mất tới khi đủ 5 phút

#### Scenario: Cho máy chơi thay

- **WHEN** trong ván Cờ cá ngựa online 3 người đang chờ Minh 5 phút, người chơi bấm "Cho máy chơi thay" và xác nhận
- **THEN** ghế của Minh ghi "Máy chơi thay", nước của máy cho ghế đó được báo và ván tiếp tục

#### Scenario: Giờ của thiết bị sai

- **WHEN** đồng hồ của thiết bị chạy nhanh hơn server 10 phút và đang chờ Minh đi được 1 phút theo server
- **THEN** màn hình không có nút xử bỏ ván

### Requirement: Nhắc người đến lượt

Trong ván online, khi lượt của người ở thiết bị này đã kéo dài từ 4 phút, màn hình SHALL nhắc còn bao lâu trước khi người khác xử được bỏ ván (thua, hay máy chơi thay với phòng từ ba ghế của game có máy). Lời nhắc SHALL được đọc một lần khi xuất hiện. Đi một nước SHALL làm lời nhắc biến mất.

#### Scenario: Còn dưới một phút

- **WHEN** lượt của người chơi trong ván Cờ vua online đã kéo dài 4 phút 18 giây
- **THEN** màn hình ghi còn 0:42 và quá 5 phút người khác có thể xử thắng

#### Scenario: Đi xong thì hết nhắc

- **WHEN** lời nhắc đang hiện và người chơi đi một nước
- **THEN** lời nhắc không còn

### Requirement: Ghế máy chơi thay trên màn hình

Ghế do máy chơi thay SHALL hiện tên người kèm "Máy chơi thay" trong bảng người chơi và thanh ghế; ghế của người ở thiết bị này ghi "Bạn" kèm "Máy chơi thay". Mỗi nước của ghế đó SHALL được báo như nước của máy kèm tên người, và khi ghế đó thắng, kết quả là "Máy (thay <tên>) thắng!" trên mọi màn hình, không ăn mừng trên màn hình của chính người đó.

#### Scenario: Báo nước của máy chơi thay

- **WHEN** máy chơi thay Minh gieo được 3, mất lượt, và tới lượt người chơi cầm Đỏ
- **THEN** lời báo là "Máy (thay Minh) gieo được 3, mất lượt. Đến lượt bạn (Đỏ)"

#### Scenario: Máy chơi thay mình

- **WHEN** máy đang chơi thay ghế của người chơi và tới lượt ghế đó
- **THEN** dòng lượt nói máy đang chơi thay bạn

#### Scenario: Máy chơi thay thắng

- **WHEN** máy chơi thay Lan về đích trước trong ván Cờ cá ngựa online
- **THEN** màn hình của Lan báo "Máy (thay Lan) thắng!" và không có hiệu ứng ăn mừng
- **AND** màn hình của những người khác cũng báo "Máy (thay Lan) thắng!"
