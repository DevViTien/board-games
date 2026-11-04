## ADDED Requirements

### Requirement: Đầu hàng khi đấu với máy

Màn hình đấu với máy SHALL có nút "Đầu hàng" khi ván chưa kết thúc. Bấm SHALL hỏi xác nhận rằng máy sẽ thắng; huỷ MUST NOT đổi gì. Xác nhận SHALL kết thúc ván ngay: thẻ kết quả báo "Máy thắng!" kèm dòng "Bạn đã đầu hàng." và nút "Ván mới"; nước máy đang nghĩ MUST NOT được đi; hoàn tác và làm lại MUST NOT bấm được. Ván đã đầu hàng MUST NOT còn là ván dở.

#### Scenario: Đầu hàng giữa ván

- **WHEN** người chơi đã đi 2 nước trong ván Cờ caro với máy, bấm "Đầu hàng" rồi xác nhận
- **THEN** thẻ kết quả báo "Máy thắng!" kèm dòng "Bạn đã đầu hàng." và nút "Ván mới"
- **AND** nút hoàn tác và làm lại không bấm được

#### Scenario: Huỷ đầu hàng

- **WHEN** người chơi bấm "Đầu hàng" rồi bấm "Chơi tiếp"
- **THEN** ván vẫn tiếp tục như trước, đến lượt người chơi

#### Scenario: Đầu hàng khi máy đang nghĩ

- **WHEN** người chơi vừa đặt quân, máy đang nghĩ, và người chơi xác nhận đầu hàng
- **THEN** ván kết thúc với "Máy thắng!" và không có quân nào của nước máy đang nghĩ

#### Scenario: Đầu hàng với ba máy

- **WHEN** người chơi xác nhận đầu hàng trong ván Cờ cá ngựa với ba máy
- **THEN** thẻ kết quả báo "Máy thắng!" kèm dòng "Bạn đã đầu hàng."

#### Scenario: Ván đã đầu hàng không còn là ván dở

- **WHEN** người chơi đầu hàng ván Tic-tac-toe với máy rồi quay về menu
- **THEN** menu không liệt kê ván đó trong "Tiếp tục ván dở"
