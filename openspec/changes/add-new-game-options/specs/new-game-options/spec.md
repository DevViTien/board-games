## Purpose

Bắt đầu ván mới với tuỳ chọn luật khác ngay từ màn hình chơi khi ván vừa kết thúc, và đi tiếp ván do game gợi ý, ở cùng máy, đấu với máy và online, không phải về màn bắt đầu ván hay tạo phòng mới.

## ADDED Requirements

### Requirement: Đổi tuỳ chọn khi ván kết thúc

Với game có tuỳ chọn luật, khi ván đã có kết quả, thẻ kết quả SHALL có nút đổi tuỳ chọn mang tên do game đặt (ví dụ "Đổi bàn, luật"), ở mọi chế độ. Bấm SHALL mở hộp có các nhóm như màn bắt đầu ván, chọn sẵn tuỳ chọn của ván vừa xong; "Bắt đầu ván mới" SHALL bắt đầu ván mới với lựa chọn đó, online là cho cả phòng, còn "Huỷ" giữ nguyên. Nút MUST không có khi ván chưa kết thúc hay game không có tuỳ chọn.

#### Scenario: Đổi bàn Cờ caro cùng máy

- **WHEN** ván Cờ caro cùng máy 15×15 luật "chặn hai đầu" vừa có người thắng, người chơi bấm "Đổi bàn, luật", chọn "19×19" rồi bấm "Bắt đầu ván mới"
- **THEN** bàn 19×19 trống hiện ra và màn hình ghi "19×19 · Chặn hai đầu"

#### Scenario: Huỷ đổi tuỳ chọn

- **WHEN** hộp đổi tuỳ chọn đang mở với "19×19" được chọn và người chơi bấm "Huỷ"
- **THEN** hộp đóng, ván vừa xong vẫn hiện kết quả và màn hình vẫn ghi "15×15 · Chặn hai đầu"

#### Scenario: Hộp chọn sẵn tuỳ chọn đang chơi

- **WHEN** ván Cờ caro đấu với máy 19×19 luật "tự do" vừa kết thúc và người chơi bấm "Đổi bàn, luật"
- **THEN** hộp mở với "19×19" và "Tự do" được chọn

#### Scenario: Đổi tuỳ chọn cho cả phòng

- **WHEN** ván Cờ caro online 15×15 vừa có người thắng, Lan bấm "Đổi bàn, luật", chọn "19×19" rồi bấm "Bắt đầu ván mới"
- **THEN** cả hai người thấy bàn 19×19 trống, ghế đã xoay như "Chơi lại", và màn hình ghi "19×19 · Chặn hai đầu"

#### Scenario: Không đổi được giữa ván

- **WHEN** ván Cờ caro đang dở
- **THEN** màn hình chơi không có nút "Đổi bàn, luật"

#### Scenario: Game không có tuỳ chọn

- **WHEN** ván Tic-tac-toe vừa kết thúc
- **THEN** thẻ kết quả chỉ có nút bắt đầu ván mới, không có nút đổi tuỳ chọn

### Requirement: Nhớ tuỳ chọn vừa đổi

Tuỳ chọn của ván mới bắt đầu từ thẻ kết quả bằng hộp đổi tuỳ chọn hay nút gợi ý SHALL thành tuỳ chọn nhớ gần nhất của game trên trình duyệt của người bấm (capability `game-setup`), như khi bấm "Bắt đầu" ở màn bắt đầu ván. Tuỳ chọn của ván mới SHALL được lưu cùng ván như mọi ván.

#### Scenario: Màn bắt đầu ván nhớ bàn vừa đổi

- **WHEN** người chơi đổi ván Cờ caro cùng máy sang "19×19" từ thẻ kết quả, rồi về menu và mở màn bắt đầu ván Cờ caro
- **THEN** nhóm "Bàn cờ" có "19×19" được chọn

#### Scenario: Tải lại sau khi đổi

- **WHEN** người chơi đổi ván Cờ caro cùng máy sang "19×19", đi 2 nước rồi tải lại trang
- **THEN** bàn 19×19 hiện đúng 2 nước đó và màn hình ghi "19×19 · Chặn hai đầu"

### Requirement: Ván tiếp theo do game gợi ý

Một game MAY gợi ý tuỳ chọn cho ván sau theo kết quả ván vừa xong. Khi có gợi ý, thẻ kết quả SHALL có nút hành động chính mang tên do game đặt kèm tuỳ chọn gợi ý (ví dụ "Bản đồ tiếp: Tiệm chè"), trước nút bắt đầu ván mới; bấm SHALL bắt đầu ngay ván mới với tuỳ chọn đó, như khi đổi tuỳ chọn. Không có gợi ý thì MUST không có nút này.

#### Scenario: Sang bản đồ tiếp sau khi thắng

- **WHEN** cả đội thắng ván Đội gom thạch cùng máy trên "Hai gian bếp"
- **THEN** thẻ kết quả có nút chính "Bản đồ tiếp: Tiệm chè", rồi "Ván mới" và "Đổi bản đồ"
- **AND** bấm "Bản đồ tiếp: Tiệm chè" thì ván mới trên "Tiệm chè" bắt đầu ngay, không hỏi thêm

#### Scenario: Game không gợi ý

- **WHEN** ván Cờ caro vừa có người thắng
- **THEN** thẻ kết quả chỉ có "Ván mới" và "Đổi bàn, luật"

#### Scenario: Gợi ý online cho cả phòng

- **WHEN** cả đội thắng ván Đội gom thạch online trên "Hai gian bếp" và Minh bấm "Bản đồ tiếp: Tiệm chè"
- **THEN** mọi người trong phòng vào ván mới trên "Tiệm chè"

### Requirement: Báo ván mới với tuỳ chọn khác

Khi ván mới online bắt đầu với tuỳ chọn khác ván trước, màn hình của mọi người trong phòng SHALL báo tuỳ chọn mới trong vùng trình đọc màn hình tự đọc và trên dòng trạng thái ("Ván mới: Tiệm chè · …"; game theo lượt nối luật sau lời báo ván mới đang có), cho tới nước đầu tiên của ván mới, và chip luật SHALL ghi tuỳ chọn mới. Ván mới giữ tuỳ chọn cũ thì lời báo như trước.

#### Scenario: Bạn đổi bản đồ

- **WHEN** Minh đổi phòng Đội gom thạch từ "Hai gian bếp" sang "Tiệm chè" khi bắt đầu ván mới
- **THEN** màn hình của Lan ghi "Ván mới: Tiệm chè · Cả đội cùng đi · bạn là Hồng" trên dòng trạng thái và chip luật ghi "Tiệm chè"

#### Scenario: Chơi lại giữ tuỳ chọn

- **WHEN** ván Cờ caro online 15×15 kết thúc và một người bấm "Chơi lại"
- **THEN** lời báo ván mới không nêu tuỳ chọn, như trước
