# Proposal: add-caro-infinite-board

## Why

Người chơi góp ý (13/11/2026) rằng bàn Cờ caro "hơi nhỏ", muốn lớn hơn nhiều, nếu được thì vô hạn như chơi trên giấy vở. Bàn 15×15 và 19×19 hiện có làm thế trận hay chạm mép, khác với cách người Việt vẫn chơi caro trên giấy. Người dùng chọn phương án "Bàn vô hạn tự nở" cho mọi chế độ: cùng máy, đấu với máy và online.

Change này nằm ngoài các mốc M0–M8, thuộc mục "Sau MVP" (plan.md §6.3), giống Hộp công cụ và Gom thạch.

## What Changes

- Cờ caro có thêm cỡ bàn thứ ba, "Vô hạn" (`size: "infinite"`), đứng sau 15×15 và 19×19. Mặc định vẫn là 15×15. Biên bản và phòng cũ vẫn dùng được.
- Luật của bàn vô hạn:
  - Bàn bắt đầu bằng một vùng 15×15 ở giữa.
  - Vùng tự nở để quanh quân ngoài cùng luôn còn ít nhất 5 hàng và 5 cột.
  - Quân chỉ được đặt vào ô trống trong vùng đang có.
  - Vùng không nở quá một giới hạn ẩn 61×61. Ván thật hiếm khi vượt 20×20.
  - Mép của giới hạn không tính là chặn, như mép bàn hiện nay.
  - Ván hoà chỉ khi đã lấp kín cả giới hạn.
  - Tên ô (hàng, cột) đếm từ góc của giới hạn, nên không bao giờ đổi khi vùng nở.
- Máy chơi được trên bàn vô hạn ở cả ba mức, trong cùng thời hạn như trên bàn 19×19. Máy chấm thế cờ chỉ trên các dãy năm ô có quân.
- Bàn vô hạn trên màn hình:
  - Khung giấy vở giữ cỡ như hiện nay. Lúc đầu ván, khung trông như bàn 15×15.
  - Khi vùng lớn hơn khung, kéo (chuột hoặc ngón tay) hay cuộn để xem chỗ khác.
  - Có nút thu nhỏ và phóng to, và nút "Về nước vừa đi".
  - Vùng nở ở phía trên hay bên trái thì khung nhìn không giật.
  - Nước mới của người khác nằm ngoài khung nhìn thì khung tự cuộn tới nước đó.
  - Phím mũi tên dừng ở mép vùng, và khung nhìn đi theo tiêu điểm.
  - Ô nhỏ hơn 24 px vẫn dùng luật chạm hai lần.
- Màn hình bắt đầu ván, chip luật của ván, trang luật, câu giới thiệu trên menu và bản dịch vi/en/ja đều có cỡ "Vô hạn".

## Capabilities

### New Capabilities

Không có.

### Modified Capabilities

- `caro`:
  - Requirement đổi: bàn và người chơi, tuỳ chọn luật, đặt quân, hoà, lựa chọn tuỳ chọn luật, nhãn nước đi, đi quân bằng bàn phím.
  - Requirement thêm: bàn vô hạn tự nở, xem bàn vô hạn, bàn vô hạn trên điện thoại, máy trên bàn vô hạn.
- `game-rules`: trang luật Cờ caro nêu thêm cỡ bàn vô hạn.

## Impact

- `packages/games/src/caro/`:
  - `constants.ts`, `options.ts`: thêm giá trị `"infinite"`.
  - `rules.ts`: state có thêm `area`, và `size` là cạnh lưới (61 trên bàn vô hạn).
  - `ai.ts`: chấm thế cờ thưa trên bàn vô hạn.
  - Test và bộ kiểm tra hợp đồng chạy cả với bàn vô hạn.
  - `lines.ts` không đổi.
- `apps/web/src/games/caro/`:
  - `Board.tsx`: khung cuộn, mức thu phóng, nút "Về nước vừa đi", bù cuộn khi vùng nở.
  - `Rules.tsx` (câu về cỡ bàn), `move-label.ts` và test cho bàn vô hạn.
- `apps/web/messages/{vi,en,ja}.json`: nhãn "Vô hạn", nút thu phóng, câu luật.
- `packages/ui/src/icons.ts`: thêm `ZoomInIcon`, `ZoomOutIcon`, `LocateFixedIcon`. Chỉ thêm tên xuất, không đổi gì khác.
- Không đổi engine, session, transport, protocol, server, màn hình chơi chung. Chip luật lấy nhãn tuỳ chọn theo cách chung như hiện nay.
- Online:
  - Server kiểm nước bằng chính luật mới.
  - Một ván vô hạn thật khoảng 20–60 nước, nên biên bản và lưu lượng Redis như ván 19×19.
  - Tệ nhất (đánh ngẫu nhiên, ván dài nhất đo được 1.446 nước): phát lại mất khoảng 70 ms (design §3).
- Bất biến: không chạm. Đây là tuỳ chọn mới của một game có sẵn, không phải thêm game. Việc thêm ba icon vào `packages/ui` là danh sách icon dùng chung, đúng quy ước "icon chỉ qua `@board-games/ui`".

## Ngoài phạm vi

- Bàn không giới hạn thật: giới hạn ẩn 61×61 giữ cho biên bản, server và máy luôn có cận.
- Ảo hoá ô: chỉ vẽ ô trong khung nhìn. Vùng thường dưới 25×25 ô. Chỉ ván đánh ngẫu nhiên kéo dài mới làm vùng chạm 61×61 (khoảng 3.700 ô), vẫn chạy được (design §5).
- Pinch để thu phóng bàn. Pinch vẫn phóng to cả trang như hiện nay; bàn thu phóng bằng nút.
- Bản đồ thu nhỏ (minimap) và luật mở đầu (swap, renju).
- Đổi cỡ bàn mặc định.
