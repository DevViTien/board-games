# player-identity Specification

## Purpose

Danh tính người chơi khi chơi online mà không cần tài khoản: một tên tạm do người chơi chọn và một mã người chơi ngẫu nhiên, cùng được nhớ trên trình duyệt.

## Requirements

### Requirement: Hỏi tên tạm khi chơi online

Khi người chơi tạo phòng hoặc ngồi vào ghế mà trình duyệt chưa nhớ tên tạm nào, hệ thống SHALL hỏi tên tạm trước (trang phòng hỏi ở sảnh chờ, sau khi đã vào được phòng). Tên SHALL được cắt khoảng trắng hai đầu và MUST dài từ 1 đến 24 ký tự; tên không hợp lệ MUST bị từ chối với lời báo gắn với ô nhập, ô nhập SHALL nhận lại focus để trình đọc màn hình đọc lời báo, và người chơi chưa được ngồi ghế. Khi trang phòng hỏi tên, ô nhập tên SHALL có focus sẵn.

#### Scenario: Lần đầu mở link mời

- **WHEN** người chơi chưa từng nhập tên tạm và mở link mời vào một phòng còn ghế trống
- **THEN** trang phòng hiện sảnh chờ của phòng đó với ô tên tạm trống có focus và nút "Vào chơi"
- **AND** ghế trống vẫn trống cho tới khi người chơi bấm "Vào chơi" với tên hợp lệ

#### Scenario: Tên rỗng

- **WHEN** người chơi chỉ nhập khoảng trắng vào ô tên tạm rồi xác nhận
- **THEN** hệ thống báo tên không hợp lệ ngay tại ô, ô tên có focus và người chơi chưa ngồi ghế

#### Scenario: Không muốn vào phòng nữa

- **WHEN** trang phòng đang hỏi tên tạm
- **THEN** trang có lối về menu mà không phải nhập tên

### Requirement: Nhớ danh tính trên trình duyệt

Hệ thống SHALL nhớ tên tạm và một mã người chơi ngẫu nhiên trên trình duyệt sau lần đầu người chơi nhập tên, và SHALL dùng lại cả hai ở các lần sau mà không hỏi lại. Khi không đọc được danh tính đã nhớ (dữ liệu hỏng), hệ thống SHALL coi như chưa có và hỏi tên lại; khi trình duyệt không cho lưu, người chơi SHALL vẫn chơi được trong phiên đó với tên nhập gần nhất.

#### Scenario: Lần sau không hỏi lại tên

- **WHEN** người chơi đã nhập tên "Minh" khi tạo phòng, rồi sau đó mở link mời vào một phòng khác
- **THEN** người chơi vào phòng với tên "Minh" mà không bị hỏi tên

#### Scenario: Danh tính đã nhớ bị hỏng

- **WHEN** dữ liệu danh tính trên trình duyệt bị hỏng và người chơi mở link mời
- **THEN** trang phòng hỏi tên tạm như lần đầu, không có thông báo lỗi

#### Scenario: Trình duyệt không cho lưu

- **WHEN** trình duyệt từ chối mọi lần ghi vào bộ nhớ của trang và người chơi nhập tên rồi tạo phòng
- **THEN** phòng vẫn được tạo và người chơi ngồi ghế đầu tiên với tên vừa nhập

#### Scenario: Trình duyệt hết chỗ lưu khi đổi tên

- **WHEN** trình duyệt đã nhớ tên "Minh", rồi từ chối ghi vì hết chỗ, và người chơi đổi tên thành "Lan"
- **THEN** trong phiên đó người chơi dùng tên "Lan"

### Requirement: Đổi tên tạm

Tên sửa ở ô tên của màn hình bắt đầu ván SHALL được nhớ khi người chơi rời ô với tên hợp lệ; tên sửa ở sảnh chờ SHALL được nhớ khi người chơi bấm "Vào chơi". Trang phòng SHALL vào lại phòng (tự kết nối lại, thử lại, tải lại tab) bằng mã người chơi của chính nó, với tên đã nhớ của mã đó nếu có, không thì tên vừa chọn ở sảnh chờ. Mã người chơi SHALL giữ nguyên khi người chơi đổi tên.

#### Scenario: Đổi tên giữ nguyên ghế

- **WHEN** người chơi đang ngồi trong một phòng sửa tên tạm ở ô tên của màn hình bắt đầu ván (chế độ "Online") rồi rời ô đó, sau đó mở lại link phòng
- **THEN** người chơi vẫn ngồi đúng ghế cũ và mọi người trong phòng thấy tên mới

#### Scenario: Đổi tên ở sảnh chờ còn sau khi nối lại

- **WHEN** người chơi sửa tên tạm ở sảnh chờ rồi bấm "Vào chơi", sau đó kết nối bị cắt và trang tự kết nối lại
- **THEN** mọi người trong phòng vẫn thấy tên mới

### Requirement: Báo phòng không vào được trước khi hỏi tên

Trang phòng SHALL vào phòng trước khi hỏi tên tạm, nên phòng không tồn tại, phòng đã đủ người hay ứng dụng vừa được cập nhật MUST được báo ngay mà không hỏi tên; chỉ khi đã vào được phòng và trình duyệt chưa nhớ tên nào, sảnh chờ SHALL hỏi tên.

#### Scenario: Phòng không tồn tại khi chưa có tên

- **WHEN** người chơi chưa từng nhập tên tạm và mở link của một phòng không tồn tại
- **THEN** trang báo không tìm thấy phòng kèm lối về menu, không hỏi tên tạm

#### Scenario: Phòng đã đủ người khi chưa có tên

- **WHEN** người chơi chưa từng nhập tên tạm và mở link của một phòng Tic-tac-toe đã có hai người
- **THEN** trang báo phòng đã đủ người kèm lối về menu, không hỏi tên tạm

### Requirement: Giữ mã người chơi trong lúc trang phòng mở

Trong lúc trang phòng mở, mọi lần vào phòng, ngồi ghế, tự kết nối lại và thử lại SHALL dùng cùng một mã người chơi. Khi người chơi ngồi ghế, tab đó SHALL nhớ mã và tên của mình cho phòng đó, để tải lại tab vẫn vào đúng ghế. Lưu tên ở sảnh chờ SHALL nhớ mã đó cùng tên trên trình duyệt khi trình duyệt chưa nhớ danh tính nào, và MUST NOT thay mã người chơi đã nhớ bởi một tab khác của cùng trình duyệt.

#### Scenario: Kết nối lại sau khi đặt tên ở sảnh chờ

- **WHEN** người chơi chưa có tên mở link mời, nhập "Lan" ở sảnh chờ, bấm "Vào chơi", rồi kết nối bị cắt và trang tự kết nối lại
- **THEN** Lan vẫn ở đúng ghế vừa ngồi

#### Scenario: Hai tab chưa có tên cùng vào một phòng

- **WHEN** hai tab của cùng một trình duyệt chưa nhớ tên mở cùng một phòng còn hai ghế trống, tab thứ nhất vào chơi với tên "Lan", tab thứ hai vào chơi với tên "Minh", rồi cả hai tự kết nối lại và tab thứ hai được tải lại
- **THEN** mỗi tab vẫn ở đúng ghế của mình và mọi người trong phòng vẫn thấy "Lan" và "Minh"

#### Scenario: Tải lại tab sau khi tab khác đã nhớ tên khác

- **WHEN** người chơi chưa có tên mở link mời, một tab khác của cùng trình duyệt nhớ tên "Lan", người chơi vào chơi với tên "Khoa" rồi tải lại tab
- **THEN** người chơi vẫn ở đúng ghế của "Khoa" và trình duyệt vẫn nhớ "Lan"

#### Scenario: Thử lại khi chưa có tên

- **WHEN** người chơi chưa có tên mở link của một phòng không mở được rồi bấm "Thử lại"
- **THEN** trang vào lại phòng bằng cùng mã người chơi, vẫn chưa kèm tên
