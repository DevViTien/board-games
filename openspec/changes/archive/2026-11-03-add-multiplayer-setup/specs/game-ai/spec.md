## MODIFIED Requirements

### Requirement: Nước đi có yếu tố ngẫu nhiên

Với nước đi có nhiều kết quả ngẫu nhiên (ví dụ gieo xúc xắc), máy SHALL đánh giá nước đó bằng giá trị kỳ vọng theo trọng số của các kết quả mà game khai báo, MUST NOT giả định một kết quả cụ thể (tốt nhất hay xấu nhất). Một lần gieo bắt buộc (nước hợp lệ duy nhất của người đến lượt là nước ngẫu nhiên) ngay sau một nước được chọn giữa nhiều nước MUST NOT được tính là một bước nhìn trước, để mỗi mức nhìn thấy nước đáp của người kế tiếp sau lần gieo của họ.

#### Scenario: Chọn nước có kỳ vọng tốt hơn

- **WHEN** máy chọn giữa một nước chắc chắn hoà và một nước gieo xúc xắc cho máy thắng với khả năng 3/4, thua với khả năng 1/4
- **THEN** máy chọn nước gieo xúc xắc

#### Scenario: Không trông vào kết quả may mắn

- **WHEN** máy chọn giữa một nước chắc chắn hoà và một nước gieo xúc xắc cho máy thắng với khả năng 1/4, thua với khả năng 3/4
- **THEN** máy chọn nước chắc chắn hoà

#### Scenario: Mức Vừa thấy nước đáp sau lần gieo của đối thủ

- **WHEN** trong một game gieo rồi chọn, máy vừa gieo và chọn giữa một nước được nhiều điểm ngay nhưng đối thủ trừng phạt được ở lượt sau với mọi số họ gieo, và một nước an toàn
- **THEN** máy mức Vừa chọn nước an toàn, còn máy mức Dễ (khi không đi ngẫu nhiên) chọn nước được nhiều điểm ngay
