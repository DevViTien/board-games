## MODIFIED Requirements

### Requirement: Vào chơi từ menu

Thẻ chơi được SHALL có hai lối vào: "Chơi" mở màn hình bắt đầu ván của game đó, nơi người chơi chọn chế độ trước khi vào bàn cờ; "Online" mở cùng màn hình đó với chế độ "Online" được chọn sẵn. Mỗi lối vào SHALL được mô tả bằng tên game cho trình đọc màn hình. Thẻ "Sắp có" MUST NOT mở được và MUST NOT nhận tiêu điểm bàn phím như một liên kết.

#### Scenario: Mở game chơi được

- **WHEN** người chơi chọn "Chơi" trên thẻ Tic-tac-toe
- **THEN** màn hình bắt đầu ván Tic-tac-toe mở ra

#### Scenario: Mở game để chơi online

- **WHEN** người chơi chọn "Online" trên thẻ Cờ caro
- **THEN** màn hình bắt đầu ván Cờ caro mở ra với chế độ "Online" được chọn và nút chính là "Tạo phòng"

#### Scenario: Lối vào nêu tên game

- **WHEN** trình đọc màn hình đọc lối "Online" trên thẻ Cờ cá ngựa
- **THEN** lối đó được đọc là "Online" kèm mô tả "Cờ cá ngựa"

#### Scenario: Thẻ sắp có không mở được

- **WHEN** menu có thẻ "Sắp có" của một game dự kiến chưa có luật và người chơi bấm vào thẻ đó
- **THEN** không có gì được mở

### Requirement: Game chơi được và game sắp có trên menu

Menu SHALL hiện mọi game đã có luật trong app dưới dạng chơi được, và mọi game đã lên kế hoạch cho MVP nhưng chưa có luật dưới dạng "Sắp có". Game chơi được SHALL đứng trước game "Sắp có". Một game MUST NOT hiện hai lần: khi game dự kiến được thêm luật, thẻ "Sắp có" của nó được thay bằng thẻ chơi được.

#### Scenario: Menu khi có Tic-tac-toe và Cờ caro

- **WHEN** người chơi mở trang chủ
- **THEN** thẻ Tic-tac-toe, Cờ caro, Cờ cá ngựa và Cờ vua đều chơi được
- **AND** menu không còn thẻ nào có nhãn "Sắp có"

#### Scenario: Game dự kiến đã có luật không bị lặp

- **WHEN** một game trong danh sách dự kiến đã được thêm luật vào app
- **THEN** menu chỉ có một thẻ cho game đó và thẻ ấy chơi được

#### Scenario: Thẻ Cờ caro

- **WHEN** menu hiện bằng tiếng Việt thẻ Cờ caro
- **THEN** thẻ ghi "2 người" và "~10 phút", có hai lối vào "Chơi" và "Online", và không có nhãn "Sắp có"

#### Scenario: Thẻ Cờ cá ngựa

- **WHEN** menu hiện bằng tiếng Việt thẻ Cờ cá ngựa
- **THEN** thẻ ghi "2–4 người" và "~20 phút", có hai lối vào "Chơi" và "Online", và không có nhãn "Sắp có"

#### Scenario: Thẻ Cờ vua

- **WHEN** menu hiện bằng tiếng Việt thẻ Cờ vua
- **THEN** thẻ ghi "2 người" và "~20 phút", có hai lối vào "Chơi" và "Online", và không có nhãn "Sắp có"
