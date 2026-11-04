## MODIFIED Requirements

### Requirement: Đổi ngôn ngữ

Hệ thống SHALL cho người chơi đổi ngôn ngữ bằng nút "Ngôn ngữ" trên thanh trên cùng của mọi trang (tên nêu ngôn ngữ hiện tại) mở menu thả xuống, dùng được bằng bàn phím, chuột và chạm. Danh sách lựa chọn SHALL ghi tên mỗi ngôn ngữ bằng chính ngôn ngữ đó ("Tiếng Việt", "English", "日本語"). Sau khi chọn, trang SHALL hiển thị lại bằng ngôn ngữ mới mà không tải lại thủ công và không mất ván đang chơi, nút báo bận tới khi xong, và lựa chọn SHALL được ghi nhớ trên trình duyệt đó ít nhất một năm.

#### Scenario: Đổi ngôn ngữ có hiệu lực ngay

- **WHEN** người chơi đang xem trang bằng tiếng Việt và chọn "English"
- **THEN** trang hiển thị bằng tiếng Anh
- **AND** thuộc tính `lang` của trang là `en`

#### Scenario: Lựa chọn được giữ sau khi tải lại

- **WHEN** người chơi đã chọn "English" rồi tải lại trang
- **THEN** trang vẫn hiển thị bằng tiếng Anh

#### Scenario: Từ chối ngôn ngữ không hỗ trợ

- **WHEN** có yêu cầu lưu một ngôn ngữ ngoài `vi`, `en`, `ja`
- **THEN** hệ thống từ chối yêu cầu và không thay đổi ngôn ngữ đã lưu

#### Scenario: Đổi ngôn ngữ bằng bàn phím

- **WHEN** người chơi dùng Tab tới nút "Ngôn ngữ", nhấn mũi tên xuống, nhấn mũi tên xuống lần nữa rồi Enter
- **THEN** menu mở với tiêu điểm ở "Tiếng Việt", tiêu điểm sang "English" mà ngôn ngữ chưa đổi, rồi trang hiển thị bằng tiếng Anh và tiêu điểm về nút "Ngôn ngữ"

#### Scenario: Tên của nút

- **WHEN** trang đang hiển thị bằng tiếng Việt và trình đọc màn hình tới nút "Ngôn ngữ"
- **THEN** nút có tên "Ngôn ngữ: Tiếng Việt, VI" và cho biết nó mở một menu

#### Scenario: Đang đổi ngôn ngữ

- **WHEN** người chơi vừa chọn "日本語" và trang chưa hiển thị lại
- **THEN** nút "Ngôn ngữ" báo bận và không mở lại menu được

#### Scenario: Menu trên điện thoại nhỏ

- **WHEN** người chơi chạm nút "Ngôn ngữ" ở khung 360 × 740
- **THEN** menu nằm trọn trong màn hình và mỗi lựa chọn cao ít nhất 44 px

#### Scenario: Đổi ngôn ngữ ở trang luật

- **WHEN** người chơi đang đọc `/rules/ludo` bằng tiếng Việt và chọn "English" bằng nút "Ngôn ngữ" trên thanh của trang
- **THEN** trang luật hiển thị bằng tiếng Anh, vẫn ở `/rules/ludo`

#### Scenario: Đổi ngôn ngữ giữa ván

- **WHEN** người chơi đã đi hai nước trong ván Cờ caro đấu với máy và chọn "日本語"
- **THEN** màn hình chơi hiển thị bằng tiếng Nhật với đúng hai quân của người chơi và các nước của máy, và ván tiếp tục

#### Scenario: Đổi ngôn ngữ khi đang chơi online

- **WHEN** người chơi đang chơi Cờ caro online và chọn "English", rồi đối thủ đi một nước
- **THEN** màn hình chơi hiển thị bằng tiếng Anh, người chơi vẫn ở đúng ghế, không phải vào lại sảnh chờ, và nước của đối thủ hiện trên bàn
