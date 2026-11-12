## MODIFIED Requirements

### Requirement: Luật Cờ caro

Trang luật Cờ caro SHALL nêu: bàn 15×15, 19×19 hoặc vô hạn (bắt đầu 15×15 và tự nở khi quân tới gần mép), X đi trước, luật "tự do" (từ 5 quân liền trở lên theo ngang, dọc, chéo là thắng) và luật "chặn hai đầu" (như trên, trừ khi cả hai ô ngay ngoài hai đầu chuỗi là quân đối thủ; mép bàn không chặn; chuỗi dài hơn 5 thắng theo cùng điều kiện), và hoà khi đầy bàn; câu mục tiêu SHALL nhắc điều kiện chặn hai đầu. Hình SHALL cho thấy chuỗi bị chặn hai đầu, chuỗi chặn một đầu và chuỗi chạm mép bàn.

#### Scenario: Hai luật thắng

- **WHEN** người chơi mở `/rules/caro`
- **THEN** trang có một mục cho luật "tự do" và một mục cho luật "chặn hai đầu", và nêu cả ba cỡ bàn

#### Scenario: Hình của luật chặn hai đầu

- **WHEN** người chơi xem mục "chặn hai đầu"
- **THEN** có hình chuỗi năm X bị chặn hai đầu ghi không thắng, chuỗi bị chặn một đầu ghi thắng, và chuỗi chạm mép bàn ghi thắng
