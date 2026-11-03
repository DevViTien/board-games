# Design

## Context

- Engine đã sẵn cho N người và xúc xắc: `createSession(game, { playerCount, options })` kiểm số người theo `meta.players`; `outcomes` + `playMove(…, rng)` chốt kết quả vào nước đi; `applyEntry` áp một nước với kết quả có sẵn; `Session.entries` giữ cả các nước đã hoàn tác sau `cursor`; biên bản có `playerCount`. AI (`chooseMove`) đã là minimax góc nhìn ghế máy (mọi ghế khác cực tiểu) + expectimax ở nút ngẫu nhiên, chạy được với N người. Game mẫu `dice-race` (2–4 người, xúc xắc) có ở `packages/engine/src/test-fixtures/`.
- App:
  - `transport/local-transport.ts`: `newSession()` luôn dùng `meta.players.min` (ghi chú "Choosing the number of players comes with the first game that needs it (M6)"); `seat()` đặt người chơi ở ghế đi đầu hoặc ghế kế tiếp, "random" là tung đồng xu giữa hai vị trí đó; `startAiTurn` đã dùng mức của từng ghế máy (`seats[i].level`), nên nhiều ghế máy đi lần lượt được; `savedSeats` đòi đúng một người. Máy hiện nước sau `AI_MIN_DELAY_MS` = 300 ms, nghĩ tối đa `AI_TIME_LIMIT_MS` (500/500/1500 ms).
  - `SeatController` đã có ghi chú "M6 seats several AIs, each with its own level"; `useModeLabel` đã ghi "Với máy" (không mức) khi các máy khác mức.
  - `features/setup/`: `SetupChoice = { mode, level, first, options }`, `toStartUrl` → `?new=1&level=…&first=…&options=<JSON>`; `SetupScreen` nhận dữ liệu thuần từ `app/play/[gameId]/page.tsx` (server).
  - `PlayScreen.describeStatus`: lời báo theo `viewer` (một người ở thiết bị này); "Máy đang nghĩ…", "Máy đánh {move}. Đến lượt bạn ({player})", "Máy thắng!" không nói máy nào. `GameUI.usePlayerLabel: () => (player) => string` (không có state), `useMoveLabel: () => (move, state) => string` trả về vị trí ("hàng 2, cột 3"), động từ "đánh" nằm trong câu của `Play`.
  - `features/room/create-room.ts` không gửi `playerCount`; server (`room-service.create`) đã nhận và kiểm `playerCount` (`invalid-player-count`), sảnh chờ đã vẽ đủ mọi ghế của `room.seats`.
- Yêu cầu hành vi: delta `game-setup`, `local-play`, `play-vs-ai`, `online-play`, `game-ai`.

## Goals / Non-Goals

**Goals:**

- Phần dùng chung cho game 2–4 người có xúc xắc, viết một lần và không biết tên game nào: thêm Cờ cá ngựa ở change sau không sửa `features/`, `transport/` hay server.
- Tic-tac-toe và Cờ caro trông và chạy y như cũ (DOM, chữ, đường dẫn bắt đầu ván, thông điệp tạo phòng).
- Không đổi định dạng ván đã lưu hay giao thức. Engine chỉ đổi cách đếm độ sâu ở lần gieo bắt buộc (§6) và export game mẫu cho test (§7).

**Non-Goals:**

- Chọn từng ghế là người/máy, mức riêng từng máy, trộn người và máy trên một thiết bị.
- Phòng online có ghế máy (change `add-room-ai-seats`).
- Luật, bàn, AI của Cờ cá ngựa (change `add-ludo-game`).

## Đã chốt với người dùng (03/11/2026)

- Cờ cá ngựa chơi 2–4 người ở cả ba chế độ; chế độ đấu với máy trên một thiết bị có nhiều ghế máy (plan.md §6.2, M6).
- Biến thể luật Cờ cá ngựa **không** hiện trên giao diện ở M6; nên màn hình bắt đầu ván của Cờ cá ngựa chỉ có thêm nhóm "Số người chơi".
- Cách dựng màn hình chọn người/máy để agent quyết định, miễn đơn giản và nói rõ lý do (§2).
- (Review thiết kế) Hoàn tác **không bao giờ vượt qua một nước có kết quả ngẫu nhiên** (§5); lần gieo bắt buộc **không tốn độ sâu** tìm kiếm của máy (§6); nhịp máy trong game có xúc xắc không ngắn hơn hiệu ứng của nước trước (§4).

## Decisions

### 1. Số người chơi đi theo ván

```ts
// features/setup/play-setup.ts
interface SetupChoice {
  mode;
  level;
  first;
  options;
  readonly playerCount: number;
}
// transport/types.ts — chưa tin cậy như options (đường dẫn, localStorage); transport kiểm bằng engine
type PlaySetup =
  | { mode: "local"; options?: unknown; playerCount?: unknown }
  | { mode: "ai"; level; first; options?: unknown; playerCount?: unknown };
```

- **Màn hình bắt đầu ván**: `page.tsx` (server) truyền thêm `players: { min, max }` (dữ liệu thuần của `meta`). Khi `min < max`, `SetupScreen` có `RadioGroup` "Số người chơi" (giá trị `min…max`, nhãn ICU "{count} người"), đặt **trước** các nhóm của chế độ máy (số người quyết định có bao nhiêu máy), hiện ở mọi chế độ và giữ khi đổi chế độ. `min === max`: không có nhóm, `playerCount = min`, DOM không đổi.
- **Mặc định**: `meta.players.min`. Phương án đã cân nhắc: số lớn nhất (Cờ cá ngựa hay chơi 4 người) — bỏ, vì không phải game nào cũng hợp (game 2–8 người sau này); thêm `meta.defaultPlayers` — chưa cần, lựa chọn nhớ đã giữ thói quen của người chơi. Xem lại sau khi chơi thử.
- **Nhớ**: `writeSetupChoice` ghi `playerCount`; `readSetupChoice(…, players)` nhận số trong `[min, max]`, thiếu hay sai → `min`, phần còn lại giữ nguyên (như từng tuỳ chọn luật).
- **Đường dẫn**: `toStartUrl` thêm `players=<n>` **chỉ khi** game có số người thay đổi (đường dẫn của Tic-tac-toe, Cờ caro y như cũ); `readStartRequest` đọc số nguyên, không phải số → `undefined` (tiếp tục ván đã lưu).
- **Transport**: `newSession(options, playerCount)`; `start` có `playerCount` mà engine từ chối (`invalid-player-count`) thì bị bỏ như `options` bị từ chối (thứ tự quyết định ván của `add-game-options` §4 giữ nguyên, thêm điều kiện này ở bước 1); `fallback` (lựa chọn nhớ) mang `playerCount`; "Ván mới" dùng `session.playerCount`; khôi phục dùng biên bản. `ModeSettings` không đổi: số ghế đã nằm trong biên bản và `seats.length`.
- **Online**: `createRoom({ …, playerCount })` gửi `playerCount` khi game có số người thay đổi; Tic-tac-toe, Cờ caro gửi y như cũ. Server không đổi.
- Phương án đã cân nhắc: coi số người là một tuỳ chọn luật trong `Options`/`optionChoices` — bỏ: engine đã tách `playerCount` khỏi `options` (`SetupContext`, biên bản, `meta.players`), gộp lại sẽ có hai nguồn cho cùng một con số và tóm tắt luật sẽ ghi số người như một luật.

### 2. Ghế khi đấu với máy N người

- **Một người chơi + máy ở mọi ghế còn lại**, cùng mức đã chọn. Ghế được đặt theo "Ai đi trước" (ghế 0 luôn đi đầu ở mọi game hiện có):

  | Ai đi trước | Ghế của người chơi                            | Hai người (như cũ)      |
  | ----------- | --------------------------------------------- | ----------------------- |
  | Tôi         | ghế đi đầu                                    | như cũ                  |
  | Máy         | ghế đi thứ hai                                | như cũ                  |
  | Ngẫu nhiên  | rút đều trong N ghế (`rng.nextInt(0, N − 1)`) | một nửa mỗi bên, như cũ |

  "Ván mới" với "Ngẫu nhiên" rút lại; vị trí đã rút lưu trong `ModeSettings.seats` như hiện nay.

- **Lý do chọn đơn giản**: `savedSeats` (ván đấu với máy có đúng một người), lời báo theo "bạn" (`viewer`), hoàn tác "lùi về lượt người chơi" và slot ván dở theo game × chế độ đều giả định một người ở thiết bị. Cho chọn từng ghế (người/máy/mức) cần một màn hình bảng ghế, lời báo cho nhiều người và máy cùng lúc, luật hoàn tác mới — không đáng ở MVP; nhóm bạn ngồi cạnh nhau đã có "Cùng máy", người chơi một mình có "1 người + máy".
- Phương án đã cân nhắc: "Máy" = người chơi ở ghế cuối — bỏ: "Máy đi trước" chỉ hứa máy đi đầu; ghế thứ hai giữ đúng nghĩa đó và trùng hành vi hai người hiện có.

### 3. Lời báo khi có nhiều máy

- `PlayScreen` đếm ghế máy trong `snapshot.seats`. Một ghế máy: lời báo như cũ. Từ hai ghế máy:

  | Trường hợp               | Khoá mới                     | vi                                              |
  | ------------------------ | ---------------------------- | ----------------------------------------------- |
  | Tới lượt một máy         | `Play.aiSeatThinking`        | Máy ({player}) đang nghĩ…                       |
  | Máy vừa đi, tới lượt bạn | `Play.aiSeatMovedYourTurn`   | Máy ({mover}) {move}. Đến lượt bạn ({player})   |
  | Một máy thắng            | `Play.aiSeatWins`            | Máy ({player}) thắng!                           |
  | Máy vừa đi, tới lượt máy | `Play.aiSeatMovedAiThinking` | Máy ({mover}) {move}. Máy ({player}) đang nghĩ… |

- **Mọi nước của máy được nói ra**, không chỉ nước cuối trước lượt người chơi: khi nước vừa đi là của một máy và lượt kế tiếp vẫn là máy (máy khác, hay chính nó sau khi gieo), lời báo nêu nước đó kèm máy đang nghĩ (dòng cuối của bảng; ván một máy dùng `Play.aiMovedAiThinking` "Máy {move}. Máy đang nghĩ…"). Vì máy đi từng nước một (transport cục bộ, và trang phòng online hiện lần lượt ở `add-room-ai-seats`), `role="status"` đọc từng nước, nhất là khi ngựa của người chơi bị đá. Tic-tac-toe, Cờ caro không bao giờ có hai nước máy liền nhau nên không đổi.
- **Không đọc hai lần**: `role="status"` của `PlayScreen` chỉ nói về nước của máy/đối thủ và lượt; vùng gợi ý `aria-live` của bàn (Cờ cá ngựa) chỉ nói kết quả gieo **của người ở thiết bị này** (`viewer`, hay người đang đến lượt khi chơi cùng máy). Hai vùng không bao giờ nói cùng một nước.
- `GameUI.usePlayerLabel` thành `() => (player, state) => string`: tên ghế có thể phụ thuộc thế cờ (Cờ cá ngựa hai người ngồi hai góc đối diện: ghế 1 là màu thứ ba). `PlayScreen` truyền `snapshot.state`; Tic-tac-toe, Cờ caro bỏ qua tham số. Đây là cùng kiểu đổi với `useMoveLabel` ở M5.
- `GameUI.useMoveLabel` trả về **cụm hành động** thay vì vị trí: `Games.tictactoe.move`/`Games.caro.move` thành "đánh hàng {row}, cột {col}", `Play.aiMovedYourTurn` "Máy {move}. Đến lượt bạn ({player})", `Play.opponentMovedYourTurn` "{name} vừa {move}. …" (en/ja đổi tương ứng). Chữ hiện ra của hai game cũ không đổi; Cờ cá ngựa trả "gieo được 5", "đi ngựa 2 tới ô 17". Phương án đã cân nhắc: khoá câu riêng theo game (`Games.<id>.aiMoved`) — khoá ghép động không được kiểm kiểu và mỗi game phải lặp lại cả câu.

### 4. Nhịp máy sau kết quả ngẫu nhiên

- `ai-timing.ts` thêm hai hằng số (chỉnh khi chơi thử), chỉ áp cho game **có khai báo `outcomes`** (`definition.outcomes !== undefined`):
  - `AI_SETTLE_DELAY_MS = 500`: chờ tối thiểu trước mọi nước máy, thay `AI_MIN_DELAY_MS` (300 ms) — **không ngắn hơn hiệu ứng của nước trước** (ngựa đi từng ô tối đa 400 ms, `add-ludo-game` §8), để hiệu ứng không bị cắt;
  - `AI_RESULT_DELAY_MS = 800`: khi nước vừa đi (`lastEntry`) có `outcome` — không ngắn hơn hiệu ứng xúc xắc (450 ms) cộng thời gian đọc số.
- Ràng buộc ghi ở `ai-timing.ts` và kiểm bằng test: mọi hiệu ứng của bàn ≤ hằng số chờ tương ứng. Chờ vẫn chạy song song với lúc máy nghĩ (nước hiện sau `max(nghĩ, chờ)` ≤ 1,5 s + độ trễ Worker, trong hạn 2 giây của `play-vs-ai`).
- Game không có `outcomes` (Tic-tac-toe, Cờ caro) giữ 300 ms. Spec chỉ nói hành vi ("kịp thấy kết quả", "trong 2 giây"); số nằm ở đây.

### 5. Hoàn tác không vượt qua một lần gieo (quyết định sau review)

- **Luật**: hoàn tác **không bao giờ lùi qua một nước có `outcome`**. Xa nhất là trạng thái ngay sau lần gieo gần nhất còn hiệu lực: người chơi chọn lại được ngựa cho **cùng số**, không bao giờ gieo lại. Áp cho mọi game có `outcomes`, ở cả cùng máy lẫn đấu với máy; Tic-tac-toe, Cờ caro không có nước nào có `outcome` nên không đổi.
- **Cùng máy** (lùi một nước): nút hoàn tác bấm được khi nước cuối còn hiệu lực không có `outcome`.
- **Đấu với máy** (lùi tới lượt người chơi, bỏ cả nước máy): đi lùi như hiện nay nhưng dừng trước bất kỳ nước có `outcome`; nếu không tới được một lượt của người chơi mà không qua nước đó thì `canUndo = false`. Hệ quả với Cờ cá ngựa: chỉ hoàn tác được nước đi ngựa của mình trong lúc máy chưa gieo; khi máy đã gieo thì không hoàn tác được nữa.
- **Làm lại** giữ nguyên (`redo` dùng kết quả đã chốt, engine đã bảo đảm).
- **Tải lại**: biên bản (`toRecord`) chỉ giữ nước còn hiệu lực, mà lần gieo không bao giờ bị hoàn tác, nên tải lại không thể làm mất một lần gieo; trạng thái khôi phục có đúng số vừa gieo.
- Cài đặt: `canUndo`/`requestUndo` của `local-transport.ts` xét `session.entries[i].outcome !== undefined` (dữ liệu thuần, không cần biết game). Engine không đổi.
- Phương án đã cân nhắc:
  - Đi lại đúng nước sau hoàn tác thì dùng kết quả cũ (bản trước của design này): sai, vì `appendEntry` bỏ nhánh redo nên đi lại cùng ngựa vẫn gieo mới cho máy, và `toRecord` bỏ nước đã hoàn tác nên hoàn tác + tải lại là gieo lại — bỏ.
  - Cho gieo lại — người chơi dùng hoàn tác để chọn xúc xắc: bỏ.
  - Tắt hoàn tác cho game có xúc xắc — mất cả việc chọn lại ngựa vừa đi nhầm: bỏ.

### 6. Lần gieo bắt buộc không tốn độ sâu tìm kiếm (engine)

- Vấn đề: `chooseMove` đếm độ sâu theo nước, kể cả lần gieo của đối thủ. Với Cờ cá ngựa, mức Vừa (độ sâu 2) = nước của mình + lần gieo kế tiếp rồi chấm điểm — không thấy đối thủ đáp lại, gần như tham lam như mức Dễ.
- Quyết định (`ai/search.ts`): một nút mà **mọi nước hợp lệ đều ngẫu nhiên và chỉ có một nước** (lần gieo bắt buộc, đếm trên `legalMoves`, không trên `candidateMoves`) **không tốn độ sâu** khi và chỉ khi nước dẫn tới nó **được chọn giữa từ hai nước trở lên** (nước quyết định). Lần gieo sau một lần gieo khác (nhiều lần mất lượt liên tiếp) hay sau một nước là nước duy nhất thì tốn như thường — mỗi lần gieo được miễn cần một nước quyết định phía trên, nước đó tốn một bước, nên cây vẫn bị chặn (không nổ kiểu 6^k). Nút ở độ sâu 0 vẫn chấm điểm ngay, nên mức Dễ (độ sâu 1) vẫn chỉ nhìn thế ngay sau nước của mình.
- Kết quả: mức Vừa (độ sâu 2) = nước của mình → lần gieo của người kế tiếp (không tốn) → nước đáp tốt nhất của họ với từng số → chấm điểm: thấy được nguy cơ bị đá. Mức Khó đào sâu như cũ, mỗi tầng là một nước quyết định.
- Game không có `outcomes`: không có nút như vậy, không đổi (test Tic-tac-toe, Cờ caro giữ nguyên). `dice-race` (chỉ có nước gieo, mỗi nút là lần gieo bắt buộc, kể cả gốc): không nút nào có nước quyết định phía trên, nên mọi lần gieo đều tốn và cây của `dice-race` không đổi; test chặn trên số lần `evaluate` (≤ 6^độ sâu). Không có test cũ nào đếm nút, không phải sửa kỳ vọng.
- Cài đặt: `searchRoot`/`nodeScore` truyền xuống con dấu `afterChoice` (nút cha có từ hai nước để xét); nút có dấu đó mà là lần gieo bắt buộc (`isForcedRoll`: game có `outcomes`, `legalMoves` đúng một nước và nước đó có kết quả ngẫu nhiên; game không có `outcomes` không tốn thêm lần gọi nào) thì xét các nước của nó với `depth + 1`. Bản tham chiếu expectiminimax trong `search.test.ts` theo cùng quy tắc; test riêng cho hai lần gieo liền nhau và lần gieo sau một nước duy nhất.
- Test bằng game mẫu mới `roll-choose` (engine `test-fixtures`: gieo rồi chọn giữa nước "an toàn" và nước "tham" mà đối thủ trừng phạt được sau lần gieo của họ): mức Dễ chọn nước tham, mức Vừa chọn nước an toàn.
- Phương án đã cân nhắc: tăng độ sâu tối thiểu theo game (`LEVEL_PROFILES` riêng) — mức là chung cho mọi game; đổi đơn vị độ sâu thành "lượt" — cần game khai báo lượt, rộng hơn mức cần.

### 7. Game mẫu cho test của app

- `dice-race` nằm ở `packages/engine/src/test-fixtures/`, mà `@board-games/engine` chỉ export `.` và `./testing` → app không nhập được. Quyết định: export `diceRaceGame`, `diceRaceAiGame` và `rollChooseGame` (kèm kiểu) qua `@board-games/engine/testing` (điểm vào chỉ dành cho test, đã nhập Vitest). `knip` coi export của điểm vào package là công khai nên không báo export thừa ở đây; vì vậy chỉ export cái test của app dùng (`diceRaceRules` không export). ESLint chặn nhập `@board-games/engine/testing` ngoài file test (`**/*.test.*`, `src/test/**`, `packages/engine/src/testing/**`). Phương án đã cân nhắc: viết game mẫu riêng trong app — lặp code, hai game mẫu xúc xắc lệch nhau.

### 8. Test

- `play-setup`: `toStartUrl`/`readStartRequest` có và không có `players`, `players=abc`, game một số người không thêm tham số.
- `setup-preferences`: lựa chọn cũ không có `playerCount` → `min`; ngoài khoảng → `min`, phần khác giữ.
- `local-transport` với `dice-race` (2–4 người, có xúc xắc, có bản `supportsAI`): ván 3 người; "Ván mới" giữ số người; khôi phục 4 người; `start` với 5 người bị bỏ, ván đã lưu được tiếp tục; ghế theo "Tôi"/"Máy"/"Ngẫu nhiên" (rng giả ra đủ mọi ghế); ba ghế máy đi lần lượt tới lượt người; nhịp (đồng hồ giả: game có `outcomes` chờ `AI_SETTLE_DELAY_MS`, sau xúc xắc `AI_RESULT_DELAY_MS`, Tic-tac-toe 300 ms); hoàn tác dừng ngay sau lần gieo (cùng máy và đấu với máy), không bấm được khi phải qua lần gieo, tải lại sau hoàn tác vẫn đúng số đã gieo.
- Engine: `rollChooseGame` (Dễ khác Vừa), lần gieo bắt buộc không tốn độ sâu, hai lần gieo liền nhau thì lần sau tốn; test cũ của `choose-move`/`search` xanh.
- Component (`renderWithIntl`, `getByRole`): `SetupScreen` có/không có nhóm "Số người chơi", chọn bằng phím mũi tên, giữ khi đổi chế độ, "Tạo phòng" gửi `playerCount`; `PlayScreen` với ba ghế máy (mọi lời báo trong §3, kể cả máy đi rồi tới máy khác) và với một ghế máy (lời báo cũ); nhãn cụm hành động ("Máy đánh hàng 2, cột 3").
- Không có E2E mới: chưa game nào có số người thay đổi; E2E của Tic-tac-toe, Cờ caro chạy lại không sửa kỳ vọng. E2E đầy đủ ở `add-ludo-game`.

## Risks / Trade-offs

- **Tính năng chưa thấy được trên app tới change sau** → test đơn vị và component phủ đủ scenario bằng game mẫu và prop `players`; change này và `add-ludo-game` deploy cùng mốc.
- **Ba máy đi liền nhau trên điện thoại chậm** (Khó: tối đa ~1,5 s mỗi nước, mỗi lượt Cờ cá ngựa có hai nước) → chấp nhận ở M6; nếu khó chịu thì giảm giới hạn thời gian khi nhiều máy (change sau, không nới spec).
- **Hoàn tác gần như không dùng được khi đấu với máy ở game có xúc xắc**: chỉ bấm được trong khoảng `AI_SETTLE_DELAY_MS` (~500 ms) từ nước của người chơi tới khi máy gieo; sau đó lần gieo của máy chặn hoàn tác → chấp nhận, đúng thiết kế: đó là cái giá của "không bao giờ gieo lại"; cùng máy vẫn chọn lại được ngựa.
- **Đổi cách đếm độ sâu ảnh hưởng mọi game có xúc xắc** → chỉ nút "một nước, ngẫu nhiên"; game hiện có không có nút đó ngoài `dice-race` (fixture).
- **Đổi chữ trong câu `Play.*` và `Games.*.move`** có thể lệch giữa ba ngôn ngữ → test hiện có của `PlayScreen` (chữ hiện ra) và `messages.test.ts` (đủ khoá, cùng tham số).

## Migration Plan

- Lựa chọn nhớ cũ (không có `playerCount`) đọc được, số người lấy mặc định.
- Ván đã lưu không đổi định dạng; ván đấu với máy cũ có đúng hai ghế, vẫn khôi phục được.
- Không đổi giao thức; phòng online cũ không bị ảnh hưởng.
- Deploy trước `add-ludo-game` (cùng PR mốc M6 hoặc PR riêng, `pnpm check` xanh ở mỗi bước).

## Open Questions

(không có)
