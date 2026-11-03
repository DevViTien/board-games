# caro Specification

## Purpose

Luật và cách chơi Cờ caro: bàn 15×15 hoặc 19×19, năm quân liên tiếp theo luật tự do hoặc luật chặn hai đầu (mép bàn không tính là chặn), máy chơi Cờ caro, và bàn cờ trên màn hình (nước vừa đi, hàng thắng, bàn phím, màn hình cảm ứng nhỏ).

## Requirements

### Requirement: Bàn và người chơi

Cờ caro SHALL có đúng 2 người chơi trên bàn vuông 15×15 hoặc 19×19 ô theo tuỳ chọn luật, ban đầu mọi ô đều trống. Người thứ nhất dùng quân X và đi trước, người thứ hai dùng quân O. Game SHALL khai báo thể loại `vn-folk`, thời lượng ước tính 10 phút và hỗ trợ đấu với máy.

#### Scenario: Ván mới mặc định

- **WHEN** tạo một ván Cờ caro không truyền tuỳ chọn luật
- **THEN** bàn có 15×15 ô đều trống và người đến lượt là X

#### Scenario: Ván mới 19×19

- **WHEN** tạo một ván Cờ caro với kích thước bàn 19
- **THEN** bàn có 19×19 ô đều trống và người đến lượt là X

#### Scenario: Có thể đấu với máy

- **WHEN** app đọc thông tin khai báo của Cờ caro
- **THEN** game được khai báo là hỗ trợ đấu với máy, thuộc thể loại `vn-folk`

### Requirement: Tuỳ chọn luật của Cờ caro

Cờ caro SHALL có hai tuỳ chọn luật: kích thước bàn `size` (`15` hoặc `19`) và luật thắng `rule` (`blocked-ends` là "chặn hai đầu", `free` là "tự do"); mặc định `{ size: 15, rule: "blocked-ends" }`. Tuỳ chọn thiếu khoá SHALL lấy giá trị mặc định của khoá đó. Tuỳ chọn có khoá lạ hoặc giá trị lạ MUST bị từ chối với mã lỗi `invalid-options`.

#### Scenario: Tuỳ chọn mặc định

- **WHEN** app đọc tuỳ chọn luật mặc định của Cờ caro
- **THEN** kích thước bàn là 15 và luật thắng là "chặn hai đầu"

#### Scenario: Kích thước bàn không hỗ trợ

- **WHEN** tạo ván Cờ caro với kích thước bàn 17
- **THEN** hệ thống từ chối với mã lỗi `invalid-options`

#### Scenario: Khoá lạ

- **WHEN** tạo ván Cờ caro với tuỳ chọn có thêm khoá `renju`
- **THEN** hệ thống từ chối với mã lỗi `invalid-options`

#### Scenario: Thiếu khoá dùng mặc định

- **WHEN** tạo ván Cờ caro với tuỳ chọn chỉ có kích thước bàn 19
- **THEN** ván được tạo với bàn 19×19 và luật thắng "chặn hai đầu"

### Requirement: Đặt quân

Người đang đến lượt SHALL đặt một quân của mình vào một ô trống bất kỳ trên bàn; sau đó lượt chuyển cho người kia. Đặt vào ô đã có quân hoặc ô ngoài bàn MUST bị từ chối như một nước đi không hợp lệ.

#### Scenario: Lượt luân phiên

- **WHEN** X đặt quân vào ô hàng 8, cột 8
- **THEN** ô đó có quân X và người đến lượt là O

#### Scenario: Không đặt vào ô đã có quân

- **WHEN** O đặt quân vào ô hàng 8, cột 8 đã có quân X
- **THEN** nước đi bị từ chối là không hợp lệ và bàn không đổi

#### Scenario: Ô ngoài bàn 15×15

- **WHEN** trên bàn 15×15, người chơi đặt quân vào ô thứ 226 (chỉ có trên bàn 19×19)
- **THEN** nước đi bị từ chối là không hợp lệ

### Requirement: Thắng theo luật tự do

Với luật "tự do", người chơi SHALL thắng ngay khi có từ 5 quân của mình liên tiếp trở lên theo hàng ngang, cột dọc hoặc một trong hai hướng chéo, bất kể hai đầu chuỗi có gì. Ván kết thúc ngay khi có người thắng.

#### Scenario: Thắng theo hàng ngang

- **WHEN** với luật "tự do", X có 5 quân liên tiếp trên một hàng ngang
- **THEN** ván kết thúc và X thắng

#### Scenario: Thắng theo cột dọc

- **WHEN** với luật "tự do", O có 5 quân liên tiếp trên một cột dọc
- **THEN** ván kết thúc và O thắng

#### Scenario: Thắng theo đường chéo xuống phải

- **WHEN** với luật "tự do", X có 5 quân liên tiếp theo đường chéo từ trên trái xuống dưới phải
- **THEN** ván kết thúc và X thắng

#### Scenario: Thắng theo đường chéo xuống trái

- **WHEN** với luật "tự do", X có 5 quân liên tiếp theo đường chéo từ trên phải xuống dưới trái
- **THEN** ván kết thúc và X thắng

#### Scenario: Chuỗi quá năm vẫn thắng

- **WHEN** với luật "tự do", X đặt quân nối hai chuỗi thành 6 quân liên tiếp
- **THEN** ván kết thúc và X thắng

#### Scenario: Bị chặn hai đầu vẫn thắng ở luật tự do

- **WHEN** với luật "tự do", X có 5 quân liên tiếp và hai ô ngay ngoài hai đầu chuỗi đều là quân O
- **THEN** ván kết thúc và X thắng

#### Scenario: Bốn quân chưa thắng

- **WHEN** X có 4 quân liên tiếp và chưa có chuỗi 5 nào
- **THEN** ván chưa kết thúc

### Requirement: Thắng theo luật chặn hai đầu

Với luật "chặn hai đầu", người chơi SHALL thắng khi có từ 5 quân của mình liên tiếp trở lên theo hàng ngang, cột dọc hoặc đường chéo, trừ khi cả hai ô ngay ngoài hai đầu của chuỗi đó đều là quân đối thủ. Chuỗi bị chặn hai đầu MUST NOT làm ván kết thúc. Chuỗi dài hơn 5 quân SHALL thắng theo cùng điều kiện.

#### Scenario: Năm quân không bị chặn

- **WHEN** với luật "chặn hai đầu", X có 5 quân liên tiếp theo đường chéo và hai ô ngay ngoài hai đầu đều trống
- **THEN** ván kết thúc và X thắng

#### Scenario: Một đầu bị chặn vẫn thắng

- **WHEN** với luật "chặn hai đầu", X có 5 quân liên tiếp trên một hàng, ô ngay ngoài một đầu là quân O và ô ngay ngoài đầu kia trống
- **THEN** ván kết thúc và X thắng

#### Scenario: Bị chặn hai đầu không thắng

- **WHEN** với luật "chặn hai đầu", X có 5 quân liên tiếp trên một cột và hai ô ngay ngoài hai đầu đều là quân O
- **THEN** ván chưa kết thúc và người đến lượt là O

#### Scenario: Chuỗi sáu quân không bị chặn

- **WHEN** với luật "chặn hai đầu", X đặt quân nối thành 6 quân liên tiếp và ít nhất một ô ngay ngoài hai đầu không phải quân O
- **THEN** ván kết thúc và X thắng

#### Scenario: Chuỗi sáu quân bị chặn hai đầu

- **WHEN** với luật "chặn hai đầu", X có 6 quân liên tiếp và hai ô ngay ngoài hai đầu đều là quân O
- **THEN** ván chưa kết thúc

#### Scenario: Một nước tạo hai chuỗi

- **WHEN** với luật "chặn hai đầu", một nước của X cùng lúc tạo một chuỗi 5 quân bị chặn hai đầu theo hàng ngang và một chuỗi 5 quân không bị chặn theo cột dọc
- **THEN** ván kết thúc, X thắng và hàng thắng là chuỗi theo cột dọc

### Requirement: Mép bàn không chặn

Ở luật "chặn hai đầu", mép bàn MUST NOT được tính là chặn: chỉ quân đối thủ nằm ngay ngoài đầu chuỗi mới chặn đầu đó. Chuỗi từ 5 quân chạm mép bàn ở một đầu SHALL thắng kể cả khi đầu kia là quân đối thủ. Ô ở hàng khác MUST NOT được tính là liền với chuỗi, kể cả ô đầu hàng kế tiếp.

#### Scenario: Sát mép, đầu kia bị chặn

- **WHEN** với luật "chặn hai đầu", X có 5 quân liên tiếp từ ô hàng 1, cột 1 sang phải và ô ngay sau đầu phải là quân O
- **THEN** ván kết thúc và X thắng

#### Scenario: Chuỗi sát mép phải

- **WHEN** trên bàn 15×15 với luật "chặn hai đầu", X có quân ở hàng 3, cột 11 tới 15 và O có quân ở hàng 3, cột 10 và hàng 4, cột 1
- **THEN** ván kết thúc và X thắng

#### Scenario: Không nối sang hàng sau

- **WHEN** trên bàn 15×15, X có quân ở hàng 3, cột 13 tới 15 và hàng 4, cột 1 tới 2
- **THEN** ván chưa kết thúc

#### Scenario: Chuỗi phủ trọn đường chéo ngắn

- **WHEN** với luật "chặn hai đầu", X có 5 quân phủ trọn một đường chéo chỉ dài 5 ô ở góc bàn
- **THEN** ván kết thúc và X thắng

#### Scenario: Thắng ở hàng cuối bàn 19×19

- **WHEN** trên bàn 19×19 với luật "chặn hai đầu", O có 5 quân liên tiếp trên hàng 19 kết thúc ở cột 19 và ô ngay trước đầu kia là quân X
- **THEN** ván kết thúc và O thắng

### Requirement: Hoà

Khi mọi ô của bàn đã có quân mà không ai thắng, ván SHALL kết thúc với kết quả hoà. Nước đi lấp ô cuối cùng mà tạo được chuỗi thắng theo luật đang dùng SHALL là thắng; tạo chuỗi không thắng được (bị chặn hai đầu) SHALL là hoà.

#### Scenario: Đầy bàn không ai thắng

- **WHEN** nước đi lấp ô cuối cùng của bàn 15×15 và không tạo chuỗi thắng nào
- **THEN** ván kết thúc với kết quả hoà

#### Scenario: Nước cuối tạo chuỗi thắng

- **WHEN** nước đi lấp ô cuối cùng của bàn đồng thời tạo 5 quân liên tiếp không bị chặn
- **THEN** ván kết thúc và người vừa đi thắng, không phải hoà

#### Scenario: Nước cuối tạo chuỗi bị chặn hai đầu

- **WHEN** với luật "chặn hai đầu", nước đi lấp ô cuối cùng của bàn tạo 5 quân liên tiếp bị chặn hai đầu và không tạo chuỗi thắng nào khác
- **THEN** ván kết thúc với kết quả hoà

### Requirement: Hàng thắng

Khi ván có người thắng, hệ thống SHALL cho biết các ô thuộc chuỗi thắng, gồm mọi quân liên tiếp của chuỗi đó (chuỗi 6 quân thì 6 ô), xếp theo thứ tự từ đầu này tới đầu kia của chuỗi. Khi ván chưa có người thắng hoặc hoà, hệ thống SHALL cho biết không có hàng thắng.

#### Scenario: Hàng thắng năm quân

- **WHEN** X thắng bằng 5 quân liên tiếp theo đường chéo
- **THEN** hàng thắng gồm đúng 5 ô đó, xếp từ đầu này tới đầu kia

#### Scenario: Hàng thắng sáu quân

- **WHEN** X thắng bằng nước đặt ở giữa nối thành 6 quân liên tiếp
- **THEN** hàng thắng gồm cả 6 ô, xếp từ đầu này tới đầu kia

#### Scenario: Chưa có người thắng

- **WHEN** ván đang dở
- **THEN** không có hàng thắng

### Requirement: Máy chơi Cờ caro

Khi đấu Cờ caro với máy, ở mức Vừa và Khó máy SHALL đi nước thắng ngay nếu có, và nếu không có thì SHALL chặn khi đối thủ chỉ còn một cách thành chuỗi thắng ở nước sau, kể cả sát mép và góc bàn. Máy SHALL đánh giá thế cờ theo luật thắng đang dùng: chuỗi mà luật "chặn hai đầu" không cho thắng MUST NOT được coi là mối đe doạ thắng.

#### Scenario: Máy mức Vừa chặn chuỗi bốn

- **WHEN** ở mức Vừa, đối thủ có 4 quân liên tiếp, một đầu bị chặn và đầu kia còn trống, và máy không có nước thắng ngay
- **THEN** máy đặt quân vào ô trống ở đầu kia

#### Scenario: Máy mức Vừa chặn chuỗi bốn có khe

- **WHEN** ở mức Vừa, đối thủ có 4 quân trên một hàng với một ô trống ở giữa (dạng X X _ X X) và máy không có nước thắng ngay
- **THEN** máy đặt quân vào ô trống ở giữa

#### Scenario: Máy chặn sát mép

- **WHEN** ở mức Vừa với luật "chặn hai đầu", máy cầm O, X có quân ở hàng 1, cột 2 tới 5, O có quân ở hàng 1, cột 6, và máy không có nước thắng ngay
- **THEN** máy đặt quân vào ô hàng 1, cột 1

#### Scenario: Máy chớp nước thắng ngay

- **WHEN** ở mức Vừa hoặc Khó, máy có 4 quân liên tiếp với một đầu trống và đối thủ cũng có 4 quân sắp thành năm
- **THEN** máy đặt quân thành năm và thắng

#### Scenario: Máy thắng ở góc

- **WHEN** ở mức Vừa với luật "chặn hai đầu", máy cầm X, có quân ở hàng 1, cột 2 tới 5, O có quân ở hàng 1, cột 6
- **THEN** máy đặt quân vào ô hàng 1, cột 1 và thắng

#### Scenario: Chuỗi không thể thắng không phải mối đe doạ

- **WHEN** máy chấm cùng một thế cờ có hàng O X X X X _ O (ô trống duy nhất để X thành năm nằm giữa chuỗi và quân O), một lần với luật "chặn hai đầu" và một lần với luật "tự do"
- **THEN** với luật "chặn hai đầu", thế đó được chấm kém hơn cho X so với luật "tự do"

### Requirement: Máy chỉ xét nước gần trận đấu

Máy chơi Cờ caro SHALL chỉ xét các ô trống gần quân đã đặt (cách không quá 2 ô theo hàng và theo cột), ưu tiên ô có mức đe doạ cao, và MUST luôn xét mọi ô giúp một trong hai bên thắng ngay hoặc chặn được chuỗi thắng ngay của bên kia. Khi bàn còn trống, máy SHALL đi ô giữa. Nước ngẫu nhiên của mức Dễ cũng SHALL nằm trong các ô máy xét.

#### Scenario: Nước đầu của máy

- **WHEN** máy đi trước trên bàn trống 15×15
- **THEN** máy đặt quân vào ô hàng 8, cột 8

#### Scenario: Máy mức Dễ không đi xa trận đấu

- **WHEN** ở mức Dễ, máy được hỏi nhiều lần (mỗi lần một chuỗi ngẫu nhiên khác) trên bàn 19×19 chỉ có vài quân ở giữa
- **THEN** mọi nước máy chọn đều cách một quân đã đặt không quá 2 ô

#### Scenario: Ô thắng ngay luôn được xét

- **WHEN** quanh các quân có rất nhiều ô trống, và một ô ở rìa nhóm đó giúp đối thủ thành năm
- **THEN** ô đó nằm trong các ô máy xét

#### Scenario: Ô chặn ngoài đầu chuỗi được xét

- **WHEN** với luật "chặn hai đầu", một hàng có dạng O X X X X _ _ và máy cầm O
- **THEN** cả hai ô trống đó nằm trong các ô máy xét

### Requirement: Bàn Cờ caro hiển thị nước vừa đi và hàng thắng

Bàn Cờ caro SHALL hiện mọi quân X và O, đánh dấu ô của nước vừa đi cho cả mắt nhìn lẫn trình đọc màn hình, và khi ván có người thắng SHALL làm nổi bật các ô của hàng thắng, có đường kẻ qua hàng đó, và mô tả mỗi ô đó là thuộc hàng thắng.

#### Scenario: Đánh dấu nước vừa đi

- **WHEN** O vừa đặt quân ở hàng 7, cột 9
- **THEN** ô hàng 7, cột 9 được đánh dấu và được mô tả là nước vừa đi

#### Scenario: Làm nổi bật hàng thắng

- **WHEN** X thắng bằng 5 quân liên tiếp trên hàng 8
- **THEN** 5 ô đó được làm nổi bật và mỗi ô được mô tả là thuộc hàng thắng

### Requirement: Nhãn nước đi theo kích thước bàn

Khi màn hình chơi nói nước máy hoặc đối thủ vừa đi trong ván Cờ caro, vị trí SHALL được nêu bằng hàng và cột đúng theo kích thước bàn của ván.

#### Scenario: Nước ở góc bàn 19×19

- **WHEN** trong ván Cờ caro 19×19 đấu với máy, máy vừa đặt quân vào ô góc dưới phải
- **THEN** màn hình báo máy đánh hàng 19, cột 19

#### Scenario: Nước ở góc bàn 15×15

- **WHEN** trong ván Cờ caro 15×15 đấu với máy, máy vừa đặt quân vào ô góc dưới phải
- **THEN** màn hình báo máy đánh hàng 15, cột 15

### Requirement: Đi quân Cờ caro bằng bàn phím

Bàn Cờ caro SHALL là một điểm dừng Tab duy nhất: Tab vào bàn đưa tiêu điểm tới ô có tiêu điểm gần nhất, nếu chưa có thì ô nước vừa đi, nếu chưa có nước thì ô giữa. Phím mũi tên SHALL chuyển tiêu điểm một ô và dừng ở mép bàn; Home và End về đầu và cuối hàng; Enter hoặc Space SHALL đặt quân ngay. Mỗi ô SHALL có tên đọc được gồm hàng, cột và nội dung.

#### Scenario: Vào bàn bằng Tab

- **WHEN** người chơi dùng phím Tab vào bàn 15×15 chưa có nước nào
- **THEN** tiêu điểm ở ô có tên đọc được "Hàng 8, cột 8, trống"

#### Scenario: Đi quân bằng phím mũi tên

- **WHEN** tiêu điểm ở ô hàng 8, cột 8, người chơi nhấn mũi tên phải rồi Enter
- **THEN** quân X được đặt vào ô hàng 8, cột 9 và tiêu điểm vẫn ở ô đó

#### Scenario: Dừng ở mép bàn

- **WHEN** tiêu điểm ở ô hàng 1, cột 1 và người chơi nhấn mũi tên lên
- **THEN** tiêu điểm vẫn ở ô hàng 1, cột 1

#### Scenario: Tab rời bàn

- **WHEN** tiêu điểm ở một ô trên bàn và người chơi nhấn Tab
- **THEN** tiêu điểm rời bàn sang điều khiển kế tiếp, không đi qua các ô khác

### Requirement: Bàn Cờ caro vừa màn hình điện thoại

Bàn Cờ caro SHALL hiện trọn trong chiều ngang của màn hình rộng 360 px mà trang không phải cuộn ngang, và MUST NOT chặn người chơi phóng to trang.

#### Scenario: Bàn 15×15 trên điện thoại hẹp

- **WHEN** người chơi mở ván Cờ caro 15×15 trên màn hình rộng 360 px
- **THEN** cả 15 cột hiện trên màn hình và trang không cuộn ngang

### Requirement: Đặt quân chính xác trên màn hình cảm ứng nhỏ

Khi người chơi chạm bằng ngón tay vào bàn có ô nhỏ hơn 24 px, lần chạm đầu SHALL chỉ chọn ô (hiện quân xem trước và gợi ý chạm lần nữa); chạm lại đúng ô đó SHALL đặt quân; chạm ô khác SHALL chuyển ô chọn. Ô chọn SHALL bị bỏ khi bàn đổi hoặc bị khoá. Chuột, bàn phím, hoặc chạm khi ô từ 24 px trở lên SHALL đặt quân ngay.

#### Scenario: Chạm hai lần để đặt quân

- **WHEN** trên bàn có ô 17 px, người chơi chạm ô hàng 10, cột 10
- **THEN** ô đó hiện quân xem trước, chưa có nước đi nào
- **AND** người chơi chạm lại ô đó thì quân được đặt

#### Scenario: Đổi ý trước khi đặt

- **WHEN** trên bàn có ô 17 px, người chơi chạm ô hàng 10, cột 10 rồi chạm ô hàng 10, cột 11
- **THEN** ô hàng 10, cột 11 hiện quân xem trước và chưa có nước đi nào

#### Scenario: Chạm rồi nhấn Enter

- **WHEN** trên bàn có ô 17 px, người chơi chạm ô hàng 10, cột 10 rồi nhấn Enter trên ô đó
- **THEN** quân được đặt ngay

#### Scenario: Bàn đổi thì bỏ ô chọn

- **WHEN** trên bàn có ô 17 px, người chơi đã chạm chọn một ô rồi bấm "Hoàn tác"
- **THEN** không còn ô nào hiện quân xem trước

#### Scenario: Chuột đặt ngay

- **WHEN** trên bàn có ô 17 px, người chơi bấm chuột vào ô hàng 10, cột 10
- **THEN** quân được đặt ngay

#### Scenario: Ô đủ lớn đặt ngay

- **WHEN** trên bàn có ô 30 px, người chơi chạm ô hàng 10, cột 10
- **THEN** quân được đặt ngay

### Requirement: Lựa chọn tuỳ chọn luật của Cờ caro

Cờ caro SHALL khai báo cho người chơi chọn kích thước bàn theo thứ tự 15×15, 19×19 và luật thắng theo thứ tự "chặn hai đầu", "tự do". Mọi tổ hợp của hai lựa chọn SHALL tạo được ván và chơi được tới khi kết thúc.

#### Scenario: Lựa chọn của Cờ caro

- **WHEN** app đọc lựa chọn tuỳ chọn luật của Cờ caro
- **THEN** kích thước bàn có hai lựa chọn 15 và 19, luật thắng có hai lựa chọn "chặn hai đầu" và "tự do", theo đúng thứ tự đó

#### Scenario: Mọi tổ hợp chơi được

- **WHEN** bộ kiểm tra hợp đồng chạy cho Cờ caro
- **THEN** kiểm tra `option-choices` vượt qua và các ván tự chơi với cả bốn tổ hợp đều kết thúc

### Requirement: Bàn 19×19 vừa màn hình điện thoại

Bàn Cờ caro 19×19 SHALL hiện trọn trong chiều ngang của màn hình rộng 360 px mà trang không phải cuộn ngang, và người chơi SHALL đặt được quân bằng cách chạm hai lần như requirement "Đặt quân chính xác trên màn hình cảm ứng nhỏ".

#### Scenario: Bàn 19×19 trên điện thoại hẹp

- **WHEN** người chơi chọn bàn 19×19 rồi bắt đầu ván Cờ caro cùng máy trên màn hình cảm ứng rộng 360 px
- **THEN** cả 19 cột hiện trên màn hình và trang không cuộn ngang
- **AND** chạm một ô hai lần thì quân được đặt vào ô đó

### Requirement: Máy Cờ caro trên bàn 19×19

Trên bàn 19×19 giữa ván, máy Cờ caro SHALL đi nước trong thời hạn chung của đấu với máy (capability `play-vs-ai`) ở mọi mức độ, kể cả mức Khó, mà giao diện không bị đứng trong lúc máy nghĩ.

#### Scenario: Máy mức Khó trên bàn 19×19

- **WHEN** trong ván Cờ caro 19×19 đấu với máy mức Khó đã có 30 nước và máy đã đi ít nhất một nước từ khi mở trang, người chơi đặt quân
- **THEN** trong vòng 2 giây máy đặt một quân và lại đến lượt người chơi
