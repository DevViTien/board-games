# game-menu Specification

## Purpose

Menu chọn game ở trang chủ: cho người chơi thấy những game có thể chơi ngay, những game sắp có, thông tin cơ bản của từng game và lối quay lại ván đang dở.

## Requirements

### Requirement: Game hiện trên menu

Menu SHALL hiện mọi game đã có luật trong app dưới dạng chơi được, và mọi game đã lên kế hoạch cho MVP nhưng chưa có luật dưới dạng "Sắp có". Game chơi được SHALL đứng trước game "Sắp có". Một game MUST NOT hiện hai lần: khi game dự kiến được thêm luật, thẻ "Sắp có" của nó được thay bằng thẻ chơi được.

#### Scenario: Menu khi mới có Tic-tac-toe

- **WHEN** người chơi mở trang chủ
- **THEN** thẻ Tic-tac-toe chơi được đứng đầu
- **AND** Cờ caro, Cờ cá ngựa, Cờ vua hiện nhãn "Sắp có"

#### Scenario: Game dự kiến đã có luật không bị lặp

- **WHEN** một game trong danh sách dự kiến đã được thêm luật vào app
- **THEN** menu chỉ có một thẻ cho game đó và thẻ ấy chơi được

### Requirement: Thông tin trên thẻ game

Mỗi thẻ SHALL hiện tên game, số người chơi (một số nếu cố định, khoảng nếu thay đổi) và thời lượng ước tính, bằng ngôn ngữ đang dùng.

#### Scenario: Thẻ của game có số người thay đổi

- **WHEN** menu hiện bằng tiếng Việt thẻ Cờ cá ngựa (2–4 người, khoảng 20 phút)
- **THEN** thẻ ghi "2–4 người" và "~20 phút"

### Requirement: Vào chơi từ menu

Chọn một thẻ chơi được SHALL mở màn hình chơi của game đó. Thẻ "Sắp có" MUST NOT mở được và MUST NOT nhận tiêu điểm bàn phím như một liên kết.

#### Scenario: Mở game chơi được

- **WHEN** người chơi chọn thẻ Tic-tac-toe
- **THEN** màn hình chơi Tic-tac-toe mở ra

#### Scenario: Thẻ sắp có không mở được

- **WHEN** người chơi bấm vào thẻ Cờ vua đang "Sắp có"
- **THEN** không có gì được mở

### Requirement: Lối tiếp tục ván dở

Khi trình duyệt đang giữ một ván dở của một game, thẻ của game đó SHALL ghi lối vào là "Tiếp tục" thay vì "Chơi", và chọn lối đó SHALL mở đúng ván dở.

#### Scenario: Có ván dở

- **WHEN** người chơi có một ván Tic-tac-toe đang dở và quay về menu
- **THEN** thẻ Tic-tac-toe ghi "Tiếp tục"
- **AND** chọn thẻ mở lại đúng ván đó

#### Scenario: Không có ván dở

- **WHEN** người chơi chưa có ván Tic-tac-toe nào đang dở
- **THEN** thẻ Tic-tac-toe ghi "Chơi"
