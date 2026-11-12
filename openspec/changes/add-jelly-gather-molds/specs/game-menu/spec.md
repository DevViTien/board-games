# Spec Delta

## MODIFIED Requirements

### Requirement: Thẻ trò giải đố trên menu

Menu SHALL hiện mỗi trò giải đố đang có bằng một thẻ trong danh sách game, sau các game chơi được và trước thẻ "Sắp có". Thẻ có hình minh hoạ, tên, một câu mô tả, "1 người", số màn (không có thời lượng), và một lối vào "Chơi" mở danh sách màn của trò đó, được mô tả bằng tên trò cho trình đọc màn hình. Thẻ MUST NOT có lối "Online". Các thẻ SHALL sinh từ một danh sách đăng ký.

#### Scenario: Thẻ Gom thạch

- **WHEN** menu hiện bằng tiếng Việt
- **THEN** có thẻ "Gom thạch" ghi "1 người" và "40 màn", có lối "Chơi" và không có lối "Online"

#### Scenario: Mở trò giải đố từ menu

- **WHEN** người chơi chọn "Chơi" trên thẻ Gom thạch
- **THEN** danh sách màn `/puzzles/jelly-gather` mở ra

#### Scenario: Trò giải đố mới

- **WHEN** danh sách đăng ký có thêm một trò giải đố thử nghiệm kèm hình và bản dịch
- **THEN** menu hiện thêm một thẻ cho trò đó mà không phải sửa component của menu

### Requirement: Giấy phép bên thứ ba

Chân trang của menu SHALL có liên kết "Giấy phép bên thứ ba" mở danh sách phần mềm, hình và màn chơi của bên thứ ba đi kèm app cùng giấy phép của chúng (`/third-party-licenses.txt`), bằng chữ của ngôn ngữ đang dùng.

#### Scenario: Mở danh sách giấy phép

- **WHEN** người chơi chọn "Giấy phép bên thứ ba" ở chân trang menu
- **THEN** trang `/third-party-licenses.txt` mở ra, có giấy phép của chess.js, ghi công bộ quân "staunty", và ghi công cùng giấy phép Apache 2.0 của các màn Boxoban
