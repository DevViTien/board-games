## ADDED Requirements

### Requirement: Giấy phép bên thứ ba

Chân trang của menu SHALL có liên kết "Giấy phép bên thứ ba" mở danh sách phần mềm và hình của bên thứ ba đi kèm app cùng giấy phép của chúng (`/third-party-licenses.txt`), bằng chữ của ngôn ngữ đang dùng.

#### Scenario: Mở danh sách giấy phép

- **WHEN** người chơi chọn "Giấy phép bên thứ ba" ở chân trang menu
- **THEN** trang `/third-party-licenses.txt` mở ra, có giấy phép của chess.js và ghi công bộ quân "staunty"
