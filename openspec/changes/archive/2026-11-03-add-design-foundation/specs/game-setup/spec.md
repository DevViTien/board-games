## ADDED Requirements

### Requirement: Chế độ chọn sẵn từ đường dẫn

Đường dẫn `/play/<mã game>?mode=<chế độ>` SHALL mở màn hình bắt đầu ván với chế độ đó được chọn, thay cho chế độ mặc định hay chế độ đã nhớ; các lựa chọn khác (mức độ, người đi trước, số người chơi, tuỳ chọn luật) SHALL vẫn lấy theo lựa chọn đã nhớ. Chế độ game không có hoặc giá trị không hợp lệ MUST bị bỏ qua mà không báo lỗi. Chế độ chọn sẵn MUST NOT được nhớ cho tới khi người chơi bấm "Bắt đầu" hoặc tạo phòng.

#### Scenario: Chọn sẵn Online thay cho lựa chọn đã nhớ

- **WHEN** trình duyệt nhớ lựa chọn Cờ cá ngựa "Đấu với máy" 4 người và người chơi mở `/play/ludo?mode=online`
- **THEN** chế độ "Online" được chọn, "4 người" được chọn và nút chính là "Tạo phòng"

#### Scenario: Chế độ không hợp lệ

- **WHEN** người chơi mở `/play/tictactoe?mode=khong-co`
- **THEN** màn hình bắt đầu ván hiện lựa chọn đã nhớ hoặc mặc định, không có thông báo lỗi

#### Scenario: Chọn sẵn chưa được nhớ

- **WHEN** trình duyệt nhớ lựa chọn Tic-tac-toe "Cùng máy", người chơi mở `/play/tictactoe?mode=online` rồi rời đi không tạo phòng, sau đó mở `/play/tictactoe`
- **THEN** chế độ "Cùng máy" được chọn
