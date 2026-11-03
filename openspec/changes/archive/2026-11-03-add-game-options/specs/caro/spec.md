## ADDED Requirements

### Requirement: Lựa chọn tuỳ chọn luật của Cờ caro

Cờ caro SHALL khai báo cho người chơi chọn kích thước bàn theo thứ tự 15×15, 19×19 và luật thắng theo thứ tự "chặn hai đầu", "tự do". Mọi tổ hợp của hai lựa chọn SHALL tạo được ván và chơi được tới khi kết thúc.

#### Scenario: Lựa chọn của Cờ caro

- **WHEN** app đọc lựa chọn tuỳ chọn luật của Cờ caro
- **THEN** kích thước bàn có hai lựa chọn 15 và 19, luật thắng có hai lựa chọn "chặn hai đầu" và "tự do", theo đúng thứ tự đó

#### Scenario: Mọi tổ hợp chơi được

- **WHEN** bộ kiểm tra hợp đồng chạy cho Cờ caro
- **THEN** kiểm tra `option-choices` vượt qua và các ván tự chơi với cả bốn tổ hợp đều kết thúc

### Requirement: Bàn 19×19 vừa màn hình điện thoại

Bàn Cờ caro 19×19 SHALL hiện trọn trong chiều ngang của màn hình rộng 360 px mà trang không phải cuộn ngang, và người chơi SHALL đặt được quân bằng cách chạm hai lần như requirement "Đặt quân chính xác trên màn hình cảm ứng nhỏ".

#### Scenario: Bàn 19×19 trên điện thoại hẹp

- **WHEN** người chơi chọn bàn 19×19 rồi bắt đầu ván Cờ caro cùng máy trên màn hình cảm ứng rộng 360 px
- **THEN** cả 19 cột hiện trên màn hình và trang không cuộn ngang
- **AND** chạm một ô hai lần thì quân được đặt vào ô đó

### Requirement: Máy Cờ caro trên bàn 19×19

Trên bàn 19×19 giữa ván, máy Cờ caro SHALL đi nước trong thời hạn chung của đấu với máy (capability `play-vs-ai`) ở mọi mức độ, kể cả mức Khó, mà giao diện không bị đứng trong lúc máy nghĩ.

#### Scenario: Máy mức Khó trên bàn 19×19

- **WHEN** trong ván Cờ caro 19×19 đấu với máy mức Khó đã có 30 nước và máy đã đi ít nhất một nước từ khi mở trang, người chơi đặt quân
- **THEN** trong vòng 2 giây máy đặt một quân và lại đến lượt người chơi
