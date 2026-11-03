## Purpose

Cờ vua cho hai người (Trắng và Đen) theo luật FIDE: nước đi hợp lệ, nhập thành, bắt tốt qua đường, phong cấp, chiếu hết, hết nước đi, đòi hoà khi lặp lại ba lần hoặc sau 50 nước, hoà tự động khi lặp lại năm lần, sau 75 nước hoặc khi không đủ quân, ký hiệu nước đi.

## ADDED Requirements

### Requirement: Bàn và người chơi

Cờ vua SHALL có đúng 2 người: người thứ nhất cầm Trắng và đi trước, người thứ hai cầm Đen. Ván mới SHALL bắt đầu từ thế cờ chuẩn. Game SHALL khai báo thể loại `classic`, thời lượng ước tính 20 phút, không hỗ trợ đấu với máy và không có tuỳ chọn luật: tuỳ chọn khác `{}` MUST bị từ chối với mã `invalid-options`.

#### Scenario: Ván mới

- **WHEN** tạo một ván Cờ vua
- **THEN** mỗi bên có 16 quân ở vị trí chuẩn, đến lượt Trắng và Trắng có đúng 20 nước hợp lệ

#### Scenario: Không có máy

- **WHEN** app đọc thông tin khai báo của Cờ vua
- **THEN** game thuộc thể loại `classic`, ước tính 20 phút và không hỗ trợ đấu với máy

#### Scenario: Không có tuỳ chọn luật

- **WHEN** tạo một ván Cờ vua với tuỳ chọn `{ "variant": "chess960" }`
- **THEN** việc tạo ván bị từ chối với mã `invalid-options`

### Requirement: Nước đi hợp lệ

Một nước đi quân SHALL gồm ô đi, ô đến và, chỉ với nước phong cấp, quân được phong; nước còn lại duy nhất là đòi hoà (yêu cầu "Đòi hoà"). Chỉ nước theo đúng cách đi của quân và không để vua bên mình bị chiếu SHALL hợp lệ; nước khác, kể cả dữ liệu không đúng dạng, MUST bị từ chối với mã `illegal-move` và ván không đổi. Hai bên đi luân phiên.

#### Scenario: Quân bị ghim không đi được

- **WHEN** Mã trắng ở e2 đứng giữa Vua trắng ở e1 và Xe đen ở e8 trên cột e
- **THEN** Mã e2 không có nước hợp lệ nào

#### Scenario: Nước sai cách đi bị từ chối

- **WHEN** ở thế mở đầu Trắng gửi nước Tốt e2 tới e5
- **THEN** nước bị từ chối với mã `illegal-move` và vẫn đến lượt Trắng

#### Scenario: Dữ liệu không đúng dạng bị từ chối

- **WHEN** ở thế mở đầu một client gửi nước `{ "from": "e2e", "to": "4" }`
- **THEN** nước bị từ chối với mã `illegal-move`

### Requirement: Nhập thành

Vua và một Xe chưa từng đi SHALL nhập thành được khi các ô giữa chúng trống, vua không đang bị chiếu, và ô vua đi qua lẫn ô vua đến không bị quân đối phương khống chế. Nhập thành SHALL là nước đi của vua hai ô về phía Xe; Xe nhảy sang ô bên kia vua. Vua đi thì mất cả hai quyền nhập thành, một Xe đi hoặc bị ăn thì mất quyền ở phía Xe đó.

#### Scenario: Nhập thành cánh vua

- **WHEN** Trắng có Vua e1, Xe h1, ô f1 và g1 trống, không ô nào bị khống chế, và Trắng đi Vua e1 tới g1
- **THEN** Vua ở g1, Xe ở f1 và Trắng mất cả hai quyền nhập thành

#### Scenario: Không nhập thành qua ô bị khống chế

- **WHEN** Tượng đen ở c4 khống chế ô f1 và Trắng muốn nhập thành cánh vua
- **THEN** Vua e1 tới g1 không phải nước hợp lệ

#### Scenario: Không nhập thành vào ô bị khống chế

- **WHEN** Tượng đen ở c5 khống chế ô g1 và Trắng muốn nhập thành cánh vua
- **THEN** Vua e1 tới g1 không phải nước hợp lệ

#### Scenario: Không nhập thành khi đang bị chiếu

- **WHEN** Xe đen ở e8 chiếu Vua trắng ở e1 và Xe h1 chưa đi
- **THEN** Vua e1 tới g1 không phải nước hợp lệ

#### Scenario: Còn quân ở giữa

- **WHEN** Mã trắng còn ở b1 và Trắng muốn nhập thành cánh hậu
- **THEN** Vua e1 tới c1 không phải nước hợp lệ

#### Scenario: Ô b1 bị khống chế không cản nhập thành cánh hậu

- **WHEN** Xe đen ở b8 khống chế ô b1, các ô b1, c1, d1 trống và Vua e1, Xe a1 chưa đi
- **THEN** Vua e1 tới c1 là nước hợp lệ

#### Scenario: Xe đã đi thì mất quyền phía đó

- **WHEN** Xe h1 đi tới h2 rồi quay về h1
- **THEN** Trắng không còn nhập thành cánh vua được nhưng vẫn nhập thành cánh hậu được nếu đủ điều kiện

### Requirement: Bắt tốt qua đường

Khi một Tốt vừa đi hai ô từ hàng xuất phát và dừng ngay cạnh Tốt đối phương trên cùng hàng, Tốt đối phương SHALL bắt được nó bằng cách đi chéo tới ô Tốt kia vừa đi qua, nhưng chỉ ở ngay nước kế tiếp; Tốt bị bắt rời bàn. Nước bắt này MUST NOT hợp lệ nếu nó để vua bên bắt bị chiếu.

#### Scenario: Bắt ngay sau khi tốt đi hai ô

- **WHEN** sau 1. e4 a6 2. e5 d5, đến lượt Trắng
- **THEN** Tốt e5 tới d6 là nước hợp lệ, và sau nước đó ô d5 trống

#### Scenario: Hết quyền bắt nếu không bắt ngay

- **WHEN** sau 1. e4 a6 2. e5 d5 3. Mf3 a5, đến lượt Trắng
- **THEN** Tốt e5 tới d6 không phải nước hợp lệ

#### Scenario: Bắt qua đường làm lộ vua

- **WHEN** Vua trắng a5, Tốt trắng e5, Tốt đen vừa đi d7 tới d5 và Xe đen ở h5 trên cùng hàng
- **THEN** Tốt e5 tới d6 không phải nước hợp lệ

### Requirement: Phong cấp

Tốt đi tới hàng cuối SHALL được phong thành Hậu, Xe, Tượng hoặc Mã cùng màu, do người đi chọn; mỗi lựa chọn là một nước hợp lệ riêng, kể cả khi Tốt ăn quân lúc lên hàng cuối. Nước đưa Tốt tới hàng cuối mà không nêu quân phong, hoặc nêu quân khác bốn quân đó, MUST bị từ chối với mã `illegal-move`.

#### Scenario: Bốn lựa chọn phong cấp

- **WHEN** Tốt trắng ở e7, ô e8 trống và đến lượt Trắng
- **THEN** có đúng bốn nước hợp lệ từ e7 tới e8: phong Hậu, Xe, Tượng và Mã

#### Scenario: Phong thành Mã

- **WHEN** Trắng đi Tốt e7 tới e8 và chọn Mã
- **THEN** ô e8 có Mã trắng và ô e7 trống

#### Scenario: Thiếu quân phong cấp

- **WHEN** Trắng gửi nước Tốt e7 tới e8 không kèm quân phong
- **THEN** nước bị từ chối với mã `illegal-move`

#### Scenario: Phong cấp thành Vua bị từ chối

- **WHEN** Trắng gửi nước Tốt e7 tới e8 kèm quân phong là Vua
- **THEN** nước bị từ chối với mã `illegal-move`

### Requirement: Chiếu hết

Khi bên đến lượt đang bị chiếu và không có nước hợp lệ nào, ván SHALL kết thúc: bên kia thắng với lý do `checkmate`. Bên bị chiếu mà còn nước thoát chiếu SHALL tiếp tục chơi.

#### Scenario: Chiếu hết sau bốn nửa nước

- **WHEN** sau 1. f3 e5 2. g4 Hậu đen tới h4
- **THEN** ván kết thúc, Đen thắng với lý do `checkmate` và không còn nước hợp lệ nào

#### Scenario: Bị chiếu vẫn còn nước thoát

- **WHEN** Tượng đen ở b4 chiếu Vua trắng ở e1 và Trắng chặn được bằng Mã b1 tới c3 hoặc d2
- **THEN** ván chưa kết thúc và các nước hợp lệ của Trắng đều thoát được chiếu

### Requirement: Hết nước đi

Khi bên đến lượt không bị chiếu nhưng không có nước hợp lệ nào, ván SHALL kết thúc hoà với lý do `stalemate`.

#### Scenario: Vua đen bị vây

- **WHEN** Vua đen ở h8, Hậu trắng ở f7, Vua trắng ở g6, đến lượt Đen và Đen không còn quân nào khác
- **THEN** ván kết thúc hoà với lý do `stalemate`

### Requirement: Đòi hoà

Lặp lại ba lần và luật 50 nước MUST NOT tự kết thúc ván. Khi thế hiện tại đã xuất hiện ít nhất ba lần, hoặc đã có ít nhất 50 nước mỗi bên liên tiếp không đi Tốt và không ăn quân, bên đến lượt SHALL có thêm một nước hợp lệ là đòi hoà (`{ "type": "claim-draw" }`), không cần đối phương đồng ý; nước đó kết thúc ván hoà với lý do `threefold-claim` hoặc `fifty-move-claim`. Khi không đủ điều kiện, nước đòi hoà MUST bị từ chối với mã `illegal-move`.

#### Scenario: Lặp lại ba lần chưa tự kết thúc

- **WHEN** từ thế mở đầu hai bên đi 1. Mf3 Mf6 2. Mg1 Mg8 3. Mf3 Mf6 4. Mg1 Mg8
- **THEN** ván chưa kết thúc và Trắng có nước đòi hoà bên cạnh các nước đi quân

#### Scenario: Đòi hoà khi lặp lại ba lần

- **WHEN** sau 1. Mf3 Mf6 2. Mg1 Mg8 3. Mf3 Mf6 4. Mg1 Mg8 Trắng đòi hoà
- **THEN** ván kết thúc hoà với lý do `threefold-claim`

#### Scenario: Chưa đủ điều kiện thì không đòi hoà được

- **WHEN** sau 1. Mf3 Mf6 2. Mg1 Mg8 Trắng gửi nước đòi hoà
- **THEN** nước bị từ chối với mã `illegal-move` và ván không đổi

#### Scenario: Khác quyền nhập thành thì không phải cùng thế

- **WHEN** sau 1. e4 e5 hai bên đưa vua đi rồi về hai lần: 2. Ve2 Ve7 3. Ve1 Ve8 4. Ve2 Ve7 5. Ve1 Ve8
- **THEN** Trắng không có nước đòi hoà, dù vị trí các quân đã ba lần giống sau 1. e4 e5

#### Scenario: Đòi hoà theo luật 50 nước

- **WHEN** đã có 100 nửa nước liên tiếp không đi Tốt, không ăn quân, và đến lượt Đen
- **THEN** ván chưa kết thúc, Đen có nước đòi hoà, và đòi hoà kết thúc ván hoà với lý do `fifty-move-claim`

#### Scenario: Đi tiếp thay vì đòi hoà

- **WHEN** Trắng có quyền đòi hoà vì lặp lại ba lần nhưng đi Tốt e2 tới e4
- **THEN** ván tiếp tục, đến lượt Đen và Đen không có nước đòi hoà

### Requirement: Hoà tự động khi lặp lại năm lần hoặc sau 75 nước

Khi cùng một thế xuất hiện lần thứ năm, ván SHALL tự động kết thúc hoà với lý do `fivefold-repetition`; khi đã có 75 nước mỗi bên liên tiếp không đi Tốt và không ăn quân, ván SHALL tự động kết thúc hoà với lý do `seventy-five-move`. Hai thế chỉ là một khi giống nhau về vị trí mọi quân, bên đến lượt, quyền nhập thành và quyền bắt tốt qua đường đang dùng được. Nếu nước đạt điều kiện đó chiếu hết thì ván MUST kết thúc với lý do `checkmate`.

#### Scenario: Lặp lại năm lần

- **WHEN** từ thế mở đầu hai bên lặp 1. Mf3 Mf6 2. Mg1 Mg8 bốn lần liền mà không ai đòi hoà
- **THEN** ván kết thúc hoà với lý do `fivefold-repetition`

#### Scenario: Bảy mươi lăm nước

- **WHEN** đã có 149 nửa nước liên tiếp không đi Tốt, không ăn quân, và Trắng đi Xe a1 tới a2
- **THEN** ván kết thúc hoà với lý do `seventy-five-move`

#### Scenario: Ăn quân đặt lại bộ đếm

- **WHEN** đã có 149 nửa nước liên tiếp không đi Tốt, không ăn quân, và Xe trắng ăn một Mã đen trong khi Đen vẫn còn một Tốt
- **THEN** ván chưa kết thúc, không bên nào đòi hoà được theo luật 50 nước và bộ đếm bắt đầu lại từ nước đó

#### Scenario: Chiếu hết ở nước thứ bảy mươi lăm

- **WHEN** đã có 149 nửa nước liên tiếp không đi Tốt, không ăn quân, và Trắng đi Xe h1 tới h8 chiếu hết Vua đen ở a8
- **THEN** ván kết thúc, Trắng thắng với lý do `checkmate`

### Requirement: Không đủ quân để chiếu hết

Khi trên bàn chỉ còn hai Vua, hoặc hai Vua và một Tượng hay một Mã, hoặc hai Vua và các Tượng cùng nằm trên ô một màu, ván SHALL tự động kết thúc hoà với lý do `insufficient-material`. Còn Tốt, Xe, Hậu, hai Mã, hay hai Tượng khác màu ô thì ván MUST tiếp tục.

#### Scenario: Chỉ còn hai vua

- **WHEN** Vua trắng ăn quân cuối cùng của Đen ngoài Vua đen và Trắng chỉ còn Vua
- **THEN** ván kết thúc hoà với lý do `insufficient-material`

#### Scenario: Hai Tượng cùng màu ô

- **WHEN** trên bàn chỉ còn hai Vua, Tượng trắng ở e2 và Tượng đen ở c4
- **THEN** ván kết thúc hoà với lý do `insufficient-material`

#### Scenario: Hai Mã vẫn chơi tiếp

- **WHEN** trên bàn chỉ còn hai Vua và hai Mã trắng
- **THEN** ván chưa kết thúc

### Requirement: Ký hiệu nước đi

Ván SHALL ghi lại mọi nước đã đi theo ký hiệu đại số chuẩn (SAN, chữ quân tiếng Anh K, Q, R, B, N làm mã), theo thứ tự, để app hiện sổ ghi và dịch ra lời. Ký hiệu SHALL có dấu ăn quân `x`, nhập thành `O-O`/`O-O-O`, phong cấp `=Q`, chiếu `+`, chiếu hết `#`, và chỉ thêm ô đi khi cần để phân biệt hai quân.

#### Scenario: Sổ ghi của một ván ngắn

- **WHEN** sau 1. f3 e5 2. g4 Hậu đen tới h4
- **THEN** ván ghi bốn nước `f3`, `e5`, `g4`, `Qh4#`

#### Scenario: Phong cấp có chiếu

- **WHEN** Vua trắng ở e1, Vua đen ở a8, và Tốt trắng ở e7 phong thành Hậu ở e8
- **THEN** nước đó được ghi là `e8=Q+`

#### Scenario: Hai Mã cùng tới một ô

- **WHEN** Mã trắng ở b1 và Mã trắng ở f3 đều tới được d2 và Trắng đi Mã b1 tới d2
- **THEN** nước đó được ghi là `Nbd2`

### Requirement: Số nước đi ở các thế cờ chuẩn

Số chuỗi nước hợp lệ (perft) đếm qua chính luật của game SHALL đúng với số đã công bố của các thế cờ chuẩn: thế mở đầu, "Kiwipete" và các thế 3–6 của bộ thế perft chuẩn, ở độ sâu được kiểm.

#### Scenario: Thế mở đầu

- **WHEN** đếm từ thế mở đầu tới độ sâu 1, 2, 3 và 4
- **THEN** được lần lượt 20, 400, 8 902 và 197 281

#### Scenario: Kiwipete

- **WHEN** đếm từ thế "Kiwipete" tới độ sâu 1, 2 và 3
- **THEN** được lần lượt 48, 2 039 và 97 862

#### Scenario: Thế tàn cuộc có bắt tốt qua đường

- **WHEN** đếm từ thế perft chuẩn số 3 tới độ sâu 4
- **THEN** được 43 238

#### Scenario: Thế có phong cấp và nhập thành

- **WHEN** đếm từ thế perft chuẩn số 4, số 5 và số 6 tới độ sâu 3
- **THEN** được lần lượt 9 467, 62 379 và 89 890

### Requirement: Ván Cờ vua luôn kết thúc

Mọi ván Cờ vua SHALL kết thúc sau hữu hạn nước nhờ luật 75 nước, lặp lại năm lần và không đủ quân. Biên bản một ván, kể cả có nhập thành, bắt tốt qua đường, phong cấp và đòi hoà, SHALL dựng lại đúng thế cờ và đúng kết quả.

#### Scenario: Ván ngẫu nhiên kết thúc

- **WHEN** chơi nhiều ván với mọi nước chọn ngẫu nhiên theo các seed cố định
- **THEN** mọi ván kết thúc với một trong các lý do `checkmate`, `stalemate`, `insufficient-material`, `threefold-claim`, `fifty-move-claim`, `fivefold-repetition`, `seventy-five-move`

#### Scenario: Dựng lại ván từ biên bản

- **WHEN** một ván có nhập thành, bắt tốt qua đường, phong cấp và kết thúc bằng đòi hoà được lưu thành biên bản rồi dựng lại
- **THEN** thế cờ, sổ ghi, lượt đi và kết quả giống hệt ván gốc
