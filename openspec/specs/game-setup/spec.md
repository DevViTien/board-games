# game-setup Specification

## Purpose

Màn hình bắt đầu ván của mỗi game: chọn chơi cùng máy, đấu với máy (mức độ, ai đi trước) hay tạo phòng online, hoặc tiếp tục một ván đang dở của game đó, trước khi vào bàn cờ.

## Requirements

### Requirement: Chọn cách chơi trước khi vào ván

Đường dẫn `/play/<mã game>` SHALL mở màn hình bắt đầu ván của game đó. Với game hỗ trợ đấu với máy, người chơi SHALL chọn được chế độ "Đấu với máy", "Cùng máy" hoặc "Online"; với "Đấu với máy", SHALL chọn được mức độ (Dễ, Vừa, Khó; mặc định Vừa) và ai đi trước (Tôi, Máy, Ngẫu nhiên; mặc định Tôi). Game không hỗ trợ đấu với máy MUST chỉ có chế độ "Cùng máy" và "Online". Bấm "Bắt đầu" SHALL mở màn hình chơi của chế độ đó với một ván mới theo lựa chọn.

#### Scenario: Lựa chọn mặc định

- **WHEN** người chơi mở màn hình bắt đầu ván Tic-tac-toe lần đầu
- **THEN** chế độ "Đấu với máy" được chọn, mức độ là "Vừa" và người đi trước là "Tôi"

#### Scenario: Bắt đầu đấu với máy mức Khó, máy đi trước

- **WHEN** người chơi chọn "Đấu với máy", mức "Khó", người đi trước "Máy" rồi bấm "Bắt đầu"
- **THEN** màn hình chơi đấu với máy mở ra và máy đi nước đầu tiên ở mức Khó

#### Scenario: Bắt đầu chơi cùng máy

- **WHEN** người chơi chọn "Cùng máy" rồi bấm "Bắt đầu"
- **THEN** màn hình chơi cùng máy mở ra và các lựa chọn mức độ, người đi trước không áp dụng

#### Scenario: Game không hỗ trợ đấu với máy

- **WHEN** người chơi mở màn hình bắt đầu ván của một game không hỗ trợ đấu với máy
- **THEN** chỉ có chế độ "Cùng máy" và "Online", không có lựa chọn mức độ hay người đi trước

### Requirement: Chế độ Online

Với chế độ "Online", màn hình bắt đầu ván SHALL cho nhập hoặc sửa tên tạm (điền sẵn tên đã nhớ, capability `player-identity`) thay cho mức độ và người đi trước, và nút chính SHALL là "Tạo phòng", tạo phòng online theo capability `online-play`.

#### Scenario: Chọn chơi online

- **WHEN** người chơi đã nhớ tên tạm "Minh" chọn chế độ "Online" ở màn hình bắt đầu ván Tic-tac-toe
- **THEN** màn hình có ô tên tạm điền sẵn "Minh", không có lựa chọn mức độ hay người đi trước, và nút chính là "Tạo phòng"

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

### Requirement: Người đi trước ngẫu nhiên

Khi người chơi chọn người đi trước là "Ngẫu nhiên", hệ thống SHALL quyết định một lần lúc bắt đầu ván, với khả năng ngang nhau cho người chơi và máy, và SHALL giữ quyết định đó cho cả ván, kể cả sau khi tải lại trang.

#### Scenario: Ngẫu nhiên có thể ra cả hai

- **WHEN** người chơi bắt đầu nhiều ván với người đi trước "Ngẫu nhiên"
- **THEN** có ván người chơi đi trước và có ván máy đi trước

#### Scenario: Tải lại không chọn lại

- **WHEN** ván được bắt đầu với người đi trước "Ngẫu nhiên" ra máy đi trước, rồi người chơi tải lại trang
- **THEN** người chơi vẫn là bên đi sau

### Requirement: Tiếp tục ván dở từ màn hình bắt đầu

Khi trình duyệt đang giữ ván dở của game này, màn hình bắt đầu ván SHALL liệt kê từng ván dở theo chế độ (với ván đấu với máy kèm mức độ), mỗi ván có lối "Tiếp tục" mở đúng ván đó. Tên đọc được của mỗi lối "Tiếp tục" SHALL nêu chế độ của ván, để các lối không trùng tên.

#### Scenario: Có ván dở đấu với máy

- **WHEN** người chơi có một ván Tic-tac-toe đấu với máy mức Khó đang dở và mở màn hình bắt đầu ván Tic-tac-toe
- **THEN** màn hình có mục ván dở "Với máy · Khó" kèm lối "Tiếp tục" có tên đọc được nêu "Với máy · Khó"
- **AND** chọn lối đó mở lại đúng ván đó

### Requirement: Xác nhận trước khi bỏ ván dở cùng chế độ

Bắt đầu ván mới ở một chế độ đang có ván dở MUST hỏi xác nhận trước, vì ván dở đó sẽ bị bỏ. Huỷ thì không bắt đầu gì và ván dở được giữ; đồng ý thì ván dở bị bỏ và ván mới bắt đầu với lựa chọn vừa chọn. Ván dở của chế độ khác không bị ảnh hưởng. Không đọc được các ván đã lưu (kể cả khi bộ nhớ trình duyệt không trả lời sau vài giây) thì hệ thống SHALL vẫn hỏi xác nhận, và ván không đọc được MUST NOT bị ván mới ghi đè.

#### Scenario: Huỷ giữ lại ván dở

- **WHEN** đang có ván dở đấu với máy, người chơi chọn "Đấu với máy" rồi bấm "Bắt đầu" và chọn huỷ
- **THEN** người chơi vẫn ở màn hình bắt đầu ván và ván dở đấu với máy vẫn còn

#### Scenario: Đồng ý bắt đầu ván mới

- **WHEN** đang có ván dở đấu với máy mức Vừa, người chơi chọn mức Khó, bấm "Bắt đầu" và đồng ý
- **THEN** màn hình chơi mở ra với một ván mới mức Khó

#### Scenario: Ván dở chế độ khác không bị đụng tới

- **WHEN** đang có ván dở cùng máy, người chơi bắt đầu một ván đấu với máy
- **THEN** không có câu hỏi xác nhận và ván dở cùng máy vẫn còn

#### Scenario: Không đọc được ván đã lưu

- **WHEN** trình duyệt báo lỗi mỗi khi đọc các ván đã lưu, người chơi bấm "Bắt đầu" ở chế độ "Đấu với máy" và đồng ý
- **THEN** một ván mới bắt đầu và ván đấu với máy đã lưu vẫn còn nguyên

#### Scenario: Bộ nhớ trình duyệt không trả lời

- **WHEN** bộ nhớ trình duyệt không trả lời khi màn hình bắt đầu ván đọc các ván đã lưu
- **THEN** sau 3 giây nút "Bắt đầu" bấm được, và bấm thì hệ thống hỏi xác nhận như khi không đọc được các ván đã lưu

### Requirement: Dùng được bằng bàn phím và trình đọc màn hình

Mỗi nhóm lựa chọn (chế độ, mức độ, ai đi trước, từng tuỳ chọn luật) SHALL là một nhóm có tên đọc được, chọn được bằng bàn phím, và cho biết lựa chọn đang được chọn.

#### Scenario: Chọn mức độ bằng bàn phím

- **WHEN** người chơi dùng Tab tới nhóm "Mức độ" và nhấn phím mũi tên
- **THEN** mức độ được chọn đổi theo và trình đọc màn hình đọc được mức đang chọn

#### Scenario: Chọn kích thước bàn bằng bàn phím

- **WHEN** người chơi dùng Tab tới nhóm "Bàn cờ" của Cờ caro và nhấn phím mũi tên
- **THEN** "19×19" được chọn và trình đọc màn hình đọc được nhóm "Bàn cờ" với lựa chọn "19×19"

### Requirement: Tạo phòng không hỏi xác nhận

Tạo phòng ở chế độ "Online" MUST NOT hỏi xác nhận và MUST NOT chờ đọc các ván đã lưu, vì không bỏ ván dở nào.

#### Scenario: Tạo phòng không hỏi xác nhận

- **WHEN** trình duyệt báo lỗi mỗi khi đọc các ván đã lưu, người chơi chọn "Online" và bấm "Tạo phòng"
- **THEN** không có câu hỏi xác nhận và phòng được tạo

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
