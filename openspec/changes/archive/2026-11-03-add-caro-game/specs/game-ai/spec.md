## ADDED Requirements

### Requirement: Thu hẹp nước đi máy xét

Một game SHALL khai báo được tập nước máy xét ở mỗi thế cờ, theo thứ tự ưu tiên; khi ván chưa kết thúc, tập đó MUST là tập con khác rỗng của các nước hợp lệ. Khi có khai báo, máy SHALL chỉ xét các nước đó ở mọi bước nhìn trước, kể cả nước ngẫu nhiên của mức Dễ; không có khai báo thì máy xét mọi nước hợp lệ. Nước máy trả về MUST luôn hợp lệ, kể cả khi game khai báo sai.

#### Scenario: Máy chỉ xét các nước được khai báo

- **WHEN** một game khai báo chỉ hai trong mười nước hợp lệ là nước máy xét, và máy được hỏi nhiều lần với các seed khác nhau ở mức Dễ, Vừa và Khó
- **THEN** mọi nước máy chọn đều là một trong hai nước đó

#### Scenario: Game không khai báo

- **WHEN** máy được hỏi nước đi cho Tic-tac-toe, game không khai báo tập nước máy xét
- **THEN** máy xét mọi ô trống như trước

#### Scenario: Khai báo sai vẫn ra nước hợp lệ

- **WHEN** một game khai báo sai tập nước máy xét, chỉ gồm nước không hợp lệ ở thế hiện tại
- **THEN** máy vẫn trả về một nước hợp lệ

### Requirement: Kiểm tra tập nước thu hẹp

Với game khai báo tập nước máy xét, bộ kiểm tra hợp đồng chung SHALL xác nhận ở mọi trạng thái chưa kết thúc của các ván tự chơi rằng tập đó khác rỗng, chỉ gồm nước hợp lệ, không có nước trùng, tất định và không thay đổi trạng thái. Mỗi vi phạm MUST làm thất bại đúng kiểm tra `candidate-moves`; game không khai báo MUST NOT thất bại kiểm tra đó.

#### Scenario: Tập nước có nước không hợp lệ

- **WHEN** một game khai báo tập nước máy xét có một nước không có trong danh sách nước hợp lệ
- **THEN** bộ kiểm tra hợp đồng thất bại ở kiểm tra `candidate-moves` và mọi kiểm tra khác vượt qua

#### Scenario: Tập nước rỗng khi ván chưa xong

- **WHEN** một game khai báo tập nước máy xét rỗng ở một trạng thái chưa kết thúc
- **THEN** bộ kiểm tra hợp đồng thất bại ở kiểm tra `candidate-moves`

#### Scenario: Tập nước không tất định

- **WHEN** một game trả về tập nước máy xét khác nhau cho cùng một trạng thái
- **THEN** bộ kiểm tra hợp đồng thất bại ở kiểm tra `candidate-moves`

#### Scenario: Game không khai báo tập nước

- **WHEN** bộ kiểm tra hợp đồng chạy cho Tic-tac-toe
- **THEN** kiểm tra `candidate-moves` vượt qua

## MODIFIED Requirements

### Requirement: Mức Khó

Ở mức Khó, máy SHALL tìm trước càng nhiều nước càng tốt trong giới hạn thời gian và chọn nước có kết quả tốt nhất cho mình theo những gì đã tìm được: thắng thì thắng sớm nhất, không tránh được thua thì thua muộn nhất. Khi tìm được hết tới cuối ván trong tập nước máy xét, máy MUST NOT chọn nước trong tập đó dẫn tới thua nếu tập đó còn nước không thua.

#### Scenario: Chớp nước thắng ngay

- **WHEN** ở mức Khó, máy có một nước thắng ngay
- **THEN** máy chọn nước đó

#### Scenario: Thắng sớm nhất có thể

- **WHEN** ở mức Khó, máy có một nước thắng ngay và cả những nước chỉ thắng được ở các nước sau
- **THEN** máy chọn nước thắng ngay

#### Scenario: Thua muộn nhất có thể

- **WHEN** ở mức Khó, nước nào của máy cũng dẫn tới thua, nhưng có nước để đối thủ thắng muộn hơn
- **THEN** máy chọn nước thua muộn hơn

#### Scenario: Không đi vào thế thua khi tránh được

- **WHEN** ở mức Khó, đối thủ sẽ thắng ở nước sau nếu máy không chặn
- **THEN** máy chọn nước chặn

### Requirement: Giới hạn thời gian

Máy SHALL trả về nước đi trong giới hạn thời gian do nơi gọi đặt, đo bằng đồng hồ do nơi gọi truyền vào; hết giờ thì máy dùng nước tốt nhất đã tìm được. Phần nhìn trước tối thiểu của mỗi mức (Dễ: một nước; Vừa và Khó: hai nước) MUST luôn được làm xong kể cả khi vượt giờ, nên hết giờ không làm máy mức Vừa hay Khó bỏ lỡ nước thắng ngay, hay nước chặn trong game hai người đi luân phiên. Ngoài phần đó, máy SHALL dừng tìm ngay khi thấy đã hết giờ. Chỉ có một nước để xét thì máy SHALL trả về ngay.

#### Scenario: Hết giờ vẫn có nước đi

- **WHEN** đồng hồ báo đã hết giờ ngay sau khi máy bắt đầu tìm
- **THEN** máy vẫn trả về một nước đi hợp lệ

#### Scenario: Hết giờ vẫn chặn nước thắng ngay

- **WHEN** ở mức Vừa hoặc Khó, đồng hồ báo đã hết giờ ngay từ đầu và đối thủ sẽ thắng ở nước sau nếu máy không chặn
- **THEN** máy chọn nước chặn

#### Scenario: Tìm hết cây trước khi hết giờ

- **WHEN** ván còn ít nước tới mức máy tìm được tới cuối ván trước khi hết giờ
- **THEN** máy trả về nước đi mà không chờ tới hết giờ

#### Scenario: Chỉ một nước để xét

- **WHEN** ở bất kỳ mức nào, máy chỉ có một nước để xét (ví dụ nước đầu Cờ caro trên bàn trống: chỉ ô giữa)
- **THEN** máy trả về nước đó ngay, không tìm và không chờ tới hết giờ
