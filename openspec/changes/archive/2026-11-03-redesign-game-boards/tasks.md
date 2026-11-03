## 1. Bố cục màn hình chơi

- [x] 1.1 `games/types.ts`: `BoardProps.layout: (parts: { board; controls }) => ReactNode` và `defaultBoardLayout` cho test; ba `Board` trả `layout({ board, controls })` (Tic-tac-toe, Cờ caro: `controls` là `null` hoặc gợi ý chạm hai lần); test `Board` hiện có chạy với `defaultBoardLayout` và xanh
- [x] 1.2 `PlayScreen`: vùng chơi `data-game` + `bg-game-page`; thanh trên (← "Về menu", `h1` tên game, chip chế độ/luật); hàm `layout` dựng một lưới với thứ tự DOM `notice → status → players → board → controls → buttons` và `grid-template-areas` theo khung (design §1); chỗ cho bàn `--board-room` (cỡ tối đa của từng game trong `Board`); giữ `role="status"`, `ConnectionNotice`
- [x] 1.3 Test component `PlayScreen` (`renderWithIntl`, `getByRole`): `h1` tên game, `status`, các nút của ván tìm được theo tên; vùng chơi có `data-game`; thứ tự DOM của status, bàn, điều khiển, nút đúng như design §1 (`compareDocumentPosition`)
- [x] 1.4 E2E theo "Cờ caro 19×19 trên máy tính", "Cờ cá ngựa trên máy tính" (khung 1280 × 800, ván lưu sẵn có hai lựa chọn ngựa: bàn, `status`, xúc xắc, hai lựa chọn, nút nằm trong khung nhìn — `toBeInViewport`), "Điện thoại hẹp" (360 px: `scrollWidth <= clientWidth`)

## 2. Tic-tac-toe

- [x] 2.1 `games/tictactoe/theme.css` (`[data-game="tictactoe"]`, đủ biến design §2, sáng + hai khối tối giống hệt), import từ `games/tictactoe/index.ts`
- [x] 2.2 `Board`: ô sticker, X `--game-mark-1`, O `--game-mark-2` (bỏ `text-accent`), viền ô chọn được `--game-line`, ô không chọn được viền đứt nền nhạt, dấu vừa đi đứt nét `--game-last-move` thụt vào, quân nét đứt khi trỏ (`hover: hover`), tiện ích `focus-ring`
- [x] 2.3 Test: test `Board`/`local-play` hiện có xanh ("Ô trống không chọn được trông khác ô chọn được", tên đọc được của ô, "Nước vừa đi"); ô vừa đi và ô có tiêu điểm không cùng kiểu dấu

## 3. Cờ caro

- [x] 3.1 `games/caro/theme.css` (`[data-game="caro"]`, design §3, kể cả `--caro-margin`), import từ `games/caro/index.ts`
- [x] 3.2 `Board` — giấy và lưới: dải lề đỏ ngoài lưới, đường kẻ `--game-line` (mỗi 5 đường đậm hơn, chấm sao), viền khung
- [x] 3.3 `Board` — quân và dấu: X/O nét viết tay, vòng đứt nét nước vừa đi, quân xem trước nét đứt đủ màu, hàng thắng gạch màu người thắng + khoanh `--game-win`; tiện ích `focus-ring` (bỏ `-outline-offset-6` tạm của nhánh sửa lỗi); giữ `role="grid"`, roving tabindex, chạm hai lần, mô tả "Nước vừa đi"/"thuộc hàng thắng"
- [x] 3.4 Sửa tràn đầu trang trên điện thoại (chip luật xuống dòng); test `Board` hiện có xanh; E2E `play-caro.spec.ts` (kể cả 19×19 ở 360 px, chạm hai lần) xanh

## 4. Cờ cá ngựa

- [x] 4.1 `games/ludo/theme.css` (`[data-game="ludo"]`, design §4, `--ludo-frame`), import từ `games/ludo/index.ts`; `piece-style.ts` thêm lớp `--piece-*-line`, `--piece-*-ink`, `--piece-*-hover`, `--piece-edge`, nền nút theo màu
- [x] 4.2 `Board` — nền và đường: giấy điệp, viền khung `--ludo-frame`, ô đường `--game-board`/`--game-line`, tâm bàn bốn tam giác
- [x] 4.3 `Board` — chuồng: khối màu, ô giấy trong chuồng, chuồng đích tô nhạt có số, ô chân chuồng viền đứt `--piece-*-line`; chuồng của `toMove` nổi bật (`data-active`, không còn khi ván kết thúc, `motion-reduce`)
- [x] 4.4 `Board` — quân và dấu: quân có viền `--piece-edge` và ký hiệu `--piece-*-ink`, ngựa vừa đi vòng chấm, ô đích viền đứt + quân nét đứt
- [x] 4.5 `Dice` + nút gieo theo người đang đến lượt (design §4): khung `--piece-*-line` của `toMove`, mặt chờ khi chờ gieo, số khi đang chọn ngựa, nhãn `Games.ludo.dieReady`; nút gieo luôn vẽ, trạng thái gieo được (nền màu quân, hover/bấm `--piece-*-hover`) và khoá (kiểu khoá chung thắng màu quân); chip "Lượt trước" (`Games.ludo.lastRoll`) kèm ký hiệu
- [x] 4.6 Phần `controls` của `layout` (xúc xắc, nút gieo, gợi ý, chip, nhóm "Chọn ngựa" lưới 2 cột ≥ 1024 px, `min-h-11`, viền `--piece-*-line`); thay `querySelector("[data-ludo-*]")` bằng `rollButtonRef`/`firstChoiceRef`; giữ `data-ludo-roll`, `data-ludo-choice`, `data-ludo-hint`, `data-target`
- [x] 4.7 Test component (`renderWithIntl`, `getByRole`) với `layout` lưới của `PlayScreen` (khung máy tính) theo "Phân biệt không chỉ bằng màu", "Đánh dấu nước vừa đi" (khung xúc xắc `data-colour="yellow"`, chip ghi Xanh dương gieo được 4), "Xúc xắc khi đang chọn ngựa", "Nút gieo theo màu người sắp gieo", "Chuyển lượt sang người kế tiếp", "Ván kết thúc" (không `data-active`); nút gieo khoá vẫn có trong DOM và có kiểu khoá; test "Gieo và đi bằng bàn phím" hiện có xanh với cả `defaultBoardLayout` và lưới máy tính
- [x] 4.8 Bản dịch vi/en/ja: `Games.ludo.lastRoll`, `Games.ludo.dieReady` (bỏ `dieEmpty` nếu không còn dùng); `messages.test.ts` xanh
- [x] 4.9 E2E `play-ludo.spec.ts`, `online-ludo.spec.ts` xanh ở cả hai cấu hình máy, phần bàn phím chạy ở khung 1280 × 800; sửa truy vấn nhãn xúc xắc nếu đổi; Cờ cá ngựa 4 người ở 360 px không cuộn ngang (spec "Bàn Cờ cá ngựa vừa màn hình điện thoại")

## 5. Kiểm tra

- [x] 5.1 `apps/web/ui-shots/screens.shots.ts`: thêm ảnh ở design "Kiểm tra" (ô vừa đi có tiêu điểm và quân xem trước ở Cờ caro, Cờ cá ngựa sau khi gieo 6, chờ gieo của người kế tiếp, nút gieo khoá, 360 px); chạy `pnpm ui:shots`, xem từng ảnh sáng/tối × 390/1280, so với mockup khung 3–7
- [x] 5.2 Mở rộng test đơn vị tỉ số của `add-design-foundation` (task 1.4) cho ba `games/<id>/theme.css`: các cặp ở design §2–§4 đạt ngưỡng, hai khối tối giống hệt
- [x] 5.3 Rà `web-design-guidelines` trên các file đã đổi
- [x] 5.4 Đối chiếu delta với code; diff trọn thân khối MODIFIED "Bàn Cờ cá ngựa" với `openspec/specs/ludo/spec.md`; `pnpm exec openspec validate redesign-game-boards --strict`, `pnpm check`, `pnpm knip`, `pnpm test:e2e`, `pnpm spec:check`; cập nhật plan.md §10 (M6.5)
- [x] 5.5 Archive change (`pnpm exec openspec archive redesign-game-boards --yes`) trong cùng PR, sau review, sau `add-design-foundation`

## Ngoài phạm vi

- Dải người chơi trên điện thoại, bảng người chơi, khoảnh khắc kết thúc, máy đang nghĩ, lý do nút khoá: `add-game-feedback` (vùng `players` của lưới để sẵn).
- Đổi tên màu quân theo mockup ("Chàm", "Lục"): giữ tên cũ (proposal).
- Hiệu ứng mới khi đặt quân hay đá quân: giữ hiệu ứng hiện có.
