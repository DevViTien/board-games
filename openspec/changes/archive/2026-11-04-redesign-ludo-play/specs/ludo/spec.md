## MODIFIED Requirements

### Requirement: Bàn Cờ cá ngựa

Bàn SHALL vẽ hình chữ thập gồm đường chung, bốn chuồng ở bốn góc, bốn chuồng đích 6 bậc đánh số và các ô chân chuồng có dấu riêng. Mỗi ngựa SHALL phân biệt được bằng cả màu lẫn ký hiệu của màu đó, không chỉ bằng màu. Ngựa vừa đi SHALL được đánh dấu. Khung xúc xắc và nút "Gieo xúc xắc" SHALL mang màu của người đang đến lượt (người sắp gieo hoặc đang chọn ngựa; lúc xúc xắc còn lăn, khung mang màu người vừa gieo); kết quả gieo gần nhất SHALL hiện kèm tên người gieo, kể cả khi đã sang lượt khác.

#### Scenario: Phân biệt không chỉ bằng màu

- **WHEN** bàn có ngựa của bốn màu
- **THEN** ngựa của mỗi màu có ký hiệu riêng (tròn, vuông, tam giác, thoi), khác nhau cả khi không nhìn màu

#### Scenario: Đánh dấu nước vừa đi

- **WHEN** Xanh dương vừa gieo được 4 và đi ngựa 2, và tới lượt Vàng gieo
- **THEN** ngựa 2 của Xanh dương được đánh dấu là vừa đi
- **AND** xúc xắc chưa có số và có khung màu Vàng
- **AND** bàn ghi lần gieo trước là Xanh dương gieo được 4

#### Scenario: Xúc xắc khi đang chọn ngựa

- **WHEN** Đỏ vừa gieo được 6 và đang chọn ngựa để đi
- **THEN** xúc xắc hiện 6 với khung màu Đỏ

#### Scenario: Xúc xắc đang lăn khi mất lượt

- **WHEN** Đỏ gieo được 3, mất lượt, và xúc xắc nhỏ cạnh bàn còn đang lăn
- **THEN** xúc xắc có khung màu Đỏ và chưa có ghi lần gieo trước
- **AND** khi xúc xắc dừng, xúc xắc chưa có số, có khung màu của người kế tiếp và bàn ghi lần gieo trước là Đỏ gieo được 3

#### Scenario: Nút gieo theo màu người sắp gieo

- **WHEN** trong ván cùng máy, Đỏ vừa đi xong và tới lượt Xanh dương gieo
- **THEN** nút "Gieo xúc xắc" mang màu Xanh dương

### Requirement: Gieo và chọn ngựa trên bàn

Khi người ở thiết bị này đến lượt gieo, bàn SHALL có nút "Gieo xúc xắc". Sau khi gieo, bàn SHALL cho chọn đúng những ngựa đi được ngay trên bàn (requirement "Chạm ngựa để đi"), mỗi ngựa chọn được nói ngựa nào và sẽ tới đâu (kể cả ngựa bị đá), và chỉ ra ô đích trên bàn khi trỏ hay đưa tiêu điểm tới. Ngựa không đi được MUST NOT chọn được. Bàn SHALL báo kết quả gieo, mất lượt và được gieo thêm; gieo 6 mà không ngựa nào đi được SHALL được báo là được gieo thêm, không phải mất lượt.

#### Scenario: Gieo xúc xắc

- **WHEN** đến lượt Đỏ gieo trong ván cùng máy và người chơi bấm "Gieo xúc xắc"
- **THEN** bàn hiện số vừa gieo

#### Scenario: Chọn ngựa

- **WHEN** Đỏ vừa gieo được 6, có một ngựa trong chuồng và một ngựa trên đường đi được 6 ô tới ô có ngựa Vàng
- **THEN** bàn có hai ngựa chọn được: ngựa trong chuồng, nói là ra chuồng, và ngựa trên đường, nói là đi 6 ô và đá ngựa Vàng

#### Scenario: Báo mất lượt

- **WHEN** Đỏ gieo được 3 mà không ngựa nào đi được
- **THEN** bàn báo Đỏ gieo được 3 và mất lượt

#### Scenario: Gieo 6 không đi được

- **WHEN** Đỏ gieo được 6 mà không ngựa nào đi được
- **THEN** bàn báo Đỏ gieo được 6, không đi được và được gieo thêm, không báo mất lượt

#### Scenario: Ô đích khi đưa tiêu điểm

- **WHEN** người chơi đưa tiêu điểm tới một ngựa chọn được
- **THEN** ngựa đó và ô đích của nó được làm nổi bật trên bàn

### Requirement: Cờ cá ngựa bằng bàn phím và trình đọc màn hình

Gieo và chọn ngựa SHALL làm được hoàn toàn bằng bàn phím. Sau khi gieo bằng bàn phím, tiêu điểm SHALL tới ngựa chọn được đầu tiên khi xúc xắc dừng; sau khi đi hay mất lượt, tiêu điểm MUST ở lại trên nút gieo. Vị trí mọi ngựa (trong chuồng, ô thứ mấy tính từ ô xuất phát của nó, chân chuồng, bậc mấy) SHALL đọc được bằng trình đọc màn hình. Kết quả gieo của người ở thiết bị này SHALL được tự đọc khi xúc xắc dừng; mỗi lần gieo hay nước đi MUST NOT được đọc hai lần.

#### Scenario: Gieo và đi bằng bàn phím

- **WHEN** người chơi dùng Tab tới nút "Gieo xúc xắc", nhấn Enter, và có ngựa đi được
- **THEN** khi xúc xắc dừng, tiêu điểm ở ngựa chọn được đầu tiên, nhấn Enter thì ngựa đó đi và tiêu điểm về nút gieo

#### Scenario: Chuyển ngựa bằng phím mũi tên

- **WHEN** có hai ngựa chọn được và tiêu điểm đang ở ngựa đầu tiên
- **THEN** nhấn mũi tên phải đưa tiêu điểm tới ngựa thứ hai, và nhấn Tab rời khỏi nhóm ngựa

#### Scenario: Đọc vị trí ngựa

- **WHEN** trình đọc màn hình đọc danh sách vị trí ngựa khi ngựa 1 của Đỏ ở ô thứ 17
- **THEN** danh sách có "Đỏ, ngựa 1: ô 17"

### Requirement: Hiệu ứng gieo và đi quân

Kết quả gieo SHALL hiện bằng hiệu ứng xúc xắc lăn (cú tung giữa màn hình cho người ở thiết bị này, xúc xắc nhỏ cạnh bàn cho người khác) và ngựa SHALL đi qua từng ô tới đích. Máy MUST NOT đi nước kế tiếp trước khi hiệu ứng của nước trước kết thúc. Khi hệ thống bật giảm chuyển động, bàn MUST hiện ngay kết quả và vị trí mới, không hiệu ứng. Thay đổi mới tới giữa chừng SHALL kết thúc ngay hiệu ứng đang chạy, trừ cú tung ("Cú tung không bị cắt"). Ngoài cú tung, hiệu ứng MUST NOT tự khoá bàn.

#### Scenario: Giảm chuyển động

- **WHEN** hệ thống bật giảm chuyển động và Đỏ đi một ngựa 5 ô
- **THEN** ngựa hiện ngay ở ô đích, không đi qua từng ô

#### Scenario: Cập nhật mới giữa hiệu ứng

- **WHEN** ngựa đang đi từng ô thì có nước mới tới
- **THEN** ngựa hiện ngay ở ô đích của nước trước và hiệu ứng của nước mới bắt đầu

#### Scenario: Máy gieo không làm mờ màn hình

- **WHEN** trong ván đấu với máy, máy gieo xúc xắc
- **THEN** xúc xắc nhỏ cạnh bàn lăn rồi hiện số, màn hình không bị làm mờ

#### Scenario: Người ở xa gieo không làm mờ màn hình

- **WHEN** trong phòng Cờ cá ngựa online, Lan ở thiết bị khác gieo xúc xắc
- **THEN** trên màn hình của người chơi, xúc xắc nhỏ cạnh bàn lăn rồi hiện số, màn hình không bị làm mờ

### Requirement: Bàn Cờ cá ngựa vừa màn hình điện thoại

Ở khung rộng 360 px, bàn, xúc xắc và nút gieo SHALL hiện trọn chiều ngang mà không cuộn ngang, và quân ở hàng ngoài cùng MUST NOT bị cắt. Nút gieo và mỗi ngựa chọn được SHALL có vùng chạm ít nhất 24 × 24 px để chạm chính xác bằng ngón tay; một lần chạm SHALL thuộc về ngựa có hình gần chỗ chạm nhất, và chỉ đi khi chính ngựa đó chọn được.

#### Scenario: Bàn 4 người trên điện thoại hẹp

- **WHEN** người chơi mở ván Cờ cá ngựa 4 người ở khung rộng 360 px
- **THEN** trang không cuộn ngang và người chơi chạm được nút gieo và từng ngựa chọn được

#### Scenario: Hai ngựa chọn được nằm sát nhau

- **WHEN** hai ngựa chọn được nằm ở hai ô liền nhau và người chơi chạm vào chỗ gần tâm ngựa thứ hai hơn
- **THEN** ngựa thứ hai đi

#### Scenario: Chạm ngựa không đi được cạnh ngựa đi được

- **WHEN** một ngựa không đi được nằm ngay trên ô liền kề một ngựa chọn được và người chơi chạm vào giữa ngựa không đi được
- **THEN** không có nước nào được đi

## ADDED Requirements

### Requirement: Quân hình con ngựa

Mỗi ngựa trên bàn SHALL được vẽ thành một quân hình con ngựa tự vẽ, mang màu của người chơi và ký hiệu của màu đó (tròn, vuông, tam giác, thoi) trên đế quân, để ngựa vẫn phân biệt được khi không nhìn màu, ở mọi khổ màn hình kể cả 360 px.

#### Scenario: Quân hình con ngựa

- **WHEN** bàn hiện một ngựa Đỏ trên đường chung
- **THEN** ngựa được vẽ thành quân hình con ngựa, ký hiệu tròn của màu Đỏ nằm trên đế quân

### Requirement: Chạm ngựa để đi

Sau khi gieo, những ngựa chọn được SHALL nổi bật trên bàn bằng dấu không chỉ dựa vào màu, và một lần chạm hay bấm vào chính ngựa đó SHALL đi ngựa ngay, không bước xác nhận. Các ngựa chọn được SHALL nhận tiêu điểm ngay trên bàn, phím mũi tên chuyển giữa chúng. Bàn MUST NOT còn danh sách nút lựa chọn riêng ngoài bàn. Chạm vào ngựa không chọn được, hay chạm lúc chưa gieo, MUST NOT đi nước nào.

#### Scenario: Một chạm là đi

- **WHEN** Đỏ vừa gieo được 5 và người chơi chạm vào ngựa 1 đi được của Đỏ
- **THEN** ngựa 1 đi 5 ô ngay, không có bước xác nhận

#### Scenario: Chạm ngựa không đi được

- **WHEN** Đỏ vừa gieo được 5 và người chơi chạm vào một ngựa không đi được
- **THEN** không có nước nào được đi và các ngựa chọn được vẫn nổi bật

#### Scenario: Không còn danh sách lựa chọn

- **WHEN** Đỏ vừa gieo và có hai ngựa chọn được
- **THEN** ngoài bàn không có nút lựa chọn ngựa nào, và hai ngựa đó được làm nổi bật trên bàn

### Requirement: Gieo bằng nhấn giữ

Khi xúc xắc 3D dùng được, nhấn giữ "Gieo xúc xắc" SHALL làm mờ cả màn hình và hiện xúc xắc lắc ở giữa; thả tay SHALL tung xúc xắc, giữ lâu hơn thì lăn lâu hơn trong một giới hạn. Bấm nhanh hay nhấn Enter SHALL là một cú tung ngắn; giữ Space SHALL lắc, nhả SHALL tung. Lớp mờ SHALL tắt trong vòng 2,2 giây kể từ khi có số; số chưa về sau 3 giây kể từ khi thả thì lớp mờ SHALL tắt và số tới sau hiện ở ô xúc xắc cạnh bàn. Chỉ lần gieo của người ở thiết bị này có lớp mờ.

#### Scenario: Nhấn giữ rồi thả

- **WHEN** đến lượt Đỏ ở thiết bị này, người chơi nhấn giữ "Gieo xúc xắc" rồi thả
- **THEN** trong lúc giữ, màn hình mờ và xúc xắc lắc ở giữa; sau khi thả, xúc xắc lăn, dừng ở số vừa gieo, rồi lớp mờ tắt và ô xúc xắc cạnh bàn hiện số đó

#### Scenario: Bấm nhanh

- **WHEN** người chơi bấm nhanh "Gieo xúc xắc" không giữ
- **THEN** xúc xắc được tung ngắn, dừng ở số vừa gieo và lớp mờ tắt trong vòng 2,2 giây kể từ khi có số

#### Scenario: Giữ lâu tung lâu hơn

- **WHEN** người chơi giữ "Gieo xúc xắc" 1,5 giây rồi thả
- **THEN** xúc xắc lăn lâu hơn một lần bấm nhanh, và lớp mờ vẫn tắt trong vòng 2,2 giây kể từ khi có số

#### Scenario: Số về muộn

- **WHEN** trong phòng online, người chơi thả tay và số chưa về sau 3 giây
- **THEN** lớp mờ tắt; khi số tới, ô xúc xắc cạnh bàn hiện số đó

#### Scenario: Giữ Space để lắc

- **WHEN** tiêu điểm ở nút "Gieo xúc xắc", người chơi giữ phím Space rồi nhả
- **THEN** xúc xắc lắc trong lúc giữ và được tung khi nhả

#### Scenario: Huỷ khi đang giữ

- **WHEN** người chơi đang giữ "Gieo xúc xắc" và nhấn Esc
- **THEN** lớp mờ tắt, không có lần gieo nào và vẫn đến lượt người chơi gieo

### Requirement: Số gieo không phụ thuộc cách tung

Số của mỗi lần gieo SHALL do engine (cùng máy) hoặc server (online) tạo như mọi lần gieo khác, và chỉ được xin khi người chơi thả tay; thời gian giữ, lực tung và hình 3D MUST NOT ảnh hưởng tới số ra, và nước gửi đi MUST NOT mang thông tin nào về cú tung. Mặt nằm trên của xúc xắc 3D khi dừng SHALL đúng là số ván ghi.

#### Scenario: Mặt trên đúng số ván ghi

- **WHEN** lần gieo của người chơi được ván ghi là 4
- **THEN** xúc xắc 3D dừng với mặt 4 nằm trên

#### Scenario: Giữ lâu không gửi gì thêm

- **WHEN** người chơi giữ "Gieo xúc xắc" 3 giây rồi thả
- **THEN** nước gửi đi chỉ là một nước gieo, không kèm thời gian giữ hay số chấm

#### Scenario: Chưa thả thì chưa gieo

- **WHEN** người chơi đang giữ "Gieo xúc xắc"
- **THEN** ván chưa có lần gieo mới nào

### Requirement: Gieo khi không có xúc xắc 3D

Khi trình duyệt không vẽ được 3D, phần 3D chưa tải xong hay tải lỗi, hoặc hệ thống bật giảm chuyển động, bấm "Gieo xúc xắc" SHALL gieo ngay, không lớp mờ, và số SHALL hiện ở ô xúc xắc cạnh bàn như lần gieo của người khác. Phần 3D lỗi giữa cú tung SHALL đóng lớp mờ ngay và hiện số đã gieo.

#### Scenario: Không có WebGL

- **WHEN** trình duyệt không hỗ trợ WebGL và người chơi bấm "Gieo xúc xắc"
- **THEN** không có lớp mờ, và ô xúc xắc cạnh bàn hiện số vừa gieo

#### Scenario: Giảm chuyển động khi gieo

- **WHEN** hệ thống bật giảm chuyển động và người chơi bấm "Gieo xúc xắc"
- **THEN** không có lớp mờ hay xúc xắc lăn, số vừa gieo hiện ngay ở ô xúc xắc cạnh bàn

### Requirement: Kết quả chỉ lộ khi xúc xắc dừng

Trong lúc cú tung của người ở thiết bị này chưa dừng, màn hình chơi (dòng lượt, bảng người chơi, xúc xắc nhỏ, lời nhắc, nút của ván) SHALL vẫn hiện như lúc trước khi gieo, và kết quả MUST NOT được đọc cho trình đọc màn hình. Khi xúc xắc dừng, màn hình SHALL cập nhật và kết quả SHALL được đọc đúng một lần.

#### Scenario: Mất lượt chưa lộ khi xúc xắc còn lăn

- **WHEN** trong ván đấu với máy, người chơi gieo được 3, mất lượt, và xúc xắc còn đang lăn giữa màn hình
- **THEN** dòng lượt vẫn ghi đến lượt người chơi, chưa ghi "Máy đang nghĩ…"
- **AND** khi xúc xắc dừng, dòng lượt chuyển sang lượt máy và kết quả gieo được đọc một lần

### Requirement: Đang tung thì không đi được

Từ lúc thả tay tới khi lớp mờ tắt, mọi lần bấm, chạm hay phím MUST NOT gieo thêm hay đi ngựa. Cú giữ SHALL bị huỷ, không gieo, khi người chơi không còn gieo được (mất kết nối, đầu hàng, ván kết thúc), khi trang bị ẩn hay cửa sổ mất tiêu điểm, hoặc khi nhấn Esc.

#### Scenario: Gieo 6 không đi được chỉ gieo một lần

- **WHEN** người chơi bấm nhanh "Gieo xúc xắc", được 6 mà không ngựa nào đi được, và còn bấm thêm lần nữa trong lúc xúc xắc đang lăn
- **THEN** ván chỉ có một lần gieo mới, và người chơi gieo tiếp được sau khi lớp mờ tắt

#### Scenario: Mất kết nối khi đang giữ

- **WHEN** trong phòng online, người chơi đang giữ "Gieo xúc xắc" thì kết nối bị ngắt
- **THEN** lớp mờ tắt và không có nước gieo nào được gửi

### Requirement: Cú tung không bị cắt

Nước của người khác tới trong lúc cú tung của người ở thiết bị này chưa xong SHALL chỉ hiện sau khi lớp mờ tắt, theo đúng thứ tự. Cú tung SHALL kết thúc ngay khi ván trên màn hình được thay (ván mới, hay trạng thái mới của phòng sau khi kết nối lại).

#### Scenario: Người ở xa gieo nhanh trong lúc xúc xắc còn lăn

- **WHEN** trong phòng Cờ cá ngựa online, người chơi gieo được 2, mất lượt, và Lan gieo ngay khi tới lượt trong lúc xúc xắc của người chơi còn lăn
- **THEN** lần gieo của Lan chỉ hiện sau khi lớp mờ của người chơi tắt

#### Scenario: Kết nối lại khi đang tung

- **WHEN** trong phòng online, cú tung đang chạy thì kết nối bị ngắt và nối lại, phòng đã có thêm nước mới
- **THEN** lớp mờ tắt ngay và bàn hiện trạng thái mới nhất của phòng
