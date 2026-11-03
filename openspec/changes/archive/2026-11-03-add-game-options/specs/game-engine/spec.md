## ADDED Requirements

### Requirement: Lựa chọn của tuỳ chọn luật

Một game SHALL khai báo được, cho mỗi tuỳ chọn luật, danh sách giá trị người chơi được chọn theo thứ tự hiện; khai báo chỉ gồm giá trị, không có chữ hiển thị, và đọc được mà không cần tạo ván. Với game có khai báo, bộ kiểm tra hợp đồng SHALL xác nhận ở kiểm tra `option-choices` rằng giá trị mặc định nằm trong lựa chọn, không có giá trị trùng, và mọi tổ hợp lựa chọn đều tạo được ván.

#### Scenario: Đọc lựa chọn mà không tạo ván

- **WHEN** app cần dựng màn hình chọn tuỳ chọn luật của Cờ caro
- **THEN** app đọc được các tuỳ chọn và giá trị được chọn mà không tạo ván nào

#### Scenario: Mặc định không nằm trong lựa chọn

- **WHEN** một game khai báo lựa chọn kích thước bàn là 15 và 19 nhưng kích thước bàn mặc định là 17
- **THEN** bộ kiểm tra hợp đồng thất bại ở kiểm tra `option-choices`

#### Scenario: Một tổ hợp không tạo được ván

- **WHEN** một game khai báo lựa chọn mà một tổ hợp của chúng bị chính game từ chối khi tạo ván
- **THEN** bộ kiểm tra hợp đồng thất bại ở kiểm tra `option-choices` và chỉ kiểm tra đó thất bại

#### Scenario: Game không khai báo lựa chọn

- **WHEN** bộ kiểm tra hợp đồng chạy cho Tic-tac-toe
- **THEN** kiểm tra `option-choices` vượt qua
