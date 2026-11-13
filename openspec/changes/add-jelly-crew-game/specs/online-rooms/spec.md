## ADDED Requirements

### Requirement: Trọng tài của game đi tự do

Ở game đi tự do, server SHALL nhận nước của một người khi nước đó nêu đúng ghế của người gửi, không xét lượt. Nước gửi theo vị trí cũ của cùng ván SHALL được áp lên trạng thái mới nhất và kiểm lại bằng luật; không còn hợp lệ thì MUST bị từ chối với `illegal-move`. Nước nêu ghế khác MUST bị từ chối với `not-your-turn`. Game đi tự do không có đồng hồ lượt nên MUST NOT có xử bỏ ván.

#### Scenario: Hai nước gửi cùng lúc

- **WHEN** Minh (ghế 1) và Lan (ghế 2) cùng gửi một bước theo vị trí thứ 10 của ván Đội gom thạch, hai bước không chạm nhau
- **THEN** server ghi cả hai, theo thứ tự nhận, và ván có 12 nước

#### Scenario: Nước cũ không còn hợp lệ

- **WHEN** Lan gửi một bước theo vị trí thứ 10, nhưng nước thứ 11 của Minh đã đẩy thạch vào ô Lan định bước tới và thạch không đẩy tiếp được
- **THEN** server từ chối nước của Lan với `illegal-move`, kèm trạng thái phòng mới nhất

#### Scenario: Đi thay người khác

- **WHEN** Lan (ghế 2) gửi một nước nêu ghế 1
- **THEN** server từ chối với `not-your-turn` và ván không đổi

#### Scenario: Không xử bỏ ván

- **WHEN** Minh không đi nước nào trong 6 phút của ván Đội gom thạch và Lan gửi yêu cầu xử bỏ ván
- **THEN** server từ chối với `not-abandoned` và ván không đổi
