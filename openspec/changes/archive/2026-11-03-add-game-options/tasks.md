# Tasks

## 1. Chuẩn bị

- [x] 1.1 Xác nhận change `add-caro-game` đã archive (có `openspec/specs/caro/spec.md`, `GAMES` có `caro`, `parseCaroOptions` nhận 19 và `"free"`, `GameUI.useMoveLabel` nhận `state`); nếu chưa, dừng lại

## 2. Engine và Cờ caro

- [x] 2.1 `OptionValue`, `OptionChoices`, `GameDefinition.optionChoices?` và `listOptionChoices(game)` (`packages/engine/src/option-choices.ts`, export qua điểm vào; design §1); test: thứ tự, `[]` khi không khai báo, dữ liệu sai hình dạng → lỗi
- [x] 2.2 Kiểm tra hợp đồng `option-choices` (dùng `listOptionChoices`) và game mẫu vi phạm trong test của bộ; test theo "Mặc định không nằm trong lựa chọn", "Một tổ hợp không tạo được ván" (chỉ đúng kiểm tra đó thất bại), "Game không khai báo lựa chọn", khoá thiếu, giá trị trùng
- [x] 2.3 `caro.optionChoices = { size: [15, 19], rule: ["blocked-ends", "free"] }`; test "Lựa chọn của Cờ caro", "Mọi tổ hợp chơi được", "Đọc lựa chọn mà không tạo ván"

## 3. Nhãn tuỳ chọn

- [x] 3.1 Bản dịch vi, en, ja cho các khoá mới (design §6): `Games.caro.options.size.label`, `Games.caro.options.size.values.15`, `Games.caro.options.size.values.19`, `Games.caro.options.rule.label`, `Games.caro.options.rule.values.blocked-ends`, `Games.caro.options.rule.values.free`, `Games.caro.options.summary` (`{size}`, `{rule}`), `Menu.continueItemWithRules` (`{game}`, `{mode}`, `{rules}`), `Setup.inProgress.itemWithRules` (`{mode}`, `{rules}`), `Room.rules` (`{rules}`); không đổi khoá cũ (`Menu.continueItem`, `Setup.inProgress.continueLabel` giữ tham số); `messages.test.ts` xanh
- [x] 3.2 `lib/use-option-labels.ts` (`field`, `value`, `summary` qua `Games.<id>.options.summary`, không ghép chuỗi; design §2); test: mọi game có lựa chọn đủ `label`, mọi `values.*` và `summary` với tập tham số đúng bằng tên tuỳ chọn; `summary` của Cờ caro là "19×19 · Tự do"; `null` cho Tic-tac-toe và cho `options` không khớp

## 4. Màn hình bắt đầu ván

- [x] 4.1 `play-setup.ts`: `SetupChoice.options`, `PlaySetup.options`, `toStartUrl`/`readStartRequest` với tham số `options` JSON (design §4); test: có và không có tuỳ chọn, JSON hỏng → `undefined`, Tic-tac-toe không có tham số `options`
- [x] 4.2 `setup-preferences.ts`: ghi và đọc `options`, kiểm từng tuỳ chọn với `OptionChoiceList[]` (design §3); test "Nhớ tuỳ chọn luật", "Lựa chọn nhớ từ trước khi có tuỳ chọn luật", một tuỳ chọn sai chỉ đặt lại tuỳ chọn đó, "Lựa chọn đã nhớ bị hỏng" vẫn xanh
- [x] 4.3 `app/play/[gameId]/page.tsx` truyền `listOptionChoices(game)` và `defaultOptions`; `SetupScreen` dựng một `RadioGroup` mỗi tuỳ chọn ở mọi chế độ (design §3); test component: "Tuỳ chọn mặc định của Cờ caro", "Tuỳ chọn ở chế độ Online", "Tic-tac-toe không có tuỳ chọn" (test cũ của màn hình bắt đầu xanh không sửa), "Chọn kích thước bàn bằng bàn phím", "Bắt đầu với bàn 19×19 luật tự do" (điều hướng tới đường dẫn có `options`), "Đổi kích thước bàn vẫn hỏi xác nhận"
- [x] 4.4 Ván dở ở màn hình bắt đầu ghi luật: `SavedGameSummary.options` đọc từ biên bản (`indexeddb-store.ts`, `memory-store.ts`), nhãn `Setup.inProgress.itemWithRules` và tên đọc được của "Tiếp tục" (design §4); test "Ván dở Cờ caro 19×19"; ván Tic-tac-toe giữ nhãn cũ

## 5. Transport và màn hình chơi

- [x] 5.1 `local-transport.ts`: thứ tự quyết định ván (yêu cầu bắt đầu đã kiểm → ván đã lưu → `fallback` nhớ gần nhất; design §4), "Ván mới" dùng `session.options`, `ReadySnapshot.options`; test: bắt đầu 19×19 luật "tự do", "Ván mới giữ tuỳ chọn" (cùng máy và đấu với máy, kể cả sau khi khôi phục), "Tải lại giữ tuỳ chọn", "Tuỳ chọn sai trên đường dẫn" (ván đã lưu được tiếp tục, không bị ghi đè; không có ván thì dùng `fallback`), máy nhận state 19×19 ("Máy chơi trên bàn 19×19" ở tầng transport với máy giả)
- [x] 5.2 `GamePlay`: lựa chọn nhớ (kể cả `options`) làm `fallback` cho cả chế độ cùng máy và đấu với máy; test "Mở thẳng đường dẫn dùng tuỳ chọn gần nhất" (cả `local-play` và `play-vs-ai`)
- [x] 5.3 `online-transport.ts` điền `ReadySnapshot.options` từ ván dựng lại; `PlayScreen` thêm `Badge` chứa `summary` (lựa chọn lấy bằng `listOptionChoices(definition)`; design §2, §4); test "Màn hình chơi ghi luật" (cùng máy, đấu với máy, online); Tic-tac-toe không có `Badge` mới
- [x] 5.4 Menu: `MenuPage` (server) dựng lựa chọn của mọi game bằng `listOptionChoices` và truyền cho `ContinueList` qua prop; `ContinueList` dùng `Menu.continueItemWithRules` khi có `summary`, `Menu.continueItem` khi không (design §2, §4); test "Ván dở Cờ caro trên menu", "Tic-tac-toe giữ cách ghi cũ"; `ContinueList` không nhập `@board-games/games` (kiểm bằng ESLint `@typescript-eslint/no-restricted-imports` cho `src/{features,transport,lib}`; store nhập mã game từ `@board-games/games/ids`)

## 6. Online

- [x] 6.1 `create-room.ts` nhận và gửi `options` (chỉ khi game có tuỳ chọn); `SetupScreen` truyền `choice.options`; test với socket giả: thông điệp `create` mang `options`; Tic-tac-toe không mang; `error` `invalid-options` → hiện `Setup.createFailed` và nút bấm lại được ("Server từ chối tuỳ chọn"; không thêm khoá dịch, design §5)
- [x] 6.2 `RoomLobby` hiện `Room.rules` từ `room.record.options` (lựa chọn lấy bằng `listOptionChoices` của luật đã nạp; design §5); test "Người được mời thấy luật trước khi vào" ở tầng component; phòng Tic-tac-toe không có dòng luật
- [x] 6.3 Test `room-service` cho các scenario mới của `online-rooms`: "Tạo phòng với tuỳ chọn luật", "Tuỳ chọn luật không hợp lệ", "Ván mới giữ tuỳ chọn luật" (hành vi đã có, thêm test kiểm chứng)

## 7. E2E

- [x] 7.1 `e2e/play-caro.spec.ts`: chọn "19×19", "Tự do" ở màn hình bắt đầu, chơi cùng máy, màn hình ghi luật, tải lại vẫn 19×19, "Ván mới" vẫn 19×19, menu ghi "Cờ caro · Cùng máy · 19×19 · Tự do", mở lại màn hình bắt đầu thấy lựa chọn được nhớ
- [x] 7.2 E2E máy mức Khó trên 19×19 theo design §8: `writeSaved` dựng thế 30 nước (slot `caro:ai`, mức Khó), một nước khởi động (ghi log thời gian, máy đi trong 5 giây), nước thứ hai assert máy đi ≤ 2 giây ("Máy mức Khó trên bàn 19×19"); nhóm test chạy `mode: "serial"`; ghi số đo desktop và điện thoại vào design §8
- [x] 7.3 E2E bàn 19×19 ở khung 360 px (cấu hình điện thoại, `viewport` 360 px): chọn 19×19 ở màn hình bắt đầu, trang không cuộn ngang, đặt quân bằng chạm hai lần ("Bàn 19×19 trên điện thoại hẹp")
- [x] 7.4 `e2e/online.spec.ts`: tạo phòng Cờ caro 19×19 "Tự do", người mở link thấy "Luật: 19×19 · Tự do" ở sảnh chờ, vào chơi tới khi thắng, "Chơi lại" vẫn 19×19; chạy cả hai cấu hình máy

## 8. Hoàn tất

- [x] 8.1 Cập nhật plan.md §3.3 (màn hình bắt đầu: `optionChoices`), §3.4 (`GameDefinition.optionChoices`, `listOptionChoices`, `PlaySetup.options`, ảnh chụp), §4 checklist thêm game (khoá dịch `Games.<id>.options.*` kể cả `summary`), §10 (M5 xong); idea.md §5 nếu phác thảo màn hình bắt đầu cần thêm "Luật thắng"
- [x] 8.2 Đối chiếu design và delta spec với code (diff trọn thân các khối MODIFIED của `game-setup`, `online-rooms` với `openspec/specs/`); chạy `pnpm exec openspec validate add-game-options --strict`, `pnpm check`, `pnpm knip`, `pnpm test:e2e` (cả hai cấu hình máy), `pnpm spec:check`
- [x] 8.3 Archive change (`pnpm exec openspec archive add-game-options --yes`) trong cùng PR, sau review và sau khi `add-caro-game` đã archive

## Ngoài phạm vi

- Luật "đúng 5" của Cờ caro: không làm, người dùng đã chốt hai luật.
- Tuỳ chọn không liệt kê được (số nhập tay, thanh trượt), tuỳ chọn phụ thuộc nhau, chọn số người chơi: M6 khi Cờ cá ngựa cần.
- Giải thích luật bằng đoạn văn, trang luật chơi: M8.
- Đổi luật giữa các ván trong cùng phòng online: tạo phòng mới.
- Ván dở riêng theo từng tổ hợp tuỳ chọn: không làm, ván dở vẫn theo game × chế độ (idea.md §9 mục 11).
