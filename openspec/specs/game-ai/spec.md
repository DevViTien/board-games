# game-ai Specification

## Purpose

Máy chọn nước đi cho người đang đến lượt trong mọi game hỗ trợ đấu với máy: luôn đi nước hợp lệ, theo một trong ba mức độ, trong giới hạn thời gian cho phép, và tái lập được để test và để giao diện không bao giờ bị treo vì máy nghĩ quá lâu.

## Requirements

### Requirement: Máy chọn một nước đi hợp lệ

Với một trạng thái ván chưa kết thúc của game hỗ trợ đấu với máy, máy SHALL trả về đúng một nước đi nằm trong danh sách nước đi hợp lệ của người đang đến lượt, và MUST NOT thay đổi trạng thái được đưa vào. Ván đã kết thúc MUST bị từ chối với mã lỗi `game-over`.

#### Scenario: Máy đi một nước hợp lệ

- **WHEN** máy được hỏi nước đi cho một ván Tic-tac-toe đang dở
- **THEN** máy trả về một nước đặt quân vào một ô còn trống
- **AND** trạng thái được đưa vào không thay đổi

#### Scenario: Ván đã kết thúc

- **WHEN** máy được hỏi nước đi cho một ván đã có người thắng
- **THEN** máy từ chối với mã lỗi `game-over`

### Requirement: Chỉ game hỗ trợ mới có máy

Máy SHALL chỉ chơi những game khai báo hỗ trợ đấu với máy. Gọi máy cho game không hỗ trợ MUST bị từ chối với mã lỗi `ai-not-supported`.

#### Scenario: Game không hỗ trợ đấu với máy

- **WHEN** máy được hỏi nước đi cho một game khai báo không hỗ trợ đấu với máy
- **THEN** máy từ chối với mã lỗi `ai-not-supported`

### Requirement: Mức Khó

Ở mức Khó, máy SHALL tìm trước càng nhiều nước càng tốt trong giới hạn thời gian và chọn nước có kết quả tốt nhất cho mình theo những gì đã tìm được: thắng thì thắng sớm nhất, không tránh được thua thì thua muộn nhất. Khi tìm được hết tới cuối ván, máy MUST NOT chọn nước dẫn tới thua nếu còn nước không thua.

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

### Requirement: Mức Vừa

Ở mức Vừa, máy SHALL luôn chọn nước thắng ngay nếu có; nếu không có, trong game hai người đi luân phiên, máy SHALL chặn nước thắng ngay của đối thủ khi chặn được. Ngoài hai trường hợp đó, máy chỉ nhìn trước một phần nhỏ của ván, nên người chơi cẩn thận vẫn thắng được.

#### Scenario: Chặn nước thắng ngay của đối thủ

- **WHEN** ở mức Vừa, đối thủ đang có hai quân thẳng hàng với ô thứ ba còn trống và máy không có nước thắng ngay
- **THEN** máy đặt quân vào ô thứ ba để chặn

#### Scenario: Ưu tiên thắng hơn chặn

- **WHEN** ở mức Vừa, máy vừa có nước thắng ngay vừa phải chặn đối thủ
- **THEN** máy chọn nước thắng ngay

### Requirement: Mức Dễ

Ở mức Dễ, máy SHALL vẫn đi nước hợp lệ nhưng đôi khi chọn nước kém hơn nước tốt nhất, để người mới chơi cũng thắng được.

#### Scenario: Dễ không phải lúc nào cũng đi nước tốt nhất

- **WHEN** ở mức Dễ, máy được hỏi nhiều lần (mỗi lần một chuỗi ngẫu nhiên khác) trong một thế có nước thắng ngay
- **THEN** có lần máy chọn nước thắng ngay và có lần máy chọn nước khác

### Requirement: Giới hạn thời gian

Máy SHALL trả về nước đi trong giới hạn thời gian do nơi gọi đặt, đo bằng đồng hồ do nơi gọi truyền vào; hết giờ thì máy dùng nước tốt nhất đã tìm được. Phần nhìn trước tối thiểu của mỗi mức (Dễ: một nước; Vừa và Khó: hai nước) MUST luôn được làm xong kể cả khi vượt giờ, nên hết giờ không làm máy mức Vừa hay Khó bỏ lỡ nước thắng ngay, hay nước chặn trong game hai người đi luân phiên. Ngoài phần đó, máy SHALL dừng tìm ngay khi thấy đã hết giờ.

#### Scenario: Hết giờ vẫn có nước đi

- **WHEN** đồng hồ báo đã hết giờ ngay sau khi máy bắt đầu tìm
- **THEN** máy vẫn trả về một nước đi hợp lệ

#### Scenario: Hết giờ vẫn chặn nước thắng ngay

- **WHEN** ở mức Vừa hoặc Khó, đồng hồ báo đã hết giờ ngay từ đầu và đối thủ sẽ thắng ở nước sau nếu máy không chặn
- **THEN** máy chọn nước chặn

#### Scenario: Tìm hết cây trước khi hết giờ

- **WHEN** ván còn ít nước tới mức máy tìm được tới cuối ván trước khi hết giờ
- **THEN** máy trả về nước đi mà không chờ tới hết giờ

### Requirement: Tái lập được

Mọi lựa chọn ngẫu nhiên của máy (chọn giữa các nước tốt ngang nhau, nước ngẫu nhiên của mức Dễ) SHALL chỉ đến từ bộ sinh ngẫu nhiên do nơi gọi truyền vào. Cùng trạng thái, cùng mức độ, cùng chuỗi giá trị ngẫu nhiên và cùng đồng hồ SHALL cho cùng nước đi. Khi có nhiều nước tốt ngang nhau, máy SHALL chọn ngẫu nhiên giữa chúng để các ván không lặp lại y hệt, và MUST NOT lẫn vào đó một nước kém hơn.

#### Scenario: Cùng đầu vào cho cùng nước đi

- **WHEN** máy được hỏi hai lần với cùng trạng thái, cùng mức độ và bộ sinh ngẫu nhiên tạo từ cùng seed
- **THEN** hai lần trả về cùng một nước đi

#### Scenario: Các nước tốt ngang nhau được chọn ngẫu nhiên

- **WHEN** máy ở mức Khó đi nước đầu của ván Tic-tac-toe nhiều lần với các seed khác nhau
- **THEN** máy không phải lúc nào cũng chọn cùng một ô

### Requirement: Nước đi có yếu tố ngẫu nhiên

Với nước đi có nhiều kết quả ngẫu nhiên (ví dụ gieo xúc xắc), máy SHALL đánh giá nước đó bằng giá trị kỳ vọng theo trọng số của các kết quả mà game khai báo, MUST NOT giả định một kết quả cụ thể (tốt nhất hay xấu nhất).

#### Scenario: Chọn nước có kỳ vọng tốt hơn

- **WHEN** máy chọn giữa một nước chắc chắn hoà và một nước gieo xúc xắc cho máy thắng với khả năng 3/4, thua với khả năng 1/4
- **THEN** máy chọn nước gieo xúc xắc

#### Scenario: Không trông vào kết quả may mắn

- **WHEN** máy chọn giữa một nước chắc chắn hoà và một nước gieo xúc xắc cho máy thắng với khả năng 1/4, thua với khả năng 3/4
- **THEN** máy chọn nước chắc chắn hoà
