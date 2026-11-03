# Proposal

## Why

Cờ caro là game đầu tiên của MVP (idea.md §3, §9 mục 6) và là game "bàn lớn" kiểm chứng kiến trúc: 225 hoặc 361 ô, AI không thể xét mọi ô như Tic-tac-toe, bàn cờ phải dùng được trên điện thoại. Change này đưa Cờ caro vào app với **luật mặc định** (bàn 15×15, luật "chặn hai đầu"), chơi được cả ba chế độ: cùng máy, đấu với máy, online. Thuộc mốc **M5. Cờ caro** (plan.md §6.2). Chọn tuỳ chọn luật (bàn 19×19, luật "tự do") trên giao diện là change kế tiếp `add-game-options` (cũng thuộc M5); change này đã viết luật cho cả hai kích thước và cả hai luật để change kia chỉ còn việc giao diện.

## What Changes

- **Luật Cờ caro** (`packages/games/src/caro/`): 2 người, X (ghế 0) đi trước, đặt quân vào ô trống; thắng khi có từ 5 quân liên tiếp trở lên theo hàng ngang, cột dọc hoặc đường chéo. Tuỳ chọn luật `{ size: 15 | 19, rule: "blocked-ends" | "free" }`, mặc định `{ size: 15, rule: "blocked-ends" }`:
  - `blocked-ends` ("chặn hai đầu"): chuỗi từ 5 quân **không** thắng khi cả hai ô ngay ngoài hai đầu chuỗi đều là quân đối thủ; mép bàn không tính là bị chặn; chuỗi dài hơn 5 vẫn thắng.
  - `free` ("tự do"): chuỗi từ 5 quân luôn thắng.
  - Đầy bàn mà không ai thắng là hoà. Hàm thuần `caroWinningLine(state)` cho giao diện biết các ô của hàng thắng.
- **AI cho Cờ caro**: `evaluate` chấm điểm theo mẫu chuỗi quân (bốn, ba, hai; mở hay bị chặn) và tôn trọng luật đang dùng. Engine thêm hook tuỳ chọn `candidateMoves` trong `GameDefinition` để game **thu hẹp và sắp thứ tự** các nước máy xét; Cờ caro trả về các ô trống gần quân đã đặt (ô giữa khi bàn trống), xếp theo mức đe doạ, luôn giữ mọi ô tạo được năm. Máy mức Vừa chặn được chuỗi bốn, mọi mức trên Dễ chớp nước thắng ngay, mức Khó không làm đứng giao diện và vẫn trong giới hạn thời gian hiện có.
- **Bàn cờ** (`apps/web/src/games/caro/`): lưới ô là nút bấm phủ trên một lớp SVG (đường kẻ, đường hàng thắng); đánh dấu nước vừa đi và hàng thắng; tên đọc được mỗi ô ("Hàng 8, cột 8, trống"); đi bằng phím mũi tên trong bàn (chỉ một điểm dừng Tab); vừa khít chiều ngang điện thoại 360 px mà không cuộn ngang; trên màn hình cảm ứng khi ô nhỏ hơn 24 px thì **chạm chọn, chạm lại để đặt** (bàn phím luôn đặt ngay).
- **Nhãn nước đi theo kích thước bàn**: `GameUI.useMoveLabel` đổi thành `(move, state) => string`, `PlayScreen` truyền state (nước `{ cell }` không mang kích thước bàn); Tic-tac-toe đổi theo, không đổi hành vi. Helper E2E `board()` nhận cả bàn `role="grid"`.
- **Đăng ký game**: thêm Cờ caro vào `GAMES` (`packages/games`) và `GAME_ENTRY_LOADERS` (app); bỏ Cờ caro khỏi danh sách "Sắp có"; bản dịch vi/en/ja.
- Online chạy ngay với luật mặc định, vì server kiểm nước đi bằng chính `packages/games`.
- Test: luật (mọi hướng thắng, quá năm, chặn hai đầu, mép bàn, bàn 19×19, hoà), bộ kiểm tra hợp đồng với cả bốn tổ hợp tuỳ chọn, AI (chặn bốn, chớp thắng, số nút ở độ sâu tối thiểu), bàn cờ (bàn phím, tên đọc được, chạm hai lần), E2E cho ba chế độ.

## Capabilities

### New Capabilities

- `caro`: luật Cờ caro (bàn, tuỳ chọn luật, đặt quân, thắng theo hai luật, hoà, hàng thắng), máy chơi Cờ caro, và bàn cờ Cờ caro trên giao diện (nước vừa đi, hàng thắng, bàn phím, màn hình nhỏ).

### Modified Capabilities

- `game-ai`: thêm requirement "Thu hẹp nước đi máy xét" (hook `candidateMoves`, cả nước ngẫu nhiên của mức Dễ) và "Kiểm tra tập nước thu hẹp" (bộ kiểm tra hợp đồng); sửa "Mức Khó" (bảo đảm không đi vào thế thua chỉ trong tập nước máy xét) và "Giới hạn thời gian" (chỉ một nước để xét thì trả về ngay).
- `game-menu`: "Game hiện trên menu" được thay bằng "Game chơi được và game sắp có trên menu" (cùng nội dung; scenario "Menu khi mới có Tic-tac-toe" nói Cờ caro "Sắp có" không còn đúng, mà khối MODIFIED không bỏ được scenario) — Cờ caro thành thẻ chơi được.

## Ngoài phạm vi

- Chọn kích thước bàn và luật thắng trên giao diện, hiện luật đang dùng: change `add-game-options` (M5). Hành vi chỉ thấy được khi chơi 19×19 trên giao diện (bàn 19×19 trên điện thoại hẹp, máy mức Khó trên bàn 19×19) có spec và E2E ở change đó.
- Luật "đúng 5" (chuỗi 6 trở lên không thắng): không làm; người dùng đã chốt hai luật "chặn hai đầu" và "tự do".
- Bàn vô hạn (idea.md §3.1), Canvas: không cần ở 19×19 (design §3); xem lại nếu đo thấy chậm.
- Trang luật chơi (`rules.{vi,en,ja}.mdx`): M8 cùng các game khác.
- Toạ độ chữ/số quanh bàn, gợi ý nước đi, luật Renju (cấm 3-3, 4-4 cho bên đi trước), swap mở đầu: không làm ở MVP.

## Impact

- **Code**:
  - `packages/engine`: `types.ts` (`candidateMoves?`), `ai/search.ts` (`searchMoves` dùng hook), `ai/choose-move.ts` (lọc nước gốc theo luật, Dễ chọn trong tập thu hẹp, chỉ một nước thì trả ngay), `move-key.ts` (`moveKeyOf` dùng chung cho `choose-move`, `session`, bộ kiểm tra hợp đồng), `testing/contract-checks.ts` (kiểm tra `candidate-moves`).
  - `packages/games/src/caro/` (mới: `constants.ts`, `options.ts`, `lines.ts`, `rules.ts`, `ai.ts`, `index.ts` + test), `packages/games/src/index.ts` (`GAMES`).
  - `apps/web/src/games/caro/` (mới: `Board.tsx`, `index.ts`, `move-label.ts`, `player-label.ts`), `games/registry.ts`, `games/types.ts` và `games/tictactoe/move-label.ts` (`useMoveLabel` nhận thêm `state`), `features/play/PlayScreen.tsx` (truyền state cho nhãn nước đi), `features/menu/planned-games.ts`, `apps/web/messages/{vi,en,ja}.json`, `apps/web/e2e/` (mới `play-caro.spec.ts`; `helpers.ts`: `board()` nhận `role="grid"`).
- **Giao thức, server, transport**: không đổi. Biên bản ván 19×19 đầy bàn ~8 KB, dưới mọi giới hạn (design §5).
- **Phụ thuộc**: không thêm thư viện.
- **Bất biến**: "Thêm một game chỉ gồm GameDefinition + Board + bản dịch + một dòng registry" — game cần thêm một hook tuỳ chọn trong engine (`candidateMoves`) **một lần** cho mọi game bàn lớn; không game nào bắt buộc dùng, Tic-tac-toe không đổi. Không chạm bất biến nào khác.
- **Tài liệu**: plan.md §3.3 (hàng AI: `candidateMoves`), §3.4 (`GameDefinition`), §10 cập nhật trong task cuối.
