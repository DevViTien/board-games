## ADDED Requirements

### Requirement: Game chơi được và game sắp có trên menu

Menu SHALL hiện mọi game đã có luật trong app dưới dạng chơi được, và mọi game đã lên kế hoạch cho MVP nhưng chưa có luật dưới dạng "Sắp có". Game chơi được SHALL đứng trước game "Sắp có". Một game MUST NOT hiện hai lần: khi game dự kiến được thêm luật, thẻ "Sắp có" của nó được thay bằng thẻ chơi được.

#### Scenario: Menu khi có Tic-tac-toe và Cờ caro

- **WHEN** người chơi mở trang chủ
- **THEN** thẻ Tic-tac-toe và thẻ Cờ caro chơi được đứng trước mọi thẻ "Sắp có"
- **AND** Cờ cá ngựa, Cờ vua hiện nhãn "Sắp có"

#### Scenario: Game dự kiến đã có luật không bị lặp

- **WHEN** một game trong danh sách dự kiến đã được thêm luật vào app
- **THEN** menu chỉ có một thẻ cho game đó và thẻ ấy chơi được

#### Scenario: Thẻ Cờ caro

- **WHEN** menu hiện bằng tiếng Việt thẻ Cờ caro
- **THEN** thẻ ghi "2 người" và "~10 phút", lối vào ghi "Chơi" và không có nhãn "Sắp có"

## REMOVED Requirements

### Requirement: Game hiện trên menu

**Reason**: Scenario "Menu khi mới có Tic-tac-toe" nói Cờ caro "Sắp có", không còn đúng khi Cờ caro có luật; công cụ không cho bỏ scenario trong khối MODIFIED.
**Migration**: Thay bằng requirement "Game chơi được và game sắp có trên menu" với cùng nội dung, scenario mô tả menu có Tic-tac-toe và Cờ caro.
