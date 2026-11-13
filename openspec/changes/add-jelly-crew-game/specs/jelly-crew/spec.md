## ADDED Requirements

### Requirement: Bản đồ và người chơi

Đội gom thạch SHALL chơi được với 2, 3 hoặc 4 người, cùng phe, không có máy chơi. Tuỳ chọn `map` SHALL là một trong tám bản đồ, xếp từ dễ tới khó: `kitchen` (mặc định), `dessert-shop`, `market`, `coconut-grove`, `cold-store`, `floating-market`, `jelly-factory`, `moon-festival`; mỗi bản đồ có một bố cục riêng cho từng số người, rộng tối đa 19 cột × 13 hàng. Mỗi người SHALL có một nhân vật đặt ở ô xuất phát của bố cục. Tuỳ chọn khác MUST bị từ chối với `invalid-options`.

#### Scenario: Ván hai người trên bản đồ mặc định

- **WHEN** một ván Đội gom thạch được tạo cho 2 người mà không truyền tuỳ chọn
- **THEN** ván dùng bố cục 2 người của "Hai gian bếp", có đúng hai nhân vật ở hai ô xuất phát, và cả hai người đều có nước đi hợp lệ

#### Scenario: Mỗi số người một bố cục

- **WHEN** ván "Chợ đêm" được tạo lần lượt cho 2, 3 và 4 người
- **THEN** mỗi ván có đúng số nhân vật bằng số người, và không bố cục nào rộng quá 19 cột hay cao quá 13 hàng

#### Scenario: Tuỳ chọn lạ

- **WHEN** ván được tạo với `map` là `"castle"`
- **THEN** hệ thống từ chối với mã lỗi `invalid-options`

### Requirement: Đi tự do

Đội gom thạch SHALL là game đi tự do: không có lượt, không giới hạn số bước hay số vòng; mỗi người đi nhân vật của mình bất cứ lúc nào, mỗi bước một ô theo bốn hướng. Mỗi nước SHALL nêu ghế của nó, và nước hợp lệ gồm bước và đặt lại của mọi ghế. Bước bị chặn MUST NOT là nước đi hợp lệ.

#### Scenario: Hai người đi xen nhau

- **WHEN** trong ván hai người, người thứ nhất đi ba bước liền rồi người thứ hai đi một bước
- **THEN** cả bốn bước đều hợp lệ, không có "Xong lượt", và số bước của cả đội là 4

#### Scenario: Bước bị chặn

- **WHEN** ô trước mặt nhân vật thứ hai là tường
- **THEN** bước theo hướng đó của người thứ hai không có trong các nước hợp lệ, còn các bước của người thứ nhất vẫn có

### Requirement: Đi và đẩy thạch

Một bước SHALL đưa nhân vật sang ô kề. Ô đó có thạch thì nhân vật đẩy khối thạch ấy, cùng mọi khối mà nó đẩy vào, đi một ô. Bước MUST bị chặn khi nhân vật hay một ô của khối bị đẩy sẽ ra ngoài bàn, vào tường, vào cửa đóng hay vào ô có nhân vật khác. Nhân vật MUST NOT đi vào ô có nhân vật khác và không đẩy được nhân vật.

#### Scenario: Đẩy cả dãy

- **WHEN** nhân vật đẩy một thạch dâu đang nằm sát một thạch xoài, phía sau là ô trống
- **THEN** cả hai khối cùng đi một ô và nhân vật vào ô cũ của thạch dâu

#### Scenario: Nhân vật khác chặn khối bị đẩy

- **WHEN** nhân vật thứ nhất đẩy một khối thạch về phía ô có nhân vật thứ hai
- **THEN** bước đó bị chặn: không có trong các nước hợp lệ

#### Scenario: Không đi vào nhân vật khác

- **WHEN** nhân vật thứ hai đứng ngay bên phải nhân vật thứ nhất
- **THEN** nhân vật thứ nhất không bước sang phải được

### Requirement: Thạch dính nhau

Sau mỗi bước, hai ô thạch kề nhau theo cạnh SHALL dính thành một khối khi cùng loại, hoặc khi một trong hai là sương sáo và ô kia là thạch không phải đá viên. Đá viên MUST NOT dính gì. Khối đã dính MUST NOT tách ra. Thạch không dính vào nhân vật, tường, nút hay cửa.

#### Scenario: Cùng màu dính lại

- **WHEN** một thạch dâu bị đẩy tới sát một thạch dâu khác
- **THEN** hai ô thành một khối; lần đẩy sau đẩy cả khối

#### Scenario: Đá viên không dính

- **WHEN** một đá viên bị đẩy tới sát một thạch dâu
- **THEN** hai khối vẫn riêng; đẩy thạch dâu đi chỗ khác thì đá viên đứng yên

### Requirement: Nút và cửa

Mỗi cửa SHALL thuộc một nhóm có ký hiệu (●, ▲ hoặc ■) và mở khi có nhân vật hay ô thạch đứng trên ít nhất một nút cùng nhóm, hoặc khi chính ô cửa đang có nhân vật hay thạch (cửa bị kẹt). Một bước SHALL được xét theo cửa trước bước đó; sau bước, cửa được tính lại. Cửa đóng MUST chặn như tường với mọi thứ muốn đi hay bị đẩy vào nó.

#### Scenario: Đứng trên nút thì cửa mở

- **WHEN** nhân vật thứ hai bước lên nút ●
- **THEN** mọi cửa ● mở, và nhân vật thứ nhất đi hay đẩy thạch qua cửa ● được

#### Scenario: Thạch giữ nút

- **WHEN** một khối thạch bị đẩy lên nút ▲ và không có nhân vật nào trên nút ▲
- **THEN** cửa ▲ mở

#### Scenario: Rời nút thì cửa đóng

- **WHEN** nhân vật duy nhất trên nút ● bước ra khỏi nút, và không có gì trong các cửa ●
- **THEN** cửa ● đóng và không ai đi vào cửa ● được nữa

#### Scenario: Thạch kẹt trong cửa

- **WHEN** một thạch dâu nằm trong cửa ● và nhân vật cuối cùng rời nút ●
- **THEN** cửa có thạch vẫn mở, và đẩy thạch dâu ra khỏi cửa được; khi cửa trống và không ai giữ nút ●, cửa đóng

#### Scenario: Bước từ nút vào cửa của nó

- **WHEN** nhân vật đứng trên nút ●, ngay cạnh cửa ●, và bước vào cửa ●
- **THEN** bước hợp lệ, và cửa ● vẫn mở vì nhân vật đang ở trong cửa

### Requirement: Thắng khi đầy khuôn

Ván SHALL kết thúc với kết quả thắng cho mọi người, lý do `filled`, ngay sau bước làm mọi ô khuôn có thạch đúng loại. Mỗi loại thạch có khuôn SHALL có đúng bằng số ô thạch như số ô khuôn của loại đó; loại không có khuôn (thường là đá viên) chỉ là vật cản. Ván đã có kết quả MUST NOT còn nước đi hợp lệ. Ván không bao giờ thua theo luật.

#### Scenario: Ô khuôn cuối được lấp

- **WHEN** trong ván ba người, một bước đẩy thạch xoài vào ô khuôn xoài cuối còn trống
- **THEN** ván kết thúc, cả ba người thắng với lý do `filled`, và không còn nước đi hợp lệ

#### Scenario: Sai loại trên khuôn

- **WHEN** mọi ô khuôn có thạch nhưng một ô khuôn dâu có thạch xoài
- **THEN** ván chưa kết thúc

### Requirement: Giới hạn an toàn của ván

Ván SHALL kết thúc không ai thắng, lý do `too-long`, ngay sau nước thứ 3.000 nếu khuôn chưa đầy. Đây là giới hạn để ván và biên bản luôn hữu hạn, không phải luật để chơi; thẻ kết quả SHALL nói rõ đã đi bao nhiêu nước.

#### Scenario: Chạm giới hạn

- **WHEN** ván vừa có nước thứ 3.000 và còn ô khuôn trống
- **THEN** ván kết thúc không ai thắng với lý do `too-long` và không còn nước đi hợp lệ

#### Scenario: Thắng ở nước cuối

- **WHEN** nước thứ 3.000 lấp ô khuôn cuối cùng
- **THEN** ván kết thúc với kết quả thắng `filled`, không phải `too-long`

### Requirement: Đặt lại bản đồ

Mọi người SHALL đặt lại được bản đồ khi nhân vật hay thạch không còn như lúc bắt đầu ván: mọi nhân vật và thạch về chỗ ban đầu. Số bước cả đội đã đi MUST NOT được trả lại. Khi bàn đang như lúc bắt đầu ván, đặt lại không có trong các nước hợp lệ.

#### Scenario: Đặt lại giữa ván

- **WHEN** cả đội đã đi 40 bước và người thứ hai đặt lại bản đồ
- **THEN** mọi nhân vật và thạch về chỗ ban đầu, số bước vẫn là 40, và cả đội đi tiếp được ngay

#### Scenario: Bàn chưa đổi

- **WHEN** ván vừa bắt đầu
- **THEN** đặt lại bản đồ không có trong các nước hợp lệ của ai

### Requirement: Bố cục giải được

Mỗi bố cục SHALL giải được: có một lời giải mẫu mà khi phát lại từ đầu đi đến thắng `filled`, mọi người là người thắng. Mỗi bố cục SHALL cần tới nút và cửa: coi mọi cửa luôn đóng thì bố cục không giải được.

#### Scenario: Phát lại lời giải mẫu

- **WHEN** test phát lại lời giải mẫu của từng bố cục trong 24 bố cục
- **THEN** mỗi lần phát lại kết thúc với kết quả thắng `filled` cho mọi người

#### Scenario: Không thắng khi cửa luôn đóng

- **WHEN** test tìm lời giải cho một bố cục mà coi mọi cửa luôn đóng
- **THEN** không tìm được lời giải

### Requirement: Độ khó và bản đồ tiếp theo

Mỗi bản đồ SHALL có tên và độ khó hiện ở màn bắt đầu ván và trong hộp đổi bản đồ: "Hai gian bếp", "Tiệm chè" (Dễ); "Chợ đêm", "Vườn dừa" (Vừa); "Kho lạnh", "Chợ nổi" (Khó); "Xưởng thạch", "Đêm trăng rằm" (Rất khó). Khi cả đội thắng, game SHALL gợi ý bản đồ kế tiếp theo thứ tự đó ("Bản đồ tiếp: …", capability `new-game-options`), giữ số người. Thắng bản đồ cuối, chạm giới hạn an toàn hay bỏ cuộc thì MUST không có gợi ý.

#### Scenario: Sang bản đồ kế tiếp

- **WHEN** cả đội 3 người thắng ván "Chợ đêm"
- **THEN** thẻ kết quả có nút "Bản đồ tiếp: Vườn dừa", và bấm nút thì ván 3 người trên "Vườn dừa" bắt đầu

#### Scenario: Thắng bản đồ cuối

- **WHEN** cả đội thắng ván "Đêm trăng rằm"
- **THEN** thẻ kết quả không có nút "Bản đồ tiếp", chỉ có "Ván mới" (hay "Chơi lại") và "Đổi bản đồ"

#### Scenario: Bỏ cuộc thì không gợi ý

- **WHEN** ván "Tiệm chè" online dừng vì có người bỏ cuộc
- **THEN** thẻ kết quả không có nút "Bản đồ tiếp"

#### Scenario: Độ khó ở màn bắt đầu ván

- **WHEN** người chơi mở màn bắt đầu ván Đội gom thạch
- **THEN** nhóm "Bản đồ" có tám bản đồ theo thứ tự trên, "Tiệm chè" ghi "Dễ" và "Đêm trăng rằm" ghi "Rất khó"

### Requirement: Hiển thị bàn

Màn hình SHALL vẽ cả bản đồ, không cuộn: tường, sàn, khuôn, nút, cửa đóng và mở, thạch theo loại có ký hiệu riêng, và nhân vật có màu và số ghế 1–4. Nhân vật mà phím mũi tên đang điều khiển (của mình khi online, nhân vật đang chọn khi cùng máy) SHALL có vòng đậm. Bàn MUST NOT tô lượt của ai. Nút và cửa SHALL có ký hiệu nhóm; cửa đóng và mở khác nhau ở hình, không chỉ ở màu.

#### Scenario: Nhân vật của mình

- **WHEN** Lan chơi online với ghế 2
- **THEN** nhân vật số 2 có vòng đậm, các nhân vật khác không có, và khung bàn không mang màu ghế nào

#### Scenario: Cửa mở và đóng

- **WHEN** nhân vật đứng trên nút ●
- **THEN** cửa ● vẽ ở dạng mở, cửa ▲ vẫn ở dạng đóng, mỗi cửa kèm ký hiệu nhóm của nó, và nhân vật trên nút có dấu nhỏ ● cho biết đang giữ nút

### Requirement: Chip của ván

Dưới bàn SHALL có chip ghi số bước cả đội đã đi ("Bước 37") và số ô khuôn đã vừa ("Khuôn 5/8"). MUST NOT có chip lượt hay vòng.

#### Scenario: Chip giữa ván

- **WHEN** cả đội đã đi 37 bước và 5 trong 8 ô khuôn đã vừa
- **THEN** chip ghi "Bước 37" và "Khuôn 5/8"

#### Scenario: Ván xong

- **WHEN** cả đội vừa thắng
- **THEN** chip khuôn ghi đầy

### Requirement: Thao tác

Người chơi SHALL đi bằng phím mũi tên hay WASD (không lặp khi giữ phím), bằng bàn điều khiển bốn hướng, hay bằng vuốt trên bàn. Online, mọi cách đều đi nhân vật của mình. Nút hướng bị chặn MUST NOT bấm được và nói lý do. "Đặt lại bản đồ" SHALL là nút có chữ, hỏi lại trước khi làm. MUST NOT có "Xong lượt", "Lùi bước" hay "Giữ nút".

#### Scenario: Đi bằng phím khi online

- **WHEN** Lan chơi online với ghế 2 và bấm phím mũi tên trái, rồi phím A
- **THEN** nhân vật số 2 đi hai bước sang trái, dù Minh cũng đang đi

#### Scenario: Hướng bị chặn

- **WHEN** phía trên nhân vật đang điều khiển là tường
- **THEN** nút "Lên" không bấm được và nêu lý do là tường

#### Scenario: Đặt lại có hỏi lại

- **WHEN** người chơi bấm "Đặt lại bản đồ"
- **THEN** hộp thoại hỏi lại hiện ra; chọn "Để nguyên" thì bàn không đổi

### Requirement: Chọn nhân vật khi chơi cùng máy

Chơi cùng máy, màn hình SHALL có nhóm radio "Điều khiển" chọn nhân vật mà phím mũi tên, bàn điều khiển và vuốt điều khiển; mặc định là nhân vật 2. Phím 1–4 SHALL chọn nhân vật. Phím WASD SHALL luôn đi nhân vật 1, để hai người chung một bàn phím đi cùng lúc. Màn hình SHALL giữ "Hoàn tác" và "Làm lại" của màn hình chơi.

#### Scenario: Hai người chung bàn phím

- **WHEN** ván hai người chơi cùng máy, một người bấm D và người kia bấm mũi tên trái
- **THEN** nhân vật 1 đi sang phải và nhân vật 2 đi sang trái

#### Scenario: Đổi nhân vật

- **WHEN** ván bốn người chơi cùng máy và người chơi bấm phím 3 rồi mũi tên lên
- **THEN** "Cam" được chọn trong nhóm "Điều khiển" và nhân vật 3 đi lên

### Requirement: Bảng người chơi của Đội gom thạch

Bảng người chơi SHALL ghi tên mỗi ghế theo màu nhân vật ("Lam", "Hồng", "Cam", "Ngọc") kèm hình nhân vật có số, và một dòng ngắn cho ghế đang đứng trên nút ("Giữ nút ●"). Bảng MUST NOT gắn nhãn "Đến lượt" cho ghế nào, và khi cả đội thắng MUST NOT gắn nhãn "Thắng" cho từng ghế.

#### Scenario: Ghế đang giữ nút

- **WHEN** nhân vật số 2 đứng trên nút ▲
- **THEN** ô của ghế Hồng trong bảng người chơi có dòng "Giữ nút ▲" và không ô nào có nhãn "Đến lượt"

### Requirement: Dùng được bằng trình đọc màn hình

Câu đọc một nước SHALL nêu việc đã xảy ra: ai đi, đẩy gì, cửa nào vừa mở hay đóng, số khuôn khi số đó đổi, đặt lại bản đồ. Bước trống của người khác MUST NOT được đọc, để hai người đi liên tục không làm ngợp lời báo. Bước bị chặn SHALL được báo kèm tên nhân vật và lý do. Bàn SHALL có mô tả theo hàng. Màn hình MUST NOT có vùng `role="status"` thứ hai ngoài dòng lượt.

#### Scenario: Báo cửa mở

- **WHEN** Hồng bước lên nút ●
- **THEN** câu đọc nước đó nói Hồng đi một bước và cửa ● mở

#### Scenario: Không đọc bước trống của người khác

- **WHEN** Lan chơi online và Minh đi một bước vào ô trống, không đẩy gì, không đổi cửa
- **THEN** màn hình của Lan không đọc nước đó

#### Scenario: Báo bước bị chặn

- **WHEN** người chơi đi nhân vật Hồng về phía cửa ▲ đang đóng
- **THEN** màn hình báo Hồng không đi được vì cửa ▲ đóng, và ván không đổi

### Requirement: Dùng được trên điện thoại

Ở khung 360 px, bàn SHALL vừa chiều ngang màn hình với mọi bố cục, trang MUST NOT cuộn ngang, và mọi nút điều khiển (cả nhóm "Điều khiển" khi chơi cùng máy) SHALL tới được với vùng chạm ít nhất 44 × 44 px. Khi ván đã xong, kéo trên bàn SHALL cuộn trang như thường.

#### Scenario: Bố cục lớn nhất trên điện thoại

- **WHEN** ván "Kho lạnh" bốn người mở ở khung 360 × 640
- **THEN** cả bản đồ hiện trong chiều ngang màn hình, trang không cuộn ngang và các nút điều khiển bấm được

### Requirement: Đọc nước đi và kết quả

Một nước SHALL được đọc theo việc nó làm, kèm tên nhân vật ("Hồng đi sang trái", "Lam đẩy thạch dâu lên", "Lan đặt lại bản đồ"). Thẻ kết quả SHALL có dòng chi tiết: khi thắng, số bước cả đội đã đi và thời gian từ lúc ván bắt đầu (không có giờ thì chỉ số bước); khi chạm giới hạn an toàn, số nước đã đi.

#### Scenario: Chi tiết khi thắng

- **WHEN** cả đội đầy khuôn sau 87 bước, 7 phút 12 giây kể từ khi ván bắt đầu
- **THEN** thẻ kết quả ghi "Cả đội thắng!" kèm dòng "Đầy khuôn sau 87 bước, 7 phút 12 giây."

#### Scenario: Chi tiết khi chạm giới hạn

- **WHEN** ván kết thúc vì đã có 3.000 nước đi
- **THEN** thẻ kết quả báo "Ván kết thúc" kèm dòng nêu đã đi 3.000 nước
