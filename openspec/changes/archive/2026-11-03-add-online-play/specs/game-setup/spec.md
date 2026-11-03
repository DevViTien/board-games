# Spec Delta

## MODIFIED Requirements

### Requirement: Chọn cách chơi trước khi vào ván

Đường dẫn `/play/<mã game>` SHALL mở màn hình bắt đầu ván của game đó. Với game hỗ trợ đấu với máy, người chơi SHALL chọn được chế độ "Đấu với máy", "Cùng máy" hoặc "Online"; với "Đấu với máy", SHALL chọn được mức độ (Dễ, Vừa, Khó; mặc định Vừa) và ai đi trước (Tôi, Máy, Ngẫu nhiên; mặc định Tôi). Game không hỗ trợ đấu với máy MUST chỉ có chế độ "Cùng máy" và "Online". Bấm "Bắt đầu" SHALL mở màn hình chơi của chế độ đó với một ván mới theo lựa chọn. Với "Online", màn hình SHALL cho nhập hoặc sửa tên tạm (điền sẵn tên đã nhớ, capability `player-identity`) thay cho mức độ và người đi trước, và nút chính SHALL là "Tạo phòng", tạo phòng online theo capability `online-play`.

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

#### Scenario: Chọn chơi online

- **WHEN** người chơi đã nhớ tên tạm "Minh" chọn chế độ "Online" ở màn hình bắt đầu ván Tic-tac-toe
- **THEN** màn hình có ô tên tạm điền sẵn "Minh", không có lựa chọn mức độ hay người đi trước, và nút chính là "Tạo phòng"

### Requirement: Nhớ lựa chọn gần nhất

Màn hình bắt đầu ván SHALL nhớ trên trình duyệt lựa chọn (chế độ, mức độ, người đi trước) của lần bấm "Bắt đầu" hoặc tạo phòng thành công gần nhất cho từng game và hiện lại lựa chọn đó ở lần mở sau. Khi chưa có hoặc không đọc được lựa chọn đã nhớ, màn hình SHALL dùng lựa chọn mặc định mà không báo lỗi.

#### Scenario: Lần sau hiện lại lựa chọn cũ

- **WHEN** người chơi bắt đầu một ván Tic-tac-toe đấu với máy mức Khó, máy đi trước, rồi sau đó mở lại màn hình bắt đầu ván Tic-tac-toe
- **THEN** chế độ là "Đấu với máy", mức độ là "Khó" và người đi trước là "Máy"

#### Scenario: Lựa chọn đã nhớ bị hỏng

- **WHEN** dữ liệu lựa chọn đã nhớ trên trình duyệt bị hỏng và người chơi mở màn hình bắt đầu ván
- **THEN** màn hình hiện lựa chọn mặc định và không có thông báo lỗi

#### Scenario: Nhớ chế độ online

- **WHEN** người chơi tạo phòng Tic-tac-toe online, rồi sau đó mở lại màn hình bắt đầu ván Tic-tac-toe
- **THEN** chế độ "Online" được chọn sẵn

### Requirement: Xác nhận trước khi bỏ ván dở cùng chế độ

Bắt đầu ván mới ở một chế độ đang có ván dở MUST hỏi xác nhận trước, vì ván dở đó sẽ bị bỏ. Huỷ thì không bắt đầu gì và ván dở được giữ; đồng ý thì ván dở bị bỏ và ván mới bắt đầu với lựa chọn vừa chọn. Ván dở của chế độ khác không bị ảnh hưởng. Không đọc được các ván đã lưu (kể cả khi bộ nhớ trình duyệt không trả lời sau vài giây) thì hệ thống SHALL vẫn hỏi xác nhận, và ván không đọc được MUST NOT bị ván mới ghi đè. Tạo phòng ở chế độ "Online" MUST NOT hỏi xác nhận và MUST NOT chờ đọc các ván đã lưu, vì không bỏ ván dở nào.

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

#### Scenario: Tạo phòng không hỏi xác nhận

- **WHEN** trình duyệt báo lỗi mỗi khi đọc các ván đã lưu, người chơi chọn "Online" và bấm "Tạo phòng"
- **THEN** không có câu hỏi xác nhận và phòng được tạo
