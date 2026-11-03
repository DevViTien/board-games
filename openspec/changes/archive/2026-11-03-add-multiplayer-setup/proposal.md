# Proposal

## Why

Cờ cá ngựa (mốc **M6**, plan.md §6.2) là game đầu tiên cho 2–4 người và có xúc xắc. Phần dùng chung của app hiện chỉ biết ván hai người: transport cục bộ luôn tạo ván với số người nhỏ nhất ("Choosing the number of players comes with the first game that needs it (M6)", `local-transport.ts`), màn hình bắt đầu ván không cho chọn số người, đấu với máy chỉ có một ghế máy, lời báo trên màn hình chơi chỉ nói "Máy", và nước ngẫu nhiên chưa được tính tới: máy gieo rồi đi ngay sau 0,3 giây nên người chơi không kịp thấy xúc xắc, còn hoàn tác cho phép gieo lại tới khi được số đẹp.

Change này làm phần dùng chung đó **một lần, không biết gì về Cờ cá ngựa**, để change kế tiếp `add-ludo-game` chỉ còn luật, bàn cờ, bản dịch và một dòng registry (bất biến "thêm một game"). Thuộc mốc **M6. Cờ cá ngựa**; là change đầu trong ba change của M6 (`add-multiplayer-setup` → `add-ludo-game` → `add-room-ai-seats`).

## What Changes

- **Chọn số người chơi** ở màn hình bắt đầu ván, cho game có số người thay đổi (`meta.players.min < max`), ở mọi chế độ kể cả "Online": nhóm "Số người chơi" (mặc định số nhỏ nhất), nhớ cùng lựa chọn gần nhất, đi theo đường dẫn bắt đầu ván (`players=<n>`) và thông điệp tạo phòng (`playerCount`, giao thức đã có sẵn). Game hai người như Tic-tac-toe, Cờ caro không có nhóm này, trông y như cũ.
- **Ván cùng máy và đấu với máy với N người**: transport cục bộ tạo ván với số người được chọn; "Ván mới", tải lại, ván đã lưu giữ số người; đường dẫn mang số người không hợp lệ bị bỏ qua như tuỳ chọn sai.
- **Đấu với nhiều máy**: một người chơi và máy ở mọi ghế còn lại, cùng mức độ. "Ai đi trước": Tôi = người chơi đi đầu; Máy = một máy đi đầu, người chơi đi thứ hai; Ngẫu nhiên = vị trí lượt của người chơi được rút đều trong mọi vị trí (hai người: như cũ, một nửa mỗi bên).
- **Lời báo khi có nhiều máy**: khi ván có từ hai ghế máy trở lên, lời báo về máy nêu tên ghế ("Máy (Xanh dương) đang nghĩ…", "Máy (Vàng) thắng!"); ván một máy giữ nguyên lời báo.
- **Lời báo từng nước của máy**: khi máy đi liền nhau (nhiều máy, hay một máy được gieo thêm), mỗi nước đều được nêu trong lời báo; vùng gợi ý của bàn chỉ nói lần gieo của người ở thiết bị này, nên không đọc hai lần.
- **Nhịp máy với nước ngẫu nhiên**: trong game có xúc xắc, nước máy không hiện trước khi hiệu ứng của nước trước kết thúc, và ngay sau một lần gieo thì chờ lâu hơn để người chơi kịp thấy kết quả, vẫn trong 2 giây.
- **Hoàn tác không vượt qua lần gieo**: hoàn tác không bao giờ lùi qua một nước có kết quả ngẫu nhiên; xa nhất là ngay sau lần gieo gần nhất (chọn lại quân cho cùng số, không bao giờ gieo lại), ở cả cùng máy lẫn đấu với máy, kể cả sau khi tải lại.
- **Máy nhìn qua lần gieo của đối thủ** (engine): lần gieo bắt buộc ngay sau một nước quyết định không tốn độ sâu tìm kiếm, nên mức Vừa thấy nước đáp của người kế tiếp; game không có xúc xắc không đổi.
- **Game mẫu cho test**: `dice-race` và game mẫu mới `roll-choose` được export qua `@board-games/engine/testing` để test của app dùng.
- **Giao diện game nhận thêm thế cờ**: `GameUI.usePlayerLabel` thành `(player, state) => string` (tên ghế có thể phụ thuộc số người: hai người Cờ cá ngựa ngồi hai góc đối diện) và `GameUI.useMoveLabel` trả về **cụm hành động** ("đánh hàng 2, cột 3", sau này "gieo được 5"); câu "Máy đánh {move}" thành "Máy {move}". Tic-tac-toe và Cờ caro đổi theo, chữ hiện ra không đổi.
- Test: đơn vị (`play-setup`, `setup-preferences`, `local-transport` với game mẫu 2–4 người có xúc xắc), component (`SetupScreen`, `PlayScreen` bằng `renderWithIntl` + `getByRole`), E2E Tic-tac-toe/Cờ caro cũ xanh không sửa kỳ vọng.

## Capabilities

### New Capabilities

(không có)

### Modified Capabilities

- `game-setup`: thêm "Chọn số người chơi"; sửa "Nhớ lựa chọn gần nhất" (nhớ cả số người), "Người đi trước ngẫu nhiên" (N người: rút đều vị trí lượt của người chơi) và "Dùng được bằng bàn phím và trình đọc màn hình" (thêm nhóm số người).
- `local-play`: thêm "Số người chơi của ván"; sửa "Hoàn tác và làm lại khi chơi cùng máy" (không lùi qua lần gieo).
- `play-vs-ai`: thêm "Đấu với nhiều máy", "Báo lượt và kết quả khi có nhiều máy", "Nhịp máy sau kết quả ngẫu nhiên"; sửa "Báo lượt và kết quả theo bạn và máy" (nêu _nước_ máy vừa đi, không chỉ ô) và "Hoàn tác và làm lại khi đấu với máy" (không lùi qua lần gieo).
- `online-play`: thêm "Số ghế của phòng"; sửa "Báo lượt và kết quả theo bạn và tên đối thủ" (nêu nước đối thủ vừa đi, không chỉ "ở đâu").
- `game-ai`: sửa "Nước đi có yếu tố ngẫu nhiên" (lần gieo bắt buộc không tính là một bước nhìn trước).

## Ngoài phạm vi

- Luật, bàn cờ, AI của Cờ cá ngựa: change `add-ludo-game`. Ghế máy trong phòng online: change `add-room-ai-seats`.
- Chọn từng ghế là người hay máy, mức độ riêng cho từng máy, vừa nhiều người vừa máy trên một thiết bị (2 người + 2 máy): không làm ở M6 (design §2).
- Chọn màu/ghế của người chơi, ai đi trước theo kiểu gieo xúc xắc tranh lượt: không làm.
- Ghi số người trong nhãn ván dở ("Cờ cá ngựa · Với máy · Vừa · 4 người"): không làm; xem lại sau khi chơi thử.
- Hiển thị trước nước đi online, đổi định dạng ván đã lưu hay giao thức: không cần.

## Impact

- **Code** (chỉ `apps/web`, theo plan.md §3.2; chiều phụ thuộc không đổi):
  - `features/setup/` (`play-setup.ts`: `SetupChoice.playerCount`, `PlaySetup.playerCount`, `toStartUrl`/`readStartRequest` với `players`; `setup-preferences.ts`; `SetupScreen.tsx`: nhóm "Số người chơi", truyền `playerCount` cho `createRoom`), `app/play/[gameId]/page.tsx` (truyền `meta.players`).
  - `transport/` (`types.ts`, `local-transport.ts`: số người, ghế máy N người, nhịp máy trong game có xúc xắc, hoàn tác dừng ngay sau lần gieo; `ai-timing.ts`: `AI_SETTLE_DELAY_MS`, `AI_RESULT_DELAY_MS`), `features/play/GamePlay.tsx` (số người nhớ làm `fallback`).
  - `features/play/PlayScreen.tsx` (lời báo nhiều máy, truyền `state` cho nhãn ghế), `games/types.ts`, `games/{tictactoe,caro}/{player-label,move-label}.ts`, `features/room/create-room.ts` (`playerCount`).
  - `apps/web/messages/{vi,en,ja}.json`: khoá mới `Setup.players`, `Setup.playerCount`, `Play.aiSeatThinking`, `Play.aiSeatMovedYourTurn`, `Play.aiSeatWins`, `Play.aiSeatMovedAiThinking`, `Play.aiMovedAiThinking`; sửa `Play.aiMovedYourTurn`, `Play.opponentMovedYourTurn`, `Games.{tictactoe,caro}.move` (chữ hiện ra không đổi).
- **Engine**: `ai/search.ts` (lần gieo bắt buộc không tốn độ sâu), `test-fixtures/roll-choose-game.ts` (mới), `testing/index.ts` (export game mẫu). **Games, protocol, server**: không đổi (giao thức đã có `create.playerCount`, server đã kiểm số người).
- **Dữ liệu lưu**: lựa chọn nhớ thêm `playerCount` (đọc được lựa chọn cũ); ván đã lưu không đổi định dạng (biên bản đã có `playerCount`).
- **Phụ thuộc**: không thêm thư viện.
- **Bất biến**: không chạm bất biến nào; đây chính là phần dùng chung làm trước để `add-ludo-game` không phải sửa nó.
- **Tài liệu**: plan.md §3.3 (hàng màn hình bắt đầu ván: số người), §3.4 (`GameUI`, `PlaySetup`), §10 trong task cuối.
