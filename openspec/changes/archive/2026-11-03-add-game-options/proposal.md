# Proposal

## Why

Sau `add-caro-game`, luật Cờ caro đã có bàn 19×19 và luật thắng "tự do", nhưng người chơi chỉ chơi được tuỳ chọn mặc định (15×15, "chặn hai đầu"): màn hình bắt đầu ván và tạo phòng chưa có chỗ chọn, và không ai thấy ván đang dùng luật nào. plan.md §10 chốt "chọn kích thước bàn là tuỳ chọn luật đầu tiên khi tạo ván, kể cả tạo phòng online"; idea.md §3.4 muốn "luật đang dùng hiện ngay ở đầu phòng để mọi người cùng biết". Change này làm phần chọn tuỳ chọn luật **chung cho mọi game khai báo tuỳ chọn** (Cờ caro là game đầu; Cờ cá ngựa ở M6 dùng lại cho các biến thể luật). Thuộc mốc **M5. Cờ caro** (plan.md §6.2); phụ thuộc `add-caro-game` (phải archive change đó trước). Xong change này là xong M5.

## What Changes

- **Engine**: `GameDefinition` có thêm `optionChoices` tuỳ chọn — với mỗi tuỳ chọn luật, các giá trị người chơi được chọn, theo thứ tự hiện. Chỉ là giá trị, không có chữ hiển thị. Hàm `listOptionChoices(game)` trả danh sách `{ name, values }` có kiểu, dùng chung cho bộ kiểm tra hợp đồng và app. Bộ kiểm tra hợp đồng thêm kiểm tra `option-choices` (mặc định nằm trong lựa chọn, mọi tổ hợp đều tạo được ván). Cờ caro khai báo `size: [15, 19]`, `rule: ["blocked-ends", "free"]`.
- **Nhãn**: app dịch tên tuỳ chọn và từng giá trị theo quy ước khoá `Games.<mã game>.options.<tuỳ chọn>.{label, values.<giá trị>}`; tóm tắt luật là câu ICU `Games.<mã game>.options.summary` ("{size} · {rule}" → "19×19 · Tự do"), không ghép chuỗi trong code. Một test bảo đảm mọi game có `optionChoices` đủ khoá và tham số.
- **Màn hình bắt đầu ván**: mỗi tuỳ chọn luật là một nhóm lựa chọn (như "Mức độ"), ở mọi chế độ kể cả "Online"; nhớ cùng lựa chọn gần nhất của game. Game không có tuỳ chọn (Tic-tac-toe) trông như cũ.
- **Tuỳ chọn đi theo ván**: đường dẫn bắt đầu ván, `PlaySetup`, transport cục bộ (cùng máy, đấu với máy), máy (state đã mang luật), ván đã lưu (biên bản đã có `options`, không đổi định dạng lưu). "Ván mới"/"Chơi lại" giữ tuỳ chọn của ván đang chơi; mở thẳng đường dẫn chơi khi chưa có ván dùng tuỳ chọn nhớ gần nhất. Xác nhận trước khi bỏ ván dở không đổi.
- **Hiện luật đang dùng**: màn hình chơi (mọi chế độ) có nhãn tóm tắt luật cạnh tên game; mục ván dở trên menu và màn hình bắt đầu ghi kèm luật ("Cờ caro · Với máy · Khó · 19×19 · Tự do"); sảnh chờ của phòng online ghi luật trước khi người kia bấm "Vào chơi".
- **Online**: "Tạo phòng" gửi tuỳ chọn đã chọn; server đã kiểm tuỳ chọn (`invalid-options`) và giữ tuỳ chọn khi chơi lại.
- Bản dịch vi/en/ja; E2E chọn 19×19 + "tự do" ở cả ba chế độ, kể cả bàn 19×19 trên khung 360 px.

## Capabilities

### New Capabilities

(không có)

### Modified Capabilities

- `game-engine`: thêm requirement "Lựa chọn của tuỳ chọn luật" (khai báo và kiểm tra hợp đồng `option-choices`).
- `caro`: thêm requirement "Lựa chọn tuỳ chọn luật của Cờ caro", "Bàn 19×19 vừa màn hình điện thoại" và "Máy Cờ caro trên bàn 19×19" (hai requirement sau chỉ kiểm được trên giao diện khi chọn được 19×19).
- `game-setup`: thêm "Chọn tuỳ chọn luật", "Tuỳ chọn luật trong ván dở của game"; sửa "Nhớ lựa chọn gần nhất" (nhớ cả tuỳ chọn luật) và "Dùng được bằng bàn phím và trình đọc màn hình" (nhóm tuỳ chọn luật).
- `game-menu`: thêm "Tuỳ chọn luật trong mục tiếp tục ván dở".
- `local-play`: thêm "Tuỳ chọn luật của ván".
- `play-vs-ai`: thêm "Tuỳ chọn luật khi đấu với máy".
- `online-play`: thêm "Luật của phòng online".
- `online-rooms`: sửa "Tạo phòng" (scenario tạo phòng với tuỳ chọn, tuỳ chọn không hợp lệ) và "Ván mới trong phòng" (scenario giữ tuỳ chọn); hành vi server đã có từ M4, nay có scenario kiểm chứng.

## Ngoài phạm vi

- Luật "đúng 5" của Cờ caro: không làm (người dùng đã chốt hai luật).
- Tuỳ chọn không liệt kê được (số tự nhập, thanh trượt), tuỳ chọn phụ thuộc nhau, chọn số người chơi: M6 khi Cờ cá ngựa cần.
- Giải thích từng luật bằng chữ dài, trang luật chơi: M8.
- Đổi tuỳ chọn luật giữa chừng trong phòng online hay giữa các ván "Chơi lại": tạo phòng mới.

## Impact

- **Code**:
  - `packages/engine`: `types.ts` (`optionChoices?`, kiểu `OptionChoices`, `OptionValue`), `option-choices.ts` (mới: `listOptionChoices`), `testing/contract-checks.ts` (`option-choices`).
  - `packages/games/src/caro/rules.ts` (`optionChoices`); `packages/games/src/ids.ts` (mới, điểm vào `@board-games/games/ids`: `GAME_IDS`, `isRegisteredGameId`, `RegisteredGameId` không kèm luật, để bundle client của menu, màn hình bắt đầu và trang phòng không chứa luật và AI của mọi game).
  - `apps/web/src/lib/` (mới `use-option-labels.ts`: nhãn tuỳ chọn và tóm tắt luật; `option-choices.ts`: `matchOptionChoices` thuần), `features/setup/` (`SetupScreen`, `play-setup.ts`, `setup-preferences.ts`), `app/play/[gameId]/page.tsx` (truyền lựa chọn và mặc định xuống client), `features/play/` (`GamePlay`, `PlayScreen` nhãn luật), `features/menu/` (`menu-games.ts` phía server dựng lựa chọn và mặc định của mọi game, `MenuPage.tsx` truyền cho `ContinueList.tsx` qua prop), `features/room/` (`create-room.ts` gửi tuỳ chọn, `RoomLobby` ghi luật, `RoomRoute` + `use-game-option-choices.ts` lấy lựa chọn từ code của game nạp lười), `transport/` (`types.ts`: `PlaySetup.options`, `ReadySnapshot.options`, `SavedGameSummary.options`; `local-transport.ts`, kể cả lưu bàn trống không đánh dấu đang dở; `online-transport.ts`; `indexeddb-store.ts` và `memory-store.ts` đọc `options` của biên bản và nhập mã game từ `@board-games/games/ids`).
  - `packages/config/eslint/index.js`: `@typescript-eslint/no-restricted-imports` cấm nhập giá trị từ `@board-games/games` trong `src/{features,transport,lib}` của app (trừ test và `menu-games.ts` phía server; vẫn cho nhập kiểu).
  - `apps/web/messages/{vi,en,ja}.json` (khoá mới: `Games.caro.options.*` gồm `summary`, `Menu.continueItemWithRules`, `Setup.inProgress.itemWithRules`, `Room.rules`; không đổi khoá cũ; tạo phòng với tuỳ chọn sai dùng lại `Setup.createFailed`), `apps/web/e2e/` (`play-caro.spec.ts`, `online.spec.ts`).
- **Giao thức, server**: không đổi (`create` đã mang `options`, server đã kiểm và giữ khi chơi lại).
- **Dữ liệu trình duyệt**: lựa chọn gần nhất trong `localStorage` có thêm `options`; lựa chọn cũ không có `options` vẫn đọc được (dùng mặc định). Ván đã lưu không đổi định dạng.
- **Phụ thuộc**: không thêm thư viện.
- **Bất biến**: "Không có chữ hiển thị nào ngoài messages" — giữ: engine/games chỉ khai báo giá trị, app dịch theo quy ước khoá. "Thêm một game chỉ gồm GameDefinition + Board + bản dịch + một dòng registry" — giữ: game có tuỳ chọn chỉ thêm `optionChoices` trong GameDefinition và khoá dịch, không sửa màn hình hay transport. Registry của `packages/games` nay có hai chỗ cho mỗi game: định nghĩa trong `GAMES` và mã trong `GAME_IDS` (`ids.ts`); TypeScript bắt `GAMES` có mã ngoài `GAME_IDS`, test bắt `GAME_IDS` lệch `GAMES`, và `GAME_ENTRY_LOADERS` của app phải đủ mọi mã. Đánh đổi để bundle client không chứa luật của mọi game.
- **Tài liệu**: plan.md §3.3 (hàng "Màn hình bắt đầu ván": `optionChoices`), §3.4, §4 checklist thêm game (khoá dịch tuỳ chọn), §10 (M5 xong).
