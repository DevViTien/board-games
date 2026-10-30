# Spec Delta

## Purpose

Hợp đồng chung mà mọi game phải tuân theo và phiên chơi dùng chung cho mọi chế độ: kiểm tra nước đi, lịch sử, hoàn tác/làm lại, biên bản ván để lưu và phát lại, ngẫu nhiên đi qua bộ sinh được truyền vào, cùng bộ kiểm tra hợp đồng mà mọi game phải vượt trước khi đưa vào app.

## ADDED Requirements

### Requirement: Khai báo game

Mỗi game SHALL khai báo: mã định danh kebab-case duy nhất, số người chơi tối thiểu và tối đa, thể loại (`vn-folk`, `classic` hoặc `original`), thời lượng một ván ước tính tính bằng phút, game có hỗ trợ đấu với máy hay không, và tuỳ chọn luật mặc định. Thông tin khai báo SHALL đọc được mà không cần tạo ván.

#### Scenario: Đọc thông tin game mà không tạo ván

- **WHEN** app cần hiển thị một game trong menu
- **THEN** app đọc được mã, số người chơi, thể loại, thời lượng và cờ hỗ trợ AI của game đó mà không tạo ván nào

### Requirement: Tạo ván mới

Hệ thống SHALL tạo trạng thái ban đầu của ván cho một số người chơi nằm trong khoảng game khai báo, cùng các tuỳ chọn luật của game (không truyền thì dùng tuỳ chọn mặc định). Game không tự kiểm tra tuỳ chọn SHALL chỉ nhận đúng tuỳ chọn mặc định của nó. Cùng số người và cùng tuỳ chọn SHALL luôn cho cùng trạng thái ban đầu. Số người ngoài khoảng MUST bị từ chối với mã lỗi `invalid-player-count`; tuỳ chọn mà game không chấp nhận MUST bị từ chối với mã lỗi `invalid-options`.

#### Scenario: Tạo ván với số người hợp lệ

- **WHEN** tạo ván cho một game khai báo 2–4 người với 3 người chơi
- **THEN** ván được tạo, chưa có nước đi nào và có đúng một người đang đến lượt

#### Scenario: Từ chối số người không hợp lệ

- **WHEN** tạo ván cho một game khai báo đúng 2 người với 3 người chơi
- **THEN** hệ thống từ chối với mã lỗi `invalid-player-count` và không tạo ván

#### Scenario: Không truyền tuỳ chọn thì dùng mặc định

- **WHEN** tạo ván mà không truyền tuỳ chọn luật
- **THEN** ván được tạo với tuỳ chọn luật mặc định mà game khai báo

#### Scenario: Từ chối tuỳ chọn không hợp lệ

- **WHEN** tạo ván với tuỳ chọn luật mà game không chấp nhận
- **THEN** hệ thống từ chối với mã lỗi `invalid-options` và không tạo ván

#### Scenario: Game không tự kiểm tra tuỳ chọn

- **WHEN** tạo ván cho một game có tuỳ chọn mặc định nhưng không khai báo cách kiểm tra tuỳ chọn, một lần không truyền tuỳ chọn và một lần truyền tuỳ chọn khác mặc định
- **THEN** lần đầu ván được tạo với tuỳ chọn mặc định và biên bản của nó dựng lại được
- **AND** lần sau hệ thống từ chối với mã lỗi `invalid-options`

### Requirement: Chỉ chấp nhận nước đi hợp lệ

Phiên chơi SHALL chỉ chấp nhận một nước đi nếu nó khớp một nước trong danh sách nước đi hợp lệ của trạng thái hiện tại, và SHALL lưu chính nước hợp lệ đó của luật chứ không lưu dữ liệu nhận vào. Nước đi không hợp lệ MUST bị từ chối với mã lỗi `illegal-move`; phiên đi kèm luật của một game khác MUST bị từ chối với mã lỗi `game-mismatch`. Trong cả hai trường hợp, trạng thái lẫn lịch sử của phiên MUST giữ nguyên.

#### Scenario: Nước đi hợp lệ được áp dụng

- **WHEN** người đang đến lượt thực hiện một nước đi có trong danh sách hợp lệ
- **THEN** trạng thái ván thay đổi theo nước đi đó và nước đi được thêm vào cuối lịch sử

#### Scenario: Nước đi không hợp lệ bị từ chối

- **WHEN** phiên nhận một nước đi không có trong danh sách hợp lệ
- **THEN** phiên trả về mã lỗi `illegal-move`
- **AND** trạng thái và lịch sử không thay đổi

#### Scenario: Trường thừa trong nước đi không được lưu

- **WHEN** phiên nhận một nước đi khớp một nước hợp lệ nhưng có thêm trường lạ
- **THEN** nước đi được áp dụng
- **AND** lịch sử lưu đúng nước hợp lệ của luật, không có trường lạ

#### Scenario: Luật của game khác bị từ chối

- **WHEN** đi một nước trên phiên của một game nhưng truyền kèm luật của game khác
- **THEN** phiên trả về mã lỗi `game-mismatch` thay vì xét nước đi theo luật sai

### Requirement: Áp dụng nước đi đã chơi ở nơi khác

Phiên SHALL áp dụng được một mục lịch sử (nước đi kèm kết quả ngẫu nhiên đã chốt) nhận từ bên ngoài, ví dụ do server online phát, bằng chính kết quả đã chốt mà không gieo lại. Mục lịch sử là dữ liệu không tin cậy: nước đi không hợp lệ, thiếu kết quả ngẫu nhiên hoặc có kết quả không thể xảy ra MUST bị từ chối với mã lỗi `illegal-move`; sau khi ván kết thúc MUST trả về `game-over`. Khi bị từ chối, trạng thái và lịch sử MUST giữ nguyên và hệ thống không dừng vì lỗi.

#### Scenario: Mục lịch sử hợp lệ được áp dụng với kết quả đã chốt

- **WHEN** một ván gieo xúc xắc ở nơi khác, rồi mục lịch sử của nước gieo đó được chuyển JSON và áp dụng lên bản sao của ván trước nước gieo
- **THEN** bản sao có cùng trạng thái và cùng lịch sử như ván gốc, kể cả kết quả đã chốt của nước gieo

#### Scenario: Mục lịch sử có kết quả không thể xảy ra bị từ chối

- **WHEN** áp dụng một mục lịch sử gieo ra 7 trên xúc xắc sáu mặt
- **THEN** phiên trả về mã lỗi `illegal-move` và trạng thái không thay đổi

### Requirement: Kết thúc ván

Khi luật xác định ván đã kết thúc, phiên SHALL báo kết quả là thắng (kèm danh sách người thắng) hoặc hoà, có thể kèm mã lý do do game đặt. Sau đó mọi nước đi MUST bị từ chối với mã lỗi `game-over`.

#### Scenario: Báo kết quả khi ván kết thúc

- **WHEN** một nước đi làm ván kết thúc với một người thắng
- **THEN** phiên báo kết quả thắng với người thắng đó

#### Scenario: Không đi tiếp sau khi kết thúc

- **WHEN** phiên nhận một nước đi sau khi ván đã kết thúc
- **THEN** phiên trả về mã lỗi `game-over` và trạng thái không thay đổi

### Requirement: Hoàn tác và làm lại

Phiên SHALL cho hoàn tác nước đi gần nhất và làm lại nước vừa hoàn tác, theo thứ tự. Thực hiện một nước đi mới sau khi hoàn tác SHALL bỏ các nước đã hoàn tác. Hoàn tác khi chưa có nước đi MUST trả về `nothing-to-undo`; làm lại khi không còn gì để làm lại MUST trả về `nothing-to-redo`; cả hai không đổi trạng thái.

#### Scenario: Hoàn tác rồi làm lại

- **WHEN** sau hai nước đi, người chơi hoàn tác một lần rồi làm lại một lần
- **THEN** sau khi hoàn tác, trạng thái giống hệt trạng thái sau nước đi thứ nhất
- **AND** sau khi làm lại, trạng thái giống hệt trạng thái sau nước đi thứ hai

#### Scenario: Nước đi mới bỏ nhánh đã hoàn tác

- **WHEN** người chơi hoàn tác một nước rồi thực hiện một nước đi khác
- **THEN** không còn gì để làm lại và lịch sử chỉ chứa nước đi mới

#### Scenario: Hoàn tác khi chưa có nước đi

- **WHEN** người chơi hoàn tác ở ván chưa có nước đi nào
- **THEN** phiên trả về `nothing-to-undo` và trạng thái không thay đổi

#### Scenario: Làm lại khi không còn gì để làm lại

- **WHEN** người chơi làm lại ở ván chưa hoàn tác nước nào
- **THEN** phiên trả về `nothing-to-redo` và trạng thái không thay đổi

### Requirement: Lịch sử đang có hiệu lực

Phiên SHALL cho biết danh sách các nước đi đang có hiệu lực theo thứ tự và nước đi gần nhất dẫn tới trạng thái hiện tại. Nước đã hoàn tác MUST NOT có trong danh sách đó và MUST NOT được coi là nước gần nhất.

#### Scenario: Lịch sử sau khi hoàn tác

- **WHEN** sau hai nước đi, người chơi hoàn tác một lần
- **THEN** danh sách nước đang có hiệu lực chỉ chứa nước thứ nhất và nước gần nhất là nước thứ nhất

#### Scenario: Chưa có nước đi

- **WHEN** ván chưa có nước đi nào
- **THEN** danh sách nước đang có hiệu lực rỗng và không có nước gần nhất

### Requirement: Biên bản ván

Phiên SHALL xuất được biên bản ván gồm mã game, số người chơi, tuỳ chọn luật và các nước đi đang có hiệu lực theo thứ tự, mỗi nước kèm kết quả ngẫu nhiên đã chốt nếu có; nước đã hoàn tác MUST NOT có trong biên bản. Biên bản SHALL chuyển sang JSON và đọc lại không mất thông tin, và dựng lại từ biên bản SHALL cho đúng trạng thái và lịch sử như lúc xuất.

#### Scenario: Dựng lại ván từ biên bản JSON

- **WHEN** biên bản của một ván đang chơi được chuyển sang JSON, đọc lại rồi dùng để dựng ván
- **THEN** ván dựng lại có cùng trạng thái, cùng lịch sử và cùng người đang đến lượt như ván gốc

#### Scenario: Biên bản không chứa nước đã hoàn tác

- **WHEN** sau ba nước đi, người chơi hoàn tác một nước rồi xuất biên bản
- **THEN** biên bản chỉ có hai nước đi đầu

#### Scenario: Biên bản của game khác bị từ chối

- **WHEN** dựng ván của một game từ biên bản mang mã của game khác
- **THEN** hệ thống từ chối với mã lỗi `game-mismatch`

#### Scenario: Biên bản của định dạng khác bị từ chối

- **WHEN** dựng ván từ biên bản có số phiên bản định dạng mà hệ thống không hỗ trợ
- **THEN** hệ thống từ chối với mã lỗi `unsupported-record-version`

### Requirement: Biên bản không tin cậy được kiểm tra

Dựng ván từ biên bản SHALL coi biên bản là dữ liệu không tin cậy. Biên bản sai cấu trúc, có số người chơi hoặc tuỳ chọn luật không hợp lệ, có nước đi không hợp lệ tại thời điểm của nó, thiếu hoặc có kết quả ngẫu nhiên không thể xảy ra, hoặc làm luật của game báo lỗi khi phát lại MUST bị từ chối với mã lỗi `corrupt-record`, không dựng ván và không làm hệ thống dừng vì lỗi.

#### Scenario: Biên bản sai cấu trúc

- **WHEN** dựng ván từ dữ liệu không đúng cấu trúc biên bản
- **THEN** hệ thống từ chối với mã lỗi `corrupt-record` và không dựng ván

#### Scenario: Biên bản có nước đi không hợp lệ

- **WHEN** biên bản chứa một nước đi không hợp lệ tại thời điểm của nó
- **THEN** hệ thống từ chối với mã lỗi `corrupt-record` và không dựng ván

#### Scenario: Biên bản có kết quả ngẫu nhiên sai

- **WHEN** biên bản của game xúc xắc có một nước gieo thiếu kết quả, hoặc có kết quả 7 trên xúc xắc sáu mặt
- **THEN** hệ thống từ chối với mã lỗi `corrupt-record` và không dựng ván

#### Scenario: Luật báo lỗi khi phát lại

- **WHEN** phát lại một biên bản làm hàm luật của game báo lỗi
- **THEN** hệ thống trả về mã lỗi `corrupt-record` thay vì dừng vì lỗi

#### Scenario: Dữ liệu báo lỗi ngay khi được đọc

- **WHEN** dựng ván từ dữ liệu báo lỗi ngay khi được đọc (thuộc tính tự tính giá trị ném lỗi, Proxy đã thu hồi)
- **THEN** hệ thống trả về mã lỗi `corrupt-record` thay vì dừng vì lỗi

### Requirement: Ngẫu nhiên đi qua bộ sinh được truyền vào

Mọi kết quả ngẫu nhiên của ván (ví dụ xúc xắc) SHALL được chọn trong các kết quả game khai báo, bằng bộ sinh ngẫu nhiên do nơi gọi truyền vào khi đi nước. Kết quả SHALL được chốt vào chính nước đi trước khi áp dụng, nên làm lại hay phát lại MUST NOT gieo lại. Cùng chuỗi giá trị từ bộ sinh và cùng chuỗi nước đi SHALL cho cùng kết quả. Phiên và biên bản MUST NOT lưu trạng thái bộ sinh.

#### Scenario: Cùng chuỗi giá trị ngẫu nhiên cho cùng kết quả

- **WHEN** hai phiên của cùng một game có yếu tố ngẫu nhiên nhận cùng chuỗi nước đi, mỗi phiên dùng một bộ sinh tạo từ cùng một seed
- **THEN** mọi kết quả ngẫu nhiên của hai phiên giống nhau

#### Scenario: Làm lại không gieo lại

- **WHEN** người chơi gieo xúc xắc ra 4, hoàn tác rồi làm lại nước gieo đó
- **THEN** kết quả vẫn là 4

#### Scenario: Phát lại không gieo lại

- **WHEN** dựng lại ván từ biên bản có một nước gieo xúc xắc ra 4
- **THEN** nước đó trong ván dựng lại vẫn là 4 mà không dùng tới bộ sinh ngẫu nhiên

#### Scenario: Biên bản không lộ bộ sinh ngẫu nhiên

- **WHEN** xuất biên bản của một ván game xúc xắc đã có nước gieo
- **THEN** biên bản có các nước đi kèm kết quả đã chốt nhưng không chứa seed hay trạng thái nào của bộ sinh ngẫu nhiên

### Requirement: Trạng thái cũ không bị thay đổi

Áp dụng một nước đi SHALL tạo trạng thái mới và MUST NOT thay đổi trạng thái trước đó, để lịch sử, hoàn tác và phát lại luôn dựa trên dữ liệu đúng. Mọi hàm luật MUST NOT thay đổi trạng thái, nước đi hay kết quả ngẫu nhiên mà nó nhận, kể cả chỉ để ghi nhớ kết quả tính toán.

#### Scenario: Trạng thái trước nước đi giữ nguyên

- **WHEN** một nước đi được áp dụng lên một trạng thái
- **THEN** trạng thái ban đầu vẫn y như trước khi áp dụng

### Requirement: Chạy ở mọi môi trường

Hợp đồng game, phiên chơi và luật của mọi game SHALL chạy được trên trình duyệt, trên server Node.js và trong Web Worker, không cần DOM hay thư viện giao diện, để server online và AI dùng đúng cùng một luật. Phiên chơi, trạng thái ván, nước đi và kết quả ngẫu nhiên SHALL là dữ liệu thuần, chuyển JSON được mà không mất thông tin.

#### Scenario: Luật chạy trên Node không có DOM

- **WHEN** bộ test của engine và của các game chạy trong môi trường Node.js không có DOM
- **THEN** mọi test chạy và vượt qua

#### Scenario: Phiên chơi chuyển JSON được

- **WHEN** một phiên đang chơi được chuyển sang JSON rồi đọc lại
- **THEN** phiên đọc lại đi tiếp, hoàn tác và làm lại cho cùng kết quả như phiên gốc

### Requirement: Kiểm tra hợp đồng chung cho mọi game

Mỗi game SHALL vượt bộ kiểm tra hợp đồng chung trước khi vào app. Bộ kiểm tra tự chơi ván ngẫu nhiên với các seed cố định (mặc định với mọi số người game cho phép) và xác nhận các yêu cầu khác của capability này, gồm cả: ván chơi được, game nhận tuỳ chọn mặc định của nó, luật tất định, dữ liệu thuần, nước hợp lệ không trùng, người chơi trong khoảng, hỗ trợ AI thì có hàm đánh giá. Mỗi vi phạm MUST làm thất bại đúng kiểm tra của yêu cầu đó; kiểm tra không liên quan MUST NOT thất bại theo.

#### Scenario: Mọi ván tự chơi đều kết thúc

- **WHEN** bộ kiểm tra tự chơi các ván ngẫu nhiên của một game
- **THEN** mỗi ván kết thúc trong giới hạn số nước mà game đặt cho bộ kiểm tra

#### Scenario: Ván chưa kết thúc luôn có nước đi

- **WHEN** ở bất kỳ trạng thái nào trong các ván tự chơi, ván chưa có kết quả
- **THEN** danh sách nước đi hợp lệ không rỗng
- **AND** khi ván đã có kết quả, danh sách nước đi hợp lệ rỗng

#### Scenario: Game sửa trạng thái cũ bị phát hiện

- **WHEN** một game thay đổi trạng thái cũ khi áp dụng nước đi, kể cả phần bên trong một trạng thái mà game chỉ đóng băng nông, hoặc thay đổi nước đi nó nhận, hoặc ghi nhớ dữ liệu vào trạng thái khi liệt kê nước đi
- **THEN** bộ kiểm tra hợp đồng thất bại và chỉ ra yêu cầu bị vi phạm

#### Scenario: Mỗi loại vi phạm khác đều bị phát hiện

- **WHEN** một game vi phạm đúng một kiểm tra khác của bộ (ván không chơi được vì luật báo lỗi, tuỳ chọn mặc định bị chính game từ chối, `setup`/`applyMove`/`outcomes`/`legalMoves`/`result`/`currentPlayer` không tất định, ván không kết thúc, hết nước mà chưa có kết quả, dữ liệu không thuần, nước hợp lệ trùng nhau, người chơi hoặc người thắng ngoài khoảng, trùng hay rỗng, trọng số không hợp lệ, biên bản không dựng lại được, khai báo hỗ trợ AI mà thiếu hàm đánh giá)
- **THEN** bộ kiểm tra hợp đồng thất bại và chỉ ra đúng yêu cầu bị vi phạm

#### Scenario: Vi phạm không bị báo ở kiểm tra không liên quan

- **WHEN** một game chỉ vi phạm một yêu cầu, ví dụ luật báo lỗi khi áp dụng nước đi nên ván không chơi được
- **THEN** chỉ kiểm tra của yêu cầu đó thất bại; mọi kiểm tra khác vượt qua, trừ kiểm tra mà vi phạm đó tất yếu kéo theo và được ghi rõ trong test của bộ kiểm tra

#### Scenario: Không chỉ định số người thì thử mọi số người

- **WHEN** bộ kiểm tra chạy cho một game 2–4 người mà không được chỉ định số người chơi
- **THEN** bộ kiểm tra tự chơi các ván với 2, 3 và 4 người
