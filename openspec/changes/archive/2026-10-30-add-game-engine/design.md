# Design

## Context

- `packages/engine` hiện chỉ có `src/index.ts` rỗng; ESLint đã chặn engine import React/Next/DOM và import package khác của workspace (plan.md §3.1). Test chạy bằng `createVitestConfig()` môi trường `node`. ESLint dùng `tseslint.configs.strictTypeChecked`, trong đó `@typescript-eslint/unbound-method` là `error`.
- Package trong workspace xuất thẳng mã nguồn TypeScript qua trường `exports` (không có bước build); app dùng `transpilePackages`.
- Engine sẽ được dùng ở bốn nơi: giao diện chơi (React), Web Worker AI (M2), server online (M4, Vercel Functions không giữ state, ván nằm trong Redis), và test. Vì vậy mọi dữ liệu đi qua engine phải là dữ liệu thuần, chuyển JSON được và gửi qua `postMessage` được; dữ liệu đọc lại từ IndexedDB, mạng hay Redis là dữ liệu không tin cậy.
- Yêu cầu hành vi: xem `specs/game-engine/spec.md`.

## Goals / Non-Goals

**Goals:**

- API nhỏ, toàn hàm thuần, dễ giữ trong một store của app, dễ gửi sang Worker/server.
- Thêm một game chỉ cần một object cài `GameDefinition`; không game nào phải sửa engine.
- Định dạng biên bản và hợp đồng game đủ chỗ cho M2–M7 bằng thay đổi chỉ thêm, không phải đổi định dạng.
- Bộ kiểm tra hợp đồng dùng lại được cho mọi game với một dòng gọi.

**Non-Goals:**

- Tối ưu hiệu năng cho AI (bảng băm vị trí, nước đi tăng dần): để M2 khi có số đo thật.
- Kiểm tra dữ liệu bằng thư viện schema (zod) bên trong engine: engine không có phụ thuộc ngoài; zod dùng ở biên của app (đọc IndexedDB, nhận thông điệp mạng). Engine tự kiểm tra phần luật của dữ liệu (cấu trúc biên bản, tuỳ chọn, nước đi, kết quả ngẫu nhiên).

## Decisions

### 1. Hàm thuần + giá trị bất biến, không dùng class

`Session` là một object thuần (không method, không giữ tham chiếu tới `GameDefinition`, chỉ giữ `gameId`). Mọi thao tác là hàm thuần; hàm cần chạy luật nhận `game` làm tham số đầu:

```ts
createSession(game, init: { playerCount: number; options?: Options }): Result<Session>
playMove(game, session, move: unknown, rng: Rng): Result<Session>
applyEntry(game, session, rawEntry: unknown): Result<Session> // mục { move, outcome? } chơi ở nơi khác
undo(session): Result<Session>
redo(session): Result<Session>
canUndo(session): boolean
canRedo(session): boolean
currentState(session): State
activeEntries(session): readonly HistoryEntry[] // entries đến cursor, không gồm nước đã hoàn tác
lastEntry(session): HistoryEntry | null
sessionResult(game, session): GameResult | null
toRecord(session): GameRecord
fromRecord(game, raw: unknown): Result<Session>
parseGameOptions(game, raw: unknown): Result<Options>
```

`playMove` nhận `move: unknown` vì nước đi có thể đến từ mạng; engine tự đối chiếu với `legalMoves` (quyết định 8). `undo`/`redo` không cần `game` vì dùng ảnh chụp trạng thái (quyết định 6). `playMove` và `applyEntry` trả `game-mismatch` khi `session.gameId !== game.id`, thay vì xét nước đi bằng luật sai; `sessionResult` không có kênh trả lỗi nên chỉ ghi trong JSDoc rằng nơi gọi phải ghép đúng game.

`Session` là dữ liệu **tin cậy**: chỉ các hàm của engine tạo ra và không hàm nào kiểm tra lại một `Session` được truyền vào (ví dụ `cursor` sai làm `currentState` ném lỗi). Nó đi qua `postMessage` sang Worker và nằm trong store của app; mọi thứ lưu xuống hoặc nhận từ bên ngoài đi dưới dạng `GameRecord` (`toRecord`/`fromRecord`), vốn được kiểm tra từng mục.

`activeEntries`/`lastEntry` có vì `session.entries` gồm cả nước đã hoàn tác: nơi gọi tự cắt `entries.slice(0, cursor)` thì dễ quên, và giao diện liệt kê thẳng `entries` sẽ hiện nhầm nước đã hoàn tác.

- _Vì sao_: chuyển JSON/`postMessage` được, so sánh bằng tham chiếu để React render lại đúng lúc, server M4 dựng phiên từ Redis rồi bỏ đi sau mỗi request.
- _Đã cân nhắc_: class `GameSession` có method và trạng thái nội bộ thay đổi được — gọn khi gọi nhưng không serialize được, dễ lỗi khi React giữ tham chiếu cũ; `Session` giữ luôn `game` để khỏi truyền — mất tính chuyển JSON.

### 2. Lỗi là giá trị trả về có mã, không ném exception

Mọi hàm có thể thất bại trả `Result<T> = { ok: true; value: T } | { ok: false; error: EngineErrorCode }`. Mã lỗi khai báo bằng object `as const` (`ENGINE_ERROR`): `invalid-player-count`, `invalid-options`, `illegal-move`, `game-over`, `nothing-to-undo`, `nothing-to-redo`, `game-mismatch`, `corrupt-record`, `unsupported-record-version`.

- _Vì sao_: nước đi sai là chuyện bình thường (người chơi bấm nhầm, client online gửi nước cũ), không phải lỗi bất thường; mã lỗi để app dịch qua bản dịch, đúng bất biến "packages không chứa chữ hiển thị". Tách `unsupported-record-version` khỏi `corrupt-record` để server và app phân biệt "dữ liệu hỏng" với "dữ liệu của định dạng khác".
- _Đã cân nhắc_: `throw` lớp lỗi riêng — buộc mọi nơi gọi phải `try/catch` và dễ quên. Hai chiều ngược nhau: (1) với dữ liệu không tin cậy, `fromRecord` và `applyEntry` bắt **mọi** exception (hàm luật nghẹn vì dữ liệu rác, dữ liệu ném lỗi ngay khi đọc) và đổi thành `corrupt-record` / `illegal-move`; (2) lỗi lập trình của chính game — trọng số kết quả ngẫu nhiên không phải số nguyên dương, `Rng` trả giá trị ngoài khoảng — làm `playMove` ném exception, vì đó không phải chuyện bình thường của ván chơi và bộ kiểm tra hợp đồng phải bắt được trước khi game vào app.
- Không thêm mã lỗi cho `applyEntry`: mục có kết quả ngẫu nhiên sai cũng là "nước đi không hợp lệ" (`illegal-move`); client M4 xử lý mọi lỗi ở đây như nhau (xin lại biên bản).

### 3. Hình dạng `GameDefinition`

```ts
type GameId = string; // kebab-case; packages/games suy ra union mã đã đăng ký
type PlayerIndex = number; // 0..playerCount-1; app tự gán tên hiển thị (X/O, màu ngựa…)
type GameResult =
  | { kind: "win"; winners: readonly PlayerIndex[]; reason?: string }
  | { kind: "draw"; reason?: string }; // reason: mã do game đặt ("checkmate", "stalemate"…), app dịch
type WeightedOutcome<Outcome> = { outcome: Outcome; weight: number }; // weight nguyên dương
type HistoryEntry<Move, Outcome> = { move: Move; outcome?: Outcome };

interface GameDefinition<
  State,
  Move,
  Outcome = never,
  Options extends object = Record<string, never>,
> {
  readonly id: GameId;
  readonly meta: GameMeta; // players {min,max}, category, durationMinutes, supportsAI
  readonly defaultOptions: Options;
  parseOptions?(this: void, raw: unknown): Options | null; // không khai báo: chỉ nhận {}
  setup(this: void, ctx: { playerCount: number; options: Options }): State; // tất định
  currentPlayer(this: void, state: State): PlayerIndex;
  legalMoves(this: void, state: State): readonly Move[];
  outcomes?(this: void, state: State, move: Move): readonly WeightedOutcome<Outcome>[]; // [] = không ngẫu nhiên
  applyMove(this: void, state: State, move: Move, outcome?: Outcome): State; // tất định
  result(this: void, state: State): GameResult | null;
  evaluate?(this: void, state: State, player: PlayerIndex): number; // cho AI ở M2
  moveKey?(this: void, move: Move): string; // mặc định: JSON ổn định
}

type AnyGameDefinition = GameDefinition<unknown, unknown, unknown, object>;
```

- Khai báo bằng cú pháp method nên TypeScript so tham số theo kiểu hai chiều: mọi game gán được vào `AnyGameDefinition` mà không cần `any` (đã thử với TypeScript 6 `strict`). `this: void` trên mọi method để `unbound-method` không báo khi tách hàm ra (`legalMoves.map(game.moveKey)`, `const { applyMove } = game`, truyền `game.evaluate` cho AI); `this: void` không làm mất cách so hai chiều.
- Game khai báo bằng `export const tictactoe = { id: "tictactoe", … } as const satisfies GameDefinition<…>` để `id` giữ kiểu literal (chỉ `satisfies` thì `id` bị nới thành `string`); `packages/games` suy ra `RegisteredGameId` từ danh sách game (xem change `add-tictactoe-game`). Engine chỉ định nghĩa `GameId` cơ sở.
- `GameResult` có trường phân biệt `kind` để app `switch` đủ trường hợp; `reason` tuỳ chọn để cờ vua (M7) phân biệt chiếu bí, hết nước, lặp ba lần, luật 50 nước mà không đổi kiểu.
- `Options` mặc định là `Record<string, never>` (object rỗng) thay cho `void`: `JSON.stringify` giữ được khoá `options`, kiểm tra cấu trúc biên bản không phải chấp nhận khoá vắng, hợp với `exactOptionalPropertyTypes`.
- Thứ tự tham số kiểu là `<State, Move, Outcome, Options>` (khác phác thảo `<S, M, O = Options>` ở plan.md §3.4); task 7.2 cập nhật plan.md để tránh nhầm `O`.
- Các hàm công khai nhận `game` (`createSession`, `playMove`, `applyEntry`, `fromRecord`, `sessionResult`, `playRandomGame`) đặt mặc định tham số kiểu `Outcome = never`: game không có `outcomes` không cho TypeScript gì để suy ra `Outcome`, và nếu rơi về `unknown` thì lịch sử của nó (`HistoryEntry<Move, unknown>`) không gán được cho `HistoryEntry<Move, never>` mà `BoardProps` của `add-tictactoe-game` dùng.
- _Đã cân nhắc_: khai báo bằng thuộc tính kiểu hàm (`applyMove: (…) => State`) — hết cảnh báo `unbound-method` nhưng bị so ngược chiều, không gán được vào danh sách chung; tham số kiểu `Id extends string` riêng cho mã game — thêm một tham số kiểu cho mọi chỗ dùng, trong khi `as const satisfies` đủ và có test kiểu bắt trường hợp quên.

### 4. Ngẫu nhiên: game liệt kê kết quả, engine chọn, kết quả chốt vào nước đi

Một mục lịch sử là `{ move, outcome? }`. Khi người chơi đi, `playMove` đối chiếu `move` với `legalMoves`, rồi lấy `list = game.outcomes?.(state, move) ?? []`. Nếu `list` rỗng thì nước không có ngẫu nhiên; nếu không, engine chọn một phần tử theo trọng số bằng `rng.nextInt(0, tổngTrọngSố - 1)` và ghi `outcome` vào mục lịch sử, rồi gọi `applyMove(state, move, outcome)`. Làm lại và phát lại dùng `outcome` đã lưu; phát lại kiểm tra `outcome` có mặt khi và chỉ khi `list` không rỗng và trùng khoá với một phần tử của `list`.

- `playMove`, `applyEntry` và phát lại trong `fromRecord` dùng chung một bước nội bộ (`step`: kiểm `game-over` → đối chiếu nước đi → lấy `list` → kiểm trọng số → chốt kết quả → `applyMove`); chỉ khác chỗ lấy kết quả: `playMove` rút bằng `rng`, hai đường còn lại lấy từ mục nhận vào. Nhờ vậy ba đường không thể lệch nhau, và client M4 nhận `{ move, outcome }` từ server áp dụng bằng `applyEntry` thay vì dựng lại cả ván.
- Trọng số phải là số nguyên dương; `step` ném exception nếu không (quyết định 2). Vì vậy kết quả trọng số 0 — không bao giờ rút ra được khi chơi — cũng không lọt qua phát lại.
- `rng` là tham số của `playMove`, không nằm trong `Session` hay biên bản. App truyền rng dựa trên `crypto.getRandomValues`, server M4 truyền nguồn ngẫu nhiên của server, test và AI dùng `createRng(seed)`.
- Ngẫu nhiên lúc tạo ván (chọn người đi trước "Ngẫu nhiên" ở idea.md §5, xáo bài) do nơi gọi quyết định rồi đưa vào `options` (ví dụ `firstPlayer`), nên `setup` luôn tất định và kết quả nằm sẵn trong biên bản. Gieo chọn người đi trước kiểu cá ngựa thì mô hình hoá bằng nước gieo như mọi nước khác.
- _Vì sao_: `applyMove` hoàn toàn tất định nên phát lại, kết nối lại, server kiểm tra đều cho cùng kết quả; kiểm tra hợp lệ luôn làm trên `move` (ý định); kết quả trong biên bản không tin cậy kiểm tra được; expectimax (M2/M6) đọc thẳng phân phối từ `outcomes`; game không tự gọi được `Math.random` ở bước gieo vì engine mới là bên chọn. Online (M4): client gửi `move`, server gọi `playMove` với rng của server rồi phát `{ move, outcome }`; client không có seed hay trạng thái rng nào để đoán trước xúc xắc.
- _Đã cân nhắc_: (a) `applyMove(state, move, rng)` — phát lại phải tái tạo đúng chuỗi rng; (b) rng sinh theo `hash(seed, số thứ tự nước)` — lộ seed cho client; (c) `roll(state, move, rng)` để game tự gieo, kèm `rngState` lưu trong phiên và biên bản (bản design trước) — server gửi biên bản cho client khi kết nối lại là lộ trạng thái rng (mulberry32 chỉ 32 bit), `RoomStore.appendMove` không có chỗ cập nhật `rngState` nguyên tử, engine không kiểm được `outcome` trong biên bản, và game vẫn có thể gọi `Math.random` trong `roll` mà phát lại không phát hiện. Đánh đổi của cách chọn: không gian kết quả phải liệt kê được (xúc xắc, đồng xu); game nào cần không gian quá lớn (xáo cả bộ bài giữa ván) sẽ thêm một hàm lấy mẫu tuỳ chọn kèm hàm kiểm tra — thay đổi chỉ thêm.

### 5. Bộ sinh ngẫu nhiên có seed: mulberry32

`Rng = { nextInt(this: void, min: number, max: number): number; nextFloat(this: void): number }`. `createRng(seed)` (mulberry32) trả một `Rng` có trạng thái riêng trong closure. Dùng cho test, bộ kiểm tra hợp đồng và AI; engine không tự đọc nguồn ngẫu nhiên nào, và không xuất trạng thái rng ra ngoài vì không còn chỗ nào lưu nó. `seed` phải là số nguyên (`1.9` hay `NaN` ném `RangeError` thay vì lặng lẽ thành seed `1` hay `0`) và được lấy theo modulo 2^32. `nextInt` từ chối khoảng rộng hơn 2^32 giá trị: một lần rút 32 bit không phủ hết khoảng đó (với `[0, 2^33)` không bao giờ ra số lẻ), và không game nào cần.

- _Vì sao_: đủ đều cho chọn nước ngẫu nhiên trong test và AI, vài dòng code, tái lập được theo seed.
- _Đã cân nhắc_: `crypto.getRandomValues` trực tiếp trong engine — không tái lập được trong test và làm engine tự đọc nguồn ngẫu nhiên; sfc32/xoshiro — chất lượng cao hơn nhưng không cần ở quy mô này. Không dùng cho mục đích bảo mật; xúc xắc thật trong app và server dùng nguồn từ `crypto`.

### 6. Hoàn tác bằng ảnh chụp trạng thái

`Session = { gameId, playerCount, options, states, entries, cursor }`: `entries` là mọi nước đã đi kể cả nước đã hoàn tác, `states[i]` là trạng thái sau `i` nước, `cursor` là số nước đang có hiệu lực. Hoàn tác/làm lại chỉ dời `cursor` (O(1)); nước đi mới cắt bỏ phần sau `cursor` (bỏ nhánh làm lại).

- _Vì sao_: luật thuần nên ảnh chụp không bao giờ bị sửa; hoàn tác/làm lại không gọi lại luật nên không cần `game` và không thể thất bại vì luật; ván cờ vài trăm nước vẫn nhỏ.
- _Đã cân nhắc_: phát lại từ đầu mỗi lần hoàn tác — ít bộ nhớ hơn nhưng O(n) mỗi lần và cần `game`; với ván vài trăm nước thì tốc độ không đáng kể, lý do chọn ảnh chụp là sự đơn giản. (AI ở M2 làm việc trực tiếp trên `State`, không đi qua `Session`, nên không phải lý do.)

### 7. Biên bản ván

```ts
interface GameRecord<Move, Outcome, Options> {
  version: 1;
  gameId: GameId;
  playerCount: number;
  options: Options;
  entries: readonly HistoryEntry<Move, Outcome>[]; // chỉ các nước đang có hiệu lực, không gồm nước đã hoàn tác
}
```

`fromRecord(game, raw)` coi `raw` là dữ liệu không tin cậy, kiểm tra theo thứ tự:

1. Cấu trúc bằng hàm kiểm tra viết tay (không thêm thư viện). `version` là số khác 1 → `unsupported-record-version`; sai cấu trúc → `corrupt-record`.
2. Sai mã game → `game-mismatch`.
3. `playerCount` ngoài khoảng của game, `options` không qua `parseGameOptions` → `corrupt-record`.
4. Phát lại từng mục: nước đi phải khớp khoá một nước trong `legalMoves` (và được thay bằng chính nước đó), `outcome` phải hợp lệ theo quyết định 4.

Toàn bộ thân hàm (cả bước 1–3) bọc `try/catch`: hàm luật ném lỗi vì dữ liệu rác, hoặc dữ liệu ném lỗi ngay khi đọc (getter, Proxy — chỉ code cùng tiến trình truyền được, JSON và structured clone không mang theo) → `corrupt-record`. Phát lại đẩy trạng thái và mục vào mảng cục bộ rồi tạo `Session` một lần, nên thời gian tỉ lệ thuận với số mục (trước đây chép lại lịch sử ở mỗi mục: 40 000 mục mất 12 s, đủ để một biên bản độc làm nghẽn server M4). Giới hạn số mục tối đa thuộc biên của server (schema zod của `packages/protocol` ở M4), không đặt trong engine (Ngoài phạm vi trong tasks.md).

Trường `version` để đổi định dạng sau này mà vẫn đọc được bản cũ hoặc từ chối rõ ràng. Biên bản không chứa trạng thái rng (quyết định 4) nên gửi cho client online được.

Mở rộng đã tính trước, đều là thay đổi chỉ thêm (biên bản `version: 1` cũ vẫn hợp lệ): mục kết thúc ngoài luật `{ type: "end"; result }` cho đầu hàng/hết giờ/đồng ý hoà (mục không có `type` là nước đi), và `rulesVersion` tuỳ chọn (thiếu thì coi là 1). Xem Open Questions.

- _Đã cân nhắc_: thêm ngay mục `{ type: "end" }` và kiểu `ranking` — định dạng "có chỗ" nhưng chưa có game hay luồng nào tạo ra để test; vì mở rộng sau không phá biên bản cũ nên hoãn tới M4 / M6.

### 8. So sánh nước đi bằng khoá chuỗi, lưu nước của luật

Nước đi hợp lệ được so bằng `moveKey(move)`; mặc định là JSON với khoá object được sắp xếp (không phụ thuộc thứ tự khoá — nước đi nhận từ mạng có thể khác thứ tự). Game có nước đi phức tạp có thể tự cung cấp `moveKey`. Khi khớp khoá, phiên lưu và áp dụng **chính phần tử trong `legalMoves`**, không lưu object nhận vào; nhờ vậy trường thừa trong dữ liệu từ mạng (khớp khoá tự viết như `"e2e4"`) không lọt vào `applyMove`, Redis hay lịch sử. `moveKey` tự viết gặp dữ liệu rác mà ném lỗi thì engine bắt và trả `illegal-move` (hoặc `corrupt-record` khi phát lại).

`stableStringify` (khoá mặc định) phải phân biệt được mọi giá trị JSON khác nhau: lỗ trong mảng ghi thành `null` như `JSON.stringify` (trước đây `[,]` thành `"[]"`, trùng khoá với `[]`), và object không thuần (`Date`, `Map`…) làm nó ném lỗi thay vì cùng thành `"{}"` — với nước đi nhận vào, lỗi đó nghĩa là `illegal-move`.

### 9. Tuỳ chọn luật

`defaultOptions` bắt buộc để màn hình chơi dùng chung tạo được ván mới cho mọi game mà không biết tuỳ chọn của game. `parseGameOptions(game, raw)` gọi `game.parseOptions` nếu có (trả `null` hoặc ném lỗi → `invalid-options`); game không khai báo `parseOptions` thì có đúng một bộ tuỳ chọn là `defaultOptions`, nên chỉ nhận giá trị bằng nó (so bằng `stableStringify`) và trả lại chính object của game. `createSession` không truyền `options` thì dùng `defaultOptions`; có truyền thì cũng đi qua `parseGameOptions`. `fromRecord` dùng cùng hàm này, nên khi `LudoOptions` thêm trường ở v1, `parseOptions` điền mặc định cho biên bản cũ hoặc phòng đang chạy.

- _Đã cân nhắc_: tin `options` vì đã có kiểu TypeScript — sai với biên bản cũ và với options client gửi lên ở M4; bắt buộc mọi game khai báo `parseOptions` — thừa cho game không có tuỳ chọn. Bản đầu "không có `parseOptions` thì chỉ nhận `{}`" sai với game có `defaultOptions` khác rỗng: `createSession(game, { playerCount })` trả `invalid-options` (trái scenario "Không truyền tuỳ chọn thì dùng mặc định"), còn `options: {}` lại được nhận và tạo biên bản mà `fromRecord` từ chối. Cũng đã cân nhắc luật ở mức kiểu (bắt buộc `parseOptions` khi `Options` không phải `Record<string, never>`): phải đổi `GameDefinition` từ interface sang kiểu điều kiện, dễ phá cách so hai chiều của `AnyGameDefinition` (quyết định 3) và vẫn hở khi mọi trường của `Options` là tuỳ chọn; luật lúc chạy đơn giản và đúng cho mọi trường hợp.
- Bộ kiểm tra hợp đồng có kiểm tra `default-options`: `defaultOptions` là dữ liệu thuần, qua JSON rồi `parseGameOptions` vẫn được nhận và không đổi. Trước đây bộ kiểm tra chỉ dùng `config.options ?? defaultOptions`, nên game có `parseOptions` từ chối chính mặc định của nó vẫn vượt bộ kiểm tra.

### 10. Bộ kiểm tra hợp đồng ở điểm vào riêng

`@board-games/engine/testing` xuất `describeGameContract(game, { seeds, playerCounts?, maxPlies, options?, timeout? })`, dùng `describe/it` của Vitest. Điểm vào chính `@board-games/engine` không import Vitest, nên app và server không kéo Vitest vào bundle; Vitest khai báo là `peerDependencies` tuỳ chọn của engine. Không truyền `playerCounts` thì chơi với mọi số người từ `meta.players.min` tới `max` (cá ngựa 2–4 người không bị quên trường hợp 3 người); `timeout` là giới hạn thời gian của mỗi `it` cho game có ván dài (mặc định của Vitest là 5 s).

Với mỗi seed và số người, bộ kiểm tra tự chơi một ván (chọn nước và chọn kết quả ngẫu nhiên bằng `createRng(seed)`, hỏi `currentPlayer` ở mỗi trạng thái như app) đến khi kết thúc hoặc vượt `maxPlies`. Các kiểm tra, mỗi kiểm tra một `it` có tên chỉ ra yêu cầu (mã ở `CONTRACT_CHECK`):

- `playable`: ván bắt đầu được với tuỳ chọn của bộ kiểm tra và chơi hết mà luật không ném lỗi.
- `default-options`: `defaultOptions` là dữ liệu thuần, qua JSON rồi `parseGameOptions` vẫn được nhận và không đổi (quyết định 9).
- `terminates`: ván kết thúc trong `maxPlies` (ván "kẹt" — chưa có kết quả mà hết nước — thuộc `result-matches-moves`).
- `deterministic-setup`: `setup` gọi hai lần cho hai trạng thái bằng nhau.
- `no-mutation`: luật không sửa bất cứ thứ gì nó nhận. Mọi giá trị luật trả về (trạng thái từ `setup`/`applyMove`, danh sách từ `legalMoves`/`outcomes`, cả ngữ cảnh của `setup`) được đóng băng sâu **ngay khi tạo ra**, trước khi bất kỳ hàm luật nào đọc tới, nên cả việc ghi nhớ vào trạng thái trong `legalMoves` hay sửa object nước đi cũng ném lỗi. `deepFreeze` luôn đi xuống con (dùng `WeakSet` các cây đã đóng băng sâu để chặn vòng lặp và bỏ qua phần dùng chung giữa các trạng thái), không dừng ở object đã `Object.freeze` nông; mảng có kiểu (`Uint8Array`) không đóng băng được nên bỏ qua (thuộc `plain-data`).
- `deterministic-apply`: áp cùng nước và cùng kết quả hai lần cho hai trạng thái bằng nhau; `outcomes` gọi hai lần cho cùng danh sách.
- `deterministic-queries`: `legalMoves` (cả thứ tự), `result` và `currentPlayer` gọi hai lần ở mỗi trạng thái cho cùng câu trả lời.
- `result-matches-moves`: `result == null ⇔ legalMoves` không rỗng, ở mọi trạng thái.
- `unique-move-keys`: khoá của các nước trong `legalMoves` đôi một khác nhau.
- `players-in-range`: `currentPlayer` nằm trong `[0, playerCount)` khi ván chưa kết thúc; kết quả thắng có ít nhất một người thắng, mọi người thắng nằm trong khoảng đó và không trùng.
- `valid-outcomes`: với **mọi** nước hợp lệ (trước khi đi), trọng số nguyên dương và các kết quả khác khoá nhau.
- `plain-data`: trạng thái, nước đi, kết quả là dữ liệu thuần — qua JSON vẫn y nguyên: bắt instance class, hàm, `Map`, `undefined`, số không hữu hạn, `-0`, lỗ trong mảng, thuộc tính symbol hoặc không liệt kê được; cần cho Worker (M2) và Redis (M4).
- `record-round-trip`: biên bản cuối chuyển JSON → đọc lại → `fromRecord` cho cùng trạng thái, cùng người đến lượt, cùng lịch sử.
- `ai-has-evaluate`: `meta.supportsAI` thì phải có `evaluate` (M6 nới thành "có `evaluate` hoặc `policy`" khi thêm `policy`).

**Mỗi vi phạm chỉ làm thất bại kiểm tra của nó.** Mỗi kiểm tra chơi ván với dữ liệu đóng băng; điều kiểm tra phát hiện (`Finding`) được báo ngay, vì dữ liệu đóng băng thì không đột biến nào làm sai được thứ nó nhìn thấy. Còn khi luật ném exception (kể cả bên trong hook của kiểm tra), bộ kiểm tra chơi lại ván đó không kèm kiểm tra nào: chơi đóng băng hỏng mà không đóng băng thì xong → ván "đột biến", chỉ `no-mutation` báo; hỏng cả hai → ván "không chơi được", chỉ `playable` báo; các kiểm tra khác bỏ qua ván đó. Kiểm tra so sánh hai giá trị (tất định, biên bản) coi giá trị không thuần là "không so được" và để `plain-data` báo. Trước đây mọi lỗi trong lúc chơi bị gắn nhãn của kiểm tra đang chạy, nên một game không chơi được làm cả mười kiểm tra thất bại với cùng một thông báo.

Engine tự kiểm thử bộ này bằng hai game giả trong thư mục test — một game đếm số không ngẫu nhiên (có `moveKey` tự viết) và một game đua xúc xắc 2–4 người có tuỳ chọn luật và `outcomes` — cộng, cho **mỗi** kiểm tra trên, ít nhất một biến thể lỗi tạo bằng cách ghi đè hàm của game giả (`{ ...counterGame, applyMove: mutatingApplyMove }`). Test khẳng định biến thể làm thất bại đúng kiểm tra của nó **và mọi kiểm tra khác vượt qua**, trừ những kiểm tra mà vi phạm tất yếu kéo theo, được liệt kê kèm lý do (`applyMove` không tất định thì biên bản dựng lại cũng khác; trọng số không nguyên thì engine từ chối rút nên ván không chơi được).

- _Đã cân nhắc_: chơi mỗi ván một lần, ghi lại vết rồi chạy mọi kiểm tra trên vết (nhanh hơn khoảng 14 lần vì hiện mỗi kiểm tra tự chơi lại) — hoãn tới khi có số đo của cờ vua/cá ngựa (Ngoài phạm vi trong tasks.md); bộ kiểm tra của hai game giả hiện chạy dưới 0,5 s. Tự chơi mỗi seed hai lần rồi so biên bản để bắt luật không tất định — gọi hai lần mỗi hàm truy vấn ở từng trạng thái bắt được cùng loại lỗi, rẻ hơn và chỉ ra đúng hàm.

### 11. Bố cục file

```
packages/engine/src/
  index.ts                 điểm vào chính
  types.ts                 GameDefinition, AnyGameDefinition, GameMeta, GameResult, PlayerIndex, GameId,
                           HistoryEntry, WeightedOutcome, Rng
  constants.ts             GAME_CATEGORY (theo plan.md §4.2)
  errors.ts                ENGINE_ERROR, Result, ok(), err()
  rng.ts                   createRng (mulberry32)
  move-key.ts              stableStringify, khoá nước đi mặc định
  options.ts               parseGameOptions
  guards.ts                isPlainObject (nội bộ)
  session.ts               createSession, playMove, applyEntry, undo, redo, canUndo, canRedo, currentState,
                           activeEntries, lastEntry, sessionResult; nội bộ: startSession, replayEntry, step
  record.ts                toRecord, fromRecord, kiểm tra cấu trúc
  testing/                 describeGameContract, deepFreeze, playRandomGame (generic, tuỳ chọn `freeze`),
                           contract-checks (CONTRACT_CHECK), plain-data (findNonPlainData, deepEqual)
  test-fixtures/           game giả cho test của chính engine (biến thể lỗi nằm trong contract-checks.test.ts)
```

Mỗi file có test đặt cạnh (`*.test.ts`).

## Risks / Trade-offs

- [Rng không gắn với phiên nên ở chế độ cùng máy có thể "hoàn tác để gieo lại"] → Chấp nhận ở engine; có cấm hay không là câu hỏi sản phẩm (Open Questions). Online thì hoàn tác cần đối thủ đồng ý.
- [Ảnh chụp trạng thái tốn bộ nhớ nếu trạng thái lớn] → Trạng thái các game MVP đều nhỏ (bàn ≤ 19×19); đo lại ở M2 nếu cần.
- [JSON ổn định làm khoá có thể chậm khi `legalMoves` dài (cờ vây)] → Game được tự cung cấp `moveKey`; tối ưu khi có số đo.
- [`outcomes` buộc liệt kê hết kết quả] → Đủ cho xúc xắc (kể cả hai con: 36 kết quả); hàm lấy mẫu tuỳ chọn thêm sau nếu có game cần (quyết định 4).
- [`describeGameContract` phụ thuộc Vitest] → Chỉ ở điểm vào `./testing`; nếu đổi thư viện test thì chỉ sửa một thư mục.
- [Sửa luật của một game khi còn ván lưu hoặc phòng sống trong Redis (TTL 7 ngày) có thể làm phát lại ra trạng thái khác] → Phát lại kiểm tra từng nước nên phần lớn trường hợp thành `corrupt-record` (ván bị bỏ), không im lặng; `rulesVersion` thêm khi lần đầu cần (Open Questions).
- [Biên bản độc rất dài làm server tốn CPU khi `fromRecord`] → Phát lại đã tuyến tính (quyết định 7); giới hạn số mục đặt ở biên của server M4 (schema thông điệp, giới hạn kích thước request), không trong engine.
- [`Session` không được kiểm tra khi truyền vào; `Session` hỏng (ví dụ `cursor` sai) làm `currentState` ném lỗi] → Chấp nhận: `Session` chỉ do engine tạo và chỉ đi qua bộ nhớ / `postMessage`; dữ liệu từ ngoài luôn đi qua `fromRecord` (quyết định 1).
- [Engine không biết ai gửi nước đi: bất kỳ ai cũng đi được nước của người đang đến lượt] → Đúng phạm vi engine; server M4 so ghế của người gửi với `currentPlayer` trước khi gọi `playMove`.
- [Mỗi kiểm tra hợp đồng tự chơi lại mọi ván (14 kiểm tra × seed × số người), có thể chậm với cờ vua/cá ngựa] → `timeout` cấu hình được; chơi một lần rồi kiểm trên vết khi có số đo (quyết định 10).
- [`no-mutation` dựa vào việc ghi vào object đóng băng thì ném lỗi, tức strict mode] → Mã TypeScript/ES module luôn chạy strict mode; luật viết dạng script không strict mà sửa dữ liệu thì không bị bắt, nhưng cũng không làm hỏng dữ liệu vì object vẫn đóng băng.

## Open Questions

Các câu dưới đây không chặn change này; mỗi câu trả lời đều cài được bằng thay đổi chỉ thêm.

- **Hoàn tác nước có ngẫu nhiên** (cá ngựa, cùng máy): cho phép (hiện tại) hay cấm? Nếu cấm, M6 thêm hook tuỳ chọn kiểu `canUndoEntry?(entry)` vào `GameDefinition`. Cần chủ dự án quyết định.
- **Kết thúc ngoài luật và hoà theo yêu cầu**: đầu hàng/xử thua (M4), đồng ý hoà, hết giờ (v1); cờ vua (M7) tự hoà khi lặp ba lần/luật 50 nước hay người chơi phải đòi (cần chủ dự án quyết định). Cả hai dùng mục biên bản `{ type: "end"; result }` và `reason` của `GameResult`.
- **Xếp hạng** (biến thể cá ngựa #8): thêm trường tuỳ chọn `ranking` vào kết quả `win` khi biến thể được bật (v1).
- **Phiên bản luật**: thêm `rulesVersion` tuỳ chọn vào `GameDefinition` và biên bản khi lần đầu sửa luật của một game đã có ván lưu.
- **AI không dựa trên `evaluate`**: cá ngựa (M6) dùng luật ưu tiên; thêm `policy?` tuỳ chọn và nới kiểm tra `supportsAI` tương ứng.
- **Chi tiết lỗi trong `Failure`**: thêm trường tuỳ chọn (ví dụ `at?: number` — vị trí mục hỏng trong biên bản) khi server M4 cần ghi log; thêm trường tuỳ chọn không phá nơi nào đang dùng `Result`.
