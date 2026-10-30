# tictactoe Specification

## Purpose

Luật Tic-tac-toe: game mẫu hai người trên bàn 3×3, dùng để kiểm chứng toàn bộ đường đi từ luật tới menu, màn hình chơi và lưu ván.

## Requirements

### Requirement: Bàn và người chơi

Tic-tac-toe SHALL có đúng 2 người chơi, bàn 3×3 ô ban đầu đều trống. Người thứ nhất dùng quân X và đi trước, người thứ hai dùng quân O. Game SHALL khai báo thể loại `classic`, thời lượng ước tính 2 phút, và không hỗ trợ đấu với máy ở thời điểm này.

#### Scenario: Ván mới

- **WHEN** tạo một ván Tic-tac-toe
- **THEN** cả 9 ô đều trống và người đến lượt là X

### Requirement: Đặt quân

Người đang đến lượt SHALL đặt một quân của mình vào một ô trống; sau đó lượt chuyển cho người kia. Đặt vào ô đã có quân MUST bị từ chối như một nước đi không hợp lệ.

#### Scenario: Lượt luân phiên

- **WHEN** X đặt quân vào ô giữa
- **THEN** ô giữa có quân X và người đến lượt là O

#### Scenario: Không đặt vào ô đã có quân

- **WHEN** O đặt quân vào ô giữa đã có quân X
- **THEN** nước đi bị từ chối là không hợp lệ và bàn không đổi

### Requirement: Thắng

Người chơi SHALL thắng khi có ba quân của mình thẳng hàng theo một trong tám đường: ba hàng ngang, ba cột dọc hoặc hai đường chéo. Ván kết thúc ngay khi có người thắng, kể cả khi nước thắng lấp ô cuối cùng của bàn.

#### Scenario: Thắng theo hàng ngang

- **WHEN** X có quân ở cả ba ô của hàng trên cùng
- **THEN** ván kết thúc và X thắng

#### Scenario: Thắng theo cột dọc

- **WHEN** O có quân ở cả ba ô của cột giữa
- **THEN** ván kết thúc và O thắng

#### Scenario: Thắng theo đường chéo chính

- **WHEN** X có quân ở ba ô của đường chéo từ góc trên trái xuống góc dưới phải
- **THEN** ván kết thúc và X thắng

#### Scenario: Thắng theo đường chéo phụ

- **WHEN** O có quân ở ba ô của đường chéo từ góc trên phải xuống góc dưới trái
- **THEN** ván kết thúc và O thắng

#### Scenario: Nước thứ chín tạo hàng là thắng, không phải hoà

- **WHEN** nước đi thứ chín của X lấp ô cuối cùng và tạo thành ba quân X thẳng hàng
- **THEN** ván kết thúc và X thắng, không phải hoà

### Requirement: Hoà

Khi cả 9 ô đã có quân mà không ai có ba quân thẳng hàng, ván SHALL kết thúc với kết quả hoà.

#### Scenario: Đầy bàn không ai thắng

- **WHEN** nước đi thứ chín lấp ô cuối cùng và không tạo thành ba quân thẳng hàng
- **THEN** ván kết thúc với kết quả hoà
