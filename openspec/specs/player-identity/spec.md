# player-identity Specification

## Purpose

Danh tính người chơi khi chơi online mà không cần tài khoản: một tên tạm do người chơi chọn và một mã người chơi ngẫu nhiên, cùng được nhớ trên trình duyệt.

## Requirements

### Requirement: Hỏi tên tạm khi chơi online

Khi người chơi tạo hoặc vào phòng online mà trình duyệt chưa nhớ tên tạm nào, hệ thống SHALL hỏi tên tạm trước. Tên SHALL được cắt khoảng trắng hai đầu và MUST dài từ 1 đến 24 ký tự; tên không hợp lệ MUST bị từ chối với lời báo gắn với ô nhập, ô nhập SHALL nhận lại focus để trình đọc màn hình đọc lời báo, và người chơi chưa được vào phòng. Khi trang phòng hỏi tên, ô nhập tên SHALL có focus sẵn.

#### Scenario: Lần đầu mở link mời

- **WHEN** người chơi chưa từng nhập tên tạm và mở link mời vào một phòng
- **THEN** trang phòng hỏi tên tạm trước khi vào phòng

#### Scenario: Tên rỗng

- **WHEN** người chơi chỉ nhập khoảng trắng vào ô tên tạm rồi xác nhận
- **THEN** hệ thống báo tên không hợp lệ ngay tại ô, ô tên có focus và người chơi chưa vào phòng

### Requirement: Nhớ danh tính trên trình duyệt

Hệ thống SHALL nhớ tên tạm và một mã người chơi ngẫu nhiên trên trình duyệt sau lần đầu người chơi nhập tên, và SHALL dùng lại cả hai ở các lần sau mà không hỏi lại. Khi không đọc được danh tính đã nhớ (dữ liệu hỏng), hệ thống SHALL coi như chưa có và hỏi tên lại; khi trình duyệt không cho lưu, người chơi SHALL vẫn chơi được trong phiên đó với tên nhập gần nhất.

#### Scenario: Lần sau không hỏi lại tên

- **WHEN** người chơi đã nhập tên "Minh" khi tạo phòng, rồi sau đó mở link mời vào một phòng khác
- **THEN** người chơi vào phòng với tên "Minh" mà không bị hỏi tên

#### Scenario: Danh tính đã nhớ bị hỏng

- **WHEN** dữ liệu danh tính trên trình duyệt bị hỏng và người chơi mở link mời
- **THEN** trang phòng hỏi tên tạm như lần đầu, không có thông báo lỗi

#### Scenario: Trình duyệt không cho lưu

- **WHEN** trình duyệt từ chối mọi lần ghi vào bộ nhớ của trang và người chơi nhập tên rồi tạo phòng
- **THEN** phòng vẫn được tạo và người chơi ngồi ghế đầu tiên với tên vừa nhập

#### Scenario: Trình duyệt hết chỗ lưu khi đổi tên

- **WHEN** trình duyệt đã nhớ tên "Minh", rồi từ chối ghi vì hết chỗ, và người chơi đổi tên thành "Lan"
- **THEN** trong phiên đó người chơi dùng tên "Lan"

### Requirement: Đổi tên tạm

Tên sửa ở ô tên của màn hình bắt đầu ván SHALL được nhớ khi người chơi rời ô với tên hợp lệ; tên sửa ở sảnh chờ SHALL được nhớ khi người chơi bấm "Vào chơi". Trang phòng đang mở SHALL vào lại phòng với tên nhớ gần nhất mỗi khi tự kết nối lại hoặc khi người chơi bấm thử lại. Mã người chơi SHALL giữ nguyên khi người chơi đổi tên.

#### Scenario: Đổi tên giữ nguyên ghế

- **WHEN** người chơi đang ngồi trong một phòng sửa tên tạm ở ô tên của màn hình bắt đầu ván (chế độ "Online") rồi rời ô đó, sau đó mở lại link phòng
- **THEN** người chơi vẫn ngồi đúng ghế cũ và mọi người trong phòng thấy tên mới

#### Scenario: Đổi tên ở sảnh chờ còn sau khi nối lại

- **WHEN** người chơi sửa tên tạm ở sảnh chờ rồi bấm "Vào chơi", sau đó kết nối bị cắt và trang tự kết nối lại
- **THEN** mọi người trong phòng vẫn thấy tên mới
