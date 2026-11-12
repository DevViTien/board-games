## ADDED Requirements

### Requirement: Cột chat trên màn hình rộng

Ở khung từ 1280 px và không phải điện thoại xoay ngang, chat của sảnh chờ và màn hình chơi SHALL là một cột ở mép phải, từ dưới thanh trên tới đáy màn hình, MUST NOT che bàn, điều khiển hay thông tin của ván; bàn SHALL được đo chừa sẵn cột. Cột SHALL thu gọn được thành một dải hẹp có nút mở chat; lựa chọn SHALL được nhớ trên trình duyệt cho mọi phòng, mặc định là mở. Khi cột đang hiện, hàng nút của ván MUST NOT có nút chat.

#### Scenario: Cột chat khi vào ván

- **WHEN** hai người đang chơi Cờ vua online ở khung 1280 × 800 và trình duyệt chưa nhớ lựa chọn nào
- **THEN** cột chat nằm ở mép phải, không che ô nào của bàn, dòng lượt, bảng người chơi hay Sổ ghi, và hàng nút của ván không có nút chat

#### Scenario: Thu gọn cột

- **WHEN** người chơi bấm "Thu gọn chat" ở khung 1280 × 800
- **THEN** cột thành một dải hẹp ở mép phải có nút "Mở chat", bàn không bị che, và tiêu điểm ở nút đó

#### Scenario: Nhớ lựa chọn thu gọn

- **WHEN** người chơi đã thu gọn cột rồi vào một phòng khác trên cùng trình duyệt ở khung 1280 × 800
- **THEN** cột vẫn thu gọn

#### Scenario: Tin mới khi cột đang mở

- **WHEN** cột chat đang mở và Lan gửi "Chào"
- **THEN** tin hiện trong cột, không có bong bóng, không có số chưa đọc, và vị trí, cỡ của bàn không đổi

#### Scenario: Số chưa đọc trên dải thu gọn

- **WHEN** cột đang thu gọn và Lan gửi 2 tin
- **THEN** nút "Mở chat" trên dải có số 2 và tên đọc được có số 2

#### Scenario: Sảnh chờ trên màn hình rộng

- **WHEN** hai người đã ngồi ghế ở sảnh chờ khung 1280 × 800
- **THEN** cột chat ở mép phải không che danh sách người chơi hay nút của sảnh chờ

#### Scenario: Ván kết thúc khi cột mở

- **WHEN** ván online kết thúc lúc cột chat đang mở ở khung 1280 × 800
- **THEN** thẻ kết quả và nút "Chơi lại" không bị cột che

## MODIFIED Requirements

### Requirement: Chat có ở đâu

Mọi game SHALL có chat ở sảnh chờ và màn hình chơi của phòng online, cả khi ván đã kết thúc. Chơi cùng máy và đấu với máy MUST NOT có chat. Chat SHALL chỉ hiện khi phòng có từ hai người có ghế trở lên: ngồi một mình ở sảnh chờ hay chơi một mình với các ghế máy MUST NOT có chat. Đủ người trong lúc đang ở sảnh chờ, chat SHALL giữ nguyên trạng thái đóng mở và chữ đang gõ.

#### Scenario: Chat trong ván online

- **WHEN** hai người đang chơi một ván online, ở bất kỳ game nào
- **THEN** mỗi người có nút mở chat trên màn hình chơi, hoặc cột chat ở màn hình rộng

#### Scenario: Chat ở sảnh chờ

- **WHEN** hai người đã ngồi vào ghế và đang chờ người thứ ba ở sảnh chờ
- **THEN** cả hai mở được chat

#### Scenario: Một mình ở sảnh chờ

- **WHEN** chỉ có một người ngồi ghế ở sảnh chờ
- **THEN** sảnh chờ không có nút chat hay cột chat, và chat hiện ra ngay khi người thứ hai ngồi vào ghế

#### Scenario: Sau khi ván kết thúc

- **WHEN** ván online vừa kết thúc
- **THEN** mỗi người vẫn có nút mở chat, hoặc cột chat ở màn hình rộng

#### Scenario: Chơi cùng máy

- **WHEN** người chơi mở một ván cùng máy hoặc đấu với máy
- **THEN** màn hình chơi không có chat

#### Scenario: Một người với các ghế máy

- **WHEN** ván online có đúng một người và mọi ghế còn lại là ghế máy
- **THEN** màn hình chơi không có chat

#### Scenario: Đủ người khi đang gõ

- **WHEN** người chơi đang gõ dở trong chat ở sảnh chờ và người cuối cùng ngồi vào ghế
- **THEN** màn hình chơi hiện ra, chat vẫn mở, chữ đang gõ còn nguyên và tiêu điểm vẫn ở ô nhập

### Requirement: Bố cục chat

Mở, đóng chat hay có tin mới MUST NOT làm bàn dịch chuyển hay đổi cỡ; riêng thu gọn hay mở cột chat ở màn hình rộng thì bàn SHALL được đo lại. Trên điện thoại (cả khi xoay ngang) và khung dưới 1024 px, mở chat SHALL là hộp thoại phủ kín màn hình, đầu hộp thoại có nút đóng và dòng lượt của ván; khi bàn phím ảo mở, ô nhập và tin mới nhất SHALL vẫn thấy được. Đóng hộp thoại SHALL trả tiêu điểm về nút chat. Ở khung rộng 360 px MUST NOT cuộn ngang, và tin dài không có khoảng trắng SHALL xuống dòng.

#### Scenario: Bàn đứng yên trên điện thoại

- **WHEN** người chơi mở rồi đóng chat ở khung 360 × 740
- **THEN** vị trí và cỡ của bàn không đổi, trang không cuộn ngang

#### Scenario: Chat toàn màn hình trên điện thoại

- **WHEN** người chơi bấm nút chat ở khung 360 × 740 trong ván Cờ vua online
- **THEN** chat phủ kín màn hình, đầu hộp thoại có nút "Đóng chat" và dòng lượt của ván, ô nhập nằm trong vùng nhìn thấy

#### Scenario: Bàn phím ảo mở

- **WHEN** vùng nhìn thấy của khung 360 × 740 thu lại còn 470 px vì bàn phím ảo
- **THEN** ô nhập và tin mới nhất nằm trong vùng nhìn thấy

#### Scenario: Điện thoại ngang

- **WHEN** người chơi mở chat ở khung 844 × 390
- **THEN** chat phủ kín màn hình, và đóng chat thì bàn vẫn ở đúng chỗ cũ, cùng cỡ

#### Scenario: Đến lượt khi đang chat

- **WHEN** hộp thoại chat đang mở ở khung 360 × 740 và đối thủ vừa đi
- **THEN** dòng lượt ở đầu hộp thoại nói tới lượt người chơi, và đóng chat thì đi được ngay

#### Scenario: Đóng bằng cử chỉ quay lại

- **WHEN** hộp thoại chat đang mở trên điện thoại và người chơi dùng cử chỉ quay lại của hệ điều hành
- **THEN** hộp thoại đóng, trang vẫn ở phòng đó và tiêu điểm ở nút chat

#### Scenario: Đủ người khi chat đang mở trên điện thoại

- **WHEN** chat đang mở ở sảnh chờ khung 360 × 740 và ván bắt đầu
- **THEN** hộp thoại vẫn mở, chữ đang gõ còn nguyên, và đóng chat thì thấy màn hình chơi

#### Scenario: Tin dài liền nhau

- **WHEN** có một tin 200 ký tự không có khoảng trắng ở khung 360 px
- **THEN** tin xuống dòng trong khung tin và trang không cuộn ngang

### Requirement: Chat trên máy tính

Từ 1280 px, chat SHALL là cột theo requirement "Cột chat trên màn hình rộng". Ở khung 1024–1279 px, màn hình chơi SHALL mở chat thành bảng phía trên phần điều khiển của cột bên bàn: bàn và điều khiển của ván SHALL vẫn dùng được khi chat mở, trang không cuộn; lời của bàn mà bảng che (dòng lượt, tên quân đang chọn, dòng chiếu) SHALL được nói trong đầu bảng. Sảnh chờ dưới 1280 px SHALL mở chat thành hộp thoại phủ kín màn hình.

#### Scenario: Máy tính vẫn đi được khi chat mở

- **WHEN** chat đang mở ở khung 1024 × 768 và tới lượt người chơi
- **THEN** người chơi đi được một nước mà không phải đóng chat, dòng lượt vẫn đọc được trong khung chat, và ở Cờ cá ngựa xúc xắc cùng nút gieo không bị che

#### Scenario: Lời của bàn bị bảng che

- **WHEN** chat đang mở ở khung 1024 × 768 trên Cờ vua và vua đang bị chiếu
- **THEN** dòng chiếu hiện trong đầu bảng, Sổ ghi và các nút của ván không bị che

#### Scenario: Sảnh chờ ở khung vừa

- **WHEN** người chơi mở chat ở sảnh chờ khung rộng 1024 px
- **THEN** chat phủ kín màn hình, và đóng chat thì thấy đủ danh sách người chơi

### Requirement: Tin đến khi chat đóng

Khi chat đóng và chưa tắt, tin mới của người khác tới lúc đang mở trang SHALL hiện thành bong bóng từ 3 đến 5 giây và tăng số chưa đọc; chạm bong bóng SHALL mở chat. Cột chat thu gọn được tính là chat đóng; cột đang mở thì tin hiện ngay trong cột, không có bong bóng. Nút chat ngoài màn hình thì số chưa đọc SHALL thấy được ở thẻ dưới thanh trên. Tin có sẵn khi mở trang MUST NOT hiện bong bóng. Trong lúc cú tung xúc xắc đang chạy, bong bóng SHALL chờ tới khi xong. Mở chat SHALL xoá số chưa đọc.

#### Scenario: Tin mới khi chat đóng

- **WHEN** chat đang đóng và Lan gửi "Chào"
- **THEN** người chơi thấy bong bóng có tên Lan và "Chào", nút chat có số 1, bàn không dịch chuyển và không bị che

#### Scenario: Tin mới khi cột thu gọn

- **WHEN** cột chat đang thu gọn ở khung 1280 × 800 và Lan gửi "Chào"
- **THEN** người chơi thấy bong bóng có tên Lan và "Chào" cạnh dải thu gọn, không che bàn, và nút "Mở chat" có số 1

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

### Requirement: Chat bằng bàn phím và trình đọc màn hình

Mọi thao tác chat SHALL làm được bằng bàn phím: Enter gửi; ở hộp thoại và bảng, Esc đóng và trả tiêu điểm về nút chat; ở cột chat, Esc MUST NOT thu gọn cột. Khi đang gõ bằng bộ gõ, Enter và Esc MUST NOT gửi hay đóng. Danh sách tin SHALL là vùng nhật ký có tên; tin mới được đọc ở mức lịch sự, không ngắt dòng báo lượt và MUST NOT đọc hai lần. Danh sách MUST NOT tự cuộn khi người chơi đang đọc tin cũ, khi đó SHALL có nút tới tin mới. Tên nút chat và nút "Mở chat" SHALL nêu số tin chưa đọc.

#### Scenario: Gửi và đóng bằng bàn phím

- **WHEN** người chơi mở chat bằng bàn phím ở khung 360 × 740, gõ một câu, nhấn Enter rồi nhấn Esc
- **THEN** tin được gửi, chat đóng và tiêu điểm ở nút chat

#### Scenario: Esc trong cột chat

- **WHEN** tiêu điểm ở ô nhập của cột chat ở khung 1280 × 800 và người chơi nhấn Esc
- **THEN** cột vẫn mở

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
