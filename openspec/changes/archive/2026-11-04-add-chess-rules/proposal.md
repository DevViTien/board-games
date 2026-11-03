# Proposal

## Why

Cờ vua là game thứ ba của MVP (idea.md §3, §9 mục 6) và là game "luật di chuyển phức tạp" kiểm chứng kiến trúc. Thuộc mốc **M7. Cờ vua** (plan.md §6.2): luật đầy đủ (nhập thành, bắt tốt qua đường, phong cấp, chiếu hết, hết nước đi, lặp lại, luật 50 nước), `meta.supportsAI = false`, vượt bộ test perft. M7 chia hai change theo thứ tự phụ thuộc; change này là **luật**, change kế tiếp `add-chess-board` là bàn cờ, menu, online và E2E. Tách ra để luật (phần dễ sai nhất, idea.md §8) được review và test riêng, với số đo hiệu năng thật trước khi vẽ giao diện.

## What Changes

- **Bọc `chess.js` 1.4.0** (BSD-2-Clause, phát hành 14/06/2025) trong `packages/games/src/chess/`, thêm vào `catalog` của `pnpm-workspace.yaml` với phiên bản ghim chính xác và một luật Renovate riêng. Chỉ một file adapter import `chess.js`; luật vẫn là hàm thuần: mỗi lần gọi dựng một bản `Chess` cục bộ từ FEN, không giữ bản dùng chung.
- **`GameDefinition` Cờ vua** (`chess`): 2 người (Trắng ghế 0 đi trước, Đen ghế 1), thể loại `classic`, ~20 phút, `supportsAI: false`, không tuỳ chọn luật. State là dữ liệu thuần: FEN, các khoá thế cờ từ nước Tốt hoặc ăn quân gần nhất (để đếm lặp lại), sổ ghi SAN, lời đòi hoà nếu có. Nước đi là nước đi quân `{ from, to, promotion? }` hoặc nước đòi hoà `{ type: "claim-draw" }`; `moveKey` dạng UCI (`e2e4`, `e7e8q`) hoặc `claim-draw`, từ chối dữ liệu sai dạng.
- **Hoà theo FIDE**: lặp lại ba lần và luật 50 nước **không** tự kết thúc ván — bên đến lượt có thêm nước "đòi hoà" (không cần đối phương đồng ý) chỉ khi điều kiện đúng ở thế hiện tại; lặp lại năm lần và luật 75 nước kết thúc tự động; hết nước đi và không đủ quân kết thúc ngay. Đòi hoà là một nước của luật nên chạy được online với server làm trọng tài.
- **Kết thúc ván** bằng mã lý do để app dịch: `checkmate` (thắng); `stalemate`, `insufficient-material`, `threefold-claim`, `fifty-move-claim`, `fivefold-repetition`, `seventy-five-move` (hoà). Chiếu hết ở nước đạt 75 nước hay lặp lại năm lần vẫn là thắng (FIDE 9.6).
- **Hàm thuần cho giao diện** (`@board-games/games/chess`): quân trên bàn, ô vua đang bị chiếu, nước đòi hoà có hợp lệ không; giao diện không import `chess.js`.
- **Test**: perft qua chính `legalMoves`/`applyMove` ở thế mở đầu (độ sâu 4 = 197 281), Kiwipete (độ sâu 3), các thế chuẩn 3–6; từng luật theo scenario; bộ kiểm tra hợp đồng `describeGameContract`; đối chiếu adapter với API công khai của `chess.js`; biên bản dựng lại đúng.
- **Phát hành trước khi có bàn cờ**: Cờ vua chỉ lộ qua subpath `@board-games/games/chess`, **chưa** vào `GAMES`/`GAME_IDS`, nên menu vẫn ghi "Sắp có", server và app chưa thấy game này; `chess.js` chưa vào bundle nào của app. `add-chess-board` đăng ký game cùng lúc với bàn cờ.

## Capabilities

### New Capabilities

- `chess`: luật Cờ vua (bàn và người chơi, nước đi hợp lệ, nhập thành, bắt tốt qua đường, phong cấp, chiếu hết, hết nước đi, đòi hoà, hoà tự động khi lặp lại năm lần hoặc sau 75 nước, không đủ quân, ký hiệu nước đi, số nước ở thế chuẩn, ván luôn kết thúc). Bàn cờ và chơi online thêm vào capability này ở `add-chess-board`.

### Modified Capabilities

(không có)

## Ngoài phạm vi

- Bàn cờ, quân SVG, nút "Đòi hoà", sổ ghi, chọn quân phong cấp, lật bàn, menu, online, E2E: change `add-chess-board` (M7).
- **Đòi hoà bằng cách báo trước một nước sẽ tạo thế lặp lại hoặc nước thứ 50** (FIDE 9.2.1, 9.3.1): chỉ đòi được trên thế hiện tại. Người tự tạo lần lặp thứ ba bằng nước của mình mất quyền đòi ở lượt đó (đối thủ đòi được); muốn làm đúng cần một nước "đi rồi đòi" với xác nhận riêng — để sau nếu người chơi cần.
- Máy chơi Cờ vua (Stockfish là GPLv3, idea.md §8): "Sau đó" ở plan.md §6.3; `evaluate` không viết.
- Đồng hồ (v1, cần QStash), đề nghị hoà cần đối phương đồng ý (v1), đầu hàng / bỏ ván (M8 "xử lý bỏ ván"), thế chết ngoài các trường hợp `chess.js` nhận ra (FIDE 5.2.2 tổng quát).
- Nhập/xuất PGN, nhập thế cờ từ FEN cho người chơi, Chess960, premove.

## Impact

- **Code**: `packages/games/src/chess/` (mới: `constants.ts`, `chess-js.ts`, `rules.ts`, `board.ts`, `index.ts`, `test-positions.ts` + test), `packages/games/package.json` (subpath `./chess`, phụ thuộc `chess.js`), `packages/games/eslint.config.js` (chỉ adapter được import `chess.js`), `pnpm-workspace.yaml` (catalog), `renovate.json` (luật riêng cho `chess.js`), `pnpm-lock.yaml`.
- **Không đổi**: engine, protocol, server, app, `GAMES`, `GAME_IDS`, menu. Giao thức online không đổi (design §7).
- **Phụ thuộc**: thêm `chess.js` 1.4.0 (design §1: giấy phép, tuổi phiên bản, không có script cài đặt, kích thước). Thông báo giấy phép đi kèm bản phát hành được thêm ở `add-chess-board`, khi `chess.js` lần đầu vào bundle.
- **Bất biến**: "Luật game là hàm thuần" — giữ: `chess.js` chỉ được dùng qua bản cục bộ trong từng lần gọi (design §2). "Thêm một game chỉ gồm …" — giữ: không sửa phần dùng chung. Không chạm bất biến nào khác.
- **Tài liệu**: plan.md §2 (dòng `chess.js`), §10 (M7: change này xong).
