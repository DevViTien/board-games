# Design

## Context

- Engine (`openspec/specs/game-engine/spec.md`, `packages/engine/src`) đã có hợp đồng `GameDefinition` với `evaluate?(state, player)`, `outcomes?(state, move)` có trọng số, `meta.supportsAI`, kiểu `Result` có mã lỗi, `Rng`, và bộ kiểm tra hợp đồng đã bắt buộc `supportsAI ⇒ evaluate`. Hợp đồng chưa nói gì về thang điểm của `evaluate`.
- Tic-tac-toe (`packages/games/src/tictactoe/rules.ts`) chưa có `evaluate` và khai báo `supportsAI: false`.
- AI sẽ chạy trong Web Worker (change `add-play-vs-ai`) và có thể cả trên server (ghế trống cho máy chơi thay ở M6), nên phải là hàm thuần trên dữ liệu thuần, như luật.
- Game sắp tới: caro (M5, bàn 15×15/19×19, có AI), cá ngựa (M6, xúc xắc, 2–4 người, AI luật ưu tiên), cờ vua (M7, không có AI).
- Yêu cầu hành vi: `specs/game-ai/spec.md`, `specs/tictactoe/spec.md`.

## Goals / Non-Goals

**Goals:**

- Một hàm `chooseMove` chung; game chỉ cần `evaluate` và `supportsAI: true`.
- Ba mức độ định nghĩa một lần cho mọi game, không phụ thuộc tốc độ máy ở phần đảm bảo tối thiểu.
- Test tất định: không phụ thuộc thời gian thật hay `Math.random`.

**Non-Goals:**

- Tối ưu tốc độ cho bàn lớn (bảng băm vị trí, killer move, history heuristic, hook chọn nước ứng viên): thêm ở M5 khi đo được caro chậm.
- AI cho ván nhiều hơn hai người đúng nghĩa (max^n): M6 dùng `policy` theo luật ưu tiên. Thuật toán ở đây vẫn chạy được với N người theo kiểu "mọi đối thủ cùng chống mình" (paranoid), đủ để không lỗi.

## Decisions

### 1. API

```ts
const AI_LEVEL = { Easy: "easy", Medium: "medium", Hard: "hard" } as const;
type AiLevel = (typeof AI_LEVEL)[keyof typeof AI_LEVEL];

interface ChooseMoveOptions {
  readonly level: AiLevel;
  readonly rng: Rng;               // mọi lựa chọn ngẫu nhiên đi qua đây
  readonly now: () => number;      // mili giây; Worker truyền () => performance.now(), test truyền đồng hồ giả
  readonly timeLimitMs: number;    // ngân sách cho một nước
}

chooseMove(game, state, options): Result<Move>
```

- Trả `Result` như mọi API engine: `game-over` khi ván đã kết thúc, `ai-not-supported` (mã mới trong `ENGINE_ERROR`) khi `!game.meta.supportsAI || game.evaluate === undefined`.
- Nhận `State` chứ không nhận `Session`: AI không cần lịch sử, và Worker chỉ phải gửi trạng thái hiện tại. `State` từ transport của app là dữ liệu tin cậy (do engine dựng).
- Trả về chính phần tử trong `legalMoves(state)`, nên nơi gọi có thể đưa thẳng vào `playMove`.
- Tuỳ chọn đi qua ranh giới Worker dưới dạng dữ liệu thuần nên kiểu TypeScript không bảo vệ được: mức độ lạ, `timeLimitMs` không phải số hữu hạn ≥ 0 (`NaN`, `Infinity`, số âm sẽ làm mất hạn chót), hay đồng hồ đọc ra số không hữu hạn → ném `RangeError`. Đây là lỗi của nơi gọi, không phải trạng thái ván, nên ném như cách `session` ném khi trọng số `outcomes` sai; mã lỗi `Result` chỉ dành cho trạng thái ván (`game-over`, `ai-not-supported`).
- Worker phải truyền `() => performance.now()` chứ không truyền thẳng `performance.now`: phương thức tách khỏi `performance` ném "Illegal invocation" khi gọi.
- _Đã cân nhắc_: `Promise` hoặc generator để nhả CPU giữa chừng — không cần vì chạy trong Worker; `Date.now()` bên trong — vi phạm bất biến hàm thuần và làm test phụ thuộc thời gian thật.

### 2. Tìm kiếm: minimax góc nhìn ghế của máy, alpha-beta, expectimax, đào sâu dần

- Giá trị luôn tính theo góc nhìn ghế máy (`aiSeat = currentPlayer(state)` lúc gọi): nút của ghế máy lấy lớn nhất, nút của ghế khác lấy nhỏ nhất (với hai người chính là minimax; với N người là "paranoid"). Chọn cách này thay cho negamax vì `evaluate(state, player)` của engine đã nhận ghế làm tham số, không cần đổi dấu theo lượt, và vì nó chịu được một ghế đi nhiều lượt liền (cá ngựa gieo 6).
- **Thang điểm** (hằng số trong `ai/score.ts`):
  - `WIN = 1_000_000_000`. Ván kết thúc: máy thắng (có trong `winners`) → `WIN − ply`; thua → `−(WIN − ply)`; hoà → `0`. Trừ `ply` để thắng sớm được điểm cao hơn, thua muộn được điểm cao hơn.
  - Hết độ sâu: `evaluate(state, aiSeat)`, `NaN` coi là `0`, rồi kẹp vào `±EVAL_LIMIT` với `EVAL_LIMIT = 100_000_000` — kẹp để một hàm đánh giá viết ẩu không vượt được điểm thắng/thua thật.
  - Hợp đồng của `evaluate`, ghi ở chú thích trong `types.ts`: số hữu hạn, nên là số nguyên, trị tuyệt đối dưới `10^8`; AI coi mọi chênh lệch là thật, nên chênh lệch chỉ là nhiễu thì hàm đánh giá tự làm tròn.
  - Hai điểm chênh nhau dưới `TIE_EPSILON = 1e-6` được coi là ngang nhau. Ngưỡng này chỉ để nuốt sai số làm tròn: trung bình có trọng số ở nút ngẫu nhiên là số lẻ (một mặt trong sáu mặt xúc xắc được 5 → kỳ vọng 5/6), nên ngưỡng 1 sẽ coi một nước gieo tốt hơn hẳn là ngang với nước chắc chắn được 0 và lẫn nước kém hơn vào nhóm chọn ngẫu nhiên. Ở độ lớn `WIN` một bước làm tròn cỡ `10^-7`, nên vài bước vẫn dưới ngưỡng; ngưỡng phải lớn hơn 0 vì cửa sổ ở gốc cần phân biệt "bằng" với "kém hơn" (xem dưới). _Đã cân nhắc_: ngưỡng tương đối `10^-9·|best|` — ở độ lớn `WIN` nó thành 1 và coi thắng ở nước thứ 3 ngang thắng ở nước thứ 4. Hàm đánh giá caro thường dùng thang `10^6–10^7` vẫn nằm gọn trong khoảng này. Không thêm kiểm tra vào bộ kiểm tra hợp đồng: thang điểm sai chỉ làm AI chơi kém, không làm sai luật.
- Nước có `outcomes` không rỗng: giá trị là trung bình có trọng số của các nhánh con (expectimax). Trọng số được kiểm như khi chơi (`checkOutcomeWeights`, dùng chung với `session`): không phải số nguyên dương → ném `RangeError`, vì tổng trọng số 0 sẽ cho `NaN` và một nước điểm `NaN` lọt được vào nhóm ứng viên (mọi phép so sánh với `NaN` đều sai).
- Thế chưa kết thúc mà không có nước đi nào là vi phạm hợp đồng (bộ kiểm tra hợp đồng bắt ở `result-matches-moves`); gặp trong lúc tìm thì ném lỗi rõ ràng, thay vì cho điểm ±∞ làm nhóm ứng viên rỗng hoặc lái AI lặng lẽ. Bên trong nút ngẫu nhiên không cắt tỉa alpha-beta (gọi con với cửa sổ đầy đủ): đơn giản và đúng, đủ cho xúc xắc 6 mặt. Nút ngẫu nhiên không tính vào độ sâu (độ sâu đếm theo nước đi).
- **Gốc và các nước ngang điểm.** Alpha-beta chuẩn ở gốc (alpha = điểm tốt nhất đã biết) chỉ trả giá trị chính xác cho nước tốt hơn; nước còn lại chỉ có cận trên ≤ alpha. Ví dụ một nút MIN cắt ngay khi gặp nước đáp cho 0 ≤ alpha dù một nước đáp chưa xét cho −WIN. Nếu coi "giá trị trả về bằng điểm tốt nhất" là ngang điểm thì nước thua lọt vào nhóm được chọn ngẫu nhiên. Vì vậy mỗi nước gốc được tìm với cửa sổ `(best − TIE_EPSILON, +∞)`:
  - nước có giá trị `> best − TIE_EPSILON` nằm trong cửa sổ nên nhận giá trị chính xác và vào nhóm ứng viên;
  - nước khác trả cận trên `≤ best − TIE_EPSILON`, chắc chắn kém hơn, bị loại;
  - khi `best` tăng, lọc lại nhóm (mọi ứng viên đều có giá trị chính xác nên lọc được);
  - cuối vòng, nhóm ứng viên là đúng tập các nước có điểm trong khoảng `TIE_EPSILON` so với nước tốt nhất; chọn đều một nước bằng `rng`.
- Mọi chỗ lấy danh sách nước để tìm đi qua một hàm `searchMoves(game, state)` (hiện là `legalMoves`), để M5 thêm hook tuỳ chọn (chọn nước ứng viên, sắp thứ tự) chỉ bằng một chỗ sửa.
- **Đào sâu dần** từ độ sâu 1: mỗi vòng xét nhóm ứng viên của vòng trước trước tiên (theo thứ tự cố định) để alpha-beta cắt nhiều hơn. Dừng khi:
  - hết giờ, sau khi đã xong độ sâu tối thiểu của mức độ: vòng đang dở bị bỏ, dùng kết quả của vòng hoàn chỉnh gần nhất;
  - vòng vừa xong không chạm giới hạn độ sâu ở nhánh nào (đã tìm hết tới cuối ván) — không chờ hết giờ;
  - đạt độ sâu tối đa của mức độ.
- **Độ sâu tối thiểu** của mức độ (Dễ 1, Vừa 2, Khó 2) luôn chạy hết, không xét đồng hồ: luôn có nước đi kể cả khi đồng hồ báo hết giờ ngay từ đầu, và đảm bảo của mức Vừa/Khó (chớp thắng ngay, chặn thua ngay) không phụ thuộc máy nhanh hay chậm. Sau độ sâu tối thiểu, đồng hồ được xem ở mỗi nút, nên phần vượt giờ chỉ gồm phần tìm tối thiểu và một nút.
- _Đã cân nhắc_: xáo thứ tự nước gốc bằng `rng` rồi chỉ nhận nước tốt hơn hẳn — đúng về điểm, nhưng đào sâu dần đặt nước tốt nhất vòng trước lên đầu nên nhóm ngang điểm gần như luôn rơi về cùng một nước (Tic-tac-toe mở đầu luôn đi ô giữa vì vòng độ sâu 1 chọn ô giữa theo hàm đánh giá), mất tính "chọn ngẫu nhiên giữa các nước ngang nhau". Cửa sổ `best − TIE_EPSILON` cắt ở gốc kém hơn alpha-beta chuẩn một chút, chỉ ở gốc.

### 3. Ba mức độ

| Mức | Độ sâu tối thiểu | Độ sâu tối đa  | Cách chọn                                                                                                                           |
| --- | ---------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Khó | 2                | không giới hạn | Đào sâu dần tới khi hết giờ hoặc hết cây; không bao giờ yếu hơn Vừa                                                                 |
| Vừa | 2                | 2              | Nước của máy + nước đáp của đối thủ: thấy được thắng ngay và thua ngay, nên chớp thắng và chặn thua, nhưng không thấy bẫy hai nước  |
| Dễ  | 1                | 1              | Với xác suất 40% (theo `rng`) đi một nước hợp lệ ngẫu nhiên; còn lại tìm độ sâu 1: chớp thắng ngay, không tính nước đáp của đối thủ |

- Ở mọi mức, nếu nhiều nước gốc ngang điểm tốt nhất, chọn ngẫu nhiên giữa chúng bằng `rng` theo cách ở §2 (spec "Các nước tốt ngang nhau được chọn ngẫu nhiên").
- Mức Dễ ở độ sâu 1 vẫn dùng hàm đánh giá, mà hàm đánh giá Tic-tac-toe (§4) thưởng việc phá đường hai quân của đối thủ, nên Dễ thường vẫn chặn. Độ "dễ" chủ yếu đến từ 40% nước ngẫu nhiên; không viết test "Dễ không chặn".
- Mức độ định nghĩa theo độ sâu tính bằng nước, nên tự co giãn theo game: caro mức Vừa cũng chỉ thấy hai nước.
- Các con số (40%, độ sâu) là hằng số trong `ai/levels.ts`, để chỉnh cảm giác chơi chỉ sửa một chỗ (xem Open Questions).
- _Đã cân nhắc_: mức độ bằng thời gian nghĩ khác nhau — với Tic-tac-toe cả ba mức đều tìm hết cây trong vài mili giây nên không khác nhau; thêm nhiễu vào điểm đánh giá — khó kiểm chứng bằng test hơn quy tắc rõ ràng ở bảng trên.

### 4. Hàm đánh giá Tic-tac-toe

Cho mỗi đường trong 8 đường thắng: chỉ có quân của `player` → `+10^n` (n = số quân), chỉ có quân đối thủ → `−10^n`, có cả hai → `0`. Giá trị là số nguyên trong khoảng ±800, đúng hợp đồng thang điểm ở §2. Với mức Khó, Tic-tac-toe tìm hết cây (9 nước) trong vài mili giây nên hàm này chỉ có tác dụng ở mức Dễ/Vừa và khi vòng sâu bị cắt.

### 5. Kiểm chứng "Khó không thua"

Test duyệt **toàn bộ** cây: ở mỗi lượt người chơi thử mọi nước hợp lệ, ở lượt máy gọi `chooseMove` mức Khó (đồng hồ giả không bao giờ hết giờ), với cả hai trường hợp người đi trước và máy đi trước; khẳng định không lá nào là người chơi thắng. Chạy với 3 seed khác nhau, vì lỗi chọn ngẫu nhiên giữa các nước ngang điểm (§2) chỉ lộ ra với một số chuỗi ngẫu nhiên. Cây Tic-tac-toe đủ nhỏ để chạy trong vài giây.

### 6. Bố cục file và game giả cho test

```
packages/engine/src/ai/
  levels.ts              AI_LEVEL, AiLevel, độ sâu và tỉ lệ nước ngẫu nhiên của từng mức
  score.ts               WIN, EVAL_LIMIT, TIE_EPSILON, điểm lá
  search.ts              minimax + alpha-beta + expectimax, một vòng độ sâu cố định, cửa sổ ở gốc
  choose-move.ts         chooseMove: kiểm tra đầu vào, mức độ, đào sâu dần, chọn giữa các nước ngang điểm
  *.test.ts
packages/engine/src/outcome-weights.ts   checkOutcomeWeights, dùng chung cho session và AI
packages/engine/src/test-fixtures/
  choice-game.ts         game một nước để kiểm kỳ vọng (xem dưới)
  line-game.ts           bản sao nhỏ của Tic-tac-toe có evaluate (engine không được import packages/games)
  tree-game.ts           game có cả cây sinh ngẫu nhiên theo seed, để so tìm kiếm với bản tham chiếu
packages/engine/src/testing/
  clocks.ts              đồng hồ giả, xuất qua `@board-games/engine/testing` để packages/games dùng
```

- Đồng hồ giả: không bao giờ hết giờ, hết giờ ngay, tăng đều mỗi lần đọc. Mức Khó không giới hạn độ sâu, nên với đồng hồ đứng yên trên một game không bao giờ hết cây, vòng đào sâu dần không dừng, và vòng lặp đồng bộ thì timeout của Vitest không ngắt được. Vì vậy `neverExpires` ném lỗi sau một số lần đọc rất lớn (mặc định 1 000 000; ván Tic-tac-toe đầy đủ cần dưới 100 000), biến treo thành test đỏ; test Tic-tac-toe dùng nó thay cho `() => 0`.
- `tree-game`: cây sinh từ seed với 2–4 người, một người có thể đi hai lượt liền, nước ngẫu nhiên có 1–3 kết quả có trọng số, hoà, nhiều người cùng thắng, điểm đánh giá nhỏ để hay ngang nhau. Test so `searchRoot` với expectiminimax kiểu paranoid không cắt tỉa (cùng cách tính điểm thắng/thua theo số nước và kẹp `evaluate`) về điểm tốt nhất và đúng tập nước ngang điểm, trên vài trăm cây.

- `choice-game`: hai ghế, ghế 0 chọn một nước rồi ván kết thúc. Nước "an toàn" → hoà; nước "gieo" có `outcomes` máy thắng với trọng số `winWeight`, thua với trọng số `loseWeight` (tuỳ chọn luật, có `parseOptions`). `evaluate` luôn trả `0` (không bao giờ dùng tới vì mọi nước đều kết thúc ván). `GameResult` không có điểm, nên kỳ vọng được kiểm bằng thắng/thua có trọng số: 3:1 thì "gieo" có kỳ vọng `WIN/2 > 0` và phải được chọn; 1:3 thì phải chọn "an toàn"; 1:1 thì hai nước ngang điểm (kỳ vọng 0) và cả hai đều được chọn với các seed khác nhau.
- Game giả đếm số: thêm `evaluate` và một biến thể `supportsAI: true`.
- Game đua xúc xắc: thêm một biến thể `supportsAI: true` có `evaluate` (vị trí của mình trừ vị trí cao nhất của người khác), để kiểm AI không lỗi ở nút ngẫu nhiên với 2–4 người. Ván đua xúc xắc không bao giờ tìm hết cây, nên test mức Khó dùng đồng hồ tăng đều mỗi lần đọc để vòng đào sâu dần dừng được.

## Risks / Trade-offs

- [Caro M5: `legalMoves` liệt kê đủ 225/361 ô; độ sâu 2 tới khoảng 50 000 lá, mỗi lá một lần `evaluate` quét bàn; Vừa và Khó luôn làm xong độ sâu 2 nên có thể vượt thời gian nghĩ] → M5 đo trước khi làm giao diện. Nếu chậm: thêm hook tuỳ chọn trong `GameDefinition` để chọn nước ứng viên (ví dụ chỉ ô gần quân đã đặt) và sắp thứ tự nước, gọi qua `searchMoves` (§2); đó là thay đổi chỉ thêm, game khác không phải sửa.
- [Ở caro, Khó trong 1,5 giây có thể chỉ tới độ sâu 2–3, khác Vừa không nhiều] → M5 đo và chỉnh (hook ứng viên, bảng băm vị trí, thời gian nghĩ).
- [Không cắt tỉa trong nút ngẫu nhiên làm cá ngựa chậm] → Cá ngựa (M6) dùng `policy`, không dùng tìm kiếm sâu; tối ưu (star1/star2) khi có số đo.
- [Đồng hồ được xem ở mỗi nút; `performance.now` tốn vài chục ns] → Không đáng kể so với `legalMoves`; nếu cần thì xem mỗi 256 nút.
- [Kiểu "paranoid" cho N người cho nước đi quá phòng thủ] → Chấp nhận; N người là việc của M6.
- [Độ sâu đếm theo nước đi, không theo lượt của đối thủ: nếu máy được đi hai nước liền (cá ngựa gieo 6) hoặc ván có 3–4 người, độ sâu 2 có thể không chạm tới nước đi kế tiếp của đối thủ, nên đảm bảo "Vừa chặn nước thắng ngay của đối thủ" chỉ đúng với game hai người đi luân phiên] → Spec ghi rõ phạm vi đó. Game hai người đi luân phiên (Tic-tac-toe, caro) không bị ảnh hưởng; cá ngựa dùng `policy` (M6). Nếu sau này cần, định nghĩa độ sâu tối thiểu theo "tới hết lượt kế tiếp của mỗi đối thủ" thay vì theo số nước.
- [Mức Khó không giới hạn độ sâu: nơi gọi truyền đồng hồ không chạy (hoặc `timeLimitMs` cực lớn) cho game không bao giờ hết cây thì `chooseMove` không trả về] → Đồng hồ thật luôn chạy, và `timeLimitMs` được kiểm là hữu hạn; trong test, `neverExpires` ném lỗi sau nhiều lần đọc thay vì treo (§6).
- [Thêm mã lỗi vào `ENGINE_ERROR`] → Thay đổi chỉ thêm; spec `game-engine` không liệt kê đóng danh sách mã lỗi.

## Open Questions

- Độ mạnh mức Dễ (40% nước ngẫu nhiên) và độ sâu của từng mức có đúng cảm giác chủ dự án muốn không. _Giả định chờ chủ dự án xác nhận_: giữ như bảng §3; các con số nằm ở `ai/levels.ts` nên đổi được mà không đụng thuật toán.
