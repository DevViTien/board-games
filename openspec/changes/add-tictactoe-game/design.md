# Design

## Context

- Dựa trên API của change `add-game-engine`: `GameDefinition` (method khai báo `this: void`), `AnyGameDefinition`, `GameResult` (có `kind`), `HistoryEntry`, `Rng`, `createSession`, `playMove(game, session, move, rng)`, `undo`, `redo`, `canUndo`, `canRedo`, `currentState`, `sessionResult`, `toRecord`, `fromRecord(game, raw)`, `describeGameContract`. Change này chỉ apply được sau khi change đó đã code xong.
- Hiện trạng `apps/web`: trang chủ `app/page.tsx` gọi `features/menu/MenuPage.tsx` (Server Component, dùng `useTranslations`) với danh sách viết cứng `upcoming-games.ts`; `features/settings/LocaleSwitcher.tsx` là client component mẫu; `packages/ui` có `Button` (cva), `Card`, `Badge`, `Select`, bộ icon. Mọi trang render động vì ngôn ngữ đọc từ cookie. `apps/web/src/i18n/next-intl.d.ts` cho next-intl kiểm khoá bản dịch lúc biên dịch, nên component dùng khoá mới chỉ typecheck được khi khoá đã có trong `vi.json`. `apps/web/e2e/menu.spec.ts` đang khẳng định menu có đúng 3 thẻ.
- Bất biến liên quan (openspec/config.yaml): luật thuần trong `packages/games`; thêm game chỉ gồm định nghĩa + bàn cờ + bản dịch + một dòng đăng ký; mọi chữ hiển thị trong `messages/*.json`.
- Yêu cầu hành vi: `specs/tictactoe`, `specs/game-menu`, `specs/local-play`.

## Goals / Non-Goals

**Goals:**

- Đường đi luật → đăng ký → menu → màn hình chơi → lưu ván làm một lần, game sau dùng lại nguyên vẹn.
- Màn hình chơi không biết đối thủ ở đâu (cùng máy / AI / online) và không giữ phiên chơi, để M2 và M4 chỉ thêm transport.
- Kiểu dữ liệu đúng từ đăng ký tới bàn cờ mà không cần `any` hay ép kiểu.

**Non-Goals:**

- Hiệu ứng chuyển động quân, âm thanh: M8 / v1.
- Đồng bộ ván dở giữa các thiết bị: không có tài khoản nên ván dở chỉ nằm trên trình duyệt đó.

## Decisions

### 1. Đăng ký game hai tầng, đóng kiểu lúc đăng ký

- `packages/games`: mỗi game khai báo `export const tictactoe = { id: "tictactoe", … } as const satisfies GameDefinition<TttState, TttMove>` để `id` giữ kiểu literal. `src/index.ts` xuất `GAMES = [tictactoe] as const`, `RegisteredGameId = (typeof GAMES)[number]["id"]`, `isRegisteredGameId(id: string)`, `findGame(id): AnyGameDefinition | undefined`. Dùng được ở app, Web Worker và server. `GameId` cơ sở chỉ định nghĩa ở engine; `packages/games` không định nghĩa lại.
- `apps/web/src/games/define-game-entry.tsx`: `defineGameEntry<S, M, O, Opt>(definition: GameDefinition<S, M, O, Opt>, ui: GameUI<S, M, O>): GameEntry`. TypeScript kiểm cặp luật + giao diện **lúc đăng ký** (bàn cờ của game khác kiểu báo lỗi), rồi trả object đã đóng kiểu `GameEntry = { id; definition: AnyGameDefinition; Play: ComponentType }`, trong đó `Play` là màn hình chơi đã gắn sẵn định nghĩa và bàn cờ của chính game đó. Từ đây trở ra không còn tham số kiểu `S`, `M` nào.
- `apps/web/src/games/registry.ts`: `GAME_ENTRY_LOADERS = { tictactoe: () => import("./tictactoe").then((m) => m.tictactoeEntry) } satisfies Record<RegisteredGameId, () => Promise<GameEntry>>` — thiếu hoặc thừa một game là lỗi TypeScript; mỗi game là một dòng và được nạp lười (quyết định 3).
- Khoá dịch động (`Games.${id}.name`) dùng `RegisteredGameId` nên next-intl vẫn kiểm được khoá. Test kiểu ở `packages/games` khẳng định `string` không gán được vào `RegisteredGameId` (bắt trường hợp quên `as const` làm `id` bị nới thành `string`).
- _Vì sao_: `ComponentType<BoardProps<S, M>>` là call signature nên bị `strictFunctionTypes` so ngược chiều — `ComponentType<BoardProps<TttState, TttMove>>` không gán được vào `ComponentType<BoardProps<unknown, unknown>>` (đã thử với `@types/react` 19.3). Đóng kiểu trong closure của `defineGameEntry` tránh hẳn chuyện đó.
- _Đã cân nhắc_: danh sách `GameUI<unknown, unknown>` dựa vào so tham số hai chiều — chỉ đúng cho `GameDefinition` (cú pháp method), không đúng cho `Board`; một danh sách duy nhất trong `apps/web` — server online (M4) và Worker (M2) sẽ phải import code giao diện; tự đăng ký bằng side-effect import — khó thấy, dễ thiếu; `GameId` là union viết tay — phải sửa ở hai nơi khi thêm game.

### 2. Game dự kiến ("Sắp có") nằm ở app

`apps/web/src/features/menu/planned-games.ts` thay `upcoming-games.ts`: mã, số người, thời lượng của caro, cá ngựa, cờ vua. Menu = game trong `GAMES` (đọc `meta` phía server), rồi game dự kiến **chưa** có trong `GAMES` (loại trùng theo mã). Đây là nội dung sản phẩm, không phải luật, nên không đặt trong `packages/games`.

### 3. Route chơi: trang chỉ truyền mã game, giao diện nạp lười

- `app/play/[gameId]/page.tsx` (Server Component): `isRegisteredGameId(gameId)` sai thì `notFound()`; đúng thì render `<PlayRoute gameId={gameId} />` (client) và chỉ truyền **chuỗi mã game** qua ranh giới Server/Client (định nghĩa game chứa hàm, không serialize qua ranh giới RSC được).
- `features/play/PlayRoute.tsx` (client): tra `GAME_ENTRY_LOADERS[gameId]`, nạp bằng `React.lazy` + `Suspense`, rồi render `entry.Play`. Fallback của `Suspense` là trạng thái "đang tải" dùng chung với lúc đọc IndexedDB.
- _Vì sao_: bundle của `/play/*` chỉ kéo bàn cờ và luật của game đang mở khi số game tăng (M7 có thể kèm `chess.js`); trang server không phải biết kiểu của game.
- _Đã cân nhắc_: page import registry rồi truyền entry xuống — lỗi RSC vì truyền hàm; `PlayScreen` import tĩnh cả registry — đơn giản hơn nhưng bundle chứa mọi game. Luật vẫn đi qua barrel `@board-games/games`; có tách được theo game hay không đo lại ở M7 (Open Questions).

### 4. `Transport` giữ phiên chơi; màn hình chỉ đọc ảnh chụp

```ts
type PlaySnapshot<S, M, O> =
  | { status: "loading" }
  | {
      status: "ready";
      state: S;
      legalMoves: readonly M[];
      currentPlayer: PlayerIndex;
      result: GameResult | null;
      lastEntry: HistoryEntry<M, O> | null;
      moveCount: number;
      canUndo: boolean;
      canRedo: boolean;
      viewer: PlayerIndex | null; // null = mọi ghế trên máy này (cùng máy)
    };
type TransportEvent = { type: "changed" } | { type: "rejected"; code: EngineErrorCode };

interface Transport<S, M, O = never> {
  getSnapshot(): PlaySnapshot<S, M, O>; // giữ nguyên tham chiếu giữa hai lần thay đổi
  subscribe(listener: (event: TransportEvent) => void): () => void;
  submit(move: M): void; // kết quả qua sự kiện, kể cả bị từ chối
  requestUndo(): void;
  requestRedo(): void;
  requestNewGame(): void;
  dispose(): void;
}
```

- `Transport` là **nơi duy nhất** giữ `Session`. `features/play/use-transport.ts` đăng ký bằng `useSyncExternalStore`; `PlayScreen` chỉ đọc ảnh chụp và gọi các hàm `request*`, không bao giờ chạm vào `Session`.
- Tên `request*` và cờ `canUndo`/`canRedo` do transport tính để màn hình không phải biết chế độ: `AITransport` (M2) hoàn tác hai nước, `OnlineTransport` (M4) gửi yêu cầu chờ đối thủ đồng ý và có thể từ chối. `submit` không trả kết quả đồng bộ vì online là bất đồng bộ.
- `LocalTransport` (`transport/local-transport.ts`) nhận `{ definition, store, rng }`: khởi tạo ở trạng thái `loading`, đọc ván dở từ `store` rồi `fromRecord`; lỗi hay không có thì tạo ván mới với `meta.players.min` người và `defaultOptions` (chọn số người và tuỳ chọn luật thêm ở M6 khi có game cần). Sau mỗi thay đổi nó tự ghi hoặc xoá ván dở qua `store` (quyết định 6). Vì autosave nằm trong `LocalTransport`, ván online ở M4 không bị ghi vào IndexedDB.
- `Play` (do `defineGameEntry` tạo) tạo `LocalTransport` với store IndexedDB và `cryptoRng` khi mount, `dispose` khi unmount; M2 chọn transport theo chế độ tại đúng chỗ này. `PlayScreen` nhận `transport` và `ui` qua prop nên test được với store trong bộ nhớ.
- `rng` của app là `lib/crypto-rng.ts` (cài `Rng` của engine bằng `crypto.getRandomValues`), truyền vào mỗi `playMove`.
- Ghế người/máy: M2 và M6 (ghế trống cho AI chơi thay, trộn người cùng máy với AI) dự kiến dùng một transport cục bộ nhận cấu hình ai điều khiển ghế nào (`seats`); `LocalTransport` của M1 là trường hợp mọi ghế là người. Interface `Transport` ở trên không đổi; chỉ `viewer` và `canUndo` thay đổi theo cấu hình.
- _Đã cân nhắc_: hook giữ `Session` trong `useReducer` còn transport chỉ chuyển nước đi (bản design trước) — hai nguồn sự thật và mỗi chế độ phải sửa `PlayScreen`; Zustand — thêm phụ thuộc cho việc `useSyncExternalStore` làm được; gọi engine thẳng trong component — M2/M4 chắc chắn đến và sẽ phải sửa lại màn hình chơi.

### 5. Hợp đồng bàn cờ

```ts
interface BoardProps<S, M, O = never> {
  state: S;
  legalMoves: readonly M[];
  onMove: (move: M) => void;
  disabled: boolean;
  result: GameResult | null; // để đánh dấu hàng thắng (M5)
  lastEntry: HistoryEntry<M, O> | null; // nước vừa đi kèm kết quả ngẫu nhiên (M5, M6)
  viewer: PlayerIndex | null; // lật bàn theo bên mình (M7, online)
}
interface GameUI<S, M, O = never> {
  Board: ComponentType<BoardProps<S, M, O>>;
  usePlayerLabel: () => (player: PlayerIndex) => string; // ký hiệu/tên người chơi từ bản dịch của game
}
```

Bàn cờ chỉ hiển thị và báo nước đi; mọi kiểm tra hợp lệ do engine làm. `PlayScreen` luôn truyền đủ các prop; bàn Tic-tac-toe bỏ qua `result`, `lastEntry`, `viewer`.

Bàn Tic-tac-toe là lưới 3×3 các `<button>` (CSS grid), quân X/O vẽ bằng SVG nội tuyến, màu lấy từ token. Mỗi nút có `aria-label` từ bản dịch dạng "Hàng {row}, cột {col}, {content}". Ô không có trong `legalMoves` (hoặc khi `disabled`) dùng `aria-disabled="true"` và bỏ qua lần bấm, **không** dùng thuộc tính `disabled`: ô vừa đặt quân vẫn giữ tiêu điểm (thuộc tính `disabled` làm trình duyệt đẩy tiêu điểm về `body`, người dùng bàn phím phải Tab lại từ đầu), và ô đã có quân vẫn Tab tới được để nghe nội dung.

- Quy tắc "mỗi nước đi là một nút" chỉ dành cho Tic-tac-toe. Caro (M5, 225–361 ô) sẽ thêm một hook dùng chung trong `features/play` cho lưới `role="grid"` với roving tabindex và phím mũi tên; cờ vua (chọn quân rồi ô đích) và cá ngựa (gieo rồi chọn ngựa) tự quản lý tương tác trong `Board` của mình.
- _Đã cân nhắc_: một khối SVG duy nhất với vùng bấm — đẹp hơn khi phóng to nhưng phải tự làm điều khiển bàn phím và tên đọc được; nút HTML có sẵn cả hai. Làm ngay lưới `role="grid"` cho 3×3 — chưa cần, làm khi có bàn lớn để thử thật.

### 6. Tự lưu bằng IndexedDB

- `features/play/autosave.ts` cài `SavedGameStore` (`load(gameId)`, `save(gameId, record)`, `clear(gameId)`, `listSavedGameIds()`) bằng `idb-keyval` với database riêng `board-games-saved-games`, store `saved-games` (tên trong `apps/web/src/config/storage-keys.ts`). idb-keyval chỉ tạo store ở lần nâng cấp đầu của database, nên mỗi mục đích (ván dở, thống kê ở v1) dùng một database riêng.
- Khoá là mã game; giá trị là `{ version: 1, savedAt, mode: { kind: "local" }, record }` với `record` là biên bản của engine. Trường `mode` có ngay từ M1 để M2 thêm ván đấu với máy (độ khó, ghế người) mà không phải đổi phiên bản.
- Đọc: kiểm tra vỏ bằng `zod`, rồi `LocalTransport` gọi `fromRecord` của engine để kiểm phần luật. Bất kỳ lỗi nào → xoá khoá đó, bắt đầu ván mới, không báo lỗi (spec "Dữ liệu lưu không đọc được"). Phần đọc/ghi giá trị là hàm thuần (`parseSavedGame`, `toSavedGame`), test không cần IndexedDB; lớp mỏng gọi `idb-keyval` được kiểm bằng E2E.
- Ghi ngay sau mỗi đi/hoàn tác/làm lại, không debounce; ván có kết quả hoặc chưa có nước đi nào → xoá khoá. Vì giao dịch IndexedDB trên cùng store chạy theo thứ tự tạo, menu đọc sau khi bấm "Về menu" luôn thấy bản mới nhất.
- Màn hình chơi hiện trạng thái "đang tải" cho tới khi `LocalTransport` đọc xong IndexedDB, tránh nháy bàn trống rồi nhảy sang ván cũ.
- _Đã cân nhắc_: `localStorage` — đồng bộ, chặn luồng chính, giới hạn ~5 MB và chỉ lưu chuỗi; ván cờ vua dài cùng nhiều game sẽ chạm giới hạn. IndexedDB là lựa chọn đã ghi trong plan.md §2. Một database `board-games` chung nhiều store — không làm được với `createStore` của idb-keyval mà không tự quản lý phiên bản database. Autosave gắn vào `PlayScreen` (bản design trước) — ván online ở M4 cũng bị ghi.

### 7. Menu: phần tĩnh trên server, nhãn "Tiếp tục" ở client

`MenuPage` vẫn là Server Component (tiêu đề, danh sách, thông tin thẻ). Lối vào của từng thẻ chơi được là client component nhỏ `PlayLink` đọc `listSavedGameIds()` và đổi nhãn "Chơi" → "Tiếp tục"; trước khi đọc xong hiện "Chơi". Thẻ "Sắp có" là `<div>`, không phải liên kết.

`PlayLink` chỉ kiểm khoá có tồn tại, không đọc và kiểm tra nội dung: nếu dữ liệu đã hỏng, thẻ vẫn ghi "Tiếp tục" nhưng mở ra là ván mới (đúng spec "Dữ liệu lưu không đọc được"). Chấp nhận vì hiếm và vô hại; đọc đủ để kiểm tra sẽ kéo luật của mọi game vào menu.

### 8. Hộp thoại xác nhận dùng chung

Thêm `ConfirmDialog` vào `packages/ui`, dựa trên phần tử `<dialog>` gốc của trình duyệt (`showModal()` tự giữ tiêu điểm trong hộp thoại, Esc để huỷ). Chữ trong hộp thoại do nơi dùng truyền vào (đã dịch).

jsdom 30 có `HTMLDialogElement` nhưng không cài `showModal`, giữ tiêu điểm hay sự kiện `cancel` khi nhấn Esc. `vitest.setup.ts` của `packages/ui` và `apps/web` chỉ thêm stub tối thiểu (`showModal`/`close` bật tắt thuộc tính `open`) để component render được. Unit test chỉ kiểm phần của component: nhãn nút, xác nhận gọi `onConfirm`, huỷ gọi `onCancel`. Giữ tiêu điểm trong hộp thoại và Esc để huỷ là hành vi của trình duyệt, kiểm bằng Playwright trên Chromium thật (task 8.1).

- _Đã cân nhắc_: thư viện hộp thoại (Radix…) — thêm phụ thuộc cho một hộp thoại; `window.confirm` — không theo giao diện, không dịch được tiêu đề nút; polyfill đầy đủ để unit test cả tiêu điểm và Esc — chỉ chứng minh polyfill chạy, không chứng minh trình duyệt chạy.

### 9. Bản dịch

Thêm vào `vi.json` (và `en.json`, `ja.json`), mỗi nhóm khoá được thêm **trong cùng task tạo component dùng nó** (next-intl kiểm khoá lúc biên dịch, nên component không typecheck được nếu khoá chưa có):

- `Games.tictactoe.name`, `Games.tictactoe.players` (X, O) — task bàn cờ.
- `Play.*`: tên đọc được của ô — task bàn cờ; lượt, người thắng, hoà, hoàn tác, làm lại, ván mới, về menu, đang tải, nội dung hộp thoại xác nhận — task màn hình chơi; trang không tìm thấy — task route.
- `Menu.play`, `Menu.continue` — task `PlayLink`.

Mã lỗi của engine không hiện ra giao diện ở change này (bàn cờ chỉ cho chọn nước hợp lệ), nên chưa cần khoá `Errors.*`.

### 10. Bố cục file

```
packages/games/src/
  tictactoe/{rules.ts, rules.test.ts, index.ts}
  index.ts                         GAMES, RegisteredGameId, isRegisteredGameId, findGame
  index.test.ts
apps/web/src/
  app/play/[gameId]/{page.tsx, not-found.tsx}
  games/{types.ts, define-game-entry.tsx, registry.ts}
  games/tictactoe/{Board.tsx, Board.test.tsx, index.ts}
  features/play/{PlayRoute.tsx, PlayScreen.tsx, use-transport.ts, autosave.ts, *.test.ts(x)}
  features/menu/{MenuPage.tsx, PlayLink.tsx, planned-games.ts, *.test.tsx}
  transport/{types.ts, local-transport.ts, local-transport.test.ts}
  lib/{crypto-rng.ts, crypto-rng.test.ts}
  config/storage-keys.ts
packages/ui/src/components/ConfirmDialog.tsx
apps/web/e2e/{menu.spec.ts, play-tictactoe.spec.ts}
```

## Risks / Trade-offs

- [Trang render phía server không đọc được IndexedDB, nên nhãn "Tiếp tục" đổi sau khi tải] → Chấp nhận: nhãn đổi rất nhanh và không làm xê dịch bố cục (độ dài nút cố định).
- [Người chơi xoá dữ liệu trình duyệt hoặc dùng chế độ ẩn danh thì mất ván dở] → Đúng với quyết định không có tài khoản; không cần xử lý thêm.
- [Đọc/ghi IndexedDB có thể bị chặn (trình duyệt cấm lưu trữ)] → Bắt lỗi và chơi tiếp không lưu, giống trường hợp dữ liệu hỏng.
- [Cùng một game mở ở hai tab: mỗi tab ghi ván của mình, tab ghi sau thắng] → Chấp nhận cho M1, ghi ở "Ngoài phạm vi"; chủ dự án có thể yêu cầu cảnh báo sau (Open Questions).
- [`as const satisfies` bị quên khi thêm game làm `RegisteredGameId` thành `string`] → Test kiểu ở `packages/games` báo ngay.
- [Stub `<dialog>` trong test khác trình duyệt thật] → Unit test không dựa vào hành vi của stub; tiêu điểm và Esc kiểm bằng E2E.

## Open Questions

- **Ván dở theo game hay theo game × chế độ** (cần chủ dự án quyết định trước M2): M1 giữ một ván mỗi game, lối "Tiếp tục" nằm trên thẻ. Giá trị lưu đã có `mode`, nên cả hai cách (một ô mỗi game, hoặc khoá theo game và chế độ) cài được ở M2 mà không đổi phiên bản; mục "Tiếp tục ván dở" riêng như idea.md §5 cũng quyết định khi đó.
- **Hai tab cùng một game** (cần chủ dự án quyết định): hiện tại tab ghi sau thắng, không khoá, không cảnh báo.
- **Nhãn độ khó và hình minh hoạ trên thẻ menu** (idea.md §4.1, cần chủ dự án quyết định): chưa làm ở M1.
- **Tách luật theo game trong bundle**: đo bundle `/play/*` ở M7; nếu luật của mọi game vẫn bị kéo vào qua barrel `@board-games/games`, thêm `"sideEffects": false` hoặc điểm vào phụ theo game.
