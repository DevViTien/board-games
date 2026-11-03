# Proposal

## Why

Khảo sát giao diện sau M6 (plan.md §10, mục M6.5, 03/11/2026) cho thấy giao diện chưa có nền thiết kế: bảng màu một sắc độ quanh hue ~250, màu nhấn `--accent` trùng màu quân `--piece-blue` (tỉ số 1,25:1 ở chế độ sáng, 1,00:1 ở chế độ tối), thang chữ phẳng (gần như mọi chữ `text-sm font-medium`), radio đã chọn trông như nút hành động chính, chưa có token `success`/`warning`/`celebration`, trạng thái đang tải/lỗi chỉ là một dòng chữ (`PlayLoading`, `RoomJoining`), menu không có bản sắc từng game và không có cách đổi sáng/tối dù token tối đã có khối `:root[data-theme="dark"]`. Sửa lỗi sau khảo sát còn cho thấy vòng focus và viền "nước vừa đi" cùng dùng màu nhấn, nên một ô Cờ caro đang có tiêu điểm trông y hệt ô vừa đánh.

Người dùng đã duyệt mockup M6.5 ("Làm như bạn đề xuất hiện tại", 03/11/2026; bản lưu ở `mockup/` của change này). Change này đặt **nền chung**: token, thang chữ, khoảng cách, component dùng chung, thanh trên của menu (ngôn ngữ + giao diện sáng/tối), menu mới, màn hình bắt đầu ván, các màn hình đang tải/rỗng/lỗi, và hợp đồng token theo game `[data-game]`. Bàn từng game (`redesign-game-boards`) và phản hồi trong ván (`add-game-feedback`) dựng trên nền này.

Thuộc mốc **M6.5. Thiết kế lại giao diện** (plan.md §6.2), change đầu tiên trong chuỗi `add-design-foundation` → `redesign-game-boards` → `add-game-feedback`; `ask-name-in-lobby` độc lập với ba change này (làm và archive được bất kỳ lúc nào).

## What Changes

- **Bảng màu mới** (design §2): nền giấy ấm `#F6F5F1`/`#121322`, mặt `#FFFFFF`/`#1B1C30`, mực `#17182B`/`#F1F0F7`; màu nhấn chính tím `#5B34E6`/`#A894FF`, khác hue mọi màu quân; token mới `accent-soft`, `accent-ink`, `success*`, `warning*`, `celebration*`, `danger-soft`, `danger-ink`; `surface-raised` (mục đã chọn của segmented, sáng hơn rãnh cả ở chế độ tối); `border-control` và `focus-ring` đổi giá trị (giữ tên, dựa trên giá trị nhánh sửa lỗi vừa thêm). Mọi token có giá trị sáng và tối ở `:root`, khối `@media (prefers-color-scheme: dark)` và khối `:root[data-theme="dark"]`, cộng một dòng `--color-*` trong `@theme inline`.
- **Vòng focus riêng**: `--focus-ring` (mực) + `--focus-ring-halo` (giấy) vẽ thành vòng hai lớp, không trùng màu nhấn, "nước vừa đi" hay hàng thắng, đạt ≥ 3:1 trên mọi nền kể cả giấy vở, ô Cờ cá ngựa, ô Tic-tac-toe, ở cả sáng lẫn tối.
- **Màu quân Cờ cá ngựa** theo bảng màu dân gian (son, chàm, hoè, lục) ở `--piece-*`, thêm `--piece-*-line` (viền/khung đạt 3:1 trên giấy điệp, riêng Vàng đậm hơn), `--piece-*-ink` (ký hiệu/chữ trên màu quân), `--piece-*-hover` (nút gieo khi trỏ/bấm, chữ vẫn ≥ 4,5:1) và `--piece-edge` (viền quân).
- **Thang chữ** (display 48/800, title 32/700, status 26/800, heading 20/700, body 16/400, small 14, caption 13/600) dạng `--text-*` của Tailwind, nhỏ lại trên điện thoại; thêm độ đậm 800 và bỏ độ đậm không còn dùng của Be Vietnam Pro. **Thang khoảng cách** và bán kính (`--radius-control`, `--radius-card`), bóng (`--shadow-card`, `--shadow-press`, `--shadow-raised`); `cn()` dùng `extendTailwindMerge` để hiểu các lớp mới.
- **Component** `packages/ui`: `Button` (primary/secondary/ghost, trạng thái `aria-disabled` riêng, cỡ `sm`/`md`/`lg`), `RadioGroup` dạng segmented có ✓ (đã chọn khác hẳn nút chính, vẫn radio gốc), `ToggleGroup` (nút `aria-pressed`, cho chọn ngôn ngữ), `Input`, `Card`, `Badge` thành chip có biến thể (neutral/accent/success/warning/celebration/danger), `StateScreen` (màn hình trạng thái có hình, tiêu đề, lời giải thích, hành động).
- **Hợp đồng token theo game**: biến `--game-page`, `--game-board`, `--game-line`, `--game-mark-1`, `--game-mark-2`, `--game-highlight`, `--game-last-move`, `--game-win` với giá trị mặc định trong `packages/ui` (không biết mã game nào) và tiện ích `bg-game-*`/`stroke-game-*`/`text-game-*`; giá trị của từng game nằm trong `apps/web/src/games/<id>/theme.css` (CSS thường, selector `[data-game="<id>"]`, import từ module của game), nguồn duy nhất là thuộc tính `data-game`.
- **Thanh trên của menu**: logo, chọn ngôn ngữ là nhóm nút bật/tắt (vẫn ghi tên mỗi ngôn ngữ bằng chính ngôn ngữ đó; không dùng radio để mũi tên không đổi ngôn ngữ từng bước), **chọn giao diện Sáng / Tối / Theo hệ thống** — hành vi mới: áp dụng ngay, nhớ một năm bằng cookie, server đặt `data-theme` từ lần vẽ đầu nên không nháy.
- **Menu mới**: hero, thẻ "Vào phòng bằng mã" kèm danh sách "Tiếp tục ván dở" bên phải (dưới hero trên điện thoại), thẻ game có hình minh hoạ tự vẽ và hai lối vào **"Chơi"** và **"Online"** — hành vi mới: "Online" mở màn hình bắt đầu ván với chế độ "Online" chọn sẵn (`/play/<mã game>?mode=online`); game "Sắp có" thành một dòng mảnh viền đứt.
- **Màn hình bắt đầu ván** theo thang chữ và component mới; nhận `?mode=` để chọn sẵn chế độ.
- **Màn hình đang tải / lỗi / không tìm thấy** (`PlayLoading`, `RoomJoining`, `PlayLoadError`, `RoomError`, các trang `not-found`/`error`) thành màn hình thật bằng `StateScreen`; lời và lối thoát giữ nguyên.
- Bản dịch vi/en/ja cho chữ mới (hero, giao diện, mô tả ngắn từng game, nhãn "Online" trên thẻ).
- Test component, E2E (đổi ngôn ngữ bằng nút "English", giao diện tối được nhớ, "Theo hệ thống" đổi theo hệ điều hành, cookie hỏng, lối "Online"), ảnh `pnpm ui:shots`.

## Capabilities

### New Capabilities

- `color-theme`: chọn giao diện Sáng / Tối / Theo hệ thống, áp dụng ngay, được nhớ trên trình duyệt và áp dụng từ lần vẽ đầu.

### Modified Capabilities

- `game-menu`: sửa "Vào chơi từ menu" (thẻ chơi được có thêm lối "Online") và "Game chơi được và game sắp có trên menu" (scenario thẻ Cờ caro, Cờ cá ngựa ghi hai lối vào).
- `game-setup`: thêm "Chế độ chọn sẵn từ đường dẫn".

## Ngoài phạm vi

- Bàn, quân, bố cục màn hình chơi của từng game: `redesign-game-boards`. Bảng người chơi, khoảnh khắc kết thúc, tín hiệu máy nghĩ: `add-game-feedback`. Phòng không tồn tại không hỏi tên: `ask-name-in-lobby`.
- Đổi giao diện ngay trong màn hình chơi, sảnh chờ: chỉ ở thanh trên của menu (như chọn ngôn ngữ hiện nay); xét lại khi có trang cài đặt.
- Lọc/tìm game trên menu (idea.md §4.1), trang luật chơi: không thuộc M6.5.
- Theme bàn khác (gỗ, tre, giấy dó — idea.md §4.2 "Sau v1"): hợp đồng `--game-*` cho phép thêm sau, không làm bây giờ.
- Thư viện `motion`, `shadcn init`: hoãn (plan.md §10, M6.5); component tự viết trên `cva()`.
- Đổi font: giữ Be Vietnam Pro + Noto Sans JP, chỉ đổi bộ độ đậm (thêm 800, bỏ độ đậm không dùng).

## Impact

- **Code**: `packages/ui/src/styles.css` (token, thang chữ, hợp đồng `--game-*`), `packages/ui/src/components/` (`Button`, `RadioGroup`, `Input`, `Card`, `Badge`, `StateScreen` mới, `ToggleGroup` mới), `packages/ui/src/lib/cn.ts` (`extendTailwindMerge`), `packages/ui/src/icons.ts` (Sun, Moon, Monitor, ArrowLeft, ChevronRight); `apps/web/src/app/layout.tsx` (đọc cookie giao diện, đặt `data-theme`, độ đậm 800), `apps/web/src/features/settings/` (`LocaleSwitcher` thành `ToggleGroup`, `ThemeSwitcher` mới, `theme.ts`), `apps/web/src/features/menu/` (`MenuPage`, `PlayLinks` ("Chơi" + lối "Online"), `AppBar`, `ContinueList`, `JoinRoomForm`), `apps/web/src/features/setup/` (`SetupScreen` đọc `?mode=`, `play-setup.ts`), `apps/web/src/app/play/[gameId]/page.tsx` (truyền `searchParams.mode`), `apps/web/src/features/play/{PlayLoading,PlayLoadError}.tsx`, `apps/web/src/features/room/{RoomError,RoomRoute}.tsx` (`RoomJoining`), các `not-found.tsx`/`error.tsx`; `apps/web/src/games/<id>/` (`theme.css`, `Artwork.tsx`), `apps/web/src/games/artwork.ts` (`GAME_ARTWORK`, một dòng mỗi game; `registry.ts` không đổi), `apps/web/src/config/storage-keys.ts` (`THEME_COOKIE`), `apps/web/messages/{vi,en,ja}.json`, `apps/web/e2e/`, `apps/web/ui-shots/screens.shots.ts`.
- **Engine, games, protocol, server**: không đổi.
- **Phụ thuộc**: không thêm thư viện (icon mới lấy từ `lucide-react` đã có).
- **Bất biến**: "Thêm một game chỉ gồm GameDefinition + Board + bản dịch + một dòng registry" — giữ tinh thần: phần mới của mỗi game (hình minh hoạ menu, giá trị `--game-*`) nằm trong thư mục của game, registry giữ một dòng mỗi game, hình minh hoạ thêm một dòng ở `games/artwork.ts` (tách để trang server không kéo bàn cờ vào bundle, design "Chỗ lệch thêm khi code"). Task cuối sửa câu chữ bất biến trong `openspec/config.yaml` cho khớp ("Board, hình minh hoạ và token của game"). "Không có chữ hiển thị nào ngoài messages": giữ, mọi chữ mới (kể cả `aria-label`) có khoá vi/en/ja. Không chạm bất biến khác.
- **Tài liệu**: plan.md §4.3 (token theo game, `games/<id>/theme.css`), §10 (M6.5) ở task cuối; idea.md §9 mục 5 đã ghi hướng.
