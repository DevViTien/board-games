## MODIFIED Requirements

### Requirement: Ván mới trong phòng

Khi ván hiện tại đã có kết quả, người có ghế trong phòng SHALL bắt đầu được ván mới trong cùng phòng, với tuỳ chọn luật gửi kèm yêu cầu hoặc, khi không gửi, tuỳ chọn của ván vừa xong; tuỳ chọn gửi kèm không hợp lệ MUST bị từ chối với mã `invalid-options`. Ván mới SHALL xoay ghế để người đi trước luân phiên, và mỗi người nhận ván mới kèm ghế mới. Yêu cầu ván mới khi ván chưa có kết quả MUST bị từ chối với mã `game-not-over`. Hai yêu cầu cho cùng một ván SHALL chỉ tạo một ván mới.

#### Scenario: Chơi lại sau khi thắng

- **WHEN** ván Tic-tac-toe đã có người thắng và người ở ghế thứ hai yêu cầu ván mới
- **THEN** mọi người trong phòng nhận ván mới chưa có nước nào
- **AND** người trước đó ở ghế đầu tiên nhận ghế thứ hai, người kia nhận ghế đầu tiên

#### Scenario: Ván mới khi chưa kết thúc

- **WHEN** ván đang dở và một người yêu cầu ván mới
- **THEN** server từ chối với mã `game-not-over` và ván không đổi

#### Scenario: Cả hai cùng yêu cầu ván mới

- **WHEN** ván đã kết thúc và cả hai người gửi yêu cầu ván mới cho cùng ván đó
- **THEN** chỉ một ván mới được tạo, yêu cầu còn lại bị từ chối với mã `stale-move`

#### Scenario: Ván mới giữ tuỳ chọn luật

- **WHEN** ván Cờ caro 19×19 luật "tự do" trong phòng đã có người thắng và một người yêu cầu ván mới không kèm tuỳ chọn
- **THEN** ván mới có bàn 19×19 trống và vẫn dùng luật "tự do"

#### Scenario: Ván mới với tuỳ chọn khác

- **WHEN** ván Cờ caro 15×15 luật "chặn hai đầu" trong phòng đã có người thắng và một người yêu cầu ván mới kèm bàn 19×19 luật "chặn hai đầu"
- **THEN** mọi người trong phòng nhận ván mới với bàn 19×19 trống, ghế đã xoay
- **AND** lần yêu cầu ván mới sau không kèm tuỳ chọn vẫn cho bàn 19×19

#### Scenario: Tuỳ chọn gửi kèm không hợp lệ

- **WHEN** ván Cờ caro trong phòng đã có người thắng và một người yêu cầu ván mới kèm bàn 21×21
- **THEN** server từ chối với mã `invalid-options` và phòng vẫn giữ ván vừa xong
