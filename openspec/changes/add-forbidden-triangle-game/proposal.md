# Proposal

## Why

Người dùng muốn một game lấy ý tưởng từ một bài toán kinh điển, như bài toán 7 cây cầu Euler thành game vẽ một nét. Ngày 13/11/2026 người dùng chọn đề xuất **Tam giác cấm**, dựng trên **bài toán bữa tiệc Ramsey**:

> Trong 6 người bất kỳ, luôn có 3 người đôi một quen nhau hoặc 3 người đôi một lạ nhau (R(3,3) = 6).

Người dùng bảo làm trọn tới khi game chơi được, rồi tự chạy local để duyệt trước khi merge.

Lối chơi hai người tô cạnh và tránh tam giác cùng màu là trò chơi bút giấy cổ điển của toán học tổ hợp ("Sim", G. Simmons 1969), không phải board game thương mại. Tên, hình ảnh (bàn tiệc, dây đỏ và dây xanh), lời cảnh báo nước tự thua, và các bàn 5 và 7 khách là của dự án.

Change nằm ngoài các mốc M0–M8 của plan.md §6, thuộc nhóm "game tự thiết kế" (§6.3) như `add-jelly-crew-game`, làm sớm theo yêu cầu của người dùng.

## What Changes

**Game mới Tam giác cấm** (`forbidden-triangle`), 2 người, chơi được cùng máy, đấu với máy và online bằng khung sẵn có.

**Luật**:

- Các vị khách ngồi quanh bàn tiệc. Hai người lần lượt nối một sợi dây giữa hai vị khách chưa có dây: người thứ nhất dây đỏ, người thứ hai dây xanh.
- Ai khép một tam giác mà cả ba cạnh là dây màu mình thì thua ngay.
- Nối hết dây mà không ai khép tam giác thì hoà. Điều này chỉ xảy ra được ở bàn 5 khách.

**Bàn**: tuỳ chọn `guests` có 5, 6 hoặc 7 khách (10, 15 hoặc 21 sợi dây), mặc định 6. Mỗi bàn có ghi chú trong lưới chọn:

- 5 khách: "Có thể hoà";
- 6 khách: "Không bao giờ hoà";
- 7 khách: "Dài hơn".

Con số 6 chính là định lý: từ 6 khách trở lên thì không thể hoà.

**Thao tác**: chạm vị khách thứ nhất rồi vị khách thứ hai. Bàn phím đi vòng quanh bàn bằng mũi tên, chọn bằng Enter.

- Sau khi chọn vị khách đầu, các dây sẽ khép tam giác của chính mình được đánh dấu nguy hiểm.
- Nối một dây như thế phải xác nhận một lần, vì nó làm mình thua ngay.

**Bảng người chơi** ghi số dây an toàn còn lại của mỗi người: dây chưa nối mà người đó nối được mà không khép tam giác của mình. Đây là con số cả hai đều muốn giữ cho mình và làm cạn cho đối thủ.

**Máy chơi ở ba mức**, dùng bộ tìm kiếm chung của engine:

- Không bao giờ chọn nước tự thua khi còn nước khác.
- Mức Khó tìm tới hết ván ở bàn 5 khách, và tìm sâu nhất trong thời gian cho phép ở bàn 6, 7 khách.

**Kết thúc ván**: tam giác thua được tô nổi; dòng kết quả nêu ba vị khách của tam giác ("Đỏ khép tam giác A–B–D").

**Kèm theo**: trang luật có hình minh hoạ, trong đó có định lý 6 khách; thẻ trên menu; bản dịch vi/en/ja.

## Capabilities

### New Capabilities

- `forbidden-triangle`: luật, máy và màn hình chơi của Tam giác cấm:
  - bàn theo số khách;
  - nối dây, thua khi khép tam giác, hoà khi hết dây;
  - cảnh báo và xác nhận nước tự thua;
  - số dây an toàn;
  - cách thao tác và hiển thị.

### Modified Capabilities

- `game-menu`: "Game chơi được và game sắp có trên menu" thêm thẻ Tam giác cấm. Delta chép từ bản đã sửa trong `add-jelly-crew-game`, archive sau change đó.
- `game-rules`: thêm requirement "Luật Tam giác cấm".

## Ngoài phạm vi

- Ba người chơi (ba màu dây): cần bàn từ 17 khách (R(3,3,3) = 17), quá lớn cho màn hình điện thoại.
- Bàn 8 khách trở lên: máy không tìm tới hết ván được trong thời gian cho phép; bàn 7 đã đủ dài.
- Biến thể "đếm tam giác" (không thua ngay, ít tam giác hơn thì thắng): để sau, khi đã chơi thử bản chuẩn.
- Mockup HTML duyệt trước khi code: người dùng bảo làm thẳng tới bản chơi được và sẽ duyệt bằng cách chạy local (design §8).

## Impact

- **Luật và máy** (`packages/games/src/forbidden-triangle/`): luật, `evaluate`, `candidateMoves`; id vào `GAME_IDS`, `GAMES`, `AI_GAMES`, `exports` của package.
- **Ứng dụng** (`apps/web/src/games/forbidden-triangle/`): Board, Artwork, Rules, `theme.css`, nhãn người chơi, nhãn nước đi, chi tiết kết quả, dòng bảng người chơi; mỗi registry một dòng.
- **Bản dịch**: `apps/web/messages/{vi,en,ja}.json`.
- **E2E và ảnh chụp**: `games-forbidden-triangle.spec.ts`, cảnh mới trong `ui-shots`.
- **Engine, transport, protocol, server**: không đổi.
- **Thư viện và dịch vụ**: không thêm gì.
- **Bất biến**: không chạm. Luật là hàm thuần trong `packages/games`. Giao diện chỉ dùng token và khoá dịch. Thêm game là một dòng ở mỗi registry.
