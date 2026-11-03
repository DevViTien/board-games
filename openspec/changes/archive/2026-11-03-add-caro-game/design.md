# Design

## Context

- `GameDefinition` (`packages/engine/src/types.ts`) đã có `Options`, `parseOptions`, `defaultOptions`; `parseGameOptions` (`options.ts`) kiểm tuỳ chọn từ bên ngoài; biên bản (`record.ts`) đã lưu `options`, nên ván lưu, ván online và phát lại giữ được tuỳ chọn mà không đổi định dạng.
- AI (`packages/engine/src/ai/`): `chooseMove` đào sâu dần từ độ sâu 1; `LEVEL_PROFILES` Dễ (độ sâu 1, 40 % nước ngẫu nhiên), Vừa (độ sâu 1 rồi 2), Khó (từ 2, sâu dần tới hết giờ). Độ sâu tối thiểu **luôn chạy xong kể cả quá giờ**. `searchMoves(game, state)` hiện trả `legalMoves` và đã được ghi chú là chỗ để thu hẹp nước trên bàn lớn.
- App: `AI_TIME_LIMIT_MS` = 500 / 500 / 1500 ms (`transport/ai-timing.ts`), nước máy hiện sau ≥ 300 ms; Worker quá `timeLimitMs + 2000` ms thì bỏ, chuyển sang luồng chính với giới hạn 200 ms (`ai-worker/ai-player.ts`). Worker chỉ nhận `state` (dữ liệu thuần) nên mọi thứ AI cần phải nằm trong state. Transport cục bộ dùng `cryptoRng` (`GamePlay`), nên nước của máy trong E2E không tái lập được.
- Bàn Tic-tac-toe (`games/tictactoe/Board.tsx`): 9 nút trong `role="group"` "Bàn cờ", mỗi ô một điểm dừng Tab, ô không chọn được là `aria-disabled`, nước vừa đi viền dày + `aria-describedby`.
- `PlayScreen` có đúng một `role="status"` (lời báo lượt, `PlayScreen.tsx` ~dòng 195) và gọi `ui.useMoveLabel()` → `(move) => string` để nói nước máy/đối thủ vừa đi. Helper E2E (`e2e/helpers.ts`): `status()` = `getByRole("status")`, `board()` = `getByRole("group", { name: "Bàn cờ" })`, `writeSaved()` ghi thẳng một ván vào IndexedDB.
- Server online kiểm nước bằng `findGame` của `packages/games` và phát lại biên bản ở mỗi nước (`room-service.ts`); mỗi lần ghi là 1 `HGET` + script 5 lệnh có `PUBLISH` mang JSON của cả phòng (design `add-online-rooms` §8); giới hạn 16 KB chỉ áp cho thông điệp client → server.
- Menu gộp game đã đăng ký với `PLANNED_GAMES` (`features/menu/planned-games.ts`, Cờ caro đang "Sắp có", ~5 phút).
- Yêu cầu hành vi: `specs/caro` (mới), delta `game-ai`, `game-menu`.

## Goals / Non-Goals

**Goals:**

- Luật Cờ caro thuần, đủ cả hai kích thước và hai luật thắng ngay từ change này; giao diện chọn tuỳ chọn để `add-game-options`.
- AI bàn lớn bằng một hook chung, không đổi `LEVEL_PROFILES` hay thời gian của app; Tic-tac-toe chạy y như cũ.
- Bàn Cờ caro dùng được trên điện thoại 360 px, bằng bàn phím và trình đọc màn hình.

**Non-Goals:**

- Chọn tuỳ chọn trên giao diện (change `add-game-options`): mọi hành vi chỉ thấy được khi chơi 19×19 trên giao diện (bàn 19×19 trên điện thoại, máy trên bàn 19×19) có spec và E2E ở change đó.
- Trang luật (M8); bàn vô hạn, Canvas, Renju.

## Đã chốt với người dùng (03/11/2026)

- **Mép bàn không chặn**: ở luật "chặn hai đầu", chỉ quân đối thủ ngay ngoài đầu chuỗi mới chặn đầu đó.
- **Chạm hai lần** khi chạm bằng ngón tay và ô nhỏ hơn 24 px (§3).
- **Thẻ menu ghi ~10 phút**.
- (Cho `add-game-options`) tóm tắt luật luôn ghi đủ mọi tuỳ chọn.

## Decisions

### 1. Luật (`packages/games/src/caro/`)

```ts
// constants.ts
export const CARO_SIZES = [15, 19] as const;
export type CaroSize = (typeof CARO_SIZES)[number];
export const CARO_RULE = { BlockedEnds: "blocked-ends", Free: "free" } as const;
export type CaroRule = (typeof CARO_RULE)[keyof typeof CARO_RULE];
export const WIN_LENGTH = 5;

// options.ts
export interface CaroOptions {
  readonly size: CaroSize;
  readonly rule: CaroRule;
}
export const CARO_DEFAULT_OPTIONS = {
  size: 15,
  rule: "blocked-ends",
} as const satisfies CaroOptions;
/** Khoá thiếu → mặc định; khoá lạ, giá trị lạ, không phải object thường → null. */
export function parseCaroOptions(raw: unknown): CaroOptions | null;

// lines.ts — dùng chung cho applyMove và AI
/** Ô cách `cell` một bước theo hướng (hoặc ngược hướng), null khi ra ngoài bàn; đi theo (hàng, cột). */
export function stepFrom(size, cell, direction, sign?): number | null;
/** Chuỗi tối đa của `player` qua `cell` theo một hướng, các ô xếp từ đầu này tới đầu kia. */
export function runThrough(board, size, cell, player, direction): readonly number[];
/** Hai ô ngay ngoài hai đầu chuỗi (null khi ngoài bàn). */
export function outsideEnds(size, line, direction): readonly [number | null, number | null];
/** Mọi chuỗi thắng qua `cell` nếu `player` đặt quân vào đó, theo `rule` (theo thứ tự DIRECTIONS). */
export function winningRuns(board, size, cell, player, rule): readonly { cells; direction }[];
/** Đặt `player` vào ô trống `cell` thì có thắng ngay không, theo `rule`: chuỗi thắng đầu tiên hoặc null. */
export function wouldWin(board, size, cell, player, rule): readonly number[] | null; // = winningRuns(…)[0]?.cells

// rules.ts
export interface CaroState {
  readonly size: CaroSize;
  readonly rule: CaroRule;
  readonly board: readonly (PlayerIndex | null)[]; // size × size ô, theo hàng từ góc trên trái
  readonly toMove: PlayerIndex;
  readonly filled: number; // số ô đã có quân: hoà khi = size²
  readonly win: { readonly player: PlayerIndex; readonly cells: readonly number[] } | null;
}
export interface CaroMove {
  readonly cell: number; // 0 … size² − 1
}
export function caroWinningLine(state: CaroState): readonly number[] | null; // = state.win?.cells
```

- **Tên tuỳ chọn**: `size` (`15 | 19`) và `rule` (`"blocked-ends" | "free"`). Giá trị là số/chuỗi đọc được trong biên bản và URL; không `enum` (plan.md §4.2).
- **`parseCaroOptions` tương thích về sau**: khoá **thiếu** → giá trị mặc định của khoá đó (một tuỳ chọn thêm sau này không làm mất ván đã lưu hay phòng đang có, vì biên bản cũ thiếu khoá mới); khoá **lạ**, giá trị **lạ** (`17`, `"15"`), không phải object thường → `null` (`invalid-options`). Luôn trả object đủ hai khoá, nên biên bản mới luôn ở dạng đầy đủ. Phương án đã cân nhắc: bắt buộc đủ khoá — bỏ, vì mỗi lần thêm tuỳ chọn sẽ làm hỏng mọi ván và phòng cũ.
- **`size` và `rule` nằm trong state**: `evaluate`, `candidateMoves`, `result` chỉ nhận state (Worker chỉ nhận state). `setup` chép từ `options`.
- **Nước đi `{ cell }`** như Tic-tac-toe: nhỏ trên đường truyền, một số nguyên dễ kiểm. Phương án `{ row, col }` bị bỏ: dài gấp đôi và có hai trường phải kiểm. Hệ quả: nhãn nước đi cần kích thước bàn, xem §3 "Nhãn nước đi". `moveKey: ({ cell }) => String(cell)`: khớp nước khi phát lại biên bản (session tìm trong `legalMoves` theo khoá) rẻ hơn JSON nhiều lần; dữ liệu lạ làm `moveKey` ném lỗi thì session coi là "không khớp" (đã có).
- **Đi theo (hàng, cột), không theo chỉ số**: mọi bước đi trên bàn (`runThrough`, ô chặn ngoài đầu, cửa sổ của `evaluate`, ô lân cận của `candidateMoves`) đổi chỉ số → `(hàng, cột)`, cộng hướng `(dr, dc)` và kiểm `0 ≤ hàng, cột < size` ở mỗi bước. Cấm cộng `±1`, `±size`, `±size±1` thẳng vào chỉ số: ô cuối hàng 3 cộng 1 là ô đầu hàng 4, và chuỗi sẽ "quấn" sang hàng sau.
- **Thắng tính một lần trong `applyMove`** bằng `wouldWin` và lưu vào `win`: chỉ chuỗi qua ô vừa đặt mới có thể thắng. `result` và `legalMoves` khi đó không quét bàn; AI gọi `result` ở mọi nút. Phương án quét cả bàn trong `result` bị bỏ vì chậm ở mọi nút tìm kiếm.
- **Thuật toán `wouldWin`** cho ô `c` của `p`, lần lượt 4 hướng (ngang, dọc, chéo xuống phải, chéo xuống trái):
  - `runThrough` → chuỗi tối đa `[a … b]` xếp từ đầu này tới đầu kia (đường hàng thắng vẽ từ ô đầu tới ô cuối), độ dài `L`; `L < 5` → hướng này không thắng.
  - `free` → thắng.
  - `blocked-ends`: ô ngay trước `a` và ngay sau `b` là "chặn" khi **nằm trong bàn và có quân đối thủ**; ngoài bàn không chặn (đã chốt); hướng này thắng trừ khi cả hai đầu chặn.
  - Trả chuỗi của **hướng thắng đầu tiên**; hướng có chuỗi ≥ 5 bị chặn hai đầu thì bỏ qua và xét tiếp. Một nước tạo hai chuỗi — một bị chặn hai đầu, một thắng — là thắng, `cells` là chuỗi thắng.
- **Hoà**: `filled = size²` mà `win = null`. Nước cuối lấp bàn mà tạo năm không bị chặn là thắng; tạo năm bị chặn hai đầu là hoà.
- **`legalMoves`**: `[]` khi đã có kết quả, còn lại mọi ô trống theo thứ tự chỉ số.
- **`meta`**: 2 người, thể loại `vn-folk` (idea.md §3.1), `supportsAI: true`, `durationMinutes: 10` (đã chốt).

### 2. AI

#### 2.1 Hook `candidateMoves` (engine)

```ts
interface GameDefinition<State, Move, Outcome, Options> {
  /**
   * The moves the AI considers in `state`, best first: for games whose boards are too large to
   * search every legal move (Gomoku). While the game is unfinished it MUST be a non-empty subset of
   * `legalMoves(state)`, without duplicates, deterministic and leaving `state` untouched (the
   * contract suite's `candidate-moves` checks it). It must also keep every move that wins at once
   * and every move that stops the opponent winning at once, or Medium and Hard lose their
   * guarantees. Absent: the AI considers every legal move.
   */
  candidateMoves?(this: void, state: State): readonly Move[];
}
```

- **Hợp đồng**: khi ván chưa xong, hook PHẢI trả tập con khác rỗng của `legalMoves`; bộ kiểm tra hợp đồng thất bại nếu không (§2.4). Phần rơi về dưới đây chỉ là **phòng thủ** cho game cài sai đã lọt qua, không phải hành vi được phép.
- `searchMoves(game, state)` (ở mọi nút) trả `candidateMoves(state)` nếu có và khác rỗng, không thì `legalMoves(state)`. Trong cây không đối chiếu với `legalMoves` (đắt ở mọi nút).
- Ở gốc, `chooseMove` dựng tập nước gốc bằng `rootMoves`: lấy `searchMoves`, lọc theo khoá (`moveKeyOf`, dùng chung với `session` và bộ kiểm tra hợp đồng) với `legalMoves` một lần, trả chính object nước của luật, bỏ trùng; rỗng sau khi lọc → mọi nước hợp lệ. Requirement "Máy chọn một nước đi hợp lệ" vẫn đúng cả khi game cài hook sai.
- **Chỉ một nước gốc** (bàn Cờ caro trống: chỉ ô giữa): `chooseMove` trả nước đó ngay sau khi đọc đồng hồ lần đầu (nên `RangeError` của đồng hồ hỏng và số lần rút ngẫu nhiên của mức Dễ không đổi), không tìm và không chờ hết giờ. Delta `game-ai` sửa "Giới hạn thời gian" (thêm scenario "Chỉ một nước để xét").
- **Mức Dễ** chọn nước ngẫu nhiên **trong tập thu hẹp** (nước ngẫu nhiên lấy từ tập nước gốc `rootMoves`, tức `searchMoves` đã lọc theo luật): nước ngẫu nhiên ở góc bàn 19×19 trông như máy hỏng, còn nước ngẫu nhiên gần trận đấu vẫn "kém" mà hợp lý. Phương án đã cân nhắc: Dễ chọn trong mọi nước hợp lệ — bỏ vì lý do trên.
- **Mức Khó**: "tìm hết tới cuối ván" nay nghĩa là hết cây **trong tập nước máy xét**; bảo đảm "không chọn nước thua khi còn nước không thua" chỉ trong tập đó (delta `game-ai`, MODIFIED "Mức Khó"). Với Cờ caro, cây không bao giờ tìm hết nên không đổi gì thực tế; với Tic-tac-toe (không có hook) y như cũ.
- Thứ tự trả về là thứ tự xét ở lượt đào sâu đầu tiên: nước tốt trước giúp alpha-beta cắt sớm.
- Phương án đã cân nhắc:
  - `legalMoves` của Cờ caro chỉ trả ô gần quân: sai luật (người chơi được đặt bất kỳ ô trống nào, server phải nhận) — bỏ.
  - Engine tự tính "ô gần": engine không biết hình học bàn — bỏ.
  - Chỉ sắp thứ tự mà không thu hẹp: độ sâu 2 trên 361 ô là ~130 nghìn lần `evaluate`, vượt xa 500 ms — bỏ.

#### 2.2 Tập nước của Cờ caro (`caro/ai.ts`)

- Bàn trống → `[ô giữa]`.
- Còn lại: các ô trống cách một quân bất kỳ không quá 2 ô theo cả hàng lẫn cột (`CANDIDATE_RADIUS = 2`).
- **Ô bắt buộc** (luôn giữ, không tính vào giới hạn), cho **cả hai người** `p`:
  - mọi ô trống mà `winningRuns(board, size, ô, p, rule)` trả ít nhất một chuỗi — **cùng hàm** mà `wouldWin` (và vì thế `applyMove`) dựa vào, nên luật (kể cả mép không chặn) không bao giờ lệch giữa luật và AI. Ví dụ ô (1,1) khi X ở hàng 1 cột 2–5 và O ở cột 6: thắng cho X dù sát mép. Để rẻ, mỗi ô trước hết được đếm chuỗi liền qua nó theo 4 hướng (không cấp phát, cũng dùng cho điểm đe doạ); chỉ ô có chuỗi ≥ 5 mới được đưa cho `winningRuns`. Đó là điều kiện cần của `winningRuns` (chuỗi < 5 không bao giờ thắng), nên không đổi tập ô bắt buộc;
  - với `blocked-ends`, thêm các ô trống nằm **ngay ngoài đầu** của **mọi** chuỗi thắng mà ô đó tạo (vì vậy dùng `winningRuns`, không chỉ chuỗi đầu tiên mà `wouldWin` trả): đối thủ đặt quân vào đó thì chuỗi năm kia bị chặn hai đầu, nên đó cũng là nước chặn. Ví dụ `O X X X X _ _`: ô `_` đầu là ô thắng của X, ô `_` thứ hai là ô O chặn được bằng cách "giết" năm quân đó.
- Thứ tự ô bắt buộc: ô thắng của người đang đi, rồi ô thắng của đối thủ (chặn), rồi ô "giết" chuỗi; cùng nhóm thì theo chỉ số ô.
- Các ô còn lại chấm **mức đe doạ** rẻ: với mỗi người và mỗi hướng, giả sử đặt quân vào ô, đếm chuỗi liền nhau qua ô và số đầu còn trống (đi theo hàng, cột như §1); bốn, ba mở, ba bị chặn… Điểm của ô = tổng của hai người (tấn công và phòng thủ). Bộ chấm này chỉ dùng để **xếp thứ tự**, không quyết định ô nào bắt buộc.
- Sắp các ô bắt buộc trước, rồi các ô khác giảm dần theo điểm, hoà thì theo chỉ số ô (tất định); giữ các ô bắt buộc cộng `CANDIDATE_LIMIT = 20` ô khác đầu tiên. Nhờ ô bắt buộc, mức Vừa (độ sâu 2) chắc chắn chặn được chuỗi bốn chỉ còn một ô để thành năm.
- Hai hằng số chỉnh được trong `caro/constants.ts`; không ghi vào spec (spec nói hành vi).

#### 2.3 `evaluate` (`caro/ai.ts`)

- Duyệt mọi **cửa sổ 5 ô liên tiếp** trên mọi hàng, cột, đường chéo, đi theo (hàng, cột). Số cửa sổ: 15×15 có 572, 19×19 có **1.020** (mỗi hướng ngang/dọc 19 × 15 = 285; mỗi hướng chéo 2 × (1 + … + 14) + 15 = 225). Cửa sổ chỉ có quân của một người, `k` quân (1–4), cộng `WINDOW_SCORE[k]` cho người đó; cửa sổ có quân cả hai bên không tính.
- Luật `blocked-ends`: cửa sổ bị bỏ qua khi chuỗi mà nó tạo ra nếu lấp đầy, **kéo dài qua quân của chủ cửa sổ nằm ngay ngoài nó**, có quân đối thủ ở cả hai đầu (trong bàn): chuỗi đó không bao giờ thắng. Ví dụ `O X X X X _ O`, và cả `O X X X X _ X O` (lấp khe thành sáu quân bị chặn hai đầu). Mép bàn không chặn. Luật `free`: không bỏ cửa sổ nào.
- Cửa sổ chồng nhau tự cho bốn mở (hai cửa sổ 4) điểm cao hơn bốn bị chặn (một), và bắt được dạng có khe (`XX_XX`).
- `evaluate(state, player)` = tổng của `player` − tổng của đối thủ, tổng của người đang đến lượt nhân 6, của người kia nhân 5 (hệ số 6/5 mà kết quả vẫn là số nguyên): |giá trị| ≤ 1.020 × 1.000 × 6 < 10^8. Bảng điểm `WINDOW_SCORE = [0, 1, 10, 100, 1000, 0]`: cửa sổ đủ 5 quân chỉ gặp khi chuỗi đó đã không thắng (bị chặn hai đầu ở `blocked-ends`), nên không có giá trị.
- Ở `blocked-ends`, bốn bị chặn một đầu giữa bàn có **hai** nước không thua: chặn ở đầu trống, hoặc "giết" ở ô xa hơn một ô. Máy mức Vừa chọn chặn thẳng vì `evaluate` chấm thế đó cao hơn (test "chặn chuỗi bốn" chạy 3 seed; thử tay 40 seed đều ra ô chặn), không phải vì đó là nước duy nhất. Test và E2E cần kết quả không phụ thuộc `evaluate` thì dùng chuỗi chạm mép (§6).
- Chi phí: 1.020 cửa sổ × 5 ô ≈ 5.000 lần đọc ô → **vài chục µs** mỗi lần trên máy tính (chậm hơn vài lần trên điện thoại).
- Phương án đã cân nhắc: phân loại chuỗi liền (bốn mở/bốn chặn/ba mở) như bảng mẫu cổ điển — chính xác hơn nhưng phải xử lý riêng dạng có khe và quá năm. Đánh giá tăng dần để sau nếu đo thấy chậm.

#### 2.4 Kiểm tra hợp đồng `candidate-moves`

`CONTRACT_CHECKS` thêm kiểm tra (game không khai báo hook thì vượt qua): ở mọi trạng thái chưa xong của các ván tự chơi, `candidateMoves` **khác rỗng**, mọi nước có trong `legalMoves` (theo `moveKey`), không trùng khoá, tất định (gọi hai lần cùng kết quả), không sửa state (state đóng băng sâu như các kiểm tra khác). Bộ kiểm tra có 15 kiểm tra; test của bộ thêm game mẫu vi phạm từng điều.

#### 2.5 Thời gian

- Không đổi `AI_TIME_LIMIT_MS`, giới hạn 200 ms trên luồng chính, hay hạn 2 giây của Worker.
- `chooseMove` của mức Vừa chạy độ sâu 1 rồi 2 trên `r` nước gốc (≤ ~21 khi không có nhiều ô bắt buộc), mỗi nước gốc ≤ `c` nước đáp: số lần `evaluate` ≤ `r + r·c = r·(c + 1)` (~460), cộng ~`r` lần sinh tập nước → **vài chục ms** kể cả trên luồng chính. Khó đào sâu tiếp tới hết 1.500 ms (ước tính độ sâu 3–4).
- Test xác định (không đo giờ): với một thế 19×19 cố định giữa ván, đếm số lần `evaluate` của mức Vừa ≤ `r·(c+1)` với `r`, `c` đọc từ chính `candidateMoves` của thế đó và các thế con. Bench đo giờ chỉ chạy tay để chỉnh hằng số, số đo ghi vào đây.
- **Số đo bench (03/11/2026, máy bàn Windows, Node 24 trong Vitest; bench chạy tay, không commit)**, thế giữa ván ~12 quân, không có ô bắt buộc (20 ô xét):

  | Đo                          | 15×15                                                                       | 19×19                                                                        |
  | --------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
  | Một lần `candidateMoves`    | ~57 µs                                                                      | ~66 µs                                                                       |
  | Một lần `evaluate`          | ~22 µs                                                                      | ~33 µs                                                                       |
  | Mức Vừa (độ sâu 2), cả nước | 5–12 ms, 80 lần `evaluate`                                                  | ~7 ms, 80 lần `evaluate`                                                     |
  | Mức Khó, giới hạn 1.500 ms  | dùng trọn 1.500 ms, tới độ sâu 7–8 (lượt cuối dở), ~31 nghìn lần `evaluate` | dùng trọn 1.500 ms, tới độ sâu 7 (lượt cuối dở), ~23–25 nghìn lần `evaluate` |

  Ở thế ngẫu nhiên gần đầy bàn (rất nhiều ô gần quân), một lần `candidateMoves` lên ~270 µs.

- **Số đo E2E** (Playwright, bản build production, Chromium trên cùng máy bàn; cấu hình "mobile" là Pixel 7 giả lập, **không** phải CPU điện thoại thật), từ lúc bấm (`pointerdown`) tới lúc quân của máy hiện, đo bằng `performance.now()` trong trang:
  - Mức Vừa, lượt đầu (có khởi động Worker), task 4.3: 317–333 ms ở cả desktop lẫn mobile (≥ 300 ms là thời gian hiện nước tối thiểu).
  - Mức Khó 15×15 (đo tay bằng một spec tạm, không commit): lượt đầu 1.537–1.540 ms, các lượt sau ~1.506 ms, cả hai cấu hình. Dưới hạn 2 giây ~460 ms trên máy bàn; trên điện thoại thật Worker khởi động chậm hơn, cần đo ở `add-game-options` như đã định.
- Lúc đo trên, mức Khó chưa dừng sớm khi chỉ có **một** nước để xét (bàn trống: chỉ ô giữa) và đào sâu tới hết 1.500 ms. Đã sửa sau review: chỉ một nước gốc thì `chooseMove` trả ngay (§2.1), nên nước đầu của máy trên bàn trống không còn chờ; test `caro/ai.test.ts` dùng đồng hồ không bao giờ hết giờ và chỉ cho đọc một lần để chứng minh.
- Máy mức Khó **dùng trọn 1.500 ms** trên Cờ caro (cây không bao giờ hết), cộng thời gian khởi động Worker ở lượt đầu: sát giới hạn 2 giây của `play-vs-ai`. Kế hoạch đo: task 4.3 (lượt đầu, có khởi động Worker) và bench tay ở task 2.5 ghi lại (bằng `performance.now()` trong E2E và trong bench) thời gian từ nước người chơi tới nước máy, lượt đầu và các lượt sau, trên cấu hình desktop và điện thoại của Playwright. E2E mức Khó trên 19×19 thuộc `add-game-options`; ở change này chỉ E2E mức Vừa (500 ms).

### 3. Bàn cờ (`apps/web/src/games/caro/Board.tsx`)

**Cấu trúc.** Một khung vuông `relative aspect-square w-full max-w-[40rem]` gồm:

1. Lớp SVG dưới (`aria-hidden`, `viewBox="0 0 size size"`): đường kẻ ô (một `path`, `vector-effect="non-scaling-stroke"`); nền là màu của khung.
2. Lưới `role="grid"` (tên "Bàn cờ", `Play.board`), `size` hàng `role="row"` (mỗi hàng là một hàng flex), mỗi ô `role="gridcell"` chứa một `<button>` có `data-cell`; quân X/O vẽ bằng SVG nhỏ như Tic-tac-toe. Sự kiện (`click`, `keydown`, `focus`, `pointerdown`) gắn **một lần ở lưới** và tìm ô qua `data-cell`, nên ô chỉ nhận giá trị nguyên thuỷ và `memo` có tác dụng.
3. Lớp SVG trên (`aria-hidden`, `pointer-events-none`): đường kẻ qua tâm ô đầu và ô cuối của hàng thắng (`caroWinningLine`, các ô đã xếp từ đầu tới đầu).

Phương án đã cân nhắc:

- Toàn bộ là SVG có phần tử bấm được: phải tự làm focus, vai trò, tên đọc được, bàn phím cho từng ô — `<button>` có sẵn cả.
- Canvas: không đọc được bằng trình đọc màn hình; chỉ cần khi bàn vô hạn (ngoài phạm vi). plan.md §6.2 ghi "SVG (Canvas nếu bàn lớn bị chậm)": SVG lo phần vẽ, nút lo tương tác.

**Hiệu năng.** 361 nút: ô là `memo` với props nguyên thuỷ (quân, tên đọc được, chọn được, có focus, là nước vừa đi, thuộc hàng thắng, đang được chọn); tập ô chọn được dựng một lần mỗi lần vẽ (`Map` theo `cell`) thay vì `legalMoves.find` cho từng ô (O(n²)); tên đọc được của mọi ô dựng bằng `useMemo` theo `board` (quân X/O dịch thẳng từ `Games.caro.players`). Ô không chọn được là `aria-disabled` như Tic-tac-toe.

**Nước vừa đi và hàng thắng.**

- Ô nước vừa đi: viền `border-2 border-accent` trên nút (viền giữ được ở chế độ màu cưỡng bức, nên không vẽ ở lớp SVG) + `aria-describedby` "Nước vừa đi" (`Play.lastMove`).
- Ô thuộc hàng thắng: nền nổi bật + `aria-describedby` "Thuộc hàng thắng" (`Games.caro.winningCell`), cộng đường kẻ ở lớp trên.
- Chỉ dùng token sẵn có; nếu đường hàng thắng trên quân X (màu `accent`) không đủ tương phản thì thêm một token trong `packages/ui/src/styles.css` (plan.md §4.3).

**Bàn phím.** Bàn 361 ô mà mỗi ô một điểm dừng Tab thì không dùng được, nên bàn Cờ caro dùng **roving tabindex** (mẫu `grid` của WAI-ARIA):

- Chỉ một nút `tabIndex=0`. Tab vào bàn tới ô có focus gần nhất; chưa có thì ô nước vừa đi; chưa có nước thì ô giữa.
- Mũi tên đi một ô, dừng ở mép (không quay vòng); `Home`/`End` về đầu/cuối hàng.
- `Enter`/`Space` đặt quân khi ô chọn được, **luôn ngay lập tức** (kể cả khi ô vừa được chọn bằng chạm, xem dưới); focus ở lại ô đó. Tab tiếp rời bàn.
- Tic-tac-toe giữ cách cũ (9 điểm dừng Tab).

**Tên đọc được và nhãn nước đi.**

- `Play.cell` có sẵn: "Hàng 8, cột 8, trống" / "Hàng 8, cột 8, X". `usePlayerLabel` → `Games.caro.players.{x,o}`.
- **Nhãn nước đi cần kích thước bàn**: `{ cell }` không mang `size`, nên `GameUI.useMoveLabel` đổi thành `() => (move, state) => string` và `PlayScreen` truyền `snapshot.state` (cùng kích thước với ván của nước đó). Change này vì vậy chạm `games/types.ts`, `features/play/PlayScreen.tsx` và hook của Tic-tac-toe (giữ chữ ký `(move) => string`: TypeScript nhận hàm ít tham số hơn, nên hook bỏ qua `state` mà không cần khai báo). Phương án đã cân nhắc: nhét `size` vào nước đi — dài biên bản, thêm trường phải kiểm; hay để hook đọc kích thước từ chỗ khác — không có chỗ nào khác ngoài state.
- `Games.caro.move` "hàng {row}, cột {col}": ô 360 của bàn 19×19 là "hàng 19, cột 19", ô 224 của 15×15 là "hàng 15, cột 15".

**Lời gợi ý và vai trò.** `PlayScreen` đã có `role="status"` duy nhất (lời báo lượt), và helper E2E `status()` dựa vào việc đó. Dòng gợi ý "Chạm lần nữa để đặt quân" (`Games.caro.boardHint`) của bàn là một `<p aria-live="polite">` **không** có `role="status"`. Bàn dùng `role="grid"` thay vì `role="group"`, nên helper `board()` phải được tổng quát hoá (task 4.1: tìm theo tên "Bàn cờ" với vai trò `group` hoặc `grid`).

**Điện thoại 360 px.** `main` có lề 16 px mỗi bên → bàn rộng 328 px, vừa khít, **không cuộn ngang**, không chặn phóng to (không đặt `maximum-scale`):

| Bàn   | Ô ở 360 px | Ô ở 412 px (Pixel 7, E2E) | Ô trên máy tính (bàn 640 px) |
| ----- | ---------- | ------------------------- | ---------------------------- |
| 15×15 | ~21,9 px   | ~25,3 px                  | ~42,7 px                     |
| 19×19 | ~17,3 px   | ~20,0 px                  | ~33,7 px                     |

Ô dưới 24 px (cỡ đích chạm tối thiểu của WCAG 2.2, 2.5.8) dễ chạm nhầm ô bên cạnh, mà online không có hoàn tác. Vì vậy **chạm hai lần khi ô nhỏ** (đã chốt):

- Bàn đo cỡ ô bằng `ResizeObserver`. Bàn ghi `pointerType` của `pointerdown` gần nhất; ở sự kiện `click`, nếu `event.detail === 0` (click do bàn phím) thì **đặt ngay**; nếu không, `pointerType === "touch"` và ô < 24 px thì lần chạm đầu chỉ **chọn** ô (quân mờ xem trước + viền, ô có `aria-selected`), chạm lại đúng ô đó mới đặt, chạm ô khác thì chuyển ô chọn. Cờ `pointerType` bị xoá sau mỗi `click`.
- Ô chọn bị bỏ khi bàn đổi: có nước mới (của mình, đối thủ hay máy), hoàn tác/làm lại, ván mới, hoặc bàn bị khoá (`disabled`). `BoardProps` không có `moveCount`, nên ô chọn được gắn với **nội dung** của thế lúc chạm (`filled`, `toMove`, ô nước vừa đi) và bị bỏ khi một trong số đó đổi hoặc ô đó đã có quân. Không so theo object `state`: online, mỗi lần phòng đổi (đổi tên, vào ghế, chào lại khi nối lại ~5 phút/lần) transport dựng lại state từ biên bản mà bàn không đổi. Ô chọn được bỏ bằng cách chỉnh state ngay trong lúc render (như `PlayScreen` làm), nên bàn bị khoá rồi mở lại cũng không hiện lại ô chọn cũ. Ở chế độ chạm hai lần (ô < 24 px), ô chọn được có `aria-selected="false"`, ô đang chọn `"true"`; lưới có `touch-action: manipulation` (`touch-manipulation`) để iOS không phóng to khi chạm hai lần, vẫn phóng to được bằng hai ngón.
- Chuột, bút, bàn phím và màn hình đủ lớn: đặt ngay như cũ.
- Phương án đã cân nhắc:
  - Bàn cuộn trong khung với ô tối thiểu 28 px (19×19 = 532 px): phải kéo qua lại, không thấy cả bàn — bỏ.
  - Chỉ dựa vào phóng to bằng hai ngón: chạm nhầm vẫn xảy ra khi quên — giữ như lối phụ (không chặn) nhưng không đủ.
  - Kính lúp quanh ngón tay: phức tạp hơn nhiều mà không chắc hơn.

### 4. Đăng ký game và menu

- `packages/games/src/index.ts`: `GAMES = [tictactoe, caro]`, export `caro` và các kiểu, hằng, `caroWinningLine`, `parseCaroOptions`.
- `apps/web/src/games/registry.ts`: một dòng `caro: () => import("./caro").then((m) => m.caroEntry)`; `caroEntry = defineGameEntry(caro, { Board, usePlayerLabel, useMoveLabel })`.
- `PLANNED_GAMES` bỏ `caro` (menu đã tự bỏ thẻ "Sắp có" trùng, nhưng để lại là dữ liệu chết).
- Bản dịch (vi/en/ja): `Games.caro` có sẵn `name`; thêm `players.x`, `players.o`, `move`, `winningCell`, `boardHint`.

### 5. Online

Không đổi giao thức, server hay transport: server dùng `GAMES`, tạo phòng không nêu tuỳ chọn thì lấy `defaultOptions` (đã có).

- Thông điệp `move` ~60 byte; giới hạn 16 KB chỉ áp cho chiều **client → server**.
- `room` gửi biên bản đầy đủ: 19×19 đầy bàn 361 nước × ~22 byte ≈ 8 KB; trình duyệt nhận được.
- **Redis**: mỗi nước = 1 `HGET` + script ghi 5 lệnh (`HGET`, `HSET`, `EXPIRE`, `PUBLISH`) = 6 lệnh. Ván Cờ caro ~80 nước ≈ **500 lệnh**, ván dài 200 nước ≈ 1.200 lệnh, so với 500 nghìn lệnh/tháng của Upstash Free: vẫn vài trăm ván mỗi tháng, gấp nhiều lần nhu cầu của nhóm bạn. `HSET` và `PUBLISH` mang JSON của cả phòng, lớn dần theo số nước: ván 200 nước chuyển tổng ~**1 MB** (mỗi chiều); theo dõi băng thông ở tab Usage của Upstash cùng số lệnh (plan.md §10 M4 "Còn lại").
- Mỗi nước server phát lại cả biên bản: ≤ 361 lần `applyMove` (chép mảng 361 ô) + khớp khoá chuỗi ngắn — vài ms.

### 6. Test

- **Luật** (`lines.test.ts`, `rules.test.ts`):
  - thắng ngang, dọc, hai chéo, ở mép và góc; quá năm (6 quân); chặn hai đầu không thắng (5 và 6 quân); một đầu bị chặn vẫn thắng; mép + quân đối thủ vẫn thắng; `free` thắng dù bị chặn hai đầu; 19×19 thắng ở hàng 19;
  - **không quấn hàng**: trên 15×15, X ở hàng 3 cột 11–15, O ở (3,10) và (4,1) → X thắng (mép phải không chặn, (4,1) không phải ô "sau" chuỗi); X ở đầu hàng 4 không nối vào chuỗi cuối hàng 3; tương tự cho hai hướng chéo ở mép trái/phải;
  - một nước tạo hai chuỗi, một bị chặn hai đầu, một thắng → thắng, `cells` là chuỗi thắng;
  - `cells` xếp từ đầu này tới đầu kia (chuỗi 6 quân, nước nối ở giữa);
  - hoà đầy bàn: bàn 15×15 dựng bằng mẫu lặp, test kiểm **sau mỗi nước** chưa có kết quả (không có năm ở bước giữa); nước cuối tạo năm bị chặn hai đầu → hoà;
  - `parseCaroOptions`: thiếu khoá → mặc định; `17`, `"15"`, khoá lạ, không phải object → `null`.
- **Hợp đồng**: `describeGameContract(caro, …)` cho bốn tổ hợp `size × rule`, mỗi tổ hợp trong `describe` riêng; `maxPlies = size²`. Ước tính ban đầu ~1–4 giây với 3 seed cho tổ hợp mặc định và 2 seed cho ba tổ hợp kia.
  - **Số đo (task 1.4)**: với 3 + 2 + 2 + 2 seed, phần hợp đồng mất **~7,4 giây** (cả file `rules.test.ts` 7,4–7,7 giây). Gần hết thời gian là của bộ kiểm tra chứ không phải của luật: 3 ván ngẫu nhiên 15×15 (~380 nước) mất ~8 ms khi không đóng băng, ~108 ms khi đóng băng sâu (19×19: ~7 ms và ~224 ms), vì danh sách ~200–360 nước hợp lệ bị đóng băng ở mỗi lần gọi. Kiểm tra chậm nhất là `candidate-moves` (~0,5 giây cho một ván 19×19).
  - **Đã chỉnh**: 2 seed cho tổ hợp mặc định (15×15, `blocked-ends`), 1 seed cho mỗi tổ hợp còn lại: phần hợp đồng **~3,7–4,0 giây** (2 lần đo), cả file ~3,9 giây. `timeout` mỗi kiểm tra 10 giây (kiểm tra chậm nhất ~0,5 giây ở máy bàn, dư cho CI chậm hơn vài lần).
- **AI** (`ai.test.ts`):
  - tập nước: bàn trống → ô giữa; chỉ ô trong bán kính 2; ô bắt buộc của **cả hai bên** dù vượt giới hạn; ô chặn ngoài đầu (`O X X X X _ _`); **ở mép và góc**: X ở hàng 1 cột 2–5, O ở (1,6) → (1,1) là ô bắt buộc; tất định;
  - `evaluate`: cửa sổ bị chặn hai đầu không tính ở `blocked-ends` nhưng tính ở `free`; đối xứng dấu;
  - hành vi: Vừa chặn bốn bị chặn một đầu, bốn có khe, và bốn sát mép (X cột 2–5 hàng 1, máy cầm O đặt (1,1)); Vừa/Khó chớp nước thắng ngay, kể cả ô thắng ở góc; Dễ chỉ đi trong tập; số lần `evaluate` ≤ `r·(c+1)` (§2.5).
- **Bàn** (`Board.test.tsx`, `renderWithIntl`, `getByRole`): tên đọc được; nước vừa đi và hàng thắng có mô tả; mũi tên/Home/End, một điểm dừng Tab, focus ở lại sau khi đặt; chạm hai lần khi ô < 24 px (giả `ResizeObserver` và `pointerType`), chuột đặt ngay, **chạm rồi Enter đặt ngay**, ô chọn bị bỏ khi bàn đổi hoặc bị khoá; `PlayScreen` với Cờ caro chỉ có một `role="status"`.
- **Nhãn nước đi**: 19×19 ô 360 → "hàng 19, cột 19"; 15×15 ô 224 → "hàng 15, cột 15"; Tic-tac-toe không đổi.
- **E2E** (`play-caro.spec.ts`, cả hai cấu hình máy):
  - cùng máy tới khi X thắng, thấy hàng thắng; đi một nước bằng bàn phím; bàn 15×15 ở khung 360 px không cuộn ngang;
  - **máy mức Vừa chặn bốn, tất định**: `writeSaved` ghi vào slot `caro:ai` một ván dở (biên bản + `settings` mức Vừa, người chơi cầm X) mà X đã có ba quân liền bị O chặn một đầu; người chơi đặt quân thứ tư; ô duy nhất không thua của máy là đầu kia, nên kết quả không phụ thuộc `cryptoRng`; assert máy đặt O ở đó. Ở `blocked-ends`, chuỗi giữa bàn còn có ô "giết" (§2.3) nên ô chặn **không** duy nhất; vì vậy chuỗi nằm sát mép phải: X ở hàng 8 cột 11–13, O ở cột 10, người chơi đặt cột 14; năm quân sẽ chạm mép (mép không chặn) nên không có ô "giết", ô duy nhất không thua của máy là cột 15;
  - online hai trình duyệt một ván ngắn với luật mặc định.

## Risks / Trade-offs

- **Giới hạn số ô làm máy bỏ sót nước hay ở tầm xa** → mức Khó yếu hơn người giỏi. Chấp nhận cho MVP; chỉnh `CANDIDATE_LIMIT`/bảng điểm sau khi chơi thử.
- **`evaluate` theo cửa sổ không thấy đòn kép** (ba-ba, bốn-ba) ngoài tầm tìm kiếm. Chấp nhận; tìm kiếm chuỗi đe doạ (VCF) để sau.
- **Chạm hai lần là cách đi lạ** → dòng gợi ý hiện khi đang có ô chọn; chỉ áp dụng khi ô < 24 px và bằng ngón tay.
- **Trình đọc màn hình trên điện thoại** (VoiceOver, TalkBack): thao tác chạm-hai-lần-để-kích-hoạt của chúng có thể sinh `pointerdown` với `pointerType` "touch" (chưa kiểm), khiến người dùng trình đọc màn hình phải kích hoạt hai lần. Chưa có thiết bị để thử; ghi nhận và kiểm khi chơi thử trên máy thật, nếu đúng thì nhận diện thêm (ví dụ `click` không kèm `pointerdown` gần đó → đặt ngay).
- **Máy mức Khó sát hạn 2 giây** (§2.5) → đo trước, nếu vượt thì giảm thời gian của Khó cho game bàn lớn ở change sau.
- **Bàn nhỏ trên điện thoại khó nhìn** dù chạm đúng → phóng to của trình duyệt vẫn dùng được.

## Migration Plan

Không có dữ liệu cũ. Thêm game vào registry; ván lưu và phòng của Tic-tac-toe không bị ảnh hưởng.

## Open Questions

(không có)
