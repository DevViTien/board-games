# Tasks

## 0. Thiết kế

- [x] 0.1 Người dùng chốt: chơi theo lượt, 2 và 4 người, đồ hoạ 2D, ngày 06/11/2026
- [x] 0.2 Mockup chạy được trong `mockup/` (ảnh `mockup/png/`), người dùng duyệt ngày 06/11/2026, rồi chọn cổng đích 5 ô cùng ngày; đã chốt design §2, §4–§6
- [x] 0.3 Hai lượt duyệt thiết kế (kiến trúc và trải nghiệm; luật và máy, có tự chơi), đã gộp vào spec và design; người dùng đã chọn cổng đích 5 ô để luật có bản sắc riêng

## 1. Luật

Trong nhóm 1–3, game chỉ export qua `@board-games/games/fence-race`, chưa đăng ký vào `GAME_IDS`, nên typecheck và test của các game khác luôn xanh. Đăng ký ở task 3.13.

- [x] 1.1 `packages/games/src/fence-race/`: hằng số, kiểu (có `lastFrom`), `setup`, `currentPlayer`, export `./fence-race` trong `package.json`; test theo "Bàn và người chơi" (ba scenario)
- [x] 1.2 Đi quân: test theo "Mỗi lượt một việc" và "Đi quân" (bị rào ngăn, đứng chung ô, không nhảy, ra ngoài bàn, đi chéo, `lastFrom`)
- [x] 1.3 `fenceRaceDistance`, `fenceRaceFenceIssue`, nước đặt rào: test theo "Đặt rào" và "Luôn còn đường về đích" (mọi mã lý do, bịt đường của đối thủ, của chính mình, của người thứ ba, quân khác không chắn)
- [x] 1.4 Phá rào: test theo "Phá rào" (ba scenario, thêm rào bị phá không trả lại ai, sau khi phá đặt lại được vào chỗ đó)
- [x] 1.5 Kết thúc ván: test theo "Thắng khi về đích" và "Giới hạn lượt" (thắng, hoà, về đích ở nước cuối, giới hạn 198 ở ván ba người, ô ngoài cổng, cổng của người khác)
- [x] 1.6 `describeGameContract` với 2, 3, 4 người; test "Ván ngẫu nhiên kết thúc" với ít nhất 100 ván mỗi số người; dựng lại từ danh sách nước đi cho đúng state
- [x] 1.7 Tối ưu `legalMoves` theo design §2; test so kết quả với cách kiểm mọi rào bằng BFS trên các thế ngẫu nhiên; đo thời gian `legalMoves` và phát lại ván 200 nước, ghi số vào design

## 2. Máy

- [x] 2.1 `evaluate` và `candidateMoves` theo design §3 (đi quân chỉ theo đường ngắn nhất, điểm phạt đối thủ sát đích); hợp đồng `candidate-moves` xanh
- [x] 2.2 Test theo "Máy chơi Cờ rào": đi nước thắng, chặn đối thủ sắp về đích trong ván hai người (kể cả hết giờ ngay từ đầu; khe một ô không có rào chặn được thì đi nước khác), "Máy biết phá rào" ở mức Vừa trên thế cờ dựng sẵn, không dùng đồng hồ thật
- [x] 2.3 Sửa cách máy dùng lần phá theo design §3, đo lại: bên có lần phá phải không thua kém bên không có, ở mức Vừa và độ sâu 3, có nước mở đầu ngẫu nhiên; ghi số vào design. Test "Khó thắng Dễ", "Khó thắng Vừa", "Máy không đi qua đi lại" với seed cố định, không phụ thuộc tốc độ máy: `chooseMove` không nhận độ sâu nên dùng đồng hồ `ticking` như `ludo/ai.test.ts`, hoặc `searchRoot`, và ghi rõ test đo gì
- [x] 2.4 Đo thời gian: mức Vừa trên server dưới 50 ms một nước ở thế giữa ván; mức Khó không vượt `AI_TIME_LIMIT_MS`; ghi số vào design
- [x] 2.5 Tự chơi ít nhất 200 ván mức Vừa cho mỗi số người, **có 2 nước mở đầu ngẫu nhiên** (không có thì ván gần như tất định và số đo sai lệch), thêm độ sâu 3 cho 2 và 3 người: tỉ lệ thắng theo ghế, số nước trung bình, số ván hết lượt, tỉ lệ dùng phá rào; ghi vào design. Có trên 1% ván hết lượt thì sửa máy, không chỉnh số rào. Chỉnh số rào chỉ khi ghế nào đó thắng quá 65% ở ván hai người hay gấp 1,5 lần tỉ lệ công bằng ở ván 3–4 người, rồi sửa spec và proposal theo số mới

## 3. Giao diện

Mỗi task có chữ mới thì thêm khoá vào `vi.json` ngay trong task đó, cùng `en.json`, `ja.json`.

- [x] 3.1 `games/fence-race/theme.css` theo design §4, cả ba khối sáng và tối; thêm vào `GAME_PAIRS` của `theme-css.test.ts`, test xanh
- [x] 3.2 `board-layout.ts` và `board-geometry.ts` với unit test: toạ độ theo hướng quay, chạm sang rào gần nhất, sang rào đã có gần nhất, biên bàn, vùng bấm nới ở ô nhỏ
- [x] 3.3 `pieces.tsx`, `Board.tsx` phần hiển thị: ô, cổng đích, quân và tới bốn quân chung ô, rào, tên hàng cột, lượt trên bàn, nước vừa đi, dấu kết thúc; component test theo "Hiển thị bàn"
- [x] 3.4 Chế độ Đi quân và hàng nút chế độ (tự vẽ, `aria-pressed` + `aria-disabled`), câu gợi ý, câu mục tiêu: test theo "Ba chế độ thao tác"
- [x] 3.5 Rào xem trước bằng chạm và kéo: lớp phủ con trỏ, `pinch-zoom`, `pointercancel`, giữ hướng, chạm lại đổi hướng; test theo "Đặt rào có xem trước" phần "Xem trước", "Xoay rào", "Kéo giữ hướng", "Chạm lại không đặt nhầm", "Huỷ"
- [x] 3.6 Số bước đổi và lý do không hợp lệ từ `fenceRaceFenceIssue`, nút xác nhận: test "Báo đường dài ra", "Rào bịt kín đường", không gửi nước đi khi xem trước
- [x] 3.7 Phá rào có xác nhận: test theo "Phá rào có xác nhận" (hai scenario)
- [x] 3.8 Vòng đời xem trước: test theo "Vòng đời rào xem trước", kèm làm lại, ván mới, máy chơi thay, nhả pointer capture khi vị trí đổi
- [x] 3.9 Bàn phím: test theo "Dùng được bằng bàn phím" (kể cả bàn đã quay, nút xác nhận không làm mất tiêu điểm)
- [x] 3.10 Trình đọc màn hình: test theo "Dùng được bằng trình đọc màn hình" (hai scenario), `aria-live` không chồng dòng lượt, `notes` không có `id` hay `role="status"`
- [x] 3.11 Hướng bàn: test theo "Bàn quay theo người chơi" (hai scenario, tên ô không đổi theo hướng); chuyển động theo design §8, kiểm nhánh giảm chuyển động bằng `reducedMotion`
- [x] 3.12 `useSeatSummary`, `SeatMark`, nhãn người chơi: test theo "Bảng người chơi của Cờ rào"; `useMoveLabel`, `useResultDetail`: test theo "Đọc nước đi và kết quả"
- [x] 3.13 Đăng ký game: `GAME_IDS`, `GAMES`, `AI_GAMES` (kèm `index.test.ts` với union id mới), `Artwork.tsx`, `index.ts`, một dòng `GAME_ENTRY_LOADERS`, `GAME_ARTWORK`; sửa test liệt kê game (`MenuPage.test.tsx` kể cả tiêu đề test theo tên scenario mới, `menu-games.test.ts`); test `every-game`, `artwork.test.ts`, test menu theo "Mọi game đã có luật đều chơi được" và "Thẻ Cờ rào"; đo bàn đứng yên với chuỗi vi, en, ja dài nhất
- [x] 3.14 `Rules.tsx` và hình trong `rules/`, `RulesLeavingSection rooms="standIn" vsAi`, một dòng `GAME_RULES`; test theo "Luật Cờ rào" (ba scenario) và "Máy chơi thay trên trang Cờ rào"; rà câu nhắc trong `online-play` "Nhắc người đến lượt" đúng với phòng từ ba ghế của Cờ rào
- [x] 3.15 Rà bản dịch en, ja toàn bộ `Games.fence-race.*`, `Rules.fence-race.*`; test bản dịch xanh, đủ khoá và cùng tham số

## 4. Kiểm tra đầu cuối

- [x] 4.1 E2E `apps/web/e2e/fence-race.spec.ts`, cùng máy: 2 và 4 người tới khi về đích, đặt rào, phá rào, rào bị cấm; thêm `savedFenceRaceGame` vào `helpers.ts`
- [x] 4.2 E2E đấu với máy: 2 người ở ba mức, 4 người với ba máy, tải lại giữa ván còn dấu ô vừa rời
- [x] 4.3 E2E online hai trình duyệt: đặt rào, phá rào, nối lại giữa ván khi đang xem trước, rào đang gửi không nháy, tên ô giống nhau trên hai bên, phòng 4 ghế có ghế máy và máy chơi thay
- [x] 4.4 E2E theo "Dùng được trên điện thoại": kéo rào bằng touch thật, trang không cuộn khi đặt rào, hai ngón phóng to, cuộn được ở Đi quân; bàn không dịch khi đổi chế độ, xem trước, xoay, khi có nước đối thủ, ở 360 × 740, 360 × 640, 740 × 360, 844 × 300, 844 × 390, 1280 × 800; thêm game vào `layout-small.spec.ts` kể cả các vòng lặp theo tên game; sửa `menu.spec.ts` (số thẻ)
- [x] 4.5 Chat trong phòng Cờ rào: bảng chat trên máy tính không che bàn và hàng điều khiển, dòng xem trước vẫn đọc được qua `ChatNotes`; trên điện thoại đóng chat là đi tiếp được và xem trước còn nguyên
- [x] 4.6 Thêm Cờ rào vào `ui-shots/screens.shots.ts` và `a11y.spec.ts`; xem từng ảnh sáng/tối × 360/390/1280 và so với `mockup/png/`; `test:a11y` không có vi phạm

## 5. Tài liệu

- [x] 5.1 `idea.md`: §3.3 thêm Cờ rào, §9 thêm quyết định làm game tự thiết kế này sớm; plan.md §6.3 và §10, kèm danh sách thử thiết bị thật (kéo rào bằng ngón tay, `pinch-zoom` trên Safari iOS, trình đọc màn hình); README danh sách game; kiểm bằng cách đọc lại khớp code

## 6. Hoàn tất

- [x] 6.1 Rà `web-design-guidelines` trên các file giao diện, hai lượt duyệt code (senior, săn lỗi), sửa các phát hiện kèm test hồi quy
- [x] 6.2 `pnpm check --concurrency=1`, `KNIP_DISABLE_RAW_TRANSFER=1 pnpm knip`, `pnpm format:check`, `pnpm spec:check`, `pnpm test:e2e`, `pnpm test:a11y`, `pnpm ui:shots` xanh

## Workflow follow-up

- Archive trong cùng PR với task cuối, sau khi đối chiếu delta với code.
- Khi được yêu cầu merge: thử trên Production bằng hai kết nối, có đặt rào, phá rào và nối lại giữa ván.
