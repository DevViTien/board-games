## MODIFIED Requirements

### Requirement: Bàn và người chơi

Cờ caro SHALL có đúng 2 người chơi trên bàn vuông 15×15 hoặc 19×19 ô, hoặc trên bàn vô hạn, theo tuỳ chọn luật; ban đầu mọi ô đều trống. Người thứ nhất dùng quân X và đi trước, người thứ hai dùng quân O. Game SHALL khai báo thể loại `vn-folk`, thời lượng ước tính 10 phút và hỗ trợ đấu với máy.

#### Scenario: Ván mới mặc định

- **WHEN** tạo một ván Cờ caro không truyền tuỳ chọn luật
- **THEN** bàn có 15×15 ô đều trống và người đến lượt là X

#### Scenario: Ván mới 19×19

- **WHEN** tạo một ván Cờ caro với kích thước bàn 19
- **THEN** bàn có 19×19 ô đều trống và người đến lượt là X

#### Scenario: Ván mới trên bàn vô hạn

- **WHEN** tạo một ván Cờ caro với kích thước bàn "vô hạn"
- **THEN** vùng đặt được có 15×15 ô đều trống và người đến lượt là X

#### Scenario: Có thể đấu với máy

- **WHEN** app đọc thông tin khai báo của Cờ caro
- **THEN** game được khai báo là hỗ trợ đấu với máy, thuộc thể loại `vn-folk`

### Requirement: Tuỳ chọn luật của Cờ caro

Cờ caro SHALL có hai tuỳ chọn luật: kích thước bàn `size` (`15`, `19` hoặc `infinite` là "vô hạn") và luật thắng `rule` (`blocked-ends` là "chặn hai đầu", `free` là "tự do"); mặc định `{ size: 15, rule: "blocked-ends" }`. Tuỳ chọn thiếu khoá SHALL lấy giá trị mặc định của khoá đó. Tuỳ chọn có khoá lạ hoặc giá trị lạ MUST bị từ chối với mã lỗi `invalid-options`.

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

#### Scenario: Bàn vô hạn với luật tự do

- **WHEN** tạo ván Cờ caro với tuỳ chọn `{ size: "infinite", rule: "free" }`
- **THEN** ván được tạo trên bàn vô hạn với luật thắng "tự do"

### Requirement: Đặt quân

Người đang đến lượt SHALL đặt một quân của mình vào một ô trống bất kỳ trên bàn; trên bàn vô hạn, ô đó SHALL nằm trong vùng đặt được. Sau đó lượt chuyển cho người kia. Đặt vào ô đã có quân, ô ngoài bàn hoặc ô ngoài vùng đặt được MUST bị từ chối như một nước đi không hợp lệ.

#### Scenario: Lượt luân phiên

- **WHEN** X đặt quân vào ô hàng 8, cột 8
- **THEN** ô đó có quân X và người đến lượt là O

#### Scenario: Không đặt vào ô đã có quân

- **WHEN** O đặt quân vào ô hàng 8, cột 8 đã có quân X
- **THEN** nước đi bị từ chối là không hợp lệ và bàn không đổi

#### Scenario: Ô ngoài bàn 15×15

- **WHEN** trên bàn 15×15, người chơi đặt quân vào ô thứ 226 (chỉ có trên bàn 19×19)
- **THEN** nước đi bị từ chối là không hợp lệ

#### Scenario: Ô ngoài vùng của bàn vô hạn

- **WHEN** trên bàn vô hạn chưa có quân nào, người chơi đặt quân vào ô hàng 1, cột 1
- **THEN** nước đi bị từ chối là không hợp lệ vì ô đó nằm ngoài vùng đặt được

### Requirement: Hoà

Khi mọi ô của bàn đã có quân mà không ai thắng, ván SHALL kết thúc với kết quả hoà; trên bàn vô hạn, "mọi ô" là mọi ô của giới hạn 61×61. Nước đi lấp ô cuối cùng mà tạo được chuỗi thắng theo luật đang dùng SHALL là thắng; tạo chuỗi không thắng được (bị chặn hai đầu) SHALL là hoà.

#### Scenario: Đầy bàn không ai thắng

- **WHEN** nước đi lấp ô cuối cùng của bàn 15×15 và không tạo chuỗi thắng nào
- **THEN** ván kết thúc với kết quả hoà

#### Scenario: Nước cuối tạo chuỗi thắng

- **WHEN** nước đi lấp ô cuối cùng của bàn đồng thời tạo 5 quân liên tiếp không bị chặn
- **THEN** ván kết thúc và người vừa đi thắng, không phải hoà

#### Scenario: Nước cuối tạo chuỗi bị chặn hai đầu

- **WHEN** với luật "chặn hai đầu", nước đi lấp ô cuối cùng của bàn tạo 5 quân liên tiếp bị chặn hai đầu và không tạo chuỗi thắng nào khác
- **THEN** ván kết thúc với kết quả hoà

#### Scenario: Bàn vô hạn chưa kín

- **WHEN** trên bàn vô hạn đã có 400 quân mà không ai thắng
- **THEN** ván chưa kết thúc và người đến lượt vẫn có ô để đặt

### Requirement: Lựa chọn tuỳ chọn luật của Cờ caro

Cờ caro SHALL khai báo cho người chơi chọn kích thước bàn theo thứ tự 15×15, 19×19, vô hạn và luật thắng theo thứ tự "chặn hai đầu", "tự do". Mọi tổ hợp của hai lựa chọn SHALL tạo được ván và chơi được tới khi kết thúc.

#### Scenario: Lựa chọn của Cờ caro

- **WHEN** app đọc lựa chọn tuỳ chọn luật của Cờ caro
- **THEN** kích thước bàn có ba lựa chọn 15, 19 và "vô hạn", luật thắng có hai lựa chọn "chặn hai đầu" và "tự do", theo đúng thứ tự đó

#### Scenario: Mọi tổ hợp chơi được

- **WHEN** bộ kiểm tra hợp đồng chạy cho Cờ caro
- **THEN** kiểm tra `option-choices` vượt qua và các ván tự chơi với cả sáu tổ hợp đều kết thúc

### Requirement: Nhãn nước đi theo kích thước bàn

Khi màn hình chơi nói nước máy hoặc đối thủ vừa đi trong ván Cờ caro, vị trí SHALL được nêu bằng hàng và cột đúng theo kích thước bàn của ván. Trên bàn vô hạn, hàng và cột SHALL đếm từ góc trên trái của giới hạn 61×61, nên tên một ô không đổi khi vùng nở.

#### Scenario: Nước ở góc bàn 19×19

- **WHEN** trong ván Cờ caro 19×19 đấu với máy, máy vừa đặt quân vào ô góc dưới phải
- **THEN** màn hình báo máy đánh hàng 19, cột 19

#### Scenario: Nước ở góc bàn 15×15

- **WHEN** trong ván Cờ caro 15×15 đấu với máy, máy vừa đặt quân vào ô góc dưới phải
- **THEN** màn hình báo máy đánh hàng 15, cột 15

#### Scenario: Nước đầu trên bàn vô hạn

- **WHEN** trong ván Cờ caro vô hạn đấu với máy, máy đi trước trên bàn trống
- **THEN** màn hình báo máy đánh hàng 31, cột 31

### Requirement: Đi quân Cờ caro bằng bàn phím

Bàn Cờ caro SHALL là một điểm dừng Tab duy nhất: Tab vào bàn đưa tiêu điểm tới ô có tiêu điểm gần nhất, nếu chưa có thì ô nước vừa đi, nếu chưa có nước thì ô giữa. Phím mũi tên SHALL chuyển tiêu điểm một ô và dừng ở mép bàn, trên bàn vô hạn là mép vùng đặt được; Home và End về đầu và cuối hàng của bàn hay của vùng; Enter hoặc Space SHALL đặt quân ngay. Mỗi ô SHALL có tên đọc được gồm hàng, cột và nội dung.

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

#### Scenario: Vào bàn vô hạn bằng Tab

- **WHEN** người chơi dùng phím Tab vào bàn vô hạn chưa có nước nào
- **THEN** tiêu điểm ở ô có tên đọc được "Hàng 31, cột 31, trống"

#### Scenario: Dừng ở mép vùng của bàn vô hạn

- **WHEN** trên bàn vô hạn chưa có quân nào, tiêu điểm ở ô hàng 24, cột 31 và người chơi nhấn mũi tên lên
- **THEN** tiêu điểm vẫn ở ô hàng 24, cột 31

## ADDED Requirements

### Requirement: Bàn vô hạn tự nở

Trên bàn vô hạn, vùng đặt được SHALL bắt đầu là 15×15 ô ở giữa một giới hạn ẩn 61×61 (hàng và cột 24 tới 38). Sau mỗi nước, vùng SHALL là hình chữ nhật nhỏ nhất chứa vùng cũ và mọi ô cách quân vừa đặt không quá 5 hàng và 5 cột, cắt theo giới hạn. Vùng MUST NOT co lại, kể cả khi hoàn tác thì vùng là vùng của thế cờ được dựng lại. Mép giới hạn MUST NOT tính là chặn.

#### Scenario: Vùng nở khi quân gần mép

- **WHEN** trên bàn vô hạn chưa có quân nào, X đặt quân vào ô hàng 24, cột 31
- **THEN** vùng đặt được là hàng 19 tới 38, cột 24 tới 38

#### Scenario: Vùng không nở khi quân ở giữa

- **WHEN** trên bàn vô hạn chưa có quân nào, X đặt quân vào ô hàng 31, cột 31
- **THEN** vùng đặt được vẫn là hàng 24 tới 38, cột 24 tới 38

#### Scenario: Vùng dừng ở giới hạn

- **WHEN** trên bàn vô hạn vùng đã chạm hàng 1 và X đặt quân vào ô hàng 2
- **THEN** vùng không có hàng nào trên hàng 1

#### Scenario: Hoàn tác dựng lại vùng

- **WHEN** trên bàn vô hạn cùng máy, nước vừa đi làm vùng nở thêm 5 hàng, và người chơi bấm "Hoàn tác"
- **THEN** vùng đặt được trở lại như trước nước đó

### Requirement: Xem bàn vô hạn

Bàn vô hạn SHALL nằm trong một khung giấy vở cùng cỡ với bàn 15×15. Lúc đầu ván, khung SHALL hiện đúng 15 cột của vùng, như bàn 15×15. Vùng lớn hơn khung thì người chơi SHALL cuộn hay kéo được trong khung để xem. SHALL có nút thu nhỏ, phóng to và "Về nước vừa đi". Vùng nở MUST NOT làm các ô đang thấy xê dịch. Nước của người khác ngoài khung nhìn SHALL được cuộn tới; khi giảm chuyển động thì cuộn không có hiệu ứng.

#### Scenario: Đầu ván giống bàn 15×15

- **WHEN** người chơi bắt đầu ván Cờ caro vô hạn ở khung 1280 × 800
- **THEN** khung bàn hiện đủ 15 hàng và 15 cột, không có thanh cuộn

#### Scenario: Vùng nở không làm bàn giật

- **WHEN** người chơi đặt quân gần mép trên làm vùng nở thêm hàng ở phía trên
- **THEN** quân vừa đặt vẫn ở đúng chỗ trên màn hình, và cuộn lên thì thấy các hàng mới

#### Scenario: Về nước vừa đi

- **WHEN** người chơi đã cuộn bàn ra xa khỏi nước vừa đi và bấm "Về nước vừa đi"
- **THEN** ô của nước vừa đi nằm trong khung nhìn

#### Scenario: Phóng to và thu nhỏ

- **WHEN** người chơi bấm "Thu nhỏ bàn" ở đầu ván
- **THEN** khung hiện nhiều cột hơn 15, và khi đã ở mức nhỏ nhất thì nút "Thu nhỏ bàn" không bấm được và nói lý do

#### Scenario: Nước của máy ngoài khung nhìn

- **WHEN** người chơi đã cuộn bàn để nước sắp tới của máy nằm ngoài khung, và máy đi
- **THEN** khung tự cuộn để ô máy vừa đặt nằm trong khung nhìn

### Requirement: Bàn vô hạn trên điện thoại

Ở khung rộng 360 px, bàn vô hạn SHALL nằm trọn trong chiều ngang màn hình mà trang không cuộn ngang. Kéo bằng ngón tay trên bàn đang lớn hơn khung SHALL cuộn bàn, không cuộn trang. Ô nhỏ hơn 24 px SHALL theo requirement "Đặt quân chính xác trên màn hình cảm ứng nhỏ". Các nút thu phóng và "Về nước vừa đi" SHALL có vùng chạm ít nhất 44 × 44 px.

#### Scenario: Bàn vô hạn trên điện thoại hẹp

- **WHEN** người chơi bắt đầu ván Cờ caro vô hạn cùng máy trên màn hình cảm ứng rộng 360 px
- **THEN** khung bàn nằm trọn trong màn hình và trang không cuộn ngang
- **AND** chạm một ô hai lần thì quân được đặt vào ô đó

#### Scenario: Kéo trên bàn đã nở

- **WHEN** ở khung 360 × 740 vùng đã rộng hơn khung và người chơi kéo ngón tay sang trái trên bàn
- **THEN** bàn cuộn sang phải, trang không cuộn ngang và không có quân nào được đặt

### Requirement: Máy Cờ caro trên bàn vô hạn

Trên bàn vô hạn giữa ván, máy Cờ caro SHALL đi nước trong thời hạn chung của đấu với máy (capability `play-vs-ai`) ở mọi mức độ, kể cả mức Khó, mà giao diện không bị đứng trong lúc máy nghĩ. Nước của máy SHALL luôn nằm trong vùng đặt được.

#### Scenario: Máy mức Khó trên bàn vô hạn

- **WHEN** trong ván Cờ caro vô hạn đấu với máy mức Khó đã có 30 nước và máy đã đi ít nhất một nước từ khi mở trang, người chơi đặt quân
- **THEN** trong vòng 2 giây máy đặt một quân trong vùng đặt được và lại đến lượt người chơi
