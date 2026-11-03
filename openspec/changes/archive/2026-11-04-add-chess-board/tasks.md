# Tasks

## 0. Trước khi code

- [x] 0.1 Người dùng duyệt `mockup/index.html` (design câu hỏi mở 1); ghi điều chỉnh vào design §2–§8 trước khi apply; `add-chess-rules` đã archive

## 1. Đăng ký, AI Worker, giấy phép

- [x] 1.1 `packages/games`: `chess` vào `GAMES`, `"chess"` vào `GAME_IDS`, `export * from "./chess"`; `index.test.ts` thêm Cờ vua (`findGame`, `isRegisteredGameId`, union `RegisteredGameId`)
- [x] 1.2 `packages/games/src/ai.ts` (`AI_GAMES`, `findAiGame`) + subpath `"./ai"`; test `AI_GAMES` khớp `GAMES.filter((g) => g.meta.supportsAI)` cùng thứ tự; `ai-worker/compute-ai-move.ts` dùng `findAiGame`; test cũ của `ai-worker` xanh
- [x] 1.3 App: `games/chess/index.ts` (`chessEntry`), dòng `chess` trong `GAME_ENTRY_LOADERS` và `GAME_ARTWORK`; `PLANNED_GAMES = [] as const`; `define-game-entry.test.ts` dùng mã chưa đăng ký `"go"`
- [x] 1.4 `MenuPage` nhận `cards?`; sửa `MenuPage.test.tsx` (thứ tự thẻ ~dòng 72–83: bốn thẻ chơi được, 0 "Sắp có"; "gives a coming-soon game no link" ~140–147 dùng `cards` giả; đếm "Coming soon" en/ja ~220–226: 0) và thêm test theo "Thẻ Cờ vua", "Thẻ sắp có không mở được" (với `cards` có một game dự kiến)
- [x] 1.5 Test theo "Chế độ chơi Cờ vua" (chỉ "Cùng máy"/"Online", `/play/chess/ai` → không tìm thấy); `next build` trước/sau: First Load JS của `/`, `/play/[gameId]`, `/room/[code]` không tăng quá 1 KB, chunk AI Worker không chứa `chess.js`, chunk màn hình Cờ vua có; ghi vào design "Kết quả kiểm tra"
- [x] 1.6 `apps/web/public/third-party-licenses.txt` (BSD-2-Clause của `chess.js`, nguyên văn; ghi công bộ quân staunty CC BY-NC-SA 4.0); README một dòng trỏ tới file

## 2. Bản sắc và quân

- [x] 2.1 `games/chess/theme.css` theo bảng design §3 (sáng + hai khối tối giống hệt)
- [x] 2.2 `games/theme-css.test.ts`: dạng cặp hai lớp `[[a, b], nền, ngưỡng]`, `FOCUS_BACKGROUNDS` theo game; `GAME_PAIRS.chess` đủ mọi dòng bảng §3; test cũ của ba game xanh không sửa kỳ vọng
- [x] 2.3 Bộ quân "staunty" (design §4, người dùng đổi ngày 04/11/2026 thay bộ tự vẽ): 12 SVG nguyên byte ở `apps/web/public/pieces/staunty/` + `LICENSE.txt`; `games/chess/pieces.tsx` (`ChessPiece` bằng `<img alt="">`, biến thể "ink" là bóng `mask-image` cho sổ ghi); `SeatMark.tsx`; test: mỗi loại × màu đúng file, hình `aria-hidden`; `theme-css.test.ts` kiểm token quân khớp màu trong file
- [x] 2.4 `games/chess/Artwork.tsx` (2 × 2 ô, Vua trắng, Mã đen staunty theo địa chỉ file, không import module nào của game); lint xanh
- [x] 2.5 Bản dịch vi/en/ja mọi khoá ở design §9; `messages.test.ts` xanh

## 3. Khung: thanh người chơi quanh bàn

- [x] 3.1 `games/types.ts`: `BoardParts.seatOrder?`; tách `SeatBar` từ `PlayerPanel`; `PlayScreen` vẽ hai thanh quanh `board` khi có `seatOrder` và bỏ bảng ở cột bên; test theo "Thanh người chơi quanh bàn Cờ vua" (`local-play`), thanh online có "Bạn · Đen" + chip kết nối; test `PlayScreen`/`PlayerPanel` cũ xanh không sửa

## 4. Bàn

- [x] 4.1 `Board.tsx` phần hiển thị (design §5): lưới theo thứ tự hiển thị, ô `<button>`, toạ độ HTML theo hướng, vòng `box-shadow` ngoài lưới, tên ô và mô tả, `seatOrder`; test theo "Thế mở đầu trên thiết bị dùng chung", "Cầm Đen khi chơi online", "Toạ độ theo hướng bàn", "Thanh đổi chỗ khi lật bàn"
- [x] 4.2 `use-selection.ts` (khoá nội dung `fen|san.length`, bỏ chọn khi khoá đổi / `disabled` / hết nước); test hook: cùng thế với object mới giữ lựa chọn, thế đổi / khoá / hoàn tác bỏ chọn
- [x] 4.3 Chọn và đi quân bằng chuột/chạm trong `Board.tsx`; test theo "Chọn quân hiện nước đi" (kể cả `aria-selected` và lời báo), "Quân không có nước đi", "Đi quân", "Ô ăn được quân", "Bắt tốt qua đường là ăn quân", "Đổi quân rồi bỏ chọn", "Quân đối phương không chọn được"; lời báo nằm trong một phần tử `aria-live` duy nhất của bàn, sổ ghi không trong vùng live
- [x] 4.4 `use-roving-focus.ts` + bàn phím; test theo "Vào bàn bằng Tab" (kể cả khi có nước vừa đi), "Đi Mã bằng phím", "Mũi tên theo hướng bàn đang lật", dừng ở mép, Home/End, Escape bỏ chọn mà không rời bàn, `event.repeat` bị bỏ qua, "Tab rời bàn"; ô có tiêu điểm và ô đang chọn có class khác nhau
- [x] 4.5 `PromotionPicker.tsx` (design §6, cách đóng như `ConfirmDialog`, `.focus()` tường minh); test theo "Phong thành Mã", "Hậu có tiêu điểm trước" (tiêu đề "Tốt e7 → e8"), "Huỷ phong cấp" (Escape, nút "Huỷ", và `close` không kèm `cancel`), quân phong của Đen màu Đen, không có nước nào được gửi khi chưa chọn
- [x] 4.6 Test theo "Giữ lựa chọn khi phòng cập nhật" với transport online giả: "Đối thủ nối lại khi đang chọn quân", "Bàn bị khoá khi bộ chọn đang mở", bộ chọn đóng khi nước của nó không còn hợp lệ
- [x] 4.7 Nút "Lật bàn" (`aria-pressed`); test theo "Lật bàn trên thiết bị dùng chung", "Không tự lật sau nước đi", "Chơi lại đưa bàn về hướng mặc định"
- [x] 4.8 Dấu ô theo design §7 và chữ báo chiếu (`aria-live` theo `viewer`); test theo "Đánh dấu nước vừa đi", "Vua bị chiếu", "Báo chiếu trên thiết bị dùng chung" (`PlayScreen` Cờ vua có đúng một `role="status"`; online `aria-live="off"`)
- [x] 4.9 Nút "Đòi hoà" + lý do; test theo "Đòi hoà khi lặp lại ba lần", "Không có quyền đòi hoà", "Đối thủ ở xa không thấy nút"; bấm gửi đúng `{ type: "claim-draw" }`
- [x] 4.10 Hiệu ứng trượt (design §11); test: `animate` gọi một lần sau nước mới (hai lần khi nhập thành), không gọi khi hoàn tác/tải lại; "Giảm chuyển động" với `matchMedia` giả

## 5. Sổ ghi, lời, kết quả

- [x] 5.1 `san.ts` (tách SAN, `describeSan`); test: `e4`, `Nf3`, `exd5`, `Nbd2`, `R1e2`, `O-O`, `O-O-O`, `e8=Q+`, `Qh4#`, cả ba ngôn ngữ
- [x] 5.2 `MoveSheet.tsx` (design §8); test theo "Sổ ghi sau ba nửa nước", "Hoàn tác bỏ nước khỏi sổ ghi", "Tỉ số khi kết thúc" (kể cả `½–½` sau đòi hoà), rỗng, `aria-current`, khung `role="region"` có tên và `tabIndex=0`, không `aria-live`; nước mới đặt `scrollTop`/`scrollLeft` của khung (không gọi `scrollIntoView`)
- [x] 5.3 `move-label.ts`, `player-label.ts`; test đơn vị cho mọi dạng nhãn (đi, ăn, nhập thành hai cánh, phong cấp, chiếu, **chiếu hết**, đòi hoà); component test `PlayScreen` với transport online giả theo "Đối thủ đi Mã", "Đối thủ ăn quân và chiếu" (`Qxf7+` sau 1. e4 e5 2. Qh5 Nc6), "Đối thủ nhập thành"
- [x] 5.4 `seat-summary.ts`, `result-detail.ts`; test theo "Ván mới", "Hơn một Mã" ("+3" trên ô hẹp), hơn nhiều loại quân, phong cấp làm đổi điểm; "Thắng bằng chiếu hết", "Hoà vì hết nước đi", "Hoà vì đòi theo luật 50 nước" và bốn lý do hoà còn lại
- [x] 5.5 `features/play/every-game.test.tsx` xanh với Cờ vua

## 6. E2E và ảnh

- [x] 6.1 `e2e/play-chess.spec.ts` cùng máy: chiếu hết 1. f3 e5 2. g4 Qh4# bằng chuột → "Đen thắng!", "Chiếu hết", "0–1"; nhập thành cánh vua; phong cấp chọn Mã (ván lưu sẵn bằng `writeSaved`); bắt tốt qua đường; đòi hoà sau lặp lại ba lần; một nước bằng bàn phím; hoàn tác; tải lại giữ ván và sổ ghi
- [x] 6.2 E2E khung: 360 px (8 cột, `gridcell` rộng ≥ 40 px, toạ độ cao ≥ 10 px, không cuộn ngang) và 1280 × 800 (`toBeInViewport` mọi phần của "Máy tính" và "Ván dài" với ván lưu sẵn 120 nửa nước)
- [x] 6.3 `e2e/online-chess.spec.ts` hai trình duyệt: "Hai người chơi qua link mời" (hướng bàn, thanh người chơi mỗi bên), nhãn nước của đối thủ, "Phong cấp online", "Đòi hoà online", chiếu hết rồi "Chơi lại đổi màu"; cả hai cấu hình Playwright
- [x] 6.4 `ui-shots/screens.shots.ts`: các ảnh ở design "Kiểm tra"; chạy `pnpm ui:shots`, xem từng ảnh sáng/tối × 390/1280, so với mockup; sửa lệch trước khi review
- [x] 6.5 Rà `web-design-guidelines` trên `games/chess/**` và phần `PlayScreen` đã đổi; checklist UX bàn cờ của skill `board-games-ui` (cùng máy, online)

## 7. Hoàn tất

- [x] 7.1 plan.md §3.3 (hàng AI: `AI_GAMES`; hàng khung màn hình ván: `seatOrder`), §4 checklist thêm game (dòng `AI_GAMES` cho game có máy), §10 (M7 xong; số đo bundle; còn lại: thử trên điện thoại thật và online giữa hai thiết bị); README nếu có danh sách game
- [x] 7.2 `openspec/config.yaml`: sửa câu bất biến "Thêm một game chỉ gồm …" thêm "và, nếu game có máy, một dòng `AI_GAMES`" (proposal, mục Bất biến)
- [x] 7.3 Đối chiếu design và delta với code; diff trọn thân các khối MODIFIED (`game-menu` hai khối, `local-play` "Bảng người chơi") với `openspec/specs/`; `pnpm exec openspec validate add-chess-board --strict`, `pnpm check`, `pnpm knip`, `pnpm test:e2e` (hai cấu hình), `pnpm spec:check`
- [x] 7.4 Archive change (`pnpm exec openspec archive add-chess-board --yes`) trong cùng PR, sau review, sau `add-chess-rules`
- [x] 7.5 Sau archive: cập nhật `## Purpose` của `openspec/specs/chess` (archive của `add-chess-rules` chỉ ghi phần luật) thêm bàn cờ trên màn hình (chọn và đi quân, phong cấp, lật bàn, sổ ghi, thanh người chơi), chơi cùng máy và online; đổi tên scenario "Menu khi có Tic-tac-toe và Cờ caro" của `openspec/specs/game-menu` thành "Menu có bốn game chơi được" (khối MODIFIED không đổi được tên scenario: validator đòi giữ scenario cũ) cùng tên test trong `MenuPage.test.tsx`; `pnpm spec:check` xanh

## Ngoài phạm vi

- Máy chơi Cờ vua, đồng hồ (thanh người chơi chỉ để chỗ), đề nghị hoà cần đối phương đồng ý, đầu hàng/bỏ ván, PGN, premove, Chess960: đã chốt với người dùng.
- Đòi hoà bằng nước báo trước (FIDE 9.2.1): `add-chess-rules` Ngoài phạm vi.
- Kéo thả quân: xét lại sau khi chơi thử (proposal).
- Xác nhận trước khi đòi hoà: chỉ thêm nếu chơi thử thấy bấm nhầm (design Risks).
- Lời "bắt tốt qua đường" trong nhãn nước của đối thủ: SAN không phân biệt; nhãn đọc như ăn thường (design §9).
- Liên kết tới `third-party-licenses.txt` trong app, trang luật chơi: M8.
- Game "Sắp có" mới: người dùng chốt không thêm sau M7.
