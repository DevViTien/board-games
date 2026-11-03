## ADDED Requirements

### Requirement: Lý do không gieo được

Khi nút "Gieo xúc xắc" hiện mà không bấm được, nút SHALL có mô tả đọc được nêu lý do: cần chọn ngựa trước, đang chờ người đang đến lượt (nêu tên người ở xa hoặc máy kèm màu), đang chờ kết nối lại, hoặc đang chờ server trả lời; lý do SHALL hiện thành chữ khi nút có tiêu điểm hoặc bị bấm.

#### Scenario: Cần chọn ngựa trước

- **WHEN** Đỏ vừa gieo được 6 trong ván cùng máy và người chơi đưa tiêu điểm tới nút "Gieo xúc xắc"
- **THEN** nút được mô tả là cần chọn ngựa trước và lời đó hiện trên màn hình

#### Scenario: Đang chờ người ở xa

- **WHEN** trong ván Cờ cá ngựa online đang đến lượt Minh và người chơi bấm nút "Gieo xúc xắc"
- **THEN** không có lần gieo nào và màn hình nói đang chờ Minh
