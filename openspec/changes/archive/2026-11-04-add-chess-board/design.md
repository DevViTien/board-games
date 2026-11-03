# Design

## Context

- Luật đã có ở `add-chess-rules` (phải archive trước): `@board-games/games/chess` export `chess`, `ChessState` (`fen`, `positions`, `san`, `drawClaim`), `ChessMove` (`ChessPieceMove { from, to, promotion? }` | `ChessDrawClaim { type: "claim-draw" }`), `chessBoard`, `chessKingInCheck`, `isChessDrawClaim`, `CHESS_*`; chưa có trong `GAMES`/`GAME_IDS`. `chess.js` chỉ được import trong adapter của gói `games`.
- Khung màn hình chơi (`features/play/PlayScreen.tsx`, change `redesign-game-boards` §1): bàn trả `layout({ board, controls })`; từ 1024 px bàn bên trái, cột phải 20–24 rem gồm thông báo, dòng lượt (`role="status"` duy nhất), bảng người chơi (`PlayerPanel`), `controls`, nút của ván; dưới 1024 px một cột theo cùng thứ tự DOM. Phòng cho bàn: `--board-room` = `min(100vw − 34rem, 100dvh − 10rem)` (640 px ở 1280 × 800); khung trang `px-4` (16 px mỗi bên) dưới 1024 px.
- `BoardProps`: `state`, `legalMoves`, `onMove`, `disabled`, `result`, `lastEntry`, `viewer` (ghế của người ở thiết bị này khi chỉ một người, `null` ở thiết bị dùng chung), `layout`, `lockedReason`. `GameUI`: `usePlayerLabel`, `useMoveLabel(move, stateSau)`, `useSeatSummary?`, `useResultDetail?`, `SeatMark?`.
- Dòng lượt chỉ nói nước vừa đi khi nước đó **không** đi từ thiết bị này; ở thiết bị dùng chung chỉ nói "Đến lượt {player}".
- Transport online dựng lại state bằng `fromRecord` **mỗi lần phòng đổi**, kể cả khi chỉ tên hay kết nối đổi: object `state`/`legalMoves` mới dù thế cờ như cũ. Bàn Cờ caro đã xử lý bằng cách so nội dung (`{ filled, toMove, lastCell }`) thay vì so object.
- `ConfirmDialog` (`packages/ui`) đã có cách đóng an toàn: cha giữ `open`, `cancel` → huỷ, và `onClose` bắt trường hợp Chromium (close watcher) tự đóng mà không bắn `cancel`.
- Đăng ký: `GAMES` + `GAME_IDS`, `GAME_ENTRY_LOADERS`, `GAME_ARTWORK`; `PLANNED_GAMES` đang có Cờ vua "Sắp có". `MenuPage` gọi `buildMenu()` mặc định; `MenuPage.test.tsx` dựa vào Cờ vua "Sắp có" thật (~dòng 72–83, 140–147, 220–226). `define-game-entry.test.ts` dùng `"chess"` làm mã chưa đăng ký.
- Ranh giới bundle (ESLint): `features/**`, `transport/**`, `lib/**` không import gốc `@board-games/games` (trừ kiểu); `games/**` import luật từ subpath của game; artwork (`WEB_GAME_ARTWORK_FILES`) không import `./<module>` nào của game (regex `^\./(?!types$)[\w-]+$`). `ai-worker/compute-ai-move.ts` dùng `findGame` từ gốc → Worker kéo luật của mọi game.
- Giao thức: `move: z.unknown()` kiểm bằng luật; ghế xoay vòng khi chơi lại.
- **Hướng hình ảnh đổi** so với M6.5 (khung 1 "gỗ sồi và óc chó"): người dùng chọn bàn kiểu chess.com (ảnh chụp gửi ngày 04/11/2026) — xem "Đã chốt".
- Yêu cầu hành vi: delta `specs/chess` (thêm vào capability của `add-chess-rules`), `specs/game-menu`, `specs/local-play` (MODIFIED).

## Goals / Non-Goals

**Goals:**

- Chơi trọn ván Cờ vua cùng máy và online, bằng chuột, chạm và bàn phím, có trình đọc màn hình; vừa 360 px (ô ≥ 40 px) và 1280 × 800 không cuộn.
- Bàn xanh–kem dễ đọc, bộ quân "staunty" của Lichess (§4), đạt AA ở sáng và tối.
- `chess.js` chỉ ở chunk màn hình chơi Cờ vua và server.

**Non-Goals:**

- AI, đồng hồ, đề nghị hoà, đầu hàng, PGN, premove, kéo thả quân, Chess960, luật chơi `rules.{vi,en,ja}.mdx` (M8); sao chép bất kỳ tài sản nào của chess.com.

## Đã chốt với người dùng (04/11/2026)

- **Bàn kiểu chess.com**: ô xanh lá / kem (giá trị riêng của dự án trong họ màu đó, đã kiểm AA), toạ độ nhỏ **trong** các ô sát mép (số hàng ở góc trên trái các ô cột trái, chữ cột ở góc dưới phải các ô hàng dưới, màu tương phản với ô), **thanh người chơi trên và dưới bàn** (hình đại diện tạm, tên, loại ghế; chừa chỗ cho đồng hồ sau này — đồng hồ vẫn ngoài phạm vi v1), bàn là phần chính, quân phẳng dễ đọc. **Không** chép hình quân hay tài sản của chess.com (độc quyền): bản đầu tự vẽ bộ quân phẳng riêng (sau đó thay bằng bộ "staunty" của Lichess, mục "Bộ quân đổi" dưới). Giữ khung chung M6.5 (thanh trên, cột bên cho sổ ghi và điều khiển trên máy tính). Bỏ hướng "gỗ" ở mọi nơi; bản tối: xanh–kem đậm hơn, đạt AA.
- **Hoà theo FIDE** (`add-chess-rules`): lặp lại ba lần và 50 nước chỉ cho bên đến lượt **đòi hoà** bằng hành động "Đòi hoà", chỉ hiện khi điều kiện đúng ở thế hiện tại; lặp lại năm lần, 75 nước, hết nước đi, không đủ quân kết thúc tự động.
- **Không còn game "Sắp có" sau M7**: menu có bốn game chơi được; không thêm game dự kiến mới.
- `meta.supportsAI = false` → màn hình bắt đầu ván chỉ có "Cùng máy" và "Online".
- Bàn quay về phía người chơi khi online (`viewer`), Trắng ở dưới trên thiết bị dùng chung; không tự lật; có nút "Lật bàn" (§5).
- Phong cấp: người chơi chọn Hậu/Xe/Tượng/Mã trong bộ chọn dùng được bằng bàn phím và trình đọc màn hình.
- Ngoài phạm vi M7: AI/engine (Stockfish GPL — sau), đồng hồ (v1), đề nghị hoà và đầu hàng (v1/M8), nhập/xuất PGN, premove, Chess960.
- Mockup `mockup/index.html` (máy tính 1280 × 800 sáng + tối, điện thoại 390 sáng + tối, bộ quân): người dùng **đã duyệt** ("Chốt, sử dụng mock bạn tạo"). Bộ quân vẽ trong mockup sau đó được thay (mục dưới); phần còn lại của mockup giữ nguyên làm chuẩn.
- **Bộ quân đổi (04/11/2026)**: thay bộ quân phẳng tự vẽ bằng bộ **"staunty"** của sadsnake1 trên Lichess, giấy phép **CC BY-NC-SA 4.0** (dự án phi thương mại). Không dùng tài sản của chess.com (độc quyền; người dùng đã hỏi và được trả lời không). File giữ nguyên từng byte, có ghi công (§4).

## Decisions

### 1. Đăng ký game và ranh giới bundle

- `packages/games`: `chess` vào `GAMES`, `"chess"` vào `GAME_IDS`, `export * from "./chess"`; test registry thêm Cờ vua.
- **`@board-games/games/ai`** (mới, `src/ai.ts`): `AI_GAMES = [tictactoe, caro, ludo] as const` và `findAiGame(id)`; `index.test.ts` kiểm `AI_GAMES.map(id)` bằng `GAMES.filter((g) => g.meta.supportsAI).map(id)` theo cùng thứ tự (quên thêm một game có máy là test đỏ). `compute-ai-move.ts` dùng `findAiGame` → Worker không chứa luật Cờ vua hay `chess.js`. Game không có máy không cần làm gì; game có máy sau này thêm một dòng ở đây (câu bất biến trong `openspec/config.yaml` và checklist plan.md §4 sửa theo, task 7.2). Phương án đã cân nhắc: để Worker kéo `chess.js` (~24 KB gzip thừa cho mọi ván đấu với máy); lọc `supportsAI` lúc chạy (không bỏ được mã khỏi bundle).
- App: `games/chess/index.ts` (`chessEntry`), một dòng `GAME_ENTRY_LOADERS`, một dòng `GAME_ARTWORK`; `PLANNED_GAMES = [] as const` (kiểu `MenuGameId` còn `RegisteredGameId`; nhánh "Sắp có" giữ nguyên). `define-game-entry.test.ts` dùng mã chưa đăng ký `"go"`.
- **Test menu vẫn phủ "Sắp có"**: `MenuPage` nhận prop tuỳ chọn `cards?: readonly MenuGame[]` (mặc định `buildMenu()`; trang server không đổi). Các test "Sắp có" truyền `buildMenu({ registered: GAMES.filter((g) => g.id !== "chess"), planned: [{ id: "chess", players: { min: 2, max: 2 }, durationMinutes: 20 }] })`. Sửa: `MenuPage.test.tsx` test thứ tự thẻ (~dòng 72–83: nay bốn thẻ chơi được, 0 "Sắp có"), test "gives a coming-soon game no link" (~140–147: dùng `cards` giả; với menu thật là 8 liên kết), test tiếng Anh/Nhật đếm "Coming soon" (~220–226 và bản `ja`: 0); `menu-games.test.ts` đã truyền nguồn riêng nên giữ. E2E `menu.spec.ts` không đổi kỳ vọng.
- **Nơi `chess.js` có mặt**: chunk màn hình chơi Cờ vua; server (room-service, realtime qua `GAMES`); trang server `/play/[gameId]/**` (chỉ đọc `meta`). Menu, bắt đầu ván, trang phòng, AI Worker không đổi bundle. Đo bằng `next build` trước/sau (task 1.5), ghi vào "Kết quả kiểm tra".
- **Giấy phép**: `apps/web/public/third-party-licenses.txt` chứa nguyên văn BSD-2-Clause của `chess.js` (thông báo bản quyền đi kèm bản phân phối nhị phân); README có một dòng trỏ tới file này. Liên kết trong app để M8 (trang luật/giới thiệu).

### 2. Hướng hình ảnh

**Bàn cờ online quen thuộc, phẳng và dễ đọc**: bàn là phần lớn nhất của màn hình; ô xanh lá trầm và kem nhạt, không vân, không bóng; quân "staunty" (Lichess) rõ hình, Trắng thân sáng viền xám đậm, Đen thân xám đậm viền gần đen; hai thanh người chơi mỏng sát trên và dưới bàn như hai bên mép bàn thật (bên mình ở dưới). Khung chung giữ nguyên (thanh trên, dòng lượt, nút, thẻ kết quả); cột bên trên máy tính chứa lời báo, sổ ghi, "Đòi hoà", "Lật bàn". Nền trang ngả xanh–xám rất nhẹ để bàn nổi lên. Lấy **hướng** từ chess.com theo yêu cầu người dùng; không lấy hình, mã màu chính xác hay bố cục chi tiết của họ.

Mockup `mockup/index.html` (HTML/CSS/SVG tĩnh, thế cờ thật kiểm bằng `chess.js`): khung 1 máy tính sáng (cùng máy, thế lặp lại lần thứ ba, nút "Đòi hoà" hiện), khung 2 máy tính tối (online, cầm Đen, bàn lật, bộ chọn phong cấp mở) và 2b (cùng thế, trước khi mở bộ chọn), khung 3–4 điện thoại 390 px sáng (kết thúc chiếu hết) và tối (Trắng bị chiếu, Mã b1 đang chọn, tiêu điểm bàn phím ở c3), khung 5 ô ăn được (cả bắt tốt qua đường) và bộ quân trên hai màu ô ở sáng và tối.

### 3. Token (`apps/web/src/games/chess/theme.css`)

Giá trị trong `[data-game="chess"]`, bản tối giống hệt ở `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` và `:root[data-theme="dark"]`.

| Token                   | Dùng cho                                                            | Sáng      | Tối       |
| ----------------------- | ------------------------------------------------------------------- | --------- | --------- |
| `--game-page`           | nền trang quanh bàn                                                 | `#F2F1EA` | `#141711` |
| `--game-tint`           | nền hình minh hoạ (menu, bắt đầu ván)                               | `#E3E6CC` | `#232A1C` |
| `--game-board`          | ô sáng (kem)                                                        | `#EBECD0` | `#C4C8A4` |
| `--chess-square-dark`   | ô tối (xanh lá)                                                     | `#577A3A` | `#53743B` |
| `--game-line`           | vòng 2 px quanh bàn (ngoài lưới), viền nút trong bộ chọn            | `#3F5A2C` | `#2A3A1E` |
| `--game-mark-1`         | viền quân Trắng (màu của file staunty, như nhau ở hai theme)        | `#3C3C3C` | `#3C3C3C` |
| `--game-mark-2`         | viền quân Đen (staunty)                                             | `#1E1E1E` | `#1E1E1E` |
| `--chess-piece-light`   | thân quân Trắng (staunty)                                           | `#F0F0F0` | `#F0F0F0` |
| `--chess-piece-dark`    | thân quân Đen (staunty)                                             | `#5F5955` | `#5F5955` |
| `--game-highlight`      | lõi mực của dấu: khung chọn, chấm tới được, góc ăn quân, vòng chiếu | `#1B1E14` | `#10130B` |
| `--chess-paper`         | quầng sáng của dấu                                                  | `#FFFFFF` | `#F6F6EC` |
| `--game-last-move`      | khung đứt nét của nước vừa đi                                       | `#1B1E14` | `#10130B` |
| `--chess-mark-light`    | sắc vàng của ô sáng đang chọn / nước vừa đi                         | `#F3F08A` | `#D2CF6A` |
| `--chess-mark-dark`     | sắc vàng–lục của ô tối đang chọn / nước vừa đi                      | `#AFB83A` | `#8C9530` |
| `--chess-coord`         | toạ độ trên ô sáng và ô đã tô vàng                                  | `#2D4420` | `#141F0D` |
| `--chess-coord-on-dark` | toạ độ trên ô tối                                                   | `#F7F7EA` | `#F0F1E2` |
| `--chess-check`         | vầng đỏ sau vua bị chiếu (trang trí)                                | `#E5534B` | `#E5534B` |
| `--chess-sheet`         | nền sổ ghi                                                          | `#FFFFFF` | `#1C2017` |
| `--chess-sheet-line`    | dòng kẻ sổ ghi (trang trí)                                          | `#E2E4D4` | `#313826` |
| `--chess-sheet-current` | nền nước mới nhất trong sổ ghi                                      | `#E7EBD2` | `#2C3423` |

- **Toạ độ "màu ô đối diện"** như chess.com nhưng đậm/nhạt thêm cho đủ 4,5:1: trên ô kem là xanh lục đậm cùng họ ô tối, trên ô xanh là kem. Ô xanh `#577A3A` đậm hơn mẫu `#739552` để chữ kem đạt 4,58:1 (mẫu: ~3:1).
- **Nguyên tắc hai lớp**: mọi thứ đặt lên ô có hai lớp và luôn có ít nhất một lớp ≥ 3:1 với ô bên dưới: quân Trắng = thân `#F0F0F0` + viền `#3C3C3C`; quân Đen = thân `#5F5955` + viền `#1E1E1E` (màu của file staunty, chép vào token để test đo; `theme-css.test.ts` kiểm token khớp `fill`/`stroke` của 12 file); dấu = lõi mực + quầng sáng.
- **Ô xanh bản tối `#4C6A35` → `#53743B`** khi đổi bộ quân: viền quân Đen `#1E1E1E` trên `#4C6A35` chỉ 2,72:1; `#53743B` cho 3,12:1 mà toạ độ kem vẫn 4,68:1. Không cần bóng hay quầng cho quân (không sửa SVG, không `filter`).

Tỉ số (sáng / tối; "lớp tốt nhất" = lớp cao hơn trong hai lớp):

| Cặp                                                       | Sáng         | Tối          | Ngưỡng |
| --------------------------------------------------------- | ------------ | ------------ | ------ |
| `fg` / `fg-muted` trên `--game-page`                      | 15,43 / 5,47 | 15,98 / 7,92 | 4,5    |
| `fg-muted` / `--game-tint`                                | 4,85         | 6,47         | 4,5    |
| Quân Trắng trên ô kem / ô xanh (lớp tốt nhất)             | 9,16 / 4,34  | 6,38 / 4,69  | 3      |
| Quân Đen trên ô kem / ô xanh                              | 13,85 / 3,37 | 9,64 / 3,12  | 3      |
| Quân Trắng trên ô vàng sáng / ô vàng tối                  | 9,27 / 5,12  | 6,76 / 3,39  | 3      |
| Quân Đen trên ô vàng sáng / ô vàng tối                    | 14,01 / 7,73 | 10,22 / 5,13 | 3      |
| Quân Trắng / Đen trên vầng chiếu                          | 3,25 / 4,50  | 3,25 / 4,50  | 3      |
| Dấu trên ô kem / ô xanh                                   | 14,04 / 4,94 | 10,84 / 4,92 | 3      |
| Dấu trên ô vàng sáng / ô vàng tối                         | 14,20 / 7,84 | 11,49 / 5,76 | 3      |
| Toạ độ trên ô kem / ô xanh                                | 8,90 / 4,58  | 9,86 / 4,68  | 4,5    |
| Toạ độ trên ô vàng sáng / ô vàng tối                      | 9,00 / 4,97  | 10,45 / 5,24 | 4,5    |
| Vòng focus chung (vòng tốt nhất) trên ô kem / ô xanh      | 14,51 / 4,94 | 10,64 / 4,72 | 3      |
| Vòng focus trên ô vàng sáng / ô vàng tối                  | 14,68 / 8,10 | 11,27 / 5,65 | 3      |
| Vòng focus trên `--game-tint`                             | 13,69        | 13,07        | 3      |
| `--game-line` / `--game-board`                            | 6,44         | 7,05         | 3      |
| `fg-muted` trên `--chess-sheet` / `--chess-sheet-current` | 6,19 / 5,07  | 7,24 / 5,66  | 4,5    |
| Thân Trắng / thân Đen (phân biệt không cần màu)           | 6,05         | 6,05         | 3      |

Ô kem/ô xanh 4,10 / 3,55. Ô vàng chỉ là sắc: tín hiệu thật là khung (liền = đang chọn, đứt = nước vừa đi). Vầng chiếu, dòng kẻ sổ ghi, vòng `--game-line` trên nền trang tối (1,48): trang trí; mép bàn đọc được nhờ chính các ô.

`games/theme-css.test.ts`: `GAME_PAIRS` thêm dạng cặp **hai lớp** `[[lớp1, lớp2], nền, ngưỡng]` (đạt khi `max` đạt) bên cạnh dạng cũ; `GAME_PAIRS.chess` gồm mọi dòng bảng trên; kiểm vòng focus thêm trên các nền riêng của game (`FOCUS_BACKGROUNDS.chess = ["--chess-square-dark", "--chess-mark-light", "--chess-mark-dark"]`) ngoài `--game-board`, `--game-tint`.

### 4. Bộ quân "staunty" (`games/chess/pieces.tsx`, `apps/web/public/pieces/staunty/`)

- **Nguồn**: bộ "staunty" của sadsnake1, `lichess-org/lila` commit `9af5b51f1c7fa4199c7e03273f4b10b8acdc6b1c`, `public/piece/staunty/{w,b}{K,Q,R,B,N,P}.svg` (`COPYING.md` của lila: CC BY-NC-SA 4.0). Đã đọc trọn 12 file trước khi chép: chỉ `path`/`rect`, không script, không tham chiếu ngoài, không `foreignObject`, không thuộc tính sự kiện. Chép **nguyên từng byte** vào `apps/web/public/pieces/staunty/` (không sửa: bản sửa sẽ phải chia sẻ cùng giấy phép); `LICENSE.txt` cạnh file (tên, tác giả, nguồn + SHA, giấy phép + liên kết, "no changes made") và một mục trong `apps/web/public/third-party-licenses.txt`. Dự án phi thương mại (idea.md) nên điều khoản NC thoả.
- **Hiển thị**: `ChessPiece` là `<img src="/pieces/staunty/wN.svg" alt="" aria-hidden draggable={false}>` (file tĩnh, không qua `next/image`); tên ở ô / nút. Không nhúng inline (giữ file nguyên vẹn, trình duyệt cache một lần). Mười hai file 1,3–2,6 KB.
- **Sổ ghi** (§8): hình quân là bóng (`mask-image` của file quân Trắng + `bg-current`), một màu theo chữ; không sửa file. Bóng này là bản phái sinh nên cũng theo CC BY-NC-SA 4.0 — ghi rõ trong `LICENSE.txt` và `third-party-licenses.txt`; menu có liên kết chân trang "Giấy phép bên thứ ba" (`Menu.thirdPartyLicenses`) tới `/third-party-licenses.txt`.
- Quân chiếm 92 % ô (`inset-[4%]`) để toạ độ ở góc ô sát mép không đè đế quân ở 360 px.
- `SeatMark`, bộ chọn phong cấp: cùng `<img>` theo màu bên.
- **Artwork** (`games/chess/Artwork.tsx`): ESLint cấm artwork import module khác của game (để menu không kéo bàn), nên hình minh hoạ dùng `<image href="/pieces/staunty/wK.svg">` và `bN.svg` theo địa chỉ, không import.
- Phương án đã cân nhắc: bộ tự vẽ (bản đầu, đã duyệt trong mockup; người dùng đổi sang staunty); nhúng SVG inline để tô theo token (phải sửa file → ShareAlike, mất byte-identical); chess.com (độc quyền, loại).

### 5. Bàn, hướng nhìn, thanh người chơi, lật bàn

- **Cấu trúc** (`Board.tsx`): lưới `role="grid"` 8 hàng `role="row"` × 8 ô `role="gridcell"`, theo thứ tự **hiển thị** (hàng trên cùng trước) nên đọc và phím mũi tên khớp màn hình; trong mỗi ô một `<button>`: nền ô (class token), dấu (SVG nhỏ), quân (`<use>`), toạ độ là **chữ HTML** (`<span aria-hidden>`, cỡ `max(10px, 0.16 × cạnh ô)`: 10 px ở ô 41 px, ~12 px ở ô 73 px), không phải chữ SVG co theo `viewBox`. Bàn vuông; vòng `--game-line` 2 px vẽ bằng `box-shadow` **ngoài** lưới, không chiếm chỗ.
- **Cỡ**: dưới 1024 px bàn = 100 % chiều rộng nội dung: 360 px → 328 px → ô **41 px** (≥ 40 với 1 px dư); 390 px → 358 px → ô 44,75 px. Từ 1024 px bàn là `min(var(--board-room), 37rem)`; khi bàn đưa `seatOrder`, `PlayScreen` tự trừ hai thanh khỏi phòng: `--board-room = min(100vw − 34rem, 100dvh − 13.5rem)` (thay vì `− 10rem`), 1280 × 800 → 584 px, ô 73 px; khối thanh–bàn–thanh rộng đúng bằng bàn (`lg:w-min`). E2E đo `gridcell` (`boundingBox().width ≥ 40`).
- **Hướng**: `bottom = flipped ? khác(base) : base`, `base = viewer === 1 ? Đen : Trắng` (`viewer === null` → Trắng). Toạ độ theo hướng: số hàng ở ô cột trái (trên trái), chữ cột ở ô hàng dưới (dưới phải).
- **Tên ô** (`aria-label`): "Mã trắng ở g1", "Ô e4 trống". Mô tả (`aria-describedby`): "Đi tới được", "Ăn được quân", "Nước vừa đi" (`Play.lastMove`), "Đang bị chiếu". Ô đang chọn: `aria-selected="true"` trên `gridcell` (ô khác `false` khi có lựa chọn).
- **Thanh người chơi** (`local-play` MODIFIED): `BoardParts` thêm `seatOrder?: readonly [top: PlayerIndex, bottom: PlayerIndex]`. Bàn Cờ vua trả `seatOrder = [ghế ở trên, ghế ở dưới]` theo hướng hiện tại (đổi khi lật). `PlayScreen` khi có `seatOrder`: vẽ hai `SeatBar` ngay trên và ngay dưới `board` trong cùng ô lưới, không vẽ `PlayerPanel` ở cột bên. `SeatBar` là một hàng tách từ `PlayerPanel` (cùng nội dung: `SeatMark`, tên theo chế độ, dòng phụ loại ghế + tóm tắt, chip "Đến lượt"/"Thắng"/kết nối), cao 44 px, nền `surface`; phần cuối bên phải là chỗ của chip và sau này đồng hồ (không vẽ ô trống). Không phải vùng thông báo. Game không đưa `seatOrder` không đổi gì (test cũ của `PlayScreen`, `PlayerPanel` xanh không sửa).
- **Lật bàn**: nút `Button` `secondary` "Lật bàn", `aria-pressed`, trong `controls`, mọi chế độ. State cục bộ của bàn, đặt lại khi `base` đổi (chơi lại đổi màu) — điều chỉnh trong render như các bàn khác; mở lại trang cũng về mặc định. Không tự lật (toạ độ, vị trí tay và tiêu điểm nhảy liên tục). Không icon (bộ icon chung không có).

### 6. Chọn và đi quân, giữ lựa chọn, phong cấp

- **`use-selection.ts`** (hook thuần React, test riêng): giữ `{ key, from } | null` với `key = \`${state.fen}|${state.san.length}\``— so **nội dung**, không so object, nên phòng online cập nhật cùng thế (đổi tên, nối lại) không làm mất lựa chọn;`key`đổi,`disabled`thành`true`, hay `from`không còn nước hợp lệ → bỏ chọn (điều chỉnh trong render). Nước theo ô đến tính từ`legalMoves`lọc nước đi quân, nhóm`Map<from, ChessPieceMove[]>`.
- **Chuột / chạm** (chạm một lần; ô ≥ 40 px): chọn quân của bên đến lượt có nước → đang chọn; chọn ô tới được → một nước thì `onMove`, nước phong cấp (bốn nước cùng `from`/`to`) thì mở bộ chọn — **không bao giờ** gửi nước phong cấp đầu tiên; chọn quân khác cùng bên → đổi; chọn ô khác / Escape → bỏ chọn.
- **Ô ăn được**: ô đến có quân đối phương, **hoặc** Tốt đi chéo tới ô trống (bắt tốt qua đường) → dấu góc + "Ăn được quân".
- **Lời báo lựa chọn**: một `<p aria-live="polite">` riêng trong `controls` (chỉ phần tử này; sổ ghi, nút không nằm trong vùng live): "Đã chọn Mã g1: đi được f3, h3" (ô ăn được thêm "ăn d5"), "Xe a1 không có nước đi", rỗng khi bỏ chọn. Hiện cả bằng chữ `text-small` `fg-muted` dưới bàn.
- **`use-roving-focus.ts`**: một điểm dừng Tab; vào bàn: ô có tiêu điểm gần nhất → ô `to` của `lastEntry` (nếu là nước đi quân) → ô Vua của bên ở dưới. Mũi tên theo màn hình, dừng ở mép; Home/End; Enter/Space = bấm; Escape = bỏ chọn (không rời bàn). Bỏ qua `keydown` có `event.repeat` (giữ phím không mở rồi chọn luôn trong bộ chọn). Tiêu điểm ở lại ô đến sau khi đi.
- **Ô có tiêu điểm khác ô đang chọn**: đang chọn = ô tô `--chess-mark-*` + khung **liền trong ô** (lõi mực 3 px + quầng sáng); tiêu điểm = tiện ích `focus-ring` chung **ngoài ô** (`outline-offset`, `relative z-10`). Nước vừa đi = ô tô vàng + khung **đứt nét** trong ô.
- **Bộ chọn phong cấp** (`PromotionPicker.tsx`): `<dialog>` gốc `showModal()`, theo cách đóng của `ConfirmDialog` (cha giữ `open`; `cancel` và `close` do trình duyệt tự đóng đều là huỷ). Tiêu đề "Tốt g2 → g1"; bốn nút ≥ 64 px theo `CHESS_PROMOTION_PIECES` (Hậu, Xe, Tượng, Mã) có hình quân màu bên đi + tên; nút "Huỷ"; tiêu điểm đầu ở "Hậu". Chọn → `onMove` với đúng nước đó. Huỷ → không đi, **giữ Tốt đang chọn**. Đóng bằng mọi cách → gọi `.focus()` tường minh trên nút của ô đến (Safari không tự trả tiêu điểm). Bộ chọn tự đóng như huỷ khi `disabled` thành `true`, `key` đổi, hay nước của nó không còn trong `legalMoves`. Đặt giữa màn hình (neo vào ô sẽ tràn ở 360 px). Phương án đã cân nhắc: tự phong Hậu (không chọn được quân khác); dải bốn quân đè lên cột (khó làm đúng a11y, tràn ở mép).

### 7. Dấu trên ô, chiếu, đòi hoà

| Trạng thái       | Hình (không chỉ màu)                                                                  | Mô tả           |
| ---------------- | ------------------------------------------------------------------------------------- | --------------- |
| Đang chọn        | ô tô vàng + khung liền trong ô, lõi mực + quầng sáng                                  | `aria-selected` |
| Tới được (trống) | chấm tròn ~26 % ô, lõi mực + viền sáng                                                | "Đi tới được"   |
| Ăn được          | bốn tam giác ở góc ô (quân vẫn rõ), lõi mực + viền sáng; cả ô trống bắt qua đường     | "Ăn được quân"  |
| Nước vừa đi      | ô tô vàng + khung đứt nét trong ô, ở ô đi và ô đến                                    | "Nước vừa đi"   |
| Bị chiếu         | vầng đỏ tròn sau Vua (góc ô giữ màu, toạ độ không đổi) + vòng tròn hai lớp quanh quân | "Đang bị chiếu" |
| Tiêu điểm        | `focus-ring` chung ngoài ô                                                            | —               |

- **Chữ báo chiếu**: trong `controls`, `Badge` `danger` "Chiếu!" + "{player} đang bị chiếu" khi `chessKingInCheck(state) !== null` và ván chưa xong; phần tử luôn có mặt (`min-h-7`), `aria-live="polite"` **chỉ khi `viewer === null`** (dòng lượt ở thiết bị dùng chung không nói nước vừa đi); có `viewer` thì `aria-live="off"` vì nhãn nước của đối thủ đã nói "…, chiếu". Không thêm `role="status"`.
- **Đòi hoà**: khi `legalMoves` có nước đòi hoà và `!disabled`, `controls` có nút `secondary` "Đòi hoà" với dòng lý do (`aria-describedby`): "Thế cờ này đã lặp lại ba lần" / "50 nước liền không đi Tốt, không ăn quân". Bấm → `onMove({ type: "claim-draw" })` (luật nói lý do). Không hỏi xác nhận (một phía theo FIDE; bấm nhầm hiếm và ván cùng máy hoàn tác được). Online: `disabled` đúng khi không phải lượt mình nên nút chỉ ở màn hình bên đến lượt.

### 8. Sổ ghi và ký hiệu (`MoveSheet.tsx`, `san.ts`)

- **Ký hiệu**: đại số dạng hình (FAN) — chữ quân của SAN (`K Q R B N`) thay bằng bóng quân staunty ~1,45 em (`mask-image`), **một màu theo màu chữ cho cả hai bên** như sách cờ in (cột nói bên nào; tô theo màu bên làm quân Đen trên nền tối trông như quân Trắng). Không đổi theo ngôn ngữ. Phương án đã cân nhắc: chữ quân theo ngôn ngữ (hai người online khác ngôn ngữ thấy khác nhau); ký tự Unicode ♘ (Be Vietnam Pro không có, iOS vẽ thành emoji).
- `san.ts` (thuần, test đơn vị): tách SAN `{ castle, piece, disambiguation, capture, to, promotion, check }`; `describeSan` ra lời đọc: "Mã f3", "Tốt e ăn d5, chiếu", "Nhập thành cánh vua", "Tốt e8 phong Hậu, chiếu hết". Lời đọc `sr-only` cạnh phần hiện (`aria-hidden`).
- **Cấu trúc**: tiêu đề "Sổ ghi"; **khung cuộn** `role="region"` `aria-label="Sổ ghi"` `tabIndex={0}` (nhận tiêu điểm để cuộn bằng phím) chứa `<ol>`, mỗi `<li>` một số nước (số `tabular-nums`, nước Trắng, nước Đen); nước mới nhất nền `--chess-sheet-current`, chữ đậm, `aria-current="true"`. Kết thúc: dòng tỉ số `1–0` / `0–1` / `½–½` (lời đọc "Trắng thắng" / "Đen thắng" / "Hoà"). Rỗng: "Chưa có nước nào". Không `aria-live`.
- **Cuộn**: khi số nước tăng, đặt thẳng `scrollTop = scrollHeight` (máy tính) hoặc `scrollLeft = scrollWidth` (điện thoại) của **khung**, không dùng `scrollIntoView` (cuộn cả trang và đổi chỗ tiêu điểm trên một số trình duyệt). Hoàn tác/làm lại cũng cuộn tới nước mới nhất.
- **Máy tính**: lưới 3 cột (số, Trắng, Đen), cao tối đa 14 rem. **Điện thoại**: cùng `<ol>` thành dải ngang một dòng 44 px, cùng hàng với "Lật bàn".
- Nước lấy từ `state.san` nên hoàn tác/làm lại, tải lại trang, nối lại online đều đúng.

### 9. Nhãn, tên ghế, tóm tắt, kết quả, bản dịch

- `usePlayerLabel`: "Trắng" / "Đen".
- `useMoveLabel(move, state)`: nước đi quân → SAN = `state.san.at(-1)`; ghép `Games.chess.move.{quiet|capture|castleKing|castleQueen}` + `promotion` + `check|mate` qua câu ICU `Games.chess.move.full`. vi: "đi Mã g1 tới f3", "đi Hậu h5 ăn quân ở f7, chiếu", "nhập thành cánh vua", "đi Tốt e7 tới e8, phong Hậu"; en: "moved the knight from g1 to f3", "took on f7 with the queen from h5, check"; ja tương ứng. Nước đòi hoà → `Games.chess.move.claim` "đòi hoà" (ván kết thúc nên dòng lượt chuyển sang kết quả; nhãn vẫn có cho đủ). Chiếu hết ("…, chiếu hết") kiểm ở test đơn vị của nhãn — trên màn hình khi đó là thẻ kết quả. Bắt tốt qua đường đọc như ăn thường ("đi Tốt e5 ăn quân ở d6"): SAN giống hệt và thế sau nước không đủ để phân biệt; trên bàn (lúc chọn quân) thì ô đó vẫn được báo là ăn được (§6).
- `useSeatSummary`: từ `chessBoard(state)`: hiệu số từng loại quân (trừ Vua); bên dư có `full` "Hơn 3 điểm: Mã" / "Hơn 5 điểm: Mã, 2 Tốt" (ICU plural, `format.list`), `short` "+3"; bằng nhau → `null`. Điểm 1/3/3/5/9 chỉ để hiển thị.
- `useResultDetail`: `checkmate` "Chiếu hết"; `stalemate` "{player} hết nước đi mà không bị chiếu"; `insufficient-material` "Không bên nào đủ quân để chiếu hết"; `threefold-claim` "{player} đòi hoà: thế cờ lặp lại ba lần"; `fifty-move-claim` "{player} đòi hoà theo luật 50 nước"; `fivefold-repetition` "Thế cờ lặp lại năm lần"; `seventy-five-move` "75 nước liền không đi Tốt, không ăn quân". `{player}` = `currentPlayer(state)` (bên đến lượt, cũng là bên đòi).
- `SeatMark`: Vua màu của ghế trong ô 28 px nền `--game-board` (hình đại diện tạm).
- Khoá mới (vi gốc, en, ja đủ khoá và tham số): `Games.chess.{tagline, players.*, pieces.*, colour.*, square.{piece,empty,target,capture,inCheck}, selection.{chosen,noMoves}, check, claim.{button,threefold,fifty}, flip, promotion.{title,cancel}, sheet.{title,empty,score.*}, san.*, move.*, summary.{full,short}, result.*}`. Tên quân vi: Vua, Hậu, Xe, Tượng, Mã, Tốt; en: king, queen, rook, bishop, knight, pawn; ja: キング, クイーン, ルーク, ビショップ, ナイト, ポーン; màu ja 白/黒.

### 10. Bố cục

- **1280 × 800** (688 px dưới thanh trên): cột bàn = thanh trên 44 + 6 + bàn ~584 + 6 + thanh dưới 44 = 684. Cột phải 24 rem: dòng lượt (~56), lời báo lựa chọn (20), chữ báo chiếu (28), "Đòi hoà" + lý do khi có (44 + 16), sổ ghi (tiêu đề + tối đa 14 rem), "Lật bàn" (44), nút ván (44) ≈ 600 px. E2E `toBeInViewport` từng phần.
- **390 / 360 px**: dòng lượt, thanh trên, bàn, thanh dưới, lời báo + chữ báo chiếu, ["Đòi hoà"], dải sổ ghi cùng hàng "Lật bàn", nút ván. Ô 44,75 / 41 px. Không cuộn ngang (E2E `scrollWidth`).
- Thẻ kết quả, thông báo kết nối: khung chung, không đổi.

### 11. Chuyển động

- Quân ở ô đến chạy Web Animations API `transform: translate(Δx, Δy) → 0` 180 ms `ease-out` (cả Xe khi nhập thành); quân bị ăn biến mất ngay; dấu hiện ngay. Chỉ khi `san.length` tăng đúng 1 (không khi hoàn tác, tải lại, ván mới, nối lại). Dưới `AI_MIN_DELAY_MS` (300 ms) của nhịp hiện nước online.
- `prefers-reduced-motion: reduce` → không gọi `animate`. Test với `matchMedia` giả.

### 12. Online

- Không đổi giao thức, server, transport. Server kiểm nước (cả đòi hoà) bằng `chess` qua `findGame`. Người tạo ghế 0 = Trắng; "Chơi lại" xoay ghế nên đổi màu, `viewer` đổi, bàn quay theo (§5). Lựa chọn và bộ chọn sống qua các lần phòng cập nhật cùng thế (§6). Không hoàn tác online.

### 13. Menu, hình minh hoạ, màn hình bắt đầu ván

- Thẻ Cờ vua: "2 người", "~20 phút", tagline "Cờ cổ điển 8×8: nhập thành, phong cấp, bắt tốt qua đường". `Artwork.tsx`: 2 × 2 ô xanh–kem với Vua trắng và Mã đen staunty theo địa chỉ file (§4).
- Màn hình bắt đầu ván, tạo phòng: hành vi chung cho game không có máy, không sửa.

## Risks / Trade-offs

- [Sửa khung chung cho thanh ghế quanh bàn] → tuỳ chọn, mặc định như cũ; test `PlayScreen`/`PlayerPanel`/`every-game.test.tsx` của các game khác không đổi kỳ vọng.
- [Phát lại cả ván ở mỗi lần phòng đổi trên điện thoại] → ~0,2 ms/nửa nước trên máy dev (`add-chess-rules` §2); thử trên điện thoại thật một ván ~80 nước mỗi bên, ghi vào plan.md §10.
- [Ô 41 px ở 360 px dưới 44 px nên có] → trên 24 px bắt buộc; chạm cả ô.
- [Bộ chọn phong cấp che bàn] → tiêu đề nêu nước, huỷ được, ít khi xảy ra.
- [Bấm nhầm "Đòi hoà"] → nút chỉ hiện khi đòi được, có dòng lý do; cùng máy hoàn tác được. Nếu chơi thử thấy cần, thêm xác nhận (change nhỏ).
- [Quân phẳng hai lớp rối ở 41 px] → so ảnh `ui:shots` 360 px; giảm nét chi tiết, không giảm viền.

## Kiểm tra

- `pnpm ui:shots` (thêm vào `ui-shots/screens.shots.ts`): `03b-setup-chess`, `20-chess-start`, `20b-chess-selected` (Mã chọn, ô tới được, ô ăn được), `20c-chess-check`, `20d-chess-promotion`, `20e-chess-checkmate`, `20f-chess-long-sheet`, `20g-chess-360` (ô 41 px, toạ độ 10 px), `20h-chess-focus` (tiêu điểm trên ô xanh và ô vàng, cạnh ô đang chọn), `20i-chess-claim` (nút "Đòi hoà"), `21-online-chess-black` (cầm Đen, bàn lật, thanh "Bạn · Đen" dưới bàn) — sáng/tối × 390/1280; xem từng ảnh, so với `mockup/index.html`.
- `games/theme-css.test.ts` với cặp hai lớp và `FOCUS_BACKGROUNDS` (§3).
- Rà `web-design-guidelines` trên `games/chess/**` và phần `PlayScreen` đã đổi; checklist UX bàn cờ của skill `board-games-ui` (cùng máy, online).
- `pnpm check`, `pnpm knip`, `pnpm test:e2e` (hai cấu hình), `pnpm spec:check`.

### Kết quả kiểm tra

Ghi khi apply (04/11/2026):

- **Bundle** (`next build` của HEAD trong một worktree tạm so với bản đã đổi; tổng gzip các chunk JS mà manifest của route nạp lúc đầu): `/` 237,1 → 237,1 KB; `/play/[gameId]` 238,3 → 238,3 KB; `/play/[gameId]/[mode]` 243,9 → 244,5 KB (+0,6); `/room/[code]` 245,8 → 246,3 KB (+0,5) — đều dưới 1 KB (thanh ghế trong `PlayScreen`). `chess.js` (chuỗi "Invalid FEN") chỉ có trong **một** chunk: chunk màn hình Cờ vua (bàn + luật + `chess.js`, 58,6 KB, 19,8 KB gzip), chỉ được nạp động từ `GAME_ENTRY_LOADERS`, không manifest route nào nạp sẵn. Ba chunk của AI Worker (`0nn9pd8qaeyz3.js` 6,7 KB gzip và hai chunk runtime) không có `chess.js` hay luật Cờ vua (`claim-draw`).
- **Bộ quân**: staunty, `lichess-org/lila@9af5b51f1c7fa4199c7e03273f4b10b8acdc6b1c`, 12 file `cmp` trùng byte với bản tải; tỉ số trong bảng §3 đo từ màu của file (test kiểm token khớp file).
- **Test**: `pnpm check` xanh (web 1294 test + 20 bỏ qua, games 517, engine 382, protocol 101, ui 131); `pnpm knip` sạch; `pnpm spec:check` xanh; `pnpm test:e2e` 192 qua, 8 bỏ qua (hai cấu hình; gồm `play-chess.spec.ts` và `online-chess.spec.ts`), không flaky.
- **Ảnh** (`pnpm ui:shots`, 146 ảnh, đã xem các ảnh Cờ vua và menu ở sáng/tối × 390/1280): `03b-setup-chess`, `20…20i`, `20h2-chess-focus-last-move`, `21-online-chess-black`, `01-menu` — khớp mockup (bàn, toạ độ, thanh ghế, sổ ghi, bộ chọn phong cấp, dấu ô, vòng focus ngoài ô trên ô xanh và ô vàng), trừ hình quân (staunty). Sửa sau khi xem: lời đọc `sr-only` của sổ ghi kéo dài trang (khung cuộn thêm `relative`).
- **Rà `web-design-guidelines`**: thêm `width`/`height` cho `<img>` quân, `hover:` cho ô bấm được, `overscroll-contain` cho bộ chọn, `translate="no"` cho sổ ghi. Checklist UX bàn cờ (skill `board-games-ui`): lượt trên bàn (thanh ghế viền đậm + "Đến lượt"), bảng người chơi (thanh ghế: tên, màu, loại ghế, kết nối), nước vừa đi và nước hợp lệ, khoảnh khắc kết thúc (thẻ kết quả + tỉ số sổ ghi), hoàn tác (chung), online (thông báo kết nối chung), `role="status"` duy nhất — đạt ở cùng máy và online. Cờ vua không có máy nên không áp mục "máy đang nghĩ".
- **Sau review** (04/11/2026): `Square` nhận giá trị thuần (`pieceType`, `pieceColour`), `board`/`checkSquare` memo theo `fen` (test đếm lần vẽ quân: cập nhật phòng cùng thế 0 lần, một nước ≤ 4 ô); hover của ô là lớp mực mờ `before:` thay `filter` (filter tạo stacking context che quân đang trượt); trên điện thoại lời báo lựa chọn và chữ báo chiếu chung một dòng giữ chỗ; công thức phòng bàn `100dvh − 7.25rem − 6.25rem` (thanh trên + padding, hai thanh ghế + khoảng cách); mũi tên chuyển giữa bốn quân trong bộ chọn phong cấp; E2E thêm ván mới ở 1280 × 800, 1366 × 768, 1440 × 900.
- **Lệch so với thiết kế ban đầu**: bộ quân staunty thay bộ tự vẽ (người dùng chốt); ô xanh bản tối `#53743B`; phòng của bàn có thanh ghế do `PlayScreen` trừ (`− 13.5rem`) thay vì bàn tự trừ; nhãn nút phong cấp dùng khoá riêng `promotion.choice.*` (tên quân viết hoa ở en). Còn lại: thử trên điện thoại thật và online giữa hai thiết bị thật (plan.md §10).

## Open Questions

(Không còn: mockup đã duyệt; bộ quân đổi sang staunty, xem "Đã chốt".)
