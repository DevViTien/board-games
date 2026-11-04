# Tasks

## 0. Trước khi code

- [x] 0.1 Người dùng duyệt `mockup/index.html` và trả lời câu hỏi mở (04/11/2026, design "Đã chốt với người dùng"); sửa nội dung và hộp thoại theo review (design §4–§5)
- [x] 0.2 `add-resign-and-abandon` đã archive (mục đầu hàng và bỏ ván trên trang luật mô tả hành vi của nó)

## 1. Khung chung

- [x] 1.1 `packages/ui`: `Dialog` (design §4: `h2 tabIndex={-1}` nhận tiêu điểm khi mở, nút đóng có tên, Esc, trả tiêu điểm theo hành vi gốc của `<dialog>`) + `DialogFrame` dùng chung với `ConfirmDialog`; `BookOpenIcon`, `XIcon` trong `icons.ts`; test `Dialog`, test `ConfirmDialog` hiện có xanh không sửa
- [x] 1.2 `features/rules/`: `RulesSection` (nhận cấp tiêu đề), `RulesFigure`, `RulesLeavingSection` (mục chung, biến thể Cờ cá ngựa), `RulesPage`; test component
- [x] 1.3 `games/rules.ts` (`GAME_RULES`) + `games/rules.test.ts` (khoá trùng `GAME_IDS`)
- [x] 1.4 `app/rules/[gameId]/page.tsx`, `not-found.tsx`, `generateMetadata`; `page.test.tsx` theo "Mở trang luật Cờ caro", "Game không tồn tại"
- [x] 1.5 `app/layout.tsx`: `NextIntlClientProvider` nhận messages không có `Rules`; test layout; đo HTML + payload RSC (gzip) của `/`, `/play/caro`, `/play/caro/local`, `/room/<mã>` trước/sau, ghi vào design "Kết quả kiểm tra" (không tăng quá 1 KB: tăng ≤ 0,34 KB)

## 2. Nội dung bốn game

- [x] 2.1 Tic-tac-toe: `Rules.tsx`, `rules/lines.tsx`, khoá `Rules.tictactoe.*` vi/en/ja; test theo "Các mục của Tic-tac-toe"
- [x] 2.2 Cờ caro: `Rules.tsx` (câu mục tiêu nhắc chặn hai đầu; chuỗi dài hơn 5 theo cùng điều kiện), `rules/{five,blocked,edge}.tsx`, khoá vi/en/ja; test theo "Hai luật thắng", "Hình của luật chặn hai đầu", "Hình có tên đọc được"
- [x] 2.3 Cờ cá ngựa: `Rules.tsx` (đủ các điểm ở design §5, kể cả ô xuất phát có ngựa mình, nhảy bắt buộc, đá ở chân chuồng), `rules/{path,jump,home}.tsx` vẽ từ `board-layout.ts` (không mũi tên cắt qua khối chuồng), khoá vi/en/ja; đối chiếu từng câu với `openspec/specs/ludo`; test theo "Các luật đã chốt", "Điều kiện thắng", "Máy chơi thay trên trang Cờ cá ngựa"
- [x] 2.4 Cờ vua: `Rules.tsx`, `rules/{moves,castling,en-passant,promotion}.tsx`, ghi nguồn + liên kết giấy phép, khoá vi/en/ja; đối chiếu với `openspec/specs/chess`; test theo "Các mục của Cờ vua", "Ghi nguồn bộ quân", "Mục đầu hàng của Cờ vua"
- [x] 2.5 Khoá chung `Rules.title`, `Rules.play`, `Rules.backToMenu`, `Rules.notFound.*`, `Rules.common.leaving.*`; chữ của hộp thoại (client) ở `Play.rules`, `Play.rulesDialog.*` (design §1); `messages.test.ts` xanh
- [x] 2.6 Test chung cho mọi trang: "Hình theo giao diện" (mọi `fill`/`stroke`/`style` của SVG là biến màu, `currentColor`, `none` hay `transparent`) và "Trang luật bằng tiếng Nhật" (`renderWithIntl` locale ja: không chữ nào là khoá thô hay trùng bản vi, trừ ngoại lệ ở design §5)

## 3. Lối vào

- [x] 3.1 Thẻ menu: liên kết chữ nhỏ "Luật chơi" + tên game `sr-only` (vùng chạm ≥ 24 px); sửa test `MenuPage`/`PlayLinks` theo vai trò; test theo "Từ menu", "Tên liên kết không trùng"
- [x] 3.2 Màn hình bắt đầu ván: liên kết "Luật chơi"; test theo "Từ màn hình bắt đầu ván"
- [x] 3.3 Màn hình chơi cùng máy / với máy: `PlayScreen` render `LazyRules` trong hộp thoại (design §4 — bản render ở server đã bỏ sau khi đo); nút "Luật chơi" ở thanh trên (chỉ icon dưới `sm`, tên đọc được bằng chữ `sr-only`, 44 × 44 px); dòng "Ván này: …"; đóng thì đọc lại dòng lượt; test theo "Đọc luật giữa ván", "Nút trên màn hình chơi ở điện thoại"
- [x] 3.4 Phòng online (cùng `LazyRules` như mọi chế độ): nạp lười `load-rules.ts` (`GAME_RULES[id]` + messages của ngôn ngữ, cách tách ghi vào design), lỗi nạp → `Play.rulesDialog.loadError` + "Thử lại"; test theo "Không tải được luật"

## 4. E2E, ảnh, bundle

- [x] 4.1 `e2e/rules.spec.ts` theo design §8 (cả "Ván online vẫn chạy" hai trình duyệt); cả hai cấu hình Playwright
- [x] 4.2 `ui-shots/screens.shots.ts`: ảnh ở design §6; chạy `pnpm ui:shots`, xem từng ảnh sáng/tối × 390/1280 (hình đọc được ở giao diện tối), so với mockup
- [x] 4.3 `next build` trước/sau: First Load JS của `/`, `/play/[gameId]`, `/play/[gameId]/[mode]`, `/room/[code]` tăng không quá 1 KB (đo được +0,7, +0,8, +1,3, +1,3 KB: hai trang chơi vượt 0,3 KB vì chính hộp thoại, chấp nhận và ghi lý do trong design); `/rules/[gameId]` không có chunk bàn cờ; ghi vào design "Kết quả kiểm tra"
- [x] 4.4 Rà `web-design-guidelines` trên `features/rules/**`, `games/*/Rules.tsx`, `games/*/rules/**`, `packages/ui/src/components/Dialog.tsx`

## 5. Hoàn tất

- [x] 5.1 `openspec/config.yaml`: thêm "trang luật (`games/<id>/Rules.tsx`) và một dòng `GAME_RULES` (`games/rules.ts`)" vào câu bất biến "Thêm một game chỉ gồm …" (proposal, mục Bất biến)
- [x] 5.2 plan.md §3.2 (thay `rules.{vi,en,ja}.mdx` bằng `Rules.tsx` + `rules/`), §3.3 (dòng "Trang luật chơi"), §4 checklist thêm game (trang luật + dòng `GAME_RULES`; sửa luật thì sửa `Rules.<id>`), §4.7 (`Rules` không có trong provider của client), §10 (M8: change này)
- [x] 5.3 Đối chiếu design và delta với code; `pnpm exec openspec validate add-rules-pages --strict`, `pnpm check`, `pnpm knip`, `pnpm test:e2e` (hai cấu hình), `pnpm spec:check`
- [x] 5.4 Archive change (`pnpm exec openspec archive add-rules-pages --yes`) trong cùng PR, sau review

## Ngoài phạm vi

- Hướng dẫn tương tác, câu đố, hình động, mục "Mẹo cho người mới": người dùng chốt không làm ở M8.
- Luật biến thể Cờ cá ngựa: v1, khi chủ phòng chọn được biến thể.
- Liên kết "Mở trang luật" trong hộp thoại: bỏ để không rời ván (design §4).
- Gập mục bằng `<details>` trên trang Cờ vua: chỉ nếu chơi thử thấy trang dài (design Risks).
