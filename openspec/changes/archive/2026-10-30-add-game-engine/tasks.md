# Tasks

## 1. Kiểu dữ liệu, hằng số, mã lỗi, khoá nước đi

- [x] 1.1 Tạo `packages/engine/src/types.ts` với `GameId`, `PlayerIndex`, `GameMeta`, `GameResult` (có `kind`), `HistoryEntry`, `WeightedOutcome`, `Rng`, `GameDefinition` (mọi method khai báo `this: void`) và `AnyGameDefinition` theo design §3; tạo `constants.ts` với `GAME_CATEGORY` (`as const`) và kiểu `GameCategory`; thêm `types.test.ts` dùng `expectTypeOf` xác nhận một game giả có kiểu `State`/`Move` riêng gán được vào `AnyGameDefinition` và `id` khai báo bằng `as const satisfies` giữ kiểu literal; kiểm chứng bằng `pnpm --filter @board-games/engine typecheck` và `lint` (đoạn `const { applyMove } = game` trong test không bị `unbound-method` báo)
- [x] 1.2 Tạo `errors.ts` với `ENGINE_ERROR` (9 mã ở design §2) và kiểu `Result<T>` kèm hàm tạo `ok()`/`err()`; test đơn vị xác nhận mỗi mã là chuỗi kebab-case và `Result` phân biệt được bằng `ok`
- [x] 1.3 Tạo `move-key.ts` với `stableStringify` và khoá nước đi mặc định; test: hai object khác thứ tự khoá cho cùng khoá, mảng giữ thứ tự, giá trị lồng nhau được sắp đệ quy

## 2. Bộ sinh ngẫu nhiên

- [x] 2.1 Tạo `rng.ts` (mulberry32) với `createRng(seed)` trả `Rng` (`nextFloat`, `nextInt(min, max)`); test: cùng seed cho cùng chuỗi, `nextInt` luôn nằm trong `[min, max]` qua 10 000 lần, `nextFloat` nằm trong `[0, 1)`

## 3. Game giả cho test

- [x] 3.1 Tạo `src/test-fixtures/` với game đếm số (không ngẫu nhiên, 2 người, có `moveKey` tự viết) và game đua xúc xắc (2–4 người, `outcomes` sáu mặt trọng số bằng nhau, tuỳ chọn `{ target }` có `defaultOptions` và `parseOptions`); mỗi game có một test nhỏ xác nhận luật của nó chạy đúng như mô tả trong file

## 4. Tuỳ chọn và phiên chơi

- [x] 4.1 Tạo `options.ts` với `parseGameOptions` (gọi `parseOptions` nếu có, không có thì chỉ nhận `{}`); test: tuỳ chọn hợp lệ, `null` từ `parseOptions` → `invalid-options`, game không khai báo `parseOptions` nhận `{}` và từ chối object có khoá
- [x] 4.2 Tạo `session.ts` với `createSession` (kiểm số người → `invalid-player-count`, tuỳ chọn qua `parseGameOptions`, mặc định `defaultOptions`), `playMove(game, session, move, rng)` (kiểm `game-over`, đối chiếu khoá với `legalMoves` → `illegal-move`, lưu chính nước của luật, bắt lỗi của `moveKey` tự viết, chọn kết quả theo trọng số từ `outcomes`, lưu ảnh chụp), `currentState`, `sessionResult`; test theo các scenario "Khai báo game" (đọc `meta` của game giả mà `setup` — bọc bằng `vi.fn` — không bị gọi), "Tạo ván mới", "Chỉ chấp nhận nước đi hợp lệ" (gồm trường thừa không được lưu), "Kết thúc ván"
- [x] 4.3 Thêm `undo`, `redo`, `canUndo`, `canRedo` dựa trên `cursor`; test theo các scenario "Hoàn tác và làm lại" (gồm nước đi mới bỏ nhánh đã hoàn tác, `nothing-to-undo`, `nothing-to-redo`)
- [x] 4.4 Test các scenario "Ngẫu nhiên đi qua bộ sinh được truyền vào" (cùng chuỗi giá trị ngẫu nhiên cho cùng kết quả, làm lại không gieo lại), "Trạng thái cũ không bị thay đổi" (trạng thái đóng băng sâu) và "Phiên chơi chuyển JSON được" bằng game đua xúc xắc

## 5. Biên bản ván

- [x] 5.1 Tạo `record.ts` với `toRecord` (chỉ các nước đến `cursor`, không có trạng thái rng) và `fromRecord(game, raw: unknown)` theo thứ tự kiểm tra ở design §7 (`unsupported-record-version`, `game-mismatch`, `corrupt-record`, phát lại bằng kết quả đã lưu, bọc `try/catch`); test theo các scenario "Biên bản ván", "Phát lại không gieo lại" và "Biên bản không lộ bộ sinh ngẫu nhiên", gồm biên bản qua `JSON.stringify` → `JSON.parse`
- [x] 5.2 Test các scenario "Biên bản không tin cậy được kiểm tra": dữ liệu sai cấu trúc (không phải object, thiếu trường, `entries` không phải mảng), số người ngoài khoảng, tuỳ chọn bị `parseOptions` từ chối, nước đi không hợp lệ, nước gieo thiếu kết quả, kết quả 7 trên xúc xắc sáu mặt, nước không ngẫu nhiên lại có kết quả, và một biến thể game giả có `applyMove` ném lỗi — mọi trường hợp trả `corrupt-record` và không ném ra ngoài

## 6. Bộ kiểm tra hợp đồng

- [x] 6.1 Tạo `src/testing/` với `deepFreeze`, `playRandomGame` và `describeGameContract(game, { seeds, playerCounts, maxPlies, options })` chứa đủ các kiểm tra ở design §10, mỗi kiểm tra một `it` có tên chỉ ra yêu cầu; thêm điểm vào `"./testing"` trong `package.json` và khai báo `vitest` là `peerDependencies` tuỳ chọn; kiểm chứng bằng typecheck
- [x] 6.2 Chạy `describeGameContract` cho game đếm số và game đua xúc xắc (phải xanh)
- [x] 6.3 Với mỗi kiểm tra ở design §10, tạo một biến thể lỗi bằng cách ghi đè đúng một hàm của game giả (sửa trạng thái cũ, `setup` hoặc `applyMove` không tất định, ván không kết thúc, `result == null` mà hết nước, nước trùng khoá, `currentPlayer` ngoài khoảng, trạng thái chứa instance class, trọng số không hợp lệ, biên bản không dựng lại được, `supportsAI` mà thiếu `evaluate`) và xác nhận bộ kiểm tra thất bại đúng ở kiểm tra đó (scenario "Game sửa trạng thái cũ bị phát hiện", "Mỗi loại vi phạm khác đều bị phát hiện")

## 7. Điểm vào và tài liệu

- [x] 7.1 Cập nhật `src/index.ts` chỉ xuất API công khai (types, `GAME_CATEGORY`, `ENGINE_ERROR`, `Result`, `createRng`, `parseGameOptions`, các hàm session và record); xác nhận game giả không bị xuất ra và `pnpm knip` không báo export thừa
- [x] 7.2 Cập nhật plan.md: §3.4 cho khớp `GameDefinition` thật (thứ tự `<State, Move, Outcome, Options>`, `defaultOptions`, `parseOptions`, `outcomes`, `moveKey`, `this: void`, `GameResult` có `kind`, `Result`, `playMove` nhận `rng`); §3.3 dòng "Ngẫu nhiên" thành "khai báo `outcomes`"; bước 2 và 6 của "Quy trình thêm một game mới" (cách dùng `describeGameContract`, khai báo `as const satisfies`, AI theo `meta.supportsAI`); kiểm chứng bằng đọc lại các đoạn đã sửa so với `types.ts`

## 8. Kiểm tra tích hợp

- [x] 8.1 Chạy `pnpm --filter @board-games/engine test:coverage` và xác nhận độ phủ dòng và nhánh ≥ 90% (plan.md §7); bổ sung test nếu thiếu
- [x] 8.2 Chạy `pnpm check`, `pnpm knip`, `pnpm spec:check` và xác nhận tất cả xanh; test của engine chạy trong môi trường Node không DOM (scenario "Luật chạy trên Node không có DOM")

## 9. Xử lý kết quả review

Mỗi lỗi được sửa có test hồi quy; đã xác nhận từng test thất bại khi tạm trả code về hành vi cũ và xanh sau khi sửa.

- [x] 9.1 `deepFreeze` luôn đi xuống con (`WeakSet` các cây đã đóng băng sâu thay cho kiểm `Object.isFrozen`), bỏ qua mảng có kiểu; `playRandomGame({ freeze: true })` đóng băng mọi giá trị luật trả về ngay khi tạo ra (trạng thái, nước đi, danh sách kết quả, ngữ cảnh `setup`) thay cho `freezeStates`; kiểm chứng bằng `deep-freeze.test.ts` và ba biến thể `no-mutation` mới (trạng thái chỉ đóng băng nông, sửa nước đi nhận vào, ghi nhớ vào trạng thái trong `legalMoves`)
- [x] 9.2 Bộ kiểm tra chỉ báo đúng kiểm tra bị vi phạm: thêm kiểm tra `playable`; lỗi của luật được phân loại bằng cách chơi lại ván không kèm kiểm tra ("đột biến" → chỉ `no-mutation`, "không chơi được" → chỉ `playable`); điều kiểm tra phát hiện là `Finding`; so sánh tất định và biên bản bỏ qua dữ liệu không thuần; `terminates` bỏ qua ván kẹt; thay biến thể `record-round-trip` bằng hai game chơi được (`parseOptions` không lũy đẳng, `moveKey` theo danh tính object) và thêm biến thể `outcomes` không tất định, người thắng trùng; kiểm chứng bằng `contract-checks.test.ts` — mỗi biến thể lỗi khẳng định mọi kiểm tra khác vượt qua (ngoại lệ ghi rõ lý do trong `alsoFails`)
- [x] 9.3 Thêm kiểm tra `deterministic-queries` (`legalMoves` cả thứ tự, `result`, `currentPlayer` gọi hai lần ở mỗi trạng thái; `playRandomGame` hỏi `currentPlayer` như app) và luật "thắng phải có ít nhất một người thắng" trong `players-in-range`; kiểm chứng bằng các biến thể tương ứng trong `contract-checks.test.ts`
- [x] 9.4 Game không có `parseOptions` chỉ nhận đúng `defaultOptions` (trước đây chỉ nhận `{}`, nên `createSession` không truyền tuỳ chọn trả `invalid-options`); thêm kiểm tra `default-options`; kiểm chứng bằng `options.test.ts`, test "uses the default options of a game that has some but no parseOptions" trong `session.test.ts` (scenario "Game không tự kiểm tra tuỳ chọn") và biến thể `default-options`
- [x] 9.5 `ContractConfig.playerCounts` thành tuỳ chọn (mặc định mọi số người game cho phép) và thêm `timeout`; kiểm chứng bằng test "plays every player count the game allows when none are given" (scenario "Không chỉ định số người thì thử mọi số người") và `describe-game-contract.test.ts` chạy game xúc xắc không truyền `playerCounts`
- [x] 9.6 Sửa test không kiểm điều nó nói: test `unbound-method` tách hàm từ giá trị có kiểu `GameDefinition` (đã thử bỏ `this: void` thì lint báo lỗi), test "Khai báo game" kiểm phần khai báo là dữ liệu thuần đọc được khi mọi hàm luật ném lỗi, test mã lỗi không đếm cứng 9 mã; kiểm chứng bằng `pnpm --filter @board-games/engine lint` và `test`
- [x] 9.7 `fromRecord` bọc toàn bộ thân trong `try/catch` và phát lại tuyến tính (mảng cục bộ, tạo `Session` một lần); kiểm chứng bằng test "returns corrupt-record instead of throwing for data with …" (getter, Proxy, Proxy đã thu hồi — scenario "Dữ liệu báo lỗi ngay khi được đọc") và "rebuilds a long record in linear time" (50 000 mục)
- [x] 9.8 Gộp `playMove` và phát lại vào một bước nội bộ `step`, thêm `applyEntry` công khai; trọng số kết quả không phải số nguyên dương (kể cả 0) và `Rng` trả giá trị ngoài khoảng làm engine ném lỗi rõ ràng; kiểm chứng bằng nhóm test `applyEntry` (scenario "Mục lịch sử hợp lệ được áp dụng với kết quả đã chốt", "Mục lịch sử có kết quả không thể xảy ra bị từ chối"), test trọng số 0 / không nguyên và `Rng` hỏng trong `session.test.ts`, test "rejects a stored outcome whose weight is 0" trong `record.test.ts`
- [x] 9.9 Thêm `activeEntries` và `lastEntry`; `toRecord` dùng `activeEntries`; kiểm chứng bằng nhóm test "activeEntries and lastEntry" (scenario "Lịch sử sau khi hoàn tác", "Chưa có nước đi")
- [x] 9.10 `playMove`/`applyEntry` trả `game-mismatch` khi luật không khớp `session.gameId`; JSDoc của `Session` nói rõ phiên là dữ liệu tin cậy, dữ liệu từ ngoài đi qua biên bản; kiểm chứng bằng test "rejects a session of another game …" (scenario "Luật của game khác bị từ chối")
- [x] 9.11 `stableStringify` ghi lỗ mảng thành `null` và ném lỗi với object không thuần; `findNonPlainData` bắt `-0`, lỗ mảng, thuộc tính symbol / không liệt kê được; `deepEqual` không bỏ qua lỗ mảng; `createRng` từ chối seed không nguyên và `nextInt` từ chối khoảng rộng hơn 2^32; kiểm chứng bằng `move-key.test.ts`, `plain-data.test.ts`, `rng.test.ts`
- [x] 9.12 Mặc định `Outcome = never` cho các hàm công khai nhận `game`, `playRandomGame` và `RandomGameConfig`/`RandomGame` thành generic; kiểm chứng bằng test kiểu "types the history of a game without randomness as having no outcome" (bỏ mặc định thì `typecheck` báo lỗi)
- [x] 9.13 Cập nhật artifact: scenario mới/sửa trong `specs/game-engine/spec.md`, design (quyết định 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, Risks, Open Questions), plan.md §3.4 và checklist thêm game, tham chiếu `lastEntry` trong design/tasks của `add-tictactoe-game`; kiểm chứng bằng `pnpm exec openspec validate --all --strict --no-interactive`
- [x] 9.14 Chạy `pnpm --filter @board-games/engine test:coverage` (dòng và nhánh ≥ 90%), `pnpm check`, `pnpm knip`, `pnpm format:check`, `pnpm spec:check` (chỉ còn báo change chưa archive)

## Ngoài phạm vi

Các đề xuất review cố ý chưa làm, kèm lý do:

- Chơi mỗi ván một lần rồi chạy mọi kiểm tra hợp đồng trên vết đã ghi: chưa có số đo cho thấy cần (bộ kiểm tra của hai game giả chạy dưới 0,5 s); làm khi cờ vua (M7) hoặc cá ngựa (M6) đo được chậm. Hiện đã có `timeout` cấu hình được.
- Tự chơi mỗi seed hai lần rồi so biên bản: kiểm tra `deterministic-queries` gọi hai lần từng hàm truy vấn ở mỗi trạng thái, bắt cùng loại lỗi và chỉ ra đúng hàm.
- Giới hạn số mục của biên bản: thuộc biên của server M4 (schema thông điệp trong `packages/protocol`, giới hạn kích thước request), không đặt trong engine (design.md, Risks).
- Kiểm tra ai được đi nước nào (ghế của người gửi so với `currentPlayer`): việc của server M4, engine không biết người gửi (design.md, Risks).
- Kiểm tra lại `Session` đọc từ kho lưu trữ: `Session` là dữ liệu tin cậy trong bộ nhớ; dữ liệu từ ngoài đi qua `fromRecord` (design.md, quyết định 1).
- `sessionResult` kiểm `game-mismatch`: hàm không có kênh trả lỗi, đổi sang `Result` làm mọi nơi gọi phức tạp hơn; JSDoc ghi rõ nơi gọi phải ghép đúng game.
- Trường chi tiết trong `Failure` (ví dụ `at?: number` cho `corrupt-record`): thêm khi server M4 cần ghi log; là thay đổi chỉ thêm (design.md, Open Questions).

## Workflow follow-up

- Archive change bằng `/opsx:archive` trong cùng PR với task cuối, sau khi đối chiếu delta spec với code.
- Sau khi archive, xác nhận `openspec/specs/game-engine/spec.md` được tạo và `pnpm spec:check` vẫn xanh.
