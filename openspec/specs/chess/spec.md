# chess Specification

## Purpose

Cờ vua cho hai người (Trắng và Đen) theo luật FIDE: nước đi hợp lệ, nhập thành, bắt tốt qua đường, phong cấp, chiếu hết, hết nước đi, đòi hoà khi lặp lại ba lần hoặc sau 50 nước, hoà tự động khi lặp lại năm lần, sau 75 nước hoặc khi không đủ quân, ký hiệu nước đi; bàn cờ trên màn hình (chọn và đi quân bằng chuột, chạm hoặc bàn phím, phong cấp, lật bàn, sổ ghi, thanh người chơi), chơi cùng máy và online.

## Requirements

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

### Requirement: Chế độ chơi Cờ vua

Cờ vua SHALL chơi được cùng máy tại `/play/chess/local` và online qua phòng. Màn hình bắt đầu ván Cờ vua SHALL chỉ có chế độ "Cùng máy" và "Online", không có mức độ hay người đi trước. Đường dẫn `/play/chess/ai` MUST hiện trang "không tìm thấy".

#### Scenario: Màn hình bắt đầu ván Cờ vua

- **WHEN** người chơi mở `/play/chess` lần đầu
- **THEN** chỉ có hai chế độ "Cùng máy" và "Online", "Cùng máy" được chọn, không có lựa chọn mức độ hay người đi trước

#### Scenario: Không có đấu với máy

- **WHEN** người chơi mở `/play/chess/ai`
- **THEN** trang "không tìm thấy" hiện ra kèm lối về menu

### Requirement: Bàn Cờ vua

Bàn SHALL có 8×8 ô xanh lá và kem, toạ độ nhỏ trong các ô sát mép (số hàng ở cột trái, chữ cột ở hàng dưới), và mọi quân; quân Trắng thân sáng, quân Đen thân tối, MUST phân biệt được bằng độ sáng và hình, mỗi loại quân một hình riêng. Mỗi ô SHALL có tên đọc được ("Mã trắng ở g1", "Ô e4 trống"). Trên thiết bị dùng chung Trắng ở dưới; online bên của người ở thiết bị này ở dưới.

#### Scenario: Thế mở đầu trên thiết bị dùng chung

- **WHEN** người chơi mở một ván Cờ vua cùng máy mới
- **THEN** ô a1 ở góc dưới bên trái, có tên "Xe trắng ở a1", và ô e4 có tên "Ô e4 trống"

#### Scenario: Cầm Đen khi chơi online

- **WHEN** người chơi cầm Đen trong một phòng Cờ vua
- **THEN** ô h8 ở góc dưới bên trái và các quân Đen ở hai hàng dưới cùng của bàn

#### Scenario: Toạ độ theo hướng bàn

- **WHEN** bàn hiện Đen ở phía dưới
- **THEN** chữ cột ở hàng dưới cùng đọc từ trái sang phải là h, g, f, e, d, c, b, a và số hàng ở cột trái đọc từ trên xuống là 1 tới 8

### Requirement: Thanh người chơi Cờ vua

Màn hình chơi Cờ vua SHALL có hai thanh người chơi, thanh của bên ở phía dưới bàn ngay dưới bàn và thanh của bên kia ngay trên bàn, đổi theo khi bàn lật. Mỗi thanh SHALL có hình Vua của màu, tên ghế ("Trắng", "Bạn · Đen", "Minh · Trắng"), loại ghế, "Đến lượt" khi tới lượt và, với bên đang hơn quân, các quân hơn và số điểm hơn (Tốt 1, Mã 3, Tượng 3, Xe 5, Hậu 9); hai bên bằng quân MUST NOT có dòng hơn quân.

#### Scenario: Ván mới

- **WHEN** người chơi mở một ván Cờ vua cùng máy mới
- **THEN** thanh "Đen" ở trên bàn, thanh "Trắng" ở dưới bàn ghi "Đến lượt", và không thanh nào có dòng hơn quân

#### Scenario: Hơn một Mã

- **WHEN** Trắng vừa ăn một Mã đen và chưa mất quân nào
- **THEN** thanh "Trắng" nêu một Mã và hơn 3 điểm, thanh "Đen" không có dòng hơn quân

#### Scenario: Thanh đổi chỗ khi lật bàn

- **WHEN** trong ván cùng máy người chơi bấm "Lật bàn"
- **THEN** thanh "Trắng" ở trên bàn và thanh "Đen" ở dưới bàn

### Requirement: Chọn quân và đi quân

Khi được đi, chọn một quân của bên đến lượt có nước hợp lệ SHALL đánh dấu ô đó là đang chọn và mọi ô tới được; ô ăn được quân, kể cả ô trống của nước bắt tốt qua đường, có dấu khác ô trống. Lựa chọn SHALL được báo cho trình đọc màn hình kèm các ô tới được; chọn quân không có nước đi SHALL báo quân đó không đi được. Chọn ô tới được SHALL đi nước đó; chọn quân khác cùng bên đổi lựa chọn; chọn ô khác hoặc Escape bỏ chọn. Bàn bị khoá MUST NOT chọn được quân.

#### Scenario: Chọn quân hiện nước đi

- **WHEN** ở thế mở đầu người chơi chọn Mã trắng ở g1
- **THEN** ô g1 được đánh dấu đang chọn, ô f3 và h3 được đánh dấu và mô tả là đi tới được, và trình đọc màn hình được báo "Đã chọn Mã g1: đi được f3, h3"

#### Scenario: Quân không có nước đi

- **WHEN** ở thế mở đầu người chơi chọn Xe trắng ở a1
- **THEN** không ô nào được chọn và trình đọc màn hình được báo "Xe a1 không có nước đi"

#### Scenario: Đi quân

- **WHEN** Mã g1 đang được chọn và người chơi chọn ô f3
- **THEN** Mã trắng ở f3, ô g1 trống, không còn ô nào được chọn và đến lượt Đen

#### Scenario: Ô ăn được quân

- **WHEN** sau 1. e4 d5 người chơi chọn Tốt trắng ở e4
- **THEN** ô d5 được mô tả là ăn được quân và có dấu khác ô e5 đi tới được

#### Scenario: Bắt tốt qua đường là ăn quân

- **WHEN** sau 1. e4 a6 2. e5 d5 người chơi chọn Tốt trắng ở e5
- **THEN** ô trống d6 được mô tả là ăn được quân và có dấu ăn quân, còn ô e6 có dấu đi tới được

#### Scenario: Đổi quân rồi bỏ chọn

- **WHEN** Mã g1 đang được chọn, người chơi chọn Mã b1 rồi nhấn Escape
- **THEN** sau lần chọn thứ hai các ô a3 và c3 được đánh dấu, sau Escape không còn ô nào được chọn hay đánh dấu tới được

#### Scenario: Quân đối phương không chọn được

- **WHEN** đến lượt Trắng và người chơi chọn một Tốt đen
- **THEN** không ô nào được chọn và ván không đổi

### Requirement: Giữ lựa chọn khi phòng cập nhật

Lựa chọn quân và bộ chọn quân phong cấp đang mở SHALL được giữ khi màn hình nhận lại cùng thế cờ (phòng online cập nhật vì việc khác, như đối thủ đổi tên hay nối lại). Khi thế cờ đổi, bàn bị khoá, hoặc nước đang chọn không còn hợp lệ, lựa chọn SHALL bị bỏ và bộ chọn đóng như khi huỷ.

#### Scenario: Đối thủ nối lại khi đang chọn quân

- **WHEN** trong phòng Cờ vua người chơi đang chọn Mã g1 và phòng cập nhật vì đối thủ nối lại
- **THEN** Mã g1 vẫn được chọn và ô f3, h3 vẫn được đánh dấu

#### Scenario: Bàn bị khoá khi bộ chọn đang mở

- **WHEN** bộ chọn quân phong cấp đang mở và kết nối bị mất làm bàn bị khoá
- **THEN** bộ chọn đóng, không nước nào được gửi và không còn ô nào được chọn

### Requirement: Đi quân Cờ vua bằng bàn phím

Bàn SHALL là một điểm dừng Tab: Tab vào bàn tới ô có tiêu điểm gần nhất, nếu chưa có thì ô đến của nước vừa đi, nếu chưa có nước thì ô vua của bên ở phía dưới. Mũi tên SHALL chuyển tiêu điểm một ô theo hướng nhìn trên màn hình kể cả khi bàn lật, dừng ở mép; Home/End về đầu/cuối hàng; Enter hoặc Space SHALL chọn quân hoặc đi tới ô có tiêu điểm; tiêu điểm ở lại ô đến. Ô có tiêu điểm và ô đang chọn MUST trông khác nhau.

#### Scenario: Vào bàn bằng Tab

- **WHEN** người chơi dùng Tab vào bàn của một ván cùng máy chưa có nước nào
- **THEN** tiêu điểm ở ô có tên "Vua trắng ở e1"

#### Scenario: Đi Mã bằng phím

- **WHEN** tiêu điểm ở g1, người chơi nhấn Enter, mũi tên lên hai lần, mũi tên trái một lần rồi Enter
- **THEN** Mã trắng đi tới f3 và tiêu điểm ở ô f3

#### Scenario: Mũi tên theo hướng bàn đang lật

- **WHEN** bàn đang hiện Đen ở phía dưới và tiêu điểm ở e8
- **THEN** nhấn mũi tên lên đưa tiêu điểm tới e7

#### Scenario: Tab rời bàn

- **WHEN** tiêu điểm ở một ô trên bàn và người chơi nhấn Tab
- **THEN** tiêu điểm rời bàn sang điều khiển kế tiếp, không đi qua các ô khác

### Requirement: Chọn quân phong cấp

Khi người chơi chọn ô đến của một nước phong cấp, màn hình SHALL hỏi quân phong bằng bốn lựa chọn Hậu, Xe, Tượng, Mã, mỗi lựa chọn có hình và tên, tiêu đề nêu nước ("Tốt g2 → g1"), Hậu có tiêu điểm trước; chọn một quân SHALL đi nước đó với quân ấy và MUST NOT chọn thay người chơi. Huỷ (nút "Huỷ" hoặc Escape) MUST NOT đi nước nào, SHALL giữ Tốt đang được chọn và trả tiêu điểm về ô đến trên bàn.

#### Scenario: Phong thành Mã

- **WHEN** Tốt trắng ở e7 đang được chọn, người chơi chọn ô e8 rồi chọn "Mã"
- **THEN** ô e8 có Mã trắng và đến lượt Đen

#### Scenario: Hậu có tiêu điểm trước

- **WHEN** bộ chọn quân phong cấp của Tốt e7 tới e8 vừa mở
- **THEN** tiêu đề là "Tốt e7 → e8", có đúng bốn lựa chọn "Hậu", "Xe", "Tượng", "Mã" và tiêu điểm ở "Hậu"

#### Scenario: Huỷ phong cấp

- **WHEN** bộ chọn quân phong cấp đang mở và người chơi nhấn Escape
- **THEN** Tốt vẫn ở e7 và vẫn được chọn, vẫn đến lượt Trắng và tiêu điểm ở ô e8

### Requirement: Đòi hoà trên màn hình

Khi bên đến lượt có quyền đòi hoà (lặp lại ba lần hoặc 50 nước) và người ở thiết bị này được đi, màn hình SHALL có nút "Đòi hoà" kèm lý do; bấm nút SHALL kết thúc ván hoà ngay, không hỏi đối phương. Khi không có quyền đòi hoà, nút MUST NOT hiện.

#### Scenario: Đòi hoà khi lặp lại ba lần

- **WHEN** ván cùng máy vừa có thế cờ xuất hiện lần thứ ba và người chơi bấm "Đòi hoà"
- **THEN** thẻ kết quả ghi "Hoà!" và dòng giải thích nói bên đến lượt đã đòi hoà vì thế cờ lặp lại ba lần

#### Scenario: Không có quyền đòi hoà

- **WHEN** người chơi mở một ván Cờ vua cùng máy mới
- **THEN** màn hình không có nút "Đòi hoà"

#### Scenario: Đối thủ ở xa không thấy nút

- **WHEN** trong phòng Cờ vua đến lượt Minh và Minh có quyền đòi hoà
- **THEN** màn hình của người kia không có nút "Đòi hoà"

### Requirement: Lật bàn

Màn hình chơi Cờ vua SHALL có nút bật/tắt "Lật bàn" ở mọi chế độ, đổi bên ở phía dưới (cùng với hai thanh người chơi) mà không đổi ván, và báo trạng thái bật/tắt cho trình đọc màn hình. Bàn MUST NOT tự lật sau mỗi nước. Khi màu của người ở thiết bị này đổi (chơi lại trong phòng) hoặc trang được mở lại, bàn SHALL về hướng mặc định của yêu cầu "Bàn Cờ vua".

#### Scenario: Lật bàn trên thiết bị dùng chung

- **WHEN** trong ván cùng máy người chơi bấm "Lật bàn"
- **THEN** Đen ở phía dưới, nút ở trạng thái bật và ván, lượt đi không đổi

#### Scenario: Không tự lật sau nước đi

- **WHEN** trong ván cùng máy Trắng vừa đi một nước
- **THEN** Trắng vẫn ở phía dưới

#### Scenario: Chơi lại đưa bàn về hướng mặc định

- **WHEN** người cầm Trắng trong phòng đã bấm "Lật bàn", ván kết thúc và một người bấm "Chơi lại"
- **THEN** người đó nay cầm Đen, Đen ở phía dưới bàn của người đó và nút "Lật bàn" ở trạng thái tắt

### Requirement: Nước vừa đi và chiếu trên bàn Cờ vua

Bàn SHALL đánh dấu ô đi và ô đến của nước vừa đi bằng dấu không chỉ dựa vào màu và mô tả chúng là nước vừa đi. Khi vua của bên đến lượt bị chiếu, ô vua SHALL được đánh dấu và mô tả là đang bị chiếu, và cạnh bàn SHALL có chữ báo bên đó bị chiếu; trên thiết bị dùng chung chữ này SHALL được trình đọc màn hình đọc.

#### Scenario: Đánh dấu nước vừa đi

- **WHEN** Trắng vừa đi Tốt e2 tới e4
- **THEN** ô e2 và ô e4 được đánh dấu và mô tả là nước vừa đi

#### Scenario: Vua bị chiếu

- **WHEN** sau 1. e4 e5 2. Mf3 Mc6 3. Tc4 Tc5 4. c3 Mf6 5. d4 exd4 6. cxd4 Đen đi Tượng c5 tới b4
- **THEN** ô e1 được mô tả là đang bị chiếu và cạnh bàn có chữ "Chiếu! Trắng đang bị chiếu"

#### Scenario: Báo chiếu trên thiết bị dùng chung

- **WHEN** trong ván cùng máy Đen vừa chiếu Vua trắng
- **THEN** trình đọc màn hình đọc "Chiếu! Trắng đang bị chiếu" mà màn hình không có thêm vùng `role="status"` nào

### Requirement: Sổ ghi nước đi

Màn hình chơi Cờ vua SHALL có sổ ghi các nước đang có hiệu lực theo cặp đánh số (Trắng rồi Đen), mỗi nước hiện hình quân và ô theo ký hiệu đại số, có lời đọc ("Mã f3", "Tốt e ăn d5, chiếu"); nước mới nhất được đánh dấu và khung sổ ghi tự cuộn tới nó. Khung cuộn SHALL nhận tiêu điểm bàn phím và có tên "Sổ ghi". Khi ván kết thúc, sổ ghi SHALL ghi thêm tỉ số `1–0`, `0–1` hoặc `½–½`. Sổ ghi MUST NOT là vùng thông báo.

#### Scenario: Sổ ghi sau ba nửa nước

- **WHEN** sau 1. e4 e5 2. Mf3
- **THEN** sổ ghi có dòng "1." với e4 và e5, dòng "2." với Mã f3, và Mã f3 được đánh dấu là nước mới nhất

#### Scenario: Hoàn tác bỏ nước khỏi sổ ghi

- **WHEN** trong ván cùng máy sau 1. e4 e5 người chơi bấm "Hoàn tác"
- **THEN** sổ ghi chỉ còn e4

#### Scenario: Tỉ số khi kết thúc

- **WHEN** Đen chiếu hết sau 1. f3 e5 2. g4 Hậu đen tới h4
- **THEN** sổ ghi kết thúc bằng Hậu h4 chiếu hết và tỉ số "0–1"

#### Scenario: Ván dài

- **WHEN** ván cùng máy đã có 60 nước của mỗi bên ở khung 1280 × 800
- **THEN** nước mới nhất nằm trong tầm nhìn của khung sổ ghi, trang không cần cuộn, và khung sổ ghi nhận được tiêu điểm bằng Tab

### Requirement: Nhãn nước đi Cờ vua

Khi màn hình chơi nói nước của đối thủ ở xa vừa đi, nhãn SHALL nêu quân, ô đi và ô đến, nêu ăn quân, nhập thành cánh vua hay cánh hậu, quân được phong, và chiếu hoặc chiếu hết, bằng ngôn ngữ đang dùng.

#### Scenario: Đối thủ đi Mã

- **WHEN** trong phòng Cờ vua, Minh cầm Trắng đi Mã g1 tới f3
- **THEN** màn hình của người cầm Đen báo "Minh vừa đi Mã g1 tới f3. Đến lượt bạn (Đen)"

#### Scenario: Đối thủ ăn quân và chiếu

- **WHEN** sau 1. e4 e5 2. Hh5 Mc6, Minh cầm Trắng đi Hậu h5 ăn Tốt ở f7, chiếu
- **THEN** màn hình của người cầm Đen báo "Minh vừa đi Hậu h5 ăn quân ở f7, chiếu. Đến lượt bạn (Đen)"

#### Scenario: Đối thủ nhập thành

- **WHEN** Minh cầm Đen nhập thành cánh vua
- **THEN** màn hình của người cầm Trắng báo Minh vừa nhập thành cánh vua

### Requirement: Kết quả ván Cờ vua

Thẻ kết quả của ván Cờ vua SHALL có dòng giải thích theo lý do kết thúc: chiếu hết; hết nước đi; không đủ quân để chiếu hết; bên nào đòi hoà và vì lặp lại ba lần hay vì 50 nước; lặp lại năm lần; hoặc 75 nước không đi Tốt và không ăn quân.

#### Scenario: Thắng bằng chiếu hết

- **WHEN** Đen chiếu hết trong ván cùng máy
- **THEN** thẻ kết quả ghi "Đen thắng!" và dòng giải thích "Chiếu hết"

#### Scenario: Hoà vì hết nước đi

- **WHEN** ván cùng máy kết thúc vì Đen không bị chiếu mà không còn nước hợp lệ
- **THEN** thẻ kết quả ghi "Hoà!" và dòng giải thích nói Đen hết nước đi

#### Scenario: Hoà vì đòi theo luật 50 nước

- **WHEN** Trắng đòi hoà sau 50 nước mỗi bên không đi Tốt, không ăn quân
- **THEN** thẻ kết quả ghi "Hoà!" và dòng giải thích nói Trắng đòi hoà theo luật 50 nước

### Requirement: Bàn Cờ vua vừa màn hình

Ở khung rộng 360 px, cả 8 cột SHALL hiện trọn, mỗi ô MUST rộng ít nhất 40 px và trang MUST NOT cuộn ngang; toạ độ MUST cao ít nhất 10 px. Ở khung 1280 × 800, bàn, hai thanh người chơi, dòng lượt, sổ ghi, nút "Lật bàn" và các nút của ván SHALL nằm trong màn hình mà không cần cuộn.

#### Scenario: Điện thoại hẹp

- **WHEN** người chơi mở ván Cờ vua ở khung rộng 360 px
- **THEN** cả 8 cột hiện trên màn hình, mỗi ô của lưới rộng ít nhất 40 px và trang không cuộn ngang

#### Scenario: Máy tính

- **WHEN** người chơi mở ván Cờ vua cùng máy ở khung 1280 × 800
- **THEN** bàn, hai thanh người chơi, dòng lượt, sổ ghi, nút "Lật bàn", "Hoàn tác", "Làm lại" và "Ván mới" nằm trong màn hình mà không cần cuộn

### Requirement: Hiệu ứng đi quân Cờ vua

Khi một nước được đi, quân SHALL trượt ngắn từ ô đi tới ô đến (khi nhập thành, cả Xe); quân bị ăn biến mất. Khi người chơi chọn giảm chuyển động, quân MUST hiện ngay ở ô đến, không có chuyển động.

#### Scenario: Giảm chuyển động

- **WHEN** người chơi bật giảm chuyển động và đi Mã g1 tới f3
- **THEN** Mã hiện ngay ở f3 mà không có chuyển động nào

### Requirement: Cờ vua online

Phòng Cờ vua SHALL có 2 ghế: người tạo cầm Trắng, người vào sau cầm Đen; mỗi nước, kể cả phong cấp và đòi hoà, SHALL được server kiểm bằng luật Cờ vua. Chơi lại SHALL đổi màu hai người, và bàn của mỗi người SHALL quay về phía màu mới của mình.

#### Scenario: Hai người chơi qua link mời

- **WHEN** Lan tạo phòng Cờ vua và Minh mở link mời rồi vào chơi
- **THEN** Lan thấy Trắng ở phía dưới và đến lượt mình, Minh thấy Đen ở phía dưới và đang chờ Lan

#### Scenario: Phong cấp online

- **WHEN** trong phòng Cờ vua Lan đưa Tốt trắng tới e8 và chọn "Mã"
- **THEN** cả Lan và Minh thấy Mã trắng ở e8

#### Scenario: Đòi hoà online

- **WHEN** trong phòng Cờ vua đến lượt Lan, thế cờ vừa lặp lại lần thứ ba và Lan bấm "Đòi hoà"
- **THEN** cả Lan và Minh thấy ván kết thúc hoà

#### Scenario: Chơi lại đổi màu

- **WHEN** ván Cờ vua trong phòng đã kết thúc và một người bấm "Chơi lại"
- **THEN** người cầm Trắng ván trước nay cầm Đen, và bàn của mỗi người hiện màu mới của mình ở phía dưới
