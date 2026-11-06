## MODIFIED Requirements

### Requirement: Nhắc người đến lượt

Trong ván online, khi lượt của người ở thiết bị này đã kéo dài từ 4 phút, màn hình SHALL nhắc còn bao lâu trước khi người khác xử được bỏ ván (thua, hay máy chơi thay với phòng từ ba ghế của game có máy). Lời nhắc SHALL được đọc một lần khi xuất hiện. Đi một nước SHALL làm lời nhắc biến mất.

#### Scenario: Còn dưới một phút

- **WHEN** lượt của người chơi trong ván Cờ vua online đã kéo dài 4 phút 18 giây
- **THEN** màn hình ghi còn 0:42 và quá 5 phút người khác có thể xử thắng

#### Scenario: Đi xong thì hết nhắc

- **WHEN** lời nhắc đang hiện và người chơi đi một nước
- **THEN** lời nhắc không còn
