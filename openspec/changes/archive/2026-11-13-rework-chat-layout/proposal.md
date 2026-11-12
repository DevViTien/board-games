# Proposal

## Why

Người chơi phản hồi (13/11/2026) rằng chat lúc chơi "hơi vướng". Trên máy tính, bảng chat mở ra đè lên cột thông tin của ván (dòng lượt, bảng người chơi, Sổ ghi), nên muốn xem ván lại phải đóng chat. Trên điện thoại, tấm trượt chiếm nửa dưới màn hình, che nửa bàn, mà ô tin vẫn chật.

Người dùng đã chọn: trên máy tính, chat **luôn hiện ở cột phải cùng** và thu gọn được; trên điện thoại, bấm nút thì chat mở **toàn màn hình**.

Change này không thuộc mốc nào trong plan.md §6. Nó sửa chat đã có (`add-room-chat`, v1 ở §6.3) theo phản hồi của người chơi.

## What Changes

- **Màn hình rộng (từ 1280 px, không phải điện thoại xoay ngang).**
  - Ở sảnh chờ và màn hình chơi, chat là một **cột cố định ở mép phải**, rộng 18rem, cao từ dưới thanh trên tới đáy màn hình. Cột không đè lên gì.
  - Màn hình chơi chừa sẵn chỗ cho cột, nên tin mới không làm bàn xê dịch. Ở 1280 × 800, bàn nhỏ đi khoảng 10% (design §3). Từ 1366 px trở lên, bàn thường giữ nguyên cỡ.
  - Cột **thu gọn** được thành một dải hẹp 3.5rem ở mép phải. Dải có nút mở chat kèm số tin chưa đọc.
  - Trình duyệt nhớ lựa chọn mở hay thu gọn (`board-games:chat-column`) cho mọi phòng. Mặc định là mở.
  - Thu gọn hay mở cột là thao tác của chính người chơi, nên lúc đó bàn được phép đổi cỡ.
  - Cột đang mở:
    - không có bong bóng;
    - tin chưa đọc không được tính, trừ khi người chơi đang cuộn lên đọc tin cũ;
    - nút "Chat" trong hàng nút của ván ẩn đi.
- **Máy tính hẹp (1024–1279 px), màn hình chơi.** Giữ cách hiện nay: bấm nút "Chat" thì bảng mở phía trên phần điều khiển của cột, và lời của bàn bị che được nói ở đầu bảng. Màn hình hẹp không đủ chỗ cho cột mà bàn không bị bóp quá nhỏ (design §3).
- **Hộp thoại toàn màn hình**, thay cho tấm trượt và cho cột bên khi xoay ngang.
  - Áp dụng cho:
    - điện thoại, kể cả khi xoay ngang;
    - máy tính bảng;
    - mọi khung dưới 1024 px;
    - sảnh chờ dưới 1280 px.
  - Bấm nút chat thì mở một hộp thoại modal phủ kín màn hình.
  - Đầu hộp thoại có nút đóng, công tắc tắt chat, dòng lượt của ván, và nút "Chơi lại" hoặc nút xử bỏ ván khi có.
  - Danh sách tin, câu có sẵn và ô nhập chiếm phần còn lại. Khi bàn phím ảo mở, hộp thoại thu theo vùng nhìn thấy để ô nhập và tin mới nhất vẫn thấy được.
  - Đóng bằng nút đóng, Esc hay cử chỉ quay lại của hệ điều hành. Đóng xong, tiêu điểm về nút chat.
  - Bàn ở dưới không xê dịch. Bỏ phần đệm cuối trang (`data-chat-spacer`) mà tấm trượt cần.
- **Không đổi:**
  - bong bóng, emoji nổi và thẻ "Chat · số" khi chat đóng;
  - tắt chat;
  - loại tin, giới hạn, server, protocol;
  - chat không đụng tới ván.

## Capabilities

### New Capabilities

(không có)

### Modified Capabilities

- `room-chat`:
  - "Chat có ở đâu": nút chat hoặc cột chat.
  - "Bố cục chat": hộp thoại toàn màn hình thay cho tấm trượt; điện thoại xoay ngang cũng dùng hộp thoại.
  - "Chat trên máy tính": cột cố định từ 1280 px; bảng trên cột thông tin ở 1024–1279 px; sảnh chờ dưới 1280 px dùng hộp thoại.
  - Thêm "Cột chat trên màn hình rộng".
  - "Tin đến khi chat đóng": cột thu gọn được tính là đóng.
  - "Chat bằng bàn phím và trình đọc màn hình": Esc trong cột không thu gọn cột; tên nút mở cột nêu số chưa đọc.

## Impact

- `apps/web/src/features/chat/`:
  - `use-chat-placement.ts`: các bố cục `column`, `dock`, `dialog` thay cho `phone`, `landscape`, `desktop`. Bỏ `sheetHeight` và `useSheetSpacer`. Thêm việc nhớ lựa chọn cột.
  - `ChatLayer.tsx`, `ChatPanel.tsx`, `ChatButton.tsx`, `ChatBubble.tsx` và test của chúng.
  - Có thể thêm `ChatRail.tsx` và `chat-column.ts`.
- `apps/web/src/features/play/PlayScreen.tsx`:
  - `--board-room` trừ đi chỗ của cột chat qua biến `--chat-room`, do lớp chat đặt;
  - ẩn nút "Chat" khi cột đang hiện.
- `apps/web/src/features/room/` (sảnh chờ): nội dung chừa chỗ cho cột.
- Bản dịch vi/en/ja: thu gọn, mở chat, tên vùng cột chat.
- E2E:
  - `online-chat.spec.ts`: bàn không xê dịch khi có tin, cột ở 1280 × 800, hộp thoại ở 360 × 740 và 844 × 390, bàn phím ảo;
  - `ui-shots/screens.shots.ts`: ảnh `40-*`–`43-*` theo bố cục mới.
- Không đổi: `packages/*`, server, protocol, `StoredRoom`.
- Không chạm bất biến nào trong `openspec/config.yaml`.

## Ngoài phạm vi

- Kéo đổi độ rộng cột chat, hay kéo cột ra thành cửa sổ riêng.
- Cột chat cho máy tính 1024–1279 px. Bóp cả ba cột vào đó thì bàn còn dưới 300 px; nếu cần, làm sau bằng cách xếp lại cột thông tin.
- Chat khi chơi cùng máy hay đấu với máy (vẫn không có, như spec hiện nay).
- Thông báo đẩy hay âm thanh khi có tin.
- Giữ chat mở khi chuyển sang phòng khác: mỗi phòng vẫn bắt đầu với hộp thoại đóng; riêng lựa chọn cột mở hay thu gọn thì được nhớ.
