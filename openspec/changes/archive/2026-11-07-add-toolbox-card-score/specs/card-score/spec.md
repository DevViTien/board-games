# Spec Delta

## Purpose

Công cụ ghi điểm cho những buổi đánh bài ngoài đời: một người nhập điểm từng ván của cả nhóm trên một thiết bị, app tự tính người còn lại để tổng bằng 0, tổng kết và gợi ý cân điểm.

## ADDED Requirements

### Requirement: Danh sách nhóm

Trang `/tools/card-score` SHALL liệt kê các nhóm trên trình duyệt này, nhóm hoạt động gần nhất lên đầu. Mỗi nhóm SHALL hiện tên, danh sách người chơi, số ván và thời điểm hoạt động gần nhất. Trang SHALL nói rõ dữ liệu chỉ lưu trên trình duyệt này và có nút tạo nhóm.

#### Scenario: Chưa có nhóm nào

- **WHEN** người dùng mở trang lần đầu
- **THEN** trang giải thích công cụ làm gì và có nút "Tạo nhóm"

#### Scenario: Nhóm mới dùng lên đầu

- **WHEN** có hai nhóm và người dùng vừa lưu một ván ở nhóm đang đứng sau
- **THEN** nhóm đó lên đầu danh sách

#### Scenario: Nhóm không đặt tên

- **WHEN** một nhóm của Lan, Minh, Hùng không có tên
- **THEN** danh sách và bảng điểm dùng "Lan, Minh, Hùng" làm tên hiển thị

### Requirement: Tạo nhóm

Người dùng SHALL tạo được nhóm gồm 2 đến 8 người chơi. Tên nhóm không bắt buộc, dài tối đa 40 ký tự. Tên người chơi SHALL dài 1–24 ký tự và MUST NOT trùng nhau trong nhóm, không phân biệt hoa thường. Tạo xong, nút quay lại của trình duyệt MUST NOT quay về biểu mẫu vừa gửi.

#### Scenario: Tạo nhóm hợp lệ

- **WHEN** người dùng nhập Lan, Minh, Hùng, Tú rồi chọn "Tạo nhóm"
- **THEN** bảng điểm của nhóm mở ra, cả bốn người có tổng 0, chưa có ván nào

#### Scenario: Ít hơn hai người

- **WHEN** người dùng chỉ nhập một tên rồi chọn "Tạo nhóm"
- **THEN** nhóm không được tạo và app nói cần ít nhất 2 người

#### Scenario: Tên trùng

- **WHEN** người dùng nhập "Lan" và "lan" trong cùng một nhóm rồi chọn "Tạo nhóm"
- **THEN** nhóm không được tạo và ô trùng tên được báo lỗi

#### Scenario: Tối đa tám người

- **WHEN** biểu mẫu đã có 8 ô tên
- **THEN** không thêm được ô thứ 9 và app nói lý do

#### Scenario: Gửi lại sau khi báo lỗi

- **WHEN** app báo chưa tạo được nhóm nhưng lần ghi đó vẫn thành công muộn, và người dùng chọn "Tạo nhóm" lần nữa
- **THEN** chỉ có một nhóm

#### Scenario: Quay lại sau khi tạo

- **WHEN** người dùng vừa tạo nhóm rồi bấm quay lại của trình duyệt
- **THEN** biểu mẫu tạo nhóm không mở lại và không có nhóm thứ hai

### Requirement: Sửa nhóm khi đang chơi

Người dùng SHALL đổi được tên nhóm và tên người chơi, thêm người, cho người chơi nghỉ và cho chơi lại vào bất cứ lúc nào, mà không đổi điểm đã ghi. Mỗi thao tác SHALL có hiệu lực ngay. Nhóm SHALL luôn có 2–8 người đang chơi và tối đa 16 người kể cả người đã nghỉ. Người chưa có điểm ở ván nào SHALL xoá được hẳn, thay vì cho nghỉ. Luật tên SHALL như khi tạo nhóm, tính cả người đã nghỉ. Khi thao tác bị chặn, lý do SHALL hiện trên màn hình.

#### Scenario: Người mới vào giữa buổi

- **WHEN** nhóm đã có 5 ván và người dùng thêm Nam
- **THEN** Nam có tổng 0, các ván cũ của Nam hiện "—", và ván sau có ô nhập cho Nam

#### Scenario: Người chơi nghỉ

- **WHEN** Tú có tổng −40 và người dùng cho Tú nghỉ
- **THEN** ván sau không có ô nhập cho Tú, Tú vẫn ở bảng xếp hạng với tổng −40 và nhãn "Đã nghỉ"

#### Scenario: Không còn đủ hai người

- **WHEN** nhóm chỉ còn 2 người đang chơi
- **THEN** không cho nghỉ thêm ai được và app nói lý do

#### Scenario: Đã đủ tám người

- **WHEN** nhóm có 8 người đang chơi và một người đã nghỉ
- **THEN** không thêm người và không cho chơi lại được, và app nói lý do

#### Scenario: Đã đủ mười sáu người

- **WHEN** nhóm có 16 người kể cả người đã nghỉ
- **THEN** không thêm người được và app gợi ý tạo buổi mới

#### Scenario: Đổi tên

- **WHEN** người dùng đổi "Lan" thành "Lan Anh" ở nhóm đã có ván
- **THEN** mọi ván và bảng xếp hạng hiện "Lan Anh", điểm không đổi

#### Scenario: Người đã nghỉ không còn điểm

- **WHEN** Tú đã nghỉ và mọi ván có điểm của Tú đã bị xoá
- **THEN** dòng của Tú có cả "Chơi lại" và "Xoá"; nút "Xoá" vẫn dùng được khi đã đủ 8 người đang chơi

#### Scenario: Tên đổi ở tab khác

- **WHEN** tab B đang mở màn sửa nhóm, tab A đổi "Lan" thành "Lan Anh", người dùng quay lại tab B rồi đi qua ô tên đó mà không gõ gì
- **THEN** ô hiện "Lan Anh" và tên đã lưu vẫn là "Lan Anh"

#### Scenario: Đang gõ tên thì rời màn hình

- **WHEN** người dùng gõ tên mới rồi rời màn sửa nhóm mà con trỏ còn trong ô
- **THEN** tên mới được lưu

#### Scenario: Xong khi tên bị từ chối

- **WHEN** người dùng gõ một tên trùng rồi chọn "Xong"
- **THEN** màn sửa nhóm vẫn mở và ô đó nêu lý do

#### Scenario: Thêm trùng tên người đã nghỉ

- **WHEN** Tú đã nghỉ và người dùng thêm một người tên "Tú"
- **THEN** người đó không được thêm và app gợi ý chọn "Chơi lại" cho Tú

### Requirement: Nhập điểm một ván

Màn hình nhập ván SHALL có một ô cho mỗi người đang chơi. Điểm SHALL là số nguyên có giá trị tuyệt đối tối đa 9.999.999. Khi mở, ô đầu tiên SHALL được chọn. Chọn một ô đã có số thì số đầu nhập vào SHALL thay cả số cũ. Lối lưu SHALL luôn thấy trong màn hình. Bấm lưu liên tiếp MUST NOT tạo hai ván.

#### Scenario: Lưu ván

- **WHEN** nhóm hai người, người dùng nhập 12 và −12 rồi chọn "Lưu ván"
- **THEN** ván được thêm vào lịch sử, tổng của hai người đổi tương ứng

#### Scenario: Chữ không được nhận

- **WHEN** người dùng dán "12a" vào một ô điểm
- **THEN** ô đó bị báo lỗi và không lưu được ván

#### Scenario: Dạng số được nhận khi dán

- **WHEN** người dùng dán "+35", "−35" hoặc "３５" vào một ô điểm
- **THEN** ô đó được hiểu lần lượt là 35, −35 và 35

#### Scenario: Số quá lớn

- **WHEN** người dùng dán "10000000" vào một ô điểm
- **THEN** ô đó bị báo lỗi và không lưu được ván

#### Scenario: Thay số đã nhập

- **WHEN** ô của Lan đang là −10, người dùng chọn lại ô đó rồi nhập 5
- **THEN** ô của Lan là 5

#### Scenario: Thấy kết quả ngay sau khi lưu

- **WHEN** người dùng lưu một ván mới
- **THEN** bảng điểm ở đầu trang, thông báo đã lưu và bảng xếp hạng nằm trong màn hình

#### Scenario: Đóng màn hình không làm trang nhảy

- **WHEN** trang đang cuộn giữa chừng, người dùng mở màn hình nhập rồi đóng mà không lưu
- **THEN** trang ở đúng chỗ cũ

#### Scenario: Số ván trong thông báo

- **WHEN** một tab đang nhập "Ván 1", tab khác lưu một ván, rồi tab này lưu
- **THEN** thông báo ghi đã lưu ván 2

#### Scenario: Bấm lưu hai lần

- **WHEN** người dùng bấm "Lưu ván" hai lần thật nhanh
- **THEN** nhóm chỉ có thêm một ván

### Requirement: Giữ ván đang nhập dở

Đóng màn hình nhập khi đã có số SHALL hỏi lại trước khi bỏ, ngay trong màn hình đó. Ván mới đang nhập dở SHALL còn nguyên sau khi tải lại trang trong cùng tab; nếu danh sách người đang chơi đã đổi thì bản nháp SHALL bị bỏ.

#### Scenario: Đóng khi đang nhập dở

- **WHEN** người dùng đã nhập một ô rồi đóng màn hình nhập
- **THEN** app hỏi có bỏ ván đang nhập không; chọn "Nhập tiếp" thì màn hình nhập vẫn mở với số đã nhập

#### Scenario: Đóng ván vừa khôi phục

- **WHEN** ván nhập dở vừa được khôi phục sau khi tải lại và người dùng đóng màn hình nhập
- **THEN** app vẫn hỏi có bỏ ván đang nhập không

#### Scenario: Esc lặp lại

- **WHEN** người dùng bấm Esc nhiều lần liên tiếp ở màn hình nhập dở rồi chọn "Nhập tiếp"
- **THEN** màn hình nhập vẫn mở và dùng được, và nút "Nhập ván" vẫn mở được về sau

#### Scenario: Tải lại giữa chừng

- **WHEN** người dùng đã nhập hai ô rồi tải lại trang
- **THEN** màn hình nhập mở lại với hai số đó

### Requirement: Tự tính người còn trống

Khi còn trống đúng một ô, app SHALL hiện ngay ở dòng đó số làm tổng bằng 0 kèm nhãn "Tự tính" và lưu số đó cùng ván. Ô còn trống có thể là của bất kỳ ai. Người dùng SHALL ghi đè được bằng cách nhập vào ô đó. Số tự tính vượt giới hạn điểm SHALL chặn việc lưu. Số tự tính SHALL được báo cho trình đọc màn hình.

#### Scenario: Người cuối được tự tính

- **WHEN** nhóm bốn người, người dùng nhập Lan −10, Minh −20, Hùng −5 và để trống Tú
- **THEN** dòng của Tú hiện +35 với nhãn "Tự tính"; chọn "Lưu ván" thì ván lưu Tú +35

#### Scenario: Ô trống ở giữa danh sách

- **WHEN** nhóm ba người, người dùng nhập Lan 7 và Hùng 3, để trống Minh
- **THEN** dòng của Minh hiện −10 với nhãn "Tự tính"

#### Scenario: Xoá số làm đổi người được tự tính

- **WHEN** Tú đang được tự tính và người dùng nhập số vào ô của Tú rồi xoá số ở ô của Lan
- **THEN** Lan trở thành người được tự tính, ô của Tú giữ số đã nhập

#### Scenario: Ô chỉ có dấu trừ

- **WHEN** nhóm ba người, người dùng nhập Lan 5, Minh chỉ có dấu trừ chưa có số, Hùng 2
- **THEN** dòng của Minh hiện −7 với nhãn "Tự tính", nhập tiếp số vào ô đó thì số đó là số âm

#### Scenario: Có ô sai thì không tự tính

- **WHEN** nhóm ba người có Lan "12a", Minh 5 và Hùng để trống
- **THEN** không có số tự tính và trạng thái báo ô sai

#### Scenario: Số tự tính vượt giới hạn

- **WHEN** nhóm ba người có Lan 9.000.000, Minh 9.000.000 và Hùng để trống
- **THEN** trạng thái báo số tự tính quá lớn và không lưu được ván

#### Scenario: Số tự tính bằng 0

- **WHEN** nhóm ba người có Lan 5, Minh −5 và Hùng để trống
- **THEN** dòng của Hùng hiện 0 với nhãn "Tự tính" và lưu được ván

### Requirement: Tổng ván phải bằng 0

App SHALL hiện trạng thái của ván ngay khi nhập: còn bao nhiêu người chưa nhập, hoặc tổng đang lệch bao nhiêu, hoặc đã cân. Lối lưu SHALL không có tác dụng và nêu lý do khi chưa nhập gì, còn từ hai ô trống trở lên, có ô sai, hoặc đã điền đủ mà tổng khác 0. Ván toàn 0 SHALL lưu được.

#### Scenario: Còn hai ô trống

- **WHEN** nhóm bốn người có hai ô đã nhập
- **THEN** trạng thái ghi "Còn 2 người chưa nhập" và chọn "Lưu ván" không lưu gì

#### Scenario: Điền đủ mà lệch

- **WHEN** nhóm ba người có điểm 5, 5, −5
- **THEN** trạng thái ghi tổng đang lệch +5 và chọn "Lưu ván" không lưu gì

#### Scenario: Đã cân

- **WHEN** nhóm ba người có điểm 5, −2, −3
- **THEN** trạng thái ghi tổng đã bằng 0 và lưu được

#### Scenario: Người ngồi ngoài một ván

- **WHEN** nhóm năm người có Lan 10, Minh −10, Hùng 0, Tú 0 và Nam để trống
- **THEN** dòng của Nam hiện 0 với nhãn "Tự tính" và lưu được ván

### Requirement: Bàn số

Khi con trỏ chính của thiết bị là cảm ứng, màn hình nhập SHALL có bàn số gồm chữ số, `00`, nút đổi dấu, xoá lùi, "Tiếp" và "Lưu ván", và ô điểm SHALL khai báo `inputmode="none"`. Người dùng SHALL đổi được sang bàn phím của máy ngay trong màn hình nhập, và lựa chọn được nhớ trên trình duyệt. Khi con trỏ chính là chuột, hoặc đã đổi sang bàn phím của máy, SHALL không có bàn số và lối lưu nằm ở đầu màn hình.

#### Scenario: Nhập số âm bằng bàn số

- **WHEN** trên điện thoại ô của Lan đang được chọn, người dùng bấm 1, 2, ± rồi "Tiếp"
- **THEN** ô của Lan là −12 và ô tiếp theo được chọn

#### Scenario: Đổi dấu khi chưa có số

- **WHEN** ô đang trống và người dùng bấm ± rồi 5
- **THEN** ô đó là −5

#### Scenario: Đổi dấu số đã có

- **WHEN** người dùng chọn lại ô đang là 10 rồi bấm ±
- **THEN** ô đó là −10

#### Scenario: Xoá lùi ô vừa chọn

- **WHEN** người dùng chọn lại ô đang là −120 rồi bấm xoá lùi
- **THEN** ô đó trống

#### Scenario: Tiếp tới ô trống kế tiếp

- **WHEN** nhóm bốn người có ô 1 và ô 4 trống, ô 3 đang được chọn, người dùng bấm "Tiếp"
- **THEN** ô 4 được chọn; bấm "Tiếp" khi ô 4 vẫn trống thì ô 1 được chọn

#### Scenario: Tiếp khi không còn ô trống

- **WHEN** mọi ô đã có số, ô cuối đang được chọn, người dùng bấm "Tiếp"
- **THEN** ô đầu được chọn

#### Scenario: Ô được chọn luôn thấy

- **WHEN** nhóm 8 người ở khung 360 × 640 và "Tiếp" chọn một ô ngoài vùng đang thấy
- **THEN** danh sách cuộn để ô đó nằm trong vùng thấy

#### Scenario: Tám người trên màn hình nhỏ

- **WHEN** nhóm 8 người mở màn hình nhập ở khung 360 × 640
- **THEN** trạng thái và toàn bộ bàn số nằm trong màn hình, mọi ô điểm tới được bằng cách cuộn danh sách

#### Scenario: Xoay ngang

- **WHEN** nhóm 4 người mở màn hình nhập ở khung 844 × 390
- **THEN** bàn số và các ô nằm cạnh nhau, không phải cuộn trang để tới bàn số

#### Scenario: Gõ trên máy tính

- **WHEN** trên máy có chuột người dùng gõ "-12" rồi Enter ở ô của Lan
- **THEN** ô của Lan là −12, ô tiếp theo được chọn và không có bàn số trên màn hình

#### Scenario: Enter ở ô cuối

- **WHEN** trên máy có chuột người dùng bấm Enter ở ô cuối
- **THEN** ván được lưu nếu đủ điều kiện; nếu chưa đủ thì ô đó vẫn được chọn và không lưu gì

#### Scenario: Đổi sang bàn phím của máy

- **WHEN** trên điện thoại người dùng chọn "Dùng bàn phím của máy" rồi mở lại màn hình nhập
- **THEN** không có bàn số, ô điểm khai báo `inputmode="numeric"`, có lối lưu ở đầu màn hình và lối đổi lại bàn số

#### Scenario: Số âm với bàn phím của máy

- **WHEN** trên điện thoại đã đổi sang bàn phím của máy, người dùng chọn nút đổi dấu ở đầu màn hình rồi gõ 7
- **THEN** ô đang chọn là −7, kể cả khi bàn phím của máy không có dấu trừ

#### Scenario: Quay lại từ ứng dụng khác

- **WHEN** người dùng bấm 1, 2 trên bàn số, chuyển sang ứng dụng khác, quay lại rồi bấm 3
- **THEN** ô đó là 123

#### Scenario: Enter của bộ gõ

- **WHEN** người dùng dùng bộ gõ tiếng Nhật và Enter chỉ để chốt chữ trong ô điểm
- **THEN** ô tiếp theo không được chọn và ván không được lưu

### Requirement: Sửa và xoá ván đã lưu

Người dùng SHALL mở lại được bất kỳ ván nào để sửa điểm hoặc xoá ván; xoá SHALL hỏi xác nhận ngay trong màn hình đó. Sau khi sửa hoặc xoá, mọi tổng và cân điểm SHALL tính lại, các ván SHALL được đánh số lại theo thứ tự. Ván đang sửa SHALL gồm đúng những người có điểm trong ván đó, theo cùng điều kiện lưu như khi nhập mới. Sửa ván MUST NOT thêm người vào ván đó.

#### Scenario: Sửa ván cũ

- **WHEN** người dùng đổi ván 2 từ Lan 5, Minh −5 thành Lan 8, Minh −8
- **THEN** tổng của Lan tăng 3, tổng của Minh giảm 3

#### Scenario: Xoá ván

- **WHEN** nhóm có 3 ván và người dùng xác nhận xoá ván 2
- **THEN** còn 2 ván, được đánh số 1 và 2, tổng không còn tính ván đã xoá, và tiêu điểm về nút "Nhập ván 3"

#### Scenario: Sửa ván có người đã nghỉ

- **WHEN** Tú đã nghỉ và người dùng mở một ván cũ có điểm của Tú
- **THEN** ván hiện ô của Tú, không hiện ô của người vào sau ván đó

#### Scenario: Sửa ngay ván vừa lưu

- **WHEN** người dùng vừa lưu ván 13 và chọn "Sửa" trong thông báo đã lưu
- **THEN** màn hình sửa ván 13 mở ra mà không phải cuộn tới lịch sử

#### Scenario: Quá giới hạn số ván

- **WHEN** nhóm đã có 500 ván
- **THEN** không nhập thêm ván được và app gợi ý tạo buổi mới

### Requirement: Bảng xếp hạng hiện tại

Bảng điểm SHALL xếp mọi người chơi theo tổng điểm từ cao xuống thấp, kèm hạng và số ván nhất của từng người, cùng tổng số ván của nhóm. Bằng điểm thì cùng hạng, hạng sau bỏ qua số tương ứng. Ván nhất là ván người đó có điểm cao nhất và điểm đó lớn hơn 0; nhiều người cùng cao nhất thì mỗi người một ván nhất. Tổng SHALL có dấu, không chỉ khác màu.

#### Scenario: Bằng điểm

- **WHEN** tổng là Lan 20, Minh 20, Hùng −15, Tú −25
- **THEN** Lan và Minh cùng hạng 1, Hùng hạng 3, Tú hạng 4

#### Scenario: Có dấu

- **WHEN** Hùng có tổng −15 và Lan có tổng 20
- **THEN** bảng ghi "−15" và "+20"

#### Scenario: Ván nhất có người bằng điểm

- **WHEN** một ván có Lan 10, Minh 10, Hùng −20
- **THEN** Lan và Minh mỗi người được tính thêm một ván nhất

#### Scenario: Ván toàn 0

- **WHEN** một ván có mọi người đều 0
- **THEN** không ai được tính ván nhất

#### Scenario: Chưa có ván

- **WHEN** nhóm chưa có ván nào
- **THEN** mọi người cùng hạng 1, tổng 0 và không ai được đánh dấu dẫn đầu

### Requirement: Gợi ý cân điểm

Khi có người có tổng khác 0, bảng điểm SHALL liệt kê các lần chuyển điểm để mọi tổng về 0, không quá số người có tổng khác 0 trừ 1 lần, tính cả người đã nghỉ. Danh sách SHALL được ghi là gợi ý, dùng đơn vị điểm, và MUST NOT có đơn vị tiền.

#### Scenario: Cân điểm bốn người

- **WHEN** tổng là Lan +120, Minh +30, Hùng −50, Tú −100
- **THEN** danh sách ghi Tú chuyển Lan 100, Hùng chuyển Minh 30, Hùng chuyển Lan 20

#### Scenario: Người đã nghỉ vẫn được tính

- **WHEN** Tú đã nghỉ với tổng −40 và Lan có tổng +40
- **THEN** danh sách ghi Tú chuyển Lan 40

#### Scenario: Đã cân

- **WHEN** mọi tổng đều bằng 0
- **THEN** mục cân điểm ghi không cần chuyển gì

### Requirement: Lịch sử các ván

Bảng điểm SHALL có bảng các ván, ván mới nhất lên đầu, mỗi cột một người chơi, mỗi ván có giờ lưu theo giờ của thiết bị và lối sửa. Bảng rộng hơn màn hình SHALL cuộn ngang trong khung của nó với cột số ván cố định; trang MUST NOT cuộn ngang. Khung cuộn SHALL tới được bằng bàn phím.

#### Scenario: Tám người trên điện thoại

- **WHEN** nhóm 8 người có ván, mở ở khung 360 × 740
- **THEN** trang không cuộn ngang, bảng các ván cuộn ngang được trong khung của nó

#### Scenario: Điểm tự tính trong lịch sử

- **WHEN** người dùng lưu ván có Tú được tự tính +35
- **THEN** lịch sử ghi Tú +35 như mọi số khác

### Requirement: Chia sẻ tổng kết

Bảng điểm SHALL có nút chia sẻ tổng kết dưới dạng chữ gồm tên nhóm, ngày, số ván, xếp hạng và cân điểm, bằng ngôn ngữ đang dùng. App SHALL dùng bảng chia sẻ của thiết bị nếu có, không thì sao chép và báo đã sao chép; không làm được cả hai thì hiện chữ để người dùng tự chọn. Nhóm chưa có ván thì nút SHALL không có tác dụng và nêu lý do.

#### Scenario: Nội dung tổng kết

- **WHEN** nhóm Team Dev có 5 ván với tổng Lan +120, Minh +30, Hùng −50, Tú −100 và người dùng chia sẻ tổng kết
- **THEN** chữ gồm "Team Dev", ngày hôm nay, "5 ván", bốn dòng xếp hạng và ba dòng cân điểm

#### Scenario: Máy không có bảng chia sẻ

- **WHEN** trên máy tính không có bảng chia sẻ, người dùng chọn "Chia sẻ tổng kết"
- **THEN** chữ tổng kết được sao chép và app báo "Đã sao chép"

#### Scenario: Huỷ bảng chia sẻ

- **WHEN** người dùng mở bảng chia sẻ của điện thoại rồi huỷ
- **THEN** không có thông báo lỗi nào

#### Scenario: Không sao chép được

- **WHEN** trình duyệt từ chối cả chia sẻ lẫn sao chép
- **THEN** một hộp thoại hiện chữ tổng kết để người dùng tự chọn

#### Scenario: Chưa có ván

- **WHEN** nhóm chưa có ván và người dùng chọn "Chia sẻ tổng kết"
- **THEN** không có gì được chia sẻ và app nêu lý do

### Requirement: Buổi chơi mới từ nhóm cũ

Từ một nhóm, người dùng SHALL mở được biểu mẫu tạo nhóm đã điền sẵn tên nhóm và những người đang chơi. Nhóm cũ MUST NOT đổi. Nhóm nguồn không đọc được thì biểu mẫu SHALL mở trống và nói lý do.

#### Scenario: Buổi mới

- **WHEN** từ nhóm Team Dev có Lan, Minh, Hùng và Tú đã nghỉ, người dùng chọn "Buổi mới" rồi "Tạo nhóm"
- **THEN** có nhóm mới tên Team Dev với Lan, Minh, Hùng, tổng 0, chưa có ván; nhóm cũ vẫn còn đủ ván

#### Scenario: Nhóm nguồn không còn

- **WHEN** người dùng mở `/tools/card-score/new?from=<id>` với id không có trên trình duyệt này
- **THEN** biểu mẫu mở trống kèm lời giải thích không tìm thấy nhóm nguồn

### Requirement: Xoá nhóm

Người dùng SHALL xoá được một nhóm sau khi xác nhận; hộp thoại SHALL nêu tên nhóm và số ván sẽ mất. Xoá không hoàn tác được.

#### Scenario: Xác nhận xoá

- **WHEN** người dùng xác nhận xoá một nhóm có 12 ván
- **THEN** danh sách nhóm mở ra không còn nhóm đó và mở lại đường dẫn cũ thì báo không tìm thấy

#### Scenario: Huỷ xoá

- **WHEN** người dùng chọn huỷ trong hộp thoại xoá
- **THEN** nhóm và các ván không đổi

### Requirement: Dữ liệu trên trình duyệt này

Nhóm và điểm SHALL được lưu trên trình duyệt đang dùng ngay khi người dùng lưu, và còn nguyên sau khi tải lại hay đóng mở trang. App MUST NOT gửi nhóm, tên hay điểm lên server. Hai tab cùng ghi một nhóm MUST NOT làm mất ván của nhau; tab còn lại SHALL thấy dữ liệu mới khi người dùng quay lại tab đó, và MUST NOT làm mất số đang nhập dở.

#### Scenario: Tải lại trang

- **WHEN** người dùng lưu một ván rồi tải lại trang
- **THEN** ván đó và các tổng vẫn đúng

#### Scenario: Không gửi lên mạng

- **WHEN** người dùng tạo nhóm và lưu ván
- **THEN** không có yêu cầu mạng hay thông điệp WebSocket nào chứa tên hoặc điểm

#### Scenario: Hai tab lưu cùng lúc

- **WHEN** hai tab cùng mở một nhóm và cùng bấm "Lưu ván" nhiều lần gần như đồng thời
- **THEN** nhóm có đủ mọi ván của cả hai tab

#### Scenario: Quay lại tab cũ

- **WHEN** tab B đang mở bảng điểm, tab A lưu một ván, người dùng quay lại tab B
- **THEN** tab B hiện ván mới

#### Scenario: Người chơi bị xoá ở tab khác

- **WHEN** tab B đang nhập ván có Nam và tab A xoá Nam, rồi tab B chọn "Lưu ván"
- **THEN** ván không được lưu, app giải thích danh sách người đã đổi và các số đã nhập vẫn còn

#### Scenario: Không lưu được

- **WHEN** trình duyệt từ chối ghi dữ liệu hoặc không trả lời lúc người dùng chọn "Lưu ván"
- **THEN** app báo chưa lưu được, màn hình nhập vẫn mở, các số đã nhập vẫn còn; lưu lại không tạo ván trùng

#### Scenario: Lưu lại với số đã sửa

- **WHEN** app báo chưa lưu được nhưng lần ghi đó vẫn thành công muộn, người dùng sửa số rồi lưu lại
- **THEN** nhóm chỉ có một ván đó, với số mới

#### Scenario: Trình duyệt chặn lưu trữ

- **WHEN** trình duyệt không cho dùng bộ nhớ lúc mở danh sách nhóm
- **THEN** trang báo không dùng được công cụ trên trình duyệt này và có lối quay về

#### Scenario: Dữ liệu của bản mới hơn

- **WHEN** một nhóm được lưu bởi phiên bản app mới hơn
- **THEN** danh sách báo có nhóm cần tải lại trang để xem, trang của nhóm báo tương tự, và app MUST NOT ghi đè nhóm đó

#### Scenario: Một nhóm hỏng

- **WHEN** một nhóm trong bộ nhớ có dữ liệu không đọc được
- **THEN** các nhóm khác vẫn hiện, danh sách báo có nhóm không đọc được kèm lối mở trang của nhóm đó, nhóm đó không bị tự xoá và người dùng chọn xoá được từ trang của nhóm

### Requirement: Dùng được khi mất mạng trong lúc đang mở công cụ

Khi công cụ đã mở trong tab, mọi màn hình của nó (danh sách nhóm, tạo nhóm, sửa nhóm, bảng điểm, nhập ván) SHALL chuyển qua lại và hoạt động mà không cần mạng. App chưa có khả năng chạy offline, nên tải lại trang khi mất mạng nằm ngoài yêu cầu này.

#### Scenario: Mất mạng giữa buổi

- **WHEN** bảng điểm đang mở, mạng mất, người dùng lưu một ván, thêm một người, về danh sách nhóm, tạo nhóm mới rồi mở lại nhóm cũ
- **THEN** mọi thao tác thành công như khi có mạng

### Requirement: Đường dẫn nhóm trên máy khác

Đường dẫn của một nhóm không có trên trình duyệt này SHALL hiện trạng thái không tìm thấy, giải thích nhóm chỉ lưu trên máy đã tạo, kèm lối về danh sách nhóm.

#### Scenario: Mở link trên máy khác

- **WHEN** một người mở `/tools/card-score/<id>` của nhóm không có trên trình duyệt của họ
- **THEN** trang giải thích nhóm chỉ lưu trên máy đã tạo và có lối về danh sách nhóm

#### Scenario: Đường dẫn không có

- **WHEN** một người mở `/tools/card-score/a/b/c`
- **THEN** trang không tìm thấy của app hiện ra

### Requirement: Tiếp cận và màn hình nhỏ

Mọi trang và hộp thoại của công cụ MUST NOT có vi phạm WCAG 2.x mức A hay AA mà axe-core phát hiện được, ở cả sáng lẫn tối, trên khung điện thoại và máy tính, và MUST NOT cuộn ngang ở khung 360 px. Mọi thao tác SHALL làm được bằng bàn phím. Kết quả lưu và thay đổi trạng thái của ván SHALL được báo cho trình đọc màn hình.

#### Scenario: Quét màn hình nhập ván

- **WHEN** axe-core quét màn hình nhập ván có một ô tự tính, ở giao diện tối trên khung điện thoại
- **THEN** không có vi phạm WCAG A hay AA nào

#### Scenario: Báo đã lưu

- **WHEN** người dùng lưu ván 13 và màn hình nhập đóng lại
- **THEN** vùng `role="status"` của bảng điểm báo đã lưu ván 13

#### Scenario: Cả luồng bằng bàn phím

- **WHEN** trên máy có chuột người dùng chỉ dùng Tab, Enter và phím số để tạo nhóm, lưu một ván, sửa ván đó và xoá ván đó
- **THEN** mọi bước đều làm được

#### Scenario: Không cuộn ngang

- **WHEN** nhóm 8 người có tên dài 24 ký tự mở danh sách nhóm, bảng điểm, biểu mẫu nhóm và màn hình nhập ở khung 360 × 740
- **THEN** không trang nào rộng hơn khung hình
