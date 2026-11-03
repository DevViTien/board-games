## ADDED Requirements

### Requirement: Chọn số người chơi

Với game cho phép số người thay đổi, màn hình bắt đầu ván SHALL có nhóm "Số người chơi" gồm mọi số game cho phép, chọn sẵn số nhỏ nhất, ở mọi chế độ kể cả "Online", và giữ lựa chọn khi đổi chế độ. "Bắt đầu" và "Tạo phòng" SHALL dùng số đang chọn. Game có số người cố định MUST NOT có nhóm này.

#### Scenario: Game 2–4 người

- **WHEN** người chơi mở màn hình bắt đầu ván của một game 2–4 người lần đầu
- **THEN** có nhóm "Số người chơi" với ba lựa chọn 2, 3, 4 và "2 người" được chọn

#### Scenario: Bắt đầu với 4 người

- **WHEN** người chơi chọn "Cùng máy" và "4 người" ở màn hình bắt đầu ván của một game 2–4 người rồi bấm "Bắt đầu"
- **THEN** màn hình chơi mở ra với một ván mới 4 người

#### Scenario: Giữ số người khi đổi chế độ

- **WHEN** người chơi chọn "3 người" rồi đổi chế độ từ "Đấu với máy" sang "Online"
- **THEN** "3 người" vẫn được chọn

#### Scenario: Game hai người không có nhóm số người

- **WHEN** người chơi mở màn hình bắt đầu ván Tic-tac-toe
- **THEN** màn hình không có nhóm "Số người chơi"

## MODIFIED Requirements

### Requirement: Nhớ lựa chọn gần nhất

Màn hình bắt đầu ván SHALL nhớ trên trình duyệt lựa chọn (chế độ, mức độ, người đi trước, số người chơi, tuỳ chọn luật) của lần bấm "Bắt đầu" hoặc tạo phòng thành công gần nhất cho từng game và hiện lại lựa chọn đó ở lần mở sau. Khi chưa có hoặc không đọc được lựa chọn đã nhớ, màn hình SHALL dùng lựa chọn mặc định mà không báo lỗi; một tuỳ chọn luật hay số người chơi đã nhớ không còn hợp lệ SHALL chỉ đặt lại giá trị đó về mặc định.

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

#### Scenario: Nhớ số người chơi

- **WHEN** người chơi bắt đầu một ván 4 người của một game 2–4 người, rồi sau đó mở lại màn hình bắt đầu ván của game đó
- **THEN** "4 người" được chọn sẵn

#### Scenario: Số người đã nhớ không còn hợp lệ

- **WHEN** trình duyệt nhớ lựa chọn mức Khó với 6 người cho một game 2–4 người, và người chơi mở màn hình bắt đầu ván của game đó
- **THEN** "2 người" được chọn, mức độ vẫn là "Khó" và không có thông báo lỗi

### Requirement: Người đi trước ngẫu nhiên

Khi người chơi chọn người đi trước là "Ngẫu nhiên", hệ thống SHALL quyết định một lần lúc bắt đầu ván vị trí lượt của người chơi, với khả năng ngang nhau cho mọi vị trí (ván hai người: người chơi và máy ngang nhau), và SHALL giữ quyết định đó cho cả ván, kể cả sau khi tải lại trang.

#### Scenario: Ngẫu nhiên có thể ra cả hai

- **WHEN** người chơi bắt đầu nhiều ván với người đi trước "Ngẫu nhiên"
- **THEN** có ván người chơi đi trước và có ván máy đi trước

#### Scenario: Tải lại không chọn lại

- **WHEN** ván được bắt đầu với người đi trước "Ngẫu nhiên" ra máy đi trước, rồi người chơi tải lại trang
- **THEN** người chơi vẫn là bên đi sau

#### Scenario: Ngẫu nhiên với bốn người

- **WHEN** người chơi bắt đầu nhiều ván 4 người đấu với máy với người đi trước "Ngẫu nhiên"
- **THEN** người chơi có lúc đi thứ nhất, thứ hai, thứ ba và thứ tư

### Requirement: Dùng được bằng bàn phím và trình đọc màn hình

Mỗi nhóm lựa chọn (chế độ, mức độ, ai đi trước, số người chơi, từng tuỳ chọn luật) SHALL là một nhóm có tên đọc được, chọn được bằng bàn phím, và cho biết lựa chọn đang được chọn.

#### Scenario: Chọn mức độ bằng bàn phím

- **WHEN** người chơi dùng Tab tới nhóm "Mức độ" và nhấn phím mũi tên
- **THEN** mức độ được chọn đổi theo và trình đọc màn hình đọc được mức đang chọn

#### Scenario: Chọn kích thước bàn bằng bàn phím

- **WHEN** người chơi dùng Tab tới nhóm "Bàn cờ" của Cờ caro và nhấn phím mũi tên
- **THEN** "19×19" được chọn và trình đọc màn hình đọc được nhóm "Bàn cờ" với lựa chọn "19×19"

#### Scenario: Chọn số người bằng bàn phím

- **WHEN** người chơi dùng Tab tới nhóm "Số người chơi" của một game 2–4 người và nhấn phím mũi tên
- **THEN** "3 người" được chọn và trình đọc màn hình đọc được nhóm "Số người chơi" với lựa chọn "3 người"
