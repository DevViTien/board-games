## MODIFIED Requirements

### Requirement: Game chơi được và game sắp có trên menu

Menu SHALL hiện mọi game đã có luật trong app dưới dạng chơi được, và mọi game đã lên kế hoạch cho MVP nhưng chưa có luật dưới dạng "Sắp có". Game chơi được SHALL đứng trước game "Sắp có". Một game MUST NOT hiện hai lần: khi game dự kiến được thêm luật, thẻ "Sắp có" của nó được thay bằng thẻ chơi được.

#### Scenario: Mọi game đã có luật đều chơi được

- **WHEN** người chơi mở trang chủ
- **THEN** thẻ Tic-tac-toe, Cờ caro, Cờ cá ngựa, Cờ vua, Cờ rào và Đội gom thạch đều chơi được
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

#### Scenario: Thẻ Cờ rào

- **WHEN** menu hiện bằng tiếng Việt thẻ Cờ rào
- **THEN** thẻ ghi "2–4 người" và "~15 phút", có hai lối vào "Chơi" và "Online", và không có nhãn "Sắp có"

#### Scenario: Thẻ Đội gom thạch

- **WHEN** menu hiện bằng tiếng Việt thẻ Đội gom thạch
- **THEN** thẻ ghi "2–4 người" và "~15 phút", có hai lối vào "Chơi" và "Online", không có lối đấu với máy và không có nhãn "Sắp có"
