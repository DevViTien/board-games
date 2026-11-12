# Spec Delta

## MODIFIED Requirements

### Requirement: Thông tin trên thẻ game

Mỗi thẻ game SHALL hiện tên game, số người chơi (một số nếu cố định, khoảng nếu thay đổi) và thời lượng ước tính, bằng ngôn ngữ đang dùng. Thẻ trò giải đố theo requirement "Thẻ trò giải đố trên menu".

#### Scenario: Thẻ của game có số người thay đổi

- **WHEN** menu hiện bằng tiếng Việt thẻ Cờ cá ngựa (2–4 người, khoảng 20 phút)
- **THEN** thẻ ghi "2–4 người" và "~20 phút"

### Requirement: Vào chơi từ menu

Thẻ game chơi được SHALL có hai lối vào: "Chơi" mở màn hình bắt đầu ván của game đó, nơi người chơi chọn chế độ trước khi vào bàn cờ; "Online" mở cùng màn hình đó với chế độ "Online" được chọn sẵn. Mỗi lối vào SHALL được mô tả bằng tên game cho trình đọc màn hình. Thẻ "Sắp có" MUST NOT mở được và MUST NOT nhận tiêu điểm bàn phím như một liên kết.

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

## ADDED Requirements

### Requirement: Thẻ trò giải đố trên menu

Menu SHALL hiện mỗi trò giải đố đang có bằng một thẻ trong danh sách game, sau các game chơi được và trước thẻ "Sắp có". Thẻ có hình minh hoạ, tên, một câu mô tả, "1 người", số màn (không có thời lượng), và một lối vào "Chơi" mở danh sách màn của trò đó, được mô tả bằng tên trò cho trình đọc màn hình. Thẻ MUST NOT có lối "Online". Các thẻ SHALL sinh từ một danh sách đăng ký.

#### Scenario: Thẻ Gom thạch

- **WHEN** menu hiện bằng tiếng Việt
- **THEN** có thẻ "Gom thạch" ghi "1 người" và "24 màn", có lối "Chơi" và không có lối "Online"

#### Scenario: Mở trò giải đố từ menu

- **WHEN** người chơi chọn "Chơi" trên thẻ Gom thạch
- **THEN** danh sách màn `/puzzles/jelly-gather` mở ra

#### Scenario: Trò giải đố mới

- **WHEN** danh sách đăng ký có thêm một trò giải đố thử nghiệm kèm hình và bản dịch
- **THEN** menu hiện thêm một thẻ cho trò đó mà không phải sửa component của menu
