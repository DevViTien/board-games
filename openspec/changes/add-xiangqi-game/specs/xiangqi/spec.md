## Purpose

Cờ tướng: game hai người cổ truyền, bàn 9 × 10 giao điểm có sông và cung. Capability này tả luật (cách đi từng quân, chiếu, kết thúc ván), máy chơi và màn hình chơi của game.

## ADDED Requirements

### Requirement: Bàn và quân

Cờ tướng SHALL chơi với đúng 2 người: Đỏ đi trước, ở phía dưới; Đen ở phía trên. Bàn SHALL có 9 cột × 10 hàng giao điểm, sông giữa hàng 5 và 6, mỗi bên một cung 3 × 3 giao điểm. Thế mở đầu SHALL là thế chuẩn: mỗi bên 1 Tướng, 2 Sĩ, 2 Tượng, 2 Mã, 2 Xe, 2 Pháo, 5 Tốt. Cột SHALL đánh số 1–9 từ phải sang trái theo hướng nhìn của mỗi bên.

#### Scenario: Thế mở đầu

- **WHEN** một ván Cờ tướng mới được tạo
- **THEN** Đỏ đến lượt, mỗi bên có 16 quân ở vị trí chuẩn, và Đỏ có 44 nước đi hợp lệ

### Requirement: Cách đi của quân

Mỗi quân SHALL đi theo luật cờ tướng:

- Tướng đi một bước ngang hay dọc trong cung; Sĩ đi một bước chéo trong cung;
- Tượng đi chéo hai bước, không qua sông, bị chặn khi điểm giữa có quân;
- Mã đi một bước thẳng rồi một bước chéo ra ngoài, bị chặn khi điểm kề theo hướng đi có quân;
- Xe đi thẳng bao xa cũng được tới khi gặp quân;
- Pháo đi như Xe, nhưng ăn quân phải nhảy qua đúng một quân;
- Tốt tiến một bước, qua sông thì được đi ngang, không bao giờ lùi.

Không quân nào ăn được quân cùng màu.

#### Scenario: Mã bị cản chân

- **WHEN** có quân đứng ngay trên Mã đỏ
- **THEN** Mã không đi được hai điểm hướng lên trên

#### Scenario: Pháo ăn qua ngòi

- **WHEN** giữa Pháo đỏ và một Tốt đen trên cùng cột có đúng một quân
- **THEN** Pháo ăn được Tốt đó, và không đi được tới các điểm trống sau quân ngòi

#### Scenario: Tượng không qua sông

- **WHEN** Tượng đỏ đứng sát sông
- **THEN** Tượng không có nước sang bên kia sông

### Requirement: Tướng không đối mặt và không tự để bị chiếu

Một nước MUST bị loại khỏi các nước hợp lệ khi sau nước đó Tướng của bên đi bị chiếu, hoặc hai Tướng đứng cùng cột mà không có quân nào ở giữa.

#### Scenario: Lộ mặt Tướng

- **WHEN** quân duy nhất giữa hai Tướng trên cùng cột là một Pháo đỏ
- **THEN** Pháo đó không đi ra khỏi cột được

### Requirement: Thắng khi chiếu bí hoặc hết nước

Khi bên đến lượt không còn nước hợp lệ nào, bên đó SHALL thua: bị chiếu thì là chiếu bí, không bị chiếu thì là hết nước. Ván kết thúc ngay.

#### Scenario: Chiếu bí

- **WHEN** Tướng đen bị chiếu và Đen không có nước hợp lệ
- **THEN** ván kết thúc, Đỏ thắng vì chiếu bí

#### Scenario: Hết nước là thua

- **WHEN** Đen không bị chiếu nhưng không có nước hợp lệ
- **THEN** ván kết thúc, Đỏ thắng vì Đen hết nước

### Requirement: Chiếu dai và lặp lại

Khi một thế cờ (vị trí quân và bên đến lượt) xuất hiện lần thứ ba:

- nếu mọi nước của đúng một bên từ lần đầu tới giờ đều là nước chiếu, bên đó SHALL thua vì chiếu dai;
- trong mọi trường hợp khác, ván SHALL hoà vì lặp lại.

#### Scenario: Chiếu dai thì thua

- **WHEN** Xe đỏ chiếu đi chiếu lại, Tướng đen tránh qua tránh lại, và thế cờ lặp lại lần thứ ba
- **THEN** ván kết thúc, Đen thắng vì Đỏ chiếu dai

#### Scenario: Lặp lại không chiếu thì hoà

- **WHEN** hai bên đi qua đi lại hai Mã, không nước nào chiếu, và thế cờ lặp lại lần thứ ba
- **THEN** ván kết thúc hoà vì lặp lại

### Requirement: Hoà khi lâu không ăn quân

Khi đã có 120 nước liền (của cả hai bên) không có nước ăn quân, ván SHALL kết thúc hoà. Một ván Cờ tướng vì vậy luôn kết thúc.

#### Scenario: 120 nước không ăn quân

- **WHEN** nước thứ 120 liền không ăn quân vừa được đi và ván chưa kết thúc theo luật khác
- **THEN** ván kết thúc hoà

### Requirement: Ký hiệu nước đi

Nước đi SHALL được ghi theo ký hiệu Việt Nam:

- chữ của quân (Tg, S, T, M, X, P, B);
- cột của quân theo bên đi;
- dấu: "." là tiến, "/" là thoái, "-" là bình (đi ngang);
- rồi cột tới (bình, và nước chéo của Sĩ, Tượng, Mã) hoặc số bước (Tướng, Xe, Pháo, Tốt đi thẳng).

Khi hai quân cùng loại đứng trên một cột, quân phía trước SHALL ghi thêm "t" và quân phía sau ghi thêm "s" sau chữ quân; ba quân thì "t", "g", "s". Khi vẫn chưa phân biệt được, sau dấu SHALL ghi thêm cột.

#### Scenario: Hai cột cùng có hai Tốt

- **WHEN** Đỏ có hai Tốt ở cột 2 và hai Tốt ở cột 8, và Tốt trước ở cột 2 tiến một bước
- **THEN** nước đó ghi "Bt2.1"

#### Scenario: Pháo đầu và Mã lên

- **WHEN** Đỏ đi Pháo cột 2 sang cột 5, rồi Đen đi Mã cột 8 lên cột 7
- **THEN** hai nước được ghi "P2-5" và "M8.7"

### Requirement: Máy chơi Cờ tướng

Cờ tướng SHALL chơi được với máy ở ba mức Dễ, Vừa, Khó. Máy MUST luôn đi một nước hợp lệ. Mức Vừa trở lên SHALL ăn một quân không được bảo vệ khi có thể, và SHALL chiếu bí ngay khi có nước chiếu bí. Mỗi nước của máy SHALL xong trong thời gian cho phép của mức đó.

#### Scenario: Máy chiếu bí

- **WHEN** máy ở mức Vừa đến lượt và có một nước chiếu bí
- **THEN** máy đi nước đó

#### Scenario: Máy ăn Xe treo

- **WHEN** máy ở mức Vừa đến lượt và một Xe của đối phương đứng ở điểm máy ăn được mà không bị ăn lại
- **THEN** máy ăn Xe đó

### Requirement: Bàn Cờ tướng

Bàn SHALL vẽ:

- 90 giao điểm trên nền gỗ, sông có chữ "楚河 漢界", đường chéo trong hai cung;
- dấu ở các điểm đặt Pháo và Tốt;
- số cột của bên phía trên ở mép trên, của bên phía dưới ở mép dưới.

Quân SHALL là đĩa tròn có chữ Hán: Đỏ chữ đỏ (帥 仕 相 傌 俥 炮 兵), Đen chữ đen (將 士 象 馬 車 砲 卒). Hai bên MUST phân biệt được không chỉ bằng màu: chữ Hán của Tướng, Sĩ, Tượng, Mã, Xe, Tốt khác nhau giữa hai bên. Trên thiết bị dùng chung Đỏ ở dưới; online bên của người ở thiết bị này ở dưới.

#### Scenario: Cầm Đen khi chơi online

- **WHEN** người chơi cầm Đen trong một phòng Cờ tướng
- **THEN** quân Đen ở hai hàng dưới cùng của bàn và số cột ở mép dưới là cột của Đen

### Requirement: Chọn quân và đi quân Cờ tướng

Khi được đi, chọn một quân của bên đến lượt có nước hợp lệ SHALL đánh dấu quân đó và mọi điểm tới được: điểm trống có chấm, quân ăn được có góc ngoặc. Chọn điểm tới được SHALL đi nước đó; chọn quân khác cùng bên đổi lựa chọn; chọn chỗ khác hay Esc thì bỏ chọn. Lựa chọn SHALL được báo cho trình đọc màn hình kèm số điểm đi được và các quân ăn được. Bàn bị khoá MUST NOT chọn được quân.

#### Scenario: Chọn Pháo

- **WHEN** Đỏ chọn Pháo đầu ở cột 5 sau "P2-5 M8.7 M2.3 X9-8"
- **THEN** bốn điểm trống có chấm, Tốt đen ở cột 5 có góc ngoặc, và màn hình báo Pháo đi được 4 điểm, ăn được Tốt

### Requirement: Nước vừa đi và chiếu trên bàn Cờ tướng

Bàn SHALL đánh dấu nước vừa đi bằng vòng nét đứt ở điểm đi và quanh quân vừa đi. Khi Tướng của bên đến lượt bị chiếu, Tướng đó SHALL được tô sáng màu cảnh báo, kể cả khi ván vừa hết vì chiếu bí; khi ván còn tiếp, dưới bàn SHALL có nhãn "Chiếu!" kèm câu nêu bên bị chiếu (như Cờ vua).

#### Scenario: Tướng bị chiếu

- **WHEN** Đỏ vừa chiếu Tướng đen
- **THEN** Tướng đen được tô sáng và dưới bàn có nhãn "Chiếu!" với câu "Đen đang bị chiếu"

#### Scenario: Tướng bị chiếu bí

- **WHEN** Đỏ vừa chiếu bí Tướng đen
- **THEN** Tướng đen vẫn được tô sáng, và dưới bàn không có nhãn "Chiếu!"

### Requirement: Thanh người chơi Cờ tướng

Màn hình chơi SHALL có hai thanh người chơi, thanh của bên phía dưới bàn ở dưới bàn, của bên kia ở trên bàn. Mỗi thanh có hình Tướng của bên đó, tên ghế, "Đến lượt" khi tới lượt, và với bên hơn quân: số điểm hơn theo giá trị Xe 9, Pháo 5, Mã 4, Tượng 2, Sĩ 2, Tốt 1. Hai bên bằng điểm MUST NOT có dòng hơn quân.

#### Scenario: Hơn một Xe

- **WHEN** Đỏ vừa ăn một Xe đen và chưa mất quân nào
- **THEN** thanh Đỏ ghi hơn 9 điểm và thanh Đen không có dòng hơn quân

### Requirement: Sổ ghi nước đi Cờ tướng

Màn hình chơi SHALL có sổ ghi mọi nước của ván theo ký hiệu Việt Nam, đánh số theo cặp nước (Đỏ rồi Đen), nước mới nhất được đánh dấu và cuộn tới khi sổ dài.

#### Scenario: Sổ sau bốn nước

- **WHEN** ván đã có các nước P2-5, M8.7, M2.3, X9-8
- **THEN** sổ ghi "1. P2-5 M8.7 2. M2.3 X9-8" và X9-8 được đánh dấu là nước mới nhất

### Requirement: Lật bàn Cờ tướng

Nút "Lật bàn" SHALL đổi bên ở phía dưới, kèm thanh người chơi và số cột, ở mọi chế độ như Cờ vua. Online, khi bên của người chơi đổi (ván mới đổi ghế), bàn SHALL về lại bên của họ.

#### Scenario: Lật bàn cùng máy

- **WHEN** người chơi bấm "Lật bàn" trong ván cùng máy
- **THEN** quân Đen ở phía dưới và thanh Đen ở dưới bàn

### Requirement: Đi quân Cờ tướng bằng bàn phím

Bàn SHALL là một nhóm có một chỗ dừng Tab; mũi tên đi giữa 90 giao điểm theo hướng nhìn, Home/End về đầu/cuối hàng; Enter hoặc Space chọn quân hay đi tới điểm; Esc bỏ chọn. Mỗi giao điểm SHALL có tên đọc được: quân và màu, hoặc "trống", kèm cột (theo bên Đỏ) và hàng ("Pháo đỏ ở cột 2, hàng 3").

#### Scenario: Đi Pháo bằng bàn phím

- **WHEN** người chơi chuyển tới Pháo đỏ ở cột 2, bấm Enter, chuyển tới điểm cột 5 hàng 3 và bấm Enter
- **THEN** nước P2-5 được đi

### Requirement: Bàn Cờ tướng vừa màn hình

Ở khung rộng 360 px, cả bàn SHALL nằm trong màn hình, không cuộn ngang, mỗi giao điểm có vùng chạm ít nhất 24 × 24 px.

#### Scenario: Điện thoại 360 px

- **WHEN** người chơi mở ván Cờ tướng trên màn hình rộng 360 px
- **THEN** cả 9 cột nằm trong màn hình, trang không cuộn ngang, và mỗi giao điểm chạm được

### Requirement: Kết quả ván Cờ tướng

Thẻ kết quả SHALL nêu người thắng hoặc hoà, và lý do: "Chiếu bí.", "Đen hết nước đi.", "Đỏ chiếu dai.", "Lặp lại ba lần.", hoặc "120 nước không ăn quân.". Nước đi SHALL được đọc theo tên quân đầy đủ ("Pháo cột 2 bình sang cột 5").

#### Scenario: Kết quả chiếu bí

- **WHEN** Đỏ chiếu bí Đen
- **THEN** thẻ kết quả ghi "Đỏ thắng!" và dòng dưới ghi "Chiếu bí."
