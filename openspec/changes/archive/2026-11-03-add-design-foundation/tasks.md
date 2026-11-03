## 1. Token

- [x] 1.1 `packages/ui/src/styles.css`: thay giá trị và thêm token màu theo design §2 (kể cả `--surface-raised`, `--piece-*-line`, `--piece-*-hover`) ở `:root`, khối `@media (prefers-color-scheme: dark)` và khối `:root[data-theme="dark"]` (hai khối tối giống hệt), một dòng `--color-*` trong `@theme inline` cho mỗi token mới; dựng trên `--border-control` và `--focus-ring` hiện có của nhánh sửa lỗi
- [x] 1.2 Thang chữ (`--text-display` … `--text-caption` kèm `--line-height`, `--letter-spacing`, `--font-weight`), `--radius-control`, `--radius-card`, `--shadow-card`, `--shadow-press`, `--shadow-raised` (sáng + tối); chú thích thang khoảng cách ở đầu file; `app/layout.tsx`: thêm độ đậm `"800"`, grep `font-medium` sau task 2.x và bỏ `"500"` nếu không còn dùng (design §4)
- [x] 1.3 Hợp đồng `--game-*` (design §6): biến mặc định ở `:root`, tiện ích `--color-game-*` trong `@theme inline`; không có mã game nào trong `packages/ui`
- [x] 1.4 Test đơn vị đọc `styles.css` (và về sau các `games/<id>/theme.css`): mỗi token màu có mặt ở cả ba khối, hai khối tối giống hệt nhau, và các cặp của bảng design §2 đạt ngưỡng (`fg`/`bg`, `fg-muted`/`surface-muted`, `border-control`/bốn nền, mỗi cặp `*-ink`/`*-soft`, `piece-*-line`/giấy điệp, `piece-*-ink`/`piece-*` và `piece-*-hover`, vòng focus hai lớp trên mọi nền liệt kê)
- [x] 1.5 `packages/ui/src/lib/cn.ts` dùng `extendTailwindMerge` (cỡ chữ, bóng, bán kính mới — design §4); test `cn.test.ts` theo các ví dụ ở design §4, test hiện có xanh

## 2. Component dùng chung

- [x] 2.1 `@utility focus-ring` (outline `--focus-ring` lệch 2 px + halo bằng `ring-2 ring-focus-ring-halo` ghép cùng `shadow-*`, `relative z-10`, design §3); thay mọi `outline-focus-ring` trong `packages/ui` và `apps/web`; test: nút chính có tiêu điểm vẫn giữ lớp `shadow-press` và có lớp ring
- [x] 2.2 `Button`: biến thể primary/secondary/ghost, cỡ `sm`/`md`/`lg`/`icon`, kiểu `aria-disabled` (nền `surface-muted`, viền đứt, chữ `fg-muted`) thắng mọi màu riêng; test (`render` + `getByRole`): `aria-disabled` vẫn focus được, bấm không gọi `onClick`, tên đọc được không đổi
- [x] 2.3 `RadioGroup` segmented: radio gốc, mục đã chọn `surface-raised` + viền `border-control` + ✓ luôn hiện, `size="sm"`, legend ẩn được; test: mũi tên đổi lựa chọn, `getByRole("radio", { checked: true })`, nhóm có tên
- [x] 2.4 `ToggleGroup` (`role="group"` có tên, nút `aria-pressed`, `busy` → `aria-busy` và bỏ qua bấm, không `disabled`); test: nút đang bật có `aria-pressed="true"`, bấm khi `busy` không gọi `onChange`, tiêu điểm còn trên nút
- [x] 2.5 `Input` (biến thể `code`), `Card`, `Badge` thành chip có biến thể (neutral/accent/success/warning/celebration/danger); test của `Input` hiện có xanh
- [x] 2.6 `StateScreen` (hình, tiêu đề, lời giải thích, hành động, `tone`, `busy` với `role="status"` và `motion-reduce`, `focusTitle`); test: tiêu đề là `heading` cấp 1, `busy` có `status`, `focusTitle` đặt tiêu điểm
- [x] 2.7 Icon mới trong `packages/ui/src/icons.ts` (Sun, Moon, Monitor, ArrowLeft, ChevronRight…) chỉ khi được dùng

## 3. Giao diện sáng/tối (`color-theme`)

- [x] 3.1 `config/storage-keys.ts` thêm `THEME_COOKIE`; `features/settings/theme.ts`: đọc giá trị cookie bằng zod (`light`/`dark`/không có), ghi/xoá cookie một năm, đặt/xoá `data-theme`; test đơn vị theo "Lựa chọn đã nhớ hỏng"
- [x] 3.2 `app/layout.tsx` đọc cookie và đặt `data-theme` trên `<html>` khi có lựa chọn; test rằng HTML server có `data-theme="dark"` khi cookie là `dark`, không có thuộc tính khi không có cookie hay cookie hỏng
- [x] 3.3 `ThemeSwitcher` (nhóm "Giao diện", ba lựa chọn có icon và nhãn chữ) nhận `initialTheme` từ server, đồng bộ từ `dataset.theme` sau mount (design §7); test `renderWithIntl` + `getByRole("group", { name: "Giao diện" })` (fieldset của radio gốc) theo "Chọn giao diện tối", "Chọn bằng bàn phím" (thuộc tính `data-theme` đổi, cookie được ghi), "Theo hệ thống" xoá cả hai, lựa chọn ban đầu theo `initialTheme`
- [x] 3.4 Bản dịch vi/en/ja: `Settings.theme`, `Settings.themes.{light,dark,system}`

## 4. Menu

- [x] 4.1 `AppBar`: logo, tên app, hai hàng dưới 640 px; `LocaleSwitcher` thành `ToggleGroup` "Ngôn ngữ" (tên mỗi ngôn ngữ bằng chính ngôn ngữ đó, `lang`, `aria-busy` khi `setLocale` đang chạy); `ThemeSwitcher`; test `LocaleSwitcher`: bấm "English" gọi `setLocale("en")`, nút đang bật có `aria-pressed`, không có `radio`/`combobox`
- [x] 4.2 Hero: `h1` `Menu.heroTitle` + `Site.tagline`; cột phải là `Card` gồm `JoinRoomForm` (`Input` biến thể `code`) và `ContinueList` (hàng `surface-muted` có mũi tên); test `ContinueList`, `JoinRoomForm` hiện có xanh, `h1` mới
- [x] 4.3 `games/<id>/theme.css` tối thiểu (`--game-tint` sáng + hai khối tối, selector `[data-game="<id>"]`) và `games/<id>/Artwork.tsx` (SVG tự vẽ theo mockup, import `theme.css`) cho ba game; module giao diện `games/<id>/index.ts` cũng import `theme.css`; hình đăng ký ở `games/artwork.ts` (`GAME_ARTWORK`, tách khỏi `GAME_ENTRY_LOADERS` — design "Chỗ lệch thêm khi code"), test thiếu/thừa game là lỗi kiểu
- [x] 4.4 Thẻ game: phần hình (`data-game`, nền `--game-tint`, `Artwork`), tên, số người · thời lượng, mô tả ngắn; dòng "Sắp có" viền đứt không phải liên kết
- [x] 4.5 Lối "Chơi" và "Online" trên thẻ (`aria-describedby` tên game; "Online" tới `/play/<id>?mode=online`); test component (`renderWithIntl`, `getByRole`) theo "Mở game chơi được", "Mở game để chơi online", "Lối vào nêu tên game", "Thẻ sắp có không mở được", "Thẻ Cờ caro", "Thẻ Cờ cá ngựa"
- [x] 4.6 Bản dịch vi/en/ja: `Menu.heroTitle`, `Menu.online`, `Games.{tictactoe,caro,ludo}.tagline`; `messages.test.ts` xanh

## 5. Màn hình bắt đầu ván và màn hình trạng thái

- [x] 5.1 `app/play/[gameId]/page.tsx` đọc `searchParams.mode`, kiểm bằng `SETUP_MODE` + `supportsAI`, truyền `initialMode`; `SetupScreen` áp dụng `initialMode` trước và sau khi đọc lựa chọn đã nhớ (design §8, chỉ khi mount); test theo "Chọn sẵn Online thay cho lựa chọn đã nhớ", "Chế độ không hợp lệ", "Chọn sẵn chưa được nhớ"
- [x] 5.2 `SetupScreen` theo bố cục mới (dải `data-game` + `Artwork`, tên game `text-title`, segmented, nút chính rộng hết khung trên điện thoại); test hiện có xanh không đổi kỳ vọng hành vi
- [x] 5.3 `PlayLoading`, `RoomJoining`, `PlayLoadError`, `RoomError`, `app/**/not-found.tsx`, `app/**/error.tsx` dùng `StateScreen`, giữ lời, nút, `role="status"`, `focusTitle`; test hiện có xanh

## 6. Kiểm tra

- [x] 6.1 E2E: `menu.spec.ts` (`h1` mới, lối "Online" mở setup chọn sẵn "Online", thẻ có hai lối vào), `i18n.spec.ts` (đổi ngôn ngữ bằng `getByRole("button", { name: "English" })` thay cho `combobox`), `setup.spec.ts` xanh
- [x] 6.2 E2E giao diện: chọn "Tối" rồi mở trang chơi trên hệ điều hành sáng (`colorScheme: "light"`) → `<html data-theme="dark">` ngay trong HTML server; chọn "Theo hệ thống" rồi `page.emulateMedia({ colorScheme: "dark" })` → trang đổi sang tối không tải lại (kiểm màu nền `body`); cookie `theme=khong-hop-le` với `colorScheme: "dark"` → không có `data-theme`, nền tối, không lỗi
- [x] 6.3 `apps/web/ui-shots/screens.shots.ts`: thêm menu có ván dở, menu 360 px, setup chọn sẵn "Online", segmented ở chế độ tối, `PlayLoading`, `RoomJoining` chậm, không tìm thấy, một lượt với cookie `theme=dark` trên hệ điều hành sáng; chạy `pnpm ui:shots`, xem từng ảnh sáng/tối × 390/1280, so với `mockup/png/m1.png`, `m2.png`; kiểm chữ có dấu chồng ở `text-display`
- [x] 6.4 Rà `web-design-guidelines` trên các file đã đổi (focus, form, chuyển động, typography), sửa điều trái luật dự án theo skill `board-games-ui`
- [x] 6.5 Sửa câu bất biến "Thêm một game chỉ gồm…" trong `openspec/config.yaml` cho khớp design §6 (Board, hình minh hoạ và `theme.css` của game trong thư mục game, một mục registry); cập nhật plan.md §4.3 (token theo game, `games/<id>/theme.css`) và §10 (M6.5: change đầu xong)
- [x] 6.6 `pnpm exec openspec validate add-design-foundation --strict`, `pnpm check`, `pnpm knip`, `pnpm test:e2e`, `pnpm spec:check`
- [x] 6.7 Sau khi archive, viết `## Purpose` cho `openspec/specs/color-theme/spec.md` (công cụ để chỗ trống)
- [x] 6.8 Archive change (`pnpm exec openspec archive add-design-foundation --yes`) trong cùng PR, sau review, trước `redesign-game-boards`

## Ngoài phạm vi

- Đổi giao diện trong màn hình chơi hay sảnh chờ: chỉ ở menu, như chọn ngôn ngữ; xét lại khi có trang cài đặt.
- Lọc/tìm game, trang luật chơi trên menu: không thuộc M6.5.
- Theme bàn khác (gỗ, tre, giấy dó): sau v1 (idea.md §4.2); hợp đồng `--game-*` đã cho phép.
- Lint chặn bậc khoảng cách ngoài thang: rà ở review; thêm lint nếu thấy lệch nhiều.
- Test cho việc `?mode=` đổi lúc màn hình đang mở: app không có lối nào làm vậy (design §8).
