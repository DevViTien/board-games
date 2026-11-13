# Proposal

## Why

Người dùng muốn chơi online kiểu Gom thạch: **2–4 người cùng vào một bản đồ rộng**. Ngày 12/11/2026 người dùng chọn cách chơi **cùng phe, theo lượt**: mỗi người điều khiển một nhân vật trên cùng một bản đồ, cả đội cùng thắng khi đổ đầy mọi khuôn.

**Sau chơi thử (13/11/2026)**: bản theo lượt đã ship (`687dfbf`); chơi online, người dùng thấy lượt và giới hạn bước làm ván chậm: "mong muốn không giới hạn theo lượt, 2 người tự do đi được". Người dùng chốt **bỏ hẳn lượt**: ai cũng đi bất cứ lúc nào, không thua, kết quả ghi số bước và thời gian (design §10).

Gom thạch là trò giải đố một người, nằm ngoài `GameDefinition` (bất biến "Trò giải đố… không import engine, games, protocol, transport, server"), nên không có phòng online. Phòng online, link mời, chat, kết nối lại và trọng tài server đều xây trên `GameDefinition`. Vì vậy chế độ nhóm là **một game mới**, tên **Đội gom thạch** (`jelly-crew`), chứ không phải một phần của trò giải đố.

Change nằm ngoài các mốc M0–M8 của plan.md §6, như `add-jelly-gather-puzzle`: thuộc nhóm "game tự thiết kế" (§6.3), làm sớm theo yêu cầu của người dùng.

## What Changes

- **Game mới Đội gom thạch** (`jelly-crew`, nhóm "tự thiết kế"), 2–4 người, chơi **cùng máy** và **online**; không có máy chơi.
- **Luật** (đi tự do, design §10):
  - Mỗi người một nhân vật, **đi bất cứ lúc nào**, không có lượt, không giới hạn bước hay vòng. Mỗi nước nêu ghế của nó.
  - Đẩy thạch như Gom thạch: đẩy cả dãy, cùng màu thì dính nhau, sương sáo dính mọi màu, đá viên không dính gì. Không có thạch dừa.
  - Nhân vật là vật cản: không đi vào ô có nhân vật khác, không đẩy được nhân vật, thạch bị đẩy vào nhân vật thì cả bước bị chặn.
  - **Nút và cửa**, cơ chế để phải phối hợp: cửa mở khi có người hay thạch đứng trên một nút cùng nhóm, và không đóng khi đang có thứ nằm trong nó (kẹt); cửa đóng thì không ai đi hay đẩy vào được. Nhóm có ký hiệu riêng (●, ▲, ■), không chỉ dựa vào màu.
  - **Thắng**: mọi ô khuôn có thạch đúng loại (luật vừa khít của chương "Khuôn"). Cả đội cùng thắng. **Không thua** theo luật; giới hạn an toàn 3.000 nước để ván luôn hữu hạn.
  - **Đặt lại bản đồ**: ai cũng bấm được (có hỏi lại); số bước không được trả lại.
  - **Kết quả** ghi số bước cả đội đã đi và thời gian từ lúc ván bắt đầu.
- **Ba bản đồ**, mỗi bản đồ có bản riêng cho 2, 3 và 4 người (9 bố cục, rộng tới 19 × 13 ô): "Hai gian bếp" (dễ), "Chợ đêm" (vừa), "Kho lạnh" (khó). Chọn bản đồ ở màn hình bắt đầu ván như tuỳ chọn luật; mỗi bố cục có lời giải mẫu do test phát lại.
- **Game cùng phe** trong hợp đồng engine: `GameMeta` thêm cờ cùng phe. Với game cùng phe:
  - một người đầu hàng (nút ghi "Bỏ cuộc") hay bị xử bỏ ván thì **ván dừng, không ai thắng**, thay vì "mọi người còn lại thắng";
  - màn hình báo "Cả đội thắng!" khi thắng, "Ván kết thúc" khi luật kết thúc ván mà không ai thắng (giới hạn an toàn), "Ván dừng" khi có người bỏ cuộc hay bỏ ván, ở cả cùng máy và online;
  - người chờ quá 5 phút được "kết thúc ván" chứ không "xử thắng".
- **Game đi tự do** trong hợp đồng engine: `GameMeta` thêm cờ đi tự do và `moverOf(move)`; server nhận nước của mọi ghế, áp nước gửi theo vị trí cũ lên trạng thái mới nhất, không có đồng hồ lượt; transport cho đi bất cứ lúc nào. Phòng và ván lưu ghi giờ bắt đầu và kết thúc ván.
- **Màn hình chơi**: bàn SVG vẽ cả bản đồ (không cuộn, không camera), nhân vật có số 1–4 và màu riêng, vòng đậm trên nhân vật mình điều khiển; bàn điều khiển 4 hướng (hướng bị chặn thì tắt, nói lý do) và "Đặt lại bản đồ"; cùng máy có nhóm "Điều khiển" chọn nhân vật, W A S D luôn là nhân vật 1; chip "Bước 37", "Khuôn 5/8"; lời báo cho trình đọc màn hình và mô tả bàn theo hàng.
- **Trang luật** có hình minh hoạ, **thẻ trên menu** ("2–4 người", "~15 phút", "Chơi" và "Online"), hình Artwork, bản dịch vi/en/ja.

## Capabilities

### New Capabilities

- `jelly-crew`: luật, bản đồ và màn hình chơi của Đội gom thạch: đi tự do, đẩy và dính thạch, nhân vật là vật cản, nút và cửa, khuôn, giới hạn an toàn, đặt lại bản đồ, chọn nhân vật khi chơi cùng máy, cách thao tác và hiển thị.

### Modified Capabilities

- `game-engine`: "Khai báo game" thêm cờ cùng phe và cờ đi tự do; thêm "Game đi tự do"; "Đầu hàng và bỏ ván" có ngoại lệ cho game cùng phe (ván dừng, không ai thắng).
- `online-rooms`: thêm "Trọng tài của game đi tự do".
- `local-play`: thêm requirement "Kết quả của game cùng phe" và "Thời gian ván cùng máy"; "Báo kết quả" trỏ sang requirement đó cho game cùng phe.
- `online-play`: thêm requirement "Chơi game đi tự do online", "Thời gian ván online" và "Game cùng phe khi chơi online" (tiêu đề kết quả, nút "Bỏ cuộc", câu chờ quá 5 phút, chơi lại); "Đầu hàng khi chơi online" và "Nhắc người đến lượt" có ngoại lệ cho game cùng phe.
- `game-menu`: "Game chơi được và game sắp có trên menu" thêm thẻ Đội gom thạch.
- `game-rules`: thêm "Luật Đội gom thạch"; "Đầu hàng và bỏ ván trên trang luật" nói rõ game cùng phe.

## Impact

- **Luật** (`packages/games/src/jelly-crew/`): `GameDefinition`, bản đồ, lời giải mẫu; thêm id vào `GAME_IDS`, `GAMES`. Không có `AI_GAMES`.
- **Engine** (`packages/engine`): `GameMeta` thêm trường không bắt buộc, `sessionResult` xử lý kết thúc ngoài luật của game cùng phe.
- **Transport** (`apps/web/src/transport/online-transport.ts`): người chờ ở game cùng phe chỉ được "kết thúc ván". `packages/protocol` không đổi: `leaveOutcome` đã cho "kết thúc" với game không có máy.
- **Ứng dụng**: `apps/web/src/games/jelly-crew/` (Board, Artwork, Rules, theme.css, nhãn người chơi, nhãn nước đi, chi tiết kết quả, dấu ghế); mỗi registry một dòng. `features/play` đổi chữ của kết quả, nút đầu hàng và câu chờ cho game cùng phe; snapshot của hai transport mang cờ cùng phe và người rời ván. Bản dịch vi/en/ja.
- **Server** (sau chơi thử): `room-service` kiểm ghế bằng `moverOf` và nhận nước theo vị trí cũ ở game đi tự do, không đồng hồ lượt; phòng thêm giờ bắt đầu và kết thúc ván. `packages/protocol`: `RoomView.gameTime` không bắt buộc. Mỗi bước là một nước, ván thường 100–450 nước, tối đa 3.000; vẫn trong hạn mức Redis miễn phí (design §10.6).
- **Tài liệu**: `idea.md` (§3.3, quyết định mới ở §9), plan.md §6.3 và §10, README.
- **Thư viện và dịch vụ**: không thêm gì.
- **Bất biến**:
  - "Thêm một game… Phải sửa phần dùng chung (engine, session, transport, menu, server, packages/ui) để thêm game là dấu hiệu thiết kế sai." Change sửa `engine`, `protocol`, `transport`, `server` và `features/play`. Lý do: đây là **hai loại game mới** (cùng phe; đi tự do) mà hợp đồng chưa mô tả được, không phải chỗ riêng cho một game. Mọi đoạn sửa đọc cờ cùng phe hay cờ đi tự do chứ không đọc mã `jelly-crew`; game cùng loại sau này không phải sửa thêm.
  - "Một ván = danh sách nước đi" giữ nguyên: nước của nhiều ghế vẫn là một danh sách theo thứ tự server nhận.
  - Bất biến của trò giải đố giữ nguyên: Gom thạch không import gì của game này và ngược lại; luật đẩy và dính được viết lại trong `packages/games` (design §2).
- **Ranh giới bản quyền**: như Gom thạch, cơ chế đẩy khối là cơ chế chung của thể loại; tên, hình, bản đồ, nút và cửa là của dự án. Không dùng tên, hình hay màn của Jelly Is Sticky hay các game co-op đã tham khảo (Sokoboxes Duo, Death Squared).

## Ngoài phạm vi

- Đoán trước nước đi trên máy người chơi (hiện nước trước khi server nhận): làm sau nếu chơi thử thấy chậm (design §10.2).
- Kiểu chơi theo lượt làm tuỳ chọn: người dùng chọn thay hẳn (design §10).
- Đồng hồ chạy giữa ván, bảng thời gian tốt nhất.
- Đấu đối kháng, chia đội, tính điểm từng người.
- Máy chơi cùng hay máy chơi thay người rời ván: cần bộ giải cho bản đồ lớn, chưa đáng.
- Trình tạo bản đồ, bản đồ do người chơi gửi, bản đồ ngẫu nhiên.
- Camera, cuộn hay phóng to bản đồ: bố cục giới hạn 19 × 13 để vừa màn hình 360 px.
- Thạch dừa, đá trượt, nút bấm một lần, cửa hẹn giờ và các cơ chế khác ngoài nút và cửa.
- Dùng chung mã luật với trò giải đố Gom thạch (design §2).
- Âm thanh, bảng thành tích, xem lại ván.
