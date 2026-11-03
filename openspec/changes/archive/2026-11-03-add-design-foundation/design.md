# Design

## Context

- Token ở `packages/ui/src/styles.css`: một khối `:root` (sáng), khối `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` và khối `:root[data-theme="dark"]` (giống hệt nhau), rồi `@theme inline` ánh xạ sang tiện ích Tailwind. Mọi màu quanh hue 250; `--accent` `oklch(0.55 0.16 255)` gần như trùng `--piece-blue` `oklch(0.5 0.17 258)` (1,25:1 sáng, 1,00:1 tối; ΔE OKLab 0,059). Nhánh `fix/ui-audit-defects` vừa thêm `--border-control` (L 0,62 sáng / 0,55 tối) và hạ `--focus-ring` sáng xuống L 0,55 — change này dựng trên các giá trị đó và thay chúng bằng bảng màu mới.
- `focus-ring` và viền "nước vừa đi" (Tic-tac-toe `border-accent`, Cờ caro) cùng họ màu nhấn: ô Cờ caro có tiêu điểm trông y hệt ô vừa đánh (tối từ trước, nay cả sáng). Nhánh sửa lỗi tạm đặt `focus-visible:-outline-offset-6` cho ô vừa đi của Cờ caro.
- **`data-theme` chưa bao giờ được đặt**: CSS đã sẵn khối `:root[data-theme="dark"]` và `:root:not([data-theme="light"])`, nhưng không có code nào ghi thuộc tính này hay lưu lựa chọn. Ngôn ngữ lưu ở cookie `NEXT_LOCALE` qua server action `setLocale`; `RootLayout` đã đọc cookie mỗi request (next-intl `getRequestConfig`), nên đọc thêm một cookie không làm trang nào từ tĩnh thành động.
- Component `packages/ui`: `Button` (`cva`, `rounded-card`, `text-sm font-medium`, `aria-disabled` mờ 50%), `RadioGroup` (radio gốc trong `<fieldset>`, nhãn trông như nút; **đã chọn = nền accent, giống hệt nút chính**), `Input`, `Card`, `Badge`, `Select`, `ConfirmDialog`. Icon chỉ qua `icons.ts` (lucide). `cn()` = `twMerge(clsx(...))` với cấu hình mặc định của `tailwind-merge` 3.
- Menu (`features/menu/MenuPage.tsx`, server component): `h1` "Board Games Hub", `LocaleSwitcher` (`<select>`), lưới thẻ (tên, số người, thời lượng, `PlayLink` "Chơi" có `aria-describedby` trỏ tiêu đề thẻ, thẻ "Sắp có" có `Badge`), `JoinRoomForm`, `ContinueList`. `SetupScreen` (client) nhớ lựa chọn trong `localStorage`, đọc sau khi mount.
- Màn hình trạng thái: `PlayLoading` và `RoomJoining` chỉ là một dòng `role="status"`; `PlayLoadError`, `RoomError`, `not-found` là tiêu đề + đoạn chữ + nút.
- Font: Be Vietnam Pro độ đậm 400/500/600/700 (`latin` + `vietnamese`), Noto Sans JP dự phòng không preload.
- Ràng buộc: bất biến trong `openspec/config.yaml` (packages/ui không biết mã game; thêm game không sửa phần dùng chung; mọi chữ trong messages), luật cứng của skill `board-games-ui` (token sáng+tối ở ba khối, AA, `aria-disabled`, `motion-reduce`, không cuộn ngang ở 360 px).

## Goals / Non-Goals

**Goals:**

- Một bảng màu có cấp bậc, nền ấm, màu nhấn khác mọi màu quân, đủ token trạng thái (success, warning, celebration, danger), đạt AA ở cả sáng lẫn tối, có bảng tỉ số tính bằng script.
- Vòng focus riêng, thấy rõ trên mọi nền kể cả nền bàn từng game, không lẫn với "nước vừa đi" hay hàng thắng, không bị ô bên cạnh vẽ đè.
- Thang chữ, khoảng cách, bán kính, bóng cố định, và `cn()` hiểu chúng; component chung có biến thể phân biệt rõ.
- Hợp đồng `--game-*` để mỗi game có bản sắc mà `packages/ui` không biết mã game nào.
- Người chơi chọn được Sáng / Tối / Theo hệ thống, không nháy khi tải trang.
- Menu và màn hình bắt đầu ván theo mockup đã duyệt; lối "Online" từ thẻ game.
- Màn hình đang tải / lỗi / không tìm thấy có thiết kế, giữ nguyên lời và lối thoát.

**Non-Goals:**

- Bàn từng game, bố cục màn hình chơi (`redesign-game-boards`); bảng người chơi, khoảnh khắc kết thúc, máy đang nghĩ (`add-game-feedback`); trang phòng hỏi tên (`ask-name-in-lobby`).
- Theme bàn khác, trang cài đặt, đổi giao diện trong ván.

## Đã chốt với người dùng (03/11/2026)

- Người dùng duyệt mockup M6.5 nguyên trạng ("Làm như bạn đề xuất hiện tại"). Bản lưu: `openspec/changes/add-design-foundation/mockup/index.html` (đã qua Prettier, nội dung không đổi) và ảnh `mockup/png/m1.png` … `m7.png` (1 hệ thống chung, 2 menu, 3 Tic-tac-toe vừa thắng, 4 Cờ caro vở ô li lúc máy nghĩ, 5 Cờ cá ngựa 4 người, 6 Cờ cá ngựa điện thoại 390 px, 7 Cờ caro tối vừa thắng). Ba change sau tham chiếu cùng bản lưu này.
- Hướng: khung chung tối giản (nền giấy, chữ mực, nút chính tím, điểm nhấn cam, thành công màu ngọc), mỗi game một bản sắc qua `--game-*` (idea.md §9 mục 5).
- **Chỗ lệch mockup** của change này (nhỏ, vì AA hay spec; người dùng sẽ thấy khi xem ảnh `ui:shots`):
  - Cam ăn mừng `#FF7A2F` → `#D9500C` để hình đạt 3:1 trên nền trắng.
  - Viền điều khiển `#8E8C84` → `#7C7A72` (mockup 2,88:1 trên `surface-muted`); bản tối `#8A8CAB` (để viền của mục đã chọn trong segmented đạt 3:1).
  - Màu lục `#2E8B57` → `#287A4C` (chữ trên nút gieo đạt 4,5:1); viền/khung màu hoè dùng `--piece-yellow-line` `#9A6A00` (hoè `#D99A12` chỉ 2,23:1 trên giấy điệp).
  - Chọn ngôn ngữ ghi đủ tên ("Tiếng Việt", "English", "日本語") thay cho "VI/EN/日本語" vì spec `localization` "Đổi ngôn ngữ" yêu cầu; là nhóm nút bật/tắt chứ không phải radio (§8).
  - Giao diện là nhóm ba lựa chọn (Sáng/Tối/Theo hệ thống) thay cho một nút ☾, vì cần quay lại được "Theo hệ thống".
  - Khung 7 của mockup để tiêu đề "Cờ caro" màu mực trên nền tối (lỗi của mockup): code dùng token `fg`.

**Chỗ lệch thêm khi code** (03/11/2026, phát hiện lúc apply; người dùng sẽ thấy trong ảnh `ui:shots`):

- Dòng dưới hero là khoá mới `Menu.heroLead` ("Cùng máy, đấu với máy hoặc gửi link mời — không cần tài khoản.", lời của mockup) thay cho `Site.tagline`: `Site.tagline` gần như trùng nguyên văn `Menu.heroTitle`, đặt ngay dưới thì lặp. `Site.tagline` vẫn là mô tả trang (metadata).
- Ô mã phòng: nhãn "Mã phòng" ẩn (`sr-only`, vẫn là tên của ô) và placeholder `Menu.joinPlaceholder` ("VD: ABC234") như mockup; nút "Vào phòng" là nút chính.
- Thanh trên: thứ tự DOM và hình là logo → giao diện → ngôn ngữ ở mọi khung (mockup: ngôn ngữ rồi ☾), để thứ tự Tab khớp thứ tự nhìn cả khi điện thoại xếp hai hàng (logo + giao diện, rồi ngôn ngữ). Mục đang chọn của nhóm ngôn ngữ cũng có ✓ như segmented.
- Hình minh hoạ (`Artwork`) vẽ bằng `--game-*`, nên `theme.css` của change này có thêm các biến hình cần (`--game-board`, `--game-line`, `--game-mark-1`, `--game-mark-2`, `--caro-margin`) với đúng giá trị của `redesign-game-boards` §2–§4, không chỉ `--game-tint`; change sau bổ sung phần còn lại. Lưới ô li của hình dùng `--game-line` 45% (trang trí).
- Hình được đăng ký ở `games/artwork.ts` (`GAME_ARTWORK`), **không** gộp vào registry thành `GAME_ENTRIES` như §6 dự kiến: thử gộp thì trang menu và trang bắt đầu ván (server component import registry) kéo cả bàn cờ "use client" của mọi game (sau các `import()` lười) vào client manifest của trang — E2E "tải lại game khi code lỗi" bắt được. `GAME_ENTRY_LOADERS` giữ nguyên; thêm game là một dòng ở mỗi map (thiếu/thừa là lỗi kiểu). Câu bất biến trong `openspec/config.yaml` ghi theo đó.
- `SetupScreen` nhận hình qua prop `artwork` (phần tử vẽ trên server ở `app/play/[gameId]/page.tsx`), nên bundle của màn hình bắt đầu ván không chứa hình nào.
- `Select` bị bỏ khỏi `packages/ui` (không còn chỗ dùng sau khi chọn ngôn ngữ thành `ToggleGroup`); `UsersIcon`/`ClockIcon` cũng bỏ (thẻ ghi "2 người · ~10 phút" bằng chữ như mockup).
- Cờ caro: thay vòng focus cũ bằng `focus-ring` buộc bỏ luôn `focus-visible:-outline-offset-6` tạm của nhánh sửa lỗi (vòng mới nằm ngoài ô, cách tạm sẽ kéo outline vào trong còn quầng ở ngoài); việc này §3 dự kiến cho `redesign-game-boards`.
- Sau review: chọn ngôn ngữ/giao diện trên điện thoại cao 44 px (36 px từ 640 px), tên app co lại (xuống dòng) để thanh trên giữ hai hàng ở 360 px; các nhóm lựa chọn của màn hình bắt đầu ván chia đều bề rộng (`RadioGroup fill`) thay cho để "Online" lẻ một hàng; `word-break: auto-phrase` cho chữ Nhật; khung bàn Cờ caro bỏ `overflow-hidden` để vòng focus ô ở mép không bị cắt; `disabled` của `Button`/`Input` dùng kiểu khoá như `aria-disabled` thay cho mờ 50%.
- `Card` đệm 20 px (`p-5`) ở mọi khung thay cho 20–24 px: lớp `sm:p-6` mặc định thắng `py-3` của nơi dùng ở khung rộng.
- `--shadow-card` tối là `0 0 #0000` thay cho `none`: Tailwind ghép bóng thành một danh sách `box-shadow`, `none` trong danh sách làm cả khai báo vô hiệu (mất luôn quầng focus).

## Decisions

### 1. Hướng hình ảnh

- **Khung chung**: nền giấy ấm (không xám-xanh), chữ mực tím-đen đậm, một màu nhấn chính (tím — hành động chính, liên kết), một màu nhấn phụ (cam — ăn mừng, điểm nhấn), ngọc cho thành công, son cho lỗi. Thẻ trắng bo 20 px, viền mảnh, bóng rất nhẹ; nút chính có "gờ" dưới 2 px (`--shadow-press`) cho cảm giác bấm được.
- **Chữ**: Be Vietnam Pro cho cả tiêu đề lớn (800, chữ dính sát `-0.02em`) lẫn thân; tiêu đề lớn là điểm nhấn chính của mỗi màn hình. Noto Sans JP giữ làm dự phòng chữ Nhật.
- **Bản sắc game** qua `--game-*` (§6): Tic-tac-toe "sticker" tím–cam, Cờ caro "vở ô li", Cờ cá ngựa "tranh dân gian" — chi tiết ở `redesign-game-boards`.
- Phương án đã cân nhắc: giữ bảng màu cũ và chỉ đổi `--accent` sang tím — sửa được trùng màu quân nhưng không giải quyết nền lạnh, thiếu token trạng thái, thang chữ phẳng; mockup tối/neon — không hợp nhóm bạn chơi ban ngày trên điện thoại, khó đạt AA cho màu quân. Chọn hướng mockup đã duyệt.

### 2. Token màu

Giá trị viết bằng hex của mockup (dễ đối chiếu ảnh); không có `oklch`/hex nào ngoài `styles.css` và `games/<id>/theme.css`. Mỗi token mới thêm vào `:root`, khối `@media (prefers-color-scheme: dark)` **và** khối `:root[data-theme="dark"]` (giống hệt), rồi một dòng `--color-*` trong `@theme inline`.

| Token                                                                  | Sáng                                          | Tối                                           | Dùng cho                                                        | Thay đổi                        |
| ---------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------- | ------------------------------- |
| `--bg`                                                                 | `#F6F5F1`                                     | `#121322`                                     | nền trang (giấy)                                                | đổi giá trị                     |
| `--surface`                                                            | `#FFFFFF`                                     | `#1B1C30`                                     | thẻ, ô nhập                                                     | đổi                             |
| `--surface-muted`                                                      | `#EFEDE6`                                     | `#24253B`                                     | nền chìm, rãnh segmented                                        | đổi                             |
| `--surface-raised`                                                     | `#FFFFFF`                                     | `#3A3C5C`                                     | mục đã chọn của segmented (nổi, sáng hơn rãnh ở cả hai chế độ)  | mới                             |
| `--fg`                                                                 | `#17182B`                                     | `#F1F0F7`                                     | chữ chính                                                       | đổi                             |
| `--fg-muted`                                                           | `#5E6072`                                     | `#A9AABF`                                     | chữ phụ                                                         | đổi                             |
| `--border`                                                             | `#E2E0D8`                                     | `#2C2E47`                                     | viền thẻ, đường chia (trang trí)                                | đổi                             |
| `--border-control`                                                     | `#7C7A72`                                     | `#8A8CAB`                                     | viền ô nhập, nút phụ, ô chọn được, mục đã chọn                  | đổi (giữ tên của nhánh sửa lỗi) |
| `--accent`                                                             | `#5B34E6`                                     | `#A894FF`                                     | nút chính, liên kết                                             | đổi                             |
| `--accent-hover`                                                       | `#4A26CF`                                     | `#BBACFF`                                     | nút chính khi trỏ                                               | đổi                             |
| `--accent-fg`                                                          | `#FFFFFF`                                     | `#121322`                                     | chữ trên nút chính                                              | đổi                             |
| `--accent-press`                                                       | `#3A1FA8`                                     | `#6F5BD6`                                     | gờ dưới nút chính (trang trí)                                   | mới                             |
| `--accent-soft`                                                        | `#ECE7FF`                                     | `#2D2752`                                     | nền chip, quầng lượt                                            | mới                             |
| `--accent-ink`                                                         | `#3A1FA8`                                     | `#D9D0FF`                                     | chữ trên `accent-soft`                                          | mới                             |
| `--focus-ring`                                                         | `#17182B`                                     | `#F1F0F7`                                     | vòng focus ngoài (§3)                                           | đổi                             |
| `--focus-ring-halo`                                                    | `#FFFFFF`                                     | `#121322`                                     | vòng focus trong (§3)                                           | mới                             |
| `--danger`                                                             | `#C8372D`                                     | `#FF8A7E`                                     | chữ/viền lỗi                                                    | đổi                             |
| `--danger-soft` / `--danger-ink`                                       | `#FBE4E1` / `#A42A21`                         | `#3A1E1C` / `#FFB3AA`                         | hộp lỗi                                                         | mới                             |
| `--success`                                                            | `#138A62`                                     | `#4CD3A0`                                     | icon, chấm "đã kết nối"                                         | mới                             |
| `--success-soft` / `--success-ink`                                     | `#DFF5EC` / `#0D6B4B`                         | `#173A30` / `#7FE3BD`                         | chip thành công                                                 | mới                             |
| `--warning`                                                            | `#A15C00`                                     | `#F2B04C`                                     | chữ/icon cảnh báo                                               | mới                             |
| `--warning-soft` / `--warning-ink`                                     | `#FFF1D6` / `#9A5500`                         | `#3A2E17` / `#FFD08A`                         | chip cảnh báo                                                   | mới                             |
| `--celebration`                                                        | `#D9500C`                                     | `#FF9A5C`                                     | X Tic-tac-toe, khoanh hàng thắng Cờ caro, confetti              | mới                             |
| `--celebration-soft` / `--celebration-ink`                             | `#FFE9DB` / `#A6430C`                         | `#3A2A1E` / `#FFB98C`                         | chip "Kết thúc"                                                 | mới                             |
| `--overlay`                                                            | giữ                                           | giữ                                           | nền sau hộp thoại                                               | không đổi                       |
| `--piece-red`                                                          | `#C8372D` (son)                               | `#E0574B`                                     | quân/chuồng Đỏ, nền nút gieo                                    | đổi                             |
| `--piece-blue`                                                         | `#2C4A8C` (chàm)                              | `#4F9AD6`                                     | quân/chuồng Xanh dương                                          | đổi                             |
| `--piece-yellow`                                                       | `#D99A12` (hoè)                               | `#E8B13A`                                     | quân/chuồng Vàng                                                | đổi                             |
| `--piece-green`                                                        | `#287A4C` (lục)                               | `#4FB47E`                                     | quân/chuồng Xanh lá                                             | đổi                             |
| `--piece-{red,blue,green}-line`                                        | = màu quân                                    | = màu quân                                    | viền, khung xúc xắc, viền nút chọn ngựa, ô chân chuồng          | mới                             |
| `--piece-yellow-line`                                                  | `#9A6A00`                                     | `#E8B13A`                                     | như trên, cho Vàng (hoè quá sáng trên giấy)                     | mới                             |
| `--piece-{red,blue,green}-ink`                                         | `#FFFDF7`                                     | `#1F1A12`                                     | ký hiệu ●■▲◆, chữ nút gieo trên màu quân                        | mới                             |
| `--piece-yellow-ink`                                                   | `#17182B`                                     | `#1F1A12`                                     | như trên, trên màu vàng                                         | mới                             |
| `--piece-red-hover` / `-blue-hover` / `-yellow-hover` / `-green-hover` | `#B02E25` / `#233D75` / `#E5A92A` / `#21673F` | `#E86A5F` / `#66A8DE` / `#EFC060` / `#66C190` | nút gieo khi trỏ và khi bấm (bấm = màu hover + lún 2 px, bỏ gờ) | mới                             |
| `--piece-edge`                                                         | `#5A2A10`                                     | `#FBF4E4`                                     | viền quân (quân vàng trên ô sáng cần viền)                      | mới                             |

- **Màu nhấn khác màu quân** đo bằng khoảng cách OKLab (ΔE) và hue, vì hai màu cùng độ sáng vẫn khác hẳn nhau nếu khác hue: cũ `--accent`/`--piece-blue` ΔE 0,059 (hue 262°/264°). Mới (sáng): tím h283° với son ΔE 0,349, chàm h264° ΔE 0,161, hoè ΔE 0,450, lục ΔE 0,324; (tối): với son 0,262, chàm h245° 0,127, hoè 0,294, lục 0,257 — mọi cặp ≥ 2× cặp cũ. Màu nhấn **không xuất hiện trên bàn** nào (focus, nước vừa đi, hàng thắng có token riêng), nên không lẫn với quân. `--danger` trùng son (`#C8372D`) theo mockup: lỗi luôn đi kèm chữ, không đặt cạnh chuồng Đỏ; chấp nhận.
- Tên màu quân trong bản dịch giữ nguyên ("Đỏ", "Xanh dương", "Vàng", "Xanh lá"): mockup dùng "Chàm", "Lục" để minh hoạ; đổi tên là đổi lời báo, E2E, không cần cho M6.5.

**Tỉ số tương phản** (WCAG 2.x, tính bằng script trong scratchpad của phiên thiết kế, công thức độ chói sRGB; "vòng kia đạt" = cặp của vòng focus hai lớp, §3). Giấy điệp (nền Cờ cá ngựa) `#FBF4E4` / `#1F1A12`, ô đường Cờ cá ngựa `#FFFDF7` / `#2A241A`, giấy Cờ caro `#FDFDF8` / `#161A2E`, ô Tic-tac-toe `#FFFFFF` / `#2A2450`, nền Tic-tac-toe `#ECE7FF` / `#1E1838` (giá trị của `redesign-game-boards`, đưa vào đây để chứng minh token chung đạt trên mọi nền).

| Cặp                                                      | Sáng  | Tối   | Cần                              |
| -------------------------------------------------------- | ----- | ----- | -------------------------------- |
| `fg` / `bg`                                              | 16.02 | 16.24 | ≥ 4.5                            |
| `fg` / `surface-muted`                                   | 14.91 | 13.22 | ≥ 4.5                            |
| `fg` / `surface-raised`                                  | 17.47 | 9.36  | ≥ 4.5                            |
| `fg-muted` / `bg`                                        | 5.67  | 8.05  | ≥ 4.5                            |
| `fg-muted` / `surface-muted`                             | 5.28  | 6.55  | ≥ 4.5                            |
| `fg-muted` / `surface`                                   | 6.19  | 7.32  | ≥ 4.5                            |
| `fg-muted` / `surface-raised`                            | 6.19  | 4.64  | ≥ 4.5                            |
| `border-control` / `bg`                                  | 3.94  | 5.62  | ≥ 3                              |
| `border-control` / `surface`                             | 4.30  | 5.11  | ≥ 3                              |
| `border-control` / `surface-muted`                       | 3.67  | 4.58  | ≥ 3                              |
| `border-control` / `surface-raised`                      | 4.30  | 3.24  | ≥ 3                              |
| `surface-raised` / `surface-muted` (mục đã chọn nổi lên) | 1.17  | 1.41  | trang trí; trạng thái = viền + ✓ |
| `accent-fg` / `accent`                                   | 6.82  | 7.31  | ≥ 4.5                            |
| `accent-fg` / `accent-hover`                             | 8.50  | 9.16  | ≥ 4.5                            |
| `accent` / `surface`                                     | 6.82  | 6.65  | ≥ 4.5                            |
| `accent-ink` / `accent-soft`                             | 8.98  | 9.46  | ≥ 4.5                            |
| `danger` / `bg`                                          | 4.76  | 8.05  | ≥ 4.5                            |
| `danger-ink` / `danger-soft`                             | 5.90  | 8.88  | ≥ 4.5                            |
| `success` / `surface` (icon, viền)                       | 4.34  | 8.87  | ≥ 3                              |
| `success-ink` / `success-soft`                           | 5.71  | 8.09  | ≥ 4.5                            |
| `success-ink` / `bg`                                     | 5.97  | 11.93 | ≥ 4.5                            |
| `warning` / `surface`                                    | 5.19  | 8.83  | ≥ 4.5                            |
| `warning-ink` / `warning-soft`                           | 5.12  | 9.25  | ≥ 4.5                            |
| `celebration` / `surface` (hình)                         | 4.12  | 7.99  | ≥ 3                              |
| `celebration-ink` / `celebration-soft`                   | 5.23  | 8.22  | ≥ 4.5                            |
| `focus-ring` / `bg`                                      | 16.02 | 16.24 | ≥ 3                              |
| `focus-ring` / `surface`                                 | 17.47 | 14.77 | ≥ 3                              |
| `focus-ring` / `accent` (nút chính)                      | 2.56  | 2.22  | vòng kia đạt                     |
| `focus-ring-halo` / `accent`                             | 6.82  | 7.31  | ≥ 3                              |
| `focus-ring` / giấy Cờ caro                              | 17.12 | 15.19 | ≥ 3                              |
| `focus-ring` / ô Tic-tac-toe                             | 17.47 | 12.65 | ≥ 3                              |
| `focus-ring` / nền Tic-tac-toe                           | 14.51 | 14.92 | ≥ 3                              |
| `focus-ring` / ô đường Cờ cá ngựa                        | 17.18 | 13.58 | ≥ 3                              |
| `focus-ring` / `piece-red`                               | 3.36  | 3.29  | ≥ 3                              |
| `focus-ring-halo` / `piece-red`                          | 5.20  | 4.93  | ≥ 3                              |
| `focus-ring` / `piece-blue`                              | 2.05  | 2.68  | vòng kia đạt                     |
| `focus-ring-halo` / `piece-blue`                         | 8.52  | 6.06  | ≥ 3                              |
| `focus-ring` / `piece-yellow`                            | 7.14  | 1.72  | vòng kia đạt (tối)               |
| `focus-ring-halo` / `piece-yellow`                       | 2.45  | 9.44  | vòng kia đạt (sáng)              |
| `focus-ring` / `piece-green`                             | 3.31  | 2.27  | vòng kia đạt (tối)               |
| `focus-ring-halo` / `piece-green`                        | 5.28  | 7.15  | ≥ 3                              |
| `piece-red` / ô đường                                    | 5.11  | 4.13  | ≥ 3                              |
| `piece-blue` / ô đường                                   | 8.37  | 5.07  | ≥ 3                              |
| `piece-yellow` / ô đường                                 | 2.41  | 7.89  | viền `piece-edge` đạt (sáng)     |
| `piece-edge` / ô đường                                   | 11.64 | 14.03 | ≥ 3                              |
| `piece-edge` / `piece-yellow`                            | 4.84  | —     | ≥ 3 (chỉ sáng cần)               |
| `piece-green` / ô đường                                  | 5.19  | 5.98  | ≥ 3                              |
| `piece-red-line` / giấy điệp                             | 4.74  | 4.64  | ≥ 3                              |
| `piece-blue-line` / giấy điệp                            | 7.77  | 5.70  | ≥ 3                              |
| `piece-yellow-line` / giấy điệp                          | 4.32  | 8.88  | ≥ 3                              |
| `piece-yellow-line` / ô đường                            | 4.65  | 7.89  | ≥ 3                              |
| `piece-green-line` / giấy điệp                           | 4.82  | 6.72  | ≥ 3                              |
| `piece-red-ink` / `piece-red`                            | 5.11  | 4.64  | ≥ 4.5                            |
| `piece-blue-ink` / `piece-blue`                          | 8.37  | 5.70  | ≥ 4.5                            |
| `piece-yellow-ink` / `piece-yellow`                      | 7.14  | 8.88  | ≥ 4.5                            |
| `piece-green-ink` / `piece-green`                        | 5.19  | 6.72  | ≥ 4.5                            |
| `piece-red-ink` / `piece-red-hover`                      | 6.33  | 5.48  | ≥ 4.5                            |
| `piece-blue-ink` / `piece-blue-hover`                    | 10.34 | 6.77  | ≥ 4.5                            |
| `piece-yellow-ink` / `piece-yellow-hover`                | 8.35  | 10.19 | ≥ 4.5                            |
| `piece-green-ink` / `piece-green-hover`                  | 6.71  | 7.90  | ≥ 4.5                            |
| nút khoá: `fg-muted` / `surface-muted`                   | 5.28  | 6.55  | ≥ 4.5                            |
| nút khoá: viền đứt `border-control` / giấy điệp          | 3.92  | 5.28  | ≥ 3                              |

Bảng `--game-*` của từng game ở design của `redesign-game-boards`. Tỉ số được kiểm lại bằng test đơn vị đọc `styles.css` và các `games/<id>/theme.css` (task 1.4) để không ai đổi giá trị mà quên bảng.

### 3. Vòng focus hai lớp, token riêng

- Tiện ích dùng chung `@utility focus-ring` trong `styles.css`, áp dụng ở `:focus-visible`:
  - **vòng ngoài** = `outline: 2px solid var(--focus-ring); outline-offset: 2px`;
  - **vòng trong (halo)** lấp đúng khe 2 px giữa phần tử và outline bằng **ring của Tailwind** (`ring-2 ring-focus-ring-halo`, tức `--tw-ring-shadow: 0 0 0 2px …`). Tailwind 4 ghép `box-shadow` từ các biến riêng (`--tw-ring-shadow`, `--tw-shadow`…), nên halo **không đè** `shadow-press`/`shadow-raised`/`shadow-card` của phần tử — miễn các bóng đó là token `--shadow-*` dùng qua tiện ích `shadow-*` (không viết `box-shadow` thô);
  - `position: relative; z-index: 10` (bỏ `relative` nếu phần tử đã định vị) để ô Cờ caro hay ô Tic-tac-toe bên cạnh không vẽ đè lên vòng;
  - ở chế độ forced colors, `box-shadow` bị bỏ nhưng `outline` vẫn còn (màu hệ thống).
- Trên bất kỳ nền nào, ít nhất một trong hai vòng đạt ≥ 3:1 (bảng §2), kể cả chuồng màu và nút chính.
- Không dấu nào khác là vòng liền 2 px quanh ô: "nước vừa đi" là vòng/chấm **đứt nét** màu `--game-last-move` nằm **trong** ô, hàng thắng là nét qua tâm ô, quân xem trước (chạm hai lần ở Cờ caro) là quân nét đứt — nên ô có tiêu điểm không còn trông như ô vừa đánh, và cách tạm `-outline-offset-6` của nhánh sửa lỗi không còn cần (bỏ ở `redesign-game-boards`).
- Phương án đã cân nhắc: một màu focus riêng có hue (xanh lơ `#0A7AA8`) — trùng họ với bút xanh Cờ caro và chàm, và vẫn dưới 3:1 trên vài chuồng; vòng focus = `--accent` như cũ — chính là lỗi đang sửa; halo bằng `box-shadow` viết tay — xoá mất `shadow-press` của nút chính. Vòng hai lớp là cách duy nhất đạt 3:1 trên mọi nền mà không phải chọn màu theo từng nền.

### 4. Thang chữ, khoảng cách, bán kính, bóng, `cn()`

- Thang chữ là token Tailwind 4 trong `@theme` (tự sinh `text-display`, …), cỡ co theo khung bằng `clamp()` để một class dùng được cho cả điện thoại lẫn máy tính:

| Token            | Cỡ                                                  | Độ đậm / dòng         | Dùng cho                |
| ---------------- | --------------------------------------------------- | --------------------- | ----------------------- |
| `--text-display` | `clamp(2.25rem, 1.6rem + 2.6vw, 3rem)` (36→48 px)   | 800 / 1.05, `-0.02em` | hero menu, "Bạn thắng!" |
| `--text-title`   | `clamp(1.625rem, 1.4rem + 0.9vw, 2rem)` (26→32)     | 700 / 1.15            | tên game, tiêu đề trang |
| `--text-status`  | `clamp(1.25rem, 1.05rem + 0.8vw, 1.625rem)` (20→26) | 800 / 1.25, `-0.01em` | dòng lượt/kết quả       |
| `--text-heading` | 1.25rem (20)                                        | 700 / 1.3             | tiêu đề thẻ, mục        |
| `--text-body`    | 1rem (16)                                           | 400 / 1.55            | thân                    |
| `--text-small`   | 0.875rem (14)                                       | 400–600 / 1.45        | chú thích               |
| `--text-caption` | 0.8125rem (13)                                      | 600 / 1.3             | chip, nhãn nhóm         |

- **Font**: độ đậm thật sự dùng sau change là 400 (thân), 600 (chú thích, chip), 700 (tiêu đề, nút), 800 (`text-display`, `text-status`). Thêm `"800"`, **bỏ `"500"`** nếu sau khi đổi component không còn `font-medium` nào (hiện có 14 chỗ, phần lớn trong `Button`/`RadioGroup`/`Badge` sắp viết lại; task 1.2 grep lại). Mỗi độ đậm × subset là một file woff2 riêng (`latin` + `vietnamese`, cỡ ~15–25 KB mỗi file) mà `next/font` preload ở mọi trang; đổi 500 → 800 giữ nguyên số file preload, thêm 800 mà không bỏ 500 là thêm hai file. Noto Sans JP vẫn không preload. Kiểm chữ có dấu chồng ("Hoàn tác", "Đến lượt", "Ngẫu nhiên", "Bạn thắng!") ở 800/48 px trong ảnh `ui:shots`: dòng 1.05 không cắt dấu (nếu cắt thì nâng lên 1.1).
- Khoảng cách: thang mặc định của Tailwind 4 (bước 0,25rem) **khuyến nghị** các bậc 1, 2, 3, 4, 6, 8, 10, 14 (4–56 px); ghi ở chú thích đầu `styles.css` và rà ở review, không thêm lint. Khi code có vài chỗ ngoài thang vì kích thước điều khiển (`px-2.5`, `px-5` của nút 48 px, `gap-1.5` của icon trong nút, `h-42` = 170 px của phần hình thẻ game) — chấp nhận.
- Bán kính: `--radius-control: 0.875rem` (14 px: nút, ô nhập, segmented), `--radius-card: 1.25rem` (20 px: thẻ; đổi từ `--radius` 0.75rem), `rounded-full` cho chip. Bóng (token `--shadow-*`, dùng qua `shadow-*`): `card` (sáng `0 1px 2px rgb(23 24 43 / 0.06)`, tối `none` — thẻ tối dựa vào viền), `press` (`0 2px 0 var(--accent-press)`), `raised` cho mục đã chọn (`0 1px 3px rgb(23 24 43 / 0.18)` / tối `0 1px 2px rgb(0 0 0 / 0.5)`).
- **`cn()`**: `tailwind-merge` mặc định coi `text-display` là màu chữ (xoá mất `text-fg` đi cùng), không biết `shadow-press`/`rounded-control`. `packages/ui/src/lib/cn.ts` dùng `extendTailwindMerge({ extend: { theme: { text: ["display","title","status","heading","body","small","caption"], shadow: ["card","press","raised"], radius: ["control","card"] } } })`. Test `cn.test.ts`: `cn("text-display", "text-fg")` giữ cả hai; `cn("text-title", "text-display")` → `text-display`; `cn("shadow-card", "shadow-press")` → `shadow-press`; `cn("shadow-press", "ring-2")` giữ cả hai; `cn("rounded-control", "rounded-card")` → `rounded-card`; các test hiện có xanh.

### 5. Component dùng chung (`packages/ui`)

- **`Button`** (`cva`): `primary` (nền accent, chữ `accent-fg`, `shadow-press`, chữ 700), `secondary` (nền surface, viền 1,5 px `fg`, chữ fg), `ghost` (trong suốt); cỡ `sm` 40 px, `md` 48 px (mặc định), `lg` 64 px (nút gieo), `icon` 44 px. **`aria-disabled`** không còn là "mờ 50%" (chữ mờ dưới 4.5:1): nền `surface-muted`, viền **đứt** `border-control`, chữ `fg-muted`, bỏ bóng, `cursor-not-allowed` — giống nút "Làm lại" của mockup; kiểu khoá **thắng** mọi màu riêng (nút gieo màu quân dùng cùng kiểu khi khoá). Vòng focus §3. Prop và `buttonVariants` giữ tên để link dùng được.
- **`RadioGroup`** thành segmented: rãnh `surface-muted` bo `radius-control` đệm 4 px; mỗi lựa chọn là nhãn chứa radio gốc ẩn (giữ nguyên `<fieldset>`/`<legend>`, mũi tên, một điểm Tab); **đã chọn** = mặt `surface-raised` (sáng hơn rãnh ở **cả hai** chế độ, không trông như lõm xuống ở chế độ tối), viền 1 px `border-control`, `shadow-raised`, chữ 700, **dấu ✓ luôn hiện** (không chỉ ở forced colors) — khác hẳn nút chính tím. Nhiều lựa chọn thì xuống dòng (`flex-wrap`), không cuộn ngang ở 360 px. Vùng chạm 44 px. Legend `text-caption` màu `fg-muted`.
- **`Input`**: cao 48 px, viền 1,5 px `border-control`, bo `radius-control`, lỗi = viền `danger` + lời báo dưới ô (`aria-describedby`, như hiện nay); biến thể `code` (font mono, `tracking-[0.12em]`, chữ in hoa) cho mã phòng.
- **`Card`**: `surface`, viền `border`, `radius-card`, `shadow-card`, đệm 20–24 px.
- **`Badge`** thành chip có biến thể `neutral` (`surface-muted`/`fg-muted`), `accent` (`accent-soft`/`accent-ink`), `success`, `warning`, `celebration`, `danger` (cặp `*-soft`/`*-ink`); có thể kèm icon hay chấm màu (luôn kèm chữ).
- **`ToggleGroup`** mới (cho chọn ngôn ngữ, §8): `role="group"` có tên, các `<button aria-pressed>` cùng kiểu với segmented (mục đang bật = `surface-raised` + viền + ✓); prop `busy` đặt `aria-busy` lên nhóm và bỏ qua bấm trong lúc chờ (không `disabled`, giữ tiêu điểm).
- **`StateScreen`** mới: hình (prop `art`, mặc định là bốn khối logo), tiêu đề (`h1`, `text-title`), lời giải thích, hàng hành động; prop `tone` (`neutral`/`danger`/`warning`) đổi màu viền hình; prop `busy` cho trạng thái đang tải: đặt `role="status"` lên dòng chữ (giữ hợp đồng với test) và chạy hiệu ứng nhịp ba chấm có `motion-reduce:animate-none`. `focusTitle` như `RoomError` hiện nay.
- Phương án đã cân nhắc: `shadcn init` (hoãn, plan.md §10); `RadioGroup` dạng `role="radiogroup"` tự viết — bỏ, radio gốc đang đúng (skill: giữ những gì đang đúng).

### 6. Hợp đồng token theo game `[data-game]`

- `packages/ui/src/styles.css` khai báo tên và giá trị mặc định (dựa trên token chung, nên tự đổi theo sáng/tối mà không cần lặp ở hai khối tối), và tiện ích:

```css
:root {
  --game-page: var(--bg); /* nền trang quanh bàn */
  --game-tint: var(--surface-muted); /* nền hình minh hoạ trên menu, đầu màn hình bắt đầu */
  --game-board: var(--surface); /* mặt bàn / ô */
  --game-line: var(--border-control); /* đường kẻ, viền ô chọn được (≥ 3:1 với --game-board) */
  --game-mark-1: var(--fg); /* quân người thứ nhất (2 người) */
  --game-mark-2: var(--fg-muted); /* quân người thứ hai */
  --game-highlight: var(--accent-soft); /* ô đích, ô gợi ý */
  --game-last-move: var(--fg-muted); /* dấu nước vừa đi (đứt nét) */
  --game-win: var(--celebration); /* hàng thắng */
}
@theme inline {
  --color-game-page: var(--game-page); /* … một dòng cho mỗi biến */
}
```

- **Giá trị của từng game** nằm trong file CSS thường (toàn cục) `apps/web/src/games/<id>/theme.css`, chọn bằng **`[data-game="<id>"]`** — nguồn duy nhất là thuộc tính `data-game`, không class phụ — với hai khối tối giống hệt cơ chế chung:

```css
[data-game="caro"] { --game-board: #fdfdf8; … }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) [data-game="caro"] { --game-board: #161a2e; … }
}
:root[data-theme="dark"] [data-game="caro"] { --game-board: #161a2e; … }
```

Game có thể thêm biến riêng tiền tố `--<id>-*` (ví dụ `--caro-margin`) trong cùng file, luôn có cả sáng và tối. File được import từ module giao diện của game (`games/<id>/index.ts`, nạp lười cùng bàn) **và** từ `games/<id>/Artwork.tsx` (hình minh hoạ tĩnh dùng ở menu và màn hình bắt đầu); App Router cho import CSS toàn cục từ component, Next gộp và khử trùng lặp.

- ~~Registry giữ **một mục mỗi game**: `GAME_ENTRIES = { tictactoe: { load, Artwork } … }`~~ — **đổi khi code**: hình đăng ký ở `games/artwork.ts` (`GAME_ARTWORK`, thiếu/thừa game là lỗi kiểu), `GAME_ENTRY_LOADERS` giữ nguyên; lý do ở "Chỗ lệch thêm khi code". Phần tử bọc vùng của game mang `data-game="<id>"`: thẻ menu, đầu màn hình bắt đầu ván (change này), màn hình chơi (`redesign-game-boards`).
- Phương án đã cân nhắc:
  - CSS Module mỗi game + `themeClassName` — hai nguồn (class và `data-game`) phải luôn đi cùng nhau, và cần `:global(...)` cho hai khối tối; bỏ theo review.
  - `[data-game="caro"]` trong `globals.css` của app — thêm game phải sửa file chung (vi phạm bất biến).
  - Biến ghi bằng `style={{ "--game-board": … }}` từ object TS — không viết được khối tối theo `prefers-color-scheme`, phải nhân đôi biến và đưa hex vào TSX.
  - Đặt giá trị game trong `packages/ui` — `packages/ui` sẽ biết mã game (bất biến).
- Hệ quả (chấp nhận sau review): ba `theme.css` (0,3–0,5 KB mỗi file) tải ở menu và màn hình bắt đầu ván thành ba file CSS riêng chặn vẽ; barrel `@board-games/ui` kéo thêm `ConfirmDialog`/`RadioGroup`/`StateScreen` vào client manifest của menu (vài KB). Gộp hay tách các phần này không đáng so với độ phức tạp; xem lại nếu đo thấy chậm. Bàn và luật vẫn nạp lười (`GAME_ARTWORK` tách khỏi `GAME_ENTRY_LOADERS`, ESLint chặn `games/artwork.ts` và `games/*/Artwork.tsx` import registry, entry, `Board*` hay luật của game). Selector chỉ khớp bên trong phần tử có `data-game` tương ứng, nên CSS của game này không ảnh hưởng game khác.

### 7. Chọn giao diện Sáng / Tối / Theo hệ thống (capability `color-theme`)

- Lưu ở **cookie** `THEME_COOKIE = "theme"` (giá trị `light` | `dark`; không có cookie = theo hệ thống), `path=/`, `max-age` một năm, `SameSite=Lax` — cùng thời hạn với ngôn ngữ. `RootLayout` đọc cookie bằng zod (`z.enum(["light","dark"])`, giá trị lạ = không có) và đặt `data-theme` lên `<html>` ngay trong HTML của server → không nháy, không cần script chặn.
- `ThemeSwitcher` (client) nhận **giá trị ban đầu từ server** qua prop (`initialTheme`, đọc từ cookie ở `MenuPage`/layout), nên HTML server đã đánh dấu đúng lựa chọn, không lệch khi hydrate; sau mount đồng bộ một lần từ `document.documentElement.dataset.theme` (trường hợp trang được lấy từ cache sau khi đổi ở tab khác). Đổi lựa chọn: ghi `document.cookie` và đặt/xoá `dataset.theme` ngay (không gọi server, không render lại trang); "Theo hệ thống" xoá cookie và thuộc tính → khối `@media (prefers-color-scheme: dark)` tự áp dụng và đổi theo hệ điều hành mà không cần JS.
- Giao diện: `RadioGroup` cỡ `sm` tên "Giao diện", ba lựa chọn có icon Mặt trời / Mặt trăng / Màn hình và nhãn chữ "Sáng", "Tối", "Theo hệ thống" (nhãn `sr-only` trên điện thoại hẹp, icon `aria-hidden`). Radio hợp ở đây: mũi tên đổi giao diện từng bước là rẻ và tức thì (khác với ngôn ngữ, §8).
- Phương án đã cân nhắc:
  - `localStorage` + script inline chặn vẽ trong `<head>` — thêm script inline (CSP sau này), nháy nếu script lỗi, và trang của ta vốn đã động.
  - Server action như `setLocale` — đi một vòng server và render lại cả trang chỉ để đổi một thuộc tính.
  - Một nút ☾ bật/tắt (mockup) — không quay lại được "Theo hệ thống" (lệch mockup, ghi ở "Đã chốt").

### 8. Menu và lối "Online"

- Thanh trên (`features/menu/AppBar.tsx`): logo bốn khối (tím, cam, ngọc, mực — SVG `aria-hidden`) + "Board Games Hub"; bên phải chọn ngôn ngữ và chọn giao diện. Dưới 640 px thanh trên xuống hai hàng (logo + giao diện; ngôn ngữ chiếm hàng dưới), không cuộn ngang ở 360 px.
- **Chọn ngôn ngữ** là `ToggleGroup` (`role="group"`, tên "Ngôn ngữ"), ba nút `aria-pressed` ghi "Tiếng Việt", "English", "日本語" với `lang` từng nút (spec `localization` "Đổi ngôn ngữ"); bấm gọi server action `setLocale` trong `useTransition`, nhóm `aria-busy` khi đang chờ, các nút không `disabled` (giữ tiêu điểm). Không dùng radio: mũi tên trên radio đổi lựa chọn ngay, nên đi từ tiếng Việt sang tiếng Nhật bằng bàn phím sẽ tải lại trang bằng tiếng Anh ở giữa.
- Hero: `h1` "Chơi cờ cùng bạn bè, ngay trên trình duyệt" (`Menu.heroTitle`, `text-display`) + `Site.tagline`. `h1` đổi từ tên app sang câu hero (tên app ở thanh trên và tiêu đề tab), E2E `menu.spec.ts` sửa theo.
- Cột phải (≥ 1024 px; dưới hero trên điện thoại): một `Card` chứa mục "Vào phòng bằng mã" (tiêu đề `h2`, `Input` biến thể `code`, nút chính "Vào phòng") và, khi có, mục "Tiếp tục ván dở" (tiêu đề `h2`, mỗi ván một hàng `surface-muted` có mũi tên). Hai mục giữ tiêu đề riêng (spec `game-menu`).
- Thẻ game: phần hình cao 170 px nền `--game-tint` với `Artwork` của game, tên (`text-heading`), "2 người · ~10 phút", một dòng mô tả ngắn (`Games.<id>.tagline`), hai lối: **"Chơi"** (`buttonVariants` primary, `/play/<id>`) và **"Online"** (secondary, `/play/<id>?mode=online`); cả hai `aria-describedby` trỏ tên game như `PlayLink` hiện nay. Lưới 3 cột ≥ 1024 px, 2 cột ≥ 640 px, 1 cột dưới đó.
- Game "Sắp có": dòng mảnh viền đứt `border-control` (tên, số người, thời lượng, chip "Sắp có"), không phải liên kết, không nhận tiêu điểm.
- **Chế độ chọn sẵn**: `app/play/[gameId]/page.tsx` đọc `searchParams.mode`, kiểm bằng `SETUP_MODE` và `supportsAI` (chế độ game không có, hay giá trị lạ, bị bỏ qua), truyền `initialMode` cho `SetupScreen`. `SetupScreen` dựng lựa chọn ban đầu với `mode: initialMode ?? mặc định` và, khi đọc lựa chọn đã nhớ sau mount, giữ `initialMode` thay cho chế độ đã nhớ (các lựa chọn khác lấy từ bản đã nhớ). Đường dẫn không bị xoá tham số (tải lại vẫn chọn sẵn như vậy). Lựa chọn chỉ được nhớ khi "Bắt đầu"/"Tạo phòng" như cũ.
- `?mode=` được áp dụng khi màn hình mở. Effect đọc lựa chọn đã nhớ phụ thuộc `initialMode`, nên nếu tham số đổi lúc màn hình đang mở (app không có lối nào làm vậy) lựa chọn được đọc lại: bản đã nhớ + chế độ mới. Không có test riêng cho trường hợp này.
- Phương án đã cân nhắc cho "Online": tạo phòng ngay từ thẻ — bỏ qua bước nhập tên và số người/tuỳ chọn luật; đường dẫn riêng `/play/<id>/online` — `[mode]` là màn hình chơi, lẫn với setup.

### 9. Màn hình bắt đầu ván, đang tải, lỗi

- `SetupScreen`: đầu trang có dải `--game-tint` (phần tử mang `data-game`) với `Artwork` nhỏ và tên game (`text-title`), lối "Về menu" (ghost, icon ←) bên trái; các nhóm lựa chọn dùng segmented mới; nút chính "Bắt đầu"/"Tạo phòng" cỡ `md`, rộng hết khung trên điện thoại. Không đổi hành vi nào ngoài `?mode=`.
- `PlayLoading`, `RoomJoining` (cả "chưa kết nối được máy chủ"), `PlayLoadError`, `RoomError` (mọi `ROOM_PROBLEM`), `app/**/not-found.tsx`, `app/**/error.tsx` dùng `StateScreen`: cùng lời, cùng nút (thử lại, tải lại, về menu), cùng `role="status"` cho dòng đang tải và `focusTitle` cho trang lỗi. Hình: bốn khối logo, khối lỗi chuyển màu theo `tone`. Thuần hình ảnh: không có requirement mới.

### 10. Bản dịch

- Khoá mới (vi/en/ja, cùng tham số ICU): `Menu.heroTitle`, `Menu.online`, `Games.<id>.tagline` cho ba game (gợi ý vi: "Dễ làm quen, vài phút một ván", "Năm quân liền là thắng · bàn 15×15 hoặc 19×19", "2–4 người, cùng máy hoặc online"), `Settings.theme`, `Settings.themes.{light,dark,system}`, chữ trên `StateScreen` nếu có thêm. `Settings.language` giữ làm tên nhóm ngôn ngữ. `messages.test.ts` kiểm đủ khoá.

## Risks / Trade-offs

- [Đổi `RadioGroup` và `Button` chạm mọi màn hình] → test component hiện có truy vấn theo vai trò và tên, không theo class; chạy toàn bộ test + E2E + `ui:shots` trước khi sang change sau.
- [`cn()` gộp sai lớp mới] → `extendTailwindMerge` + test (§4) trước khi viết lại component.
- [Cookie `theme` không HttpOnly] → chỉ chứa `light`/`dark`, đọc lại bằng zod; không có gì bí mật.
- [Bảng tỉ số lệch khi ai đó chỉnh token] → test đơn vị đọc `styles.css` và các `theme.css`, tính lại các cặp chính (task 1.4).
- [`h1` menu đổi chữ] → E2E và test component sửa trong cùng task; tiêu đề tab vẫn "Board Games Hub".
- [Cỡ chữ 800/48 px với dấu chồng tiếng Việt] → kiểm trong ảnh `ui:shots`, nâng `line-height` nếu cắt.
- [`theme.css` toàn cục của mọi game tải ở menu] → vài trăm byte mỗi game, selector bị giới hạn trong `[data-game]`; theo dõi kích thước CSS trong `pnpm build`.
- [`focus-visible:relative` làm đổi khối chứa của phần tử con định vị tuyệt đối] → chỉ thêm `relative` khi phần tử chưa định vị; kiểm ở ảnh focus của từng bàn.
- [Lệch mockup] → nhỏ, vì AA hay spec; ghi ở "Đã chốt".

## Kiểm tra

**Đã chạy (03/11/2026, khi apply):**

- Bảng tỉ số §2 khớp code: tính lại từ `styles.css` bằng script và bằng test `packages/ui/src/styles.test.ts` (mọi cặp của bảng, vòng focus hai lớp trên 18 nền, ba khối có đủ token, hai khối tối giống hệt). Review thấy `fg-muted`/`surface-raised` tối chỉ 4,48 với `#A6A7BC`: `--fg-muted` tối nâng lên `#A9AABF` (4,64; các cặp khác của nó tăng nhẹ — số trong design của `redesign-game-boards`/`add-game-feedback` vì thế là cận dưới). `packages/ui` không biết game nào nên test của nó chỉ kiểm token chung; nền bàn từng game (vòng focus trên `--game-board`/`--game-tint`, viền chuồng `piece-*-line` trên giấy điệp, `piece-edge` trên ô đường) kiểm ở `apps/web/src/games/theme-css.test.ts`, đọc giá trị từ `theme.css` của game và token từ `styles.css`.
- `pnpm ui:shots` (48 ảnh, sáng/tối × 390/1280): menu, menu có ván dở, menu 360 px, menu với cookie `theme=dark` trên hệ điều hành sáng (giống hệt bản tối theo hệ thống), bốn màn hình bắt đầu ván (kể cả `?mode=online`), `PlayLoading`, `RoomJoining` và "chưa kết nối được" (WebSocket bị chặn), không tìm thấy game/trang/phòng. So với `mockup/png/m1.png`, `m2.png`: bố cục, màu, chữ khớp, trừ các chỗ lệch ghi ở trên. Chữ có dấu chồng ở `text-display` 48 px/800 với dòng 1.05 ("ngay trên trình duyệt", "bạn bè") không bị cắt. Sửa sau khi xem: thanh trên điện thoại (nhóm giao diện rơi xuống hàng riêng → thu đệm mục `sm`).
- Rà `web-design-guidelines` trên các file đã đổi: vòng focus thấy rõ (không `outline-none` trừ tiêu đề nhận focus bằng script), radio/nút có nhãn, icon trang trí `aria-hidden`, hiệu ứng nhịp có `motion-reduce`, `text-balance`/`text-pretty` cho tiêu đề và lời giải thích, "Đang tải…" dùng `…`, tên app `translate="no"`. Không áp dụng (luật dự án thắng): Title Case. Chưa làm: `<meta name="theme-color">`, skip link (ngoài phạm vi).
- `pnpm check`, `pnpm knip`, `pnpm test:e2e` (142 xanh, 2 bỏ qua có sẵn), `pnpm spec:check` xanh.

**Kế hoạch ban đầu:**

- `pnpm ui:shots`: mọi màn hình × sáng/tối × điện thoại 390 px/máy tính 1280 px vào `apps/web/.ui-shots/`; xem từng ảnh, so với `mockup/png/m1.png`, `m2.png`. Thêm ảnh: menu có ván dở, menu ở khung 360 px, màn hình bắt đầu ván chọn sẵn "Online", segmented tối, `PlayLoading`, `RoomJoining` chậm, trang không tìm thấy, và một lượt chụp với cookie `theme=dark` trên hệ điều hành sáng để thấy hai khối tối khớp nhau.
- Rà `web-design-guidelines` trên các file đã đổi; `pnpm check`, `pnpm knip`, `pnpm test:e2e`, `pnpm spec:check`.
