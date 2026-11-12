# Tasks

## 0. Mockup

- [x] 0.1 Làm `mockup/index.html` chơi được: một màn khuôn mở đầu, một màn khuôn có sương sáo, một màn Boxoban (5-1), chip "Khuôn n/m", khuôn khi bị che, khi đã vừa, danh sách màn 5 chương có dòng ghi nguồn; sáng/tối, 390/360/1280 px; người dùng duyệt trước khi code
- [x] 0.2 Chốt token khuôn sáng/tối theo mockup đã duyệt, tính tỉ số tương phản, điền vào design §5

## 1. Luật

- [x] 1.1 Lớp khuôn trong `parseLevel` (cùng kích thước, không trên tường, chữ hợp lệ, số ô khối của mỗi loại có khuôn bằng số ô khuôn, `LEVEL_ERROR.Mold`) và `Level.molds`; test cho từng lỗi, gồm scenario "Màn sai số ô bị từ chối"
- [x] 1.2 `isSolved(level, board)` với luật vừa khít khuôn và luật gom cho màn không có khuôn; `step`, `isAttemptSolved`, `solver` dùng nó; `settle` nhận kiểu hẹp; `HINT` thêm `Mold`, `Depot`; `CHAPTER_COUNT` 5; bỏ ép kiểu tên chương 1–3; test theo các scenario của "Khuôn", "Qua màn", "Đá viên"; toàn bộ test luật cũ vẫn xanh
- [x] 1.3 `moldProgress(level, board)` thuần và `outcome.molds` (cả ở bước chỉ đi); test
- [x] 1.4 `solve(level, limit, { chainPush })`, `chainPush: false` bỏ bước có `pushedPieces.length > 1`; test trên bàn nhỏ có hai đá viên liền nhau

## 2. Màn chương 4

- [x] 2.1 Thiết kế 8 màn chương 4 (4-1 có gợi ý, các màn sau trộn sương sáo, đá viên, thạch dừa), lời giải trong `levels.solutions.ts`; `levels.test.ts` kiểm phát lại, không giải sẵn, BFS không ngắn hơn, có khuôn, không có khuôn đá, luật gom chưa thoả lúc mở màn, và bỏ khuôn thì lời giải ngắn nhất đổi hay vô nghiệm (không `too-big`)

## 3. Màn chương 5 (Boxoban)

- [x] 3.1 Script chuyển đổi trong scratchpad; chép 8 màn đã chọn vào `levels.ts`, mỗi màn kèm comment nguồn (file, số thứ tự, SHA, giấy phép) và 10 dòng gốc
- [x] 3.2 `levels.test.ts`: chương 5 chỉ có đá viên và khuôn đá; mỗi màn có `minMoves` bằng số bước ít nhất theo luật Sokoban; 10 dòng gốc trong comment chuyển đổi ra đúng `rows` và `molds`
- [x] 3.3 Chạy lại số liệu bằng code TS, cập nhật bảng ở design §1 nếu khác; đo tổng thời gian test màn, ghi vào design §3

## 4. Màn hình và ghi công

- [x] 4.1 Vẽ khuôn trong `pieces.tsx`/`Board.tsx` (dưới khối, viền và ký hiệu ở góc khi bị che, viền liền và dấu ✓ khi đã vừa) với token đã chốt; test `puzzles/theme-css.test.ts` thêm các cặp của khuôn; test component kiểm khuôn được vẽ và có dấu đã vừa
- [x] 4.2 Chip "Khuôn n/m" tính từ bàn đang hiện, "Vừa khuôn!" ở màn có khuôn, `howTo.goal` cho màn không có khuôn, lời báo và mô tả bàn có khuôn (cả "bạn trên khuôn"), gợi ý 4-1 và 5-1, "Cách chơi" có khuôn, danh sách màn 5 chương với dòng ghi nguồn chương 5 có liên kết; test theo scenario "Tiến độ khuôn", "Tiến độ khuôn sau khi hoàn tác và tải lại", "Ghi nguồn trên danh sách màn", "Gợi ý ở màn mở đầu cơ chế"
- [x] 4.3 Mục Boxoban trong `apps/web/public/third-party-licenses.txt` (nguồn, SHA, 8 màn, © DeepMind / Google và "not an official Google product", đã sửa gì, vẫn theo Apache 2.0, trích dẫn của README, toàn văn Apache 2.0); test đọc file kiểm có mục và giấy phép
- [x] 4.4 Bản dịch vi/en/ja cho mọi khoá mới; test bản dịch đầy đủ xanh

## 5. Kiểm tra trên trình duyệt thật

- [x] 5.1 E2E: giải màn 4-1 bằng phím, chip khuôn đổi theo bước; mở một màn chương 5; danh sách màn có 40 màn và dòng ghi nguồn; menu ghi "40 màn"; sửa các test đang ghi 24 màn hay 3 chương (`levels.test.ts`, `menu-games.test.ts`, `screens.test.tsx`, E2E), và test 404 dùng `4-1` (`e2e/puzzles-jelly-gather.spec.ts`, `app/puzzles/.../page.test.tsx`) sang `6-1`
- [x] 5.2 Thêm ảnh ở design §5 vào `ui-shots`, chạy và xem từng ảnh sáng/tối × 390/1280 và 360 × 640 cho chương 5, so với mockup; rà `web-design-guidelines` trên phần đổi

## 6. Tài liệu

- [x] 6.1 `idea.md` (§4.5, sửa quyết định 19, thêm quyết định 20: dùng màn Boxoban), `.claude/skills/board-games-ui/SKILL.md` (dữ liệu màn của bên thứ ba), `plan.md` (§10), `README.md` (40 màn, chương Boxoban), comment trong `MenuPage.tsx` ghi 24 màn

## 7. Kiểm tra cuối

- [x] 7.1 `pnpm check --concurrency=1`, `KNIP_DISABLE_RAW_TRANSFER=1 pnpm knip`, `pnpm spec:check`, `pnpm test:e2e` đều xanh
- [x] 7.2 Hai lượt review code (senior dev, săn bug), sửa các điểm được xác nhận, chạy lại 7.1
- [ ] 7.3 Người dùng chơi thử 16 màn mới (cùng lượt với 24 màn của `add-jelly-gather-puzzle`); màn nào bị chê thì thay và chạy lại test màn

## Workflow follow-up

- Archive `add-jelly-gather-puzzle` rồi change này liền nhau trong cùng một commit (delta của change này sửa spec mà change kia tạo ra), chạy `spec:check`; rồi sửa `## Purpose` của `openspec/specs/jelly-gather/spec.md` để nhắc tới khuôn. Trước khi archive, đối chiếu delta với code hiện tại.
- Commit, merge, push chỉ khi người dùng yêu cầu.
