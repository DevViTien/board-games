## ADDED Requirements

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
