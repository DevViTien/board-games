## ADDED Requirements

### Requirement: Không vi phạm tiếp cận tự động phát hiện được

Menu, màn hình bắt đầu ván, màn hình chơi của mọi game ở mọi chế độ, sảnh chờ, ván online, trang luật, các hộp thoại và các trang lỗi hay không tìm thấy MUST NOT có vi phạm WCAG 2.x mức A hay AA nào mà bộ kiểm tra tự động axe-core phát hiện được, ở cả giao diện sáng lẫn tối, trên khung điện thoại và máy tính.

#### Scenario: Menu ở giao diện tối

- **WHEN** bộ kiểm tra tự động quét menu có một ván dở ở giao diện tối trên khung điện thoại
- **THEN** không có vi phạm WCAG A hay AA nào

#### Scenario: Màn hình chơi có hộp thoại

- **WHEN** bộ kiểm tra tự động quét màn hình chơi Cờ caro đấu với máy đang mở hộp thoại "Đầu hàng", ở giao diện sáng trên khung máy tính
- **THEN** không có vi phạm WCAG A hay AA nào

#### Scenario: Ván online

- **WHEN** bộ kiểm tra tự động quét màn hình ván Cờ vua online của người cầm Đen ở cả hai giao diện
- **THEN** không có vi phạm WCAG A hay AA nào

### Requirement: Dùng được trên điện thoại nhỏ

Ở khung 360 × 740 và 360 × 640, mọi màn hình MUST NOT cuộn ngang và mọi điều khiển SHALL tới được. Ở 360 × 740, bàn, lượt và trọn nút chính của khoảnh khắc đó ("Ván mới" khi chơi trên thiết bị này, nút gieo hay lựa chọn của game) SHALL nằm trong màn hình mà không cần cuộn; dòng báo kết nối online MUST NOT chiếm quá một dòng chữ khi trống.

#### Scenario: Cờ vua ở 360 × 740

- **WHEN** người chơi mở một ván Cờ vua cùng máy ở khung 360 × 740
- **THEN** bàn, hai thanh người chơi và toàn bộ nút "Ván mới" nằm trong màn hình mà không cần cuộn

#### Scenario: Cờ vua ở 360 × 640

- **WHEN** người chơi mở một ván Cờ vua cùng máy ở khung 360 × 640
- **THEN** trang không cuộn ngang, và cuộn dọc tới thì bàn và toàn bộ nút "Ván mới" đều nằm trọn trong màn hình

#### Scenario: Không cuộn ngang

- **WHEN** người chơi mở lần lượt menu, màn hình bắt đầu ván, màn hình chơi và trang luật của mỗi game ở khung 360 × 740 và 360 × 640
- **THEN** không màn hình nào rộng hơn khung hình

#### Scenario: Ván online trên điện thoại

- **WHEN** người chơi đang kết nối tốt trong ván Cờ cá ngựa online ở khung 390 × 844
- **THEN** khoảng dành cho dòng báo kết nối trên dòng lượt cao không quá một dòng chữ nhỏ

### Requirement: Dùng được khi xoay ngang

Trên điện thoại xoay ngang (chiều cao từ 360 px; kiểm thêm 300 px khi thanh trình duyệt hiện), màn hình chơi của mọi game SHALL hiện trọn bàn trong chiều cao màn hình, với lượt và điều khiển đặt bên cạnh bàn, và nước đi SHALL chọn được bằng chạm. Các màn hình khác MUST NOT cuộn ngang. App MUST NOT khoá hướng màn hình.

#### Scenario: Cờ cá ngựa xoay ngang

- **WHEN** người chơi mở ván Cờ cá ngựa cùng máy ở khung 844 × 390
- **THEN** toàn bộ bàn nằm trong màn hình và nút "Gieo xúc xắc" nằm bên cạnh bàn trong màn hình

#### Scenario: Cờ vua xoay ngang

- **WHEN** người chơi mở ván Cờ vua cùng máy ở khung 740 × 360 và chạm một Tốt rồi ô trước nó
- **THEN** toàn bộ bàn nằm trong màn hình và nước đi được thực hiện

### Requirement: Vùng an toàn của màn hình

Trên thiết bị có tai thỏ hay góc bo, chữ và điều khiển SHALL nằm trong vùng an toàn của màn hình ở cả hướng dọc lẫn ngang, trong khi nền trang vẫn phủ tới mép. Trang MUST cho phóng to bằng hai ngón.

#### Scenario: Xoay ngang có tai thỏ

- **WHEN** trang chơi mở khi xoay ngang và vùng an toàn bên trái là 44 px (giá trị của biến vùng an toàn)
- **THEN** nút "Về menu" và mép trái của bàn cách mép trái màn hình ít nhất 44 px

#### Scenario: Phóng to

- **WHEN** người chơi mở bất kỳ trang nào
- **THEN** thẻ viewport của trang không chặn phóng to

### Requirement: Màu thanh trình duyệt theo nền trang

Thẻ `theme-color` của trang SHALL theo màu nền đang hiện: nền riêng của game trên màn hình chơi và trang luật, nền chung ở trang khác, ở giao diện sáng hay tối, kể cả khi người chơi chọn giao diện khác hệ thống.

#### Scenario: Màn hình chơi Cờ cá ngựa ở giao diện tối

- **WHEN** người chơi đã chọn giao diện tối và mở màn hình chơi Cờ cá ngựa
- **THEN** thẻ `theme-color` mang màu nền tối của Cờ cá ngựa

#### Scenario: Về menu

- **WHEN** người chơi rời màn hình chơi Cờ cá ngựa về menu ở giao diện sáng
- **THEN** thẻ `theme-color` mang màu nền sáng của menu

### Requirement: Thanh trên cùng luôn thấy

Mọi trang (menu, bắt đầu ván, màn hình chơi mọi game kể cả online, sảnh chờ và lỗi phòng, trang luật, các trang không tìm thấy, lỗi, đang tải) SHALL có thanh trên cùng luôn nằm ở mép trên màn hình khi cuộn, nền không trong suốt, nằm trong vùng an toàn, có lối "← Về menu" (trừ menu) và hai nút chọn giao diện, ngôn ngữ. Phần tử nhận tiêu điểm MUST NOT bị thanh che. Bố cục không cuộn của màn hình chơi SHALL vẫn đúng với thanh này.

#### Scenario: Cuộn trang luật

- **WHEN** người chơi cuộn trang luật Cờ vua xuống cuối ở khung 390 × 844
- **THEN** thanh trên cùng vẫn ở mép trên màn hình với lối "← Về menu", nút "Giao diện" và nút "Ngôn ngữ"

#### Scenario: Cuộn menu bằng Tab

- **WHEN** người chơi dùng Tab tới liên kết cuối của menu ở khung 360 × 740
- **THEN** liên kết đó nằm trọn trong màn hình, không bị thanh trên che

#### Scenario: Màn hình chơi vẫn không cần cuộn

- **WHEN** người chơi mở ván Cờ cá ngựa 4 người cùng máy ở khung 1280 × 800
- **THEN** thanh trên, bàn, dòng lượt, bảng người chơi và các nút nằm trong màn hình mà không cần cuộn

#### Scenario: Trang không tìm thấy

- **WHEN** người chơi mở một đường dẫn không có
- **THEN** trang có thanh trên cùng với lối "← Về menu"
