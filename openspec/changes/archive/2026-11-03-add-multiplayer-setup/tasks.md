# Tasks

## 1. Số người chơi ở màn hình bắt đầu ván

- [x] 1.1 `features/setup/play-setup.ts`: `SetupChoice.playerCount`, `PlaySetup.playerCount?: unknown`, `toPlaySetup` (chỉ thêm khi game có số người thay đổi), `toStartUrl`/`readStartRequest` với `players` (design §1); test: có/không có `players`, `players=abc` → `undefined`, đường dẫn Tic-tac-toe và Cờ caro không đổi
- [x] 1.2 `setup-preferences.ts`: ghi và đọc `playerCount` theo `players: { min, max }` (thiếu, ngoài khoảng, không phải số → `min`, phần khác giữ); test theo "Nhớ số người chơi", "Số người đã nhớ không còn hợp lệ" và lựa chọn cũ không có `playerCount`
- [x] 1.3 `app/play/[gameId]/page.tsx` truyền `meta.players`; `SetupScreen` có `RadioGroup` "Số người chơi" khi `min < max`, đặt trước các nhóm của chế độ máy, giữ khi đổi chế độ; bản dịch vi/en/ja `Setup.players` ("Số người chơi") và `Setup.playerCount` (ICU "{count} người"); component test (`renderWithIntl`, `getByRole`) theo "Game 2–4 người", "Giữ số người khi đổi chế độ", "Game hai người không có nhóm số người", "Chọn số người bằng bàn phím", và "Bắt đầu với 4 người" (đường dẫn có `players=4`)
- [x] 1.4 `features/room/create-room.ts` gửi `playerCount` khi được truyền; `SetupScreen` truyền số đang chọn cho game có số người thay đổi; test: `create` mang `playerCount: 3`; Tic-tac-toe không có trường này ("Tic-tac-toe vẫn tạo phòng hai ghế"); `RoomLobby` hiện đủ ba ghế ("Tạo phòng 3 người", phần sảnh chờ)

## 2. Engine

- [x] 2.1 Game mẫu `test-fixtures/roll-choose-game.ts` (design §6: gieo rồi chọn nước "an toàn"/"tham"); export `diceRaceGame`, `diceRaceAiGame`, `rollChooseGame` qua `@board-games/engine/testing` (design §7; ESLint chặn nhập điểm vào này ngoài test); test của game mẫu; `pnpm knip` sạch
- [x] 2.2 `ai/search.ts`: lần gieo bắt buộc (nước duy nhất, có `outcomes`) ngay sau nước quyết định không tốn độ sâu; hai lần gieo bắt buộc liền nhau thì lần sau tốn (design §6); test: "Mức Vừa thấy nước đáp sau lần gieo của đối thủ" (Dễ khác Vừa với `rollChooseGame`, Dễ cố định `randomMoveChance` bằng rng không ra nước ngẫu nhiên), chuỗi mất lượt không làm cây nổ (đếm số lần `evaluate` có chặn trên), test cũ của `choose-move`/`search` (kể cả `dice-race`, "Chọn nước có kỳ vọng tốt hơn", "Không trông vào kết quả may mắn") và AI của Tic-tac-toe, Cờ caro xanh; sửa kỳ vọng đếm nút của `dice-race` nếu có và ghi lý do

## 3. Transport cục bộ N người

- [x] 3.1 `local-transport.ts`: `newSession(options, playerCount)`; `start` có số người bị engine từ chối thì bỏ như tuỳ chọn sai; `fallback` mang số người; "Ván mới" giữ `session.playerCount`; `GamePlay` truyền số người nhớ làm `fallback` cho cả hai chế độ; test với `dice-race`: "Ván cùng máy 3 người", "Ván mới giữ số người", "Tải lại giữ số người", "Số người sai trên đường dẫn"
- [x] 3.2 `seat()` N người (design §2): "Tôi" ghế đi đầu, "Máy" ghế thứ hai, "Ngẫu nhiên" rút đều trong N ghế; "Ván mới" rút lại; test với rng giả ra đủ bốn ghế ("Ngẫu nhiên với bốn người"), hai người vẫn một nửa mỗi bên ("Ngẫu nhiên có thể ra cả hai"), "Máy đi trước trong ván 3 người", "Một người và ba máy" (ba máy đi lần lượt, `AiPlayer` giả), "Ván mới giữ số người và mức độ", "Tải lại giữa ván nhiều máy"
- [x] 3.3 Nhịp máy (design §4): `AI_SETTLE_DELAY_MS`, `AI_RESULT_DELAY_MS` trong `ai-timing.ts`, chỉ cho game có `outcomes`; test bằng đồng hồ giả: "Máy không đi ngay sau khi gieo", "Máy không cắt hiệu ứng đi quân", "Nhịp cũ cho game không ngẫu nhiên" (Tic-tac-toe vẫn 300 ms), hoàn tác trong lúc chờ vẫn bỏ nước máy
- [x] 3.4 Hoàn tác không vượt qua lần gieo (design §5) cho cả hai chế độ; test với `rollChooseGame`/`dice-race`: "Chọn lại sau khi gieo", "Không hoàn tác lần gieo", "Tải lại sau khi hoàn tác" (khôi phục từ kho bộ nhớ), "Máy đã gieo thì không hoàn tác được", "Chọn lại trước khi máy gieo"; test hoàn tác cũ của Tic-tac-toe (cùng máy và đấu với máy, kể cả "Hoàn tác nước thắng", "Hoàn tác trong lúc máy nghĩ") xanh không đổi kỳ vọng

## 4. Màn hình chơi

- [x] 4.1 `GameUI.usePlayerLabel` thành `() => (player, state) => string`; `PlayScreen` truyền `snapshot.state`; Tic-tac-toe, Cờ caro bỏ qua `state`; test cũ của `PlayScreen` và hai game xanh không đổi kỳ vọng
- [x] 4.2 `useMoveLabel` trả cụm hành động (design §3): sửa `Games.tictactoe.move`, `Games.caro.move`, `Play.aiMovedYourTurn`, `Play.opponentMovedYourTurn` ở vi/en/ja sao cho chữ hiện ra không đổi; test hiện có ("Báo nước máy vừa đi", "Đối thủ vừa đi", "Nước ở góc bàn 19×19") xanh không sửa kỳ vọng
- [x] 4.3 Lời báo khi có nhiều máy và khi máy đi liền nhau (design §3): khoá `Play.aiSeatThinking`, `Play.aiSeatMovedYourTurn`, `Play.aiSeatWins`, `Play.aiSeatMovedAiThinking`, `Play.aiMovedAiThinking` ở vi/en/ja; component test `PlayScreen` với transport giả ba ghế máy: "Báo máy nào đang nghĩ", "Báo từng nước của máy", "Báo máy nào thắng", máy vừa đi rồi tới lượt bạn nêu tên ghế; "Một máy giữ lời báo cũ"

## 5. Hoàn tất

- [x] 5.1 Cập nhật plan.md §3.3 (màn hình bắt đầu ván: số người chơi; AI: lần gieo bắt buộc không tốn độ sâu), §3.4 (`GameUI.usePlayerLabel`/`useMoveLabel`, `PlaySetup.playerCount`, nhịp máy trong game có xúc xắc, hoàn tác không vượt qua lần gieo, game mẫu trong `@board-games/engine/testing`), §10 (M6: change này xong)
- [x] 5.2 Đối chiếu delta spec với code (diff trọn thân mọi khối MODIFIED với `openspec/specs/{game-setup,local-play,play-vs-ai,online-play,game-ai}/spec.md`); chạy `pnpm exec openspec validate add-multiplayer-setup --strict`, `pnpm check`, `pnpm knip`, `pnpm test:e2e` (E2E cũ xanh không sửa kỳ vọng, cả hai cấu hình máy), `pnpm spec:check`
- [x] 5.3 Archive change (`pnpm exec openspec archive add-multiplayer-setup --yes`) trong cùng PR, sau review, **trước** khi archive `add-ludo-game`

## Ngoài phạm vi

- Luật, bàn cờ, AI và E2E của Cờ cá ngựa: change `add-ludo-game`. Ghế máy online: change `add-room-ai-seats`.
- Chọn từng ghế người/máy, mức riêng cho từng máy, trộn người và máy trên một thiết bị: không làm ở M6 (design §2).
- Chọn màu hay ghế của người chơi, tranh lượt đi đầu bằng xúc xắc: không làm.
- Số người trong nhãn ván dở và màn hình chơi: không làm, xem lại sau khi chơi thử.
- Giảm giới hạn thời gian của máy khi có nhiều máy: chỉ làm nếu chơi thử thấy chậm (design, Risks).
