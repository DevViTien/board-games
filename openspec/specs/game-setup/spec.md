# game-setup Specification

## Purpose

Màn hình bắt đầu ván của mỗi game: chọn chơi cùng máy hay đấu với máy, mức độ và ai đi trước, hoặc tiếp tục một ván đang dở của game đó, trước khi vào bàn cờ.

## Requirements

### Requirement: Chọn cách chơi trước khi vào ván

Đường dẫn `/play/<mã game>` SHALL mở màn hình bắt đầu ván của game đó. Với game hỗ trợ đấu với máy, người chơi SHALL chọn được chế độ "Đấu với máy" hoặc "Cùng máy"; với "Đấu với máy", SHALL chọn được mức độ (Dễ, Vừa, Khó; mặc định Vừa) và ai đi trước (Tôi, Máy, Ngẫu nhiên; mặc định Tôi). Game không hỗ trợ đấu với máy MUST chỉ có chế độ "Cùng máy". Bấm "Bắt đầu" SHALL mở màn hình chơi của chế độ đó với một ván mới theo lựa chọn.

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
- **THEN** chỉ có chế độ "Cùng máy" và không có lựa chọn mức độ hay người đi trước

### Requirement: Nhớ lựa chọn gần nhất

Màn hình bắt đầu ván SHALL nhớ trên trình duyệt lựa chọn (chế độ, mức độ, người đi trước) của lần bấm "Bắt đầu" gần nhất cho từng game và hiện lại lựa chọn đó ở lần mở sau. Khi chưa có hoặc không đọc được lựa chọn đã nhớ, màn hình SHALL dùng lựa chọn mặc định mà không báo lỗi.

#### Scenario: Lần sau hiện lại lựa chọn cũ

- **WHEN** người chơi bắt đầu một ván Tic-tac-toe đấu với máy mức Khó, máy đi trước, rồi sau đó mở lại màn hình bắt đầu ván Tic-tac-toe
- **THEN** chế độ là "Đấu với máy", mức độ là "Khó" và người đi trước là "Máy"

#### Scenario: Lựa chọn đã nhớ bị hỏng

- **WHEN** dữ liệu lựa chọn đã nhớ trên trình duyệt bị hỏng và người chơi mở màn hình bắt đầu ván
- **THEN** màn hình hiện lựa chọn mặc định và không có thông báo lỗi

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

Mỗi nhóm lựa chọn (chế độ, mức độ, ai đi trước) SHALL là một nhóm có tên đọc được, chọn được bằng bàn phím, và cho biết lựa chọn đang được chọn.

#### Scenario: Chọn mức độ bằng bàn phím

- **WHEN** người chơi dùng Tab tới nhóm "Mức độ" và nhấn phím mũi tên
- **THEN** mức độ được chọn đổi theo và trình đọc màn hình đọc được mức đang chọn
