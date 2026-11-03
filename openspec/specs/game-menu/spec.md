# game-menu Specification

## Purpose

Menu chọn game ở trang chủ: cho người chơi thấy những game có thể chơi ngay, những game sắp có, thông tin cơ bản của từng game và lối quay lại ván đang dở.

## Requirements

### Requirement: Thông tin trên thẻ game

Mỗi thẻ SHALL hiện tên game, số người chơi (một số nếu cố định, khoảng nếu thay đổi) và thời lượng ước tính, bằng ngôn ngữ đang dùng.

#### Scenario: Thẻ của game có số người thay đổi

- **WHEN** menu hiện bằng tiếng Việt thẻ Cờ cá ngựa (2–4 người, khoảng 20 phút)
- **THEN** thẻ ghi "2–4 người" và "~20 phút"

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

- **WHEN** người chơi bấm vào thẻ Cờ vua đang "Sắp có"
- **THEN** không có gì được mở

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

### Requirement: Vào phòng bằng mã

Menu SHALL có ô "Vào phòng" để nhập mã phòng online. Mã đúng định dạng (6 ký tự, không phân biệt chữ hoa chữ thường, bỏ khoảng trắng hai đầu) SHALL mở trang phòng của mã đó. Mã sai định dạng MUST bị báo lỗi ngay tại ô nhập, ô nhập SHALL nhận lại focus để trình đọc màn hình đọc lời báo, và người chơi MUST ở lại menu. Ô "Vào phòng" SHALL nằm trong một mục riêng của menu có tiêu đề.

#### Scenario: Nhập mã phòng

- **WHEN** người chơi nhập `abc234` kèm khoảng trắng ở hai đầu vào ô "Vào phòng" trên menu và xác nhận
- **THEN** trang phòng `/room/ABC234` mở ra

#### Scenario: Mã sai định dạng

- **WHEN** người chơi nhập `12` vào ô "Vào phòng" và xác nhận
- **THEN** menu báo mã phòng không hợp lệ ngay tại ô, ô mã phòng có focus và người chơi vẫn ở menu

### Requirement: Game chơi được và game sắp có trên menu

Menu SHALL hiện mọi game đã có luật trong app dưới dạng chơi được, và mọi game đã lên kế hoạch cho MVP nhưng chưa có luật dưới dạng "Sắp có". Game chơi được SHALL đứng trước game "Sắp có". Một game MUST NOT hiện hai lần: khi game dự kiến được thêm luật, thẻ "Sắp có" của nó được thay bằng thẻ chơi được.

#### Scenario: Menu khi có Tic-tac-toe và Cờ caro

- **WHEN** người chơi mở trang chủ
- **THEN** thẻ Tic-tac-toe và thẻ Cờ caro chơi được đứng trước mọi thẻ "Sắp có"
- **AND** thẻ Cờ cá ngựa cũng chơi được, chỉ Cờ vua hiện nhãn "Sắp có"

#### Scenario: Game dự kiến đã có luật không bị lặp

- **WHEN** một game trong danh sách dự kiến đã được thêm luật vào app
- **THEN** menu chỉ có một thẻ cho game đó và thẻ ấy chơi được

#### Scenario: Thẻ Cờ caro

- **WHEN** menu hiện bằng tiếng Việt thẻ Cờ caro
- **THEN** thẻ ghi "2 người" và "~10 phút", có hai lối vào "Chơi" và "Online", và không có nhãn "Sắp có"

#### Scenario: Thẻ Cờ cá ngựa

- **WHEN** menu hiện bằng tiếng Việt thẻ Cờ cá ngựa
- **THEN** thẻ ghi "2–4 người" và "~20 phút", có hai lối vào "Chơi" và "Online", và không có nhãn "Sắp có"

### Requirement: Tuỳ chọn luật trong mục tiếp tục ván dở

Với game có tuỳ chọn luật cho chọn, mỗi mục của "Tiếp tục ván dở" trên menu SHALL ghi kèm tuỳ chọn luật của ván sau tên game và chế độ, theo cùng cách ghi với màn hình chơi. Game không có tuỳ chọn luật MUST giữ cách ghi cũ.

#### Scenario: Ván dở Cờ caro trên menu

- **WHEN** người chơi có một ván Cờ caro 19×19 luật "tự do" đấu với máy mức Khó đang dở và quay về menu
- **THEN** mục "Tiếp tục ván dở" có "Cờ caro · Với máy · Khó · 19×19 · Tự do"

#### Scenario: Tic-tac-toe giữ cách ghi cũ

- **WHEN** người chơi có một ván Tic-tac-toe cùng máy đang dở và quay về menu
- **THEN** mục "Tiếp tục ván dở" có "Tic-tac-toe · Cùng máy"
