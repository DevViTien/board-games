# Proposal

## Why

idea.md §4.1 hứa "Trang **luật chơi** ngắn gọn cho từng game, có hình minh hoạ", và phác thảo màn hình bắt đầu ván (§5) có lối "📖 Luật chơi". Tiêu chí xong của M8 là "bạn bè dùng thử trên điện thoại và laptop **không cần hướng dẫn thêm**": Cờ cá ngựa có luật do người dùng chốt (gieo 1 nhảy tới chân chuồng kế tiếp, thắng khi chiếm bậc 3–6) khác luật nhiều nhà vẫn chơi, Cờ caro có hai luật thắng, Cờ vua có đòi hoà theo FIDE — hiện không chỗ nào trong app giải thích. Thuộc mốc **M8. Hoàn thiện MVP** (plan.md §6.2: "Trang luật chơi từng game"); làm sau `add-resign-and-abandon` (trang luật giải thích đầu hàng và bỏ ván).

## What Changes

- **Trang luật** `/rules/<mã game>` cho mọi game đã đăng ký (Tic-tac-toe, Cờ caro, Cờ cá ngựa, Cờ vua): tiêu đề, vài mục ngắn có tiêu đề (mục tiêu, bàn và quân, lượt đi, thắng/hoà, các luật riêng), hình minh hoạ SVG tự vẽ cho từng luật khó, lối "Chơi <game>" và "Về menu". Mã game không có → trang "không tìm thấy". Trang render ở server, không thêm JavaScript ở client.
- **Nội dung đúng luật đang chạy**: viết theo `openspec/specs/{tictactoe,caro,ludo,chess}`; Cờ caro giải thích cả hai cỡ bàn và hai luật thắng ("chặn hai đầu" có hình chuỗi bị chặn và chuỗi chạm mép bàn); Cờ cá ngựa theo đúng bộ luật đã chốt (ra quân bằng 6 khi ô xuất phát không có ngựa mình, gieo 6 được gieo thêm, không vượt, đá, gieo 1 bắt buộc nhảy và đá ngựa ở chân chuồng đó, lên chuồng theo bậc, thắng khi chiếm bậc 3–6), hình vẽ từ hình học của bàn thật (`board-layout.ts`); Cờ vua: cách đi từng quân, nhập thành, bắt tốt qua đường, phong cấp, chiếu hết, hết nước đi, đòi hoà (lặp ba lần, 50 nước) và hoà tự động (lặp năm lần, 75 nước, không đủ quân).
- **Chữ nằm trong `apps/web/messages/{vi,en,ja}.json`** (namespace `Rules.<mã game>`), mỗi game một component `games/<id>/Rules.tsx` sắp các mục và hình; hình ở `games/<id>/rules/*.tsx`, chỉ dùng màu của giao diện (`[data-game]`). Không dùng MDX (design §1). Namespace `Rules` **không** gửi xuống client ở mọi trang: layout bỏ nó khỏi `NextIntlClientProvider`, trang luật dịch ở server; hộp thoại của màn hình chơi nạp lười phần luật của game khi mở lần đầu (design §4: bản render sẵn ở server làm mọi màn hình chơi nặng thêm 3,5–5,5 KB).
- **Mục chung về chơi online** trên mọi trang luật: "Đầu hàng", xử bỏ ván sau 5 phút; Cờ cá ngựa thêm "Máy chơi thay" ở phòng 3–4 người.
- **Lối tới luật chơi**: liên kết chữ nhỏ "Luật chơi" trên thẻ game ở menu (tên đọc được riêng: "Luật chơi Cờ caro") và ở màn hình bắt đầu ván; nút "Luật chơi" ở thanh trên màn hình chơi mở **hộp thoại** có cùng nội dung, kèm luật của ván đang chơi (Cờ caro "19×19 · Tự do"), để không rời ván (nhất là ván online); hộp thoại không có liên kết rời màn hình, đọc lại dòng lượt khi đóng, báo lỗi + "Thử lại" khi không tải được luật. `packages/ui` thêm `Dialog` (native `<dialog>`, tiêu đề, nút đóng, thân cuộn được); `ConfirmDialog` dùng chung phần khung.
- **Ghi công bên thứ ba**: trang luật Cờ vua ghi nguồn bộ quân "staunty" (CC BY-NC-SA 4.0) và liên kết tới `third-party-licenses.txt` (việc hoãn từ `add-chess-board`).
- Mockup: `mockup/index.html` (trang luật Cờ caro và Cờ cá ngựa trên điện thoại và máy tính, sáng/tối; hộp thoại luật trên màn hình chơi).
- Test component cho từng trang (mục, hình có tên, liên kết), test hộp thoại, E2E mở luật từ menu, màn hình bắt đầu ván và màn hình chơi (ván vẫn còn khi đóng); ảnh `ui:shots`.

## Capabilities

### New Capabilities

- `game-rules`: trang luật chơi của từng game, nội dung của bốn game, mục đầu hàng và bỏ ván, hình minh hoạ có mô tả, lối tới luật chơi từ menu, màn hình bắt đầu ván và màn hình chơi, hộp thoại luật trong ván.

### Modified Capabilities

(không có — lối vào trên menu, màn hình bắt đầu ván và màn hình chơi được mô tả trong `game-rules`.)

## Ngoài phạm vi

- Hướng dẫn tương tác, câu đố, bàn thử nước đi trong trang luật: idea.md §4.4 (sau MVP).
- Luật biến thể Cờ cá ngựa (idea.md §3.4) trên trang luật: chỉ bộ luật đang chơi; biến thể là v1.
- Hình động trong trang luật: hình tĩnh đủ cho "ngắn gọn"; xét lại nếu chơi thử thấy khó hiểu.
- Đường dẫn chứa ngôn ngữ (`/en/rules/…`): không có, theo bất biến "Đường dẫn không chứa ngôn ngữ".
- In trang luật, tải PDF: không làm.

## Impact

- **Code**:
  - `apps/web/src/app/rules/[gameId]/page.tsx` (+ `not-found.tsx`, `generateMetadata`), `apps/web/src/features/rules/` (mới: `RulesPage.tsx`, `RulesSection.tsx`, `RulesFigure.tsx`, `RulesArrow.tsx`, `RulesLeavingSection.tsx`, `LazyRules.tsx`, `load-rules.ts`), `apps/web/src/games/rules.ts` (mới: `GAME_RULES`), `apps/web/src/app/layout.tsx` + `i18n/client-messages.ts` (provider không có `Rules`), `features/play/PlayScreen.tsx` (nút, hộp thoại, `LazyRules`), `apps/web/src/games/<id>/Rules.tsx` và `games/<id>/rules/*.tsx` cho bốn game.
  - `features/menu/PlayLinks.tsx` (hoặc thẻ game), `features/setup/SetupScreen.tsx`, `features/play/PlayScreen.tsx` (nút ở thanh trên).
  - `packages/ui/src/components/Dialog.tsx` (mới), `ConfirmDialog.tsx` (dùng khung chung), `packages/ui/src/icons.ts` (`BookOpenIcon`, `XIcon` nếu chưa có).
  - `apps/web/messages/{vi,en,ja}.json` (`Rules.*`, `Menu.rulesLink`, `Setup.rules`, `Play.rules`, `Play.rulesDialog.*`), `apps/web/e2e/rules.spec.ts` (mới), `apps/web/ui-shots/screens.shots.ts`.
- **Engine, games, protocol, server**: không đổi.
- **Phụ thuộc**: không thêm thư viện (không `@next/mdx`).
- **Bất biến**: "Thêm một game chỉ gồm: GameDefinition + Board, hình minh hoạ (Artwork) và token … + bản dịch + một dòng registry … một dòng GAME_ARTWORK …" — change này **thêm** vào danh sách đó "trang luật (`games/<id>/Rules.tsx`) và một dòng `GAME_RULES` (`games/rules.ts`)": luật chơi là phần riêng của từng game, đặt trong thư mục của game và đăng ký một dòng như `GAME_ARTWORK`, nên thêm game vẫn không phải sửa phần dùng chung. Task sửa câu bất biến trong `openspec/config.yaml`. "Không có chữ hiển thị nào ngoài messages": giữ — mọi chữ của trang luật, kể cả chữ trong hình, nằm trong `messages/{vi,en,ja}.json`.
- **Tài liệu**: plan.md §3.2 (bỏ `rules.{vi,en,ja}.mdx`, thay bằng `Rules.tsx` + `Rules.*` trong messages), §3.3 (dòng "Trang luật chơi"), §4 checklist thêm game, §10.
