# Tasks

## 1. Chuẩn bị

- [x] 1.1 Xác nhận change `add-game-engine` đã archive (có `openspec/specs/game-engine/spec.md`) trước khi bắt đầu; nếu chưa, dừng lại
- [x] 1.2 Thêm `@board-games/engine` vào `dependencies` của `packages/games`; thêm `idb-keyval` (6.3) và `zod` (4.6) vào `catalog` và vào `apps/web`; thêm `@board-games/engine`, `@board-games/games` vào `apps/web` và `transpilePackages`; kiểm chứng bằng `pnpm install` không cần ngoại lệ chính sách và `pnpm typecheck` xanh

## 2. Luật Tic-tac-toe

- [x] 2.1 Tạo `packages/games/src/tictactoe/rules.ts` khai báo `as const satisfies GameDefinition<…>` (meta: 2 người, `classic`, 2 phút, `supportsAI: false`; `defaultOptions: {}`); test theo mọi scenario của `specs/tictactoe` (ván mới, lượt luân phiên, không đặt vào ô đã có quân, hoà khi đầy bàn, nước thứ chín tạo hàng là thắng) và một test dạng bảng cho đủ tám đường thắng (ba hàng, ba cột, hai đường chéo) với cả X và O
- [x] 2.2 Chạy `describeGameContract` cho Tic-tac-toe với nhiều seed và xác nhận xanh
- [x] 2.3 Tạo `packages/games/src/index.ts` xuất `GAMES`, `RegisteredGameId`, `isRegisteredGameId`, `findGame`; test: `findGame("tictactoe")` trả đúng game, mã không tồn tại trả `undefined`, mọi mã trong `GAMES` là duy nhất và kebab-case; test kiểu (`expectTypeOf`) khẳng định `RegisteredGameId` là `"tictactoe"` và `string` không gán được vào nó

## 3. Phần dùng chung: hộp thoại, rng, transport

- [x] 3.1 Thêm `ConfirmDialog` vào `packages/ui` (dựa trên `<dialog>`; stub tối thiểu `showModal`/`close` trong `vitest.setup.ts`); test chỉ phần của component: hiện tiêu đề và nhãn nút được truyền vào, bấm xác nhận gọi `onConfirm`, bấm huỷ gọi `onCancel` (tiêu điểm và Esc kiểm ở task 8.1)
- [x] 3.2 Tạo `apps/web/src/lib/crypto-rng.ts` cài `Rng` của engine bằng `crypto.getRandomValues`; test: `nextInt` luôn nằm trong `[min, max]` qua 10 000 lần, `nextFloat` nằm trong `[0, 1)`
- [x] 3.3 Tạo `apps/web/src/transport/types.ts` (`Transport`, `PlaySnapshot`, `TransportEvent`, `SavedGameStore`) và `local-transport.ts` theo design §4; test với Tic-tac-toe và một `SavedGameStore` trong bộ nhớ: khởi tạo ở `loading` rồi `ready`; nước hợp lệ cập nhật ảnh chụp và phát `changed`; nước không hợp lệ phát `rejected` mã `illegal-move` và ảnh chụp giữ nguyên tham chiếu; `canUndo`/`canRedo` và `requestUndo`/`requestRedo`/`requestNewGame` đúng; sau khi hoàn tác, `lastEntry` (lấy bằng `lastEntry(session)` của engine) và `moveCount` không tính nước đã hoàn tác; ghi vào store sau mỗi thay đổi, xoá khi ván kết thúc hoặc chưa có nước nào; dữ liệu trong store bị `fromRecord` từ chối thì xoá và tạo ván mới; `dispose` ngừng phát sự kiện

## 4. Bàn Tic-tac-toe

- [x] 4.1 Tạo `apps/web/src/games/types.ts` (`BoardProps`, `GameUI`, `GameEntry`) theo design §5; kiểm chứng bằng typecheck
- [x] 4.2 Tạo `apps/web/src/games/tictactoe/Board.tsx` (lưới nút, quân SVG, `aria-label` theo bản dịch, ô không chọn được dùng `aria-disabled` và bỏ qua lần bấm) và `usePlayerLabel`; thêm bản dịch `Games.tictactoe.*` và khoá tên đọc được của ô `Play.*` cho vi/en/ja trong cùng task; test component: bấm ô trống gọi `onMove` đúng nước, ô có quân không gọi, tên đọc được đúng dạng "Hàng 1, cột 2, X", bàn `disabled` thì mọi ô `aria-disabled` và không gọi `onMove`, ô vừa đặt quân bằng Enter vẫn giữ tiêu điểm (khi cha render lại với trạng thái mới) và ô có quân vẫn Tab tới được; `messages.test.ts` xanh

## 5. Màn hình chơi cùng máy và đăng ký

- [x] 5.1 Tạo `features/play/use-transport.ts` (`useSyncExternalStore`) và `PlayScreen.tsx` (báo lượt, bàn cờ nhận đủ prop ở design §5, nút hoàn tác/làm lại theo `canUndo`/`canRedo`, báo kết quả, "Ván mới" có hộp thoại xác nhận khi đang dở, lối "Về menu", vùng `aria-live` cho lượt và kết quả, trạng thái "đang tải" khi ảnh chụp là `loading`); thêm bản dịch `Play.*` của màn hình cho vi/en/ja trong cùng task; test component với `LocalTransport` + store trong bộ nhớ theo các scenario "Báo lượt", "Chỉ chọn được nước đi hợp lệ", "Báo kết quả", "Hoàn tác và làm lại khi chơi cùng máy", "Ván mới", "Đi quân bằng bàn phím"
- [x] 5.2 Tạo `games/define-game-entry.tsx` (`Play` tạo `LocalTransport` với `cryptoRng` và một store không lưu gì khi mount, `dispose` khi unmount), `games/tictactoe/index.ts` (`tictactoeEntry`) và `games/registry.ts` (`GAME_ENTRY_LOADERS` với `satisfies Record<RegisteredGameId, …>`); test: render `tictactoeEntry.Play` thấy bàn 3×3 và đi được một nước; test kiểu: ghép Tic-tac-toe với một `Board` khác kiểu báo lỗi (`@ts-expect-error`); kiểm chứng bằng typecheck (thử xoá Tic-tac-toe khỏi registry phải báo lỗi)
- [x] 5.3 Tạo `features/play/PlayRoute.tsx` (nạp lười entry, `Suspense` hiện "đang tải"), route `app/play/[gameId]/page.tsx` (chỉ truyền `gameId` xuống client) và `not-found.tsx` (có lối về menu); thêm bản dịch trang không tìm thấy cho vi/en/ja trong cùng task; test: mã có thật render màn hình chơi, mã không có gọi `notFound`
- [x] 5.4 Rà soát bản dịch: `messages.test.ts` xanh, en/ja đủ khoá và đúng tham số, không còn chữ viết cứng trong các component mới

## 6. Tự lưu ván dở

- [x] 6.1 Tạo `config/storage-keys.ts` (database `board-games-saved-games`, store `saved-games`) và `features/play/autosave.ts`: hàm thuần `toSavedGame`/`parseSavedGame` (vỏ `{ version: 1, savedAt, mode: { kind: "local" }, record }` kiểm bằng zod) và `SavedGameStore` dựa trên `idb-keyval` (bỏ qua lỗi IndexedDB); test hàm thuần: lưu rồi đọc lại cho cùng biên bản, sai vỏ hoặc sai phiên bản trả "không có ván"
- [x] 6.2 Thay store không lưu gì trong `define-game-entry.tsx` bằng `SavedGameStore` IndexedDB; test component `PlayScreen` + `LocalTransport` với một store trong bộ nhớ dùng chung giữa hai lần mount (mô phỏng tải lại trang) theo scenario "Tải lại trang giữa ván", "Ván đã kết thúc không được giữ", "Dữ liệu lưu bị hỏng" (store chứa giá trị rác); phần nối với IndexedDB thật kiểm ở task 8.1

## 7. Menu sinh từ đăng ký

- [x] 7.1 Thay `upcoming-games.ts` bằng `planned-games.ts`; `MenuPage` hiện game trong `GAMES` trước, rồi game dự kiến chưa có trong `GAMES`; thẻ chơi được là liên kết tới `/play/<mã>`, thẻ "Sắp có" không phải liên kết; cập nhật `MenuPage.test.tsx` theo các scenario "Game hiện trên menu", "Thông tin trên thẻ game", "Vào chơi từ menu"; sửa `apps/web/e2e/menu.spec.ts` từ 3 thành 4 thẻ
- [x] 7.2 Tạo `PlayLink` (client) đổi nhãn "Chơi"/"Tiếp tục" theo `listSavedGameIds()`; thêm bản dịch `Menu.play`, `Menu.continue` cho vi/en/ja trong cùng task; test theo scenario "Lối tiếp tục ván dở"

## 8. Kiểm tra tích hợp

- [x] 8.1 Viết `apps/web/e2e/play-tictactoe.spec.ts`: từ menu vào chơi, chơi tới khi X thắng, hoàn tác nước thắng, tải lại giữa ván thấy đúng ván và menu ghi "Tiếp tục", "Ván mới" hỏi xác nhận (tiêu điểm nằm trong hộp thoại, Esc huỷ và giữ ván), đi quân bằng bàn phím và tiêu điểm ở lại trên bàn, `/play/khong-co-game-nay` ra trang không tìm thấy; chạy `pnpm test:e2e` xanh trên desktop và điện thoại
- [x] 8.2 Chạy `pnpm --filter @board-games/games test:coverage` và xác nhận độ phủ dòng và nhánh ≥ 90% (plan.md §7); chạy `pnpm check`, `pnpm knip`, `pnpm spec:check` và xác nhận xanh
- [x] 8.3 Cập nhật plan.md: §3.4 phần `Transport` theo design §4 (`getSnapshot`, `subscribe`, `submit`, `request*`, `dispose`); §10 ghi M1 đã xong, mục "Tiếp theo" chuyển sang M2; kiểm chứng bằng đọc lại các đoạn đã sửa

## 9. Xử lý kết quả review

Hai bản review (senior dev "S*", săn lỗi "B*"/"N*") sau khi xong nhóm 1–8. Mỗi task dưới đây có test hồi quy đỏ trước khi sửa và xanh sau khi sửa.

- [x] 9.1 Nút hoàn tác/làm lại dùng `aria-disabled` thay `disabled` (`Button` của `packages/ui` coi `aria-disabled` là tắt mềm: cùng kiểu hiển thị, bỏ qua lần bấm, vẫn nhận tiêu điểm), để nhấn Enter tới khi hết nước không đẩy tiêu điểm về `<body>` (S2, B1); kiểm chứng: `Button.test.tsx`, `PlayScreen.test.tsx` và E2E "keeps keyboard focus on undo and redo…" (chờ hai khung hình rồi mới kiểm tiêu điểm; đỏ với `disabled`)
- [x] 9.2 `LocalTransport` sau `dispose` bỏ qua `submit`/`request*`, không đổi ván, không ghi store; `persist` bọc `try/catch` cho store ném lỗi đồng bộ (S13, B2, N4); kiểm chứng: `local-transport.test.ts` ("ignores every request after dispose…", "keeps playing when the store throws…")
- [x] 9.3 Thêm `canMove` vào `ReadySnapshot` (transport tính; `LocalTransport` = chưa có kết quả), `PlayScreen` truyền `disabled={!canMove}`; `viewer` chỉ để hiển thị (S3); kiểm chứng: `local-transport.test.ts`, `PlayScreen.test.tsx` với transport giả `canMove: false` giữa ván
- [x] 9.4 `GameEntry<Id>` giữ mã game literal, `defineGameEntry` chỉ nhận game đã đăng ký, `open(visitor)` thay `renderPlay(gameId)`, registry `satisfies GameEntryLoaders` (mỗi khoá phải nạp đúng entry của nó); chuyển `GamePlay` sang `features/play/GamePlay.tsx`, store IndexedDB sang `transport/indexeddb-store.ts`, bỏ tham số `store` của `defineGameEntry` (S4, S9); kiểm chứng: test kiểu `@ts-expect-error` trong `define-game-entry.test.ts`, `GamePlay.test.tsx` chạy với store trong bộ nhớ, typecheck, knip
- [x] 9.5 `PlayRoute` quên promise nạp game bị từ chối; thêm `app/play/[gameId]/error.tsx` đã dịch (`Play.loadError.*`) với "Thử lại" (`retry()`) và "Về menu" (S5); kiểm chứng: `PlayRoute.test.tsx` (nạp lỗi một lần rồi thử lại thấy bàn cờ; đỏ khi còn giữ promise lỗi), `page.test.tsx` cho trang lỗi
- [x] 9.6 Ô trống không chọn được (ván đã kết thúc) có viền đứt và nền nhạt bằng token (S6); kiểm chứng: E2E "plays from the menu to a win…" kiểm `border-top-style` trước/sau khi thắng
- [x] 9.7 Bổ sung test còn thiếu (S7): E2E dữ liệu hỏng trong IndexedDB bị xoá và ván mới bắt đầu; "stops listening when unmounted" đếm listener còn đăng ký; E2E hộp thoại kiểm qua nhiều lần Tab rằng tiêu điểm không bao giờ tới trang phía sau và đi qua cả hai nút; `rules.test.ts` kiểm `meta` và `defaultOptions`
- [x] 9.8 Hàm đọc IndexedDB của E2E huỷ nâng cấp khi database chưa có và kiểm `objectStoreNames` (S8); kiểm chứng: E2E "reads the saved game without creating the database…" (bản cũ của hàm treo tới hết thời gian chờ)
- [x] 9.9 Ghép nhiều người thắng bằng `useFormatter().list` và thêm `count` vào `Play.winner` cho vi/en/ja (S10); kiểm chứng: `PlayScreen.test.tsx` ("X và O thắng!", "X and O win!", "X wins!", "X、Oの勝ち！"), `messages.test.ts`
- [x] 9.10 Token `--overlay` (sáng/tối) cho nền sau `ConfirmDialog` thay `bg-black/40` (S11); `ConfirmDialog` gọi `onCancel` khi trình duyệt tự đóng hộp thoại trong lúc `open` còn `true` (S12); kiểm chứng: `ConfirmDialog.test.tsx` (sự kiện `close` khi đang mở gọi `onCancel`, khi cha đã đóng thì không), E2E hộp thoại vẫn xanh
- [x] 9.11 `LocalTransport` không ghi gì khi `store.load` bị từ chối (N1); ván đọc được mà đã kết thúc thì xoá và bắt đầu ván mới (N3); store IndexedDB giữ nguyên và từ chối đọc dữ liệu của phiên bản mới hơn (vỏ hoặc biên bản), chỉ xoá dữ liệu hỏng/cũ (N2); kiểm chứng: `local-transport.test.ts` ("never writes over a saved game it could not read", "does not resume a finished game…"), `indexeddb-store.test.ts` (`readSavedGame`), E2E "leaves a game saved by a newer version…"
- [x] 9.12 Thêm `app/not-found.tsx` gốc đã dịch (`NotFound.*`) có lối về menu (N5); kiểm chứng: `app/not-found.test.tsx`, E2E `/play` trả 404 với trang tiếng Việt
- [x] 9.13 Cập nhật spec `local-play` (scenario mới cho các hành vi trên), design (quyết định 1, 3, 4, 5, 6, 8, 9, 10, Risks, Open Questions), proposal (Impact), plan.md §3.4 (`canMove`); chạy `pnpm check`, `pnpm knip`, `pnpm format:check`, `pnpm test:e2e` (desktop + điện thoại, thêm `--repeat-each 3`), `pnpm exec openspec validate --all --strict` và xác nhận xanh

## Ngoài phạm vi

- E2E cho trang lỗi tải game (`error.tsx`): chặn đúng chunk của một game trong bản build production phụ thuộc tên file do Turbopack sinh; đã có unit test cho việc thử lại và cho trang lỗi (ghi ở design, Risks).
- `viewer` diễn tả nhiều ghế trên một máy (2 người + 2 máy, M6): xem lại ở M6/M7 (design, Open Questions).
- Ghi bù khi `pagehide` cho nước đi ngay trước lúc đóng tab: vẫn theo Risks của design, chỉ làm khi người chơi gặp thật.

## Workflow follow-up

- Archive change bằng `/opsx:archive` trong cùng PR với task cuối, sau khi đối chiếu ba delta spec với code.
- Sau khi archive, xác nhận `openspec/specs/` có `tictactoe`, `game-menu`, `local-play` và `pnpm spec:check` vẫn xanh.
