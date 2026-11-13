## ADDED Requirements

### Requirement: Trọng tài của game đi tự do

Ở game đi tự do, server SHALL nhận nước của một người khi nước đó nêu đúng ghế của người gửi, không xét lượt. Nước gửi theo vị trí cũ của cùng ván SHALL được áp lên trạng thái mới nhất và kiểm lại bằng luật; không còn hợp lệ thì MUST bị từ chối với `illegal-move`. Nước nêu ghế khác MUST bị từ chối với `not-your-turn`; nước mà từ vị trí của nó đã có nước của chính ghế đó (gửi lại) MUST bị từ chối với `stale-move`. Game đi tự do không có đồng hồ lượt nên MUST NOT có xử bỏ ván.

#### Scenario: Hai nước gửi cùng lúc

- **WHEN** Minh (ghế 1) và Lan (ghế 2) cùng gửi một bước theo vị trí thứ 10 của ván Đội gom thạch, hai bước không chạm nhau
- **THEN** server ghi cả hai, theo thứ tự nhận, và ván có 12 nước

#### Scenario: Nước cũ không còn hợp lệ

- **WHEN** Lan gửi một bước theo vị trí thứ 10, nhưng nước thứ 11 của Minh đã đẩy thạch vào ô Lan định bước tới và thạch không đẩy tiếp được
- **THEN** server từ chối nước của Lan với `illegal-move`, kèm trạng thái phòng mới nhất

#### Scenario: Gửi lại một nước

- **WHEN** Minh gửi một bước theo vị trí thứ 10, bước được ghi, rồi Minh gửi lại đúng bước đó theo vị trí thứ 10
- **THEN** server từ chối lần sau với `stale-move` và ván chỉ có một bước đó

#### Scenario: Đi thay người khác

- **WHEN** Lan (ghế 2) gửi một nước nêu ghế 1
- **THEN** server từ chối với `not-your-turn` và ván không đổi

#### Scenario: Không xử bỏ ván

- **WHEN** Minh không đi nước nào trong 6 phút của ván Đội gom thạch và Lan gửi yêu cầu xử bỏ ván
- **THEN** server từ chối với `not-abandoned` và ván không đổi

## MODIFIED Requirements

### Requirement: Giới hạn mỗi kết nối

Kết nối gửi quá 150 thông điệp trong 10 giây, hoặc một thông điệp lớn hơn 16 KB, MUST bị đóng. Kết nối 20 phút không gửi gì ngoài tín hiệu giữ kết nối và không nhận trạng thái mới MUST bị đóng.

#### Scenario: Gửi quá nhiều thông điệp

- **WHEN** một kết nối gửi 151 thông điệp trong vòng 10 giây
- **THEN** server gửi lỗi `too-many-messages` và đóng kết nối

#### Scenario: Kết nối rảnh quá lâu

- **WHEN** một kết nối đã vào phòng 20 phút chỉ gửi tín hiệu giữ kết nối và phòng không đổi
- **THEN** server đóng kết nối
