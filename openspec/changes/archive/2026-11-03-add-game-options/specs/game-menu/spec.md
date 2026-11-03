## ADDED Requirements

### Requirement: Tuỳ chọn luật trong mục tiếp tục ván dở

Với game có tuỳ chọn luật cho chọn, mỗi mục của "Tiếp tục ván dở" trên menu SHALL ghi kèm tuỳ chọn luật của ván sau tên game và chế độ, theo cùng cách ghi với màn hình chơi. Game không có tuỳ chọn luật MUST giữ cách ghi cũ.

#### Scenario: Ván dở Cờ caro trên menu

- **WHEN** người chơi có một ván Cờ caro 19×19 luật "tự do" đấu với máy mức Khó đang dở và quay về menu
- **THEN** mục "Tiếp tục ván dở" có "Cờ caro · Với máy · Khó · 19×19 · Tự do"

#### Scenario: Tic-tac-toe giữ cách ghi cũ

- **WHEN** người chơi có một ván Tic-tac-toe cùng máy đang dở và quay về menu
- **THEN** mục "Tiếp tục ván dở" có "Tic-tac-toe · Cùng máy"
