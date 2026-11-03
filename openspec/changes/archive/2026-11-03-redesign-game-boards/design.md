# Design

## Context

- `PlayScreen` (`features/play/`) là một cột `max-w-3xl`: đầu trang (tên game, chip chế độ/luật, "Về menu"), `ConnectionNotice` (online), dòng `role="status"`, `<Board>`, hàng nút (Hoàn tác, Làm lại, Ván mới/Chơi lại). `BoardProps` = `state`, `legalMoves`, `onMove`, `disabled`, `result`, `lastEntry`, `viewer`.
- Tic-tac-toe `Board`: chín `<button>`, X `text-accent`, O `text-fg`, ô vừa đi `border-3 border-accent`, ô không chọn được viền đứt nền nhạt (spec `local-play` "Chỉ chọn được nước đi hợp lệ").
- Cờ caro `Board`: lưới SVG + `role="grid"` (roving tabindex, chạm hai lần khi ô < 24 px, quân xem trước mờ 40%), kích thước `max-w-[min(40rem,max(20rem,calc(100dvh-20rem)))]`, đường kẻ `fg-muted/80` (nhánh sửa lỗi), hàng thắng có nét `fg/70`; ô vừa đi có `focus-visible:-outline-offset-6` (nhánh sửa lỗi) để vòng focus không bị dấu che.
- Cờ cá ngựa `Board`: SVG chữ thập + khối điều khiển dưới bàn (`Dice`, nút `data-ludo-roll` **luôn được vẽ**, `aria-disabled` khi không gieo được, dòng `data-ludo-hint`, nhóm "Chọn ngựa" các nút `data-ludo-choice`). Tiêu điểm sau khi gieo/đi được đặt bằng `rootRef.current?.querySelector("[data-ludo-choice]")` / `("[data-ludo-roll]")` (`Board.tsx` dòng 341, 351) — chỉ đúng khi điều khiển nằm trong `rootRef`. `Dice` khung theo màu của `state.last.player` (người **vừa** gieo); màu quân `--piece-*`, nhạt `/20` cho chuồng đích. `LudoState` có `toMove`, `die` (số đang chờ chọn ngựa, `null` khi chờ gieo), `last` (sự kiện gần nhất, có người và số gieo).
- Token, hợp đồng `--game-*`, `games/<id>/theme.css` với selector `[data-game="<id>"]`, `Artwork`, tiện ích `focus-ring` (outline + halo, `z-10`): đã có từ `add-design-foundation` (design §2, §3, §6 của change đó).

## Goals / Non-Goals

**Goals:**

- Mỗi game một chất liệu riêng theo mockup, khung (thanh trên, cột bên, nút) giữ chung.
- Một thứ tự DOM duy nhất cho mọi khung (đọc màn hình và Tab giống nhau trên điện thoại và máy tính).
- Ở 1280 × 800 không cần cuộn; ở 360–390 px không cuộn ngang, mọi điều khiển chạm được.
- Ai sắp gieo thấy ngay trên xúc xắc và bàn; lần gieo trước vẫn đọc được.
- Mọi quân, đường kẻ ô chọn được, dấu nước vừa đi, quân xem trước, hàng thắng ≥ 3:1 với nền ngay cạnh ở cả sáng lẫn tối; vòng focus phân biệt được với mọi dấu trên bàn.

**Non-Goals:**

- Bảng người chơi, khoảnh khắc kết thúc, máy đang nghĩ, lý do nút không bấm được (`add-game-feedback`).
- Đổi luật, engine, transport.

## Đã chốt với người dùng (03/11/2026)

- Mockup M6.5 được duyệt nguyên trạng; bản lưu ở `openspec/changes/archive/2026-11-03-add-design-foundation/mockup/` — khung 3 (Tic-tac-toe), 4 và 7 (Cờ caro sáng, tối), 5 và 6 (Cờ cá ngựa máy tính, điện thoại 390 px).
- **Chỗ lệch mockup** (ghi để người dùng thấy khi xem ảnh):
  - Vì AA: đường kẻ vở `#BCD3EA` (1,51:1) → `#6E93C0` (3,12:1), bản tối `#2F3C5E` → `#5D6FA3`; X Tic-tac-toe `#FF7A2F` (2,60:1 trên ô trắng) → `#D9500C`; ô trống chọn được có viền `#7C62E3` (mockup không có viền, 1,2:1); quân hoè có viền nâu `--piece-edge` và ký hiệu mực (ký hiệu trắng trên hoè 2,41:1); khung/viền màu Vàng dùng `--piece-yellow-line`; quân xem trước của Cờ caro là nét đứt đủ màu thay cho quân mờ 40% (~2:1).
  - Vì luật của skill (màu nhấn không trùng quân): O Tic-tac-toe tím đậm `#3A1FA8` / `#D2C7FF` thay cho đúng màu nhấn `#5B34E6`.
  - Vì đúng trạng thái: trước lần gieo, xúc xắc hiện **mặt chờ** (khung đứt, chấm mờ) trong màu người sắp gieo; mockup khung 5 vẽ sẵn số 5 khi "Đến lượt Đỏ · gieo xúc xắc".
  - Giữ chữ đã có: link thanh trên ghi "Về menu" (kèm icon ←) thay cho "← Menu" (E2E và bản dịch dùng "Về menu"); lề đỏ của vở nằm ở dải giấy ngoài lưới (mockup vẽ cắt qua cột 2).
  - Hàng nút "Hoàn tác / Làm lại / Ván mới" có ở mọi màn hình chơi cùng máy/với máy (mockup chỉ vẽ ở khung 4; khung 3, 5 bỏ để gọn) — spec `local-play` bắt buộc.

## Decisions

### 1. Bố cục màn hình chơi bằng composition, một thứ tự DOM

- `PlayScreen` là `<main data-game={gameId} className="flex min-h-dvh flex-col bg-game-page">` (giá trị `--game-*` đến từ `games/<id>/theme.css` theo `data-game`). Thanh trên nằm trong `main` (không phải landmark `banner`), nên E2E vẫn tìm chip chế độ bằng `getByRole("main")`.
- Thanh trên cao 64 px (`min-h-16`, viền dưới `border`): link "Về menu" (ghost, `ArrowLeftIcon` `aria-hidden`) bên trái; giữa là `h1` tên game (`text-heading` trên điện thoại, `text-title` từ 1024 px) và các chip chế độ/Online/luật (`Badge` accent). Dưới 640 px: lưới `auto | 1fr` (tên game ở giữa phần còn lại), chip xuống dòng dưới tên; từ 640 px lưới `1fr auto 1fr` để tên nằm giữa trang. Chip luật được xuống dòng (`whitespace-normal`) nếu quá dài.
- **Board trả về các phần, PlayScreen sắp xếp**: `BoardProps.layout: (parts: { board: ReactNode; controls: ReactNode | null }) => ReactNode` (bắt buộc truyền từ `PlayScreen`; test có thể dùng `defaultBoardLayout` = `board` rồi `controls`). Mỗi `Board` dựng phần bàn và phần điều khiển của riêng nó (Cờ cá ngựa: xúc xắc, nút gieo, gợi ý, chip lần gieo trước, nhóm chọn ngựa; Tic-tac-toe, Cờ caro: `null` hoặc gợi ý chạm hai lần) rồi `return layout({ board, controls })`. Cả hai phần vẫn nằm trong cùng một component nên giữ nguyên state hiệu ứng (`useLudoAnimation`), ô đích nổi bật khi đưa tiêu điểm tới lựa chọn, tiêu điểm sau khi gieo.
- Mọi `Board` PHẢI gọi `layout` đúng một lần ở mỗi lần render, không điều kiện, và trả về kết quả đó: dòng lượt, `ConnectionNotice` và hàng nút nằm trong lưới đó (ghi ở JSDoc `BoardLayout`; `features/play/every-game.test.tsx` kiểm mọi game trong registry). Dòng lượt, `ConnectionNotice` và hàng nút được dựng một lần mỗi lần `PlayScreen` render; hàm `layout` chỉ ghép, nên khi bàn tự render lại (khung hình hiệu ứng của Cờ cá ngựa) React gặp đúng các phần tử cũ và bỏ qua chúng.
- `PlayScreen` truyền `layout` dựng **một** lưới với thứ tự DOM cố định ở mọi khung: `ConnectionNotice` → dòng `role="status"` → vùng người chơi (chưa có phần tử ở change này, `add-game-feedback` thêm vào ô `players`) → `board` → `controls` → hàng nút của ván. Vị trí:
  - dưới 1024 px: một cột `grid-cols-[minmax(0,1fr)]`, các phần theo thứ tự DOM, `gap-y-4`;
  - từ 1024 px: `grid-cols-[auto_minmax(20rem,24rem)]` căn giữa (`justify-center`), khoảng 40 px, bảy hàng `minmax(0,1fr) repeat(5,auto) minmax(0,1fr)` với `grid-template-areas` `"board ." "board notice" "board status" "board players" "board controls" "board buttons" "board ."` — bàn chiếm mọi hàng, hai hàng `1fr` đầu/cuối đặt cột bên vào giữa chiều cao bàn. Khoảng cách giữa các phần của cột là `my-1.5` trên từng phần (không `row-gap`), nên ô trống (`notice` khi chơi cùng máy, `players`) không tạo khoảng thừa; hàng nút chỉ được vẽ khi có ít nhất một nút (online đang chơi thì không có).
    Thứ tự đọc và Tab: "Về menu", dòng lượt, người chơi (không tiêu điểm), bàn, điều khiển game, nút của ván — như nhau ở mọi khung.
  - `ConnectionNotice` nhận thêm `className`; `PlayScreen` truyền `my-0 lg:my-1.5`, ghi đè lề âm `-my-3` (vẫn ở component, cho sảnh chờ) vốn trừ khoảng cách của cột cũ.
- **Ref thay cho `querySelector`**: Cờ cá ngựa giữ `rollButtonRef` và `firstChoiceRef` (ref trên nút lựa chọn đầu tiên; `ButtonProps` của `packages/ui` nay là `ComponentProps<"button">` để nhận `ref`, như `Input`) để đặt tiêu điểm sau khi gieo/đi; không còn tìm `[data-ludo-*]` trong `rootRef`, nên tiêu điểm đúng dù điều khiển nằm ở ô lưới nào. `data-ludo-roll`, `data-ludo-choice`, `data-ludo-hint`, `data-target` giữ làm hợp đồng với E2E.
- Kích thước bàn: lưới của `PlayScreen` cho bàn chỗ bằng biến `--board-room` — `100%` dưới 1024 px, `min(100vw - 34rem, 100dvh - 10rem)` từ 1024 px (34rem = cột 24rem + khoảng 2,5rem + lề 5rem + thanh cuộn); mỗi `Board` đặt phần bàn `w-[min(var(--board-room,100%),<cỡ tối đa>)]` với cỡ tối đa của game ngay trong thư mục game (Tic-tac-toe 26rem, Cờ caro và Cờ cá ngựa 37.5rem), nên `PlayScreen` không biết game nào và cột `auto` của lưới ôm đúng cỡ bàn. Ở 1280 × 800: bàn 600 px, cột phải 384 px, cao 64 + 48 + 600 = 712 ≤ 800. `100dvh` chỉ dùng từ 1024 px. Hợp đồng ghi ở chú thích `BoardLayout` (`games/types.ts`).
- **Ngân sách chiều cao cột phải ở 1280 × 800** (vùng dưới thanh trên ~ 800 − 64 − 2 × 24 = 688 px), cho Cờ cá ngựa 4 người — trường hợp dày nhất, kể cả phần `add-game-feedback` thêm vào:

| Phần                                                                                                                         | Cao                |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `ConnectionNotice` (online, khi hiện)                                                                                        | 40                 |
| dòng lượt (`text-status` 26/1.25, tối đa 3 dòng)                                                                             | 98                 |
| bảng người chơi gọn: 4 hàng × 40 + 3 × 4 (`add-game-feedback`)                                                               | 172                |
| điều khiển: xúc xắc 56 + nút gieo 64 cùng hàng; gợi ý + chip lần gieo trước 44; bốn lựa chọn ngựa lưới 2 cột × 2 hàng 44 + 8 | 64 + 44 + 96 = 204 |
| hàng nút của ván (cùng máy/với máy)                                                                                          | 48                 |
| khoảng cách 5 × 12                                                                                                           | 60                 |
| **Tổng**                                                                                                                     | **622 ≤ 688**      |

Lựa chọn ngựa: lưới 2 cột từ 1024 px (mỗi nút ~182 px, chữ xuống tối đa 2 dòng ở 44 px), 1 cột dưới 1024 px. Change này kiểm 2 lựa chọn (E2E), `add-game-feedback` kiểm 4 lựa chọn + bảng người chơi + `ConnectionNotice`.

- Phương án đã cân nhắc:
  - Biến `--board-max` của từng game trong `theme.css` (bản trước của design này) — `theme-css.test.ts` đòi mọi biến ở đó có giá trị sáng và tối và chỉ là `--game-*`/`--<id>-*`; cỡ bàn không phải màu, nên nằm trong class của `Board`.
  - `createPortal` điều khiển vào cột bên (bản trước của design này) — bỏ theo review: phá cách đặt tiêu điểm bằng `querySelector` trong `rootRef`, và thứ tự DOM khác nhau giữa các khung.
  - Tách `GameUI` thành `Board` + `Controls` dùng chung một store/context — sạch nhưng phải chuyển state hiệu ứng và tiêu điểm sang context, rủi ro hồi quy.
  - `order`/`flex-direction` khác nhau theo khung — thứ tự nhìn khác thứ tự Tab (WCAG 2.4.3).

### 2. Tic-tac-toe

- `theme.css` (`[data-game="tictactoe"]`): `--game-page` `#ECE7FF`/`#1E1838`, `--game-tint` cùng giá trị, `--game-board` (mặt ô) `#FFFFFF`/`#2A2450`, `--game-line` (viền ô chọn được) `#7C62E3`/`#7D6AE0`, `--game-mark-1` (X) `#D9500C`/`#FF9A5C`, `--game-mark-2` (O) `#3A1FA8`/`#D2C7FF`, `--game-last-move` = `fg-muted`, `--game-win` = `fg` (nét hàng thắng của `add-game-feedback`, khác màu X và O); biến riêng `--tictactoe-tile-shadow` `0 4px 0 #D3C7FB` / `0 4px 0 #14102A` (cả bóng — gờ dưới ô đã có quân, trang trí, class `shadow-(--tictactoe-tile-shadow)`; bóng là token của game chứ không viết hình bóng trong component).
- Ô: bo `6cqw`, khe `3.4cqw` (đơn vị container, phần bàn là `@container`: 25 px và 14 px ở bàn 416 px); ô đã có quân nền `--game-board` + bóng dưới 4 px; ô trống chọn được nền `--game-board` + viền 2 px `--game-line`, khi trỏ hiện quân của người đang đến lượt **nét đứt** (`group-hover`, mà Tailwind 4 chỉ bật trong `@media (hover: hover)`, nên không sót lại sau một lần chạm); ô trống không chọn được: nền `--game-board/55`, viền đứt (thành phần không hoạt động, ngoài yêu cầu 3:1 của WCAG 1.4.11; vẫn khác ô chọn được không cần trỏ — spec `local-play`).
- X: hai nét bo đầu dày ~16% cạnh ô, `--game-mark-1`; O: vòng dày ~14%, `--game-mark-2`. Ô vừa đi: vòng chữ nhật bo **đứt nét** 2 px `--game-last-move` thụt vào 6 px; focus: tiện ích `focus-ring` bên ngoài ô (`z-10`) — khác nét, khác vị trí.
- Tỉ số (sáng / tối, `fg-muted` tối `#A9AABF`): `--game-line`/nền 3,70 / 4,03; `--game-line`/ô 4,46 / 3,42; X/ô 4,12 / 6,84; O/ô 10,82 / 9,10; nước vừa đi/ô 6,19 / 6,27; `fg-muted`/nền 5,14 / 7,39; `fg`/nền 14,51 / 14,92; `--game-win`/ô 17,47 / 12,65. Khoảng cách màu O với màu nhấn: ΔE 0,124 (sáng), 0,149 (tối), cùng họ tím nhưng khác hẳn độ sáng; màu nhấn không xuất hiện trên bàn.

### 3. Cờ caro "vở ô li"

- `theme.css` (`[data-game="caro"]`): `--game-board` `#FDFDF8`/`#161A2E`, `--game-tint` `#EAF1FA`/`#18213A`, `--game-line` `#6E93C0`/`#5D6FA3`, `--game-mark-1` (X, bút bi xanh) `#1F3FA8`/`#8FB0FF`, `--game-mark-2` (O, bút đỏ) `#C42B2B`/`#FF8E8E`, `--game-last-move` = `fg-muted`, `--game-win` = `celebration`, biến riêng `--caro-margin` `#E58A8A`/`#6B3A48` (lề đỏ, trang trí).
- Khung bàn: dải giấy rộng 5% bên trái (~0,8 ô ở 15×15) chứa lề đỏ 2 px (không có ô, `aria-hidden`); lưới vuông bắt đầu sau dải đó. Đường kẻ 1 px (`vector-effect: non-scaling-stroke`), mỗi 5 đường đậm hơn (1,6 px) và chấm sao trên giao điểm, ba đường từ mỗi mép (3 và 12 ở 15×15, 3 và 16 ở 19×19, đối xứng), thêm chấm giữa chỉ khi bàn có giao điểm ở giữa (cỡ chẵn; 15 và 19 không có — mockup vẽ chấm giữa lệch nửa ô); viền khung `--game-line`. Bóng `shadow-card` (sáng có, tối không).
- Quân: X hai nét hơi cong kiểu bút bi, O vòng khép có đuôi chồng lên đầu kiểu viết tay (`path`; bản vòng hở ~30° trông như chữ "C" trong ảnh nên bỏ), nét ~9% cạnh ô **co giãn theo ô** (không `vector-effect`, để nét giữ tỉ lệ ở 15×15 và 19×19). Nước vừa đi: vòng tròn đứt nét `--game-last-move` quanh quân (giữ `aria-describedby` "Nước vừa đi"). **Quân xem trước** (chạm lần một khi ô < 24 px): quân đủ màu của người đang đến lượt vẽ bằng **nét đứt** (tỉ số bằng quân thật: 8,82 / 5,52 sáng), thay cho quân mờ 40% (~2:1), trên nền `--game-highlight` (mặc định `accent-soft`; X/nền gợi ý 7,47 / 6,45, O 4,68 / 6,24) để thấy ngay ô đang chọn. Nền này thụt vào 3 px trong ô, nên đường kẻ quanh ô vẫn nằm trên giấy (đường kẻ/`accent-soft` chỉ 2,64 / 2,80). Hàng thắng: nét gạch màu quân người thắng qua tâm các ô thắng + elip khoanh `--game-win` (giữ mô tả "thuộc hàng thắng" và ô nổi bật của spec `caro`).
- Focus: tiện ích `focus-ring` chung (outline lệch ra ngoài + halo, `relative z-10` để ô bên cạnh không vẽ đè); bỏ cách tạm `focus-visible:-outline-offset-6` của nhánh sửa lỗi vì dấu nước vừa đi nay là vòng đứt nét bên trong ô, không còn trùng chỗ với vòng focus. Kiểm bằng ảnh "ô vừa đi đang có tiêu điểm".
- Tỉ số (sáng / tối): đường kẻ/giấy 3,12 / 3,49; X/giấy 8,82 / 8,04; O/giấy 5,52 / 7,79; nước vừa đi/giấy 6,07 / 7,52; khoanh hàng thắng/giấy 4,03 / 8,21; `fg-muted`/trang 5,67 / 8,05. Lề đỏ 2,47 / 1,90: trang trí, không phải ranh giới điều khiển.
- Điện thoại: chip luật xuống dòng dưới tên game (hết tràn đầu trang); bàn rộng hết khung; ô < 24 px vẫn chạm hai lần (spec). Gợi ý "Chạm lần nữa để đặt quân" là `controls` (vùng `aria-live` luôn có mặt), giữ chỗ `min-h-5` dưới 1024 px, không giữ chỗ ở cột bên máy tính.

### 4. Cờ cá ngựa "tranh dân gian"

- `theme.css` (`[data-game="ludo"]`): `--game-page` và `--game-tint` `#FBF4E4`/`#1F1A12` (giấy điệp), `--game-board` (ô đường) `#FFFDF7`/`#2A241A`, `--game-line` `#8A7E66`/`#8F8268`, `--game-last-move` `#17182B`/`#F1F0F7`, `--game-highlight` = `--game-last-move` (ô đích: viền đứt dày + bóng nét đứt quân); biến riêng `--ludo-frame` `#5A2A10`/`#FBF4E4` (viền ngoài bàn). Màu chuồng/quân lấy `--piece-*`, `--piece-*-line`, `--piece-*-ink`, `--piece-*-hover`, `--piece-edge` (token chung, `add-design-foundation` §2).
- Chuồng: khối màu quân bo góc phủ góc 6×6 của bàn **trừ ô đường ở góc trong** (đường đi của bàn này rẽ qua ô đó, nên khối có một khấc bo tròn; `stableOutline` trong `board-layout.ts`, test: không phủ ô đường nào, chứa bốn chỗ ngựa), ô giấy 4×4 bên trong chứa bốn ngựa (chỗ trống là vòng đứt `--game-line`) và ký hiệu màu ở giữa; chuồng đích tô `piece/20` (trang trí) với số bậc đậm màu mực; ô chân chuồng viền đứt `--piece-*-line` (Vàng: `#9A6A00`, 4,65:1 trên ô đường); tâm bàn bốn tam giác màu đặc như mockup. Viền ngoài bàn 2 px `--ludo-frame`, bo `rounded-card`.
- Quân: tròn màu quân, viền `--piece-edge` (0,05 ô ≈ 2 px), ký hiệu ●■▲◆ màu `--piece-*-ink`, bóng đổ nhẹ `--game-line/40` (trang trí; không dùng `fg` vì ở bản tối sẽ thành quầng sáng). Ngựa vừa đi: vòng chấm `--game-last-move`. Ô đích của lựa chọn đang trỏ/đưa tiêu điểm: khung đứt dày `--game-highlight`; bóng quân ở đó: vòng đứt `--piece-*-line` trên nền ô đường, ký hiệu màu quân (`data-ghost`).
- **Chuồng đang đến lượt**: khối chuồng của `state.toMove` có viền mực `fg` 0,16 ô (~6 px) sát mép trong khối + vòng đứt nét `--piece-*-line` bên ngoài khối, `data-active` trên nhóm SVG của chuồng (`data-stable` = tên màu, để test); ván kết thúc (`winner !== null`) thì không chuồng nào có. Chuyển độ mờ 200 ms, `motion-reduce:transition-none`. Mép ngoài viền mực giáp giấy điệp (15,94 / 15,27); trên khối Vàng ở bản tối viền sáng chỉ 1,72 với màu khối, nên dấu không chỉ màu dựa vào chính mép giáp giấy và vòng đứt (8,88).
- **Xúc xắc theo người đang đến lượt** (trừ lúc đang lăn, xem dưới; delta "Bàn Cờ cá ngựa" ghi ngoại lệ này và scenario "Xúc xắc đang lăn khi mất lượt"): `colour = colourNameOf(state, state.toMove)` thay cho `state.last.player`; khung 4 px màu `--piece-*-line` (Vàng đạt 4,32:1 trên giấy điệp), 56 px, mặt `--game-board`, bo `rounded-control`. Mặt xúc xắc: `state.die !== null` (đã gieo, đang chọn ngựa) → số đó; đang chờ gieo → mặt chờ (khung đứt, chấm mờ — `WaitingFace`) trong khung màu người sắp gieo; đang lăn (`animation.rollingFace`, 450 ms) → số đang lăn **trong khung màu người vừa gieo**, nhãn đọc số thật vừa gieo (lần gieo mất lượt chuyển `toMove` ngay; khung đổi màu khi lăn xong); ván kết thúc → số cuối cùng, khung màu người gieo. Nhãn đọc được: `Games.ludo.die` khi có số (giữ), `Games.ludo.dieReady` "Xúc xắc: {player} sắp gieo" khi chờ gieo; `dieEmpty` bỏ (ảnh `13-ludo-first-roll` sửa theo). E2E đọc số vừa gieo từ dòng gợi ý `data-ludo-hint` ("… gieo được N"), không từ xúc xắc.
- **Nút "Gieo xúc xắc" luôn được vẽ** (giữ đích tiêu điểm sau khi đi hay mất lượt — spec "Cờ cá ngựa bằng bàn phím…"), cỡ `lg` (64 px):
  - **gieo được**: nền `--piece-*` của người đang đến lượt, chữ `--piece-*-ink` (≥ 4,5:1 cả bốn màu, sáng và tối), gờ dưới là token của game `--ludo-roll-shadow` (`0 3px 0` màu khung `#5A2A10` / gần đen `#0C0A06`, trang trí, class `shadow-(--ludo-roll-shadow)`); trỏ = nền `--piece-*-hover` (chữ vẫn ≥ 4,5:1, bảng `add-design-foundation` §2); bấm = màu hover, lún 2 px, bỏ gờ. Nền/chữ/hover của từng màu viết đủ trong `ROLL_BUTTON` (`piece-style.ts`);
  - **khoá** (`aria-disabled`: đang chọn ngựa, không phải lượt của thiết bị này, đang chờ server): kiểu khoá chung của `Button` (`!important`) **thắng màu quân** — nền `surface-muted`, viền đứt 1,5 px `border-control` (đúng `Button` chung), chữ `fg-muted` (5,28 / 6,55), không gờ, không lún; màu người đang đến lượt vẫn thấy ở khung xúc xắc. Lý do khoá hiện bằng chữ: `add-game-feedback`.
- **Lần gieo trước**: chip `Badge` neutral "Lượt trước: {player} gieo được {face}" (`Games.ludo.lastRoll`, `data-ludo-last-roll`) kèm ký hiệu màu người gieo, hiện khi xúc xắc chờ gieo (`state.die === null`, có `state.last`), không còn lăn, và ván chưa kết thúc — tức lần gieo của lượt đã qua, hoặc của cùng người trước khi gieo thêm; khi đang chọn ngựa số nằm trên xúc xắc, không có chip. Không `aria-live` (dòng `role="status"` đã đọc nước đi). `fg-muted`/`surface-muted` 5,28 / 6,55.
- Phần điều khiển (hàng xúc xắc 56 px + nút gieo, gợi ý `data-ludo-hint`, chip lần gieo trước, nhóm "Chọn ngựa") là `controls` của §1; danh sách vị trí cho trình đọc màn hình nằm trong phần bàn (`data-ply` trên phần bàn). Lựa chọn ngựa: nút `secondary` viền `--piece-*-line` của người đang chọn, ký hiệu (`aria-hidden`) + chữ `text-small`, `min-h-11`, chữ xuống dòng; lưới 2 cột từ 1024 px, 1 cột dưới đó — hết tràn ngang ở 360 px.
- Điện thoại 390 px: bàn rộng hết khung (~366 px, ô ~21 px — chỉ để xem; mọi lựa chọn đi qua nút), dưới bàn là hàng xúc xắc + nút gieo + gợi ý, rồi các nút chọn ngựa.
- Tỉ số: bảng `add-design-foundation` §2 (quân/ô đường, `piece-*-line`/giấy điệp, ký hiệu/quân, hover, nút khoá, viền quân, vòng focus trên từng màu chuồng); thêm `--game-line`/ô đường 3,93 / 4,07, ngựa vừa đi và ô đích (`--game-highlight`)/ô đường 17,18 / 13,58, `fg-muted`/giấy điệp 5,65 / 7,56, `fg`/giấy điệp 15,94 / 15,27, `--ludo-frame`/giấy điệp 10,81 / 15,77, mặt chờ/mặt xúc xắc 6,09 / 6,73; khung xúc xắc `piece-*-line`/giấy điệp: Đỏ 4,74 / 4,64, Chàm 7,77 / 5,70, Vàng 4,32 / 8,88, Lục 4,82 / 6,72.
- Phương án đã cân nhắc cho khung xúc xắc: giữ màu người vừa gieo và thêm mũi tên "đến lượt" — hai tín hiệu màu ngược nhau trên cùng một chỗ; skill `board-games-ui` chốt "khung xúc xắc theo màu người **sắp** gieo". Cho nút gieo: ẩn khi không gieo được — mất đích tiêu điểm (spec bàn phím) và làm bố cục nhảy.

### 5. Hiệu ứng

- Không thêm hiệu ứng mới ở change này; giữ `animate-dice-roll`, đi từng ô, `piece-kicked` và nhịp máy (`ai-timing.ts`). Viền chuồng đang đến lượt chuyển 200 ms, có nhánh giảm chuyển động.

## Risks / Trade-offs

- [Đổi chữ ký `BoardProps` (`layout`)] → mọi `Board` và test của chúng sửa cùng lúc; `defaultBoardLayout` cho test đơn lẻ; test bàn phím Cờ cá ngựa chạy cả với `defaultBoardLayout` (`Board.test.tsx`) lẫn `layout` của `PlayScreen` (`ludo-play.test.tsx`; jsdom không dàn trang, nhưng thứ tự DOM — thứ quyết định Tab — như nhau ở mọi khung); E2E bàn phím chạy ở khung 1280 × 800 (dự án Playwright "desktop" nay đặt 1280 × 800 thay cho 1280 × 720 mặc định của "Desktop Chrome").
- [Xúc xắc chờ gieo không còn hiện số vừa gieo của người trước] → chip "Lượt trước" và dòng `role="status"` vẫn nói số đó; scenario MODIFIED "Đánh dấu nước vừa đi" ghi rõ.
- [Đường kẻ vở đậm hơn mockup] → so ảnh `ui:shots` với khung 4 của mockup; nếu quá nặng, giảm độ dày (0,75 px) chứ không giảm màu dưới 3:1.
- [`100dvh` trên trình duyệt di động có thanh địa chỉ co giãn] → chỉ dùng cho máy tính (≥ 1024 px); điện thoại theo chiều rộng.
- [Ngân sách 622/688 px mỏng khi lời báo dài hơn 3 dòng] → E2E kiểm khung nhìn; nếu vượt, `text-status` có biến thể nhỏ hơn cho câu dài (`line-clamp` không dùng: lời báo phải đọc đủ).

## Kiểm tra

- `pnpm ui:shots`: mọi màn hình chơi (Tic-tac-toe đang chơi, Cờ caro 15×15 và 19×19 đang chơi/vừa thắng, ô vừa đi có tiêu điểm, quân xem trước ở 360 px, Cờ cá ngựa 4 người chờ gieo/đang chọn ngựa/sau khi gieo 6/không phải lượt mình — nút gieo khoá) × sáng/tối × 390/1280; so với mockup khung 3–7; thêm ảnh ở 360 px cho Cờ cá ngựa chọn ngựa và đầu trang Cờ caro.
- E2E kiểm không cuộn ở 1280 × 800 (bàn, dòng lượt, nút, hai lựa chọn ngựa trong khung nhìn) và không cuộn ngang ở 360 px.
- Rà `web-design-guidelines`; `pnpm check`, `pnpm knip`, `pnpm test:e2e`, `pnpm spec:check`.

### Kết quả kiểm tra (03/11/2026)

- `pnpm check` xanh (web 1025 test, 19 bỏ qua; sau review), `pnpm knip` sạch, `pnpm spec:check` xanh, `pnpm test:e2e` 154 qua / 4 bỏ qua (bỏ qua: các kiểm tra khung 1280 × 800 ở dự án "mobile"), `pnpm exec openspec validate redesign-game-boards --strict` hợp lệ.
- `pnpm ui:shots` (70 ảnh, 2 bỏ qua: quân xem trước chỉ chụp trên dự án điện thoại có cảm ứng); đã xem từng ảnh bàn chơi sáng/tối × 390/1280 (`05`, `06`, `07`–`07d`, `08`–`08c`, `09`–`09c`, `13`) so với mockup khung 3–7. Sửa sau khi xem: O Cờ caro từ vòng hở (trông như chữ "C") sang vòng khép có đuôi; chấm sao từ tâm ô sang giao điểm; lề đỏ 1 → 2 px; ô đang chọn bằng chạm có nền `--game-highlight` vì quân nét đứt ở ô 17 px khó thấy; khối chuồng Cờ cá ngựa có khấc ở ô đường góc trong (khối 6×6 đầu tiên đè lên ô đường); chỗ trống trong chuồng nhỏ lại để không thành vòng quanh ngựa; bóng ngựa `game-line/40` (bóng `fg` thành quầng sáng ở bản tối); gợi ý Cờ caro không giữ chỗ ở cột bên máy tính.
- Còn lệch mockup (ngoài các chỗ đã ghi ở "Đã chốt"): tên game ở thanh trên to hơn mockup (`text-title` theo design §1); khối chuồng có khấc vì đường đi của bàn này rẽ qua ô góc trong (mockup vẽ chữ thập ba ô thẳng); lề đỏ ở dải giấy 5% (mockup ~1 ô).
- Rà `web-design-guidelines` trên các file đã đổi: icon trang trí `aria-hidden`, nút/link có tên, `focus-ring` chung, chuyển động chỉ `opacity` có `motion-reduce`, `touch-manipulation` trên bàn Tic-tac-toe (thêm), Cờ caro, Cờ cá ngựa, `text-balance` cho tên game và dòng lượt, không `transition: all`. Không còn mục cần sửa.
- Sau review code (03/11/2026): JSDoc `BoardLayout` + `every-game.test.tsx`; phần quanh bàn dựng một lần mỗi lần `PlayScreen` render; chip "Lượt trước" ẩn khi xúc xắc còn lăn, ngoại lệ màu khung lúc lăn ghi vào delta (scenario "Xúc xắc đang lăn khi mất lượt") và test; ván kết thúc đọc số cuối kèm người gieo (test); gờ nút gieo và bóng ô Tic-tac-toe thành token của game (`--ludo-roll-shadow`, `--tictactoe-tile-shadow`); nền ô chọn bằng chạm thụt 3 px; khoanh hàng thắng không bị cắt ở mép (`overflow-visible`, ảnh `08d-caro-won-corner`, `08e-caro-won-top-row`); chấm sao đối xứng; ảnh `13b-ludo-rolling` (khung Đỏ khi đang lăn, chưa có chip) và `13c-ludo-after-roll` (khung Xanh dương, chip "Lượt trước: Đỏ gieo được N").
