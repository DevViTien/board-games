## MODIFIED Requirements

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

### Requirement: Không lộ danh tính người chơi

Mọi trạng thái phòng server gửi đi MUST chỉ chứa tên của người ngồi mỗi ghế và, với người nhận có ghế, tên người gửi của từng tin chat; MUST NOT chứa `playerId` của bất kỳ ai. Server SHALL cho mỗi kết nối biết ghế của chính người đó (hoặc không có ghế).

#### Scenario: Trạng thái phòng không chứa playerId

- **WHEN** hai người đã ngồi trong phòng và một người nhận trạng thái phòng
- **THEN** trạng thái đó có tên của cả hai người và ghế của người nhận, nhưng không có `playerId` nào
