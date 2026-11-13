# Proposal

## Why

Cờ tướng là game truyền thống quen nhất với người Việt, và nằm trong kế hoạch v1 của `idea.md` §3 (bảng game: "Cờ tướng · 9×10 · Khó · Alpha-beta · v1"). Ngày 13/11/2026 người dùng yêu cầu làm Cờ tướng và chốt ba điểm:

- quân ghi **chữ Hán truyền thống**;
- **chiếu dai thì thua, lặp 3 lần thì hoà**;
- **duyệt mockup trước khi code**.

Change thuộc nhóm v1 trong plan.md §6, làm sớm theo yêu cầu của người dùng. Cờ tướng là trò chơi dân gian không có chủ sở hữu, như Cờ vua; luật, bàn, quân và hình đều tự làm, không dùng thư viện hay hình của bên thứ ba.

## What Changes

**Game mới Cờ tướng** (`xiangqi`, nhóm "cờ dân gian Việt Nam"), 2 người, chơi được cùng máy, đấu với máy (ba mức) và online.

**Luật**:

- bàn 9 cột × 10 hàng giao điểm, có sông và hai cung;
- bảy loại quân với đủ cách đi: Tướng và Sĩ trong cung; Tượng không qua sông, bị cản mắt; Mã bị cản chân; Xe; Pháo ăn phải nhảy qua đúng một ngòi; Tốt qua sông được đi ngang;
- hai Tướng không được đối mặt; không được đi nước để Tướng mình bị chiếu.

**Kết thúc ván**:

- thắng khi đối phương bị chiếu bí hoặc hết nước đi (hết nước là thua, như luật cờ tướng);
- chiếu dai: một bên chiếu liên tục làm thế cờ lặp lại lần thứ ba thì bên đó thua; lặp lại lần thứ ba mà không phải chiếu dai thì hoà;
- hoà khi 120 nước liền không ăn quân.

**Màn hình chơi**, đi cùng khuôn với Cờ vua:

- bàn gỗ có sông "楚河 漢界", quân tròn chữ Hán: Đỏ chữ đỏ (帥 仕 相 傌 俥 炮 兵), Đen chữ đen (將 士 象 馬 車 砲 卒);
- số cột 1–9 của mỗi bên ở mép bàn;
- chọn quân hiện chấm ở điểm đi được và góc ngoặc quanh quân ăn được;
- đánh dấu nước vừa đi, Tướng bị chiếu sáng đỏ;
- thanh người chơi trên và dưới bàn, kèm số điểm hơn quân;
- sổ ghi nước đi theo ký hiệu Việt Nam ("P2-5", "M8.7", "X1/1");
- lật bàn khi chơi cùng máy, hoàn tác.

**Tiếp cận**:

- trình đọc màn hình đọc tên tiếng Việt ("Pháo đỏ ở cột 2, hàng 3");
- bàn phím đi qua 90 giao điểm;
- bàn vừa màn hình 360 px.

**Máy chơi** dùng bộ tìm kiếm chung của engine, với hàm `evaluate` riêng (giá trị quân, vị trí, Tốt qua sông) và thứ tự nước tốt.

**Kèm theo**: trang luật có hình, thẻ trên menu, bản dịch vi/en/ja.

## Capabilities

### New Capabilities

- `xiangqi`: luật, máy và màn hình chơi của Cờ tướng:
  - bàn và quân, cách đi từng quân;
  - Tướng đối mặt, chiếu, chiếu bí, hết nước, chiếu dai, lặp lại, 120 nước không ăn quân;
  - ký hiệu nước đi, máy chơi;
  - bàn, chọn và đi quân, thanh người chơi, sổ ghi nước đi, lật bàn, bàn phím, trình đọc màn hình, điện thoại.

### Modified Capabilities

- `game-menu`: "Game chơi được và game sắp có trên menu" thêm thẻ Cờ tướng. Delta chép từ bản đã sửa trong `add-forbidden-triangle-game`, và archive sau change đó.
- `game-rules`: thêm requirement "Luật Cờ tướng".

## Ngoài phạm vi

- **Luật "đuổi dai"** (dọa bắt liên tục một quân) của giải đấu châu Á: người dùng chọn bản đơn giản. Lặp lại mà không phải chiếu dai thì hoà.
- **Biến thể** (cờ úp, cờ thế, chấp quân).
- **Đề nghị hoà giữa hai người**: chưa có cho game nào. "Đầu hàng" vẫn có như mọi game.
- **Đồng hồ ván.**
- **Máy chơi mạnh** (sách khai cuộc, bảng ghi nhớ thế cờ): máy dùng bộ tìm kiếm chung, đủ cho chơi giải trí.

## Impact

- **Luật** (`packages/games/src/xiangqi/`):
  - quân, sinh nước, chiếu, lặp lại, ký hiệu;
  - `evaluate` và `candidateMoves`;
  - thêm vào `GAME_IDS`, `GAMES`, `AI_GAMES` và `exports` của package.
- **Ứng dụng** (`apps/web/src/games/xiangqi/`):
  - Board, quân SVG, sổ ghi nước, thanh người chơi;
  - Artwork, Rules, `theme.css`, nhãn, kết quả;
  - mỗi registry một dòng.
- **Bản dịch**: `apps/web/messages/{vi,en,ja}.json`.
- **Phông chữ Hán**: dùng phông có sẵn trong app (Noto Sans JP, có đủ các chữ Hán của quân). Không thêm phông, không thêm thư viện (design §5).
- **E2E và ảnh chụp**: cảnh mới.
- **Engine, transport, protocol, server**: không đổi.
- **Bất biến**: không chạm. Luật là hàm thuần trong `packages/games`. Chữ hiển thị nằm trong bản dịch; chữ Hán trên quân là hình của quân (như ký hiệu ●▲ của Cờ cá ngựa) và luôn có tên đọc được bằng ngôn ngữ đang dùng.
