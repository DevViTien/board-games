# fence-race Specification

## Purpose

Cờ rào là game tự thiết kế của app: mỗi người đua quân về cổng đích ở cạnh đối diện, đặt rào làm người khác đi xa hơn và có một lần phá rào để lội ngược dòng. Spec này mô tả luật, máy và màn hình chơi của game.

## Requirements

### Requirement: Bàn và người chơi

Cờ rào SHALL cho 2 đến 4 người. Hai người: bàn 11 hàng × 9 cột, mỗi người 9 rào. Ba người: bàn 9 × 9, mỗi người 6 rào. Bốn người: bàn 9 × 9, mỗi người 4 rào. Mỗi người SHALL có đúng một lần phá rào. Quân SHALL bắt đầu ở ô giữa một cạnh; đích là cổng gồm 5 ô giữa của cạnh đối diện. Cạnh của các ghế theo thứ tự: hai người dưới, trên; ba người dưới, trên, trái; bốn người dưới, trái, trên, phải. Ghế đầu SHALL đi trước, rồi lần lượt theo thứ tự ghế. Game MUST NOT có tuỳ chọn luật.

#### Scenario: Ván mới hai người

- **WHEN** một ván 2 người bắt đầu
- **THEN** bàn có 11 hàng và 9 cột, ghế đầu ở giữa hàng dưới cùng, ghế thứ hai ở giữa hàng trên cùng, mỗi người còn 9 rào và 1 lần phá, và tới lượt ghế đầu

#### Scenario: Ván mới bốn người

- **WHEN** một ván 4 người bắt đầu
- **THEN** bàn 9 × 9, bốn quân ở giữa bốn cạnh, mỗi người còn 4 rào và 1 lần phá

#### Scenario: Ván mới ba người

- **WHEN** một ván 3 người bắt đầu
- **THEN** bàn 9 × 9, quân của ba ghế lần lượt ở giữa cạnh dưới, cạnh trên, cạnh trái, mỗi người còn 6 rào và 1 lần phá

### Requirement: Mỗi lượt một việc

Trong lượt của mình, người chơi SHALL làm đúng một việc: đi quân, đặt một rào, hoặc phá một rào. Nước đi không hợp lệ MUST bị từ chối và không làm đổi ván.

#### Scenario: Dữ liệu sai dạng

- **WHEN** nước gửi tới không có loại, có loại lạ, hướng lạ, hoặc toạ độ không phải số nguyên
- **THEN** nước bị từ chối, và người đó không mất rào hay lần phá nào

#### Scenario: Đặt rào thì không đi quân

- **WHEN** ghế đầu đặt một rào hợp lệ
- **THEN** quân của ghế đầu đứng yên, ghế đầu còn ít hơn một rào và tới lượt ghế tiếp theo

#### Scenario: Nước không hợp lệ bị từ chối

- **WHEN** một người gửi nước đi không có trong các nước hợp lệ
- **THEN** ván không đổi và vẫn tới lượt người đó

### Requirement: Đi quân

Quân SHALL đi một ô theo chiều ngang hoặc dọc, sang ô kề không bị rào ngăn. Quân MUST NOT đi chéo, đi xuyên rào hay ra ngoài bàn. Quân SHALL được đi vào ô đang có quân khác và đứng chung ô, tối đa cả bốn quân; quân MUST NOT nhảy qua quân khác.

#### Scenario: Bị rào ngăn

- **WHEN** có rào giữa quân và ô phía trên
- **THEN** đi lên ô đó không phải nước hợp lệ, còn các ô kề khác không bị ngăn vẫn đi được

#### Scenario: Đứng chung ô

- **WHEN** ô kề với quân đang có quân của người khác và không có rào ngăn
- **THEN** đi vào ô đó là hợp lệ, sau đó hai quân cùng đứng trong ô

#### Scenario: Không nhảy qua quân

- **WHEN** ô kề với quân đang có quân của người khác
- **THEN** ô phía sau quân đó không phải nước hợp lệ

### Requirement: Đặt rào

Rào SHALL dài đúng hai ô, nằm trên đường kẻ giữa các ô, ngăn hai cặp ô kề nhau, trọn vẹn trong bàn. Rào MUST NOT đè lên rào đã có, dù chỉ một đoạn, và MUST NOT cắt ngang rào khác tại trung điểm của nhau. Người đã hết rào MUST NOT đặt thêm. Rào đã đặt SHALL ở lại tới hết ván trừ khi bị phá.

#### Scenario: Rào đè nhau

- **WHEN** đã có một rào giữa hàng 4 và 5 ở cột C–D và người chơi đặt rào giữa hàng 4 và 5 ở cột D–E
- **THEN** nước đó không hợp lệ

#### Scenario: Rào cắt nhau

- **WHEN** đã có một rào nằm theo hàng và người chơi đặt rào nằm theo cột có cùng trung điểm
- **THEN** nước đó không hợp lệ

#### Scenario: Hết rào

- **WHEN** người chơi không còn rào nào
- **THEN** không có nước đặt rào nào hợp lệ với người đó

### Requirement: Luôn còn đường về đích

Một rào MUST NOT được đặt nếu sau đó có người không còn đường đi từ ô đang đứng tới đích, kể cả người đặt rào. Quân khác không tính là vật cản khi xét đường đi.

#### Scenario: Bịt kín đường của đối thủ

- **WHEN** quân đối thủ chỉ còn một lối ra và rào sắp đặt sẽ bịt nốt lối đó
- **THEN** nước đó không hợp lệ

#### Scenario: Bịt kín đường của chính mình

- **WHEN** rào sắp đặt sẽ làm chính người đặt không còn đường về đích
- **THEN** nước đó không hợp lệ

#### Scenario: Quân khác không chắn đường

- **WHEN** lối đi duy nhất về đích đang có quân của người khác đứng
- **THEN** rào không chạm lối đó vẫn đặt được, và quân đi qua được ô đó

### Requirement: Phá rào

Trong lượt của mình, người còn lần phá SHALL được gỡ một rào bất kỳ trên bàn, của bất kỳ ai, thay cho việc đi quân hay đặt rào. Mỗi người SHALL chỉ phá một lần trong cả ván. Rào bị phá MUST NOT trả lại cho ai.

#### Scenario: Phá rào của người khác

- **WHEN** ghế đầu còn lần phá và phá một rào do ghế thứ hai đặt
- **THEN** rào đó biến mất, ghế đầu hết lần phá, số rào còn lại của mọi người không đổi và tới lượt người tiếp theo

#### Scenario: Đã phá một lần

- **WHEN** người chơi đã dùng lần phá
- **THEN** không có nước phá rào nào hợp lệ với người đó

#### Scenario: Chưa có rào

- **WHEN** trên bàn chưa có rào nào
- **THEN** không có nước phá rào nào hợp lệ

### Requirement: Thắng khi về đích

Khi một quân vào một ô của cổng đích của nó, người đó SHALL thắng ngay và ván kết thúc, kể cả ván có nhiều hơn hai người. Sau khi ván kết thúc MUST NOT còn nước đi hợp lệ.

#### Scenario: Về đích

- **WHEN** quân của ghế thứ hai đi vào một ô từ cột C tới cột G của hàng dưới cùng trong ván hai người
- **THEN** ghế thứ hai thắng, kết quả ghi lý do về đích, và không còn nước đi hợp lệ

#### Scenario: Ô ngoài cổng không tính

- **WHEN** trong ván hai người, quân của ghế thứ hai đi vào ô ở cột A, B, H hay I của hàng dưới cùng
- **THEN** ván chưa kết thúc, và quân đi tiếp dọc cạnh vào cổng được nếu không bị rào ngăn

#### Scenario: Cổng của người khác không tính

- **WHEN** trong ván bốn người, quân đi vào cổng đích của một người khác
- **THEN** ván chưa kết thúc

### Requirement: Giới hạn lượt

Sau 200 nước đi của cả ván (198 nước ở ván ba người, để mọi người có số lượt bằng nhau) mà chưa ai về đích, ván SHALL kết thúc: người có đường về đích ngắn nhất thắng; nếu từ hai người trở lên cùng ngắn nhất thì ván hoà. Kết quả SHALL ghi lý do hết lượt. Về đích đúng ở nước cuối SHALL tính là thắng do về đích. Mọi ván MUST kết thúc.

#### Scenario: Hết lượt có người gần đích hơn

- **WHEN** nước thứ 200 vừa đi xong, không ai về đích và ghế đầu có đường về đích ngắn nhất
- **THEN** ghế đầu thắng với lý do hết lượt

#### Scenario: Hết lượt bằng nhau

- **WHEN** nước thứ 200 vừa đi xong và hai người cùng có đường về đích ngắn nhất
- **THEN** ván hoà với lý do hết lượt

#### Scenario: Về đích ở nước cuối

- **WHEN** nước cuối cùng được phép đưa một quân về đích
- **THEN** người đó thắng với lý do về đích

#### Scenario: Ván ngẫu nhiên kết thúc

- **WHEN** các ván 2, 3, 4 người được chơi hoàn toàn bằng nước ngẫu nhiên
- **THEN** mọi ván đều có kết quả, và dựng lại từ danh sách nước đi cho đúng trạng thái đó

### Requirement: Máy chơi Cờ rào

Máy SHALL chơi được ở cả ba mức, kể cả ghế máy và máy chơi thay online. Mức Vừa và Khó MUST đi nước thắng khi có; trong ván hai người, chúng MUST đặt rào chặn khi đối thủ sắp về đích ở nước sau, nếu chặn được. Mọi rào máy chọn SHALL chắn một đoạn trên một đường ngắn nhất của đối thủ. Máy SHALL chỉ xét phá rào khi đường của chính nó nhờ đó ngắn đi từ 2 bước trở lên. Máy MUST NOT đi qua đi lại vô ích. Ván hai người, mỗi mức SHALL mạnh hơn mức dưới rõ rệt; ván ba, bốn người, Vừa SHALL mạnh hơn Dễ.

#### Scenario: Đi nước thắng

- **WHEN** ở mức Vừa, quân của máy đứng sát cổng đích và không có rào ngăn
- **THEN** máy đi vào ô đích

#### Scenario: Chặn đối thủ sắp về đích

- **WHEN** ở mức Vừa hoặc Khó trong ván hai người, đối thủ chỉ cần một bước nữa là về đích, máy chưa về được, còn rào và có rào chặn được
- **THEN** máy đặt một rào làm đối thủ không về đích ở nước sau

#### Scenario: Máy biết phá rào

- **WHEN** ở mức Vừa, ván hai người, máy ở E1 đã hết rào và còn lần phá; bốn rào liền nhau giữa hàng 1 và 2 chắn từ cột A tới cột H nên đường của máy dài 16 bước; đối thủ ở A1 còn 9 rào và còn 2 bước
- **THEN** máy phá một trong các rào đó, không đi quân, và đường của máy ngắn đi từ 2 bước trở lên

#### Scenario: Rào của máy chắn đường đối thủ

- **WHEN** máy chọn đặt một rào, ở bất kỳ mức nào và bất kỳ số người nào
- **THEN** rào đó chắn một đoạn trên một đường ngắn nhất của một đối thủ

#### Scenario: Máy không phá rào vô ích

- **WHEN** máy chọn phá một rào, ở bất kỳ mức nào
- **THEN** rào đó làm đường của chính máy ngắn đi từ 2 bước trở lên; máy không bảo đảm chọn rào lợi nhất, vì còn xét nước trả lời của đối thủ

#### Scenario: Khó thắng Dễ

- **WHEN** mức Khó đấu với mức Dễ 40 ván hai người, đổi lượt đi trước
- **THEN** mức Khó thắng ít nhất 36 ván

#### Scenario: Khó thắng Vừa

- **WHEN** mức Khó đấu với mức Vừa ít nhất 100 ván hai người có nước mở đầu ngẫu nhiên, đổi lượt đi trước
- **THEN** mức Khó thắng ít nhất 60% số ván

#### Scenario: Máy không đi qua đi lại

- **WHEN** các máy mức Vừa tự chơi với nhau ở ván 2, 3 và 4 người, có nước mở đầu ngẫu nhiên
- **THEN** dưới 1% số ván chạm giới hạn nước

### Requirement: Hiển thị bàn

Màn hình chơi SHALL cho thấy bàn đúng tỉ lệ số hàng và cột, cổng đích của mỗi người theo màu và ký hiệu của người đó, quân có ký hiệu riêng ngoài màu, mọi rào đã đặt, và tên hàng cột để đọc được vị trí. Lượt hiện tại SHALL thấy được trên bàn. Nước vừa đi SHALL được đánh dấu: ô quân vừa rời đi, rào vừa đặt, hay chỗ rào vừa bị phá, kể cả sau khi tải lại trang. Khi ván kết thúc, bàn SHALL đánh dấu quân thắng và ô về đích. Nhiều quân chung ô MUST vẫn thấy đủ ký hiệu.

#### Scenario: Cổng đích theo người chơi

- **WHEN** ván hai người đang chơi và bàn chưa quay
- **THEN** 5 ô giữa của cạnh trên được đánh dấu là cổng với màu và ký hiệu của ghế đầu, 5 ô giữa của cạnh dưới là cổng với màu và ký hiệu của ghế thứ hai, và phân biệt được với các ô còn lại của cạnh không chỉ bằng màu

#### Scenario: Bốn quân chung ô

- **WHEN** bốn quân đứng chung một ô
- **THEN** thấy được ký hiệu của cả bốn quân trong ô đó

#### Scenario: Đánh dấu rào vừa phá

- **WHEN** đối thủ vừa phá một rào
- **THEN** chỗ rào đó được đánh dấu cho tới nước đi kế tiếp; chơi cùng máy thì dòng dưới bàn nói rào đó đã bị phá, còn khi có người chơi cụ thể ở thiết bị thì dòng lượt nói

#### Scenario: Nhiều người cùng thắng

- **WHEN** ván kết thúc với nhiều người thắng, như khi người chơi đầu hàng trước ba ghế máy
- **THEN** bàn đánh dấu cổng của mọi người thắng, không chỉ người đầu tiên, và quân của họ; quân thắng đứng chung ô thì bàn đánh dấu ô có quân thắng

#### Scenario: Tải lại vẫn thấy ô vừa rời

- **WHEN** đối thủ vừa đi một ô và người chơi tải lại trang
- **THEN** ô quân đó vừa rời đi vẫn được đánh dấu

#### Scenario: Đánh dấu khi kết thúc

- **WHEN** một quân vừa về đích
- **THEN** bàn đánh dấu quân đó và ô về đích, hoặc đánh dấu ô có quân thắng khi quân đó đứng chung ô, và thẻ kết quả hiện

### Requirement: Ba chế độ thao tác

Khi tới lượt, người chơi SHALL chọn giữa ba chế độ Đi quân, Đặt rào, Phá rào, mặc định là Đi quân. Ở chế độ Đi quân, các ô đi được SHALL được đánh dấu và một lần chạm là đi. Chế độ không dùng được (hết rào, đã phá, chưa có rào để phá) SHALL vẫn thấy được và có lý do. Mỗi chế độ SHALL có một câu gợi ý cách làm; đầu ván SHALL có một câu nêu mục tiêu của người chơi. Sau khi đi xong một nước, chế độ SHALL trở về Đi quân.

#### Scenario: Đi quân bằng một chạm

- **WHEN** đang ở chế độ Đi quân và người chơi chạm một ô được đánh dấu
- **THEN** quân đi tới ô đó ngay, không cần xác nhận

#### Scenario: Hết rào

- **WHEN** người chơi đã hết rào
- **THEN** chế độ Đặt rào không chọn được và có lý do "Đã hết rào"

#### Scenario: Trở về Đi quân

- **WHEN** người chơi vừa đặt xong một rào
- **THEN** ở lượt sau của người đó, chế độ đang chọn là Đi quân

#### Scenario: Câu mục tiêu đầu ván

- **WHEN** ván mới bắt đầu và chưa ai đi nước nào
- **THEN** màn hình nói người chơi phải về cổng ở cạnh nào, theo màu của người đó và theo hướng bàn trên màn hình của người đó, kể cả khi đang chờ người đi trước

#### Scenario: Vòng đầu trên thiết bị dùng chung

- **WHEN** chơi cùng máy, ghế trước vừa đi nước đầu và mọi người chưa đi hết một vòng
- **THEN** dòng dưới bàn hiện câu mục tiêu của người tới lượt và nước vừa đi

### Requirement: Đặt rào có xem trước

Ở chế độ Đặt rào, lần chạm đầu SHALL hiện rào xem trước tại đường kẻ gần chỗ chạm nhất. Từ đó rào SHALL giữ hướng khi dời hay kéo; hướng chỉ đổi bằng nút Xoay, phím R hoặc chạm lại đúng rào. Rào chỉ được đặt khi xác nhận bằng nút, hoặc Enter hay Space trên lớp phủ. Rào hợp lệ SHALL cho biết đường của ai dài ra bao nhiêu bước; không hợp lệ SHALL hiện khác hình, nói lý do và không xác nhận được. Nút Huỷ SHALL bỏ rào xem trước. Xem trước MUST NOT gửi gì đi và MUST NOT làm bàn dịch chuyển.

#### Scenario: Xem trước rồi xác nhận

- **WHEN** ở chế độ Đặt rào, người chơi chạm gần một đường kẻ
- **THEN** rào xem trước hiện ở đó, chưa có nước đi nào; khi người chơi bấm "Đặt rào" thì rào được đặt

#### Scenario: Báo đường dài ra

- **WHEN** rào xem trước làm đường về đích của một ghế từ 6 thành 9 bước
- **THEN** màn hình cho biết đường của ghế đó từ 6 thành 9 bước, gọi theo màu của ghế, hoặc "Bạn" nếu là người ở thiết bị

#### Scenario: Rào bịt kín đường

- **WHEN** rào xem trước sẽ bịt kín đường về đích của một người
- **THEN** rào xem trước hiện ở dạng không hợp lệ, có lý do bằng chữ, và nút "Đặt rào" không đặt được

#### Scenario: Xoay rào

- **WHEN** rào xem trước đang nằm theo hàng và người chơi bấm nút xoay
- **THEN** rào xem trước nằm theo cột tại cùng giao điểm, và tính hợp lệ được cập nhật

#### Scenario: Kéo giữ hướng

- **WHEN** người chơi đã xoay rào rồi kéo ngón tay qua nhiều đường kẻ theo chiều khác
- **THEN** rào đi theo ngón tay và vẫn giữ hướng đã xoay

#### Scenario: Chạm lại không đặt nhầm

- **WHEN** người chơi chạm lại đúng rào xem trước
- **THEN** rào đổi hướng và chưa có nước đi nào

#### Scenario: Huỷ

- **WHEN** rào xem trước đang hiện và người chơi bấm "Huỷ"
- **THEN** rào xem trước biến mất, vẫn ở chế độ Đặt rào, và chưa có nước đi nào

### Requirement: Phá rào có xác nhận

Ở chế độ Phá rào, chạm vào bàn SHALL chọn rào gần chỗ chạm nhất và đánh dấu rào đó; rào chỉ bị phá khi người chơi xác nhận. Màn hình SHALL cho biết đường về đích của mỗi người ngắn đi bao nhiêu bước, nếu có.

#### Scenario: Chọn rồi phá

- **WHEN** ở chế độ Phá rào, người chơi chạm gần một rào rồi bấm "Phá rào"
- **THEN** rào đó bị phá và người chơi hết lần phá

#### Scenario: Đổi ý

- **WHEN** ở chế độ Phá rào, người chơi đã chọn một rào rồi đổi về chế độ Đi quân
- **THEN** không có rào nào bị phá và vẫn còn lần phá

### Requirement: Vòng đời rào xem trước

Chế độ và rào xem trước SHALL gắn với thế cờ hiện tại. Khi thế cờ đổi, kể cả do hoàn tác, ván mới hay máy chơi thay, và khi ván kết thúc dù trong hay ngoài luật, rào xem trước SHALL bị bỏ và chế độ trở về Đi quân. Khi tạm không đi được mà thế cờ không đổi (mất kết nối, đang nối lại), rào xem trước và chế độ MUST được giữ; nút xác nhận SHALL có lý do và không bấm được. Đã bấm xác nhận online thì rào SHALL hiện dạng đang gửi tới khi có trả lời; bị từ chối thì rào xem trước còn nguyên.

#### Scenario: Mất kết nối khi đang xem trước

- **WHEN** rào xem trước đang hiện và kết nối bị ngắt rồi nối lại mà không có nước mới
- **THEN** rào xem trước và hướng của nó vẫn còn, và đặt được sau khi nối lại

#### Scenario: Hoàn tác khi đang xem trước

- **WHEN** rào xem trước đang hiện và người chơi bấm "Hoàn tác"
- **THEN** rào xem trước biến mất và chế độ là Đi quân

#### Scenario: Ván kết thúc khi đang xem trước

- **WHEN** rào xem trước hoặc rào đang gửi đang hiện và đối thủ đầu hàng hay bị xử bỏ ván
- **THEN** rào đó biến mất, bàn chỉ còn những rào đã đặt

#### Scenario: Ván mới sau ván đã kết thúc

- **WHEN** ván kết thúc trước khi ai đi nước nào, với rào xem trước đang hiện, rồi người chơi bấm "Ván mới"
- **THEN** không còn rào xem trước và chế độ là Đi quân

#### Scenario: Ván mới khi chưa có gì đổi

- **WHEN** ván chưa kết thúc, chưa ai đi nước nào, và người chơi bấm "Ván mới"
- **THEN** thế cờ giống hệt trước nên rào xem trước và chế độ đang chọn được giữ

#### Scenario: Rào đang gửi không nháy

- **WHEN** trong ván online, người chơi bấm "Đặt rào" và trả lời của server tới sau 1 giây
- **THEN** trong suốt thời gian đó rào vẫn hiện, và sau đó hiện như rào đã đặt

#### Scenario: Nước bị từ chối

- **WHEN** server từ chối nước đặt rào
- **THEN** rào xem trước vẫn còn ở chỗ cũ để người chơi chọn lại

### Requirement: Bảng người chơi của Cờ rào

Bảng người chơi SHALL cho biết với mỗi người: số rào còn lại, còn hay đã dùng lần phá, và số bước trên đường ngắn nhất về đích. Dòng này MUST NOT làm đổi chiều cao bảng khi lượt chuyển sang người khác.

#### Scenario: Thông tin người chơi

- **WHEN** Minh còn 5 rào, đã dùng lần phá và đường ngắn nhất về đích dài 7 bước
- **THEN** dòng của Minh trên bảng người chơi cho biết còn 5 rào, đã phá rào và 7 bước

### Requirement: Bàn quay theo người chơi

Trong ván hai người, khi thiết bị chơi ghế thứ hai (đấu với máy, online), bàn SHALL quay 180° để quân của người đó bắt đầu ở cạnh dưới màn hình. Ván ba, bốn người và chơi cùng máy MUST giữ nguyên hướng bàn. Tên hàng cột SHALL gắn với bàn, không đổi theo hướng quay, để hai người nói về cùng một ô.

#### Scenario: Ghế thứ hai online

- **WHEN** người ngồi ghế thứ hai trong phòng hai người xem bàn
- **THEN** quân của người đó ở cạnh dưới màn hình, và một ô được gọi cùng một tên trên màn hình của cả hai người

#### Scenario: Ván ba người không quay

- **WHEN** người ngồi ghế thứ ba trong phòng ba người xem bàn
- **THEN** bàn giữ hướng như của ghế đầu

#### Scenario: Ván bốn người không quay

- **WHEN** người ngồi ghế thứ hai trong phòng bốn người xem bàn
- **THEN** bàn giữ hướng như của ghế đầu, và cổng đích của người đó có màu và ký hiệu của người đó

### Requirement: Dùng được bằng bàn phím

Mọi nước đi SHALL làm được bằng bàn phím, Enter hoặc Space để đi hay xác nhận. Đi quân: mũi tên SHALL di chuyển giữa các ô. Đặt rào: mũi tên SHALL dời con trỏ giữa các vị trí rào, R xoay. Phá rào: mũi tên SHALL nhảy giữa các rào đã có, PageUp và PageDown đi vòng qua mọi rào. Esc SHALL về Đi quân. Mũi tên SHALL theo hướng trên màn hình kể cả khi bàn đã quay. Sau nước đi bằng bàn phím, tiêu điểm MUST còn trên bàn, trừ khi người chơi đã chuyển nó ra ngoài bàn và hàng điều khiển, như sang ô chat.

#### Scenario: Đi quân bằng bàn phím

- **WHEN** tiêu điểm ở trên bàn và người chơi dùng mũi tên tới một ô đi được rồi nhấn Enter
- **THEN** quân đi tới ô đó

#### Scenario: Đặt rào bằng bàn phím

- **WHEN** ở chế độ Đặt rào, người chơi dùng mũi tên, nhấn R rồi Enter
- **THEN** rào được đặt ở vị trí và hướng con trỏ đang chỉ, nếu hợp lệ

#### Scenario: Tiêu điểm sau khi đặt rào

- **WHEN** người chơi đặt xong một rào bằng bàn phím
- **THEN** tiêu điểm ở ô có quân của người vừa đặt rào, không rơi ra ngoài trang

#### Scenario: Tiêu điểm khi nước đang gửi

- **WHEN** người chơi nhấn Enter ở lớp phủ và server chưa trả lời
- **THEN** tiêu điểm vẫn ở lớp phủ, chế độ vẫn là Đặt rào hoặc Phá rào, và R, mũi tên, Esc chưa có tác dụng

#### Scenario: Tiêu điểm khi nước bị từ chối

- **WHEN** người chơi nhấn Enter ở lớp phủ và server từ chối nước đó
- **THEN** tiêu điểm vẫn ở lớp phủ, chế độ không đổi, và R, mũi tên, Esc dùng lại được

#### Scenario: Esc trên thiết bị dùng chung

- **WHEN** chơi cùng máy, người chơi nhấn Esc hoặc dùng bàn phím bấm "Đi quân"
- **THEN** tiêu điểm tới ô có quân của người đang tới lượt, không phải của người vừa đi

#### Scenario: Giữ phím không đi thêm nước

- **WHEN** chơi cùng máy, người chơi giữ Enter hoặc Space trên một ô đi được hoặc trên lớp phủ
- **THEN** chỉ một nước được đi, người kế tiếp không bị đi thay

#### Scenario: Tới được mọi rào để phá

- **WHEN** ở chế độ Phá rào, người chơi nhấn PageDown hoặc PageUp liên tiếp, kể cả khi bàn đã quay và khi có rào mũi tên không nhảy tới được từ các rào khác
- **THEN** con trỏ qua lần lượt mọi rào trên bàn, và tên đọc của lớp phủ nói hai phím đó

#### Scenario: Phá rào bằng bàn phím

- **WHEN** ở chế độ Phá rào, người chơi nhấn mũi tên phải
- **THEN** con trỏ tới rào đã có gần nhất về bên phải, không dừng ở các vị trí trống

### Requirement: Dùng được bằng trình đọc màn hình

Mỗi ô SHALL có tên đọc gồm tên ô, các quân trong ô, những cạnh bị rào, và ô đó có đi được không. Vị trí rào SHALL được gọi theo các ô bị ngăn cách. Rào xem trước, số bước đổi và lý do không hợp lệ SHALL được đọc lên bằng chữ, không đọc chồng lên dòng lượt. Nước vừa đi SHALL có trong tên đọc của ô liên quan.

#### Scenario: Đọc rào quanh ô

- **WHEN** ô C5 có quân của một ghế, có rào ở cạnh trên và đang đi được
- **THEN** tên đọc của ô cho biết C5, quân theo màu của ghế, hoặc "Bạn" nếu là người ở thiết bị, rào phía trên và đi được

#### Scenario: Đọc lý do

- **WHEN** con trỏ tới vị trí có rào không hợp lệ
- **THEN** trình đọc màn hình nhận được vị trí rào và lý do bằng chữ

### Requirement: Dùng được trên điện thoại

Ở khung 360 × 740, trong ván 2 và 4 người chơi trên một thiết bị, bàn, dòng lượt, hàng điều khiển và nút "Ván mới" SHALL nằm trong màn hình mà không cần cuộn; online thì bàn, dòng lượt và hàng điều khiển. Bàn MUST NOT gây cuộn ngang. Vùng chạm của ô đi được và các nút SHALL từ 24 × 24 px trở lên. Trong khi đặt hoặc phá rào, một ngón tay kéo trên bàn MUST NOT cuộn trang; hai ngón vẫn phóng to được; vuốt ngoài bàn vẫn cuộn. Ở chế độ Đi quân, trang SHALL cuộn như thường.

#### Scenario: Hai người ở 360 × 740

- **WHEN** ván 2 người cùng máy mở ở khung 360 × 740
- **THEN** không có cuộn ngang, và bàn, dòng lượt, hàng điều khiển, nút "Ván mới" nằm trọn trong màn hình

#### Scenario: Bốn người ở 360 × 740

- **WHEN** ván 4 người cùng máy mở ở khung 360 × 740
- **THEN** không có cuộn ngang, và bàn, dòng lượt, hàng điều khiển, nút "Ván mới" nằm trọn trong màn hình

#### Scenario: Vùng chạm ở khung thấp

- **WHEN** ván 2 người mở ở khung 844 × 300, ô nhỏ hơn 24 px
- **THEN** vùng chạm của mỗi ô đi được vẫn từ 24 × 24 px trở lên

#### Scenario: Kéo để dời rào

- **WHEN** ở chế độ Đặt rào trên điện thoại, người chơi đặt một ngón tay lên bàn rồi kéo
- **THEN** rào xem trước đi theo ngón tay và trang không cuộn

#### Scenario: Nhãn nổi ở mép bàn

- **WHEN** ở điện thoại rộng 360 px, người chơi kéo rào về sát mép trái hoặc mép phải của bàn
- **THEN** nhãn nổi nằm trọn trong màn hình, câu dài thì xuống dòng, và trang không cuộn ngang

#### Scenario: Hai ngón vẫn phóng to

- **WHEN** ở chế độ Đặt rào, người chơi dùng hai ngón trên bàn
- **THEN** trang phóng to và rào xem trước không đổi

#### Scenario: Bàn đứng yên khi có nước đối thủ

- **WHEN** ván online 2 người ở 360 × 740, đối thủ đi một nước làm dòng lượt dài thành hai dòng
- **THEN** bàn không dịch chuyển

### Requirement: Đọc nước đi và kết quả

Nước vừa đi SHALL được nói bằng chữ: đi tới ô nào, đặt rào ngăn những ô nào, phá rào ở đâu. Khi có người chơi cụ thể ở thiết bị (đấu với máy, online), dòng lượt SHALL nói nước của người khác; chơi cùng máy, dòng dưới bàn SHALL nói và được đọc lên cho trình đọc màn hình. Thẻ kết quả SHALL nói người thắng về đích, hoặc thắng hay hoà vì hết lượt.

#### Scenario: Đọc nước đặt rào

- **WHEN** đối thủ vừa đặt một rào ngăn hàng 4 và 5 ở cột C–D
- **THEN** dòng lượt nói người đó đặt rào giữa hàng 4 và 5, cột C–D

#### Scenario: Cùng máy

- **WHEN** chơi cùng máy và ghế trước vừa đi tới E9
- **THEN** dòng dưới bàn nói ghế đó, theo màu, vừa đi tới E9

#### Scenario: Có người chơi cụ thể ở thiết bị

- **WHEN** đấu với máy hoặc online, người khác vừa đi một nước
- **THEN** dòng lượt nói nước đó, còn dòng dưới bàn không lặp lại

#### Scenario: Kết quả hết lượt

- **WHEN** ván kết thúc vì hết 200 nước và một ghế gần đích hơn
- **THEN** tiêu đề thẻ kết quả nói người thắng như mọi game ("Bạn thắng!", tên người, hoặc màu khi chơi cùng máy), còn dòng chi tiết nói ghế đó, theo màu, gần đích hơn khi hết 200 nước, kèm số bước còn lại của mỗi ghế
