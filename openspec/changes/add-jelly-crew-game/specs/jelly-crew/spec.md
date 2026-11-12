## ADDED Requirements

### Requirement: Bản đồ và người chơi

Đội gom thạch SHALL chơi được với 2, 3 hoặc 4 người, cùng phe, không có máy chơi. Tuỳ chọn `map` SHALL là một trong ba bản đồ "Hai gian bếp" (`kitchen`, mặc định), "Chợ đêm" (`market`), "Kho lạnh" (`cold-store`); mỗi bản đồ có một bố cục riêng cho từng số người, rộng tối đa 19 cột × 13 hàng. Mỗi người SHALL có một nhân vật đặt ở ô xuất phát của bố cục. Tuỳ chọn khác MUST bị từ chối với `invalid-options`.

#### Scenario: Ván hai người trên bản đồ mặc định

- **WHEN** một ván Đội gom thạch được tạo cho 2 người mà không truyền tuỳ chọn
- **THEN** ván dùng bố cục 2 người của "Hai gian bếp", có đúng hai nhân vật ở hai ô xuất phát, và người thứ nhất đến lượt

#### Scenario: Mỗi số người một bố cục

- **WHEN** ván "Chợ đêm" được tạo lần lượt cho 2, 3 và 4 người
- **THEN** mỗi ván có đúng số nhân vật bằng số người, và không bố cục nào rộng quá 19 cột hay cao quá 13 hàng

#### Scenario: Tuỳ chọn lạ

- **WHEN** ván được tạo với `map` là `"castle"`
- **THEN** hệ thống từ chối với mã lỗi `invalid-options`

### Requirement: Lượt nhiều bước

Người đến lượt SHALL đi tối đa 5 bước, mỗi bước một ô theo bốn hướng, rồi kết thúc lượt bằng "Xong lượt"; lượt không tự chuyển. Đi đủ 5 bước thì chỉ còn "Xong lượt", "Lùi bước" và "Đặt lại bản đồ". "Xong lượt" hợp lệ cả khi chưa đi bước nào (để đứng yên giữ nút). Lượt sang người kế tiếp theo thứ tự ghế, vòng lại người thứ nhất. Bước bị chặn MUST NOT là nước đi hợp lệ.

#### Scenario: Đủ 5 bước thì chờ Xong lượt

- **WHEN** trong ván hai người, người thứ nhất đi đủ 5 bước
- **THEN** người thứ nhất vẫn đến lượt, không còn bước đi nào trong các nước hợp lệ, và "Xong lượt" hợp lệ

#### Scenario: Xong lượt khi chưa đi

- **WHEN** người thứ hai đang đứng trên một nút và chọn "Xong lượt" khi chưa đi bước nào
- **THEN** người thứ nhất đến lượt và nhân vật thứ hai vẫn ở trên nút

#### Scenario: Bước bị chặn

- **WHEN** ô trước mặt nhân vật đến lượt là tường
- **THEN** bước theo hướng đó không có trong các nước hợp lệ và số bước đã đi không đổi

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

Ván SHALL kết thúc với kết quả thắng cho mọi người, lý do `filled`, ngay sau bước làm mọi ô khuôn có thạch đúng loại. Mỗi loại thạch có khuôn SHALL có đúng bằng số ô thạch như số ô khuôn của loại đó; loại không có khuôn (thường là đá viên) chỉ là vật cản. Ván đã có kết quả MUST NOT còn nước đi hợp lệ.

#### Scenario: Ô khuôn cuối được lấp

- **WHEN** trong ván ba người, một bước đẩy thạch xoài vào ô khuôn xoài cuối còn trống
- **THEN** ván kết thúc, cả ba người thắng với lý do `filled`, và không còn nước đi hợp lệ

#### Scenario: Sai loại trên khuôn

- **WHEN** mọi ô khuôn có thạch nhưng một ô khuôn dâu có thạch xoài
- **THEN** ván chưa kết thúc

### Requirement: Giới hạn vòng

Mỗi bố cục SHALL có số vòng tối đa; một vòng là mỗi người một lượt. Khi người cuối cùng xong lượt của vòng cuối mà khuôn chưa đầy, ván SHALL kết thúc không ai thắng, lý do `out-of-rounds`.

#### Scenario: Hết vòng

- **WHEN** người cuối cùng xong lượt của vòng cuối và còn ô khuôn trống
- **THEN** ván kết thúc không ai thắng với lý do `out-of-rounds`

#### Scenario: Thắng ở lượt cuối

- **WHEN** ở lượt cuối của vòng cuối, một bước lấp ô khuôn cuối cùng
- **THEN** ván kết thúc với kết quả thắng `filled`, không phải `out-of-rounds`

### Requirement: Lùi bước trong lượt

Người đến lượt SHALL lùi được bước gần nhất của chính lượt mình: nhân vật và thạch trở lại như trước bước đó, số bước đã đi giảm một. Lùi được tới đầu lượt, MUST NOT lùi qua lượt người khác, và mỗi lượt lùi tối đa 5 lần. Chưa đi bước nào trong lượt, hay đã lùi 5 lần, thì lùi bước không có trong các nước hợp lệ.

#### Scenario: Lùi một bước đẩy

- **WHEN** người thứ nhất vừa đẩy một thạch dâu ở bước thứ hai của lượt rồi lùi bước
- **THEN** thạch dâu và nhân vật thứ nhất về chỗ trước bước đó và số bước đã đi là 1

#### Scenario: Lùi bước thứ năm

- **WHEN** người thứ nhất đi đủ 5 bước rồi lùi bước
- **THEN** số bước đã đi là 4 và người thứ nhất đi tiếp được một bước

#### Scenario: Không lùi qua lượt trước

- **WHEN** người thứ hai vừa đến lượt, chưa đi bước nào
- **THEN** lùi bước không có trong các nước hợp lệ

#### Scenario: Hết lượt lùi

- **WHEN** trong một lượt, người thứ nhất đã lùi bước 5 lần và vừa đi lại một bước
- **THEN** lùi bước không có trong các nước hợp lệ cho tới hết lượt

### Requirement: Đặt lại bản đồ

Người đến lượt SHALL đặt lại được bản đồ khi nhân vật hay thạch không còn như lúc bắt đầu ván: mọi nhân vật và thạch về chỗ ban đầu, và lượt sang người kế tiếp. Số vòng đã qua và số bước cả đội đã đi MUST NOT được trả lại. Khi bàn đang như lúc bắt đầu ván, đặt lại không có trong các nước hợp lệ.

#### Scenario: Đặt lại giữa ván

- **WHEN** ở vòng 6 của ván ba người, người thứ hai đặt lại bản đồ
- **THEN** mọi nhân vật và thạch về chỗ ban đầu, người thứ ba đến lượt, ván vẫn ở vòng 6 và số bước đã đi không đổi

#### Scenario: Bàn chưa đổi

- **WHEN** ván vừa bắt đầu
- **THEN** đặt lại bản đồ không có trong các nước hợp lệ

### Requirement: Bố cục giải được

Mỗi bố cục SHALL giải được trong giới hạn vòng của nó: có một lời giải mẫu mà khi phát lại từ đầu đi đến thắng `filled`, mọi người là người thắng, với không quá một nửa số vòng tối đa. Mỗi bố cục SHALL cần tới nút và cửa: coi mọi cửa luôn đóng thì bố cục không giải được.

#### Scenario: Phát lại lời giải mẫu

- **WHEN** test phát lại lời giải mẫu của từng bố cục trong chín bố cục
- **THEN** mỗi lần phát lại kết thúc với kết quả thắng `filled` cho mọi người và dùng không quá một nửa số vòng tối đa

#### Scenario: Không thắng khi cửa luôn đóng

- **WHEN** test tìm lời giải cho một bố cục mà coi mọi cửa luôn đóng
- **THEN** không tìm được lời giải

### Requirement: Hiển thị bàn

Màn hình SHALL vẽ cả bản đồ, không cuộn: tường, sàn, khuôn, nút, cửa đóng và mở, thạch theo loại có ký hiệu riêng, và nhân vật có màu và số ghế 1–4. Nhân vật đến lượt SHALL nổi trên bàn bằng vòng đậm, và khung bàn mang màu ghế đó. Đường đi của lượt gần nhất SHALL được đánh dấu. Nút và cửa SHALL có ký hiệu nhóm; cửa đóng và mở khác nhau ở hình, không chỉ ở màu.

#### Scenario: Lượt trên bàn

- **WHEN** đến lượt người thứ hai
- **THEN** nhân vật số 2 có vòng đánh dấu lượt, khung bàn mang màu ghế Hồng và chip ghi "Hồng · còn 5 bước"

#### Scenario: Cửa mở và đóng

- **WHEN** nhân vật đứng trên nút ●
- **THEN** cửa ● vẽ ở dạng mở, cửa ▲ vẫn ở dạng đóng, mỗi cửa kèm ký hiệu nhóm của nó, và nhân vật trên nút có dấu nhỏ ● cho biết đang giữ nút

### Requirement: Chip của ván

Dưới bàn SHALL có chip ghi người đến lượt và số bước còn lại ("Lam · còn 3 bước"), vòng ("Vòng 3/40") và số ô khuôn đã vừa ("Khuôn 5/8"). Ván xong thì MUST NOT còn chip bước.

#### Scenario: Chip đầu lượt

- **WHEN** đến lượt người thứ hai ở vòng 3 của bố cục 40 vòng
- **THEN** chip ghi "Hồng · còn 5 bước" và "Vòng 3/40"

#### Scenario: Hết bước

- **WHEN** người đến lượt đã đi đủ 5 bước
- **THEN** chip ghi đã hết bước và nhắc bấm "Xong lượt"

#### Scenario: Ván xong

- **WHEN** cả đội vừa thắng
- **THEN** không còn chip bước; chip khuôn ghi đầy

### Requirement: Thao tác

Người ở thiết bị đến lượt SHALL đi bằng phím mũi tên hay WASD (không lặp khi giữ phím), bằng bàn điều khiển bốn hướng, hay bằng vuốt trên bàn. Nút hướng bị chặn MUST NOT bấm được và nói lý do. "Xong lượt", "Lùi bước" và "Đặt lại bản đồ" SHALL là nút có chữ; "Đặt lại bản đồ" hỏi lại trước khi làm. Enter SHALL là "Xong lượt" chỉ khi tiêu điểm không ở trên một nút hay liên kết. "Lùi bước" (và phím Z) SHALL chỉ có khi chơi online; chơi cùng máy dùng "Hoàn tác" của màn hình chơi.

#### Scenario: Đi bằng phím

- **WHEN** đến lượt người ở thiết bị này và người đó bấm phím mũi tên trái
- **THEN** nhân vật của người đó đi một bước sang trái

#### Scenario: Hướng bị chặn

- **WHEN** phía trên nhân vật đến lượt là tường
- **THEN** nút "Lên" không bấm được và nêu lý do là tường

#### Scenario: Enter trên một nút

- **WHEN** tiêu điểm đang ở nút "Đặt lại bản đồ" và người chơi bấm Enter
- **THEN** chỉ hộp thoại đặt lại mở ra; lượt không kết thúc

#### Scenario: Đặt lại có hỏi lại

- **WHEN** người đến lượt bấm "Đặt lại bản đồ"
- **THEN** hộp thoại hỏi lại hiện ra; chọn "Để nguyên" thì bàn không đổi

#### Scenario: Cùng máy không có Lùi bước

- **WHEN** ván Đội gom thạch chơi cùng máy
- **THEN** màn hình có "Hoàn tác" và không có nút "Lùi bước"

### Requirement: Đứng giữ nút

Khi nhân vật của người ở thiết bị này đứng trên nút, màn hình SHALL có nút bật/tắt "Giữ nút". Đang bật thì mỗi khi tới lượt người đó, thiết bị SHALL tự gửi "Xong lượt" sau một nhịp ngắn và báo điều đó. Bấm một hướng hay tắt nút thì thôi giữ.

#### Scenario: Tự xong lượt khi giữ nút

- **WHEN** Minh đứng trên nút ●, bật "Giữ nút", và tới lượt Minh
- **THEN** thiết bị của Minh tự gửi "Xong lượt" và lượt sang người kế tiếp, nhân vật của Minh vẫn trên nút

#### Scenario: Thôi giữ khi đi

- **WHEN** Minh đang bật "Giữ nút" và bấm một phím hướng ở lượt của mình
- **THEN** nhân vật đi một bước và "Giữ nút" tắt

### Requirement: Bảng người chơi của Đội gom thạch

Bảng người chơi SHALL ghi tên mỗi ghế theo màu nhân vật ("Lam", "Hồng", "Cam", "Ngọc") kèm hình nhân vật có số, và một dòng ngắn cho ghế đang đứng trên nút ("Giữ nút ●"). Khi cả đội thắng, bảng MUST NOT gắn nhãn "Thắng" cho từng ghế.

#### Scenario: Ghế đang giữ nút

- **WHEN** nhân vật số 2 đứng trên nút ▲
- **THEN** ô của ghế Hồng trong bảng người chơi có dòng "Giữ nút ▲"

### Requirement: Dùng được bằng trình đọc màn hình

Câu đọc mỗi nước SHALL nêu điều đã xảy ra: ai đi, đẩy gì, cửa nào vừa mở hay đóng, số khuôn đã vừa khi số đó đổi, và đặt lại bản đồ. Bước bị chặn SHALL được báo kèm lý do. Bàn SHALL có mô tả theo hàng, nêu từng nhân vật, thạch, khuôn, nút và cửa. Màn hình MUST NOT có vùng `role="status"` thứ hai ngoài dòng lượt.

#### Scenario: Báo cửa mở

- **WHEN** người thứ hai bước lên nút ●
- **THEN** câu đọc nước đó nói Hồng đi một bước và cửa ● mở

#### Scenario: Báo bước bị chặn

- **WHEN** người đến lượt bấm hướng có cửa ▲ đang đóng
- **THEN** màn hình báo không đi được vì cửa ▲ đóng, và ván không đổi

### Requirement: Dùng được trên điện thoại

Ở khung 360 px, bàn SHALL vừa chiều ngang màn hình với mọi bố cục, trang MUST NOT cuộn ngang, và mọi nút điều khiển SHALL tới được với vùng chạm ít nhất 44 × 44 px. Khi thiết bị này không được đi, kéo trên bàn SHALL cuộn trang như thường.

#### Scenario: Bố cục lớn nhất trên điện thoại

- **WHEN** ván "Kho lạnh" bốn người mở ở khung 360 × 640
- **THEN** cả bản đồ hiện trong chiều ngang màn hình, trang không cuộn ngang và các nút điều khiển bấm được

### Requirement: Đọc nước đi và kết quả

Một nước đi SHALL được đọc theo việc nó làm ("đi sang trái", "đẩy thạch dâu lên", "xong lượt", "lùi một bước", "đặt lại bản đồ"). Thẻ kết quả SHALL có dòng chi tiết: khi thắng, số bước và số vòng cả đội đã dùng; khi hết vòng, số ô khuôn còn trống.

#### Scenario: Chi tiết khi thắng

- **WHEN** cả đội đầy khuôn sau 87 bước ở vòng 12
- **THEN** thẻ kết quả ghi "Cả đội thắng!" kèm dòng nêu 87 bước và 12 vòng

#### Scenario: Chi tiết khi hết vòng

- **WHEN** ván kết thúc vì hết vòng, còn 3 ô khuôn trống
- **THEN** thẻ kết quả kèm dòng nêu hết vòng và còn 3 ô khuôn trống
