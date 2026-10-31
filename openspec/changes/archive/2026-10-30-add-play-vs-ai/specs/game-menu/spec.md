# Spec Delta

## MODIFIED Requirements

### Requirement: Vào chơi từ menu

Chọn một thẻ chơi được SHALL mở màn hình bắt đầu ván của game đó, nơi người chơi chọn chế độ trước khi vào bàn cờ. Lối vào trên thẻ luôn ghi "Chơi". Thẻ "Sắp có" MUST NOT mở được và MUST NOT nhận tiêu điểm bàn phím như một liên kết.

#### Scenario: Mở game chơi được

- **WHEN** người chơi chọn "Chơi" trên thẻ Tic-tac-toe
- **THEN** màn hình bắt đầu ván Tic-tac-toe mở ra

#### Scenario: Thẻ sắp có không mở được

- **WHEN** người chơi bấm vào thẻ Cờ vua đang "Sắp có"
- **THEN** không có gì được mở

## REMOVED Requirements

### Requirement: Lối tiếp tục ván dở

**Reason**: Mỗi game giờ có thể có hai ván dở (cùng máy và đấu với máy, idea.md §9 quyết định 11), nên một nhãn "Tiếp tục" trên thẻ không còn chỉ đúng được một ván.
**Migration**: Thay bằng requirement "Mục tiếp tục ván dở trên menu" (liệt kê theo game × chế độ); thẻ luôn ghi "Chơi" và mở màn hình bắt đầu ván, nơi cũng liệt kê ván dở của game đó (capability `game-setup`).

## ADDED Requirements

### Requirement: Mục tiếp tục ván dở trên menu

Khi trình duyệt đang giữ ván dở (với ván đấu với máy: theo requirement "Ván dở khi đấu với máy" của capability `play-vs-ai`), menu SHALL có mục "Tiếp tục ván dở" liệt kê từng ván theo game và chế độ, mỗi mục ghi tên game và chế độ (ván đấu với máy kèm mức độ, ví dụ "Tic-tac-toe · Với máy · Khó"), ván lưu gần nhất đứng đầu. Chọn một mục SHALL mở thẳng đúng ván đó. Khi không có ván dở nào, mục này MUST không hiện.

#### Scenario: Có ván dở ở hai chế độ

- **WHEN** người chơi có một ván Tic-tac-toe cùng máy và một ván Tic-tac-toe đấu với máy mức Khó đang dở, và quay về menu
- **THEN** mục "Tiếp tục ván dở" có hai mục "Tic-tac-toe · Cùng máy" và "Tic-tac-toe · Với máy · Khó"
- **AND** chọn mục "Tic-tac-toe · Với máy · Khó" mở lại đúng ván đấu với máy đó

#### Scenario: Ván lưu gần nhất đứng đầu

- **WHEN** người chơi đi một nước trong ván cùng máy rồi sau đó đi một nước trong ván đấu với máy, và quay về menu
- **THEN** mục ván đấu với máy đứng trước mục ván cùng máy

#### Scenario: Không có ván dở

- **WHEN** người chơi chưa có ván dở nào
- **THEN** menu không có mục "Tiếp tục ván dở"
- **AND** thẻ Tic-tac-toe ghi "Chơi"
