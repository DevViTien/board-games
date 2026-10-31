# Design

## Context

- Engine sau `add-game-ai`: `chooseMove(game, state, { level, rng, now, timeLimitMs })` trả `Result<Move>`, `AI_LEVEL`, Tic-tac-toe `supportsAI: true`. Mức Vừa/Khó luôn làm xong phần nhìn trước hai nước kể cả khi hết giờ. Change này chỉ apply được sau khi change đó đã code xong và archive.
- Hiện trạng web (M1): `/play/[gameId]` (`page.tsx`, Server Component) render `PlayRoute` (client) → `GamePlay` tạo `createLocalTransport({ definition, store, rng })` trong effect (deps `[definition, store]`) → `PlayScreen`. Transport là nơi duy nhất giữ `Session`, phát `ReadySnapshot` có `canMove` và `viewer`. `SavedGameStore` (`transport/types.ts`, cài ở `transport/indexeddb-store.ts`) khoá theo mã game, có `listSavedGameIds()`; vỏ lưu `{ version: 1, savedAt, mode: { kind: "local" }, record }`; `readSavedGame` coi `mode.kind` lạ là "không đọc được" và xoá. Transport **xoá** slot khi `cursor === 0` hoặc ván đã kết thúc, và có cờ `mayWrite` để không ghi đè ván không đọc được. Menu: `PlayLink` đọc `listSavedGameIds()` để đổi nhãn "Chơi"/"Tiếp tục".
- Quyết định đã chốt: ván dở theo game × chế độ (idea.md §9, quyết định 11). idea.md §5 đã phác thảo màn hình bắt đầu ván và mục "Tiếp tục ván dở".
- Mốc sau cần tính trước: M4 (online, đối thủ ở xa, server trọng tài), M5 (caro, chọn kích thước bàn ở màn hình bắt đầu), M6 (cá ngựa 2–4 người, xúc xắc, máy ngồi ghế trống), M7 (cờ vua, không có AI, lật bàn theo `viewer`).
- Yêu cầu hành vi: `specs/game-setup`, `specs/play-vs-ai`, `specs/local-play`, `specs/game-menu`.

## Goals / Non-Goals

**Goals:**

- Một transport cục bộ cho mọi tổ hợp người/máy trên cùng thiết bị, để M6 (ghế trống cho máy) không phải viết transport mới.
- `PlayScreen` không tự quyết ai được đi hay khi nào máy đi: nó chỉ đọc ảnh chụp (`canMove`, `seats`, `viewer`, `waitingFor`, `inProgress`) và gửi yêu cầu. Cách nói "bạn"/"máy" suy từ `viewer` và loại ghế có trong ảnh chụp, nên M4 chỉ thêm một loại ghế.
- Giao diện không bao giờ bị đứng vì máy nghĩ, và ván không bao giờ kẹt ở lượt máy.
- Không mất lựa chọn của người chơi (mức độ, người đi trước) dù tải lại ở bất kỳ lúc nào, và không thao tác nào bỏ qua quy tắc an toàn dữ liệu của M1.

**Non-Goals:**

- Huỷ một lượt nghĩ đang chạy trong Worker giữa chừng: kết quả cũ chỉ bị bỏ qua (Tic-tac-toe nghĩ vài mili giây; caro ở M5 đo lại).
- Chọn số người, tuỳ chọn luật, kích thước bàn: M5/M6.

## Decisions

### 1. Đường dẫn và luồng bắt đầu ván

| Đường dẫn              | Trang                                               |
| ---------------------- | --------------------------------------------------- |
| `/play/<gameId>`       | Màn hình bắt đầu ván (`features/setup/SetupScreen`) |
| `/play/<gameId>/local` | Chơi cùng máy                                       |
| `/play/<gameId>/ai`    | Đấu với máy                                         |

- Trang server kiểm mã game và chế độ (`ai` chỉ hợp lệ khi game `supportsAI`), sai thì `notFound()`; chỉ chuỗi mã game và chế độ đi qua ranh giới Server/Client như M1.
- **Thiết lập ván** là một object chung. Kiểu nằm ở `transport/types.ts` (transport dùng nó, và transport không import `features/`):

  ```ts
  type FirstPlayer = "human" | "ai" | "random";
  type PlaySetup =
    | { readonly mode: "local" }
    | { readonly mode: "ai"; readonly level: AiLevel; readonly first: FirstPlayer };
  // M5 thêm `options?: unknown` (kiểm bằng `parseGameOptions` của engine), không đổi cơ chế.
  ```

  `features/setup/play-setup.ts` có `DEFAULT_PLAY_SETUP` (`{ mode: "ai", level: "medium", first: "human" }`), `toStartUrl(gameId, setup)` và `readStartRequest(searchParams, mode)` (kiểm bằng zod; sai thì coi như không có).

- **Bấm "Bắt đầu"** ở màn hình bắt đầu (§5): hỏi xác nhận nếu cần, nhớ lựa chọn (§5), rồi `router.push(toStartUrl(...))`, ví dụ `/play/tictactoe/ai?new=1&level=hard&first=random` hoặc `/play/tictactoe/local?new=1`. Màn hình bắt đầu **không** xoá hay ghi gì vào kho lưu ván.
- **Màn hình chơi** (`PlayRoute`, client) đọc query **một lần** làm giá trị khởi tạo `useState` (`useSearchParams`), rồi xoá query bằng `window.history.replaceState(null, "", pathname + hash)` **ngay sau khi transport đã được tạo với yêu cầu đó** (`GamePlay` gọi `onStarted`, một hàm ổn định nên không làm transport bị tạo lại), không xoá sớm hơn: nếu tải code game lỗi, "Thử lại" dựng lại route từ đầu và vẫn phải đọc được yêu cầu bắt đầu. Xoá bằng `replaceState` thì không gọi lại server (Next.js đồng bộ `replaceState` gốc với router), lịch sử trình duyệt không còn giữ query, và props của trang server không đổi nên effect tạo transport không chạy lại. Đã kiểm chứng trên Next 16.4 (bản build production): `replaceState` được vá để gửi hành động `restore` của router với cây và `renderedSearch` hiện tại, nên không có yêu cầu RSC tới `/play/...`, không segment nào mount lại, chỉ component dùng `useSearchParams` render lại; `PlayRoute` giữ thiết lập trong `useState` nên transport không bị tạo lại (test `PlayRoute.test.tsx`). Thiết lập đọc được truyền xuống transport làm `start` (§3).
- Transport nhận `start` vẫn **đọc slot trước** như mọi lần mở: đọc lỗi hoặc gặp dữ liệu của phiên bản mới hơn thì `mayWrite = false`, ván mới theo `start` được chơi nhưng không lưu (quy tắc M1); đọc được thì ván đã lưu bị thay bằng ván mới theo `start`. Nhờ vậy "bắt đầu ván mới" không bao giờ xoá ván không đọc được.
- Mở màn hình chơi không có `start` (tải lại, lối "Tiếp tục", mở thẳng đường dẫn): tiếp tục ván đã lưu của slot; không có thì bắt đầu với lựa chọn gần nhất của game (§5), chưa có thì `DEFAULT_PLAY_SETUP`. Lựa chọn gần nhất đọc trong effect của `GamePlay` (sau mount), không đọc lúc render.
- `first: "random"` được quyết định trong transport lúc tạo ván bằng `rng` của transport (`cryptoRng` trong app) và lưu ngay (§2), nên tải lại không chọn lại.
- _Đã cân nhắc_:
  - Một đường dẫn `/play/<gameId>` cho cả hai chế độ, chế độ trong query — tải lại hay chia sẻ link dễ mất chế độ.
  - Màn hình bắt đầu tự tạo ván, quyết định ngẫu nhiên và lưu rồi mới chuyển trang — phải nạp luật game ở màn hình bắt đầu để dựng biên bản, lặp lại logic `mayWrite` ở hai nơi, và khi lưu lỗi vẫn cần một đường truyền lựa chọn sang màn hình chơi.
  - Truyền qua `sessionStorage` — effect chạy hai lần của React (dev) tiêu thụ mất giá trị ở lần đầu.
  - Đọc `searchParams` ở trang server rồi truyền props, xoá bằng `router.replace` — gọi lại server, props đổi làm transport bị tạo lại và rơi về mặc định.

### 2. Lưu theo game × chế độ

```ts
type SlotMode = "local" | "ai";
interface SaveSlot {
  readonly gameId: string;
  readonly mode: SlotMode;
} // khoá chuỗi "<gameId>:<mode>"

type SeatController = { readonly kind: "human" } | { readonly kind: "ai"; readonly level: AiLevel };
// M4 thêm { kind: "remote" }; M6 dùng nhiều ghế máy, mỗi ghế một mức.

type ModeSettings =
  | { readonly kind: "local" }
  | { readonly kind: "ai"; readonly first: FirstPlayer; readonly seats: readonly SeatController[] };

interface SavedGameStore {
  load(slot): Promise<{ settings: ModeSettings; record: unknown } | undefined>; // record chưa kiểm
  save(
    slot,
    game: { settings: ModeSettings; record: GameRecord; inProgress: boolean },
  ): Promise<void>;
  clear(slot): Promise<void>;
  listInProgress(): Promise<readonly SavedGameSummary[]>; // { gameId, mode, settings, savedAt }
}
```

- **Vỏ lưu `version: 2`**: `{ version: 2, savedAt, inProgress, mode: ModeSettings, record }`. Lưu đúng cấu hình transport cần (`seats`) cộng lựa chọn của người chơi (`first`), để "Ván mới" sau khi tải lại vẫn biết phải quyết định lại người đi trước. `inProgress` = người chơi đã đi ít nhất một nước còn hiệu lực (transport tính, §3); danh sách ván dở chỉ đọc vỏ, không phải nạp luật game.
- **Quy tắc đọc** (`readSavedGame`): `version` lớn hơn 2, biên bản có `version` lớn hơn của engine, hoặc `version: 2` mà `mode.kind` là chuỗi không biết → "của phiên bản mới hơn": giữ nguyên, không ghi đè (như M1). Còn lại sai định dạng → không đọc được, bỏ. Quy tắc cho mốc sau: mỗi lần đổi hình dạng vỏ (kể cả thêm một loại chế độ) thì tăng `version`, để bản cũ (tab cũ, quay về bản trước) nhận ra và giữ nguyên.
- `listInProgress()` trả các ván đọc được có `inProgress: true` của game đã đăng ký, xếp `savedAt` mới nhất trước; bỏ qua khoá không có `:` và dữ liệu không đọc được hay của phiên bản mới hơn (chỉ đọc, không xoá).
- Kho IndexedDB được dựng trên một giao diện khoá–giá trị tối thiểu (`keys`, `get`, `set`, `del`): `createIndexedDbStore(kv = idbKeyValue())`. Bản cài thật bọc `idb-keyval`; unit test truyền bản bọc `Map`, nên mọi quy tắc đọc/ghi/chuyển khoá test được không cần IndexedDB (repo không có `fake-indexeddb`). `memory-store.ts` vẫn là kho đơn giản cho test transport, cùng giao diện `SavedGameStore`.
- **Chuyển dữ liệu M1, một lần, chủ động**: kho lưu giữ một promise khởi tạo chạy trước mọi `load`/`save`/`clear`/`listInProgress` của lần mở trang đó. Logic là hàm thuần `migrateLegacySaves(kv)` (`transport/migrate-legacy-saves.ts`) trên giao diện khoá–giá trị tối thiểu (`keys`, `get`, `set`, `del`), test được bằng `Map` không cần IndexedDB. Với mỗi khoá cũ `"<gameId>"` (không có `:`), đọc bằng quy tắc của M1:
  - ván cùng máy hợp lệ: nếu `"<gameId>:local"` chưa có, hoặc có mà `savedAt` cũ hơn, thì ghi sang khoá mới (vỏ `version: 2`, `inProgress: true`, giữ `savedAt`), rồi xoá khoá cũ; nếu khoá mới mới hơn thì chỉ xoá khoá cũ; nếu khoá mới là dữ liệu của phiên bản mới hơn thì không đụng tới cả hai;
  - không đọc được: xoá khoá cũ;
  - của phiên bản mới hơn: không chuyển, không xoá.
  - Chuyển lỗi (IndexedDB tạm lỗi): bỏ qua, kho vẫn chạy; lần mở trang sau thử lại.
- Vỏ lưu (`readSavedGame`, `toSavedGame`, `slotKey`) và giao diện khoá–giá trị nằm ở `transport/saved-game.ts`, để `indexeddb-store.ts` và `migrate-legacy-saves.ts` cùng dùng mà không import vòng.
- `clear({ gameId, mode: "local" })` xoá cả khoá cũ `"<gameId>"` nếu còn (tab M1 còn mở ghi lại), để ván M1 không sống lại sau khi đã bị thay — **chỉ khi lần chuyển dữ liệu của trang đã thành công**: ván cũ mà lần chuyển lỗi để lại chưa từng được liệt kê hay hỏi xác nhận, nên được giữ cho lần mở sau.
- **Kho không trả lời**: IndexedDB có thể treo mà không báo lỗi. Mọi lần đọc mà màn hình phải chờ (`load` và `clear` lúc transport khôi phục, `listInProgress` ở màn hình bắt đầu và menu) đi qua một helper duy nhất `withStoreTimeout` (`transport/store-timeout.ts`, 3 giây): quá hạn thì coi như đọc lỗi — transport chơi ván mới theo `start`/`fallback` mà không lưu (`mayWrite = false`), màn hình bắt đầu đi nhánh "lỗi" vẫn hỏi xác nhận. Trả lời muộn bị bỏ qua.
- `memory-store.ts` giữ đúng hợp đồng của `listInProgress` như kho IndexedDB (xếp `savedAt` mới nhất trước, bỏ ván có `settings.kind` không khớp slot), để test màn hình thấy đúng thứ app thấy.
- _Đã cân nhắc_: chuyển khoá kiểu lười khi `load` chế độ cùng máy — ván M1 không hiện ở danh sách ván dở cho tới khi người chơi tình cờ mở `/local`, màn hình bắt đầu không hỏi xác nhận, và khoá cũ còn sót làm ván M1 hiện lại sau khi ván mới kết thúc; giữ `version: 1` và chỉ thêm `kind: "ai"` — an toàn ở M2 nhờ tách khoá chứ không nhờ định dạng, và bản M2 gặp loại chế độ mới của M6 sẽ xoá ván; lưu `{ level, humanSeat }` — không biểu diễn được ván 2 người + 2 máy (M6).

### 3. Transport theo ghế

```ts
createLocalTransport({ definition, store, rng, mode, start, fallback, ai });
// mode: SlotMode; start?: PlaySetup (ván mới theo yêu cầu); fallback: PlaySetup (khi không có ván lưu);
// ai: AiPlayer, bắt buộc khi mode là "ai"
```

- Kiểu tuỳ chọn là union theo `mode`: `mode` bỏ trống nghĩa là `"local"` (nơi gọi của M1 không đổi) và chỉ nhận `start?: { mode: "local" }`; `mode: "ai"` bắt buộc `fallback` và `ai`, `start`/`fallback` là thiết lập `mode: "ai"`. Thiết lập sai chế độ là lỗi kiểu, không phải trường hợp xử lý lúc chạy.

- **Tạo ván**: `local` → mọi ghế `human`. `ai` → hai ghế (`players.min`): người đi trước là ghế `currentPlayer` của trạng thái ban đầu; `first` là `human`/`ai` thì ghế người là ghế đi trước/ghế còn lại, `random` thì rút bằng `rng.nextInt`. Cấu hình ghế lưu thành `ModeSettings` (§2).
- **Ảnh chụp** thêm:
  - `seats: readonly SeatController[]`;
  - `waitingFor: "ai" | null` (M4 thêm `"opponent"`);
  - `lastMover`: ghế đã đi `lastEntry` (`currentPlayer` của trạng thái trước nó), để màn hình nói được ai vừa đi;
  - `inProgress`: ván chưa kết thúc và trong các nước còn hiệu lực có ít nhất một nước của ghế người (ghế đi nước thứ `i` là `currentPlayer(states[i])`). Cùng máy thì đúng bằng "có nước đi và chưa kết thúc" như M1.
  - `canMove = result === null && seats[currentPlayer].kind === "human" && waitingFor === null`. `viewer` = ghế người khi đúng một ghế là người, còn lại `null`.
- **Lưu**: ván kết thúc → xoá slot. Chế độ `local` → như M1 (không có nước nào thì xoá slot). Chế độ `ai` → lưu cả khi chưa có nước nào, để giữ cấu hình ghế; `inProgress` đi kèm. Ván khôi phục có `seats` không khớp số người của biên bản, hoặc ở slot `ai` mà không có đúng một ghế người (mọi ghế là máy thì máy tự đánh với mình; mọi ghế là người thì thành ván cùng máy nằm nhầm slot) → coi như hỏng, bỏ.
- **Lượt máy** — mọi lần ảnh chụp đổi (kể cả lúc khôi phục), nếu ván chưa kết thúc và tới ghế máy:
  1. `waitingFor = "ai"`, `request = ++aiRequest`, ghi thời điểm bắt đầu;
  2. `ai.chooseMove({ gameId, state, level, timeLimitMs, seed })` (seed rút từ `rng`);
  3. hẹn giờ 300 ms đặt ngay ở bước 1, chạy song song với lúc nghĩ; máy chỉ đi khi đã có kết quả (kể cả lỗi) **và** hẹn giờ đã hết, nên nước máy không hiện sớm hơn 300 ms kể từ bước 1 mà không cần đọc đồng hồ;
  4. **ngay trước khi đi**, kiểm lại: `request === aiRequest`, chưa dispose, ván chưa kết thúc, và `seats[currentPlayer].kind === "ai"`; sai bất kỳ điều nào thì bỏ;
  5. `playMove` nước máy chọn; nếu máy báo lỗi hoặc nước bị từ chối, đi một nước hợp lệ rút ngẫu nhiên bằng `rng`, để ván không kẹt ở lượt máy.
  - Hoàn tác, làm lại, ván mới và `dispose` đều tăng `aiRequest` và huỷ hẹn giờ đang chờ, nên nước máy đã chọn mà chưa hiện ra không bao giờ rơi vào ván đã lùi hay ván mới.
- **Hoàn tác** (`requestUndo`): huỷ lượt máy như trên, rồi `undo` lặp lại cho tới khi đã lùi ít nhất một nước của ghế người và tới lượt một ghế người. `canUndo` = trong các nước đang có hiệu lực có ít nhất một nước do ghế người đi. Cùng máy (mọi ghế người) thì đúng bằng một lần `undo` như M1.
- **Làm lại** (`requestRedo`): `redo` lặp lại cho tới khi tới lượt ghế người hoặc hết nước để làm lại.
- **Ván mới**: cùng `seats`, trừ khi `first` là `random` thì rút lại ghế người (kể cả sau khi tải lại, vì `first` được lưu).
- **Thời gian nghĩ** (`transport/ai-timing.ts`): Khó 1 500 ms, Vừa và Dễ 500 ms; tối thiểu 300 ms tính từ lúc tới lượt máy (song song với lúc nghĩ, không cộng thêm), nên vẫn trong giới hạn 2 giây của spec.
- Test dùng `vi.useFakeTimers()` để kiểm thứ tự: hoàn tác/ván mới/dispose ở giữa khoảng chờ 300 ms (khi máy đã có kết quả) không làm máy đi.
- _Đã cân nhắc_: `AITransport` riêng bọc `LocalTransport` (plan.md §6.1) — hai lớp giữ chung một session và phải đồng bộ hoàn tác; M6 cần trộn người và máy nên cấu hình theo ghế đằng nào cũng phải có. Kiểm `aiRequest` trước khi chờ 300 ms — Tic-tac-toe nghĩ vài mili giây nên gần như mọi lần hoàn tác trong lúc "máy đang nghĩ" rơi vào khoảng chờ, và máy sẽ đi thay ghế người.

### 4. Máy nghĩ trong Web Worker

```ts
interface AiPlayer {
  // transport/types.ts
  chooseMove(request: AiRequest): Promise<unknown>; // nước đi; transport kiểm lại bằng playMove
  dispose(): void;
}
```

- `ai-worker/compute-ai-move.ts`: hàm thuần `computeAiMove(request, now)` = `findGame(gameId)` + `chooseMove(game, state, { level, rng: createRng(seed), now, timeLimitMs })`; lỗi (mã game lạ, `Result` lỗi) thì ném.
- `ai-worker/ai.worker.ts`: nhận `{ id, request }`, gọi `computeAiMove(request, () => performance.now())` (không truyền thẳng `performance.now`: tách khỏi `performance` thì gọi sẽ ném "Illegal invocation"), trả `{ id, ok: true, move }` hoặc `{ id, ok: false }`.
- `ai-worker/ai-player.ts`:
  - `createWorkerAiPlayer()`: tạo Worker khi có yêu cầu đầu tiên bằng `new Worker(new URL("./ai.worker.ts", import.meta.url), { type: "module" })` (cùng thư mục với worker; Next.js/Turbopack hỗ trợ), ghép trả lời theo `id`.
  - Không tạo được Worker, Worker báo lỗi, hay không trả lời trong `timeLimitMs + 2 000 ms` → dừng Worker, chạy `computeAiMove` trên luồng chính với ngân sách nhỏ (200 ms, đủ cho phần nhìn trước tối thiểu), và **mọi lượt sau** của player này cũng chạy trên luồng chính (không thử lại Worker hỏng).
  - Luồng chính cũng lỗi → promise bị từ chối; transport đi nước ngẫu nhiên hợp lệ (§3 bước 5).
  - `createInlineAiPlayer()` (gọi `computeAiMove` trên luồng chính, không Worker) cho unit test và làm đường dự phòng; tính trong một `setTimeout(0)` chứ không ngay trong lời gọi, để nước vừa đi của người chơi kịp hiện trước khi luồng chính bận nghĩ. Worker thật kiểm bằng E2E.
- `GamePlay` tạo `AiPlayer` cùng transport trong effect (chỉ khi chế độ `ai`) và dispose cùng lúc; test truyền `createInlineAiPlayer`.
- `ai.worker.ts` chỉ được tham chiếu qua `new URL`; nếu `pnpm knip` báo thừa thì thêm nó làm entry của `apps/web` trong `knip.json`.

### 5. Màn hình bắt đầu ván

- `features/setup/SetupScreen.tsx` (client): ba nhóm lựa chọn (chế độ, mức độ, ai đi trước) bằng component mới `RadioGroup` trong `packages/ui` (`<fieldset>` + `<legend>` + `<input type="radio">` gốc: phím mũi tên, Tab và tên nhóm có sẵn từ trình duyệt). Nhóm mức độ và người đi trước chỉ hiện khi chế độ là "Đấu với máy". Game không `supportsAI` thì không có nhóm chế độ.
- Sau mount, cùng một effect: đọc lựa chọn gần nhất (`features/setup/setup-preferences.ts`: `localStorage`, mỗi game một mục `{ mode, level, first }`, kiểm bằng zod, đọc/ghi trong `try/catch`; lỗi hay sai thì dùng `DEFAULT_PLAY_SETUP`; chế độ `ai` với game không `supportsAI` thì về `local`) và `store.listInProgress()`. Server render lựa chọn mặc định; lựa chọn nhớ được áp sau mount nên không lệch hydration.
- "Bắt đầu" `aria-disabled` cho tới khi `listInProgress()` xong (thành công, lỗi, hay quá 3 giây — §2), để không bỏ ván dở mà không hỏi. Danh sách đọc qua hook dùng chung `useGamesInProgress(store)` (`lib/use-games-in-progress.ts`, trả `loading`/`failed`/`ready`), menu cũng dùng.
- Bấm "Bắt đầu": cần xác nhận khi slot của chế độ đang chọn có ván dở, **hoặc** `listInProgress()` lỗi (có thể có ván dở mà không biết). Xác nhận (hoặc không cần) → ghi lựa chọn gần nhất → chuyển trang (§1). Việc bỏ ván thật do transport làm theo quy tắc `mayWrite` (§1), nên ván không đọc được vẫn còn.
- Danh sách ván dở của game này nằm **dưới** khung lựa chọn: nó chỉ hiện sau khi đọc xong kho, đặt phía trên thì đẩy các lựa chọn và nút "Bắt đầu" khỏi chỗ người chơi sắp bấm. Mỗi mục ghi nhãn chế độ ("Cùng máy", "Với máy · Khó") và lối "Tiếp tục" tới `/play/<gameId>/<mode>`; tên đọc được của lối gồm cả chế độ (ví dụ "Tiếp tục: Với máy · Khó") để hai lối không trùng tên.
- Lựa chọn gần nhất còn được `GamePlay` dùng làm `fallback` khi mở thẳng `/play/<gameId>/ai` mà chưa có ván lưu (§1), nên chỉ có một nguồn mặc định. `features/play` chỉ import `play-setup.ts` và `setup-preferences.ts` của `features/setup` (một chiều; `features/setup` không import `features/play`).

### 6. Menu

- `PlayLink` thành liên kết "Chơi" thường tới `/play/<gameId>` (không đọc kho lưu nữa).
- `features/menu/ContinueList.tsx` (client): đọc `store.listInProgress()` qua `useGamesInProgress` (§5), hiện mục "Tiếp tục ván dở" khi có ít nhất một ván, mỗi mục là liên kết tới `/play/<gameId>/<mode>` với nhãn "Tên game · Cùng máy" hoặc "Tên game · Với máy · <mức>". Trước khi đọc xong hoặc khi đọc lỗi không hiện gì (không nhảy bố cục vì mục nằm dưới lưới thẻ).
- Nhãn chế độ dựng bằng một hook dùng chung `useModeLabel()` (`apps/web/src/lib/use-mode-label.ts`) cho menu, màn hình bắt đầu và màn hình chơi: không có ghế máy → "Cùng máy"; có ghế máy cùng một mức → "Với máy · <mức>"; các ghế máy khác mức (M6) → "Với máy".

### 7. PlayScreen

- Đầu trang: tên game, và khi có ghế máy thì thêm nhãn chế độ "Với máy · Khó" (§6), nên mức độ quan sát được sau khi tải lại.
- Cách nói lượt và kết quả, theo `viewer` và loại ghế:
  - `viewer !== null` (đúng một người ở thiết bị này): tới lượt `viewer` → "Đến lượt bạn ({ký hiệu})"; tới lượt ghế máy → "Máy đang nghĩ…". Kết quả: hoà → "Hoà!"; `viewer` trong `winners` → "Bạn thắng!"; mọi người thắng là ghế máy → "Máy thắng!". M4 thêm nhánh ghế `remote` ("Đang chờ đối thủ").
  - `viewer === null` (mọi ghế là người, hoặc nhiều người cùng máy ở M6): giữ cách nói theo ký hiệu của M1; M6 quyết định cách nói cho ghế máy khi có nhiều người.
- **Báo nước máy vừa đi**: tới lượt `viewer` mà `lastMover` là ghế máy → "Máy đánh {nước}. Đến lượt bạn ({ký hiệu})", nước đọc bằng hook `useMoveLabel` của `GameUI` (Tic-tac-toe: "hàng 2, cột 3", `games/tictactoe/move-label.ts`). `useMoveLabel` là phần bắt buộc của `GameUI` như `usePlayerLabel`, nên thêm game vẫn chỉ gồm luật + Board và nhãn + bản dịch + registry. Bàn Tic-tac-toe đánh dấu ô của `lastEntry` ở mọi chế độ: viền dày màu nhấn (vẫn thấy trong forced colors) và `aria-describedby` tới chữ ẩn "Nước vừa đi", để tên ô dùng để tìm (E2E, test) không đổi.
- "Ván mới" hỏi xác nhận khi `inProgress` (thay cho `moveCount > 0 && result === null`), nên ván mà chỉ máy đã đi không bị hỏi; cùng máy thì không đổi. Hộp xác nhận đang mở mà ván hết `inProgress` (máy vừa đi nước kết thúc ván) thì đóng lại ngay trong lúc render, vì không còn gì để bỏ.
- Nút hoàn tác/làm lại đọc `canUndo`/`canRedo` của ảnh chụp như cũ; transport đã tính theo ghế.

### 8. Bản dịch

- `Modes.*` (`local` "Cùng máy", `ai` "Với máy", nhãn ghép mức) và `Levels.*` (`easy`, `medium`, `hard`): namespace chung, tạo trong task đầu tiên dùng tới (màn hình chơi), menu và màn hình bắt đầu dùng lại.
- `Play.yourTurn`, `Play.aiMovedYourTurn`, `Play.lastMove`, `Games.tictactoe.move`, `Play.aiThinking`, `Play.youWin`, `Play.aiWins`, `Play.modeNotFound.*` (trang không tìm thấy của `[mode]`: "Không tìm thấy trang chơi này", không nói là game không tồn tại).
- `Setup.*` (nhóm chế độ/mức độ/người đi trước và các lựa chọn, "Bắt đầu", ván dở, lối "Tiếp tục" kèm chế độ, hộp thoại xác nhận).
- `Menu.continueTitle`, `Menu.continueItem` ("{game} · {mode}"); **bỏ** `Menu.continue` (không còn dùng).
- Mỗi nhóm thêm cho cả vi, en, ja trong cùng task với component dùng nó.

### 9. Bố cục file

```
packages/ui/src/components/RadioGroup.tsx (+ test)
apps/web/src/
  app/play/[gameId]/{page,not-found,error}.tsx    màn hình bắt đầu ván; not-found, error giữ từ M1
  app/play/[gameId]/[mode]/{page,error,not-found}.tsx
  features/setup/{SetupScreen.tsx, play-setup.ts, setup-preferences.ts, *.test.ts(x)}
  features/menu/{ContinueList.tsx, PlayLink.tsx, *.test.tsx}
  features/play/{PlayRoute.tsx, GamePlay.tsx, PlayScreen.tsx, *.test.tsx}
  games/tictactoe/move-label.ts                    nước đi đọc thành chữ ("hàng 2, cột 3")
  lib/{use-mode-label.ts, use-games-in-progress.ts}
  transport/{types.ts, local-transport.ts, ai-timing.ts, indexeddb-store.ts, saved-game.ts,
             migrate-legacy-saves.ts, memory-store.ts, store-timeout.ts}
  ai-worker/{ai.worker.ts, compute-ai-move.ts, ai-player.ts, *.test.ts}
  config/storage-keys.ts                           thêm khoá localStorage của lựa chọn gần nhất
apps/web/e2e/{play-tictactoe.spec.ts, play-vs-ai.spec.ts, setup.spec.ts, saved-games.spec.ts}
```

## Risks / Trade-offs

- [Turbopack đóng gói Worker khác webpack] → E2E chạy trên bản build production xác nhận máy đi được và `Worker` thật được dùng; nếu Worker không chạy, đường dự phòng trên luồng chính vẫn giữ chức năng.
- [Đường dự phòng trên luồng chính chặn giao diện] → Ngân sách 200 ms cộng phần nhìn trước tối thiểu; Tic-tac-toe không đáng kể, caro (M5) đo lại.
- [Worker treo: lượt máy đầu tiên sau khi treo vượt 2 giây của spec (chờ `timeLimitMs + 2 000 ms` rồi mới chạy dự phòng)] → Chỉ một lần mỗi màn hình, vì các lượt sau chạy thẳng trên luồng chính; giới hạn 2 giây của spec là cho đường bình thường, còn khi phần nghĩ riêng hỏng spec chỉ đòi máy vẫn đi được. Chờ ngắn hơn dễ coi nhầm lần khởi động Worker chậm là hỏng.
- [Đổi khoá và định dạng lưu làm mất ván M1] → Chuyển một lần, chủ động, trước mọi lần đọc (§2); unit test hàm chuyển với đủ trường hợp, E2E ghi dữ liệu dạng cũ rồi mở menu và `/play/tictactoe/local`.
- [Ván với máy chưa có nước nào nằm lại trong IndexedDB] → Không hiện ở đâu (`inProgress: false`), bị ghi đè ở ván với máy kế tiếp của game đó; vô hại.
- [Đường dẫn `/play/<gameId>` đổi nghĩa (từ bàn cờ thành màn hình bắt đầu)] → App chưa phát hành cho ai; link cũ vẫn mở được màn hình bắt đầu.
- [Một đường dẫn tự gõ có `?new=1` bắt đầu ván mới không qua hỏi xác nhận] → Query bị xoá ngay khi mở nên lịch sử trình duyệt và Back không giữ nó; tự gõ là chủ ý của người chơi, và ván không đọc được vẫn không bị ghi đè. Chấp nhận.
- [M6 trộn người và máy trên một thiết bị: thuộc slot nào, nhãn gì] → Định dạng theo ghế đã biểu diễn được; M6 quyết định slot và nhãn (xem Open Questions), có thể thêm chế độ mới kèm tăng `version` của vỏ.
- [Hai tab cùng một slot] → Như M1, tab ghi sau thắng.
- [Hai tab đọc rồi xoá cùng lúc: một tab xoá giá trị "không đọc được" mà tab kia vừa ghi lại, hoặc hai tab cùng chuyển dữ liệu M1] → Các thao tác đọc-rồi-xoá không nằm trong một transaction IndexedDB. Cần hai tab mở đúng khoảnh khắc đó, và tệ nhất mất một ván dở; chấp nhận ở M2. Sửa triệt để cần gói đọc-kiểm-xoá vào một transaction (bỏ `idb-keyval` cho các thao tác đó), để lại khi có lý do.
- [Ván M1 đã kết thúc còn sót (lần xoá của M1 bị lỗi) được chuyển với `inProgress: true`] → Muốn biết ván đã kết thúc phải phát lại bằng luật game, mà kho lưu (dùng cả ở menu) không nạp luật các game để giữ chunk nhỏ. Hiếm (M1 xoá ván khi kết thúc); hậu quả: menu liệt kê nó và màn hình bắt đầu hỏi xác nhận cho tới khi mở nó, lúc đó transport thấy đã kết thúc và xoá như dữ liệu hỏng (scenario "Ván đã kết thúc còn sót trên trình duyệt"). Chấp nhận.
- [Hạn chờ Worker tính từ lúc gửi, kể cả thời gian xếp hàng sau một yêu cầu cũ đã bị bỏ; Worker báo `ok: false` cho một yêu cầu cũ cũng làm player chuyển hẳn sang luồng chính; Worker khởi động nguội trong `next dev` có thể quá `timeLimitMs + 2 000 ms`] → Với Tic-tac-toe mỗi lượt nghĩ vài mili giây nên hàng đợi không đáng kể, và hậu quả xấu nhất là chạy trên luồng chính với ngân sách 200 ms (máy vẫn đi). Transport chưa báo cho `AiPlayer` yêu cầu nào đã bị bỏ, nên chưa lọc được lỗi của yêu cầu cũ. Việc của M5 (caro nghĩ lâu hơn): Worker gửi tin "đã bắt đầu" để chỉ tính hạn từ lúc đó (kèm một hạn khởi động riêng), thêm cách huỷ yêu cầu từ transport để bỏ qua lỗi của yêu cầu đã bị bỏ, và đo lại thời gian khởi động.

## Open Questions

Mỗi câu dưới đây đã được chọn một phương án để làm; _Giả định chờ chủ dự án xác nhận_. Đổi phương án chỉ đụng chỗ ghi trong ngoặc.

1. **Lưu ván với máy trước nước đầu.** Giả định: ván với máy được lưu ngay từ khi tạo (giữ mức độ, người đi trước), nhưng chỉ coi là ván dở (hiện ở "Tiếp tục ván dở", cần xác nhận khi bỏ) khi người chơi đã đi ít nhất một nước. (Đổi: điều kiện `inProgress` ở §3.)
2. **Mở thẳng `/play/<game>/ai` khi chưa có ván.** Giả định: dùng lựa chọn gần nhất của game ở màn hình bắt đầu, chưa có thì Vừa, người chơi đi trước. (Đổi: `fallback` ở `GamePlay`, §5.)
3. **M6 trộn người và máy trên một thiết bị.** Giả định cho M2: chưa quyết; định dạng lưu theo ghế, mỗi ghế máy một mức, đủ cho mọi phương án. Gợi ý cho M6: ván có ít nhất một ghế máy lưu ở slot "Với máy", nhãn "Với máy" (không kèm mức khi các ghế máy khác mức).
4. **Hoàn tác khi đấu với máy.** Giả định: không giới hạn số lần, như spec. Với game xúc xắc (M6), hoàn tác rồi đi lại là gieo lại; M6 quyết định cấm hay giới hạn.
5. **Mức độ trên màn hình chơi.** Giả định: hiện "Với máy · <mức>" cạnh tên game; không cho đổi mức giữa ván (muốn đổi thì bắt đầu ván mới).
6. **Hỏi xác nhận "Ván mới" khi chỉ máy đã đi.** Giả định: không hỏi, vì người chơi chưa đi nước nào nên không mất gì. (Đổi: điều kiện `inProgress`, cùng chỗ với câu 1.)
7. **Thời gian nghĩ.** Giả định: Khó 1,5 giây, Vừa và Dễ 0,5 giây, tối thiểu 0,3 giây trước khi nước máy hiện ra. (Đổi: `transport/ai-timing.ts`.) Độ mạnh mức Dễ: xem Open Questions của `add-game-ai`.
