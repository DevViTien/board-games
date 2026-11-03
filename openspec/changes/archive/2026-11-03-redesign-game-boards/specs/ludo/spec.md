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

- **WHEN** Đỏ gieo được 3, mất lượt, và xúc xắc còn đang lăn
- **THEN** xúc xắc có khung màu Đỏ và chưa có ghi lần gieo trước
- **AND** khi xúc xắc dừng, xúc xắc chưa có số, có khung màu của người kế tiếp và bàn ghi lần gieo trước là Đỏ gieo được 3

#### Scenario: Nút gieo theo màu người sắp gieo

- **WHEN** trong ván cùng máy, Đỏ vừa đi xong và tới lượt Xanh dương gieo
- **THEN** nút "Gieo xúc xắc" mang màu Xanh dương

## ADDED Requirements

### Requirement: Chuồng của người đang đến lượt

Khi ván chưa kết thúc, chuồng của người đang đến lượt SHALL được làm nổi bật trên bàn bằng dấu không chỉ dựa vào màu (viền đậm quanh chuồng), và chỉ một chuồng được làm nổi bật mỗi lúc. Khi ván đã kết thúc, MUST NOT còn chuồng nào được làm nổi bật.

#### Scenario: Chuyển lượt sang người kế tiếp

- **WHEN** Đỏ đi xong một ngựa và tới lượt Xanh dương gieo
- **THEN** chuồng Xanh dương được làm nổi bật và chuồng Đỏ không còn nổi bật

#### Scenario: Ván kết thúc

- **WHEN** Vàng thắng ván
- **THEN** không chuồng nào được làm nổi bật
