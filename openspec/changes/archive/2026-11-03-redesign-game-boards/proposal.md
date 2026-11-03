# Proposal

## Why

Sau `add-design-foundation` khung chung đã có bảng màu, thang chữ và hợp đồng `--game-*`, nhưng bàn của ba game vẫn như cũ: Cờ caro trông như bảng tính, Tic-tac-toe dùng X màu nhấn (`text-accent`), Cờ cá ngựa dùng màu quân trùng màu nhấn và khung xúc xắc mang màu người **vừa** gieo nên người chơi phải đoán ai gieo tiếp (khảo sát M6.5, plan.md §10). Màn hình chơi xếp mọi thứ thành một cột hẹp (`max-w-3xl`): ở 1280 × 800 phải cuộn mới thấy nút dưới bàn Cờ caro 19×19, còn trên điện thoại thì danh sách chọn ngựa và đầu trang Cờ caro tràn ngang.

Mockup đã duyệt (03/11/2026, `openspec/changes/archive/2026-11-03-add-design-foundation/mockup/`, khung 3–7) chốt bản sắc từng game và bố cục bàn + cột bên. Change này làm phần đó. Thuộc mốc **M6.5. Thiết kế lại giao diện** (plan.md §6.2), change thứ hai sau `add-design-foundation`.

## What Changes

- **Bố cục màn hình chơi** (hành vi quan sát được → spec): từ 1024 px, bàn bên trái và cột bên phải (dòng lượt/kết quả, phần điều khiển của game, nút của ván); ở 1280 × 800 bàn, dòng lượt và mọi nút nằm trọn trong màn hình không cần cuộn; khung hẹp hơn xếp dọc, không cuộn ngang ở 360 px. Thanh trên của màn hình chơi: "Về menu" (←) bên trái, tên game và chip luật ở giữa. Vùng chơi mang `data-game="<id>"` (token của game đến từ `games/<id>/theme.css`). Một thứ tự DOM cho mọi khung (dòng lượt → người chơi → bàn → điều khiển của game → nút của ván), vị trí bằng `grid-template-areas`.
- **Bàn trả về các phần, màn hình chơi sắp xếp**: `BoardProps.layout({ board, controls })` — bàn dựng phần bàn và phần điều khiển riêng (xúc xắc, nút gieo, chọn ngựa) trong cùng component rồi để `PlayScreen` đặt vào lưới; tiêu điểm sau khi gieo/đi dùng ref thay cho `querySelector`.
- **Tic-tac-toe**: ô bo tròn kiểu sticker trên nền tím nhạt, X cam (`--game-mark-1`), O tím đậm (`--game-mark-2`, khác màu nhấn), ô chọn được có viền `--game-line`, ô không chọn được viền đứt nhạt (giữ hành vi spec), dấu nước vừa đi là vòng đứt nét `--game-last-move` (không còn `border-accent`).
- **Cờ caro "vở ô li"**: giấy vở, đường kẻ xanh (đậm hơn mockup để đạt 3:1), lề đỏ trang trí ở dải giấy bên trái ngoài lưới, X nét bút bi xanh, O bút đỏ, nước vừa đi là vòng tròn đứt nét, quân xem trước (chạm hai lần) là nét đứt đủ màu thay cho quân mờ, hàng thắng gạch bằng màu bút người thắng và khoanh bằng `--game-win`; bản tối "giấy tối, bút sáng". Sửa tràn đầu trang trên điện thoại.
- **Cờ cá ngựa "tranh dân gian"**: nền giấy điệp, chuồng son/chàm/hoè/lục (token `--piece-*` mới của `add-design-foundation`), quân có viền và ký hiệu tương phản, chuồng đích tô nhạt có số, ô chân chuồng viền đứt; **chuồng của người đang đến lượt nổi bật** (viền mực đậm + vòng đứt màu chuồng); **khung xúc xắc và nút "Gieo xúc xắc" mang màu người đang đến lượt** (người sắp gieo hoặc đang chọn ngựa); nút gieo luôn được vẽ, khi khoá thì kiểu khoá chung (nền chìm, viền đứt, chữ mờ) thắng màu quân; viền/khung màu Vàng dùng `--piece-yellow-line`, kết quả lần gieo trước hiện thành chip "Lượt trước: Xanh lá gieo được 3" kèm ký hiệu. Trên điện thoại: bàn rộng hết khung, xúc xắc to, lựa chọn ngựa là nút xuống dòng được (≥ 44 px; lưới 2 cột ở cột bên máy tính), hết tràn ngang.
- Giữ nguyên `role="status"`, `data-ply`, `data-ludo-choice`, `data-ludo-roll`, `data-target` và mọi tên đọc được mà test/E2E dùng.
- Bản dịch vi/en/ja cho chữ mới (chip lần gieo trước, nhãn xúc xắc khi chờ gieo).

## Capabilities

### New Capabilities

(không có)

### Modified Capabilities

- `local-play`: thêm "Bố cục màn hình chơi".
- `ludo`: sửa "Bàn Cờ cá ngựa" (khung xúc xắc theo màu người đang đến lượt, kết quả gieo gần nhất kèm tên người gieo); thêm "Chuồng của người đang đến lượt".

## Ngoài phạm vi

- Bảng người chơi, dòng lượt có cấp bậc, tín hiệu máy đang nghĩ, khoảnh khắc kết thúc ván (hàng thắng Tic-tac-toe, confetti), lý do nút không bấm được: `add-game-feedback`. Dải người chơi trên điện thoại (mockup khung 6) thuộc bảng người chơi, cũng ở `add-game-feedback`.
- Đổi tên màu quân trong lời báo ("Xanh dương" → "Chàm", "Xanh lá" → "Lục" như mockup): giữ tên cũ, vì đổi lời báo và E2E mà không thêm gì cho người chơi.
- Hiệu ứng mới cho đặt quân/đá quân: giữ hiệu ứng hiện có (`animate-dice-roll`, đi từng ô, `piece-kicked`).
- Cờ vua (M7) và theme bàn khác.

## Impact

- **Code**: `apps/web/src/features/play/PlayScreen.tsx` (lưới `grid-template-areas`, thanh trên, `data-game`, hàm `layout`), `apps/web/src/games/types.ts` (`BoardProps.layout`, `defaultBoardLayout`), `apps/web/src/games/tictactoe/{Board.tsx,theme.css}`, `apps/web/src/games/caro/{Board.tsx,theme.css}`, `apps/web/src/games/ludo/{Board.tsx,Dice.tsx,piece-style.ts,theme.css}`, `apps/web/messages/{vi,en,ja}.json` (`Games.ludo.lastRoll`, `Games.ludo.dieReady`), `apps/web/e2e/*` (khung nhìn 1280 × 800, 360 px), `apps/web/ui-shots/screens.shots.ts`.
- **Engine, games, protocol, server**: không đổi (`LudoState.last`, `toMove`, `die`, `winner` đã đủ dữ liệu). **`packages/ui`**: không thêm token hay component; chỉ `ButtonProps` thành `ComponentProps<"button">` để nút nhận `ref` (tiêu điểm sau khi gieo/đi).
- **Thêm khi code**: `apps/web/src/games/ludo/board-layout.ts` (`stableOutline`), `apps/web/src/features/play/ConnectionNotice.tsx` (`className`), `apps/web/e2e/play-layout.spec.ts`, `apps/web/playwright.config.ts` (dự án "desktop" 1280 × 800).
- **Phụ thuộc**: không thêm thư viện.
- **Bất biến**: "Thêm một game chỉ gồm…" — giữ: mọi thứ của từng game nằm trong `games/<id>/`; `BoardProps.layout` là hợp đồng chung, không biết game nào. Không chạm bất biến khác.
- **Tài liệu**: plan.md §10 (M6.5) ở task cuối.
