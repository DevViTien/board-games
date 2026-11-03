# ludo Specification

## Purpose

Luật và cách chơi Cờ cá ngựa 2–4 người theo bộ luật đã chốt: gieo một xúc xắc rồi chọn ngựa, ra quân bằng 6, gieo 6 được gieo thêm, không vượt ngựa, đá ngựa đối thủ, gieo 1 nhảy tới chân chuồng kế tiếp, lên chuồng đích theo bậc, thắng khi chiếm bậc 3–6; máy chơi Cờ cá ngựa; bàn cờ trên màn hình (gieo, chọn ngựa, bàn phím, trình đọc màn hình, hiệu ứng, điện thoại) và chơi online.

## Requirements

### Requirement: Bàn và người chơi

Cờ cá ngựa SHALL cho 2–4 người, mỗi người một màu theo chiều đi (Đỏ, Xanh dương, Vàng, Xanh lá), mỗi màu có một ký hiệu riêng, và mỗi người 4 ngựa bắt đầu trong chuồng. Ván 2 người SHALL dùng hai màu ở hai góc đối diện; ván 3 người dùng ba màu đầu. Người ở ghế đầu SHALL đi trước, rồi lần lượt theo chiều đi. Game SHALL hỗ trợ đấu với máy.

#### Scenario: Ván 4 người mới

- **WHEN** tạo một ván Cờ cá ngựa 4 người
- **THEN** có bốn màu Đỏ, Xanh dương, Vàng, Xanh lá, mỗi màu 4 ngựa trong chuồng, và đến lượt Đỏ gieo xúc xắc

#### Scenario: Ván 2 người ngồi đối diện

- **WHEN** tạo một ván Cờ cá ngựa 2 người
- **THEN** hai người cầm Đỏ và Vàng, hai màu ở hai góc đối diện của bàn

#### Scenario: Thứ tự lượt

- **WHEN** trong ván 3 người, Đỏ gieo được 3 và đi xong
- **THEN** đến lượt Xanh dương, rồi tới Vàng, rồi quay lại Đỏ

### Requirement: Đường đi

Đường chung SHALL là một vòng khép kín 56 ô mà mọi ngựa đi cùng một chiều. Mỗi màu có một ô xuất phát; ô xuất phát của hai màu kề nhau cách nhau 14 ô. Ô chân chuồng của một màu là ô ngay trước ô xuất phát của màu đó; từ chân chuồng của mình ngựa lên chuồng đích riêng gồm 6 bậc. Ngựa MUST NOT đi quá chân chuồng của mình, nên mỗi ngựa chỉ đi đúng một vòng.

#### Scenario: Đi tới chân chuồng của mình

- **WHEN** một ngựa Đỏ cách chân chuồng của Đỏ 3 ô, đường trống, và Đỏ gieo được 3
- **THEN** ngựa đó chọn được và đi tới chân chuồng của Đỏ, chưa lên bậc nào

#### Scenario: Không đi quá chân chuồng

- **WHEN** ngựa Đỏ duy nhất ngoài chuồng cách chân chuồng của Đỏ 2 ô và Đỏ gieo được 5
- **THEN** ngựa đó không đi được

### Requirement: Gieo rồi chọn ngựa

Mỗi lượt SHALL bắt đầu bằng một lần gieo một xúc xắc sáu mặt, mỗi mặt khả năng như nhau, kết quả do bộ sinh ngẫu nhiên của nơi chạy ván tạo; sau đó người đó SHALL chọn một ngựa đi được theo số vừa gieo. Người chơi MUST NOT chọn ngựa trước khi gieo, MUST NOT chọn số chấm và MUST NOT bỏ lượt khi còn ngựa đi được.

#### Scenario: Lượt bắt đầu bằng gieo

- **WHEN** đến lượt một người chưa gieo
- **THEN** nước đi duy nhất của người đó là gieo xúc xắc, với sáu kết quả 1–6 khả năng như nhau

#### Scenario: Sau khi gieo chỉ chọn ngựa

- **WHEN** Đỏ vừa gieo được 4 và có hai ngựa đi được
- **THEN** các nước đi của Đỏ là đúng hai lựa chọn ngựa đó, không có gieo lại hay bỏ lượt

### Requirement: Mất lượt

Gieo xong mà không ngựa nào đi được theo số vừa gieo, lượt SHALL chuyển ngay cho người kế tiếp mà người chơi không phải chọn gì, trừ khi được gieo thêm. Kết quả gieo đó vẫn SHALL được ghi vào ván để mọi người thấy.

#### Scenario: Mọi ngựa còn trong chuồng

- **WHEN** mọi ngựa của Đỏ còn trong chuồng và Đỏ gieo được 3
- **THEN** đến lượt Xanh dương gieo, và ván ghi lại lần gieo 3 của Đỏ

### Requirement: Gieo 6 được gieo thêm

Gieo được 6 SHALL cho người đó gieo thêm một lần sau khi đi ngựa, hoặc ngay sau lần gieo đó nếu không ngựa nào đi được. Gieo số khác thì lượt SHALL chuyển cho người kế tiếp sau khi đi.

#### Scenario: Gieo 6 rồi gieo thêm

- **WHEN** Đỏ gieo được 6 và cho một ngựa ra chuồng
- **THEN** vẫn đến lượt Đỏ gieo

#### Scenario: Gieo 6 không đi được vẫn gieo thêm

- **WHEN** Đỏ gieo được 6 mà không ngựa nào đi được
- **THEN** vẫn đến lượt Đỏ gieo

#### Scenario: Số khác thì chuyển lượt

- **WHEN** Đỏ gieo được 5 và đi một ngựa
- **THEN** đến lượt người kế tiếp gieo

### Requirement: Ra quân

Ngựa trong chuồng SHALL chỉ ra được khi gieo 6, tới ô xuất phát của màu mình. Khi ô xuất phát đang có ngựa mình, ngựa trong chuồng MUST NOT ra; khi ô đó có ngựa đối thủ, ngựa đối thủ SHALL bị đá về chuồng.

#### Scenario: Gieo 6 ra quân

- **WHEN** Đỏ có ngựa trong chuồng, ô xuất phát của Đỏ trống và Đỏ gieo được 6
- **THEN** Đỏ chọn được cho một ngựa ra ô xuất phát của Đỏ

#### Scenario: Gieo số khác không ra quân

- **WHEN** Đỏ có ngựa trong chuồng và gieo được 5
- **THEN** không ngựa nào trong chuồng của Đỏ chọn được

#### Scenario: Ô xuất phát có ngựa mình

- **WHEN** một ngựa Đỏ đứng ở ô xuất phát của Đỏ và Đỏ gieo được 6
- **THEN** không ngựa nào trong chuồng của Đỏ chọn được

#### Scenario: Ra quân đá ngựa đối thủ

- **WHEN** một ngựa Vàng đứng ở ô xuất phát của Đỏ và Đỏ gieo được 6 rồi cho một ngựa ra
- **THEN** ngựa Đỏ đứng ở ô xuất phát và ngựa Vàng đó về chuồng của Vàng

### Requirement: Đi trên đường chung

Ngựa trên đường chung SHALL đi đúng số ô bằng số vừa gieo, trừ trường hợp gieo 1 có luật nhảy riêng. Ngựa MUST NOT vượt qua bất kỳ ngựa nào đứng ở các ô ở giữa, của mình hay của đối thủ, và MUST NOT dừng ở ô có ngựa mình. Dừng đúng ô có ngựa đối thủ SHALL đá ngựa đó về chuồng.

#### Scenario: Đi đúng số ô

- **WHEN** một ngựa Đỏ ở ô thứ 10 tính từ ô xuất phát của Đỏ, năm ô phía trước trống, và Đỏ gieo được 5
- **THEN** ngựa đó đi tới ô thứ 15

#### Scenario: Không vượt ngựa đối thủ

- **WHEN** một ngựa Xanh dương đứng cách ngựa Đỏ 2 ô phía trước và Đỏ gieo được 4
- **THEN** ngựa Đỏ đó không đi được

#### Scenario: Không vượt ngựa mình

- **WHEN** hai ngựa Đỏ đứng cách nhau 2 ô và Đỏ gieo được 4
- **THEN** ngựa Đỏ phía sau không đi được

#### Scenario: Không đứng chung ô với ngựa mình

- **WHEN** hai ngựa Đỏ đứng cách nhau 4 ô, ô ở giữa trống, và Đỏ gieo được 4
- **THEN** ngựa Đỏ phía sau không đi được

#### Scenario: Đá ngựa đối thủ

- **WHEN** một ngựa Vàng đứng cách ngựa Đỏ 4 ô phía trước, ô ở giữa trống, Đỏ gieo được 4 và đi ngựa đó
- **THEN** ngựa Đỏ đứng ở ô của ngựa Vàng và ngựa Vàng về chuồng của Vàng

### Requirement: Gieo 1 nhảy tới chân chuồng kế tiếp

Gieo 1, ngựa trên đường chung chưa tới chân chuồng của mình SHALL nhảy tới ô chân chuồng gần nhất phía trước (của bất kỳ màu nào, kể cả màu không có người chơi; xa nhất là chân chuồng của chính nó), nếu mọi ô ở giữa đều trống và ô đó không có ngựa mình; ngựa đối thủ ở ô đó bị đá. Nhảy được thì ngựa MUST nhảy; không nhảy được thì ngựa SHALL đi 1 ô theo luật thường.

#### Scenario: Nhảy khi đường trống

- **WHEN** một ngựa Đỏ cách chân chuồng gần nhất phía trước 9 ô, tám ô ở giữa trống, và Đỏ gieo được 1
- **THEN** ngựa đó có đúng một cách đi là nhảy tới ô chân chuồng đó

#### Scenario: Đường bị chắn thì đi 1 ô

- **WHEN** một ngựa Xanh dương đứng giữa ngựa Đỏ và chân chuồng gần nhất phía trước, cách ngựa Đỏ 3 ô, và Đỏ gieo được 1
- **THEN** ngựa Đỏ đó đi 1 ô

#### Scenario: Chân chuồng có ngựa mình thì đi 1 ô

- **WHEN** một ngựa Đỏ đứng ở chân chuồng gần nhất phía trước một ngựa Đỏ khác, các ô ở giữa trống, và Đỏ gieo được 1
- **THEN** ngựa Đỏ phía sau đi 1 ô

#### Scenario: Nhảy tới chân chuồng có ngựa đối thủ

- **WHEN** một ngựa Vàng đứng ở chân chuồng gần nhất phía trước ngựa Đỏ, các ô ở giữa trống, Đỏ gieo được 1 và đi ngựa đó
- **THEN** ngựa Đỏ đứng ở chân chuồng đó và ngựa Vàng về chuồng của Vàng

#### Scenario: Dừng ở chân chuồng của mình

- **WHEN** chân chuồng gần nhất phía trước một ngựa Đỏ là chân chuồng của Đỏ, đường trống, và Đỏ gieo được 1
- **THEN** ngựa đó nhảy tới chân chuồng của Đỏ và chưa lên bậc nào

#### Scenario: Đứng trên một chân chuồng

- **WHEN** một ngựa Đỏ đứng trên chân chuồng của Xanh dương, đường trống, và Đỏ gieo được 1
- **THEN** ngựa đó nhảy tới chân chuồng kế tiếp, cách 14 ô

#### Scenario: Chân chuồng của màu không có người chơi

- **WHEN** trong ván 2 người Đỏ và Vàng, chân chuồng gần nhất phía trước ngựa Đỏ là chân chuồng của Xanh dương, đường trống, và Đỏ gieo được 1
- **THEN** ngựa đó nhảy tới chân chuồng của Xanh dương

### Requirement: Lên chuồng đích

Ngựa ở chân chuồng của mình gieo k SHALL lên thẳng bậc k của chuồng đích nếu các bậc 1 tới k đều trống. Ngựa ở bậc n SHALL chỉ lên bậc n+1 khi gieo đúng n+1 và bậc đó trống; ngựa ở bậc 6 không đi nữa. Trong chuồng đích ngựa MUST NOT vượt qua hay đứng chung bậc với ngựa khác, và ngựa ở đó MUST NOT bị đá.

#### Scenario: Lên thẳng bậc 4

- **WHEN** một ngựa Đỏ ở chân chuồng của Đỏ, chuồng đích của Đỏ trống, và Đỏ gieo được 4
- **THEN** ngựa đó lên bậc 4

#### Scenario: Bậc thấp hơn bị chắn

- **WHEN** một ngựa Đỏ ở chân chuồng của Đỏ, một ngựa Đỏ khác ở bậc 2, và Đỏ gieo được 4
- **THEN** ngựa ở chân chuồng không đi được

#### Scenario: Lên từng bậc

- **WHEN** một ngựa Đỏ ở bậc 3, bậc 4 trống, và Đỏ gieo được 4
- **THEN** ngựa đó lên bậc 4

#### Scenario: Gieo sai số không lên bậc

- **WHEN** một ngựa Đỏ ở bậc 3 và Đỏ gieo được 5
- **THEN** ngựa đó không đi được

#### Scenario: Bậc 6 không đi nữa

- **WHEN** một ngựa Đỏ ở bậc 6 và Đỏ gieo bất kỳ số nào
- **THEN** ngựa đó không đi được

### Requirement: Thắng

Người đầu tiên có đủ 4 ngựa ở các bậc 3, 4, 5 và 6 của chuồng đích SHALL thắng; ván SHALL kết thúc ngay, không còn nước đi nào, và những người còn lại không được xếp hạng.

#### Scenario: Đủ bốn bậc cao

- **WHEN** Đỏ có ngựa ở bậc 4, 5, 6 và ngựa thứ tư ở bậc 2, Đỏ gieo được 3 và đi ngựa ở bậc 2
- **THEN** Đỏ thắng và ván không còn nước đi nào

#### Scenario: Bốn ngựa trong chuồng đích nhưng chưa đủ bậc cao

- **WHEN** Đỏ có ngựa ở bậc 1, 4, 5 và 6
- **THEN** ván chưa kết thúc

### Requirement: Ván luôn đi tiếp và kết thúc

Mỗi trạng thái chưa kết thúc SHALL có ít nhất một nước đi. Với mỗi người chưa thắng, ở mọi thế SHALL có ít nhất một số chấm cho người đó đi được một ngựa, nên không ai bị kẹt mãi. Mọi ván tự chơi ngẫu nhiên với seed cố định, với 2, 3 và 4 người, SHALL kết thúc bằng một người thắng.

#### Scenario: Không ai bị kẹt

- **WHEN** ở bất kỳ thế chờ gieo nào trong các ván tự chơi, người đến lượt chưa thắng
- **THEN** có ít nhất một số từ 1 tới 6 cho người đó đi được một ngựa

#### Scenario: Chuồng đích luôn lên được

- **WHEN** Đỏ có ngựa ở bậc 1, 4, 5 và 6
- **THEN** gieo 2 thì Đỏ đi được ngựa ở bậc 1

#### Scenario: Mọi ván tự chơi đều kết thúc

- **WHEN** chạy các ván tự chơi ngẫu nhiên với seed cố định cho 2, 3 và 4 người
- **THEN** mọi ván đều có người thắng trong giới hạn số nước đặt cho test

### Requirement: Tuỳ chọn luật của Cờ cá ngựa

Cờ cá ngựa SHALL chỉ chơi bộ luật ở các requirement trên. Tuỳ chọn luật nhận từ bên ngoài (đường dẫn bắt đầu ván, yêu cầu tạo phòng, biên bản đã lưu) SHALL được nhận khi là bộ mặc định, khoá thiếu lấy mặc định; khoá lạ hay giá trị khác mặc định MUST bị từ chối với mã `invalid-options`. Màn hình bắt đầu ván MUST NOT có nhóm lựa chọn nào cho luật, và màn hình chơi MUST NOT ghi luật.

#### Scenario: Tuỳ chọn mặc định

- **WHEN** tạo ván Cờ cá ngựa không truyền tuỳ chọn
- **THEN** ván ra quân bằng 6, gieo 6 được gieo thêm, không được vượt ngựa và gieo 1 thì nhảy

#### Scenario: Không có nhóm tuỳ chọn luật

- **WHEN** người chơi mở màn hình bắt đầu ván Cờ cá ngựa
- **THEN** màn hình chỉ có các nhóm chế độ, số người chơi và (khi đấu với máy) mức độ, người đi trước

#### Scenario: Thiếu khoá dùng mặc định

- **WHEN** tạo ván với tuỳ chọn là một object rỗng
- **THEN** ván được tạo với bộ luật mặc định

#### Scenario: Biến thể bị từ chối

- **WHEN** yêu cầu tạo phòng Cờ cá ngựa với điều kiện ra quân "1 hoặc 6"
- **THEN** server từ chối với mã `invalid-options` và không có phòng nào được tạo

#### Scenario: Giá trị lạ bị từ chối

- **WHEN** tạo ván với điều kiện ra quân "5"
- **THEN** hệ thống từ chối với mã lỗi `invalid-options`

### Requirement: Máy chơi Cờ cá ngựa

Ở mọi mức và với 2, 3 hay 4 người, máy SHALL tự gieo khi tới lượt rồi chọn một ngựa đi được. Mức Vừa và Khó SHALL chọn như các scenario dưới đây: thắng ngay khi có, đá ngựa đối thủ (kể cả của người không dẫn đầu), đưa ngựa lên chuồng đích hơn ra quân. Mức Khó còn tính trước các lần gieo sau trong giới hạn thời gian; mức Dễ đôi khi chọn nước kém hơn.

#### Scenario: Máy chọn nước thắng

- **WHEN** ở mức Vừa, máy vừa gieo được số đưa ngựa cuối lên bậc làm đủ bốn bậc 3–6
- **THEN** máy đi nước đó và thắng

#### Scenario: Máy đá ngựa đối thủ

- **WHEN** ở mức Vừa, máy vừa gieo và có thể đá một ngựa đối thủ đã đi xa, hoặc đi một ngựa khác tới ô trống an toàn
- **THEN** máy chọn nước đá ngựa đối thủ

#### Scenario: Máy đá ngựa của người không dẫn đầu

- **WHEN** ở mức Vừa trong ván 4 người, máy có thể đá một ngựa đã đi xa của người đang đứng thứ ba, hoặc đi một ngựa khác tới ô trống an toàn
- **THEN** máy chọn nước đá ngựa đó

#### Scenario: Máy ưu tiên lên chuồng hơn ra quân

- **WHEN** ở mức Vừa, máy gieo được 6, có thể đưa ngựa ở chân chuồng của mình lên bậc 6 hoặc cho một ngựa ra chuồng
- **THEN** máy đưa ngựa lên bậc 6

#### Scenario: Máy mức Khó với bốn người

- **WHEN** ở mức Khó, máy được hỏi nước đi trong ván 4 người đang dở
- **THEN** máy trả về một nước hợp lệ trong giới hạn thời gian

### Requirement: Bàn Cờ cá ngựa

Bàn SHALL vẽ hình chữ thập gồm đường chung, bốn chuồng ở bốn góc, bốn chuồng đích 6 bậc đánh số và các ô chân chuồng có dấu riêng. Mỗi ngựa SHALL phân biệt được bằng cả màu lẫn ký hiệu của màu đó, không chỉ bằng màu. Ngựa vừa đi và kết quả gieo gần nhất, kèm màu của người gieo, SHALL được đánh dấu.

#### Scenario: Phân biệt không chỉ bằng màu

- **WHEN** bàn có ngựa của bốn màu
- **THEN** ngựa của mỗi màu có ký hiệu riêng (tròn, vuông, tam giác, thoi), khác nhau cả khi không nhìn màu

#### Scenario: Đánh dấu nước vừa đi

- **WHEN** Xanh dương vừa gieo được 4 và đi ngựa 2
- **THEN** ngựa 2 của Xanh dương được đánh dấu là vừa đi và xúc xắc hiện 4 với màu Xanh dương

### Requirement: Gieo và chọn ngựa trên bàn

Khi người ở thiết bị này đến lượt gieo, bàn SHALL có nút "Gieo xúc xắc". Sau khi gieo, bàn SHALL cho chọn đúng những ngựa đi được, mỗi lựa chọn nói ngựa nào và sẽ tới đâu (kể cả ngựa bị đá), và chỉ ra ô đích trên bàn khi trỏ hay đưa tiêu điểm tới. Ngựa không đi được MUST NOT chọn được. Bàn SHALL báo kết quả gieo, mất lượt và được gieo thêm; gieo 6 mà không ngựa nào đi được SHALL được báo là được gieo thêm, không phải mất lượt.

#### Scenario: Gieo xúc xắc

- **WHEN** đến lượt Đỏ gieo trong ván cùng máy và người chơi bấm "Gieo xúc xắc"
- **THEN** bàn hiện số vừa gieo

#### Scenario: Chọn ngựa

- **WHEN** Đỏ vừa gieo được 6, có một ngựa trong chuồng và một ngựa trên đường đi được 6 ô tới ô có ngựa Vàng
- **THEN** bàn có hai lựa chọn: cho ngựa ra chuồng, và đi ngựa trên đường kèm việc đá ngựa Vàng

#### Scenario: Báo mất lượt

- **WHEN** Đỏ gieo được 3 mà không ngựa nào đi được
- **THEN** bàn báo Đỏ gieo được 3 và mất lượt

#### Scenario: Gieo 6 không đi được

- **WHEN** Đỏ gieo được 6 mà không ngựa nào đi được
- **THEN** bàn báo Đỏ gieo được 6, không đi được và được gieo thêm, không báo mất lượt

#### Scenario: Ô đích khi đưa tiêu điểm

- **WHEN** người chơi đưa tiêu điểm tới lựa chọn một ngựa
- **THEN** ngựa đó và ô đích của nó được làm nổi bật trên bàn

### Requirement: Cờ cá ngựa bằng bàn phím và trình đọc màn hình

Gieo và chọn ngựa SHALL làm được hoàn toàn bằng bàn phím. Sau khi gieo bằng bàn phím, tiêu điểm SHALL tới lựa chọn ngựa đầu tiên; sau khi đi hay mất lượt, tiêu điểm MUST ở lại trên nút gieo. Vị trí mọi ngựa (trong chuồng, ô thứ mấy tính từ ô xuất phát của nó, chân chuồng, bậc mấy) SHALL đọc được bằng trình đọc màn hình. Kết quả gieo của người ở thiết bị này SHALL được tự đọc, và mỗi lần gieo hay nước đi MUST NOT được đọc hai lần.

#### Scenario: Gieo và đi bằng bàn phím

- **WHEN** người chơi dùng Tab tới nút "Gieo xúc xắc", nhấn Enter, và có ngựa đi được
- **THEN** tiêu điểm ở lựa chọn ngựa đầu tiên, nhấn Enter thì ngựa đó đi và tiêu điểm về nút gieo

#### Scenario: Đọc vị trí ngựa

- **WHEN** trình đọc màn hình đọc danh sách vị trí ngựa khi ngựa 1 của Đỏ ở ô thứ 17
- **THEN** danh sách có "Đỏ, ngựa 1: ô 17"

### Requirement: Hiệu ứng gieo và đi quân

Kết quả gieo SHALL hiện bằng hiệu ứng xúc xắc lăn và ngựa SHALL đi qua từng ô tới đích; máy MUST NOT đi nước kế tiếp trước khi hiệu ứng của nước trước kết thúc. Khi hệ thống bật giảm chuyển động, bàn MUST hiện ngay kết quả và vị trí mới, không hiệu ứng. Thay đổi mới tới giữa chừng SHALL kết thúc ngay hiệu ứng đang chạy. Hiệu ứng MUST NOT tự khoá bàn.

#### Scenario: Giảm chuyển động

- **WHEN** hệ thống bật giảm chuyển động và Đỏ đi một ngựa 5 ô
- **THEN** ngựa hiện ngay ở ô đích, không đi qua từng ô

#### Scenario: Cập nhật mới giữa hiệu ứng

- **WHEN** ngựa đang đi từng ô thì có nước mới tới
- **THEN** ngựa hiện ngay ở ô đích của nước trước và hiệu ứng của nước mới bắt đầu

### Requirement: Bàn Cờ cá ngựa vừa màn hình điện thoại

Ở khung rộng 360 px, bàn, xúc xắc, nút gieo và các lựa chọn ngựa SHALL hiện trọn chiều ngang mà không cuộn ngang, và nút gieo cùng mỗi lựa chọn ngựa SHALL đủ lớn để chạm chính xác bằng ngón tay.

#### Scenario: Bàn 4 người trên điện thoại hẹp

- **WHEN** người chơi mở ván Cờ cá ngựa 4 người ở khung rộng 360 px
- **THEN** trang không cuộn ngang và người chơi chạm được nút gieo và từng lựa chọn ngựa

### Requirement: Nhãn nước đi Cờ cá ngựa

Lời báo trên màn hình chơi về nước vừa đi SHALL nói được lần gieo (số chấm, kèm mất lượt, hay không đi được nhưng được gieo thêm khi gieo 6) và nước ngựa (ngựa số mấy ra chuồng, tới ô nào hay chân chuồng, lên bậc mấy, kèm ngựa màu nào bị đá nếu có), theo tên màu của người đi.

#### Scenario: Máy gieo rồi mất lượt

- **WHEN** trong ván đấu với ba máy, máy Xanh lá gieo được 3, mất lượt, và tới lượt người chơi cầm Đỏ
- **THEN** màn hình báo "Máy (Xanh lá) gieo được 3, mất lượt. Đến lượt bạn (Đỏ)"

#### Scenario: Máy gieo 6 không đi được

- **WHEN** trong ván đấu với ba máy, máy Xanh dương gieo được 6 mà không ngựa nào đi được
- **THEN** lời báo nêu "Máy (Xanh dương) gieo được 6, không đi được, được gieo thêm" và máy Xanh dương đang nghĩ

#### Scenario: Đối thủ đá ngựa

- **WHEN** trong ván online, đối thủ tên "Minh" đi ngựa 2 tới ô 17 và đá ngựa Đỏ của người chơi, rồi tới lượt người chơi
- **THEN** lời báo cho biết Minh vừa đi ngựa 2 tới ô 17, đá ngựa Đỏ, và đến lượt người chơi

### Requirement: Cờ cá ngựa online

Phòng Cờ cá ngựa SHALL có số ghế bằng số người chọn khi tạo phòng (2–4). Mọi lần gieo trong phòng SHALL do server gieo khi nhận nước gieo của người đang đến lượt; client MUST NOT gửi hay chọn số chấm, và mọi người trong phòng SHALL thấy cùng kết quả.

#### Scenario: Hai người cùng thấy một lần gieo

- **WHEN** trong phòng Cờ cá ngựa hai người, người đến lượt bấm "Gieo xúc xắc"
- **THEN** cả hai người thấy cùng một số trên xúc xắc

#### Scenario: Số chấm gửi kèm không có tác dụng

- **WHEN** một client gửi nước gieo có kèm số chấm 6 muốn ra, trong lúc bộ sinh ngẫu nhiên của server cho 2
- **THEN** ván ghi lần gieo ra 2
