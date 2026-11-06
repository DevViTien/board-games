# game-rules Specification

## Purpose

Trang luật chơi ngắn gọn cho từng game, có hình minh hoạ, bằng ngôn ngữ người chơi đang dùng: mở từ menu, màn hình bắt đầu ván và màn hình chơi (trong hộp thoại, không làm gián đoạn ván), mô tả đúng luật và các tuỳ chọn luật mà app đang áp dụng.

## Requirements

### Requirement: Trang luật chơi

Mỗi game đã đăng ký SHALL có trang luật tại `/rules/<mã game>`, bằng ngôn ngữ đang dùng, gồm: tiêu đề nêu tên game, các mục ngắn mỗi mục có tiêu đề, ít nhất một hình minh hoạ, lối "Chơi <tên game>" mở màn hình bắt đầu ván và lối "Về menu". Trang SHALL đọc được ở khung 360 px mà không cuộn ngang. Mã game không đăng ký MUST hiện trang "không tìm thấy" kèm lối về menu.

#### Scenario: Mở trang luật Cờ caro

- **WHEN** người chơi mở `/rules/caro`
- **THEN** trang có tiêu đề cấp một "Luật chơi Cờ caro", các mục có tiêu đề cấp hai, và liên kết "Chơi Cờ caro" tới `/play/caro`

#### Scenario: Trang luật bằng tiếng Nhật

- **WHEN** người chơi đã chọn tiếng Nhật và mở `/rules/ludo`
- **THEN** mọi chữ trên trang, kể cả chú thích và tên đọc được của hình, lấy từ bản dịch tiếng Nhật, trừ con số và ký hiệu quân

#### Scenario: Game không tồn tại

- **WHEN** người chơi mở `/rules/khong-co-game-nay`
- **THEN** trang "không tìm thấy" hiện ra kèm lối về menu

#### Scenario: Điện thoại nhỏ

- **WHEN** người chơi mở `/rules/chess` ở khung 360 × 740
- **THEN** trang không cuộn ngang và mọi hình nằm trong bề ngang màn hình

### Requirement: Hình minh hoạ có mô tả

Mỗi hình minh hoạ trên trang luật SHALL có chú thích nhìn thấy được và tên đọc được cho trình đọc màn hình mô tả điều hình cho thấy. Quân trong hình MUST phân biệt được không chỉ bằng màu (X/O, ký hiệu ●■▲◆, hình quân Cờ vua). Mọi màu của hình SHALL lấy từ màu của giao diện đang dùng, MUST NOT là màu cố định, để hình đọc được ở cả sáng lẫn tối.

#### Scenario: Hình có tên đọc được

- **WHEN** trình đọc màn hình đi qua hình chuỗi bị chặn hai đầu trên trang luật Cờ caro
- **THEN** nó đọc một tên mô tả chuỗi năm X bị hai quân O chặn hai đầu và không thắng

#### Scenario: Hình theo giao diện

- **WHEN** trang luật Cờ cá ngựa được hiện
- **THEN** mọi màu nét và màu nền trong các hình của trang là màu của giao diện (biến màu), không có màu cố định

### Requirement: Luật Tic-tac-toe

Trang luật Tic-tac-toe SHALL nêu: X đi trước, mỗi lượt đặt một quân vào một ô trống, thắng khi có ba quân thẳng hàng theo hàng ngang, cột dọc hay đường chéo, và hoà khi đầy chín ô mà không ai thắng; kèm hình ba đường thắng.

#### Scenario: Các mục của Tic-tac-toe

- **WHEN** người chơi mở `/rules/tictactoe`
- **THEN** trang có các mục về cách đi, thắng và hoà, và một hình cho thấy một hàng, một cột và một đường chéo thắng

### Requirement: Luật Cờ caro

Trang luật Cờ caro SHALL nêu: bàn 15×15 hoặc 19×19, X đi trước, luật "tự do" (từ 5 quân liền trở lên theo ngang, dọc, chéo là thắng) và luật "chặn hai đầu" (như trên, trừ khi cả hai ô ngay ngoài hai đầu chuỗi là quân đối thủ; mép bàn không chặn; chuỗi dài hơn 5 thắng theo cùng điều kiện), và hoà khi đầy bàn; câu mục tiêu SHALL nhắc điều kiện chặn hai đầu. Hình SHALL cho thấy chuỗi bị chặn hai đầu, chuỗi chặn một đầu và chuỗi chạm mép bàn.

#### Scenario: Hai luật thắng

- **WHEN** người chơi mở `/rules/caro`
- **THEN** trang có một mục cho luật "tự do" và một mục cho luật "chặn hai đầu", và nêu cả hai cỡ bàn

#### Scenario: Hình của luật chặn hai đầu

- **WHEN** người chơi xem mục "chặn hai đầu"
- **THEN** có hình chuỗi năm X bị chặn hai đầu ghi không thắng, chuỗi bị chặn một đầu ghi thắng, và chuỗi chạm mép bàn ghi thắng

### Requirement: Luật Cờ cá ngựa

Trang luật Cờ cá ngựa SHALL nêu đúng bộ luật đang chơi: gieo rồi chọn ngựa; ra quân chỉ khi gieo 6 và ô xuất phát không có ngựa mình; gieo 6 được gieo thêm; đi đúng số ô, không vượt; đá; gieo 1 bắt buộc nhảy tới chân chuồng kế tiếp khi được và đá ngựa đối thủ ở đó; lên chuồng theo bậc; thắng khi đủ 4 ngựa ở bậc 3–6. Hình SHALL vẽ theo bàn thật: đường đi và chuồng đích, gieo 1, lên chuồng.

#### Scenario: Các luật đã chốt

- **WHEN** người chơi mở `/rules/ludo`
- **THEN** trang có các mục về ra quân, gieo 6, đi và đá, gieo 1, lên chuồng và thắng
- **AND** mục ra quân nói không ra được khi ô xuất phát có ngựa mình, mục gieo 1 nói nhảy được thì bắt buộc nhảy và ngựa đối thủ ở chân chuồng đó bị đá

#### Scenario: Điều kiện thắng

- **WHEN** người chơi đọc mục thắng của trang luật Cờ cá ngựa
- **THEN** mục đó nói người đầu tiên có đủ 4 ngựa ở bậc 3, 4, 5 và 6 của chuồng đích thắng

### Requirement: Luật Cờ vua

Trang luật Cờ vua SHALL nêu: Trắng đi trước, cách đi của từng quân, nhập thành và điều kiện, bắt tốt qua đường, phong cấp, chiếu hết, hết nước đi, hoà tự động (lặp năm lần, 75 nước, không đủ quân) và "Đòi hoà" (lặp ba lần, 50 nước); kèm hình cách đi, nhập thành, bắt tốt qua đường, phong cấp; và ghi nguồn bộ quân cùng liên kết tới trang giấy phép.

#### Scenario: Các mục của Cờ vua

- **WHEN** người chơi mở `/rules/chess`
- **THEN** trang có các mục về cách đi của quân, nhập thành, bắt tốt qua đường, phong cấp và kết thúc ván

#### Scenario: Ghi nguồn bộ quân

- **WHEN** người chơi xem cuối trang luật Cờ vua
- **THEN** có dòng ghi bộ quân "staunty" và giấy phép CC BY-NC-SA 4.0, với liên kết tới `/third-party-licenses.txt`

### Requirement: Lối tới luật chơi

Thẻ game trên menu và màn hình bắt đầu ván SHALL có liên kết "Luật chơi" tới trang luật của game đó; trên menu, tên đọc được của mỗi liên kết SHALL gồm tên game ("Luật chơi Cờ caro") để không trùng nhau. Màn hình chơi SHALL có nút "Luật chơi" ở thanh trên, ở mọi chế độ, có tên đọc được cả khi chỉ hiện icon.

#### Scenario: Từ menu

- **WHEN** người chơi chọn liên kết tên "Luật chơi Cờ cá ngựa" trên menu
- **THEN** trang `/rules/ludo` mở ra

#### Scenario: Tên liên kết không trùng

- **WHEN** trình đọc màn hình liệt kê các liên kết của menu
- **THEN** có bốn liên kết luật chơi, mỗi liên kết một tên khác nhau có tên game

#### Scenario: Từ màn hình bắt đầu ván

- **WHEN** người chơi ở màn hình bắt đầu ván Cờ vua chọn "Luật chơi"
- **THEN** trang `/rules/chess` mở ra

#### Scenario: Nút trên màn hình chơi ở điện thoại

- **WHEN** người chơi ở màn hình chơi Cờ caro ở khung 390 px
- **THEN** thanh trên có nút tên "Luật chơi", vùng chạm ít nhất 44 × 44 px

### Requirement: Luật chơi trong ván

Nút "Luật chơi" trên màn hình chơi SHALL mở hộp thoại có luật của game và luật của ván đang chơi khi game có tuỳ chọn luật, mà không rời màn hình và không đổi ván; hộp thoại MUST NOT có liên kết rời màn hình chơi. Esc hoặc nút đóng SHALL đóng hộp thoại, trả tiêu điểm về nút "Luật chơi" và đọc lại dòng lượt. Không tải được luật thì SHALL báo lỗi và cho thử lại.

#### Scenario: Đọc luật giữa ván

- **WHEN** người chơi đã đi hai nước trong ván Cờ caro 19×19 luật "tự do", mở "Luật chơi" rồi nhấn Esc
- **THEN** hộp thoại ghi luật của ván là "19×19 · Tự do" khi mở
- **AND** sau khi đóng, hai quân vẫn trên bàn và tiêu điểm ở nút "Luật chơi"

#### Scenario: Ván online vẫn chạy

- **WHEN** người chơi mở "Luật chơi" trong ván online và đối thủ đi một nước
- **THEN** đóng hộp thoại thì bàn đã có nước của đối thủ mà không phải vào lại phòng, và dòng lượt được đọc lại

#### Scenario: Không tải được luật

- **WHEN** người chơi mở "Luật chơi" trong ván online lúc thiết bị mất mạng và luật của game chưa được tải
- **THEN** hộp thoại báo không tải được luật kèm nút "Thử lại", và ván không đổi

### Requirement: Đầu hàng và bỏ ván trên trang luật

Trang luật của mọi game SHALL có mục ngắn về chơi online: nút "Đầu hàng" (có xác nhận) và việc người đến lượt quá 5 phút không đi thì người khác xử được bỏ ván. Trang của game có máy và có phòng 3–4 người (Cờ cá ngựa, Cờ rào) SHALL nói thêm rằng ở phòng 3–4 người máy chơi thay người đầu hàng hay bỏ ván ("Máy chơi thay") tới hết ván, còn phòng 2 người thì ván kết thúc.

#### Scenario: Mục đầu hàng của Cờ vua

- **WHEN** người chơi mở `/rules/chess`
- **THEN** trang có mục nói về nút "Đầu hàng" và việc xử bỏ ván sau 5 phút

#### Scenario: Máy chơi thay trên trang Cờ cá ngựa

- **WHEN** người chơi mở `/rules/ludo`
- **THEN** mục đầu hàng và bỏ ván nói "Máy chơi thay" ở phòng 3–4 người và ván kết thúc ở phòng 2 người

#### Scenario: Máy chơi thay trên trang Cờ rào

- **WHEN** người chơi mở `/rules/fence-race`
- **THEN** mục đầu hàng và bỏ ván nói "Máy chơi thay" ở phòng 3–4 người và ván kết thúc ở phòng 2 người

### Requirement: Luật Cờ rào

Trang luật Cờ rào SHALL nêu: mục tiêu về cổng đích là 5 ô giữa của cạnh đối diện; cỡ bàn và số rào theo số người; ba việc trong một lượt; quân được đứng chung ô và không nhảy qua nhau; rào dài hai ô, không đè, không cắt nhau; không được bịt kín đường về đích của ai; một lần phá rào; và giới hạn 200 nước (198 nước khi ba người). Hình SHALL cho thấy cổng đích, cách đặt rào, rào bị cấm vì bịt kín đường, và phá rào.

#### Scenario: Nêu đủ cỡ bàn và số rào

- **WHEN** người chơi mở `/rules/fence-race`
- **THEN** trang nêu bàn 11 × 9 với 9 rào mỗi người khi hai người, bàn 9 × 9 với 6 rào khi ba người và 4 rào khi bốn người

#### Scenario: Hình rào bị cấm

- **WHEN** người chơi xem mục về đường về đích
- **THEN** có hình một rào bị cấm vì bịt kín đường của một quân, kèm chú thích

#### Scenario: Luật phá rào

- **WHEN** người chơi xem mục phá rào
- **THEN** trang nêu mỗi người phá được một lần, phá được rào của bất kỳ ai, rào bị phá không trả lại ai, và có hình minh hoạ
