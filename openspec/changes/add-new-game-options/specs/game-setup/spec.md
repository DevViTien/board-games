## MODIFIED Requirements

### Requirement: Chọn tuỳ chọn luật

Với game có tuỳ chọn luật cho chọn, màn hình bắt đầu ván SHALL có một nhóm lựa chọn cho mỗi tuỳ chọn (tên và giá trị bằng ngôn ngữ đang dùng), ở mọi chế độ kể cả "Online", chọn sẵn giá trị mặc định của game. Giá trị có ghi chú của game (như độ khó của bản đồ) SHALL hiện ghi chú dưới tên của nó. "Bắt đầu" và "Tạo phòng" SHALL dùng các giá trị đang chọn. Game không có tuỳ chọn luật MUST NOT có nhóm nào thêm.

#### Scenario: Tuỳ chọn mặc định của Cờ caro

- **WHEN** người chơi mở màn hình bắt đầu ván Cờ caro lần đầu
- **THEN** có nhóm "Bàn cờ" với "15×15" được chọn và nhóm "Luật thắng" với "Chặn hai đầu" được chọn

#### Scenario: Bắt đầu với bàn 19×19 luật tự do

- **WHEN** người chơi chọn "Cùng máy", "19×19", "Tự do" rồi bấm "Bắt đầu"
- **THEN** màn hình chơi mở ra với bàn 19×19 trống và ván dùng luật "tự do"

#### Scenario: Tuỳ chọn ở chế độ Online

- **WHEN** người chơi chọn chế độ "Online" ở màn hình bắt đầu ván Cờ caro
- **THEN** nhóm "Bàn cờ" và "Luật thắng" vẫn hiện với lựa chọn đang có

#### Scenario: Tic-tac-toe không có tuỳ chọn

- **WHEN** người chơi mở màn hình bắt đầu ván Tic-tac-toe
- **THEN** chỉ có các nhóm chế độ, mức độ và người đi trước như trước

#### Scenario: Đổi kích thước bàn vẫn hỏi xác nhận

- **WHEN** đang có ván Cờ caro 15×15 dở đấu với máy, người chơi chọn "Đấu với máy", "19×19" và bấm "Bắt đầu"
- **THEN** hệ thống hỏi xác nhận trước khi bỏ ván dở như với mọi ván mới cùng chế độ

#### Scenario: Ghi chú độ khó của bản đồ

- **WHEN** người chơi mở màn bắt đầu ván Đội gom thạch
- **THEN** nhóm "Bản đồ" liệt kê các bản đồ, mỗi bản đồ ghi độ khó dưới tên, "Hai gian bếp" ghi "Dễ"

#### Scenario: Nhóm không có ghi chú giữ như cũ

- **WHEN** người chơi mở màn bắt đầu ván Cờ caro
- **THEN** các giá trị của nhóm "Bàn cờ" và "Luật thắng" không có dòng ghi chú
