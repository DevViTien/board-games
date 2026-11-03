# Design

## Context

- Sau `add-caro-game`: Cờ caro có `CaroOptions = { size: 15 | 19, rule: "blocked-ends" | "free" }`, `parseCaroOptions` (khoá thiếu → mặc định, khoá/giá trị lạ → từ chối), `defaultOptions = { size: 15, rule: "blocked-ends" }`; state mang `size` và `rule`, nên máy (Worker chỉ nhận state) đã chơi đúng luật của ván. `GameUI.useMoveLabel` nhận `(move, state)`, nên nhãn nước đi đã đúng trên 19×19.
- Engine: `parseGameOptions(game, raw)` trả `invalid-options`; `createSession(game, { playerCount, options? })`; biên bản `toRecord` đã có `options`, `fromRecord` kiểm lại tuỳ chọn. `AnyGameDefinition = GameDefinition<unknown, unknown, unknown, object>`: qua kiểu này, mọi kiểu suy từ `Options` (như một `OptionChoices<Options>`) bị xoá thành `{}`.
- App:
  - `features/setup`: `SetupChoice = { mode, level, first }` nhớ ở `localStorage` (`readSetupChoice`/`writeSetupChoice`, zod); `toStartUrl` → `/play/<id>/<mode>?new=1&level=…&first=…`; `readStartRequest` đọc lại, sai thì `undefined` (tiếp tục ván đã lưu). `SetupScreen` nhận từ `page.tsx` (server) chỉ giá trị thuần (`supportsAI`).
  - `transport/types.ts`: `PlaySetup` có ghi chú "M5 adds rule options here without changing how it travels". `local-transport.ts`: `newSession()` dùng mặc định; "Ván mới" cũng bằng mặc định. `GamePlay` đọc lựa chọn nhớ làm `fallback` cho chế độ máy; chế độ cùng máy bắt đầu bằng `{ mode: "local" }` cứng.
  - `ModeSettings` lưu cạnh biên bản; `SAVED_GAME_VERSION = 2`; `listInProgress` trả `SavedGameSummary { gameId, mode, settings, savedAt }`.
  - Menu: `MenuPage` là Server Component; `ContinueList` là Client Component (`"use client"`), đọc ván dở trong IndexedDB và ghi `Menu.continueItem` = "{game} · {mode}". Nhập `GAMES` vào `ContinueList` sẽ kéo cả luật và AI của mọi game vào bundle client của menu.
  - `useModeLabel` ghi chế độ ("Với máy · Khó") bằng bản dịch `Modes.aiLevel`.
- Online: thông điệp `create` đã có `options` tuỳ chọn; `room-service.create` kiểm bằng `parseGameOptions` (sai → `error` `invalid-options`), `rematch` tạo ván mới với `session.options`. `RoomView.record.options` tới client. `createRoom` (client) chưa gửi `options`; lỗi khác `outdated-client` hiện `Setup.createFailed` ("Không tạo được phòng").
- Yêu cầu hành vi: delta `game-engine`, `caro`, `game-setup`, `game-menu`, `local-play`, `play-vs-ai`, `online-play`, `online-rooms`.

## Goals / Non-Goals

**Goals:**

- Một cơ chế chung: game khai báo các giá trị được chọn trong `packages/games`, app tự dựng nhóm lựa chọn và nhãn; thêm game có tuỳ chọn không sửa màn hình, transport hay server.
- Không có chữ hiển thị trong `engine`/`games` (bất biến), không ghép chuỗi hiển thị trong code; không đổi định dạng ván đã lưu hay giao thức.
- Tic-tac-toe trông và chạy y như cũ.

**Non-Goals:**

- Tuỳ chọn không liệt kê được, tuỳ chọn phụ thuộc nhau, số người chơi (M6); giải thích luật dài (M8).

## Đã chốt với người dùng (03/11/2026)

- Tóm tắt luật **luôn ghi đủ mọi tuỳ chọn**, kể cả khi bằng mặc định: người chơi không phải nhớ mặc định là gì, và hai người online thấy cùng một chữ.
- Các điểm của `add-caro-game` (mép bàn không chặn, chạm hai lần khi ô < 24 px, thẻ menu 10 phút) giữ nguyên.

## Decisions

### 1. Khai báo lựa chọn trong engine

```ts
// packages/engine/src/types.ts
export type OptionValue = string | number | boolean;
/** For each rule option: the values a player may choose, in display order. */
export type OptionChoices<Options extends object> = {
  readonly [K in keyof Options]: Options[K] extends OptionValue ? readonly Options[K][] : never;
};
interface GameDefinition<State, Move, Outcome, Options> {
  readonly optionChoices?: OptionChoices<Options>;
}

// packages/engine/src/option-choices.ts — kiểu chạy được qua AnyGameDefinition
export interface OptionChoiceList {
  readonly name: string;
  readonly values: readonly OptionValue[];
}
/** The game's choices in display order; `[]` when it declares none. Plain data, serialisable. */
export function listOptionChoices(game: AnyGameDefinition): readonly OptionChoiceList[];

// packages/games/src/caro/rules.ts
optionChoices: { size: [15, 19], rule: ["blocked-ends", "free"] },
```

- Thứ tự khoá trong `optionChoices` là thứ tự nhóm trên màn hình; thứ tự giá trị là thứ tự lựa chọn.
- `OptionChoices<Options>` chỉ dùng để **khai báo** có kiểu ở game; mọi nơi dùng chung (bộ kiểm tra hợp đồng, app) đi qua `listOptionChoices`, vốn kiểm lúc chạy rằng mỗi mục là mảng giá trị `string | number | boolean` và trả kiểu cụ thể, không dựa vào kiểu đã bị xoá thành `{}` qua `AnyGameDefinition`.
- Kiểm tra hợp đồng mới `option-choices` (dùng `listOptionChoices`; game không khai báo thì vượt qua):
  - tên tuỳ chọn trùng khớp khoá của `defaultOptions`;
  - mỗi giá trị mặc định có trong lựa chọn của nó; không giá trị trùng — so theo `String(giá trị)`, vì app phân biệt giá trị bằng chữ (giá trị của radio, khoá dịch); chữ của giá trị không chứa `.` (là một cấp của khoá dịch `….values.<giá trị>`, nơi `.` ngăn cấp; `12.5` cũng bị từ chối);
  - **mọi tổ hợp** được `parseGameOptions` nhận và `setup` chạy được (Cờ caro: 4 tổ hợp).
- Phương án đã cân nhắc:
  - Đặt danh sách giá trị trong app (`GameUI`): server và test luật không thấy, và game là nơi biết giá trị nào hợp lệ — bỏ.
  - Mô tả kiểu (`{ kind: "enum", values }`) để sau thêm số, thanh trượt: chưa có game nào cần; thêm sau không phá kiểu hiện tại.

### 2. Nhãn tuỳ chọn ở app (`apps/web/src/lib/use-option-labels.ts`)

**Khoá dịch** (mỗi game có tuỳ chọn; đủ ở vi, en, ja):

- `Games.<id>.options.<tuỳ chọn>.label`: tên nhóm ("Bàn cờ", "Luật thắng").
- `Games.<id>.options.<tuỳ chọn>.values.<String(giá trị)>`: nhãn giá trị ("15×15", "Chặn hai đầu").
- `Games.<id>.options.summary`: câu ICU tóm tắt luật, **tham số trùng tên tuỳ chọn**; Cờ caro vi `"{size} · {rule}"`. Mỗi ngôn ngữ tự quyết dấu nối và thứ tự; code không ghép chuỗi hiển thị.

**Hook** `useOptionLabels()` trả:

- `field(gameId, name)`, `value(gameId, name, value)`;
- `summary(gameId, choices: readonly OptionChoiceList[], options: unknown): string | null` — kiểm `options` với `choices` (mỗi tuỳ chọn phải có giá trị nằm trong lựa chọn; biên bản luôn lưu tuỳ chọn đã chuẩn hoá đủ khoá, nên thiếu khoá là dữ liệu lạ → `null`), rồi gọi `Games.<id>.options.summary` với tham số là nhãn giá trị. Game không có lựa chọn, hoặc `options` không khớp → `null` (không hiện gì, không báo lỗi).

**Kiểm khoá**: khoá ghép động không được next-intl kiểm kiểu, nên `use-option-labels.test.ts` duyệt `GAMES` (qua `listOptionChoices`) và đòi `vi.json` có đủ `label`, mọi `values.*` và `summary` với đúng tập tham số = tên tuỳ chọn; `messages.test.ts` sẵn có bảo đảm en/ja đủ khoá và cùng tham số như vi.

**Lựa chọn lấy từ đâu** (không nhập `GAMES` vào component client mới):

| Chỗ                                      | Nguồn của `OptionChoiceList[]`                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Màn hình bắt đầu (`SetupScreen`)         | `app/play/[gameId]/page.tsx` (server) gọi `listOptionChoices(findGame(id))`, truyền xuống                                                                                                                                                                                                                                                   |
| Menu (`ContinueList`, client)            | `MenuPage` (server) dựng `Record<gameId, { choices, defaults }>` từ `GAMES` (`buildOptionChoices`), truyền xuống                                                                                                                                                                                                                            |
| Màn hình chơi (`GamePlay`, `PlayScreen`) | `listOptionChoices(definition)`: luật của game đã được nạp; `GamePlay` (và `OnlineGame` của trang phòng) truyền cho `PlayScreen` qua prop `optionChoices`                                                                                                                                                                                   |
| Sảnh chờ (`RoomLobby`)                   | `useGameOptionChoices(gameId)` của `RoomRoute`: bắt đầu nạp lười code của game (cùng lần nạp màn hình ván sẽ dùng) và đọc `listOptionChoices(definition)` khi xong; trước đó, hoặc khi nạp lỗi, sảnh chờ chưa ghi luật. Dòng luật vì vậy hiện chậm một nhịp sau sảnh chờ, đổi lại bundle của trang phòng không chứa luật và AI của mọi game |

- `SetupScreen` cần thêm `defaultOptions` (server truyền, dữ liệu thuần). Cả hai prop là tuỳ chọn (mặc định `[]` và `{}`), nên Tic-tac-toe và test cũ không đổi.
- Hàm thuần `matchOptionChoices(choices, options, defaults?)` (`apps/web/src/lib/option-choices.ts`, kiểu `ChosenOptions`; dùng chung `findChoice` với `setup-preferences`) kiểm `options` khớp lựa chọn, khoá thiếu lấy từ `defaults` như luật của game đọc tuỳ chọn (biên bản lưu trước khi có một tuỳ chọn vẫn được ghi luật ở danh sách ván dở); dùng cho `summary`, cho `page.tsx` và `buildOptionChoices` (dựng mặc định từ `game.defaultOptions`) và cho `GamePlay`. Tách khỏi hook để Server Component gọi được.
- **Bundle client không chứa luật của mọi game**: chỉ đọc mã game thì nhập `@board-games/games/ids` (`GAME_IDS`, `isRegisteredGameId`, không kèm luật); `src/{features,transport,lib}` của app bị ESLint (`@typescript-eslint/no-restricted-imports`, cho phép nhập kiểu) cấm nhập giá trị từ `@board-games/games`, trừ test và `menu-games.ts` (chỉ server dùng). Đã kiểm sau `pnpm build`: chunk client của `/`, `/play/<game>` và `/room/<mã>` không còn `blocked-ends`. Màn hình chơi `/play/<game>/<chế độ>` vẫn có, từ trước change này: máy dự phòng trên luồng chính (`ai-worker`, M2) cần mọi luật.
- Phương án đã cân nhắc:
  - Hook nhãn trong `GameUI` của mỗi game: `GameUI` nạp lười cùng `Board`, mà màn hình bắt đầu và menu không nạp bàn cờ — bỏ.
  - Một registry nhãn riêng: thêm một dòng nữa cho mỗi game có tuỳ chọn, trái bất biến "một dòng registry" — bỏ.
  - `ContinueList` tự nhập `GAMES`: kéo luật và AI của mọi game vào bundle menu — bỏ.

### 3. Màn hình bắt đầu ván

- `SetupChoice` thêm `options: Readonly<Record<string, OptionValue>>`.
  - Mặc định `defaultOptions`.
  - Mỗi tuỳ chọn là một `RadioGroup` (legend = `field`, nhãn = `value`; giá trị của radio là `String(giá trị)`, đổi ngược bằng cách tìm trong lựa chọn).
  - Các nhóm nằm sau "Mức độ"/"Người đi trước" và trước ô tên của chế độ Online; hiện ở **mọi chế độ**; được giữ khi đổi chế độ.
- Nhớ lựa chọn: `writeSetupChoice` ghi thêm `options`. `readSetupChoice(gameId, supportsAI, choices, defaults: ChosenOptions)` kiểm **từng tuỳ chọn** với lựa chọn của game: thiếu (lựa chọn lưu trước change này), không còn hợp lệ, hay `options` không phải object → giá trị mặc định của tuỳ chọn đó, phần còn lại (chế độ, mức độ, người đi trước) giữ nguyên. Phương án đã cân nhắc: hỏng một tuỳ chọn thì bỏ cả lựa chọn — bỏ, vì người chơi mất cả mức độ vừa chọn.
- Game không có tuỳ chọn: không có nhóm nào, `options = {}`; DOM và test cũ của Tic-tac-toe không đổi.

### 4. Tuỳ chọn đi theo ván

**`PlaySetup`**: `{ mode: "local"; options?: unknown } | { mode: "ai"; level; first; options?: unknown }` — `unknown` vì đến từ đường dẫn hay `localStorage`; transport kiểm bằng luật.

**Đường dẫn bắt đầu**: `toStartUrl` thêm `options=<JSON>` khi game có tuỳ chọn (ví dụ `?new=1&level=hard&first=human&options=%7B%22size%22%3A19%2C%22rule%22%3A%22free%22%7D`).

- `readStartRequest` đọc JSON: hỏng → `undefined`; không có tham số → `options` vắng (mặc định).
- Phương án đã cân nhắc: một tham số mỗi tuỳ chọn (`size=19&rule=free`): dễ đọc hơn nhưng có thể trùng `new`/`level`/`first` của game sau, và phải biết lựa chọn mới đổi `"19"` về số. Đường dẫn bị xoá ngay sau khi đọc (`PlayRoute`), nên dễ đọc không quan trọng.

**Thứ tự quyết định ván** của transport cục bộ (một luồng duy nhất, khớp spec `local-play`/`play-vs-ai`):

1. Có yêu cầu bắt đầu (`start`) với `options` được `parseGameOptions` nhận → ván mới với tuỳ chọn đó.
2. Không có, hoặc `options` của yêu cầu bị từ chối (đường dẫn sai) → bỏ yêu cầu; có ván đã lưu đọc được → tiếp tục ván đó (tuỳ chọn trong biên bản).
3. Không có ván đã lưu → ván mới theo `fallback` = **lựa chọn nhớ gần nhất** của game (kể cả `options`, đã được `readSetupChoice` kiểm từng tuỳ chọn), không có thì mặc định. `GamePlay` truyền `fallback` cho **cả hai** chế độ (trước đây chỉ chế độ máy).

Ván đã lưu không đọc được thì không bị ghi đè, như cũ.

**Ván mới**: `requestNewGame` tạo phiên với `session.options` của ván đang chơi, không phải mặc định, nên giữ luật kể cả sau khi tải lại. Để vậy, transport cục bộ nay **lưu cả bàn trống** (sau "Ván mới", hoàn tác hết, hay bắt đầu từ màn hình bắt đầu) với `inProgress: false`: không hiện ở "Tiếp tục ván dở", không làm hỏi xác nhận (cả hai chỉ xét `inProgress`), nhưng tải lại giữ đúng tuỳ chọn thay vì quay về lựa chọn nhớ. Trước đây bàn trống cùng máy bị xoá khỏi bộ nhớ; ván đã kết thúc vẫn bị xoá như cũ. Phương án đã cân nhắc: chỉ xoá khi tuỳ chọn trùng `fallback` — bỏ, vì lựa chọn nhớ có thể đổi giữa hai lần mở. Khôi phục ván đã lưu: `fromRecord` kiểm lại tuỳ chọn; không đổi `SAVED_GAME_VERSION` vì vỏ lưu không đổi.

**Máy**: không đổi gì — `AiRequest.state` đã mang `size`/`rule`.

**Ảnh chụp và danh sách**:

- `ReadySnapshot.options: unknown` = `session.options` (online: của ván dựng từ biên bản server).
- `toPlaySetup` chỉ thêm `options` khi game có tuỳ chọn, và `createRoom` chỉ gửi `options` khác `{}`: đường dẫn bắt đầu ván và thông điệp `create` của Tic-tac-toe y như cũ.
- `SavedGameSummary.options: unknown` = `record.options` của ván lưu, chưa kiểm; `summary` trả `null` khi không khớp.
- Không đưa `options` vào `ModeSettings`: biên bản đã có, một nguồn duy nhất.

**Nhãn luật** — chỉ khi game có lựa chọn và `summary` khác `null`:

| Chỗ                                      | Khoá                                                                                                          | Ví dụ (vi)                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Mục ván dở trên menu                     | `Menu.continueItemWithRules` "{game} · {mode} · {rules}" (mới; `continueItem` giữ cho game không có tuỳ chọn) | "Cờ caro · Với máy · Khó · 19×19 · Tự do" |
| Mục ván dở ở màn hình bắt đầu            | `Setup.inProgress.itemWithRules` "{mode} · {rules}" (mới), cũng là `{mode}` của `continueLabel`               | "Với máy · Khó · 19×19 · Tự do"           |
| Màn hình chơi (mọi chế độ, kể cả online) | `Badge` chứa `summary`                                                                                        | "19×19 · Tự do"                           |
| Sảnh chờ online                          | `Room.rules` "Luật: {rules}" (mới)                                                                            | "Luật: 19×19 · Tự do"                     |

**Xác nhận trước khi bỏ ván dở**: không đổi. Ván dở theo slot game × chế độ: bắt đầu Cờ caro 19×19 đấu với máy khi đang có ván 15×15 đấu với máy vẫn hỏi xác nhận; không có slot riêng theo tuỳ chọn (idea.md §9 mục 11).

### 5. Online

- `createRoom({ url, gameId, identity, options })` đặt `options` vào `create` khi game có tuỳ chọn (Tic-tac-toe không gửi, như cũ). `SetupScreen` truyền `choice.options`.
- Server không đổi:
  - tuỳ chọn sai → `error` `invalid-options` → màn hình bắt đầu hiện **`Setup.createFailed`** ("Không tạo được phòng"), không thêm khoá dịch: trường hợp này chỉ xảy ra khi app và server lệch, mà lệch phiên bản đã có `outdated-client` riêng;
  - "Chơi lại" dùng `session.options`.
- Sảnh chờ (`RoomLobby`) hiện `Room.rules` từ `room.record.options`, nên người mở link mời thấy luật **trước** khi bấm "Vào chơi". Màn hình chơi online có `Badge` như mọi chế độ.

### 6. Bản dịch

| Khoá                                          | vi                        | en                        | ja                      |
| --------------------------------------------- | ------------------------- | ------------------------- | ----------------------- |
| `Games.caro.options.size.label`               | Bàn cờ                    | Board                     | 盤                      |
| `Games.caro.options.size.values.15`           | 15×15                     | 15×15                     | 15×15                   |
| `Games.caro.options.size.values.19`           | 19×19                     | 19×19                     | 19×19                   |
| `Games.caro.options.rule.label`               | Luật thắng                | Win rule                  | 勝ちの条件              |
| `Games.caro.options.rule.values.blocked-ends` | Chặn hai đầu              | Blocked ends              | 両端止め                |
| `Games.caro.options.rule.values.free`         | Tự do                     | Free style                | フリー                  |
| `Games.caro.options.summary`                  | {size} · {rule}           | {size} · {rule}           | {size}・{rule}          |
| `Menu.continueItemWithRules`                  | {game} · {mode} · {rules} | {game} · {mode} · {rules} | {game}・{mode}・{rules} |
| `Setup.inProgress.itemWithRules`              | {mode} · {rules}          | {mode} · {rules}          | {mode}・{rules}         |
| `Room.rules`                                  | Luật: {rules}             | Rules: {rules}            | ルール: {rules}         |

Không đổi khoá nào đang có; tham số của `Menu.continueItem` và `Setup.inProgress.continueLabel` giữ nguyên.

### 7. Test

- Engine: `listOptionChoices` (thứ tự, `[]` khi không khai báo, dữ liệu sai hình dạng → lỗi); kiểm tra `option-choices` với game mẫu vi phạm (mặc định không nằm trong lựa chọn, một tổ hợp bị từ chối, khoá thiếu, giá trị trùng); Tic-tac-toe vượt qua.
- Caro: `describeGameContract` (4 tổ hợp) vượt `option-choices`.
- App:
  - `use-option-labels` (đủ khoá và tham số cho mọi game; `summary` null khi không khớp);
  - `play-setup` (`toStartUrl`/`readStartRequest` có và không có `options`, JSON hỏng);
  - `setup-preferences` (lựa chọn cũ không có `options`; một tuỳ chọn sai chỉ đặt lại tuỳ chọn đó);
  - `local-transport` (thứ tự quyết định ván ở §4; "Ván mới" giữ; khôi phục giữ);
  - `SetupScreen` (nhóm tuỳ chọn ở mọi chế độ, bàn phím, Tic-tac-toe không có nhóm);
  - `PlayScreen`, `ContinueList` (nhận lựa chọn qua prop), `RoomLobby` (nhãn luật); `create-room` (gửi `options`).
- E2E: xem tasks §7; riêng **máy mức Khó trên 19×19** (§8).

### 8. Đo thời gian máy mức Khó trên 19×19

Máy mức Khó dùng trọn 1.500 ms trên Cờ caro (cây không bao giờ hết) cộng ≥ 300 ms hiện nước chạy song song; lượt đầu còn cộng thời gian khởi động Worker. Hạn 2 giây của `play-vs-ai` vì vậy sát.

- E2E dựng thế 19×19 đã có 30 nước bằng `writeSaved` (slot `caro:ai`, mức Khó), đi **một nước khởi động** (đo, ghi log, không assert chặt: chỉ cần máy đi trong 5 giây), rồi đo nước thứ hai từ lúc bấm tới lúc quân của máy hiện: assert ≤ 2 giây.
- File chạy `test.describe.configure({ mode: "serial" })` và không chạy song song với file khác nặng CPU (Playwright `workers` của dự án), để số đo không bị lẫn.
- `test.describe.configure({ mode: "serial" })` chỉ áp cho nhóm test này (không cho cả file), để các test khác của `play-caro.spec.ts` vẫn chạy song song; Playwright không cho chặn song song giữa các file mà không giảm `workers` của cả bộ, nên số đo lấy cả khi chạy riêng lẫn khi chạy cùng cả bộ E2E.
- Thế 30 nước được chọn sao cho không đoạn 5 ô thẳng hàng nào có quá hai quân cùng màu: máy không thể thắng trong hai nước được đo (thế thử đầu tiên chỉ giới hạn chuỗi liền ≤ 2, và máy đã thắng bằng cách nối hai cặp qua ô trống).
- Nếu lượt sau vượt 2 giây: giảm `AI_TIME_LIMIT_MS.hard` (ví dụ 1.200 ms) hoặc thêm giới hạn theo game ở change sau, không nới spec.
- Số đo (03/11/2026, máy phát triển Windows, bản build production, `pnpm test:e2e`; từ lúc bấm tới lúc quân O hiện, đo trong trang):

| Cấu hình Playwright        | Chạy           | Lượt đầu (khởi động Worker) | Lượt sau |
| -------------------------- | -------------- | --------------------------- | -------- |
| desktop (Desktop Chrome)   | riêng test này | 1.539 ms                    | 1.506 ms |
| mobile (Pixel 7, mô phỏng) | riêng test này | 1.539 ms                    | 1.508 ms |
| desktop                    | cùng cả bộ E2E | 1.547 ms                    | 1.508 ms |
| mobile                     | cùng cả bộ E2E | 1.539 ms                    | 1.509 ms |

Máy dùng gần trọn 1.500 ms rồi hiện ngay (300 ms tối thiểu chạy song song). "mobile" chỉ mô phỏng khung hình và cảm ứng trên CPU của máy tính, không phải CPU điện thoại; chưa kiểm trên thiết bị thật.

## Risks / Trade-offs

- **Khoá dịch ghép động** không được TypeScript kiểm → test duyệt `GAMES` (§2); thiếu khoá thì CI đỏ trước khi phát hành.
- **Nhãn dài trên điện thoại** ("Cờ caro · Với máy · Khó · 19×19 · Chặn hai đầu") → cho xuống dòng trong thẻ (nút của mục ván dở trên menu cao theo nội dung: `h-auto min-h-10`, cùng chiều cao cũ khi nhãn một dòng); `Badge` ở màn hình chơi chỉ có phần luật.
- **Lựa chọn nhớ lệch với game** (game sau này bỏ một giá trị) → đặt lại đúng tuỳ chọn đó về mặc định, không báo lỗi.
- **Tổ hợp tuỳ chọn tăng theo cấp số nhân** khi Cờ cá ngựa có nhiều biến thể bật/tắt → 4–5 tuỳ chọn hai giá trị là 16–32 lần `setup`, vẫn rẻ. Xem lại ở M6.
- **Máy mức Khó sát 2 giây trên 19×19** → §8.

## Migration Plan

- Lựa chọn nhớ cũ (`{ mode, level, first }`) đọc được, `options` lấy mặc định.
- Ván đã lưu không đổi định dạng (tuỳ chọn đã nằm trong biên bản).
- Phòng online cũ không bị ảnh hưởng.
- Deploy sau `add-caro-game`.

## Open Questions

(không có)
