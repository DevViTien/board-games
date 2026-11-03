## ADDED Requirements

### Requirement: Bàn Tic-tac-toe hiển thị hàng thắng

Khi ván có người thắng, bàn Tic-tac-toe SHALL làm nổi bật ba ô của hàng thắng không chỉ bằng màu, vẽ một nét qua hàng đó, và mô tả mỗi ô đó là thuộc hàng thắng cho trình đọc màn hình. Thẻ kết quả SHALL có dòng giải thích hàng thắng nằm ở đâu (hàng, cột hoặc đường chéo). Khi hệ thống bật giảm chuyển động, nét SHALL hiện đủ ngay, không vẽ dần.

#### Scenario: Thắng theo hàng ngang

- **WHEN** X thắng bằng ba quân ở hàng trên cùng
- **THEN** ba ô của hàng 1 được làm nổi bật, có nét qua hàng đó, và mỗi ô được mô tả là thuộc hàng thắng
- **AND** thẻ kết quả ghi "Ba X thẳng hàng ở hàng 1"

#### Scenario: Thắng theo đường chéo

- **WHEN** O thắng bằng ba quân trên đường chéo từ góc trên phải xuống góc dưới trái
- **THEN** ba ô đó được làm nổi bật và thẻ kết quả ghi O thẳng hàng ở đường chéo phụ
