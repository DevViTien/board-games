## ADDED Requirements

### Requirement: Chọn tuỳ chọn luật

Với game có tuỳ chọn luật cho chọn, màn hình bắt đầu ván SHALL có một nhóm lựa chọn cho mỗi tuỳ chọn (tên và giá trị bằng ngôn ngữ đang dùng), ở mọi chế độ kể cả "Online", chọn sẵn giá trị mặc định của game. "Bắt đầu" và "Tạo phòng" SHALL dùng các giá trị đang chọn. Game không có tuỳ chọn luật MUST NOT có nhóm nào thêm.

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

### Requirement: Tuỳ chọn luật trong ván dở của game

Với game có tuỳ chọn luật cho chọn, mỗi ván dở liệt kê ở màn hình bắt đầu ván SHALL ghi kèm tuỳ chọn luật của ván sau chế độ (ví dụ "Với máy · Khó · 19×19 · Tự do"), và tên đọc được của lối "Tiếp tục" SHALL có cả phần đó.

#### Scenario: Ván dở Cờ caro 19×19

- **WHEN** người chơi có một ván Cờ caro 19×19 luật "tự do" đấu với máy mức Khó đang dở và mở màn hình bắt đầu ván Cờ caro
- **THEN** mục ván dở ghi "Với máy · Khó · 19×19 · Tự do" và lối "Tiếp tục" có tên đọc được nêu đủ nội dung đó

## MODIFIED Requirements

### Requirement: Nhớ lựa chọn gần nhất

Màn hình bắt đầu ván SHALL nhớ trên trình duyệt lựa chọn (chế độ, mức độ, người đi trước, tuỳ chọn luật) của lần bấm "Bắt đầu" hoặc tạo phòng thành công gần nhất cho từng game và hiện lại lựa chọn đó ở lần mở sau. Khi chưa có hoặc không đọc được lựa chọn đã nhớ, màn hình SHALL dùng lựa chọn mặc định mà không báo lỗi; một tuỳ chọn luật đã nhớ không còn hợp lệ SHALL chỉ đặt lại tuỳ chọn đó về mặc định.

#### Scenario: Lần sau hiện lại lựa chọn cũ

- **WHEN** người chơi bắt đầu một ván Tic-tac-toe đấu với máy mức Khó, máy đi trước, rồi sau đó mở lại màn hình bắt đầu ván Tic-tac-toe
- **THEN** chế độ là "Đấu với máy", mức độ là "Khó" và người đi trước là "Máy"

#### Scenario: Lựa chọn đã nhớ bị hỏng

- **WHEN** dữ liệu lựa chọn đã nhớ trên trình duyệt bị hỏng và người chơi mở màn hình bắt đầu ván
- **THEN** màn hình hiện lựa chọn mặc định và không có thông báo lỗi

#### Scenario: Nhớ chế độ online

- **WHEN** người chơi tạo phòng Tic-tac-toe online, rồi sau đó mở lại màn hình bắt đầu ván Tic-tac-toe
- **THEN** chế độ "Online" được chọn sẵn

#### Scenario: Nhớ tuỳ chọn luật

- **WHEN** người chơi bắt đầu một ván Cờ caro 19×19 luật "tự do", rồi sau đó mở lại màn hình bắt đầu ván Cờ caro
- **THEN** "19×19" và "Tự do" được chọn sẵn

#### Scenario: Lựa chọn nhớ từ trước khi có tuỳ chọn luật

- **WHEN** trình duyệt nhớ lựa chọn Cờ caro "Đấu với máy" mức Khó nhưng chưa có tuỳ chọn luật nào, và người chơi mở màn hình bắt đầu ván Cờ caro
- **THEN** mức độ là "Khó", bàn là "15×15" và luật thắng là "Chặn hai đầu", không có thông báo lỗi

### Requirement: Dùng được bằng bàn phím và trình đọc màn hình

Mỗi nhóm lựa chọn (chế độ, mức độ, ai đi trước, từng tuỳ chọn luật) SHALL là một nhóm có tên đọc được, chọn được bằng bàn phím, và cho biết lựa chọn đang được chọn.

#### Scenario: Chọn mức độ bằng bàn phím

- **WHEN** người chơi dùng Tab tới nhóm "Mức độ" và nhấn phím mũi tên
- **THEN** mức độ được chọn đổi theo và trình đọc màn hình đọc được mức đang chọn

#### Scenario: Chọn kích thước bàn bằng bàn phím

- **WHEN** người chơi dùng Tab tới nhóm "Bàn cờ" của Cờ caro và nhấn phím mũi tên
- **THEN** "19×19" được chọn và trình đọc màn hình đọc được nhóm "Bàn cờ" với lựa chọn "19×19"
