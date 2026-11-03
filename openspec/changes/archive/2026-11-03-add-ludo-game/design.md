# Design

## Context

- Engine: `GameDefinition.outcomes(state, move)` khai báo kết quả ngẫu nhiên có trọng số; `playMove(…, rng)` rút kết quả và chốt vào nước (`HistoryEntry.outcome`), `applyEntry`/`fromRecord` phát lại không gieo lại. Server online đã rút kết quả bằng rng của server (`room-service.move` → `playMove(game, session, move, rng)`), client chỉ gửi nước. `chooseMove` là minimax góc nhìn ghế máy (mọi ghế khác cực tiểu, nên chạy được với N người) + expectimax ở nút ngẫu nhiên, đào sâu dần; một nước duy nhất thì trả ngay. Game mẫu `dice-race` chứng minh mô hình "nước gieo".
- Sau `add-multiplayer-setup`: màn hình bắt đầu ván có "Số người chơi" (theo `meta.players`), transport cục bộ tạo ván N người, đấu với máy là một người + N−1 máy, lời báo nêu tên ghế khi nhiều máy, nước máy sau một kết quả ngẫu nhiên chờ `AI_RESULT_DELAY_MS` (800 ms), hoàn tác không gieo lại, `usePlayerLabel(player, state)`, `useMoveLabel` trả cụm hành động; `createRoom` gửi `playerCount`.
- App: `PlayScreen` có đúng một `role="status"`; bàn nhận `{ state, legalMoves, onMove, disabled, result, lastEntry, viewer }`. Bàn Cờ caro: lưới nút phủ trên SVG, gợi ý là `<p aria-live="polite">`. Màu chỉ qua token (`packages/ui/src/styles.css`).
- Menu: `PLANNED_GAMES` có `ludo` (2–4 người, 20 phút, "Sắp có").
- Yêu cầu hành vi: `specs/ludo` (mới), delta `game-menu`.

## Goals / Non-Goals

**Goals:**

- Luật thuần, tất định, đúng bộ luật người dùng chốt; mỗi điểm luật có test riêng; mọi ván tự chơi kết thúc.
- Thêm game không sửa `features/`, `transport/`, `server/`, engine (chỉ token màu ghế trong `packages/ui`).
- Bàn dùng được trên điện thoại 360 px, bằng bàn phím và trình đọc màn hình, không dựa vào màu.

**Non-Goals:**

- Ghế máy online, phòng có máy, hiện lần lượt nhiều nước (change `add-room-ai-seats`).
- Giao diện chọn biến thể (v1), trang luật (M8), âm thanh, xoay bàn.

## Đã chốt với người dùng (03/11/2026)

Bộ luật (phần chung của idea.md §3.4, cột "phổ biến" ở những điểm người dùng không đổi):

- 2–4 người, mỗi người 4 ngựa cùng màu, xuất phát từ chuồng ở một góc; mọi ngựa chạy một vòng đường chung cùng chiều rồi lên chuồng đích (bậc 1–6) ở giữa.
- Mỗi lượt gieo **một** xúc xắc rồi chọn một ngựa để đi; không ngựa nào đi được thì mất lượt. Đi đúng vào ô có ngựa đối thủ thì đá ngựa đó về chuồng.
- Gieo **6** được gieo thêm. **Không** được vượt qua ngựa nào đứng chắn trên đường (của mình hay đối thủ). Hai ngựa của mình **không** đứng chung ô. Ra quân mà ô xuất phát có ngựa đối thủ thì ngựa đó **bị đá**.
- (1) Ngựa chỉ ra khỏi chuồng khi gieo **6**.
- (2) **Gieo 1 bắt buộc nhảy**: ngựa nhảy tới ô **chân chuồng** kế tiếp phía trước. Có 4 ô chân chuồng, mỗi màu một ô: ô của đường chung ngay trước lối lên chuồng đích của màu đó. Chỉ nhảy khi không ngựa nào đứng ở giữa; bị chắn thì ngựa chỉ đi 1 ô.
- (3) Từ **chân chuồng của mình**, gieo k thì lên thẳng bậc k; sau đó lên từng bậc: ở bậc n phải gieo đúng n+1 mới lên bậc n+1. Ngựa không đi quá chân chuồng của mình (không chạy vòng hai; nước đi quá là không hợp lệ).
- (4) **Thắng**: người đầu tiên có 4 ngựa ở các bậc 3, 4, 5, 6.
- (5) Biến thể luật **không hiện trên giao diện** ở M6 (chọn biến thể là v1); vẫn mô hình các điểm biến thể trong `LudoOptions` có test, mặc định đúng bộ luật trên, **không** khai báo `optionChoices`; được phép rút gọn nếu mô hình hết là thừa (§3). (Review thiết kế) Ở M6 luật **chỉ nhận bộ mặc định** từ bên ngoài; biến thể chỉ chạy qua một định nghĩa dành cho test (§3).
- (Review thiết kế, xác nhận giả định) **G2**: nhảy khi gieo 1 tới chân chuồng có ngựa đối thủ thì **đá** ngựa đó. **G8**: trong chuồng đích **không được vượt** (lên bậc k từ chân chuồng cần các bậc 1…k trống). **G9**: gieo 6 mà không ngựa nào đi được **vẫn được gieo thêm** (và được báo như vậy, không báo "mất lượt").
- (6) Phòng online 2–4 ghế, ghế trống do server chơi thay (change `add-room-ai-seats`).

Những điểm luật chưa nói rõ, quyết định ở đây **theo giả định** (đọc nhất quán với luật nền "không vượt, không đứng chung, đáp đúng ô đối thủ thì đá"); G2, G8, G9 người dùng đã xác nhận ở review, các điểm còn lại giữ như bảng:

| #   | Trường hợp                                                             | Quyết định                                                                                                                                                |
| --- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Nhảy khi gieo 1: ô chân chuồng đích có **ngựa mình**                   | Không nhảy được (không đứng chung ô) → đi 1 ô nếu được                                                                                                    |
| G2  | Ô chân chuồng đích có **ngựa đối thủ**                                 | Nhảy tới và **đá** ngựa đó, như một lần đáp thường (đã chốt)                                                                                              |
| G3  | Chân chuồng kế tiếp nằm **sau** chân chuồng của chính ngựa             | Không xảy ra: chân chuồng của chính ngựa là ô cuối của vòng nó đi, nên luôn là chân chuồng xa nhất; ngựa nhảy tới đó thì dừng ở chân chuồng, chưa lên bậc |
| G4  | Ngựa **đứng ngay trên** một ô chân chuồng (không phải của mình) gieo 1 | Nhảy tới chân chuồng **sau đó** (cách 14 ô)                                                                                                               |
| G5  | Ngựa đang ở chân chuồng của mình gieo 1                                | Lên bậc 1 (điểm 3), không nhảy                                                                                                                            |
| G6  | Ván 2–3 người: chân chuồng của màu không có người chơi                 | Vẫn là chân chuồng (là ô của bàn, không phụ thuộc người ngồi)                                                                                             |
| G7  | "Bắt buộc"                                                             | Nhảy được thì ngựa đó **chỉ** có nước nhảy; người chơi vẫn chọn ngựa nào đi                                                                               |
| G8  | Lên chuồng đích từ chân chuồng với k                                   | Các bậc 1…k phải trống (không vượt, không đứng chung trong chuồng đích); ngựa trong chuồng đích không bị đá (đã chốt)                                     |
| G9  | Gieo 6 mà không ngựa nào đi được                                       | Vẫn được gieo thêm (mất phần đi, không mất lần gieo thêm) (đã chốt)                                                                                       |
| G10 | Ván 2 người                                                            | Hai màu ở hai góc đối diện (Đỏ và Vàng)                                                                                                                   |
| G11 | Ai đi trước                                                            | Ghế đầu (theo "Ai đi trước" của màn hình bắt đầu ván); không tranh lượt bằng xúc xắc                                                                      |
| G12 | Một người thắng                                                        | Ván kết thúc ngay, không xếp hạng nhì/ba/tư                                                                                                               |

## Decisions

### 1. Hình học bàn và cách đánh số

- Đường chung: 56 ô đánh số tuyệt đối `0…55` theo chiều đi (chiều kim đồng hồ trên màn hình). Màu `c ∈ {0,1,2,3}` = Đỏ (trên), Xanh dương (phải), Vàng (dưới), Xanh lá (trái), theo chiều đi. Ô xuất phát của màu `c` là ô tuyệt đối `14c`.
- Vị trí một ngựa là **tiến độ** của nó (`progress`), tính từ ô xuất phát của màu nó:
  - `-1`: trong chuồng;
  - `0…55`: trên đường chung, ô tuyệt đối `(14c + progress) mod 56`; `55` là **chân chuồng của chính nó** (ô ngay trước ô xuất phát của màu nó);
  - `56…61`: bậc `1…6` của chuồng đích (`progress − 55`).
- Bốn ô chân chuồng, nhìn từ bất kỳ ngựa nào, ở tiến độ `13, 27, 41, 55` (vì ô xuất phát các màu cách nhau 14 ô): **chân chuồng kế tiếp** của ngựa ở tiến độ `p` là số nhỏ nhất trong tập đó lớn hơn `p` — luôn ≤ 55, nên G3 tự đúng.
- Lưới vẽ 15×15 (`board-layout.ts`, chỉ ở app): ba cột giữa mỗi nhánh của chữ thập; mỗi nhánh có 6 ô cột ngoài + 6 ô cột trong + ô đầu nhánh (chân chuồng của màu nhánh đó, ngay trước ô xuất phát) + một ô nối góc = 14 ô; cột giữa nhánh là 6 bậc chuồng đích (bậc 6 sát tâm); chuồng của mỗi màu ở góc kề ô xuất phát của nó. Ví dụ nhánh trên (hàng 0–5, cột 6–8): lên theo cột 6, đầu nhánh `(0,7)` là chân chuồng của Đỏ, ô xuất phát của Đỏ `(0,8)`, xuống theo cột 8, nối góc `(5,9)` sang nhánh phải; bậc 1–6 của Đỏ là `(1,7)…(6,7)`. Hình vẽ tự làm: đường kẻ phẳng, token màu, ký hiệu hình học; không theo bàn thương mại nào.

### 2. Lượt chơi ánh xạ vào engine

```ts
type LudoMove = { readonly type: "roll" } | { readonly type: "move"; readonly horse: number }; // 0–3
type LudoOutcome = 1 | 2 | 3 | 4 | 5 | 6; // chỉ nước "roll" có kết quả, trọng số đều
interface LudoState {
  readonly options: LudoOptions; // máy (Worker) chỉ nhận state
  readonly colours: readonly LudoColour[]; // màu của từng ghế: 2 → [0,2], 3 → [0,1,2], 4 → [0,1,2,3]
  readonly horses: readonly (readonly number[])[]; // [ghế][ngựa] = progress (§1)
  readonly toMove: PlayerIndex;
  readonly die: LudoOutcome | null; // số vừa gieo khi đang chọn ngựa; null = đang chờ gieo
  readonly last: LudoEvent | null; // việc nước vừa đi làm: cho nhãn nước đi và hiệu ứng
  readonly winner: PlayerIndex | null;
  readonly ply: number; // (lúc apply) số nước đã đi, kể cả gieo: bàn phân biệt nước mới với hoàn tác
  readonly kicks: readonly number[]; // (lúc apply, sau review) số ngựa mỗi ghế đã đá về chuồng, cho máy
}
type LudoEvent =
  | { kind: "roll"; player; face; lost: boolean; again: boolean }
  | {
      kind: "move";
      player;
      horse;
      face: LudoOutcome; // số đã gieo cho nước này: xúc xắc trên bàn giữ số đó
      from: number;
      to: number;
      kicked: { player; horse; from: number } | null;
      again: boolean;
    };
```

- **Hai nước mỗi lượt**: chờ gieo (`die === null`) thì `legalMoves = [{ type: "roll" }]`, `outcomes` = 6 mặt trọng số 1; sau khi gieo, `legalMoves` = một nước `move` cho mỗi ngựa đi được (đích tính bởi `moves.ts`, §4), `outcomes` rỗng.
- **Mất lượt nằm trong nước gieo**: `applyMove(roll, face)` thấy không ngựa nào đi được thì chuyển lượt ngay (`last.lost = true`), không có nước "bỏ lượt". Nhờ vậy mọi trạng thái chưa kết thúc luôn có nước đi (kiểm tra hợp đồng `result-matches-moves`).
- **Gieo thêm**: sau nước gieo không đi được hoặc nước đi ngựa, nếu `face === 6` (và tuỳ chọn cho phép) thì `toMove` giữ nguyên, `die = null`, `last.again = true`. Gieo 6 không đi được có `last.lost = false, again = true` (G9): nhãn và gợi ý nói "không đi được, được gieo thêm", không nói "mất lượt"; `lost = true` chỉ khi lượt thật sự chuyển.
- `moveKey`: `"roll"` / `"horse:<n>"` (rẻ hơn JSON khi phát lại biên bản dài).
- (Lúc apply) Sự kiện `move` mang thêm `face`: sau nước đi ngựa, bàn vẫn hiện số vừa gieo với màu người gieo mà không phải lần ngược biên bản; `horse` khai báo `number` (0–3) cho gọn kiểu, luật chỉ sinh 0–3.
- **Online**: client gửi nước `roll` không mang số; server rút kết quả bằng rng của nó trong `playMove` và ghi vào biên bản; client dựng lại bằng `fromRecord` — client không biết trước và không chọn được số (bất biến "xúc xắc do server tạo"). Không đổi giao thức hay server.
- Phương án đã cân nhắc:
  - Một nước mỗi lượt, kết quả là số gieo: người chơi phải chọn ngựa **trước** khi biết số — sai luật.
  - Số gieo do client gửi kèm nước: phá bất biến server là trọng tài.
  - Gieo sẵn cho lượt sau ở cuối nước đi: luật không được tự gọi rng; kết quả chỉ đến qua `outcomes` của một nước.
  - Nước "bỏ lượt" riêng khi không đi được: thêm một lần bấm, một mục biên bản và một lần ghi Redis mỗi lần mất lượt — bỏ.
  - Tự đi khi chỉ có một ngựa đi được: bớt bấm và bớt mục biên bản, nhưng người chơi mất cảm giác tự đi và khó theo dõi; để sau khi chơi thử (Ngoài phạm vi).

### 3. Tuỳ chọn luật (`options.ts`)

```ts
interface LudoOptions {
  readonly exitRoll: "six" | "one-or-six"; // idea.md §3.4 điểm 2
  readonly extraRoll: "six" | "none"; // điểm 3
  readonly passing: "blocked" | "free"; // điểm 4
  readonly oneJump: boolean; // luật riêng (2): gieo 1 nhảy tới chân chuồng kế tiếp
}
const LUDO_DEFAULT_OPTIONS = {
  exitRoll: "six",
  extraRoll: "six",
  passing: "blocked",
  oneJump: true,
};
```

- **Ở M6 chỉ nhận bộ mặc định** (quyết định sau review): `parseLudoOptions` nhận object thuần mà mọi khoá có mặt đều đúng giá trị mặc định (khoá thiếu → mặc định); khoá lạ, giá trị khác mặc định, không phải object → `null` (`invalid-options`). Nhờ vậy `?options=` trên đường dẫn, `create.options` hay biên bản sửa tay không chạy được luật ẩn mà người dùng chưa chốt và giao diện không ghi ra. **Không** có `optionChoices` → `listOptionChoices` trả `[]`, không có nhóm luật ở màn hình bắt đầu ván, `summary` là `null` (không có nhãn luật ở màn hình chơi, menu, sảnh chờ).
- **Biến thể chỉ cho test**: `ludo/test-variants.ts` (không export từ `packages/games/src/index.ts`) định nghĩa `ludoVariantRules = { ...ludo, parseOptions: parseAnyLudoOptions }` — cùng cách `diceRaceRules`/`diceRaceGame` của engine. Test của từng biến thể và bộ kiểm tra hợp đồng với tuỳ chọn đổi chạy qua định nghĩa này. Khi v1 cho chọn biến thể, chỉ cần đổi `parseOptions` và thêm `optionChoices`.
- Hành vi biến thể (chỉ ở design và test, không ở spec vì app không chạy được): `one-or-six` ra quân khi gieo 1 hoặc 6 (luật nhảy của ngựa trên đường giữ nguyên, người chơi chọn); `extraRoll: "none"` gieo 6 cũng chuyển lượt; `passing: "free"` vượt được ngựa trên đường và trong chuồng đích, vẫn không dừng ở ô/bậc có ngựa mình, luật nhảy vẫn đòi đường trống; `oneJump: false` gieo 1 đi 1 ô.
- **Chỉ mô hình bốn điểm**: ba điểm plan.md §6.3 định cho chủ phòng chọn ở v1 và rẻ để tách (ra quân, gieo thêm, vượt ngựa), cộng luật riêng dễ gây tranh cãi nhất (nhảy khi gieo 1). Mỗi điểm là một nhánh `if` trong `moves.ts`/`rules.ts` với test riêng.
- **Không mô hình** (cố định trong luật, ghi trong `constants.ts`): số xúc xắc (2 con đổi cả kiểu kết quả và nước đi), "rào" hai ngựa (đổi luật đứng chung và vượt), ô xuất phát an toàn, lên chuồng không chia bậc và thắng không tính bậc (gắn chặt với luật riêng (3), (4) của người dùng; điểm 7 của v1 sẽ cần thiết kế lại cùng nhau). Lý do: người dùng quan tâm bộ luật trên; mô hình hết tám điểm là viết và test luật chưa ai chơi.
- Phương án đã cân nhắc: không có `LudoOptions` (luật cứng) — bỏ, vì plan.md M6 đòi mỗi điểm là một tuỳ chọn và v1 sẽ cần; khai báo `optionChoices` — bỏ, người dùng chốt không hiện ở M6; `parseOptions` nhận mọi biến thể (bản trước) — bỏ sau review: chạy được luật ẩn qua đường dẫn hay tạo phòng.

### 4. Tính nước đi (`moves.ts`, hàm thuần)

`targetOf(state, seat, horse, face, occupancy?) → progress | null` (lúc apply: `occupancy` là bảng ngựa theo ô tuyệt đối, dựng một lần cho cả bốn ngựa; `kickedAt(state, seat, to)` trả ngựa đối thủ bị đá), với `at(p)` tra ngựa trên đường chung ở ô của tiến độ `p` (qua `occupancy`), `ownAt(p)` ô đó có ngựa mình không, `clearBetween(a, b)` các ô giữa trống không và `stepTaken(k)` bậc `k` trong chuồng đích của ghế có ngựa không:

1. **Trong chuồng** (`-1`): chỉ khi `face` là số ra quân (6; hoặc 1 với `one-or-six`); đích `0`; ô xuất phát có ngựa mình → `null`; có ngựa đối thủ → đá.
2. **Trên đường, trước chân chuồng của mình** (`0…54`):
   - `face === 1` và `oneJump`: `q` = chân chuồng kế tiếp; mọi ô `p+1…q−1` trống (bất kể `passing`, luật nhảy tự đòi đường trống) và ô `q` không có ngựa mình → đích `q` (G1, G2, G4). Không thì rơi xuống bước thường với `face = 1`.
   - Bước thường: `t = p + face`; `t > 55` → `null` (không đi quá chân chuồng của mình); `passing = "blocked"` và có ngựa (bất kỳ màu) ở `p+1…t−1` → `null`; ô `t` có ngựa mình → `null`; còn lại → `t` (ngựa đối thủ ở `t` bị đá).
3. **Ở chân chuồng của mình** (`55`): đích bậc `face`; `passing = "blocked"` thì các bậc `1…face−1` phải trống; bậc `face` phải trống (G5, G8).
4. **Bậc n** (`56…60`, n = 1…5): chỉ khi `face === n + 1` và bậc `n+1` trống. Bậc 6: không đi.

Đá: chỉ trên đường chung (kể cả ô xuất phát khi ra quân), ngựa bị đá về `-1`. Thắng: bốn ngựa của ghế đều ≥ `58` (bậc 3) — không đứng chung bậc nên đúng là {3,4,5,6}.

Hệ quả (phát hiện lúc apply): với luật mặc định, **nước thắng luôn là nước hợp lệ duy nhất** của lượt đó. Ngựa cuối X phải tới bậc trống m khi ba ngựa kia ở {3…6} trừ m; X chỉ lên được từ chân chuồng (cần bậc 1…m−1 trống, nên m = 3) hoặc từ bậc m−1 (không thuộc ba bậc kia, nên m = 3); với số 3, ba ngựa ở bậc 4, 5, 6 không đi được. Vì vậy scenario "Máy chọn nước thắng" chỉ còn "máy đi nước thắng"; test thêm trường hợp có nước khác bằng biến thể `passing: "free"` (chỉ cho test). Cũng vì vậy thắng bằng số 6 (rồi không gieo thêm, G12) chỉ xảy ra với biến thể đó.

### 5. Ván luôn đi tiếp và kết thúc (phân tích bế tắc)

- **Không có trạng thái kẹt** (chưa xong mà hết nước): theo cấu trúc §2 — chờ gieo luôn có `roll`; nước gieo không có ngựa đi được thì chuyển lượt ngay.
- **Không ai bị đóng băng vĩnh viễn**: với mọi người chưa thắng, ở mọi thế, luôn có **một số chấm** cho họ đi được ít nhất một ngựa:
  - Mọi ngựa trong chuồng → gieo 6 ra quân (ô xuất phát không có ngựa mình vì không ngựa nào ngoài đường).
  - Có ngựa trên đường: xét ngựa **đi trước nhất** của người đó (tiến độ lớn nhất trong `0…55`). Nếu ở `p < 55`, mọi ngựa đứng giữa nó và chân chuồng của nó đều là của đối thủ. Gọi `d` là khoảng cách tới ngựa gần nhất phía trước (nếu có): `d = 1` → gieo 1, nhảy bị chắn nên đi 1 ô và đá; `2 ≤ d` hoặc không có ai → gieo 1 luôn đi được (nhảy nếu chân chuồng kế tiếp gần hơn ngựa chắn, không thì đi 1 ô vào ô trống); thêm nữa `d ≤ 6` → gieo `d` đá được. Nếu ở `p = 55`: xem chuồng đích.
  - Chuồng đích: nếu các ngựa trong đó chưa là một khối liền kết thúc ở bậc 6 thì có ngựa ở bậc n với bậc n+1 trống → gieo n+1. Nếu là khối liền tới bậc 6 với ≤ 3 ngựa thì bậc 1 trống → ngựa ở chân chuồng gieo 1 lên bậc 1 (hoặc gieo k ≤ số bậc trống liền từ dưới). Khối liền 4 ngựa = {3,4,5,6} = đã thắng.
  - Vì xác suất mỗi mặt là 1/6, mỗi người chưa thắng luôn có xác suất ≥ 1/6 đi được trong lượt mình; chuồng đích chỉ tiến (ngựa trong đó không bị đá, không lùi).
- **Kết thúc với xác suất 1**: lập luận trên loại bỏ bế tắc, nhưng chơi ngẫu nhiên có thể đá qua đá lại lâu. Không chứng minh chặt; kiểm bằng thực nghiệm và một thuộc tính:
  - Test thuộc tính: ở **mọi** trạng thái chờ gieo trong các ván tự chơi, có ít nhất một mặt 1–6 cho người đang đến lượt một nước đi ngựa (trừ khi người đó đã thắng).
  - **1000 ván tự chơi** (seed `1…1000`, chia đều 2/3/4 người, tuỳ chọn mặc định) đều kết thúc trong một giới hạn số nước (đặt sau khi đo, mục tiêu 4–5 lần độ dài lớn nhất đo được); thêm 100 ván cho mỗi biến thể đổi (qua `ludoVariantRules`). Con số 1000 nằm ở đây và trong test; spec chỉ nói "mọi ván tự chơi kết thúc".
  - **Vòng lặp chỉ trên state** (`ludo/self-play.ts`, chỉ cho test): `legalMoves` → `outcomes` → rút bằng `createRng(seed)` → `applyMove`, không dựng `Session` — `playRandomGame` chép mảng `entries`/`states` mỗi nước nên O(n²) theo độ dài ván. File riêng `termination.test.ts` với `timeout` khai báo rõ. **Ngân sách**: cả file ≤ 15 s trên máy phát triển (đo lúc apply, ghi vào đây cùng số nước trung bình/lớn nhất theo số người); vượt thì giảm số ván biến thể trước, không giảm 1000 ván mặc định.
  - Nếu có seed không kết thúc: điều tra trước (lỗi luật hay vòng lặp đá nhau), **không** tăng `maxPlies` hay thêm luật hoà khi chưa hỏi người dùng.
- Không thêm luật "hoà khi quá N nước": không có trong luật dân gian và không cần theo phân tích trên.
- **Số đo lúc apply** (máy phát triển, Windows, Node 24; `termination.test.ts`): 1000 ván mặc định (seed 1…1000, số người theo seed mod 3) đều có người thắng, không thế chờ gieo nào "kẹt". Chơi **ngẫu nhiên** (chọn ngựa bất kỳ) nên dài hơn ván thật: 2 người trung bình 414 nước (lớn nhất 676), 3 người 715 (1 573), 4 người 1 149 (2 104). Giới hạn `MAX_PLIES = 10 000` (khoảng 5 lần ván dài nhất). 1000 ván mất ~4,9 s, bốn nhóm biến thể × 100 ván 0,26–0,5 s mỗi nhóm; cả file ~6,6 s (ngân sách 15 s). Bộ kiểm tra hợp đồng (4 seed mặc định, 2 seed biến thể, × 2/3/4 người, `maxPlies` 6 000) ~1–2 s mỗi file.

### 6. Máy chơi Cờ cá ngựa (`ai.ts`)

- **Một thuật toán cho mọi mức và mọi số người**: `chooseMove` của engine. Ở lúc chờ gieo chỉ có một nước (`roll`) → trả ngay; ở lúc chọn ngựa có ≤ 4 nước. Cây: nút quyết định (≤ 4 nhánh) xen nút gieo (6 nhánh, expectimax). Mọi ghế khác cực tiểu điểm của ghế máy ("paranoid") — với 3–4 người hơi phòng thủ nhưng chạy đúng, không cần đổi engine.
- **`evaluate(state, seat)` = điểm(ghế) − trung bình điểm(các ghế khác)**, số nguyên (làm tròn), |giá trị| < 10^6. Trung bình chứ không phải "trừ người dẫn đầu": với 3–4 người, đá ngựa của người không dẫn đầu vẫn làm điểm tăng (với `max` thì bằng 0). Điểm một người = tổng theo ngựa (hằng số đặt tên, chỉnh khi chơi thử, ở `ai.ts`; tên tiếng Anh theo quy ước định danh):
  - trong chuồng 0; trên đường `ON_TRACK_BONUS (20) + progress`; ở chân chuồng của mình thêm `OWN_GATE_BONUS (10)`;
  - chuồng đích: bậc 1 và 2 chỉ hơn chân chuồng một chút (`LOW_STEP_VALUES`: 90, 95), bậc k ≥ 3 là `HIGH_STEP_BASE (150) + HIGH_STEP_EACH (10) × k` — đứng ở bậc 1–2 không được thưởng nhiều (đứng đó chặn ngựa khác lên chuồng, G8), lên thẳng bậc ≥ 3 và leo từ 2 lên 3 được thưởng lớn;
  - nguy hiểm: mỗi ngựa trên đường (kể cả ở chân chuồng của mình) bị trừ `giá trị × (số cách bị đá) / 6`, tối đa bằng giá trị, với các cách bị đá: (a) mỗi ngựa đối thủ đứng sau 1–6 ô trên đường đi của nó, đường giữa trống; (b) **ngựa đang đứng trên một ô chân chuồng** (tiến độ 13/27/41/55 nhìn từ ngựa đối thủ): mỗi ngựa đối thủ đứng sau tới 14 ô mà đường giữa trống (gieo 1 là nhảy tới và đá, G2); (c) đứng trên ô xuất phát của một màu còn ngựa trong chuồng (gieo 6 ra quân là đá);
  - (sau review) mỗi ngựa đối thủ một người đã đá về chuồng cộng `KICK_BONUS (130)` vào **điểm của chính người đó** (đếm bằng `state.kicks`). Lý do: "mình − trung bình người khác" chia thiệt hại của ngựa bị đá cho số đối thủ, nên ở ván 4 người máy Vừa/Khó cho ngựa ra chuồng thay vì đá ngựa đối thủ ở tiến độ 10–20 (ván 2 người thì đá). Thưởng cố định không bị chia, nên đá (≥ 130 + …) > lên chuồng (tối đa +125) > ra quân (+20) ở mọi số người; test 4 người với ngựa đối thủ ở tiến độ 10 và 20, và đá so với lên bậc 6;
  - thứ tự idea.md §3.1 (đá > lên chuồng > ra quân > an toàn > tiến) nổi lên từ trọng số; test cố định thứ tự đó ở các thế mẫu (scenario của spec, cả 2 và 4 người). Spec chỉ ràng buộc mức Vừa và Khó, qua scenario.
- **Độ sâu và lần gieo** (engine, `add-multiplayer-setup` §6): lần gieo bắt buộc ngay sau một nước quyết định không tốn độ sâu. **Mức**: Dễ (độ sâu 1: chấm thế ngay sau nước đi ngựa của mình, 40 % ngẫu nhiên); Vừa (độ sâu 2: nước của mình → lần gieo của người kế tiếp, kỳ vọng trên 6 số, không tốn độ sâu → nước đáp tốt nhất của người đó với từng số → chấm điểm; thấy được việc bị đá ngay lượt sau); Khó (đào sâu tới hết 1,5 s, cả 2, 3, 4 người). Thời gian và mức đã có ở app.
- **Phương án đã cân nhắc**:
  - Bộ "luật ưu tiên" riêng (if/else) cho Dễ/Vừa, expectimax cho Khó: hai đường code, server ở change sau phải chọn một; `evaluate` theo trọng số cho cùng thứ tự với một đường — bỏ.
  - Max-n cho 3–4 người: cần đổi engine (điểm theo vector); paranoid đủ cho MVP — để sau nếu mức Khó chơi dở khi nhiều người.
- **Máy online chơi thay** (change `add-room-ai-seats`) dùng đúng `chooseMove` ở mức Vừa trên server.
- (Lúc apply) Điểm từng người làm tròn trước khi lấy hiệu (ván hai người: hai góc nhìn đúng là hai số đối nhau), và `−0` đổi thành `0`. Chỉ ngựa gần nhất phía sau mới đe doạ (ngựa xa hơn bị nó chắn); ngựa đối thủ không tính là mối đe doạ nếu đi tới đó phải vượt chân chuồng của chính nó.
- **Số đo lúc apply** (máy phát triển): mức Dễ ~0,05 ms/nước, mức Vừa trung bình ~0,5 ms (lớn nhất 1,6 ms) ở 2, 3 và 4 người (khoảng 60 thế giữa ván mỗi số người); mức Khó dùng hết 1 500 ms và đạt **độ sâu ≥ 5** (đếm số lần duyệt lại gốc) ở cả 2 và 4 người — đo tay một lần (đặt giới hạn của test thành 1 500 ms; đo trước khi thêm `KICK_BONUS`, thưởng này chỉ cộng một số nên không đổi chi phí tìm kiếm); test thường chạy với đồng hồ thật 300 ms cho nhanh và kiểm trả lời trong giới hạn + 200 ms. E2E (bản build production, mức Dễ): một vòng máy từ lúc người chơi đi xong tới khi lại tới lượt — vòng dài nhất trong hai vòng mỗi test, qua hai lần chạy và hai cấu hình Playwright: 1 máy 0,8 s; 2 máy 1,8–5,4 s; 3 máy 2,9–5,9 s — gồm cả nhịp 500/800 ms mỗi nước; vòng dài lên khi máy gieo 6 rồi gieo thêm (mỗi lần gieo thêm ~1,3 s).
- Thế "Dễ và Vừa chọn khác nhau" (test): máy cầm Vàng gieo 4, ngựa 1 của Vàng đứng trước một ngựa Đỏ 2 ô, ngựa Đỏ khác đứng ở chân chuồng của Đỏ. Dễ chỉ chấm thế ngay sau nước của mình (ngựa 1 bị đe doạ dù đứng yên hay lên 4 ô) nên đi ngựa khác; Vừa xét lần gieo kế tiếp của Đỏ: gieo 6 thì Đỏ thà đưa ngựa ở chân chuồng lên bậc 6 hơn là đá, nên đưa ngựa 1 lên cách 6 ô an toàn hơn.

### 7. Kích thước ván và chi phí

- Mỗi lượt 1–3 nước (gieo, đi, gieo thêm). Ước tính trước khi đo: 2 người ~300–450 nước, 4 người ~600–900 nước; mỗi mục biên bản ~30–40 byte → biên bản 4 người ~35 KB. Dựng lại ván (`fromRecord`) phát lại từng nước với `legalMoves` ≤ 4 nước: vài ms; server làm việc này mỗi yêu cầu.
- Online (người với người): mỗi lần gieo và mỗi lần đi là một yêu cầu ghi (1 `HGET` + script 5 lệnh, design `add-online-rooms` §8): ~6 lệnh × ~700 nước ≈ 4.200 lệnh cho một ván 4 người, cộng tin tới instance khác. Gói 500 nghìn lệnh/tháng đủ ~80–100 ván 4 người; theo dõi tab Usage (plan.md §10 M4). Mỗi lần ghi phát cả phòng (~35 KB cuối ván) — dưới mọi giới hạn, giới hạn 16 KB chỉ áp cho thông điệp client gửi (nước gieo/đi chỉ vài chục byte).
- **Băng thông** (ước tính, ván 4 người toàn người, ~700 lần ghi, phòng lớn dần tới ~35 KB, trung bình ~18 KB):
  - server → client: 4 client × 700 × ~18 KB ≈ **50 MB/ván** (Vercel Hobby: Fast Data Transfer 100 GB/tháng — kiểm lại WebSocket có tính vào đó không);
  - Redis: mỗi lần ghi `HSET` ~18 KB + `PUBLISH` ~18 KB tới mỗi instance nghe phòng (~2) ≈ 54 KB × 700 ≈ **38 MB/ván**; so với hạn mức băng thông gói Free của Upstash (kiểm lại trên trang giá);
  - gửi phần nước mới thay vì cả phòng sẽ giảm ~20 lần; không làm ở M6 (đổi giao thức), xem lại nếu Usage cho thấy cần.
- **GB-giờ** (hạn mức dễ chạm nhất, plan.md §10 M3): kết nối WebSocket giữ instance sống. Một ván 20–40 phút với 4 client trên 1–2 instance × 2 GB ≈ **1–3 GB-giờ** nếu chỉ có ván đó (các phòng cùng lúc chia chung instance). 360 GB-giờ/tháng ≈ 120–360 ván Cờ cá ngựa nếu không chơi gì khác; client tạm ngắt khi tab ẩn/rảnh (đã có) giúp giảm. Theo dõi tab Usage sau khi bạn bè chơi.
- Ván 20–40 phút sẽ qua nhiều lần server cắt WebSocket (~5 phút): đã có tự nối lại; không cần gì mới.
- **Số đo lúc apply**: ván dài nhất trong 1000 ván tự chơi ngẫu nhiên (4 người, 2 104 nước) có biên bản JSON ~76 KB; `fromRecord` của nó 12–15 ms. Ván thật ngắn hơn nhiều (người và máy không chọn ngựa ngẫu nhiên), nên ước tính ~35 KB và phần băng thông ở trên vẫn là con số làm việc; trường hợp xấu nhất khoảng gấp đôi.

### 8. Bàn cờ (`apps/web/src/games/ludo/`)

- **Bố cục**: khối vuông `min(100%, 30rem)`, SVG `viewBox` 15×15 vẽ đường chung, ô xuất phát (viền màu), chân chuồng (dấu riêng), chuồng đích đánh số 1–6, bốn chuồng ở góc, ngựa. Bên dưới: khu xúc xắc (mặt xúc xắc SVG + chữ "Xúc xắc: 5" cho trình đọc màn hình, viền màu người gieo), nút "Gieo xúc xắc", nhóm "Chọn ngựa".
- **Không chỉ bằng màu**: token đặt theo **tên màu** `piece-red`, `piece-blue`, `piece-yellow`, `piece-green` (thêm vào `packages/ui/src/styles.css`, cả sáng và tối, tương phản ≥ 3:1 với nền; không đặt theo ghế vì ván 2 người ghế 1 là Vàng) **và** ký hiệu: Đỏ ●, Xanh dương ■, Vàng ▲, Xanh lá ◆ vẽ trong thân ngựa, ở ô xuất phát và chuồng của màu đó; tên màu trong mọi chữ.
- **Đi quân**:
  - Nút "Gieo xúc xắc" (`Button`) có khi `legalMoves` có `roll`; `aria-disabled` (không `disabled`) khi `disabled`, để tiêu điểm không rơi.
  - Sau khi gieo: `role="group"` "Chọn ngựa" gồm một nút mỗi nước hợp lệ, cao ≥ 44 px, tên "Ngựa 2: tới ô 17, đá ngựa Vàng" (cùng cụm với nhãn nước đi). Trỏ chuột hay đưa tiêu điểm vào nút thì ngựa đó có viền và ô đích hiện ngựa mờ. Bấm ngựa ngay trên bàn (con trỏ) cũng đi; ngựa trên SVG là `aria-hidden` vì nhóm nút đã là lối cho bàn phím và trình đọc màn hình.
  - Tiêu điểm: gieo bằng bàn phím → tiêu điểm tới lựa chọn ngựa đầu tiên; mất lượt → ở lại nút gieo; đi ngựa → về nút gieo (bấm được nếu được gieo thêm).
- **Đọc được**: danh sách `sr-only` "Vị trí các ngựa" theo màu ("Đỏ, ngựa 1: trong chuồng", "…: ô 17", "…: chân chuồng", "…: bậc 3"; ô tính từ ô xuất phát của ngựa đó, 1…56). Dòng gợi ý của bàn hiện mọi kết quả gieo, nhưng chỉ là vùng `aria-live="polite"` cho **lần gieo của người ở thiết bị này** (người đang đến lượt khi chơi cùng máy, `viewer` khi đấu với máy/online): "Đỏ gieo được 5. Chọn ngựa để đi." / "… Không ngựa nào đi được, mất lượt." / "Gieo được 6, không đi được, được gieo thêm." (G9). Lần gieo và nước đi của máy/đối thủ do `role="status"` của `PlayScreen` đọc, từng nước một (`add-multiplayer-setup` §3): mỗi việc chỉ được đọc một lần.
- **Đánh dấu**: ngựa vừa đi có viền dày; ngựa vừa bị đá có dấu ở chuồng; xúc xắc giữ số gieo gần nhất với màu người gieo.
- **Hiệu ứng** (`use-ludo-animation.ts`, **không** CSS Module): keyframes khai báo bằng `--animate-dice-roll`, `--animate-piece-kicked` trong `@theme` của `packages/ui/src/styles.css`, dùng bằng class `animate-dice-roll motion-reduce:animate-none`. Xúc xắc lăn ~450 ms (đổi mặt + xoay); ngựa đi **từng ô** dọc đường từ `last.from` tới `last.to` bằng hook đổi vị trí theo hẹn giờ (~50 ms/ô, tối đa 400 ms, nhảy 14 ô thì bỏ bớt ô trung gian); ngựa bị đá mờ đi rồi hiện ở chuồng (~300 ms). **Ràng buộc nhịp**: `LUDO_DICE_MS` (450) ≤ `AI_RESULT_DELAY_MS` (800) và `LUDO_WALK_MAX_MS` (400) ≤ `AI_SETTLE_DELAY_MS` (500) (`add-multiplayer-setup` §4; online cũng dùng hai hằng số đó để hiện lần lượt, `add-room-ai-seats` §4); test kiểm hai bất đẳng thức. Có cập nhật mới giữa chừng → kết thúc ngay hiệu ứng cũ rồi chạy cái mới. `prefers-reduced-motion: reduce` (`matchMedia`, theo dõi thay đổi; CSS `motion-reduce:`) → không hiệu ứng nào, hiện ngay kết quả. Hiệu ứng không khoá bàn: `disabled` vẫn do transport quyết định.
- **Token màu quân** (lúc apply; tương phản WCAG tính từ oklch): sáng — đỏ `oklch(0.55 0.2 27)` 5,37:1, xanh dương `oklch(0.5 0.17 258)` 6,14:1, vàng `oklch(0.62 0.13 80)` 3,70:1, xanh lá `oklch(0.55 0.15 150)` 4,54:1 với `surface` trắng (≥ 3,34:1 với `surface-muted`); tối — `oklch(0.68 0.19 25)` 5,63:1, `oklch(0.7 0.14 255)` 6,61:1, `oklch(0.84 0.15 90)` 10,8:1, `oklch(0.72 0.16 150)` 7,61:1 với `surface` tối.
- **Hiệu ứng lúc apply**: mọi khung hình của một hiệu ứng được hẹn giờ ngay khi nó bắt đầu (render chậm không kéo dài hiệu ứng); ngựa bị đá hiện dần ở chuồng (`LUDO_KICK_MS` 300) **cùng lúc** với ngựa đi, nên nước dài nhất vẫn là 400 ms ≤ `AI_SETTLE_DELAY_MS`; xúc xắc lăn đổi mặt 6 lần trong 450 ms. Nước có sẵn lúc mở bàn (tải lại) không chạy hiệu ứng. (Sau review) Hiệu ứng chỉ chạy khi `state.ply` **tăng**: hoàn tác (lùi về nước cũ) cắt hiệu ứng và hiện ngay thế cũ, không "gieo lại" hay cho ngựa đi lại; hai nước giống hệt nhau liền nhau vẫn là hai lần hiệu ứng. Gốc của bàn mang `data-ply` để E2E chờ đúng nước.
- (Sau review) Gợi ý "Chọn ngựa để đi." chỉ dành cho người đang chọn ở thiết bị này; lần gieo của máy/đối thủ hiện `hint.rolled` ("Vàng gieo được 4.").
- **Khu gợi ý** (`data-ludo-hint`): một `<p aria-live="polite">` luôn có mặt, chỉ chứa gợi ý khi lần gieo hay nước đi là của người ở thiết bị này; lần gieo của máy/đối thủ hiện ở một `<p>` thường bên cạnh (thấy được, không tự đọc). Nhãn xúc xắc nêu cả người gieo ("Xúc xắc: 4 (Xanh dương)"), trước lần gieo đầu là "Xúc xắc: chưa gieo".
- **Nhãn lựa chọn khi nhảy**: chân chuồng của màu khác chỉ là một ô với ngựa đang đi, nên nhảy tới đó đọc là "tới ô 14"; "tới chân chuồng" chỉ dành cho chân chuồng của chính ngựa (nơi nó lên chuồng). Danh sách vị trí đọc tương tự.
- **Tâm bàn**: bậc 6 của bốn màu nằm trong khối 3×3 ở giữa, nên chỉ ô tâm được tô bốn tam giác màu; bốn góc của khối để trống.
- **Điện thoại**: 360 px − 2×16 px lề = 328 px → ô ~21,8 px: không bắt người chơi chạm trúng ngựa nhỏ, nhóm nút "Chọn ngựa" và nút gieo là lối chính trên màn hình cảm ứng.
- **Nhãn**: `usePlayerLabel(player, state)` → tên màu của `state.colours[player]` ("Đỏ"). `useMoveLabel(move, state)` đọc `state.last`: "gieo được 5", "gieo được 3, mất lượt", "cho ngựa 1 ra chuồng", "đi ngựa 2 tới ô 17", "đi ngựa 2 tới chân chuồng", "đi ngựa 3 lên bậc 4", "gieo được 6, không đi được, được gieo thêm" (G9), kèm ", đá ngựa Vàng" khi có (ICU `select`).
- Phương án đã cân nhắc: lưới nút 15×15 như Cờ caro — 225 nút cho ≤ 4 lựa chọn, tên đọc được của ô không giúp gì cho Cờ cá ngựa; Canvas — không cần, SVG nhẹ.

### 9. Bản dịch (vi gốc; en, ja đủ khoá, cùng tham số)

Lúc apply, các khoá có nhánh theo loại được tách thành khoá con thay cho ICU `select` (bài kiểm tra bản dịch so tên tham số bằng biểu thức chính quy và đọc nhầm chữ đầu nhánh `select` là tham số), và gợi ý gộp kết quả gieo với việc tiếp theo:

| Khoá                                                   | vi                                                                                                                               | en                                                                                                                  | ja                                                                                                                     |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `Games.ludo.colours.red` / `blue` / `yellow` / `green` | Đỏ / Xanh dương / Vàng / Xanh lá                                                                                                 | Red / Blue / Yellow / Green                                                                                         | 赤 / 青 / 黄 / 緑                                                                                                      |
| `Games.ludo.roll`                                      | Gieo xúc xắc                                                                                                                     | Roll the die                                                                                                        | サイコロを振る                                                                                                         |
| `Games.ludo.die` / `dieEmpty`                          | Xúc xắc: {face} ({player}) / Xúc xắc: chưa gieo                                                                                  | Die: {face} ({player}) / Die: not rolled yet                                                                        | サイコロ：{face}（{player}） / サイコロ：まだ振っていません                                                            |
| `Games.ludo.hint.choose`                               | {player} gieo được {face}. Chọn ngựa để đi.                                                                                      | {player} rolled {face}. Choose a horse to move.                                                                     | {player}は{face}を出しました。動かす駒を選んでください。                                                               |
| `Games.ludo.hint.rolled`                               | {player} gieo được {face}.                                                                                                       | {player} rolled {face}.                                                                                             | {player}は{face}を出しました。                                                                                         |
| `Games.ludo.hint.lost`                                 | {player} gieo được {face}. Không ngựa nào đi được, mất lượt.                                                                     | {player} rolled {face}. No horse can move; turn lost.                                                               | {player}は{face}を出しました。動かせる駒がないため、手番を失います。                                                   |
| `Games.ludo.hint.noMoveAgain`                          | {player} gieo được 6, không đi được, được gieo thêm.                                                                             | {player} rolled 6. No horse can move; roll again.                                                                   | {player}は6を出しましたが動かせる駒がありません。もう一度振れます。                                                    |
| `Games.ludo.hint.again`                                | {player} được gieo thêm.                                                                                                         | {player} rolls again.                                                                                               | {player}はもう一度振れます。                                                                                           |
| `Games.ludo.chooseHorse` / `option`                    | Chọn ngựa / Ngựa {number}: {action}                                                                                              | Choose a horse / Horse {number}: {action}                                                                           | 駒を選ぶ / 駒{number}：{action}                                                                                        |
| `Games.ludo.target.out` / `gate` / `step` / `cell`     | ra chuồng / tới chân chuồng / lên bậc {step} / tới ô {cell}                                                                      | come out / to the home entry / up to home step {step} / to square {cell}                                            | 陣地から出す / ゴール入口へ / ゴールの{step}段目へ / {cell}マス目へ                                                    |
| `Games.ludo.kick` / `moveKick`                         | {action}, đá ngựa {colour}                                                                                                       | {action}, sending a {colour} horse home                                                                             | {action}、{colour}の駒を陣地に戻す / {action}。{colour}の駒を陣地に戻しました                                          |
| `Games.ludo.move.roll` / `lost` / `again`              | gieo được {face} / gieo được {face}, mất lượt / gieo được 6, không đi được, được gieo thêm                                       | rolled {face} / rolled {face} and lost the turn / rolled 6, could not move and rolls again                          | {face}を出しました / {face}を出し、手番を失いました / 6を出しましたが動かせず、もう一度振ります                        |
| `Games.ludo.move.out` / `gate` / `step` / `cell`       | cho ngựa {number} ra chuồng / đi ngựa {number} tới chân chuồng / đi ngựa {number} lên bậc {step} / đi ngựa {number} tới ô {cell} | brought horse {number} out / moved horse {number} to the home entry / … up to home step {step} / … to square {cell} | 駒{number}を陣地から出しました / …ゴール入口へ進めました / …ゴールの{step}段目へ進めました / …{cell}マス目へ進めました |
| `Games.ludo.positions` / `position`                    | Vị trí các ngựa / {colour}, ngựa {number}: {where}                                                                               | Horse positions / {colour}, horse {number}: {where}                                                                 | 駒の位置 / {colour}、駒{number}：{where}                                                                               |
| `Games.ludo.where.stable` / `gate` / `step` / `cell`   | trong chuồng / chân chuồng / bậc {step} / ô {cell}                                                                               | in the stable / on the home entry / home step {step} / square {cell}                                                | 陣地 / ゴール入口 / ゴールの{step}段目 / {cell}マス目                                                                  |
| `Games.ludo.justMoved` / `justKicked`                  | {position} (vừa đi) / {position} (vừa bị đá)                                                                                     | {position} (just moved) / {position} (just sent home)                                                               | {position}（今動いた駒） / {position}（今戻された駒）                                                                  |

Tên game giữ khoá có sẵn (`Cờ cá ngựa` / `Ludo` / `ルドー`). `messages.test.ts` kiểm en/ja đủ khoá và cùng tham số.

### 10. Đăng ký và menu

- `GAME_IDS = ["tictactoe", "caro", "ludo"]`, `GAMES` thêm `ludo`, `GAME_ENTRY_LOADERS.ludo`; bỏ `ludo` khỏi `PLANNED_GAMES`. `meta = { players: { min: 2, max: 4 }, category: VnFolk, durationMinutes: 20, supportsAI: true }`.
- (Sau review, bundle) `packages/games` có thêm lối vào theo game `@board-games/games/tictactoe`, `/caro`, `/ludo`; UI của từng game (`apps/web/src/games/**`) chỉ import luật từ lối vào của game đó (ESLint chặn import giá trị từ gốc, trừ test), để chunk của Tic-tac-toe/Cờ caro không mang luật và máy Cờ cá ngựa và ngược lại. Server và Worker của máy vẫn dùng `GAMES`/`findGame` ở gốc.

### 11. Test

- **Luật** (`rules.test.ts`, `moves.test.ts`, thế dựng bằng `test-positions.ts` theo tiến độ, không qua `setup` + nhiều nước): mỗi requirement của `specs/ludo` một `describe`, mỗi scenario một test; trạng thái cũ không đổi; mọi giả định G1–G12 có test.
- **Tuỳ chọn**: `parseLudoOptions` chỉ nhận mặc định; biến thể qua `ludoVariantRules`, mỗi biến thể một nhóm test (§3).
- **Hợp đồng**: `describeGameContract(ludo, { seeds, maxPlies, playerCounts: [2,3,4] })` với tuỳ chọn mặc định, và `describeGameContract(ludoVariantRules, { options: <bốn tuỳ chọn đổi>, … })`; đo thời gian, chỉnh `seeds`/`timeout`.
- **Kết thúc**: `termination.test.ts` (file riêng, vòng lặp chỉ trên state, `timeout` rõ) — 1000 ván (§5), thuộc tính "không ai bị kẹt", số đo ghi vào §5/§7.
- **AI** (`ai.test.ts`): `evaluate` nguyên, đối xứng giữa hai ghế ở thế đối xứng, |giá trị| < 10^6; đá ngựa của người không dẫn đầu làm điểm tăng (4 người); ngựa trên một chân chuồng có ngựa đối thủ đứng sau 9 ô, đường trống, bị trừ điểm; bậc 1–2 kém xa bậc 3; mức Dễ và Vừa chọn khác nhau ở một thế có nguy cơ bị đá lượt sau; các scenario của "Máy chơi Cờ cá ngựa" với rng cố định và đồng hồ giả; mức Khó 4 người với đồng hồ thật trả về trong giới hạn + 200 ms.
- **App**: `player-label`, `move-label` (mọi loại nước, ba ngôn ngữ qua `renderWithIntl`); `Board` (component, `getByRole`): nút gieo, nhóm chọn ngựa đúng nước hợp lệ, tên lựa chọn, ô đích khi tiêu điểm, tiêu điểm sau gieo/đi/mất lượt, danh sách vị trí, gợi ý `aria-live` chỉ cho lần gieo của người ở thiết bị này (không đọc trùng với `role="status"`), gieo 6 không đi được báo "được gieo thêm", giảm chuyển động (`matchMedia` giả: không lớp hiệu ứng), hiệu ứng bị cắt khi có cập nhật mới (đồng hồ giả); `PlayScreen` với Cờ cá ngựa có đúng một `role="status"`.
- **E2E** (`play-ludo.spec.ts`): smoke tham số hoá n ∈ {2, 3, 4} × {cùng máy, đấu với máy}, thế dựng sẵn cho luật nhảy, 360 px, online hai người; xem tasks §5.

## Risks / Trade-offs

- **Giả định G1, G3–G7, G10–G12 sai với ý người dùng** (G2, G8, G9 đã chốt) → bảng ở trên, mỗi giả định một test; đổi chỉ chạm `moves.ts` và test tương ứng.
- **Code biến thể không chạy được trong app** → chỉ là các nhánh nhỏ có test qua `ludoVariantRules`; giữ để v1 chỉ đổi `parseOptions`.
- **Ván ngẫu nhiên quá dài** (đá qua đá lại) làm test hợp đồng chậm → đo ở task 1.x, chia seed; nếu ván dài bất thường thì điều tra luật trước.
- **Mức Khó 3–4 người "paranoid" chơi quá phòng thủ** → chấp nhận ở M6, ghi nhận khi chơi thử; max-n là change sau.
- **Ô 21,8 px trên điện thoại** → nhóm nút lớn bên dưới là lối chính; E2E khung 360 px.
- **Nhiều nước, nhiều lệnh Redis khi online** (§7) → theo dõi Usage; tự đi khi chỉ một ngựa đi được là cách giảm nếu cần.
- **E2E phụ thuộc xúc xắc thật** (`cryptoRng`) → E2E chỉ kiểm điều đúng với mọi số gieo; luật cụ thể kiểm bằng thế dựng sẵn qua `writeSaved` (biên bản có kết quả đã chốt).

## Migration Plan

- Game mới: không có dữ liệu cũ. Lựa chọn nhớ, ván đã lưu và phòng của game khác không đổi.
- Deploy sau `add-multiplayer-setup`; `add-room-ai-seats` sau change này.

## Open Questions

(không có — G2, G8, G9 đã được xác nhận; các giả định còn lại giữ như bảng)
