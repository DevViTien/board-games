# Proposal

## Why

Người dùng muốn chơi online kiểu Gom thạch: **2–4 người cùng vào một bản đồ rộng**. Ngày 12/11/2026 người dùng chọn cách chơi **cùng phe, theo lượt**: mỗi người điều khiển một nhân vật trên cùng một bản đồ, cả đội cùng thắng khi đổ đầy mọi khuôn.

Gom thạch là trò giải đố một người, nằm ngoài `GameDefinition` (bất biến "Trò giải đố… không import engine, games, protocol, transport, server"), nên không có phòng online. Phòng online, link mời, chat, kết nối lại và trọng tài server đều xây trên `GameDefinition`. Vì vậy chế độ nhóm là **một game mới**, tên **Đội gom thạch** (`jelly-crew`), chứ không phải một phần của trò giải đố.

Change nằm ngoài các mốc M0–M8 của plan.md §6, như `add-jelly-gather-puzzle`: thuộc nhóm "game tự thiết kế" (§6.3), làm sớm theo yêu cầu của người dùng.

## What Changes

- **Game mới Đội gom thạch** (`jelly-crew`, nhóm "tự thiết kế"), 2–4 người, chơi **cùng máy** (lần lượt trên một thiết bị) và **online**; không có máy chơi.
- **Luật**:
  - Mỗi người một nhân vật. Đến lượt thì đi **tối đa 5 bước** rồi bấm "Xong lượt"; lượt không tự chuyển, để trên một thiết bị không ai đi nhầm vào lượt người sau. "Xong lượt" bấm được cả khi chưa đi bước nào.
  - Đẩy thạch như Gom thạch: đẩy cả dãy, cùng màu thì dính nhau, sương sáo dính mọi màu, đá viên không dính gì. Không có thạch dừa.
  - Nhân vật là vật cản: không đi vào ô có nhân vật khác, không đẩy được nhân vật, thạch bị đẩy vào nhân vật thì cả bước bị chặn.
  - **Nút và cửa**, cơ chế để phải phối hợp: cửa mở khi có người hay thạch đứng trên một nút cùng nhóm, và không đóng khi đang có thứ nằm trong nó (kẹt); cửa đóng thì không ai đi hay đẩy vào được. Nhóm có ký hiệu riêng (●, ▲, ■), không chỉ dựa vào màu.
  - **Thắng**: mọi ô khuôn có thạch đúng loại (luật vừa khít của chương "Khuôn"). Cả đội cùng thắng.
  - **Giới hạn vòng**: mỗi bản đồ có số vòng tối đa (một vòng là mỗi người một lượt). Hết vòng mà chưa đầy khuôn thì ván kết thúc, không ai thắng.
  - **Lùi bước** trong lượt của mình khi chơi online (lùi từng bước, kể cả bước thứ năm, tối đa 5 lần mỗi lượt để ván không dài mãi). Chơi cùng máy đã có "Hoàn tác" của màn hình chơi nên không hiện nút này.
  - **Giữ nút**: người đứng trên nút bật "Giữ nút" thì tới lượt mình thiết bị tự bấm "Xong lượt", không phải bấm mỗi vòng.
  - **Đặt lại bản đồ**: người đến lượt đưa mọi thứ về chỗ ban đầu (có hỏi lại), dùng hết lượt đó; số vòng và số bước đã đi không được trả lại.
- **Ba bản đồ**, mỗi bản đồ có bản riêng cho 2, 3 và 4 người (9 bố cục, rộng tới 19 × 13 ô): "Hai gian bếp" (dễ), "Chợ đêm" (vừa), "Kho lạnh" (khó). Chọn bản đồ ở màn hình bắt đầu ván như tuỳ chọn luật; mỗi bố cục có lời giải mẫu do test phát lại.
- **Game cùng phe** trong hợp đồng engine: `GameMeta` thêm cờ cùng phe. Với game cùng phe:
  - một người đầu hàng (nút ghi "Bỏ cuộc") hay bị xử bỏ ván thì **ván dừng, không ai thắng**, thay vì "mọi người còn lại thắng";
  - màn hình báo "Cả đội thắng!" khi thắng, "Ván kết thúc" khi hết vòng, "Ván dừng" khi có người bỏ cuộc hay bỏ ván, ở cả cùng máy và online;
  - người chờ quá 5 phút được "kết thúc ván" chứ không "xử thắng".
- **Màn hình chơi**: bàn SVG vẽ cả bản đồ (không cuộn, không camera), nhân vật có số 1–4 và màu riêng, lượt hiện trên bàn (vòng đậm, khung bàn màu ghế, vệt đường đi của lượt gần nhất); bàn điều khiển 4 hướng (hướng bị chặn thì tắt, nói lý do), "Xong lượt", "Lùi bước", "Đặt lại bản đồ", "Giữ nút"; chip "Lam · còn 3 bước", "Vòng 3/40", "Khuôn 5/8"; phím mũi tên/WASD, Enter; lời báo cho trình đọc màn hình và mô tả bàn theo hàng.
- **Trang luật** có hình minh hoạ, **thẻ trên menu** ("2–4 người", "~15 phút", "Chơi" và "Online"), hình Artwork, bản dịch vi/en/ja.

## Capabilities

### New Capabilities

- `jelly-crew`: luật, bản đồ và màn hình chơi của Đội gom thạch: lượt nhiều bước, đẩy và dính thạch, nhân vật là vật cản, nút và cửa, khuôn, giới hạn vòng, lùi bước, đặt lại bản đồ, cách thao tác và hiển thị.

### Modified Capabilities

- `game-engine`: "Khai báo game" thêm cờ cùng phe; "Đầu hàng và bỏ ván" có ngoại lệ cho game cùng phe (ván dừng, không ai thắng).
- `local-play`: thêm requirement "Kết quả của game cùng phe"; "Báo kết quả" trỏ sang requirement đó cho game cùng phe.
- `online-play`: thêm requirement "Game cùng phe khi chơi online" (tiêu đề kết quả, nút "Bỏ cuộc", câu chờ quá 5 phút, chơi lại); "Đầu hàng khi chơi online" và "Nhắc người đến lượt" có ngoại lệ cho game cùng phe.
- `game-menu`: "Game chơi được và game sắp có trên menu" thêm thẻ Đội gom thạch.
- `game-rules`: thêm "Luật Đội gom thạch"; "Đầu hàng và bỏ ván trên trang luật" nói rõ game cùng phe.

## Impact

- **Luật** (`packages/games/src/jelly-crew/`): `GameDefinition`, bản đồ, lời giải mẫu; thêm id vào `GAME_IDS`, `GAMES`. Không có `AI_GAMES`.
- **Engine** (`packages/engine`): `GameMeta` thêm trường không bắt buộc, `sessionResult` xử lý kết thúc ngoài luật của game cùng phe.
- **Transport** (`apps/web/src/transport/online-transport.ts`): người chờ ở game cùng phe chỉ được "kết thúc ván". `packages/protocol` không đổi: `leaveOutcome` đã cho "kết thúc" với game không có máy.
- **Ứng dụng**: `apps/web/src/games/jelly-crew/` (Board, Artwork, Rules, theme.css, nhãn người chơi, nhãn nước đi, chi tiết kết quả, dấu ghế); mỗi registry một dòng. `features/play` đổi chữ của kết quả, nút đầu hàng và câu chờ cho game cùng phe; snapshot của hai transport mang cờ cùng phe và người rời ván. Bản dịch vi/en/ja.
- **Server**: không sửa; phòng 2–4 ghế, trọng tài, kết nối lại dùng nguyên như cũ. Mỗi bước là một nước đi, nên một ván nhiều nước hơn các game khác (thường 300–700 nước, tối đa có giới hạn); vẫn trong hạn mức Redis miễn phí, tính ở design §8.
- **Tài liệu**: `idea.md` (§3.3, quyết định mới ở §9), plan.md §6.3 và §10, README.
- **Thư viện và dịch vụ**: không thêm gì.
- **Bất biến**:
  - "Thêm một game… Phải sửa phần dùng chung (engine, session, transport, menu, server, packages/ui) để thêm game là dấu hiệu thiết kế sai." Change sửa `engine`, `transport` và `features/play`. Lý do: đây là **loại game mới** (cùng phe) mà hợp đồng chưa mô tả được, không phải chỗ riêng cho một game. Mọi đoạn sửa đọc cờ cùng phe chứ không đọc mã `jelly-crew`; game cùng phe sau này không phải sửa thêm.
  - Bất biến của trò giải đố giữ nguyên: Gom thạch không import gì của game này và ngược lại; luật đẩy và dính được viết lại trong `packages/games` (design §2).
- **Ranh giới bản quyền**: như Gom thạch, cơ chế đẩy khối là cơ chế chung của thể loại; tên, hình, bản đồ, nút và cửa là của dự án. Không dùng tên, hình hay màn của Jelly Is Sticky hay các game co-op đã tham khảo (Sokoboxes Duo, Death Squared).

## Ngoài phạm vi

- Chơi thời gian thực, mọi người đi cùng lúc (người dùng đã chọn theo lượt).
- Đấu đối kháng, chia đội, tính điểm từng người.
- Máy chơi cùng hay máy chơi thay người rời ván: cần bộ giải cho bản đồ lớn, chưa đáng.
- Trình tạo bản đồ, bản đồ do người chơi gửi, bản đồ ngẫu nhiên.
- Camera, cuộn hay phóng to bản đồ: bố cục giới hạn 19 × 13 để vừa màn hình 360 px.
- Thạch dừa, đá trượt, nút bấm một lần, cửa hẹn giờ và các cơ chế khác ngoài nút và cửa.
- Dùng chung mã luật với trò giải đố Gom thạch (design §2).
- Âm thanh, bảng thành tích, xem lại ván.
