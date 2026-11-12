# Tasks

## 0. Thiết kế

- [x] 0.1 Người dùng chốt cách chơi "cùng nhau, theo lượt" (2–4 người, cùng phe, mỗi người một nhân vật trên một bản đồ rộng), ngày 12/11/2026
- [x] 0.2 Mockup chạy được trong `mockup/` (ảnh `mockup/png/`), người dùng duyệt; ghi ngày duyệt và điều chỉnh (nếu có) vào design
- [x] 0.3 Hai lượt duyệt thiết kế (kiến trúc và luật; trải nghiệm và giao diện), đã gộp vào spec, design và mockup: không tự chuyển lượt, cửa kẹt, giới hạn lùi, "Giữ nút", cờ cùng phe trong snapshot, chữ "Ván dừng"/"Ván kết thúc", Enter chỉ ngoài nút, hướng bị chặn tắt kèm lý do, cửa mở vẽ bằng cột

## 1. Luật (`packages/games/src/jelly-crew/`)

Trong nhóm 1, game chỉ export qua `@board-games/games/jelly-crew`, chưa đăng ký vào `GAME_IDS`, nên typecheck và test của các game khác luôn xanh. Đăng ký ở task 3.1.

- [x] 1.1 Kiểu, hằng số (`JELLY_CREW_MAP`, `JELLY_CREW_REASON`, số bước và số lần lùi mỗi lượt), `parseLayout` với mã lỗi theo design §4 (kể cả khuôn trên nút hay cửa, loại có khuôn không vừa khít), export `./jelly-crew` trong `package.json`; test từng mã lỗi trên bố cục nhỏ dựng trong test
- [x] 1.2 `setup`, `parseOptions`, `currentPlayer`; test theo "Bản đồ và người chơi" (ba scenario)
- [x] 1.3 Bước đi, đẩy cả dãy, `settle`; test theo "Đi và đẩy thạch" và "Thạch dính nhau" (mọi scenario, thêm: sương sáo dính hai màu, khối nhiều ô bị một ô chặn, mép bàn)
- [x] 1.4 Nút, cửa và cửa kẹt (xét theo bàn trước bước); test theo "Nút và cửa" (năm scenario, thêm: hai nút cùng nhóm, khối nhiều ô nằm vắt qua cửa, đẩy vào cửa đóng bị chặn)
- [x] 1.5 Lượt không tự chuyển, `end`, `back` (tối đa 5 lần), `reset` (so dạng chuẩn, giữ số bước), giới hạn vòng, `result`, `last`, `trail`; test theo "Lượt nhiều bước", "Lùi bước trong lượt", "Đặt lại bản đồ", "Giới hạn vòng", "Thắng khi đầy khuôn" (mọi scenario); test kết thúc như `ludo/termination.test.ts`: không ván nào vượt `16 × rounds × playerCount` nước
- [x] 1.6 `describeGameContract` với 2, 3, 4 người và từng bản đồ (`options`); chọn `maxPlies` từ số đo; dựng lại từ danh sách nước cho đúng state; đo `fromRecord` một biên bản 1.000 nước (ngân sách dưới 50 ms trên máy dev), ghi số vào design §8
- [x] 1.7 Thiết kế 9 bố cục (3 bản đồ × 2, 3, 4 người, ≤ 19 × 13) theo design §4, lời giải mẫu trong `layouts.solutions.ts`, số vòng mỗi bố cục khoảng 2,5 lần lời giải; test "Bố cục giải được" (phát lại thắng, người thắng là mọi ghế, ≤ ½ số vòng; BFS cửa luôn đóng không giải được, chạm giới hạn là thất bại); ghi kích thước, số bước và số vòng của từng bố cục vào design

## 2. Game cùng phe (engine, transport, server, màn hình chơi)

- [x] 2.1 `GameMeta.cooperative`; `sessionResult` cho game cùng phe kết thúc ngoài luật là `draw` kèm lý do; sửa chú thích "every other seat wins"; test theo "Đầu hàng và bỏ ván" ("Bỏ cuộc trong game cùng phe") và "Khai báo game" ("Đọc cờ cùng phe"); biên bản giữ việc bỏ cuộc của game cùng phe
- [x] 2.2 Kiểm tra hợp đồng `cooperative-winners` và `cooperative-no-ai`; test mỗi vi phạm (game cùng phe giả cho thắng một ghế; game cùng phe khai báo có máy) chỉ làm hỏng đúng kiểm tra đó ("Thắng trong game cùng phe")
- [x] 2.3 Snapshot của `local-transport` và `online-transport` có `cooperative` và `ending`; `ResignOption.outcome` thêm `"end"`; `claim` là `"end"` ở game cùng phe; test hai transport
- [x] 2.4 Server: game cùng phe giả trong `room-service-abandon.test.ts`: bỏ cuộc và xử bỏ ván cho `draw` kèm lý do, "Chơi lại" được sau đó ("Chơi lại sau khi ván dừng")
- [x] 2.5 `PlayScreen` và `PlayerPanel` cho game cùng phe: "Cả đội thắng!", "Ván kết thúc", "Ván dừng" (đứng trước các nhánh hiện có), dòng bỏ cuộc/bỏ ván từ `ending`, không nhãn "Thắng" từng ghế; bản dịch vi/en/ja; test theo "Kết quả của game cùng phe" (`local-play`) và các scenario kết quả của "Game cùng phe khi chơi online"
- [x] 2.6 Nút và hộp thoại "Bỏ cuộc", câu chờ và hộp thoại xử bỏ ván "Kết thúc ván", câu nhắc 4 phút cho game cùng phe; bản dịch vi/en/ja; test các scenario còn lại của "Game cùng phe khi chơi online"; test hiện có của các game khác vẫn xanh

## 3. Giao diện (`apps/web/src/games/jelly-crew/`)

Mỗi task có chữ mới thì thêm khoá vào `vi.json` ngay trong task đó, cùng `en.json`, `ja.json`.

- [x] 3.1 Đăng ký: `GAME_IDS`, `GAMES`, `GAME_ENTRY_LOADERS`, `GAME_ARTWORK`, `GAME_RULES`; tên game, mô tả thẻ, nhãn tuỳ chọn bản đồ; test registry và `every-game.test.tsx` xanh; thẻ menu theo "Game chơi được và game sắp có trên menu" ("Thẻ Đội gom thạch")
- [x] 3.2 `theme.css` theo design §7, ba khối sáng và tối; thêm vào `GAME_PAIRS` của `theme-css.test.ts`, test xanh
- [x] 3.3 `pieces.tsx`, `Board.tsx` phần hiển thị: tường, khuôn, nút, cửa mở (hai cột) và đóng (song), thạch, nhân vật có số, huy hiệu giữ nút, vòng lượt, khung bàn màu ghế, vệt đường đi, chip; component test theo "Hiển thị bàn" và "Chip của ván"
- [x] 3.4 Bàn điều khiển: hướng bị chặn tắt kèm lý do, khoá đồng bộ khi không phải lượt, hộp thoại đặt lại, dòng "đã đặt lại bản đồ", "Lùi bước" chỉ khi online; phím (không lặp, Enter chỉ ngoài nút và liên kết, Z chỉ online, bỏ qua khi gõ chat hay có hộp thoại); vuốt 32 px và `touch-action` theo lượt; test theo "Thao tác" (năm scenario, thêm: không phải lượt thì không đi được)
- [x] 3.5 "Giữ nút": bật/tắt, tự gửi "Xong lượt" khi tới lượt, thôi giữ khi đi, lùi, đặt lại hay rời nút; test theo "Đứng giữ nút" (hai scenario, cả cùng máy và online)
- [x] 3.6 Chuyển động 120 ms và nhánh giảm chuyển động; test với `reducedMotion` rằng trạng thái cuối hiện đúng
- [x] 3.7 `usePlayerLabel`, `SeatMark`, `useSeatSummary`, `useMoveLabel` (từ `state.last`), `useResultDetail`, lời báo bước bị chặn (`aria-live`, không vai trò) và "Mô tả bàn"; test theo "Bảng người chơi của Đội gom thạch", "Dùng được bằng trình đọc màn hình", "Đọc nước đi và kết quả"
- [x] 3.8 `Artwork.tsx` và trang luật `Rules.tsx` có hình (giữ nút cho người khác đẩy qua cửa; bước bị nhân vật chắn); test theo "Luật Đội gom thạch" và "Đầu hàng và bỏ ván trên trang luật" ("Bỏ cuộc trên trang Đội gom thạch")
- [x] 3.9 Điện thoại: xem bàn cả 9 bố cục ở 360 × 640; test E2E theo "Dùng được trên điện thoại" (không cuộn ngang, nút bấm được, kéo trên bàn cuộn trang khi không phải lượt)

## 4. Tài liệu

- [x] 4.1 `idea.md` §3.3 và quyết định mới ở §9 (game cùng phe, chọn ngày 12/11/2026); plan.md §6.3 và §10; README (danh sách game, cấu trúc thư mục)
- [x] 4.2 Skill `board-games-ui`: thêm hướng hình của Đội gom thạch vào "Bản sắc từng game"

## 5. Kiểm tra

- [x] 5.1 E2E `games-jelly-crew.spec.ts`: cùng máy chơi hết bố cục 2 người "Hai gian bếp" bằng phím và thấy "Cả đội thắng!"; online hai trình duyệt: giữ nút, đẩy qua cửa, lùi bước, bỏ cuộc; thêm cảnh vào `ui-shots/screens.shots.ts` theo design §9
- [x] 5.2 `pnpm ui:shots`, xem từng ảnh sáng/tối × 390/1280 so với mockup; rà `web-design-guidelines` trên các file giao diện đã đổi; hai lượt review code (senior dev, săn bug), sửa xong
- [ ] 5.3 Người dùng chơi thử cùng máy và online với bạn (ít nhất một bố cục mỗi bản đồ); ghi nhận xét và sửa (bố cục, số vòng) trước khi archive
- [x] 5.4 `pnpm check`, `pnpm knip`, `pnpm spec:check`, `pnpm test:e2e` xanh; cập nhật plan.md §10

## Ngoài phạm vi

- Xem proposal.md, mục "Ngoài phạm vi". Thêm: bảng xếp hạng số vòng ít nhất của mỗi bố cục (chưa có chỗ lưu chung cho game online); thu gọn bảng người chơi 3–4 ghế trên điện thoại (việc của khung chung); phím hoàn tác cho mọi game khi chơi cùng máy.

## Workflow follow-up

- Archive `add-jelly-gather-puzzle` và `add-jelly-gather-molds` trước change này (chúng tạo capability `jelly-gather`, không chạm capability của change này, nhưng archive theo thứ tự tạo).
- Archive change này sau task 5.4, cùng PR.
