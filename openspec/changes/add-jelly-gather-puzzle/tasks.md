# Tasks

## 0. Mockup

- [x] 0.1 Làm `mockup/index.html` chơi được bằng luật ở design §3 với 6 màn mẫu (thạch thường, sương sáo, thạch dừa), sáng/tối, 390/360/1280 px; người dùng duyệt tên, hình, cơ chế và bố cục trước khi code
- [x] 0.2 Chốt giá trị token sáng/tối theo mockup đã duyệt và điền bảng tương phản ở design §9; kiểm bằng script tính tỉ số WCAG

## 1. Khung dùng chung và ranh giới

- [x] 1.1 Chuyển `goTo`, `ToolLink` (thành `HistoryLink`), `BackLink`, `ScreenTitle` sang `features/shell/client-navigation.tsx`; Ghi điểm import từ chỗ mới; test và E2E của Ghi điểm vẫn xanh không sửa hành vi
- [x] 1.2 Thêm block ESLint cho `src/puzzles/**` và cấm `puzzles` trong `src/tools/**`; test trong `packages/config/eslint/index.test.js` cho cả import alias và đường dẫn tương đối
- [x] 1.3 Chuyển `block`, `contrast`, `resolve` của `games/theme-css.test.ts` sang `src/test/theme-css.ts`; test theme của game vẫn xanh, không đổi điều nó kiểm
- [x] 1.4 Thêm `ArrowUp`, `Undo2`, `RotateCcw` vào `packages/ui/src/icons.ts`; test icon của `packages/ui` xanh
- [x] 1.5 Thêm các khoá `JELLY_GATHER_*` trong `config/storage-keys.ts` và bất biến trò giải đố vào `openspec/config.yaml`

## 2. Luật

- [x] 2.1 `rules/types.ts`, `rules/parse-level.ts`: kiểu, đọc màn từ chữ, kiểm một `@`, viền kín, tối đa 10 × 10; test cho từng lỗi
- [x] 2.2 `rules/step.ts`: đi, đẩy một khối, đẩy dây chuyền, khối bao quanh nhân vật, bị chặn bởi tường, bởi thạch dừa đứng yên, ở xa, kèm lý do; test theo scenario "Đi và đẩy", "Bước không đi được"
- [x] 2.3 Sương sáo và đá viên: sương sáo dính mọi loại thạch (cả dừa, cả sương sáo), không dính đá viên, không dính tường; khối nhiều loại; đá viên không dính gì; test theo scenario "Sương sáo dính mọi màu", "Đá viên"
- [x] 2.4 `settle`: dính cùng loại tới khi ổn định, không dính khác loại, không dính chéo, đá viên không dính; dừa đứng yên khi chạm tường, khi dính vào khối đứng yên, ngay từ đầu, không tính chạm chéo; test theo scenario tương ứng
- [x] 2.5 `isSolved`, `moved` và `outcome` (ô tới, loại bị đẩy, màu vừa ít khối đi kèm số khối còn lại, loại sương sáo vừa dính vào, vừa đứng yên, đã giải; qua màn với khối nhiều loại); test "Qua màn" và nội dung `outcome`
- [x] 2.6 `rules/history.ts`: reducer với ngăn xếp bàn, phát lại chuỗi `UDLR*`, số bước, hoàn tác tắt khi lịch sử rỗng, chơi lại không ghi gì ở bàn đầu, không nhận bước sau khi giải, giới hạn 20 000 ký tự bỏ đoạn cũ tới `*` đầu tiên, từ chối lịch sử có bước bị chặn, ký tự lạ, bước sau khi giải; test theo scenario "Số bước và hoàn tác", "Chơi lại màn"

## 3. Màn chơi

- [x] 3.1 `rules/solver.ts` (BFS, giới hạn trạng thái, trả lời giải ngắn nhất); test trên màn nhỏ biết trước đáp số; đo thời gian trên một màn 10 × 10 dày khối trong môi trường node và ghi vào design §5 (chọn chạy trong Vitest hay script `levels:check`)
- [x] 3.2 Thiết kế 8 màn chương 1 (thạch thường, đá viên từ 1-5) với `version`, `minMoves`, lời giải trong `levels.solutions.ts`; `levels.test.ts` (node, thời hạn đặt rõ) kiểm phát lại lời giải, không giải sẵn, BFS không ngắn hơn
- [x] 3.3 Thiết kế 8 màn chương 2 (thêm sương sáo), cùng các test; thêm test mỗi màn chương 2 thay sương sáo bằng đá viên thì không giải được hoặc cần số bước khác
- [x] 3.4 Thiết kế 8 màn chương 3 (thêm thạch dừa), cùng các test; ghi tổng thời gian test màn vào design §5
- [x] 3.5 Test mọi `id` không trùng, đúng 3 chương × 8 màn, gợi ý chỉ ở 1-1, 1-5, 2-1, 3-1

## 4. Lưu trên trình duyệt

- [x] 4.1 `progress-store.ts`, phần đọc: đọc từng mục bằng zod, bỏ mục hỏng, `id` lạ, `version` khác; `format` mới hơn thì không ghi đè; `try/catch` cả khi lấy `window.localStorage`; test cho từng nhánh
- [x] 4.2 `progress-store.ts`, phần ghi: kỷ lục chỉ giữ số nhỏ hơn, đọc lại rồi gộp trước khi ghi, `updatedAt` của lần chơi, chọn màn cho "Tiếp tục"; test hai tab (hai bản trong bộ nhớ ghi xen nhau không mất màn đã giải) và scenario "Màn chơi dở gần nhất"
- [x] 4.3 Hook `use-attempt.ts` và `use-progress.ts` qua `useSyncExternalStore` với giá trị phía server "chưa đọc", nghe sự kiện `storage`; test tải lại giữa màn trả đúng bàn, hoàn tác vẫn về bước trước, không chuyển động khi khôi phục

## 5. Màn hình chơi

- [x] 5.1 `theme.css` của trò với token sáng/tối đã chốt, `puzzles/theme-css.test.ts` dùng `src/test/theme-css.ts` (giá trị đủ, hai khối tối giống nhau, các cặp tương phản ở design §9)
- [x] 5.2 `Board.tsx`: SVG, khối nhiều ô vẽ liền, ký hiệu từng loại, dấu đinh ghim, nhân vật, kích thước ô theo khung; chuyển động `moved` rồi bàn cuối, 120 ms + nảy 80 ms, bước mới không chờ, nhánh `motion-reduce`; test component kiểm ký hiệu và khối đã dính vẽ thành một hình
- [x] 5.3 Điều khiển: bốn nút hướng, "Hoàn tác" (`aria-disabled` kèm lý do khi lịch sử rỗng), "Chơi lại màn", phím mũi tên/WASD/Z/Ctrl+Z/R theo luật bỏ qua ở design §7, vuốt trên bàn với ngưỡng 24 px; test component cho phím, phím bổ trợ, menu đang mở, R lặp, nút, vuốt
- [x] 5.4 Vùng thông báo theo `outcome` (ô tới, đẩy, dính, bị chặn kèm lý do, đọc lại lời báo trùng), mô tả bàn theo hàng có gom ô; test nội dung lời báo theo scenario "Đọc được bàn và kết quả mỗi bước"
- [x] 5.5 Khung giải xong thay chỗ hàng điều khiển (số bước, tốt nhất, ít nhất có thể, "Màn tiếp", "Chơi lại màn", "Hoàn tác", "Danh sách màn"; màn cuối không có "Màn tiếp"), mở lại màn đã giải hiện khung, chuyển tiêu điểm theo design §7, dòng gợi ý; test theo scenario "Khi giải xong màn", "Qua màn", "Gợi ý ở màn mở đầu cơ chế"

## 6. Danh sách màn, route và menu

- [x] 6.1 `LevelList.tsx`: ba chương, đã giải và số bước tốt nhất, "Tiếp tục", "Cách chơi", trạng thái "chưa đọc"; test theo scenario "Danh sách màn"
- [x] 6.2 Route catch-all `app/puzzles/jelly-gather/[[...path]]/` với `JellyGatherApp`, `notFound()` cho màn không có, `not-found.tsx` và `error.tsx` có lối về, đường dẫn lạ phía client về danh sách màn; test trang server với đường dẫn hợp lệ, không có, quá nhiều đoạn
- [x] 6.3 `Artwork.tsx` (import `theme.css`) và `apps/web/src/puzzles/registry.ts` (`PUZZLES`)
- [x] 6.4 Thẻ trò giải đố trên menu (`MenuGame` biến thể `puzzle`, `buildMenu` từ `PUZZLES`, nhánh trong `MenuPage` đọc `Puzzles.<id>`, "1 người · 24 màn", lối "Chơi" có `aria-describedby`, không có "Online"); test `menu-games` và `MenuPage` theo scenario "Thẻ trò giải đố trên menu", gồm trò giải đố thử nghiệm; sửa số đếm trong `MenuPage.test.tsx`

## 7. Bản dịch

- [x] 7.1 Namespace `Puzzles`, `JellyGather` và khoá `Menu.levels` ở `vi.json`, `en.json`, `ja.json` (tên, mô tả, chương, gợi ý, cách chơi, nút, lời báo, mô tả bàn, không tìm thấy màn); test bản dịch đầy đủ hiện có xanh

## 8. Kiểm tra trên trình duyệt thật

- [x] 8.1 E2E `puzzles-jelly-gather.spec.ts`:
  - từ menu vào danh sách màn;
  - giải màn 1-1 bằng phím, bằng nút, bằng vuốt (dự án mobile);
  - hoàn tác và chơi lại;
  - tải lại giữa màn không có cảnh báo hydration;
  - kỷ lục, "Màn tiếp", mở lại màn đã giải;
  - phím khi menu "Ngôn ngữ" đang mở;
  - màn không có trả 404;
  - mất mạng vẫn chơi được, không yêu cầu mạng nào mang tiến độ;
  - thanh trên có lối về đúng.
- [x] 8.2 Thêm trang của trò vào `e2e/menu.spec.ts` (số thẻ), `top-bar.spec.ts`, `layout-small.spec.ts` (không cuộn ngang ở 360 px), `motion.spec.ts` (giảm chuyển động), `theme-color.spec.ts`, `a11y.spec.ts`; chạy và xanh
- [x] 8.3 Thêm các ảnh ở design §9 vào `ui-shots/screens.shots.ts`, chạy `pnpm ui:shots`, xem từng ảnh sáng/tối × 390/1280 và 360 × 640, so với mockup
- [x] 8.4 Rà `web-design-guidelines` trên các component mới, sửa điều tìm được

## 9. Tài liệu

- [x] 9.1 `idea.md` (mục trò giải đố, quyết định 19), `plan.md` (§6.3, §10, việc thử thiết bị thật: vuốt, cử chỉ quay lại), `README.md` (cấu trúc thư mục `puzzles/`)

## 10. Kiểm tra cuối

- [x] 10.1 `pnpm check --concurrency=1`, `KNIP_DISABLE_RAW_TRANSFER=1 pnpm knip`, `pnpm spec:check`, `pnpm test:e2e` đều xanh
- [x] 10.2 Hai lượt review code (senior dev, săn bug), sửa các điểm được xác nhận, chạy lại 10.1
- [ ] 10.3 Người dùng chơi thử cả 24 màn trên bản build; màn nào bị chê thì thay và chạy lại test màn

## Workflow follow-up

- Archive change trong cùng PR sau khi xong 10.3, đối chiếu delta với code hiện tại.
- Commit, merge, push chỉ khi người dùng yêu cầu.
