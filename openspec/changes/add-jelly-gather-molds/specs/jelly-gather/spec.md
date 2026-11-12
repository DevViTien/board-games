# Spec Delta

## MODIFIED Requirements

### Requirement: Bàn của một màn

Mỗi màn SHALL là một lưới ô nhìn từ trên xuống, gồm tường, ô trống, có thể có khuôn, đúng một nhân vật và các khối. Một khối là một nhóm ô liền cạnh nhau, đi cùng nhau. Mỗi ô của khối có một loại: thạch dâu, lá dứa, xoài, khoai môn, thạch dừa, sương sáo, hoặc đá viên; khối có sương sáo có thể gồm nhiều loại. Trò chơi không có trọng lực và không có yếu tố ngẫu nhiên.

#### Scenario: Mở một màn

- **WHEN** người chơi mở màn 1-1 lần đầu
- **THEN** bàn hiện tường, nhân vật và các khối đúng như thiết kế của màn
- **AND** số bước là 0

#### Scenario: Cùng một màn luôn như nhau

- **WHEN** người chơi mở cùng một màn hai lần và đi cùng một chuỗi bước
- **THEN** bàn sau chuỗi bước đó giống hệt nhau ở hai lần

### Requirement: Qua màn

Màn không có khuôn SHALL được giải ngay sau bước làm cho, với mỗi màu thạch có trên bàn (dâu, lá dứa, xoài, khoai môn, dừa), mọi ô của màu đó nằm trong cùng một khối; sương sáo và đá viên không tính. Màn có khuôn được giải theo requirement "Khuôn". Khi màn đã giải, bàn MUST NOT nhận bước đi nào nữa, nhưng người chơi vẫn hoàn tác và chơi lại được. Mở lại một màn đã giải mà chưa chơi lại SHALL hiện bàn đã giải cùng khung giải xong.

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

Trò chơi SHALL có 40 màn trong 5 chương, mỗi chương 8 màn. Chương 1 có thạch thường và, từ màn 1-5, đá viên; chương 2 thêm sương sáo; chương 3 thêm thạch dừa; chương 4 thêm khuôn; chương 5 là màn lấy từ bộ Boxoban. Mọi màn MUST giải được và MUST NOT đã giải sẵn lúc bắt đầu. Mỗi màn SHALL có số bước ít nhất để giải, được kiểm bằng máy, hiện cho người chơi sau khi giải.

#### Scenario: Mọi màn giải được

- **WHEN** kiểm tra tự động phát lại lời giải đã lưu của từng màn trong 40 màn
- **THEN** màn nào cũng được giải đúng ở bước cuối của lời giải, không bước nào bị chặn, và số bước bằng số bước ít nhất của màn

#### Scenario: Số bước ít nhất là thật

- **WHEN** kiểm tra tự động tìm lời giải ngắn nhất của từng màn
- **THEN** không có lời giải nào ngắn hơn số bước ít nhất đã ghi của màn đó

### Requirement: Gợi ý ở màn mở đầu cơ chế

Màn đầu tiên có một cơ chế (đẩy và dính ở 1-1, đá viên ở 1-5, sương sáo ở 2-1, thạch dừa ở 3-1, khuôn ở 4-1, kho đá ở 5-1) SHALL có một dòng gợi ý ngắn về cơ chế đó trên màn hình chơi. Các màn khác MUST NOT có gợi ý.

#### Scenario: Gặp sương sáo lần đầu

- **WHEN** người chơi mở màn 2-1
- **THEN** màn hình chơi có dòng gợi ý về sương sáo

#### Scenario: Màn không mở đầu cơ chế

- **WHEN** người chơi mở màn 2-2
- **THEN** màn hình chơi không có dòng gợi ý

### Requirement: Đọc được bàn và kết quả mỗi bước

Màu MUST NOT là tín hiệu duy nhất: mỗi loại khối và khuôn của nó có ký hiệu hay hoa văn riêng, và thạch dừa đứng yên có dấu riêng. Sau mỗi bước, một vùng thông báo cho trình đọc màn hình SHALL nói kết quả: chỗ nhân vật tới, loại bị đẩy, loại vừa dính và còn bao nhiêu khối, loại sương sáo vừa dính vào, số ô khuôn đã vừa, không đi được, hay đã giải màn. Bàn SHALL có mô tả dạng chữ theo từng hàng.

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
- **THEN** mỗi hàng được đọc thành một mục, nêu tường, ô trống, khuôn, loại khối và chỗ nhân vật theo thứ tự từ trái sang phải

### Requirement: Danh sách màn

Trang danh sách màn SHALL nhóm màn theo chương, hiện màn nào đã giải và số bước tốt nhất. Mọi màn đều mở được, không khoá theo tiến độ. Trang SHALL có phần "Cách chơi" ngắn. Nút "Tiếp tục" mở màn chưa giải có lần chơi dở đổi gần nhất; không có thì mở màn đầu tiên chưa giải; khi chưa chơi gì nút ghi "Bắt đầu"; giải hết thì không có nút này.

#### Scenario: Lần đầu vào

- **WHEN** người chơi chưa chơi màn nào mở danh sách màn
- **THEN** trang có 5 chương, 40 màn, không màn nào đánh dấu đã giải, và nút "Bắt đầu" mở màn 1-1

#### Scenario: Màn chơi dở gần nhất

- **WHEN** người chơi đi vài bước ở màn 1-4, rồi mở màn 1-5 và giải xong, rồi về danh sách màn
- **THEN** màn 1-5 được đánh dấu đã giải kèm số bước tốt nhất, và "Tiếp tục" mở màn 1-4

#### Scenario: Chơi màn bất kỳ

- **WHEN** người chơi chưa giải màn nào chọn màn 3-5
- **THEN** màn 3-5 mở ra để chơi

### Requirement: Đá viên

Đá viên SHALL là khối một ô, đẩy được như thạch, MUST NOT dính vào gì kể cả đá viên khác và sương sáo. Ở màn không có khuôn đá, đá viên không tính khi xét qua màn; ở màn có khuôn đá, xem requirement "Khuôn".

#### Scenario: Hai đá viên cạnh nhau

- **WHEN** hai đá viên nằm cạnh nhau và người chơi đẩy một viên ra xa
- **THEN** chỉ viên đó di chuyển

### Requirement: Đường dẫn của màn

Mỗi màn SHALL có đường dẫn riêng dạng `/puzzles/jelly-gather/<chương>-<màn>`. Đường dẫn tới màn không có SHALL trả trang không tìm thấy, có lối về danh sách màn.

#### Scenario: Mở thẳng một màn

- **WHEN** người chơi mở `/puzzles/jelly-gather/4-2`
- **THEN** màn 4-2 mở ra

#### Scenario: Màn không có

- **WHEN** người chơi mở `/puzzles/jelly-gather/6-1`
- **THEN** trang trả mã 404, nói không tìm thấy màn, và có lối về danh sách màn

### Requirement: Khi giải xong màn

Khi màn được giải, màn hình chơi SHALL hiện số bước vừa đi, số bước tốt nhất ở màn đó, số bước ít nhất có thể, và các lựa chọn "Màn tiếp", "Chơi lại màn", "Hoàn tác", "Danh sách màn"; màn cuối không có "Màn tiếp". Khung này SHALL thay chỗ các nút hướng, nằm trong màn hình mà không cần cuộn. Hiệu ứng mừng ngắn, MUST NOT chặn nút, có nhánh giảm chuyển động.

#### Scenario: Giải một màn

- **WHEN** người chơi giải màn 1-3 với số bước lớn hơn số bước ít nhất của màn
- **THEN** màn hình hiện số bước vừa đi, số bước ít nhất, và nút "Màn tiếp" mở màn 1-4

#### Scenario: Màn cuối

- **WHEN** người chơi giải màn 5-8
- **THEN** không có nút "Màn tiếp"; có "Chơi lại màn", "Hoàn tác" và "Danh sách màn"

#### Scenario: Vừa trong màn hình nhỏ

- **WHEN** người chơi giải một màn ở khung 360 × 640
- **THEN** khung giải xong và các nút của nó nằm trong màn hình mà không cần cuộn

## ADDED Requirements

### Requirement: Khuôn

Khuôn SHALL là ô sàn có màu của một loại khối (dâu, lá dứa, xoài, khoai môn, dừa hoặc đá viên); nhân vật và khối đi qua như sàn thường. Mỗi loại có khuôn MUST có số ô khối bằng số ô khuôn. Màn có khuôn SHALL được giải ngay sau bước làm cho mọi ô khuôn có ô khối đúng loại nằm lên. Loại không có khuôn và sương sáo không bị đòi gì; màn có khuôn không đòi gom mỗi màu thành một khối.

#### Scenario: Vừa khít khuôn

- **WHEN** màn có khuôn dâu ba ô và đúng ba ô thạch dâu, và người chơi đẩy khối dâu ba ô vào khớp khuôn
- **THEN** màn được báo là đã giải

#### Scenario: Màn sai số ô bị từ chối

- **WHEN** một màn khai báo khuôn dâu ba ô nhưng có bốn ô thạch dâu
- **THEN** kiểm tra tự động từ chối màn đó

#### Scenario: Đã gom nhưng chưa vào khuôn

- **WHEN** màn có khuôn dâu và thạch dâu đã là một khối nhưng nằm ngoài khuôn
- **THEN** màn chưa giải và người chơi đi tiếp được

#### Scenario: Sai loại trên khuôn vẫn thấy khuôn

- **WHEN** một khối lá dứa nằm lên khuôn dâu
- **THEN** ô đó vẫn hiện ký hiệu của khuôn dâu, và mô tả bàn đọc "thạch lá dứa trên khuôn dâu"

#### Scenario: Khối hỗn hợp

- **WHEN** một khối gồm thạch dâu dính với sương sáo, phần dâu nằm khít khuôn dâu còn phần sương sáo nằm ngoài khuôn
- **THEN** màn được giải nếu mọi khuôn khác cũng đã vừa

#### Scenario: Sai loại trong khuôn

- **WHEN** một khối lá dứa nằm lên khuôn dâu
- **THEN** ô khuôn đó chưa vừa và màn chưa giải

#### Scenario: Không cần gom thành một khối

- **WHEN** khuôn dâu gồm hai chỗ rời nhau, mỗi chỗ có một khối dâu nằm khít
- **THEN** màn được giải dù thạch dâu là hai khối

#### Scenario: Màu không có khuôn

- **WHEN** màn có khuôn dâu đã vừa khít, và trên bàn còn hai khối lá dứa rời nhau, không có khuôn lá dứa
- **THEN** màn được giải

#### Scenario: Tiến độ khuôn

- **WHEN** màn có 8 ô khuôn và 3 ô đang có khối đúng loại
- **THEN** màn hình chơi hiện "Khuôn 3/8"

#### Scenario: Tiến độ khuôn sau khi hoàn tác và tải lại

- **WHEN** người chơi vừa đẩy một khối vào khuôn rồi chọn "Hoàn tác", hay tải lại trang giữa màn
- **THEN** "Khuôn n/m" đúng với bàn đang hiện

### Requirement: Màn từ bộ Boxoban

Chương 5 SHALL gồm 8 màn lấy từ bộ Boxoban "hard" (DeepMind, giấy phép Apache 2.0): hộp thành đá viên, ô đích thành khuôn đá; mọi đá viên của màn phải vào khuôn đá. Mỗi màn MUST có số bước ít nhất theo luật của Gom thạch bằng số bước ít nhất theo luật Sokoban (không đẩy hai khối một lúc), để luật đẩy dây chuyền không làm lời giải ngắn đi. Danh sách màn SHALL ghi nguồn và giấy phép của chương này.

#### Scenario: Luật đẩy dây chuyền không làm lời giải ngắn đi

- **WHEN** kiểm tra tự động giải từng màn chương 5 theo luật Gom thạch và theo luật Sokoban
- **THEN** hai số bước ít nhất bằng nhau

#### Scenario: Ghi nguồn trên danh sách màn

- **WHEN** người chơi mở danh sách màn
- **THEN** chương 5 ghi màn lấy từ bộ Boxoban của DeepMind, giấy phép Apache 2.0, có liên kết tới danh sách giấy phép bên thứ ba
