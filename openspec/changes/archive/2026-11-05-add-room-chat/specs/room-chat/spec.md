## Purpose

Cho những người có ghế trong một phòng online nói chuyện với nhau ngay trong sảnh chờ và lúc chơi, ở mọi game, mà không ảnh hưởng tới ván, không lộ danh tính và tắt được theo từng trình duyệt.

## ADDED Requirements

### Requirement: Chat có ở đâu

Mọi game SHALL có chat ở sảnh chờ và màn hình chơi của phòng online, cả khi ván đã kết thúc. Chơi cùng máy và đấu với máy MUST NOT có chat. Chat SHALL chỉ hiện khi phòng có từ hai người có ghế trở lên: ngồi một mình ở sảnh chờ hay chơi một mình với các ghế máy MUST NOT có chat. Đủ người trong lúc đang ở sảnh chờ, chat SHALL giữ nguyên trạng thái đóng mở và chữ đang gõ.

#### Scenario: Chat trong ván online

- **WHEN** hai người đang chơi một ván online, ở bất kỳ game nào
- **THEN** mỗi người có nút mở chat trên màn hình chơi

#### Scenario: Chat ở sảnh chờ

- **WHEN** hai người đã ngồi vào ghế và đang chờ người thứ ba ở sảnh chờ
- **THEN** cả hai mở được chat

#### Scenario: Một mình ở sảnh chờ

- **WHEN** chỉ có một người ngồi ghế ở sảnh chờ
- **THEN** sảnh chờ không có nút chat, và nút hiện ra ngay khi người thứ hai ngồi vào ghế

#### Scenario: Sau khi ván kết thúc

- **WHEN** ván online vừa kết thúc
- **THEN** mỗi người vẫn có nút mở chat

#### Scenario: Chơi cùng máy

- **WHEN** người chơi mở một ván cùng máy hoặc đấu với máy
- **THEN** màn hình chơi không có chat

#### Scenario: Một người với các ghế máy

- **WHEN** ván online có đúng một người và mọi ghế còn lại là ghế máy
- **THEN** màn hình chơi không có chat

#### Scenario: Đủ người khi đang gõ

- **WHEN** người chơi đang gõ dở trong chat ở sảnh chờ và người cuối cùng ngồi vào ghế
- **THEN** màn hình chơi hiện ra, chat vẫn mở, chữ đang gõ còn nguyên và tiêu điểm vẫn ở ô nhập

### Requirement: Ai đọc và gửi được

Chỉ người đang có ghế trong phòng SHALL đọc và gửi được tin; người ở ghế có máy chơi thay vẫn là người có ghế. Server MUST NOT gửi nội dung chat cho kết nối chưa có ghế, và MUST từ chối tin của kết nối đó bằng `not-seated`. Người vừa vào ghế SHALL thấy các tin đang được giữ của phòng. Máy MUST NOT gửi tin.

#### Scenario: Người chưa có ghế không thấy tin

- **WHEN** phòng đã có tin và một người mở link phòng nhưng chưa bấm "Vào chơi"
- **THEN** trạng thái phòng gửi cho người đó không có tin nào

#### Scenario: Người chưa có ghế gửi tin

- **WHEN** một kết nối chưa có ghế gửi một tin
- **THEN** server từ chối bằng `not-seated` và phòng không đổi

#### Scenario: Người vừa vào ghế

- **WHEN** phòng đã có hai tin và một người bấm "Vào chơi"
- **THEN** người đó thấy cả hai tin, không có bong bóng và số chưa đọc vẫn là 0

#### Scenario: Người đã đầu hàng

- **WHEN** trong phòng Cờ cá ngựa ba người, một người đầu hàng và máy chơi thay ghế đó
- **THEN** người đó vẫn có nút mở chat, đọc và gửi được tin

#### Scenario: Máy không gửi tin

- **WHEN** phòng có ghế máy và ghế máy đi một nước
- **THEN** danh sách tin của phòng không đổi

### Requirement: Loại tin

Một tin SHALL là một trong ba loại: văn bản gõ tự do, một câu có sẵn, hoặc một emoji cảm xúc. Câu có sẵn và emoji SHALL gửi được bằng một chạm, chọn từ danh sách của app, và có tên đọc được theo ngôn ngữ giao diện; server MUST từ chối bằng `invalid-chat` mã không có trong danh sách. Câu có sẵn SHALL hiện theo ngôn ngữ của người đọc.

#### Scenario: Câu có sẵn theo ngôn ngữ người đọc

- **WHEN** người dùng tiếng Việt chạm câu "Chơi hay đấy" và người kia dùng tiếng Anh
- **THEN** người kia thấy câu đó bằng tiếng Anh

#### Scenario: Câu có sẵn không có trong danh sách

- **WHEN** một client gửi một câu có sẵn với mã không có trong danh sách
- **THEN** server từ chối bằng `invalid-chat`, kết nối vẫn mở

#### Scenario: Tên đọc được của emoji

- **WHEN** trình đọc màn hình đọc nút emoji 👍 khi giao diện là tiếng Nhật
- **THEN** tên của nút bằng tiếng Nhật

### Requirement: Làm sạch văn bản

Server SHALL làm sạch văn bản trước khi lưu: đổi ngắt dòng thành khoảng trắng, bỏ ký tự điều khiển và định dạng trừ ký tự nối giữa hai emoji, chuẩn hoá NFC, gộp khoảng trắng, bỏ khoảng trắng đầu cuối, giới hạn dấu chồng trên một chữ. Văn bản không còn ký tự nhìn thấy hoặc dài hơn 200 ký tự (đếm theo code point) MUST bị từ chối bằng `invalid-chat`, kết nối vẫn mở. Văn bản SHALL hiện như chữ thường, MUST NOT được hiểu là HTML hay thành link bấm được.

#### Scenario: Tin quá dài

- **WHEN** một client gửi văn bản 201 ký tự
- **THEN** server từ chối bằng `invalid-chat` và kết nối vẫn mở

#### Scenario: Ký tự đảo chiều chữ

- **WHEN** văn bản chứa ký tự đảo chiều U+202E
- **THEN** tin được lưu không có ký tự đó

#### Scenario: Emoji ghép giữ nguyên

- **WHEN** văn bản chứa emoji ghép bằng ký tự nối, như 🧑‍💻
- **THEN** tin được lưu và hiện nguyên emoji đó

#### Scenario: Tin vô hình

- **WHEN** văn bản chỉ gồm ký tự không nhìn thấy như U+200B, U+200D, U+3164 hay U+2800
- **THEN** server từ chối bằng `invalid-chat`

#### Scenario: Dấu chồng quá nhiều

- **WHEN** văn bản là một chữ kèm 100 dấu chồng
- **THEN** tin được lưu chỉ giữ số dấu giới hạn, và không tràn ra ngoài khung tin

#### Scenario: Chữ tiếng Việt có dấu

- **WHEN** văn bản tiếng Việt ở dạng NFD có dấu chồng như "Ngẫu nhiên"
- **THEN** tin được lưu ở dạng NFC và giữ đủ dấu

#### Scenario: Văn bản giống HTML

- **WHEN** người chơi gửi `<b>chào</b> https://example.com`
- **THEN** người đọc thấy đúng chuỗi đó dưới dạng chữ, không có chữ đậm, không có link bấm được

### Requirement: Giữ tin theo phòng

Phòng SHALL giữ 30 tin gần nhất, qua nối lại, tải lại trang và các ván "Chơi lại", và tin SHALL bị xoá cùng phòng. Mỗi tin ghi được SHALL gia hạn phòng như mọi thay đổi khác. Phòng lưu trước khi có chat SHALL đọc được như phòng chưa có tin nào; một tin lưu hỏng MUST NOT làm mất phòng.

#### Scenario: Nối lại vẫn còn tin

- **WHEN** kết nối bị cắt và nối lại trong lúc phòng có 5 tin
- **THEN** người chơi vẫn thấy 5 tin đó và các tin gửi trong lúc mất kết nối

#### Scenario: Tin thứ 31

- **WHEN** phòng đã có 30 tin và có thêm một tin
- **THEN** tin cũ nhất bị bỏ và phòng còn 30 tin

#### Scenario: Qua ván mới

- **WHEN** ván kết thúc và mọi người bấm "Chơi lại"
- **THEN** các tin trước đó vẫn còn

#### Scenario: Phòng từ bản trước

- **WHEN** kho có một phòng đang dở lưu trước khi có chat và một người gửi tin đầu tiên
- **THEN** ván chơi tiếp đúng như cũ và phòng có một tin

#### Scenario: Tin lưu hỏng

- **WHEN** dữ liệu phòng trong kho có một tin không đọc được
- **THEN** phòng vẫn vào được, ván chơi tiếp được, chỉ tin đó không hiện

#### Scenario: Tin gia hạn phòng

- **WHEN** một tin được ghi vào phòng
- **THEN** phòng trong kho có thời hạn 7 ngày tính từ lúc ghi

### Requirement: Giới hạn tốc độ gửi

Mỗi người SHALL gửi được tối đa 5 tin trong 10 giây, tính theo thời gian của server trên mọi kết nối của họ. Tin vượt giới hạn MUST bị từ chối bằng `chat-too-fast`. Bấm hay chạm liên tục MUST NOT làm đóng hay nối lại kết nối: màn hình SHALL tự dừng gửi khi đã tới giới hạn, nói người chơi gửi chậm lại và giữ nguyên nội dung đang gõ.

#### Scenario: Tin thứ sáu

- **WHEN** một người đã gửi 5 tin trong 10 giây và client gửi tin thứ sáu
- **THEN** server từ chối bằng `chat-too-fast`, kết nối vẫn mở và ván vẫn chơi tiếp được

#### Scenario: Hai kết nối của một người

- **WHEN** một người mở phòng ở hai tab và tổng cộng gửi 6 tin trong 10 giây
- **THEN** tin thứ sáu bị từ chối

#### Scenario: Chạm liên tục vào emoji

- **WHEN** người chơi chạm liên tục vào một emoji trong 15 giây, hoặc giữ phím Enter trong ô nhập
- **THEN** kết nối không bị đóng hay nối lại, và màn hình nói gửi chậm lại

### Requirement: Gửi không mất chữ, không trùng

Tin SHALL chỉ hiện trong danh sách khi server đã ghi. Chữ người chơi đang gõ MUST NOT mất: khi có xác nhận, ô nhập chỉ xoá nếu nội dung vẫn đúng là tin vừa gửi. Gửi lại cùng một nội dung MUST NOT tạo tin thứ hai; nội dung đã sửa SHALL là tin mới. Không gửi được SHALL được báo tại chỗ, cho gửi lại, kể cả câu có sẵn và emoji; MUST NOT ảnh hưởng tới ván. Khi không có kết nối, chat SHALL nói lý do.

#### Scenario: Server xác nhận

- **WHEN** người chơi gửi một văn bản và server ghi xong
- **THEN** tin hiện trong danh sách và ô nhập trống

#### Scenario: Gõ tiếp khi đang gửi

- **WHEN** người chơi gửi "chào", gõ tiếp "cả nhà" trước khi có xác nhận
- **THEN** khi có xác nhận, tin "chào" hiện trong danh sách và ô nhập vẫn có chữ đang gõ

#### Scenario: Gửi lại sau khi không có trả lời

- **WHEN** tin đã được server ghi nhưng người gửi mất kết nối trước khi nhận trả lời, và họ gửi lại nguyên nội dung sau khi nối lại
- **THEN** phòng chỉ có một tin đó

#### Scenario: Sửa rồi gửi lại

- **WHEN** tin báo chưa gửi được, người chơi sửa nội dung rồi gửi lại
- **THEN** nội dung đã sửa được gửi là một tin mới

#### Scenario: Kho không trả lời

- **WHEN** server không ghi được tin vì kho lỗi
- **THEN** màn hình báo chưa gửi được, nội dung còn trong ô nhập và ván chơi tiếp được

#### Scenario: Câu có sẵn chưa gửi được

- **WHEN** một câu có sẵn không gửi được, kể cả vì gửi quá nhanh
- **THEN** chat báo chưa gửi được câu đó và có nút gửi lại

#### Scenario: Tin mất cùng kết nối

- **WHEN** kết nối bị cắt lúc một tin đang chờ, và bản phòng sau khi nối lại không có tin đó
- **THEN** chat báo chưa gửi được ngay khi nối lại, không chờ hết thời gian và không nối lại thêm lần nữa

#### Scenario: Không gửi được khi chat đóng

- **WHEN** người chơi đã đóng chat và tin vừa gửi bị báo chưa gửi được
- **THEN** nút chat có dấu lỗi, tên đọc được của nút nói chưa gửi được

#### Scenario: Gõ khi đang nối lại

- **WHEN** kết nối đang được nối lại và người chơi gõ tiếp vào ô nhập
- **THEN** chữ vào ô nhập bình thường, chỉ việc gửi phải chờ

#### Scenario: Đang mất kết nối

- **WHEN** kết nối đang được nối lại và người chơi đưa tiêu điểm tới nút gửi
- **THEN** nút được mô tả là chưa gửi được vì đang kết nối lại, và bấm không gửi gì

#### Scenario: Kết nối đang tạm dừng

- **WHEN** kết nối đã dừng vì lâu không hoạt động và người chơi mở chat
- **THEN** chat nói kết nối đang dừng và có nút "Tiếp tục" ngay trong khung chat

### Requirement: Chat không đụng tới ván

Tin chat MUST NOT đổi thời điểm bắt đầu lượt, MUST NOT vào lịch sử nước đi, MUST NOT làm chậm hay đổi thứ tự việc hiện nước đi. Ghi nước đi xung đột với tin chat SHALL được thử lại mà không tính vào số lần thử của nước đi, và không tính lại ván trong tối đa 10 lần ghi lại liên tiếp; quá số đó thì ván được tính lại một lần. Trong giới hạn tốc độ, chat MUST NOT làm nước đi bị từ chối. Tin mới SHALL có ngay trong danh sách cả khi các nước đi đang được hiện lần lượt.

#### Scenario: Đồng hồ bỏ ván

- **WHEN** đang tới lượt Lan được 4 phút và người kia gửi một tin
- **THEN** Lan vẫn bị tính đã hết lượt sau đúng 5 phút kể từ đầu lượt

#### Scenario: Lịch sử ván

- **WHEN** phòng có tin chat và một nước đi mới
- **THEN** số nước đi của ván chỉ tăng đúng một, và phát lại ván không có tin chat

#### Scenario: Nước đi trùng lúc với tin

- **WHEN** hai người gửi cùng lúc một nước đi và một tin chat
- **THEN** cả nước đi và tin đều được ghi

#### Scenario: Nước đi giữa loạt tin

- **WHEN** bốn người gửi hết 5 tin mỗi người cùng lúc với một nước đi
- **THEN** nước đi và mọi tin đều được ghi, không có từ chối nào vì kho

#### Scenario: Tin tới khi đang hiện lần lượt các nước

- **WHEN** màn hình đang hiện lần lượt nước của các ghế máy và có tin mới
- **THEN** tin có ngay trong danh sách, các nước đi vẫn hiện đúng thứ tự và đúng nhịp

### Requirement: Không lộ danh tính trong chat

Tin gửi cho client MUST chỉ có tên người gửi tại lúc gửi, cho biết tin có phải của chính người nhận hay không, và nội dung; MUST NOT có `playerId`. Server MUST NOT ghi nội dung tin vào log.

#### Scenario: Tin không có playerId

- **WHEN** một người có ghế nhận trạng thái phòng có tin
- **THEN** mỗi tin có tên người gửi và cho biết có phải tin của mình, không có `playerId` nào

#### Scenario: Tin của mình sau khi xoay ghế

- **WHEN** một người đã gửi tin ở ván trước và ván mới đã xoay ghế
- **THEN** tin đó vẫn được hiện là của người đó

#### Scenario: Đổi tên sau khi gửi

- **WHEN** một người gửi tin rồi đổi tên
- **THEN** tin cũ vẫn mang tên lúc gửi

#### Scenario: Kho lỗi không log nội dung

- **WHEN** server không ghi được một tin vì kho lỗi
- **THEN** log của server có lỗi nhưng không có nội dung tin

### Requirement: Tin đến khi chat đóng

Khi chat đóng và chưa tắt, tin mới của người khác tới lúc đang mở trang SHALL hiện thành bong bóng từ 3 đến 5 giây và tăng số chưa đọc; chạm bong bóng SHALL mở chat. Nút chat ngoài màn hình thì số chưa đọc SHALL thấy được ở thẻ dưới thanh trên. Tin có sẵn khi mở trang MUST NOT hiện bong bóng. Trong lúc cú tung xúc xắc đang chạy, bong bóng SHALL chờ tới khi xong. Mở chat SHALL xoá số chưa đọc.

#### Scenario: Tin mới khi chat đóng

- **WHEN** chat đang đóng và Lan gửi "Chào"
- **THEN** người chơi thấy bong bóng có tên Lan và "Chào", nút chat có số 1, bàn không dịch chuyển và không bị che

#### Scenario: Nút chat ngoài màn hình

- **WHEN** ở khung 360 × 740 nút chat nằm dưới mép màn hình, còn tin chưa đọc và bong bóng đã tắt
- **THEN** dưới thanh trên cùng có thẻ nhỏ ghi Chat và số chưa đọc; chạm vào thẻ thì mở chat

#### Scenario: Tin của mình

- **WHEN** người chơi gửi một câu có sẵn từ một tab khác của mình
- **THEN** không có bong bóng và số chưa đọc không tăng

#### Scenario: Tải lại trang

- **WHEN** phòng có 10 tin và người chơi tải lại trang
- **THEN** không có bong bóng nào hiện ra cho các tin đó

#### Scenario: Mở chat

- **WHEN** nút chat có số 3 và người chơi mở chat
- **THEN** số chưa đọc về 0 và tin mới nhất hiện trong danh sách

#### Scenario: Hơn 30 tin chưa đọc

- **WHEN** người chơi không mở chat và phòng có thêm 35 tin của người khác
- **THEN** số chưa đọc là 30 và mở chat thấy 30 tin mới nhất

#### Scenario: Tin tới trong cú tung

- **WHEN** Cờ cá ngựa đang chạy cú tung xúc xắc và Lan gửi một tin
- **THEN** số chưa đọc tăng, bong bóng chỉ hiện sau khi lớp mờ tắt

#### Scenario: Giảm chuyển động

- **WHEN** hệ thống bật giảm chuyển động và có tin mới khi chat đóng
- **THEN** bong bóng hiện và ẩn không có hiệu ứng di chuyển

### Requirement: Bong bóng không che bàn

Bong bóng, emoji nổi và thẻ dưới thanh trên MUST NOT che bàn hay nút gieo, MUST NOT làm bàn dịch chuyển. Khi trang đã cuộn tới mức chúng sẽ chồng lên bàn thì chúng MUST NOT hiện, và tin vẫn SHALL tăng số chưa đọc trên nút chat.

#### Scenario: Trang đã cuộn tới bàn

- **WHEN** ở khung 360 × 640 người chơi đã cuộn để bàn lên sát thanh trên cùng, và Lan gửi một tin
- **THEN** không có bong bóng hay thẻ nào chồng lên bàn, và nút chat có số 1

#### Scenario: Cuộn khi bong bóng đang hiện

- **WHEN** bong bóng đang hiện và người chơi cuộn tới mức nó sẽ chồng lên bàn
- **THEN** bong bóng tắt ngay, số chưa đọc vẫn còn

### Requirement: Tắt chat

Người chơi SHALL tắt được chat trên trình duyệt này; lựa chọn SHALL được nhớ cho mọi phòng. Khi tắt, MUST NOT có bong bóng, số chưa đọc và lời đọc tin mới; nút chat vẫn mở được danh sách để bật lại, và màn hình SHALL nói rõ chat đang tắt. Bật lại MUST NOT tính các tin đã tới lúc tắt là chưa đọc. Tắt chat MUST NOT ảnh hưởng tới người khác.

#### Scenario: Tắt rồi có tin mới

- **WHEN** người chơi đã tắt chat và Lan gửi một tin
- **THEN** không có bong bóng, nút chat không có số

#### Scenario: Nhớ lựa chọn

- **WHEN** người chơi đã tắt chat rồi vào một phòng khác trên cùng trình duyệt
- **THEN** chat vẫn đang tắt

#### Scenario: Bật lại

- **WHEN** có 3 tin tới trong lúc tắt và người chơi bật lại chat
- **THEN** số chưa đọc là 0 và 3 tin đó có trong danh sách

### Requirement: Bố cục chat

Mở, đóng chat hay có tin mới MUST NOT làm bàn dịch chuyển hay đổi cỡ. Trên điện thoại dọc, chat SHALL là tấm trượt từ dưới lên, chừa phần đầu bàn; khi bàn phím ảo mở, ô nhập và tin mới nhất SHALL vẫn thấy được. Điện thoại ngang, chat SHALL nằm cạnh bàn, không che bàn. Ở khung rộng 360 px MUST NOT cuộn ngang, và tin dài không có khoảng trắng SHALL xuống dòng.

#### Scenario: Bàn đứng yên trên điện thoại

- **WHEN** người chơi mở rồi đóng chat ở khung 360 × 740
- **THEN** vị trí và cỡ của bàn không đổi, trang không cuộn ngang

#### Scenario: Bàn phím ảo mở

- **WHEN** vùng nhìn thấy của khung 360 × 740 thu lại còn 470 px vì bàn phím ảo
- **THEN** ô nhập và tin mới nhất nằm trong vùng nhìn thấy

#### Scenario: Điện thoại ngang

- **WHEN** người chơi mở chat ở khung 844 × 390
- **THEN** chat không che ô nào của bàn

#### Scenario: Đủ người khi chat đang mở trên điện thoại

- **WHEN** chat đang mở ở sảnh chờ khung 360 × 740 và ván bắt đầu
- **THEN** tấm chat thu lại để vẫn thấy ít nhất 96 px đầu bàn

#### Scenario: Tin dài liền nhau

- **WHEN** có một tin 200 ký tự không có khoảng trắng ở khung 360 px
- **THEN** tin xuống dòng trong khung tin và trang không cuộn ngang

### Requirement: Chat trên máy tính

Trên máy tính, bàn và điều khiển của ván SHALL vẫn dùng được khi chat mở, trang không cuộn; lời của bàn mà bảng che (dòng lượt, tên quân đang chọn, dòng chiếu) SHALL được nói trong đầu bảng. Sảnh chờ ở khung không đủ chỗ đặt bảng bên cạnh SHALL dùng tấm trượt, MUST NOT che nút chat.

#### Scenario: Máy tính vẫn đi được khi chat mở

- **WHEN** chat đang mở ở khung 1280 × 800 và tới lượt người chơi
- **THEN** người chơi đi được một nước mà không phải đóng chat, dòng lượt vẫn đọc được trong khung chat, và ở Cờ cá ngựa xúc xắc cùng nút gieo không bị che

#### Scenario: Lời của bàn bị bảng che

- **WHEN** chat đang mở ở khung 1280 × 800 trên Cờ vua và vua đang bị chiếu
- **THEN** dòng chiếu hiện trong đầu bảng, Sổ ghi và các nút của ván không bị che

#### Scenario: Sảnh chờ ở khung vừa

- **WHEN** người chơi mở chat ở sảnh chờ khung rộng 1024 px
- **THEN** chat là tấm trượt, không che nút chat, và cuộn trang thì thấy đủ danh sách người chơi

### Requirement: Chat bằng bàn phím và trình đọc màn hình

Mọi thao tác chat SHALL làm được bằng bàn phím: Enter gửi, Esc đóng và trả tiêu điểm về nút chat; khi đang gõ bằng bộ gõ, Enter và Esc MUST NOT gửi hay đóng. Danh sách tin SHALL là vùng nhật ký có tên; tin mới được đọc ở mức lịch sự, không ngắt dòng báo lượt và MUST NOT đọc hai lần. Danh sách MUST NOT tự cuộn khi người chơi đang đọc tin cũ, khi đó SHALL có nút tới tin mới. Tên nút chat SHALL nêu số tin chưa đọc.

#### Scenario: Gửi và đóng bằng bàn phím

- **WHEN** người chơi mở chat bằng bàn phím, gõ một câu, nhấn Enter rồi nhấn Esc
- **THEN** tin được gửi, chat đóng và tiêu điểm ở nút chat

#### Scenario: Enter khi đang gõ bằng bộ gõ

- **WHEN** người chơi đang gõ tiếng Nhật bằng bộ gõ và nhấn Enter để chốt chữ
- **THEN** chữ được chốt trong ô nhập, không có tin nào được gửi

#### Scenario: Đang đọc tin cũ

- **WHEN** người chơi đã cuộn lên đọc tin cũ và có tin mới
- **THEN** danh sách không cuộn, và có nút tới tin mới

#### Scenario: Tên nút có số chưa đọc

- **WHEN** có 2 tin chưa đọc
- **THEN** tên đọc được của nút chat có số 2

#### Scenario: Đọc tin mới một lần

- **WHEN** Lan gửi một tin, lúc chat đóng rồi lúc chat mở
- **THEN** mỗi lần trình đọc màn hình đọc tin đó đúng một lần, và dòng báo lượt không bị ngắt
