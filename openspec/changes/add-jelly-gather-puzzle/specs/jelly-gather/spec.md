# Spec Delta

## Purpose

Gom thạch: trò giải đố một người, đẩy các khối thạch trên lưới ô để thạch cùng màu dính lại thành một khối, qua các màn thiết kế sẵn; tiến độ nằm trên trình duyệt của người chơi.

## ADDED Requirements

### Requirement: Bàn của một màn

Mỗi màn SHALL là một lưới ô nhìn từ trên xuống, gồm tường, ô trống, đúng một nhân vật và các khối. Một khối là một nhóm ô liền cạnh nhau, đi cùng nhau. Mỗi ô của khối có một loại: thạch dâu, lá dứa, xoài, khoai môn, thạch dừa, sương sáo, hoặc đá viên; khối có sương sáo có thể gồm nhiều loại. Trò chơi không có trọng lực và không có yếu tố ngẫu nhiên.

#### Scenario: Mở một màn

- **WHEN** người chơi mở màn 1-1 lần đầu
- **THEN** bàn hiện tường, nhân vật và các khối đúng như thiết kế của màn
- **AND** số bước là 0

#### Scenario: Cùng một màn luôn như nhau

- **WHEN** người chơi mở cùng một màn hai lần và đi cùng một chuỗi bước
- **THEN** bàn sau chuỗi bước đó giống hệt nhau ở hai lần

### Requirement: Đi và đẩy

Mỗi bước, nhân vật SHALL đi một ô theo một trong bốn hướng. Ô đó trống thì nhân vật sang ô đó. Ô đó có một khối thì khối đó bị đẩy một ô cùng hướng, kéo theo mọi khối mà nó đẩy vào, liên tiếp, rồi nhân vật sang ô đó. Nhân vật đẩy được cả khối đang bao quanh mình, vì cả khối đi cùng nhân vật.

#### Scenario: Đi vào ô trống

- **WHEN** ô bên phải nhân vật trống và người chơi đi sang phải
- **THEN** nhân vật sang ô đó và số bước tăng 1

#### Scenario: Đẩy một khối nhiều ô

- **WHEN** nhân vật đứng bên trái một khối dâu hình chữ L, mọi ô phía phải của khối đều trống, và người chơi đi sang phải
- **THEN** cả khối chữ L sang phải một ô, giữ nguyên hình
- **AND** nhân vật sang ô mà khối vừa rời

#### Scenario: Đẩy dây chuyền

- **WHEN** nhân vật đẩy một khối xoài sang phải, ngay bên phải khối xoài là một khối lá dứa, bên phải khối lá dứa là ô trống
- **THEN** khối xoài và khối lá dứa cùng sang phải một ô

#### Scenario: Khối bao quanh nhân vật

- **WHEN** nhân vật đứng trong chỗ lõm của một khối dâu hình chữ U, phía trước cả khối đều trống, và người chơi đi về phía đáy chữ U
- **THEN** cả khối và nhân vật cùng sang một ô

### Requirement: Bước không đi được

Bước đi MUST NOT xảy ra khi nhân vật hay một ô của khối bị đẩy, trực tiếp hay theo dây chuyền, sẽ đi vào ô tường, hay vào ô của một khối thạch dừa đã đứng yên. Bước không đi được MUST NOT đổi bàn, MUST NOT tính vào số bước và MUST NOT ghi vào lịch sử hoàn tác. Người chơi SHALL được báo là không đi được, mỗi lần.

#### Scenario: Đi vào tường

- **WHEN** ô bên trên nhân vật là tường và người chơi đi lên
- **THEN** bàn và số bước không đổi
- **AND** người chơi được báo là không đi được

#### Scenario: Khối bị chặn ở xa

- **WHEN** nhân vật đẩy một khối dâu sang trái, bên trái khối dâu là một khối xoài, bên trái khối xoài là tường
- **THEN** không khối nào di chuyển và số bước không đổi

#### Scenario: Bị chặn hai lần liền

- **WHEN** người chơi đi vào cùng một bức tường hai lần liền
- **THEN** cả hai lần người chơi đều được báo là không đi được

### Requirement: Thạch cùng màu dính lại

Sau mỗi bước, hai khối có hai ô cùng loại thạch chạm cạnh nhau SHALL dính thành một khối, lặp lại cho tới khi không còn hai khối nào dính được. Khối đã dính MUST NOT tách ra, trừ khi hoàn tác. Hai loại thạch khác nhau MUST NOT dính vào nhau, trừ qua sương sáo. Đá viên MUST NOT dính vào gì. Chạm chéo không tính.

#### Scenario: Đẩy cho hai khối dâu chạm nhau

- **WHEN** người chơi đẩy một khối dâu tới sát cạnh một khối dâu khác
- **THEN** hai khối thành một khối dâu
- **AND** lần đẩy sau, cả khối mới đi cùng nhau

#### Scenario: Khác màu không dính

- **WHEN** một khối dâu chạm cạnh một khối lá dứa
- **THEN** hai khối vẫn riêng; đẩy khối dâu ra xa thì khối lá dứa nằm yên

#### Scenario: Chạm chéo không dính

- **WHEN** hai khối xoài chỉ chạm nhau ở góc
- **THEN** hai khối vẫn riêng

### Requirement: Sương sáo dính mọi màu

Sương sáo SHALL dính với mọi loại thạch chạm cạnh nó, kể cả sương sáo, thạch dừa và thạch khác màu nhau; MUST NOT dính đá viên hay tường. Các ô dính vào cùng một khối sương sáo thuộc cùng một khối, nên hai khối cùng màu cùng dính vào một khối sương sáo là đã chung một khối. Sương sáo không tính khi xét qua màn.

#### Scenario: Nối hai khối dâu

- **WHEN** một khối dâu chạm cạnh trái một khối sương sáo và người chơi đẩy một khối dâu khác tới chạm cạnh phải khối sương sáo đó
- **THEN** hai khối dâu và khối sương sáo thành một khối
- **AND** nếu bàn không còn thạch màu khác thì màn được giải

#### Scenario: Dính cả màu không muốn

- **WHEN** người chơi đẩy một khối sương sáo tới chạm cạnh một khối lá dứa
- **THEN** khối lá dứa dính vào khối sương sáo, và lần đẩy sau cả hai đi cùng nhau

#### Scenario: Sương sáo không dính đá viên

- **WHEN** một khối sương sáo chạm cạnh một đá viên
- **THEN** hai khối vẫn riêng

### Requirement: Đá viên

Đá viên SHALL là khối một ô, đẩy được như thạch, MUST NOT dính vào gì kể cả đá viên khác và sương sáo, và không tính khi xét qua màn.

#### Scenario: Hai đá viên cạnh nhau

- **WHEN** hai đá viên nằm cạnh nhau và người chơi đẩy một viên ra xa
- **THEN** chỉ viên đó di chuyển

### Requirement: Thạch dừa dính tường

Thạch dừa SHALL dính với thạch dừa như thạch thường. Ngoài ra, một khối có ít nhất một ô thạch dừa chạm cạnh một ô tường SHALL đứng yên trong lần chơi đó: MUST NOT bị đẩy, và chặn mọi dây chuyền đẩy vào nó. Khối dính vào một khối đang đứng yên cũng đứng yên. Chạm chéo với tường không tính.

#### Scenario: Đẩy thạch dừa tới sát tường

- **WHEN** người chơi đẩy một khối thạch dừa lên tới ô ngay dưới tường, rồi đi sang cạnh nó và đẩy nó sang ngang
- **THEN** khối thạch dừa không di chuyển và bước đẩy sang ngang không đi được

#### Scenario: Thạch dừa sát tường ngay từ đầu

- **WHEN** một màn bắt đầu với một khối thạch dừa chạm cạnh tường
- **THEN** khối đó đứng yên từ bước đầu tiên

#### Scenario: Dính vào khối đứng yên

- **WHEN** người chơi đẩy một khối thạch dừa tới chạm cạnh một khối thạch dừa đang đứng yên
- **THEN** hai khối thành một khối đứng yên

### Requirement: Qua màn

Màn SHALL được giải ngay sau bước làm cho, với mỗi màu thạch có trên bàn (dâu, lá dứa, xoài, khoai môn, dừa), mọi ô của màu đó nằm trong cùng một khối; sương sáo và đá viên không tính. Khi màn đã giải, bàn MUST NOT nhận bước đi nào nữa, nhưng người chơi vẫn hoàn tác và chơi lại được. Mở lại một màn đã giải mà chưa chơi lại SHALL hiện bàn đã giải cùng khung giải xong.

#### Scenario: Gom xong mọi màu

- **WHEN** bàn có hai khối dâu và một khối lá dứa, và người chơi đẩy cho hai khối dâu dính lại
- **THEN** màn được báo là đã giải, kèm số bước đã đi

#### Scenario: Còn một màu chưa gom

- **WHEN** hai khối dâu vừa dính lại nhưng lá dứa vẫn còn hai khối
- **THEN** màn chưa giải và người chơi đi tiếp được

#### Scenario: Mở lại màn đã giải

- **WHEN** người chơi giải một màn, về danh sách màn rồi mở lại màn đó
- **THEN** màn hiện bàn đã giải và khung giải xong, có "Chơi lại màn"

### Requirement: Các màn chơi

Trò chơi SHALL có 24 màn trong 3 chương, mỗi chương 8 màn. Chương 1 có thạch thường và, từ màn 1-5, đá viên; chương 2 thêm sương sáo; chương 3 thêm thạch dừa. Mọi màn MUST giải được và MUST NOT đã giải sẵn lúc bắt đầu. Mỗi màn SHALL có số bước ít nhất để giải, được kiểm bằng máy, hiện cho người chơi sau khi giải.

#### Scenario: Mọi màn giải được

- **WHEN** kiểm tra tự động phát lại lời giải đã lưu của từng màn trong 24 màn
- **THEN** màn nào cũng được giải đúng ở bước cuối của lời giải, không bước nào bị chặn, và số bước bằng số bước ít nhất của màn

#### Scenario: Số bước ít nhất là thật

- **WHEN** kiểm tra tự động tìm lời giải ngắn nhất của từng màn
- **THEN** không có lời giải nào ngắn hơn số bước ít nhất đã ghi của màn đó

### Requirement: Số bước và hoàn tác

Màn hình chơi SHALL hiện số bước đã đi. "Hoàn tác" SHALL bỏ thao tác gần nhất (một bước, hay một lần "Chơi lại màn") và trả bàn về đúng trạng thái trước đó, kể cả các khối đã dính. Hoàn tác SHALL lùi được ít nhất 10 000 thao tác gần nhất. Khi chưa có thao tác nào để bỏ, "Hoàn tác" không bấm được và nói vì sao.

#### Scenario: Hoàn tác một lần dính

- **WHEN** người chơi vừa đẩy cho hai khối dâu dính lại rồi chọn "Hoàn tác"
- **THEN** hai khối dâu lại riêng ở đúng chỗ cũ và số bước giảm 1

#### Scenario: Hoàn tác về đầu màn

- **WHEN** người chơi mở một màn chưa chơi, đi 5 bước rồi chọn "Hoàn tác" 5 lần
- **THEN** bàn giống lúc mới mở màn, số bước là 0, và "Hoàn tác" không bấm được

### Requirement: Chơi lại màn

"Chơi lại màn" SHALL đưa bàn về lúc mới mở màn, số bước về 0, không cần hỏi lại, và hoàn tác được. Khi bàn đang ở đúng lúc mới mở màn, "Chơi lại màn" MUST NOT làm gì. Giữ phím R MUST NOT lặp lại lệnh.

#### Scenario: Chơi lại rồi đổi ý

- **WHEN** người chơi đã đi 12 bước, chọn "Chơi lại màn" rồi chọn "Hoàn tác"
- **THEN** bàn và số bước trở lại như lúc đã đi 12 bước

#### Scenario: Chơi lại khi chưa đi

- **WHEN** người chơi vừa mở một màn chưa chơi rồi chọn "Chơi lại màn"
- **THEN** không có gì thay đổi và "Hoàn tác" vẫn không bấm được

### Requirement: Điều khiển

Người chơi SHALL đi được bằng phím mũi tên hoặc W A S D, bằng vuốt trên bàn, và bằng bốn nút hướng. Z, hoặc Ctrl/⌘ + Z, là hoàn tác; R là chơi lại màn. Phím MUST NOT tác động trò chơi khi tiêu điểm ở ô nhập, trong hộp thoại hay menu đang mở, hay khi có phím bổ trợ, trừ Ctrl/⌘ + Z. Nút có vùng chạm ít nhất 44 × 44 px.

#### Scenario: Chơi bằng bàn phím

- **WHEN** người chơi mở một màn rồi nhấn phím mũi tên phải
- **THEN** nhân vật đi sang phải như khi bấm nút "Sang phải"

#### Scenario: Vuốt trên điện thoại

- **WHEN** người chơi vuốt sang trái trên bàn ở khung 390 × 844
- **THEN** nhân vật đi sang trái một ô
- **AND** trang không cuộn theo cú vuốt

#### Scenario: Menu ngôn ngữ đang mở

- **WHEN** người chơi mở menu "Ngôn ngữ" trên thanh trên rồi nhấn mũi tên xuống, mũi tên trái và phím A
- **THEN** nhân vật không di chuyển và số bước không đổi

#### Scenario: Phím tắt của trình duyệt

- **WHEN** người chơi nhấn Ctrl + D hoặc ⌘ + R khi đang chơi
- **THEN** nhân vật không di chuyển và màn không chơi lại

#### Scenario: Nút hướng cho trình đọc màn hình

- **WHEN** trình đọc màn hình đọc các nút hướng
- **THEN** bốn nút được đọc là "Lên", "Xuống", "Sang trái", "Sang phải"

### Requirement: Đọc được bàn và kết quả mỗi bước

Màu MUST NOT là tín hiệu duy nhất: mỗi loại khối có ký hiệu hay hoa văn riêng, và thạch dừa đứng yên có dấu riêng. Sau mỗi bước, một vùng thông báo cho trình đọc màn hình SHALL nói kết quả: chỗ nhân vật tới, loại bị đẩy, loại vừa dính và còn bao nhiêu khối, loại sương sáo vừa dính vào, không đi được, hay đã giải màn. Bàn SHALL có mô tả dạng chữ theo từng hàng.

#### Scenario: Thông báo khi dính

- **WHEN** người chơi đẩy cho hai khối dâu dính lại, còn một khối dâu khác ở xa
- **THEN** vùng thông báo nói thạch dâu vừa dính và còn 2 khối dâu

#### Scenario: Thông báo khi đi

- **WHEN** người chơi đi tới hàng 3, cột 4 mà không đẩy gì
- **THEN** vùng thông báo nói nhân vật ở hàng 3, cột 4

#### Scenario: Ký hiệu riêng cho từng loại

- **WHEN** bàn có đủ bốn màu thạch, sương sáo, thạch dừa đứng yên, thạch dừa chưa đứng yên và đá viên
- **THEN** mỗi loại vẽ bằng một ký hiệu hay hoa văn khác nhau, và chỉ khối dừa đứng yên có dấu đứng yên

#### Scenario: Mô tả bàn

- **WHEN** trình đọc màn hình đọc mô tả bàn của một màn
- **THEN** mỗi hàng được đọc thành một mục, nêu tường, ô trống, loại khối và chỗ nhân vật theo thứ tự từ trái sang phải

### Requirement: Khi giải xong màn

Khi màn được giải, màn hình chơi SHALL hiện số bước vừa đi, số bước tốt nhất ở màn đó, số bước ít nhất có thể, và các lựa chọn "Màn tiếp", "Chơi lại màn", "Hoàn tác", "Danh sách màn"; màn cuối không có "Màn tiếp". Khung này SHALL thay chỗ các nút hướng, nằm trong màn hình mà không cần cuộn. Hiệu ứng mừng ngắn, MUST NOT chặn nút, có nhánh giảm chuyển động.

#### Scenario: Giải một màn

- **WHEN** người chơi giải màn 1-3 với số bước lớn hơn số bước ít nhất của màn
- **THEN** màn hình hiện số bước vừa đi, số bước ít nhất, và nút "Màn tiếp" mở màn 1-4

#### Scenario: Màn cuối

- **WHEN** người chơi giải màn 3-8
- **THEN** không có nút "Màn tiếp"; có "Chơi lại màn", "Hoàn tác" và "Danh sách màn"

#### Scenario: Vừa trong màn hình nhỏ

- **WHEN** người chơi giải một màn ở khung 360 × 640
- **THEN** khung giải xong và các nút của nó nằm trong màn hình mà không cần cuộn

### Requirement: Gợi ý ở màn mở đầu cơ chế

Màn đầu tiên có một cơ chế (đẩy và dính ở 1-1, đá viên ở 1-5, sương sáo ở 2-1, thạch dừa ở 3-1) SHALL có một dòng gợi ý ngắn về cơ chế đó trên màn hình chơi. Các màn khác MUST NOT có gợi ý.

#### Scenario: Gặp sương sáo lần đầu

- **WHEN** người chơi mở màn 2-1
- **THEN** màn hình chơi có dòng gợi ý về sương sáo

#### Scenario: Màn không mở đầu cơ chế

- **WHEN** người chơi mở màn 2-2
- **THEN** màn hình chơi không có dòng gợi ý

### Requirement: Danh sách màn

Trang danh sách màn SHALL nhóm màn theo chương, hiện màn nào đã giải và số bước tốt nhất. Mọi màn đều mở được, không khoá theo tiến độ. Trang SHALL có phần "Cách chơi" ngắn. Nút "Tiếp tục" mở màn chưa giải có lần chơi dở đổi gần nhất; không có thì mở màn đầu tiên chưa giải; khi chưa chơi gì nút ghi "Bắt đầu"; giải hết thì không có nút này.

#### Scenario: Lần đầu vào

- **WHEN** người chơi chưa chơi màn nào mở danh sách màn
- **THEN** trang có 3 chương, 24 màn, không màn nào đánh dấu đã giải, và nút "Bắt đầu" mở màn 1-1

#### Scenario: Màn chơi dở gần nhất

- **WHEN** người chơi đi vài bước ở màn 1-4, rồi mở màn 1-5 và giải xong, rồi về danh sách màn
- **THEN** màn 1-5 được đánh dấu đã giải kèm số bước tốt nhất, và "Tiếp tục" mở màn 1-4

#### Scenario: Chơi màn bất kỳ

- **WHEN** người chơi chưa giải màn nào chọn màn 3-5
- **THEN** màn 3-5 mở ra để chơi

### Requirement: Lưu tiến độ và màn đang chơi dở

Trò chơi SHALL nhớ trên trình duyệt này màn nào đã giải, số bước tốt nhất mỗi màn, và lịch sử thao tác của từng màn đang chơi dở. Mở lại một màn SHALL trả lại đúng bàn, số bước và khả năng hoàn tác. Dữ liệu lưu của một màn đọc không được, hay của một màn đã đổi thiết kế ở bản mới, MUST NOT làm hỏng trang hay xoá dữ liệu của màn khác: màn đó bắt đầu lại.

#### Scenario: Tải lại giữa màn

- **WHEN** người chơi đã đi 7 bước ở màn 2-3 rồi tải lại trang
- **THEN** màn 2-3 hiện đúng bàn sau 7 bước, số bước là 7, và "Hoàn tác" vẫn trả về bước 6

#### Scenario: Kỷ lục chỉ giữ số nhỏ hơn

- **WHEN** người chơi đã giải màn 1-2, rồi chơi lại và giải với nhiều bước hơn
- **THEN** số bước tốt nhất của màn 1-2 vẫn là số của lần đầu

#### Scenario: Dữ liệu lưu hỏng

- **WHEN** dữ liệu lưu của màn 1-5 bị sửa thành nội dung không đọc được và người chơi mở màn 1-5
- **THEN** màn 1-5 bắt đầu lại từ đầu, trang không báo lỗi, và các màn đã giải khác vẫn được đánh dấu

#### Scenario: Hai tab

- **WHEN** người chơi giải màn 1-1 ở một tab, rồi giải màn 1-2 ở một tab khác đã mở từ trước
- **THEN** danh sách màn đánh dấu cả 1-1 và 1-2 là đã giải

### Requirement: Dữ liệu ở trên trình duyệt này

Tiến độ và các bước đi MUST NOT được gửi lên server hay dịch vụ nào. Khi trò chơi đã mở, mọi màn hình của nó (danh sách màn, mọi màn chơi) SHALL dùng được khi mất mạng.

#### Scenario: Mất mạng giữa buổi

- **WHEN** người chơi đang ở danh sách màn thì mất mạng, rồi mở màn 2-6, chơi và giải xong
- **THEN** màn 2-6 chơi được và được đánh dấu đã giải

#### Scenario: Không gửi gì đi

- **WHEN** người chơi chơi và giải một màn
- **THEN** không có yêu cầu mạng nào mang tiến độ hay các bước đi

### Requirement: Đường dẫn của màn

Mỗi màn SHALL có đường dẫn riêng dạng `/puzzles/jelly-gather/<chương>-<màn>`. Đường dẫn tới màn không có SHALL trả trang không tìm thấy, có lối về danh sách màn.

#### Scenario: Mở thẳng một màn

- **WHEN** người chơi mở `/puzzles/jelly-gather/2-4`
- **THEN** màn 2-4 mở ra

#### Scenario: Màn không có

- **WHEN** người chơi mở `/puzzles/jelly-gather/4-1`
- **THEN** trang trả mã 404, nói không tìm thấy màn, và có lối về danh sách màn

### Requirement: Chuyển động của bàn

Mỗi bước đi và đẩy SHALL có chuyển động trượt ngắn, khi dính có một nhịp nảy nhẹ, tổng cộng không quá 200 ms, và MUST NOT làm chậm bước kế tiếp: bấm liên tiếp thì bước sau chạy ngay. Bàn hiện lần đầu, kể cả khi khôi phục màn chơi dở, MUST NOT có chuyển động. Khi hệ thống yêu cầu giảm chuyển động, bàn SHALL hiện ngay trạng thái sau bước.

#### Scenario: Giảm chuyển động

- **WHEN** hệ thống đặt giảm chuyển động và người chơi đẩy một khối
- **THEN** khối hiện ngay ở chỗ mới, không có chuyển động trượt

#### Scenario: Khôi phục không trượt

- **WHEN** người chơi tải lại trang giữa một màn đã đi vài bước
- **THEN** các khối hiện ngay ở chỗ đã đi tới, không trượt từ chỗ ban đầu
