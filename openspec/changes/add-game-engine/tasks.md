# Tasks

## 1. Kiểu dữ liệu, hằng số, mã lỗi, khoá nước đi

- [ ] 1.1 Tạo `packages/engine/src/types.ts` với `GameId`, `PlayerIndex`, `GameMeta`, `GameResult` (có `kind`), `HistoryEntry`, `WeightedOutcome`, `Rng`, `GameDefinition` (mọi method khai báo `this: void`) và `AnyGameDefinition` theo design §3; tạo `constants.ts` với `GAME_CATEGORY` (`as const`) và kiểu `GameCategory`; thêm `types.test.ts` dùng `expectTypeOf` xác nhận một game giả có kiểu `State`/`Move` riêng gán được vào `AnyGameDefinition` và `id` khai báo bằng `as const satisfies` giữ kiểu literal; kiểm chứng bằng `pnpm --filter @board-games/engine typecheck` và `lint` (đoạn `const { applyMove } = game` trong test không bị `unbound-method` báo)
- [ ] 1.2 Tạo `errors.ts` với `ENGINE_ERROR` (9 mã ở design §2) và kiểu `Result<T>` kèm hàm tạo `ok()`/`err()`; test đơn vị xác nhận mỗi mã là chuỗi kebab-case và `Result` phân biệt được bằng `ok`
- [ ] 1.3 Tạo `move-key.ts` với `stableStringify` và khoá nước đi mặc định; test: hai object khác thứ tự khoá cho cùng khoá, mảng giữ thứ tự, giá trị lồng nhau được sắp đệ quy

## 2. Bộ sinh ngẫu nhiên

- [ ] 2.1 Tạo `rng.ts` (mulberry32) với `createRng(seed)` trả `Rng` (`nextFloat`, `nextInt(min, max)`); test: cùng seed cho cùng chuỗi, `nextInt` luôn nằm trong `[min, max]` qua 10 000 lần, `nextFloat` nằm trong `[0, 1)`

## 3. Game giả cho test

- [ ] 3.1 Tạo `src/test-fixtures/` với game đếm số (không ngẫu nhiên, 2 người, có `moveKey` tự viết) và game đua xúc xắc (2–4 người, `outcomes` sáu mặt trọng số bằng nhau, tuỳ chọn `{ target }` có `defaultOptions` và `parseOptions`); mỗi game có một test nhỏ xác nhận luật của nó chạy đúng như mô tả trong file

## 4. Tuỳ chọn và phiên chơi

- [ ] 4.1 Tạo `options.ts` với `parseGameOptions` (gọi `parseOptions` nếu có, không có thì chỉ nhận `{}`); test: tuỳ chọn hợp lệ, `null` từ `parseOptions` → `invalid-options`, game không khai báo `parseOptions` nhận `{}` và từ chối object có khoá
- [ ] 4.2 Tạo `session.ts` với `createSession` (kiểm số người → `invalid-player-count`, tuỳ chọn qua `parseGameOptions`, mặc định `defaultOptions`), `playMove(game, session, move, rng)` (kiểm `game-over`, đối chiếu khoá với `legalMoves` → `illegal-move`, lưu chính nước của luật, bắt lỗi của `moveKey` tự viết, chọn kết quả theo trọng số từ `outcomes`, lưu ảnh chụp), `currentState`, `sessionResult`; test theo các scenario "Khai báo game" (đọc `meta` của game giả mà `setup` — bọc bằng `vi.fn` — không bị gọi), "Tạo ván mới", "Chỉ chấp nhận nước đi hợp lệ" (gồm trường thừa không được lưu), "Kết thúc ván"
- [ ] 4.3 Thêm `undo`, `redo`, `canUndo`, `canRedo` dựa trên `cursor`; test theo các scenario "Hoàn tác và làm lại" (gồm nước đi mới bỏ nhánh đã hoàn tác, `nothing-to-undo`, `nothing-to-redo`)
- [ ] 4.4 Test các scenario "Ngẫu nhiên đi qua bộ sinh được truyền vào" (cùng chuỗi giá trị ngẫu nhiên cho cùng kết quả, làm lại không gieo lại), "Trạng thái cũ không bị thay đổi" (trạng thái đóng băng sâu) và "Phiên chơi chuyển JSON được" bằng game đua xúc xắc

## 5. Biên bản ván

- [ ] 5.1 Tạo `record.ts` với `toRecord` (chỉ các nước đến `cursor`, không có trạng thái rng) và `fromRecord(game, raw: unknown)` theo thứ tự kiểm tra ở design §7 (`unsupported-record-version`, `game-mismatch`, `corrupt-record`, phát lại bằng kết quả đã lưu, bọc `try/catch`); test theo các scenario "Biên bản ván", "Phát lại không gieo lại" và "Biên bản không lộ bộ sinh ngẫu nhiên", gồm biên bản qua `JSON.stringify` → `JSON.parse`
- [ ] 5.2 Test các scenario "Biên bản không tin cậy được kiểm tra": dữ liệu sai cấu trúc (không phải object, thiếu trường, `entries` không phải mảng), số người ngoài khoảng, tuỳ chọn bị `parseOptions` từ chối, nước đi không hợp lệ, nước gieo thiếu kết quả, kết quả 7 trên xúc xắc sáu mặt, nước không ngẫu nhiên lại có kết quả, và một biến thể game giả có `applyMove` ném lỗi — mọi trường hợp trả `corrupt-record` và không ném ra ngoài

## 6. Bộ kiểm tra hợp đồng

- [ ] 6.1 Tạo `src/testing/` với `deepFreeze`, `playRandomGame` và `describeGameContract(game, { seeds, playerCounts, maxPlies, options })` chứa đủ các kiểm tra ở design §10, mỗi kiểm tra một `it` có tên chỉ ra yêu cầu; thêm điểm vào `"./testing"` trong `package.json` và khai báo `vitest` là `peerDependencies` tuỳ chọn; kiểm chứng bằng typecheck
- [ ] 6.2 Chạy `describeGameContract` cho game đếm số và game đua xúc xắc (phải xanh)
- [ ] 6.3 Với mỗi kiểm tra ở design §10, tạo một biến thể lỗi bằng cách ghi đè đúng một hàm của game giả (sửa trạng thái cũ, `setup` hoặc `applyMove` không tất định, ván không kết thúc, `result == null` mà hết nước, nước trùng khoá, `currentPlayer` ngoài khoảng, trạng thái chứa instance class, trọng số không hợp lệ, biên bản không dựng lại được, `supportsAI` mà thiếu `evaluate`) và xác nhận bộ kiểm tra thất bại đúng ở kiểm tra đó (scenario "Game sửa trạng thái cũ bị phát hiện", "Mỗi loại vi phạm khác đều bị phát hiện")

## 7. Điểm vào và tài liệu

- [ ] 7.1 Cập nhật `src/index.ts` chỉ xuất API công khai (types, `GAME_CATEGORY`, `ENGINE_ERROR`, `Result`, `createRng`, `parseGameOptions`, các hàm session và record); xác nhận game giả không bị xuất ra và `pnpm knip` không báo export thừa
- [ ] 7.2 Cập nhật plan.md: §3.4 cho khớp `GameDefinition` thật (thứ tự `<State, Move, Outcome, Options>`, `defaultOptions`, `parseOptions`, `outcomes`, `moveKey`, `this: void`, `GameResult` có `kind`, `Result`, `playMove` nhận `rng`); §3.3 dòng "Ngẫu nhiên" thành "khai báo `outcomes`"; bước 2 và 6 của "Quy trình thêm một game mới" (cách dùng `describeGameContract`, khai báo `as const satisfies`, AI theo `meta.supportsAI`); kiểm chứng bằng đọc lại các đoạn đã sửa so với `types.ts`

## 8. Kiểm tra tích hợp

- [ ] 8.1 Chạy `pnpm --filter @board-games/engine test:coverage` và xác nhận độ phủ dòng và nhánh ≥ 90% (plan.md §7); bổ sung test nếu thiếu
- [ ] 8.2 Chạy `pnpm check`, `pnpm knip`, `pnpm spec:check` và xác nhận tất cả xanh; test của engine chạy trong môi trường Node không DOM (scenario "Luật chạy trên Node không có DOM")

## Workflow follow-up

- Archive change bằng `/opsx:archive` trong cùng PR với task cuối, sau khi đối chiếu delta spec với code.
- Sau khi archive, xác nhận `openspec/specs/game-engine/spec.md` được tạo và `pnpm spec:check` vẫn xanh.
