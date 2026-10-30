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
undo(session): Result<Session>
redo(session): Result<Session>
canUndo(session): boolean
canRedo(session): boolean
currentState(session): State
sessionResult(game, session): GameResult | null
toRecord(session): GameRecord
fromRecord(game, raw: unknown): Result<Session>
parseGameOptions(game, raw: unknown): Result<Options>
```

`playMove` nhận `move: unknown` vì nước đi có thể đến từ mạng; engine tự đối chiếu với `legalMoves` (quyết định 8). `undo`/`redo` không cần `game` vì dùng ảnh chụp trạng thái (quyết định 6).

- _Vì sao_: chuyển JSON/`postMessage` được, so sánh bằng tham chiếu để React render lại đúng lúc, server M4 dựng phiên từ Redis rồi bỏ đi sau mỗi request.
- _Đã cân nhắc_: class `GameSession` có method và trạng thái nội bộ thay đổi được — gọn khi gọi nhưng không serialize được, dễ lỗi khi React giữ tham chiếu cũ; `Session` giữ luôn `game` để khỏi truyền — mất tính chuyển JSON.

### 2. Lỗi là giá trị trả về có mã, không ném exception

Mọi hàm có thể thất bại trả `Result<T> = { ok: true; value: T } | { ok: false; error: EngineErrorCode }`. Mã lỗi khai báo bằng object `as const` (`ENGINE_ERROR`): `invalid-player-count`, `invalid-options`, `illegal-move`, `game-over`, `nothing-to-undo`, `nothing-to-redo`, `game-mismatch`, `corrupt-record`, `unsupported-record-version`.

- _Vì sao_: nước đi sai là chuyện bình thường (người chơi bấm nhầm, client online gửi nước cũ), không phải lỗi bất thường; mã lỗi để app dịch qua bản dịch, đúng bất biến "packages không chứa chữ hiển thị". Tách `unsupported-record-version` khỏi `corrupt-record` để server và app phân biệt "dữ liệu hỏng" với "dữ liệu của định dạng khác".
- _Đã cân nhắc_: `throw` lớp lỗi riêng — buộc mọi nơi gọi phải `try/catch` và dễ quên. Ngoại lệ duy nhất: khi phát lại biên bản, mọi exception do hàm luật ném ra (dữ liệu rác lọt qua) được bắt và đổi thành `corrupt-record`.

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
- _Đã cân nhắc_: khai báo bằng thuộc tính kiểu hàm (`applyMove: (…) => State`) — hết cảnh báo `unbound-method` nhưng bị so ngược chiều, không gán được vào danh sách chung; tham số kiểu `Id extends string` riêng cho mã game — thêm một tham số kiểu cho mọi chỗ dùng, trong khi `as const satisfies` đủ và có test kiểu bắt trường hợp quên.

### 4. Ngẫu nhiên: game liệt kê kết quả, engine chọn, kết quả chốt vào nước đi

Một mục lịch sử là `{ move, outcome? }`. Khi người chơi đi, `playMove` đối chiếu `move` với `legalMoves`, rồi lấy `list = game.outcomes?.(state, move) ?? []`. Nếu `list` rỗng thì nước không có ngẫu nhiên; nếu không, engine chọn một phần tử theo trọng số bằng `rng.nextInt(0, tổngTrọngSố - 1)` và ghi `outcome` vào mục lịch sử, rồi gọi `applyMove(state, move, outcome)`. Làm lại và phát lại dùng `outcome` đã lưu; phát lại kiểm tra `outcome` có mặt khi và chỉ khi `list` không rỗng và trùng khoá với một phần tử của `list`.

- `rng` là tham số của `playMove`, không nằm trong `Session` hay biên bản. App truyền rng dựa trên `crypto.getRandomValues`, server M4 truyền nguồn ngẫu nhiên của server, test và AI dùng `createRng(seed)`.
- Ngẫu nhiên lúc tạo ván (chọn người đi trước "Ngẫu nhiên" ở idea.md §5, xáo bài) do nơi gọi quyết định rồi đưa vào `options` (ví dụ `firstPlayer`), nên `setup` luôn tất định và kết quả nằm sẵn trong biên bản. Gieo chọn người đi trước kiểu cá ngựa thì mô hình hoá bằng nước gieo như mọi nước khác.
- _Vì sao_: `applyMove` hoàn toàn tất định nên phát lại, kết nối lại, server kiểm tra đều cho cùng kết quả; kiểm tra hợp lệ luôn làm trên `move` (ý định); kết quả trong biên bản không tin cậy kiểm tra được; expectimax (M2/M6) đọc thẳng phân phối từ `outcomes`; game không tự gọi được `Math.random` ở bước gieo vì engine mới là bên chọn. Online (M4): client gửi `move`, server gọi `playMove` với rng của server rồi phát `{ move, outcome }`; client không có seed hay trạng thái rng nào để đoán trước xúc xắc.
- _Đã cân nhắc_: (a) `applyMove(state, move, rng)` — phát lại phải tái tạo đúng chuỗi rng; (b) rng sinh theo `hash(seed, số thứ tự nước)` — lộ seed cho client; (c) `roll(state, move, rng)` để game tự gieo, kèm `rngState` lưu trong phiên và biên bản (bản design trước) — server gửi biên bản cho client khi kết nối lại là lộ trạng thái rng (mulberry32 chỉ 32 bit), `RoomStore.appendMove` không có chỗ cập nhật `rngState` nguyên tử, engine không kiểm được `outcome` trong biên bản, và game vẫn có thể gọi `Math.random` trong `roll` mà phát lại không phát hiện. Đánh đổi của cách chọn: không gian kết quả phải liệt kê được (xúc xắc, đồng xu); game nào cần không gian quá lớn (xáo cả bộ bài giữa ván) sẽ thêm một hàm lấy mẫu tuỳ chọn kèm hàm kiểm tra — thay đổi chỉ thêm.

### 5. Bộ sinh ngẫu nhiên có seed: mulberry32

`Rng = { nextInt(this: void, min: number, max: number): number; nextFloat(this: void): number }`. `createRng(seed)` (mulberry32) trả một `Rng` có trạng thái riêng trong closure. Dùng cho test, bộ kiểm tra hợp đồng và AI; engine không tự đọc nguồn ngẫu nhiên nào, và không xuất trạng thái rng ra ngoài vì không còn chỗ nào lưu nó.

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
4. Phát lại từng mục: nước đi phải khớp khoá một nước trong `legalMoves` (và được thay bằng chính nước đó), `outcome` phải hợp lệ theo quyết định 4. Toàn bộ phát lại bọc `try/catch`: hàm luật ném lỗi vì dữ liệu rác → `corrupt-record`.

Trường `version` để đổi định dạng sau này mà vẫn đọc được bản cũ hoặc từ chối rõ ràng. Biên bản không chứa trạng thái rng (quyết định 4) nên gửi cho client online được.

Mở rộng đã tính trước, đều là thay đổi chỉ thêm (biên bản `version: 1` cũ vẫn hợp lệ): mục kết thúc ngoài luật `{ type: "end"; result }` cho đầu hàng/hết giờ/đồng ý hoà (mục không có `type` là nước đi), và `rulesVersion` tuỳ chọn (thiếu thì coi là 1). Xem Open Questions.

- _Đã cân nhắc_: thêm ngay mục `{ type: "end" }` và kiểu `ranking` — định dạng "có chỗ" nhưng chưa có game hay luồng nào tạo ra để test; vì mở rộng sau không phá biên bản cũ nên hoãn tới M4 / M6.

### 8. So sánh nước đi bằng khoá chuỗi, lưu nước của luật

Nước đi hợp lệ được so bằng `moveKey(move)`; mặc định là JSON với khoá object được sắp xếp (không phụ thuộc thứ tự khoá — nước đi nhận từ mạng có thể khác thứ tự). Game có nước đi phức tạp có thể tự cung cấp `moveKey`. Khi khớp khoá, phiên lưu và áp dụng **chính phần tử trong `legalMoves`**, không lưu object nhận vào; nhờ vậy trường thừa trong dữ liệu từ mạng (khớp khoá tự viết như `"e2e4"`) không lọt vào `applyMove`, Redis hay lịch sử. `moveKey` tự viết gặp dữ liệu rác mà ném lỗi thì engine bắt và trả `illegal-move` (hoặc `corrupt-record` khi phát lại).

### 9. Tuỳ chọn luật

`defaultOptions` bắt buộc để màn hình chơi dùng chung tạo được ván mới cho mọi game mà không biết tuỳ chọn của game. `parseGameOptions(game, raw)` gọi `game.parseOptions` nếu có (trả `null` → `invalid-options`); game không khai báo `parseOptions` thì chỉ nhận object rỗng `{}`. `createSession` không truyền `options` thì dùng `defaultOptions`; có truyền thì cũng đi qua `parseGameOptions`. `fromRecord` dùng cùng hàm này, nên khi `LudoOptions` thêm trường ở v1, `parseOptions` điền mặc định cho biên bản cũ hoặc phòng đang chạy.

- _Đã cân nhắc_: tin `options` vì đã có kiểu TypeScript — sai với biên bản cũ và với options client gửi lên ở M4; bắt buộc mọi game khai báo `parseOptions` — thừa cho game không có tuỳ chọn, và bộ kiểm tra hợp đồng (biên bản dựng lại được với `options` của bộ kiểm tra) đã bắt game có tuỳ chọn mà quên khai báo.

### 10. Bộ kiểm tra hợp đồng ở điểm vào riêng

`@board-games/engine/testing` xuất `describeGameContract(game, { seeds, playerCounts, maxPlies, options? })`, dùng `describe/it` của Vitest. Điểm vào chính `@board-games/engine` không import Vitest, nên app và server không kéo Vitest vào bundle; Vitest khai báo là `peerDependencies` tuỳ chọn của engine.

Với mỗi seed và số người, bộ kiểm tra tự chơi một ván (chọn nước và chọn kết quả ngẫu nhiên bằng `createRng(seed)`) đến khi kết thúc hoặc vượt `maxPlies` (thất bại). Các kiểm tra, mỗi kiểm tra một `it` có tên chỉ ra yêu cầu:

- `setup` tất định: gọi hai lần cho hai trạng thái bằng nhau.
- Trạng thái cũ không bị sửa: đóng băng sâu (`Object.freeze` đệ quy) trước mỗi `applyMove`.
- `applyMove` tất định: áp cùng nước và cùng kết quả hai lần cho hai trạng thái bằng nhau.
- `result == null ⇔ legalMoves` không rỗng, ở mọi trạng thái.
- Khoá của các nước trong `legalMoves` đôi một khác nhau.
- `currentPlayer` nằm trong `[0, playerCount)` khi ván chưa kết thúc; người thắng nằm trong khoảng đó và không trùng.
- `outcomes`: trọng số nguyên dương, các kết quả khác khoá nhau.
- Trạng thái là dữ liệu thuần: `JSON.parse(JSON.stringify(state))` bằng chặt (`toStrictEqual`) với `state` — bắt instance class, hàm, `Map`, `undefined`, cần cho Worker (M2) và Redis (M4).
- Biên bản cuối chuyển JSON → đọc lại → `fromRecord` cho cùng trạng thái, cùng người đến lượt, cùng lịch sử.
- `meta.supportsAI` thì phải có `evaluate` (M6 nới thành "có `evaluate` hoặc `policy`" khi thêm `policy`).

Engine tự kiểm thử bộ này bằng hai game giả trong thư mục test — một game đếm số không ngẫu nhiên (có `moveKey` tự viết) và một game đua xúc xắc 2–4 người có tuỳ chọn luật và `outcomes` — cộng, cho **mỗi** kiểm tra trên, một biến thể lỗi tạo bằng cách ghi đè đúng một hàm của game giả (`{ ...counterGame, applyMove: mutatingApplyMove }`), để chứng minh bộ kiểm tra bắt được từng loại vi phạm.

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
  session.ts               createSession, playMove, undo, redo, canUndo, canRedo, currentState, sessionResult
  record.ts                toRecord, fromRecord, kiểm tra cấu trúc
  testing/                 describeGameContract, deepFreeze, playRandomGame, các hàm kiểm tra
  test-fixtures/           game giả và biến thể lỗi cho test của chính engine
```

Mỗi file có test đặt cạnh (`*.test.ts`).

## Risks / Trade-offs

- [Rng không gắn với phiên nên ở chế độ cùng máy có thể "hoàn tác để gieo lại"] → Chấp nhận ở engine; có cấm hay không là câu hỏi sản phẩm (Open Questions). Online thì hoàn tác cần đối thủ đồng ý.
- [Ảnh chụp trạng thái tốn bộ nhớ nếu trạng thái lớn] → Trạng thái các game MVP đều nhỏ (bàn ≤ 19×19); đo lại ở M2 nếu cần.
- [JSON ổn định làm khoá có thể chậm khi `legalMoves` dài (cờ vây)] → Game được tự cung cấp `moveKey`; tối ưu khi có số đo.
- [`outcomes` buộc liệt kê hết kết quả] → Đủ cho xúc xắc (kể cả hai con: 36 kết quả); hàm lấy mẫu tuỳ chọn thêm sau nếu có game cần (quyết định 4).
- [`describeGameContract` phụ thuộc Vitest] → Chỉ ở điểm vào `./testing`; nếu đổi thư viện test thì chỉ sửa một thư mục.
- [Sửa luật của một game khi còn ván lưu hoặc phòng sống trong Redis (TTL 7 ngày) có thể làm phát lại ra trạng thái khác] → Phát lại kiểm tra từng nước nên phần lớn trường hợp thành `corrupt-record` (ván bị bỏ), không im lặng; `rulesVersion` thêm khi lần đầu cần (Open Questions).

## Open Questions

Các câu dưới đây không chặn change này; mỗi câu trả lời đều cài được bằng thay đổi chỉ thêm.

- **Hoàn tác nước có ngẫu nhiên** (cá ngựa, cùng máy): cho phép (hiện tại) hay cấm? Nếu cấm, M6 thêm hook tuỳ chọn kiểu `canUndoEntry?(entry)` vào `GameDefinition`. Cần chủ dự án quyết định.
- **Kết thúc ngoài luật và hoà theo yêu cầu**: đầu hàng/xử thua (M4), đồng ý hoà, hết giờ (v1); cờ vua (M7) tự hoà khi lặp ba lần/luật 50 nước hay người chơi phải đòi (cần chủ dự án quyết định). Cả hai dùng mục biên bản `{ type: "end"; result }` và `reason` của `GameResult`.
- **Xếp hạng** (biến thể cá ngựa #8): thêm trường tuỳ chọn `ranking` vào kết quả `win` khi biến thể được bật (v1).
- **Phiên bản luật**: thêm `rulesVersion` tuỳ chọn vào `GameDefinition` và biên bản khi lần đầu sửa luật của một game đã có ván lưu.
- **AI không dựa trên `evaluate`**: cá ngựa (M6) dùng luật ưu tiên; thêm `policy?` tuỳ chọn và nới kiểm tra `supportsAI` tương ứng.
