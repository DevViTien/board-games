## ADDED Requirements

### Requirement: Tuỳ chọn luật khi đấu với máy

Trong ván đấu với máy, máy SHALL chơi theo đúng tuỳ chọn luật của ván. "Ván mới" SHALL giữ cả mức độ, người đi trước và tuỳ chọn luật. Mở `/play/<mã game>/ai` khi chưa có ván SHALL dùng cả tuỳ chọn luật nhớ gần nhất của game.

#### Scenario: Máy chơi trên bàn 19×19

- **WHEN** người chơi bắt đầu ván Cờ caro đấu với máy với bàn 19×19 và đặt quân ở hàng 19, cột 19
- **THEN** máy đặt một quân hợp lệ trên bàn 19×19 và lại đến lượt người chơi

#### Scenario: Ván mới giữ mức độ và tuỳ chọn

- **WHEN** ván Cờ caro đấu với máy mức Khó, bàn 19×19 vừa kết thúc và người chơi chọn "Ván mới"
- **THEN** một ván mới mức Khó với bàn 19×19 bắt đầu

#### Scenario: Mở thẳng đường dẫn dùng tuỳ chọn gần nhất

- **WHEN** lần gần nhất người chơi bắt đầu Cờ caro đấu với máy mức Khó với luật "tự do", ván đó đã kết thúc, và người chơi mở `/play/caro/ai`
- **THEN** một ván đấu với máy mức Khó luật "tự do" bắt đầu
